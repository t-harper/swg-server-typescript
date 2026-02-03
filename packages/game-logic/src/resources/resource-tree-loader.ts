/**
 * Resource Tree Loader
 * Loads and manages the hierarchical resource class tree from SWG datatables
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Error thrown when resource tree loading fails
 */
export class ResourceTreeLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ResourceTreeLoadError';
  }
}

/**
 * Resource attribute definition for tree-loaded classes
 */
export interface ResourceTreeAttributeDef {
  /** Attribute name (e.g., 'cold_resistance', 'conductivity') */
  name: string;
  /** Minimum possible value */
  minValue: number;
  /** Maximum possible value */
  maxValue: number;
}

/**
 * Resource class node in the hierarchy (tree-loaded)
 */
export interface ResourceTreeNode {
  /** Unique class ID (e.g., 'iron', 'copper', 'fiberplast') */
  classId: string;
  /** Display name for players */
  displayName: string;
  /** Parent class ID (null for root classes) */
  parentClassId: string | null;
  /** Child class IDs */
  childClassIds: string[];
  /** Depth in the resource tree (0 = root) */
  treeDepth: number;
  /** Whether this is a spawnable resource (leaf node or near-leaf) */
  isSpawnable: boolean;
  /** Resource attributes this class can have */
  attributes: ResourceTreeAttributeDef[];
  /** Description of this resource type */
  description: string;
  /** Resource category (e.g., 'mineral', 'chemical', 'flora', 'creature') */
  category: string;
}

/**
 * JSON representation of a resource class for tree loading
 */
export interface ResourceTreeNodeJson {
  classId: string;
  displayName: string;
  parentClassId: string | null;
  isSpawnable: boolean;
  attributes: ResourceTreeAttributeDef[];
  description: string;
  category: string;
}

/**
 * Resource tree file format
 */
interface ResourceTreeFile {
  version: number;
  resourceClasses: ResourceTreeNodeJson[];
}

/**
 * Result of loading the resource tree
 */
export interface LoadResourceTreeResult {
  /** All resource classes by ID */
  classes: Map<string, ResourceTreeNode>;
  /** Root resource classes (no parent) */
  rootClasses: string[];
  /** Warnings during loading */
  warnings: string[];
  /** Total class count */
  count: number;
}

/**
 * Loaded resource tree cache
 */
let loadedTreeNodes: Map<string, ResourceTreeNode> = new Map();
let loadedRootClasses: string[] = [];
let treeLoaded = false;

/**
 * Load resource tree JSON file
 */
async function loadResourceTreeFile(filePath: string): Promise<ResourceTreeNodeJson[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as ResourceTreeFile;

    if (typeof data.version !== 'number') {
      throw new Error('Missing or invalid version field');
    }

    if (!Array.isArray(data.resourceClasses)) {
      throw new Error('Missing or invalid resourceClasses array');
    }

    return data.resourceClasses;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ResourceTreeLoadError(`Invalid JSON in ${filePath}`, error);
    }
    throw new ResourceTreeLoadError(
      `Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate a resource class JSON entry
 */
function validateResourceTreeNodeJson(json: ResourceTreeNodeJson): string[] {
  const errors: string[] = [];

  if (!json.classId || typeof json.classId !== 'string') {
    errors.push('classId must be a non-empty string');
  }

  if (!json.displayName || typeof json.displayName !== 'string') {
    errors.push('displayName must be a non-empty string');
  }

  if (json.parentClassId !== null && typeof json.parentClassId !== 'string') {
    errors.push('parentClassId must be a string or null');
  }

  if (typeof json.isSpawnable !== 'boolean') {
    errors.push('isSpawnable must be a boolean');
  }

  if (!Array.isArray(json.attributes)) {
    errors.push('attributes must be an array');
  } else {
    for (const attr of json.attributes) {
      if (!attr.name || typeof attr.name !== 'string') {
        errors.push('attribute name must be a non-empty string');
      }
      if (typeof attr.minValue !== 'number' || typeof attr.maxValue !== 'number') {
        errors.push('attribute minValue and maxValue must be numbers');
      }
      if (attr.minValue > attr.maxValue) {
        errors.push(`attribute ${attr.name}: minValue must be <= maxValue`);
      }
    }
  }

  if (!json.category || typeof json.category !== 'string') {
    errors.push('category must be a non-empty string');
  }

  return errors;
}

/**
 * Build parent-child relationships in the resource tree
 */
function buildTreeRelationships(classes: Map<string, ResourceTreeNode>): void {
  // Reset child lists
  for (const treeNode of classes.values()) {
    treeNode.childClassIds = [];
  }

  // Build child relationships
  for (const [classId, treeNode] of classes) {
    if (treeNode.parentClassId) {
      const parent = classes.get(treeNode.parentClassId);
      if (parent) {
        parent.childClassIds.push(classId);
      }
    }
  }

  // Calculate tree depths
  function calculateDepth(classId: string, visited: Set<string> = new Set()): number {
    if (visited.has(classId)) {
      return 0; // Circular reference protection
    }
    visited.add(classId);

    const treeNode = classes.get(classId);
    if (!treeNode) return 0;

    if (treeNode.treeDepth > 0) return treeNode.treeDepth;

    if (!treeNode.parentClassId) {
      treeNode.treeDepth = 0;
      return 0;
    }

    treeNode.treeDepth = calculateDepth(treeNode.parentClassId, visited) + 1;
    return treeNode.treeDepth;
  }

  for (const classId of classes.keys()) {
    calculateDepth(classId);
  }
}

/**
 * Options for loading the resource tree
 */
export interface LoadResourceTreeOptions {
  /** Whether to validate entries (default: true) */
  validate?: boolean;
  /** Whether to throw on validation errors (default: true) */
  strict?: boolean;
  /** Resource tree filename (default: 'resource-tree.json') */
  treeFile?: string;
}

/**
 * Load the resource tree from a data directory
 * @param dataPath - Path to directory containing resource tree JSON
 * @param options - Loading options
 * @returns Loaded resource tree result
 */
export async function loadResourceTree(
  dataPath: string,
  options: LoadResourceTreeOptions = {}
): Promise<LoadResourceTreeResult> {
  const {
    validate = true,
    strict = true,
    treeFile = 'resource-tree.json',
  } = options;

  const classes = new Map<string, ResourceTreeNode>();
  const rootClasses: string[] = [];
  const warnings: string[] = [];

  // Load resource tree file
  const treePath = join(dataPath, treeFile);
  const classesJson = await loadResourceTreeFile(treePath);

  // First pass: create all classes
  for (const json of classesJson) {
    if (validate) {
      const errors = validateResourceTreeNodeJson(json);
      if (errors.length > 0) {
        if (strict) {
          throw new ResourceTreeLoadError(
            `Invalid resource class '${json.classId}': ${errors.join('; ')}`
          );
        }
        warnings.push(`Class '${json.classId}': ${errors.join('; ')}`);
        continue;
      }
    }

    if (classes.has(json.classId)) {
      warnings.push(`Duplicate resource class '${json.classId}', using latest`);
    }

    const treeNode: ResourceTreeNode = {
      classId: json.classId,
      displayName: json.displayName,
      parentClassId: json.parentClassId,
      childClassIds: [],
      treeDepth: 0,
      isSpawnable: json.isSpawnable,
      attributes: [...json.attributes],
      description: json.description || '',
      category: json.category,
    };

    classes.set(json.classId, treeNode);

    if (json.parentClassId === null) {
      rootClasses.push(json.classId);
    }
  }

  // Validate parent references
  for (const [classId, treeNode] of classes) {
    if (treeNode.parentClassId && !classes.has(treeNode.parentClassId)) {
      if (strict) {
        throw new ResourceTreeLoadError(
          `Resource class '${classId}' has invalid parent '${treeNode.parentClassId}'`
        );
      }
      warnings.push(`Class '${classId}' has invalid parent '${treeNode.parentClassId}'`);
    }
  }

  // Build relationships
  buildTreeRelationships(classes);

  // Update cache
  loadedTreeNodes = classes;
  loadedRootClasses = rootClasses;
  treeLoaded = true;

  return {
    classes,
    rootClasses,
    warnings,
    count: classes.size,
  };
}

/**
 * Get all loaded resource classes
 * @returns Map of class ID to ResourceTreeNode
 */
export function getAllResourceClasses(): Map<string, ResourceTreeNode> {
  return new Map(loadedTreeNodes);
}

/**
 * Get a single resource class by ID
 * @param classId - Resource class ID
 * @returns ResourceTreeNode or undefined if not found
 */
export function getResourceClass(classId: string): ResourceTreeNode | undefined {
  return loadedTreeNodes.get(classId);
}

/**
 * Get all spawnable resource classes
 * @returns Array of spawnable ResourceTreeNode objects
 */
export function getSpawnableClasses(): ResourceTreeNode[] {
  return Array.from(loadedTreeNodes.values()).filter((c) => c.isSpawnable);
}

/**
 * Get resource classes by category
 * @param category - Category name (e.g., 'mineral', 'chemical', 'flora')
 * @returns Array of ResourceTreeNode objects in that category
 */
export function getResourceClassesByCategory(category: string): ResourceTreeNode[] {
  return Array.from(loadedTreeNodes.values()).filter(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get all child classes of a resource class (recursive)
 * @param classId - Parent class ID
 * @returns Array of all descendant class IDs
 */
export function getAllChildClasses(classId: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function collectChildren(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const treeNode = loadedTreeNodes.get(id);
    if (!treeNode) return;

    for (const childId of treeNode.childClassIds) {
      result.push(childId);
      collectChildren(childId);
    }
  }

  collectChildren(classId);
  return result;
}

/**
 * Get the full inheritance path from root to a class
 * @param classId - Resource class ID
 * @returns Array of class IDs from root to target (inclusive)
 */
export function getClassInheritancePath(classId: string): string[] {
  const path: string[] = [];
  let current = classId;

  while (current) {
    path.unshift(current);
    const treeNode = loadedTreeNodes.get(current);
    if (!treeNode?.parentClassId) break;
    current = treeNode.parentClassId;
  }

  return path;
}

/**
 * Check if a class is a descendant of another class
 * @param classId - Class to check
 * @param ancestorId - Potential ancestor class
 * @returns True if classId is a descendant of ancestorId
 */
export function isDescendantOf(classId: string, ancestorId: string): boolean {
  const path = getClassInheritancePath(classId);
  return path.includes(ancestorId) && classId !== ancestorId;
}

/**
 * Get root classes (classes with no parent)
 * @returns Array of root class IDs
 */
export function getRootClasses(): string[] {
  return [...loadedRootClasses];
}

/**
 * Check if the resource tree has been loaded
 */
export function isResourceTreeLoaded(): boolean {
  return treeLoaded;
}

/**
 * Clear loaded resource tree (useful for testing)
 */
export function clearResourceTree(): void {
  loadedTreeNodes.clear();
  loadedRootClasses = [];
  treeLoaded = false;
}

/**
 * Get combined attributes for a resource class (including inherited)
 * @param classId - Resource class ID
 * @returns Combined attributes from class and all ancestors
 */
export function getCombinedAttributes(classId: string): ResourceTreeAttributeDef[] {
  const attributeMap = new Map<string, ResourceTreeAttributeDef>();
  const path = getClassInheritancePath(classId);

  // Process from root to leaf, allowing children to override
  for (const pathClassId of path) {
    const treeNode = loadedTreeNodes.get(pathClassId);
    if (treeNode) {
      for (const attr of treeNode.attributes) {
        attributeMap.set(attr.name, { ...attr });
      }
    }
  }

  return Array.from(attributeMap.values());
}

/**
 * Find resource classes matching a search term
 * @param searchTerm - Search term to match against class ID or display name
 * @returns Array of matching ResourceTreeNode objects
 */
export function searchResourceClasses(searchTerm: string): ResourceTreeNode[] {
  const term = searchTerm.toLowerCase();
  return Array.from(loadedTreeNodes.values()).filter(
    (c) =>
      c.classId.toLowerCase().includes(term) ||
      c.displayName.toLowerCase().includes(term)
  );
}
