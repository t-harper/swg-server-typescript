/**
 * Resource Class Definition
 * Defines the structure and constraints for resource classes (templates)
 */

import {
  ResourceCategory,
  ResourceType,
  RESOURCE_TYPE_HIERARCHY,
  getResourceTypeAncestors,
} from './resource-types.js';
import {
  ResourceAttribute,
  AttributeRange,
  ATTRIBUTE_MIN_VALUE,
  ATTRIBUTE_MAX_VALUE,
  getApplicableAttributes,
} from './resource-attributes.js';

/**
 * SWG Planet identifiers
 */
export const Planet = {
  CORELLIA: 'corellia',
  DANTOOINE: 'dantooine',
  DATHOMIR: 'dathomir',
  ENDOR: 'endor',
  KASHYYYK: 'kashyyyk',
  LOK: 'lok',
  MUSTAFAR: 'mustafar',
  NABOO: 'naboo',
  RORI: 'rori',
  TALUS: 'talus',
  TATOOINE: 'tatooine',
  YAVIN4: 'yavin4',
} as const;

export type Planet = (typeof Planet)[keyof typeof Planet];

/**
 * All planets array
 */
export const ALL_PLANETS: Planet[] = Object.values(Planet);

/**
 * Core planets (original SWG launch planets)
 */
export const CORE_PLANETS: Planet[] = [
  Planet.CORELLIA,
  Planet.DANTOOINE,
  Planet.DATHOMIR,
  Planet.ENDOR,
  Planet.LOK,
  Planet.NABOO,
  Planet.RORI,
  Planet.TALUS,
  Planet.TATOOINE,
  Planet.YAVIN4,
];

/**
 * Display names for planets
 */
export const PLANET_NAMES: Record<Planet, string> = {
  [Planet.CORELLIA]: 'Corellia',
  [Planet.DANTOOINE]: 'Dantooine',
  [Planet.DATHOMIR]: 'Dathomir',
  [Planet.ENDOR]: 'Endor',
  [Planet.KASHYYYK]: 'Kashyyyk',
  [Planet.LOK]: 'Lok',
  [Planet.MUSTAFAR]: 'Mustafar',
  [Planet.NABOO]: 'Naboo',
  [Planet.RORI]: 'Rori',
  [Planet.TALUS]: 'Talus',
  [Planet.TATOOINE]: 'Tatooine',
  [Planet.YAVIN4]: 'Yavin IV',
};

/**
 * Planet adjectives for resource naming
 */
export const PLANET_ADJECTIVES: Record<Planet, string> = {
  [Planet.CORELLIA]: 'Corellian',
  [Planet.DANTOOINE]: 'Dantooine',
  [Planet.DATHOMIR]: 'Dathomirian',
  [Planet.ENDOR]: 'Endorian',
  [Planet.KASHYYYK]: 'Kashyyykian',
  [Planet.LOK]: 'Lokian',
  [Planet.MUSTAFAR]: 'Mustafarian',
  [Planet.NABOO]: 'Nabooian',
  [Planet.RORI]: 'Rorian',
  [Planet.TALUS]: 'Talusian',
  [Planet.TATOOINE]: 'Tatooinian',
  [Planet.YAVIN4]: 'Yavin',
};

/**
 * Attribute range with optional min/max constraints
 */
export interface ResourceAttributeRange {
  /** Minimum possible value for this attribute (0-1000) */
  min: number;
  /** Maximum possible value for this attribute (0-1000) */
  max: number;
}

/**
 * Resource class definition
 * Represents a template/type of resource (e.g., "Steel", "Iron", "Copper")
 */
export interface ResourceClass {
  /** Unique identifier for this resource class (e.g., "mineral_metal_ferrous_steel") */
  classId: string;

  /** Display name for this class (e.g., "Steel") */
  className: string;

  /** Parent class ID (null for root classes) */
  parentClass: string | null;

  /** The resource type this class belongs to */
  resourceType: ResourceType;

  /** Resource category (organic/inorganic) */
  resourceCategory: ResourceCategory;

  /** Attributes that apply to this resource class */
  applicableAttributes: ResourceAttribute[];

  /** Minimum attribute values for spawned resources */
  minAttributeValues: Map<ResourceAttribute, number>;

  /** Maximum attribute values for spawned resources */
  maxAttributeValues: Map<ResourceAttribute, number>;

  /** Planets where this resource can spawn (empty = all planets) */
  planetRestrictions: Planet[];

  /** Whether this class can spawn instances */
  isSpawnable: boolean;

  /** Description of the resource class */
  description?: string;

  /** CRC hash of the class name for network protocol */
  crc?: number;
}

/**
 * Serializable resource class data (for JSON storage)
 */
export interface ResourceClassData {
  classId: string;
  className: string;
  parentClass: string | null;
  resourceType: string;
  resourceCategory: string;
  applicableAttributes: string[];
  minAttributeValues: Record<string, number>;
  maxAttributeValues: Record<string, number>;
  planetRestrictions: string[];
  isSpawnable: boolean;
  description?: string;
  crc?: number;
}

/**
 * Convert ResourceClass to serializable data
 */
export function resourceClassToData(resourceClass: ResourceClass): ResourceClassData {
  return {
    classId: resourceClass.classId,
    className: resourceClass.className,
    parentClass: resourceClass.parentClass,
    resourceType: resourceClass.resourceType,
    resourceCategory: resourceClass.resourceCategory,
    applicableAttributes: [...resourceClass.applicableAttributes],
    minAttributeValues: Object.fromEntries(resourceClass.minAttributeValues),
    maxAttributeValues: Object.fromEntries(resourceClass.maxAttributeValues),
    planetRestrictions: [...resourceClass.planetRestrictions],
    isSpawnable: resourceClass.isSpawnable,
    description: resourceClass.description,
    crc: resourceClass.crc,
  };
}

/**
 * Convert serializable data to ResourceClass
 */
export function dataToResourceClass(data: ResourceClassData): ResourceClass {
  return {
    classId: data.classId,
    className: data.className,
    parentClass: data.parentClass,
    resourceType: data.resourceType as ResourceType,
    resourceCategory: data.resourceCategory as ResourceCategory,
    applicableAttributes: data.applicableAttributes as ResourceAttribute[],
    minAttributeValues: new Map(
      Object.entries(data.minAttributeValues) as [ResourceAttribute, number][]
    ),
    maxAttributeValues: new Map(
      Object.entries(data.maxAttributeValues) as [ResourceAttribute, number][]
    ),
    planetRestrictions: data.planetRestrictions as Planet[],
    isSpawnable: data.isSpawnable,
    description: data.description,
    crc: data.crc,
  };
}

/**
 * Create a new resource class with default values
 */
export function createResourceClass(
  classId: string,
  className: string,
  resourceType: ResourceType,
  options: Partial<{
    parentClass: string | null;
    minAttributeValues: Map<ResourceAttribute, number>;
    maxAttributeValues: Map<ResourceAttribute, number>;
    planetRestrictions: Planet[];
    isSpawnable: boolean;
    description: string;
    crc: number;
  }> = {}
): ResourceClass {
  const typeInfo = RESOURCE_TYPE_HIERARCHY[resourceType];
  const applicableAttrs = getApplicableAttributes(resourceType);

  // Create default min/max values
  const minValues = new Map<ResourceAttribute, number>();
  const maxValues = new Map<ResourceAttribute, number>();

  for (const attr of applicableAttrs) {
    minValues.set(attr, ATTRIBUTE_MIN_VALUE);
    maxValues.set(attr, ATTRIBUTE_MAX_VALUE);
  }

  // Override with provided values
  if (options.minAttributeValues) {
    for (const [attr, value] of options.minAttributeValues) {
      if (applicableAttrs.includes(attr)) {
        minValues.set(attr, value);
      }
    }
  }

  if (options.maxAttributeValues) {
    for (const [attr, value] of options.maxAttributeValues) {
      if (applicableAttrs.includes(attr)) {
        maxValues.set(attr, value);
      }
    }
  }

  return {
    classId,
    className,
    parentClass: options.parentClass ?? null,
    resourceType,
    resourceCategory: typeInfo.category,
    applicableAttributes: applicableAttrs,
    minAttributeValues: minValues,
    maxAttributeValues: maxValues,
    planetRestrictions: options.planetRestrictions ?? [],
    isSpawnable: options.isSpawnable ?? typeInfo.isSpawnable,
    description: options.description,
    crc: options.crc,
  };
}

/**
 * Get the attribute range for a resource class
 */
export function getAttributeRange(
  resourceClass: ResourceClass,
  attribute: ResourceAttribute
): ResourceAttributeRange | null {
  if (!resourceClass.applicableAttributes.includes(attribute)) {
    return null;
  }

  return {
    min: resourceClass.minAttributeValues.get(attribute) ?? ATTRIBUTE_MIN_VALUE,
    max: resourceClass.maxAttributeValues.get(attribute) ?? ATTRIBUTE_MAX_VALUE,
  };
}

/**
 * Check if a resource class can spawn on a specific planet
 */
export function canSpawnOnPlanet(resourceClass: ResourceClass, planet: Planet): boolean {
  if (resourceClass.planetRestrictions.length === 0) {
    return true;
  }
  return resourceClass.planetRestrictions.includes(planet);
}

/**
 * Get all planets where a resource class can spawn
 */
export function getSpawnablePlanets(resourceClass: ResourceClass): Planet[] {
  if (resourceClass.planetRestrictions.length === 0) {
    return [...ALL_PLANETS];
  }
  return [...resourceClass.planetRestrictions];
}

/**
 * Validate resource class constraints
 */
export function validateResourceClass(resourceClass: ResourceClass): string[] {
  const errors: string[] = [];

  // Check ID format
  if (!resourceClass.classId || resourceClass.classId.trim() === '') {
    errors.push('Class ID cannot be empty');
  }

  // Check class name
  if (!resourceClass.className || resourceClass.className.trim() === '') {
    errors.push('Class name cannot be empty');
  }

  // Validate attribute ranges
  for (const attr of resourceClass.applicableAttributes) {
    const min = resourceClass.minAttributeValues.get(attr);
    const max = resourceClass.maxAttributeValues.get(attr);

    if (min !== undefined && max !== undefined) {
      if (min > max) {
        errors.push(`Attribute ${attr}: min (${min}) > max (${max})`);
      }
      if (min < ATTRIBUTE_MIN_VALUE || min > ATTRIBUTE_MAX_VALUE) {
        errors.push(`Attribute ${attr}: min (${min}) out of range`);
      }
      if (max < ATTRIBUTE_MIN_VALUE || max > ATTRIBUTE_MAX_VALUE) {
        errors.push(`Attribute ${attr}: max (${max}) out of range`);
      }
    }
  }

  return errors;
}

/**
 * Resource class registry for managing all resource classes
 */
export class ResourceClassRegistry {
  private classes: Map<string, ResourceClass> = new Map();
  private childrenMap: Map<string, string[]> = new Map();

  /**
   * Register a resource class
   */
  register(resourceClass: ResourceClass): void {
    const errors = validateResourceClass(resourceClass);
    if (errors.length > 0) {
      throw new Error(`Invalid resource class: ${errors.join(', ')}`);
    }

    this.classes.set(resourceClass.classId, resourceClass);

    // Update parent-child relationships
    if (resourceClass.parentClass) {
      const siblings = this.childrenMap.get(resourceClass.parentClass) ?? [];
      if (!siblings.includes(resourceClass.classId)) {
        siblings.push(resourceClass.classId);
        this.childrenMap.set(resourceClass.parentClass, siblings);
      }
    }
  }

  /**
   * Get a resource class by ID
   */
  get(classId: string): ResourceClass | undefined {
    return this.classes.get(classId);
  }

  /**
   * Check if a class exists
   */
  has(classId: string): boolean {
    return this.classes.has(classId);
  }

  /**
   * Get all registered classes
   */
  getAll(): ResourceClass[] {
    return Array.from(this.classes.values());
  }

  /**
   * Get child classes
   */
  getChildren(classId: string): ResourceClass[] {
    const childIds = this.childrenMap.get(classId) ?? [];
    return childIds.map((id) => this.classes.get(id)).filter((c): c is ResourceClass => c !== undefined);
  }

  /**
   * Get all ancestor classes (including the class itself)
   */
  getAncestors(classId: string): ResourceClass[] {
    const ancestors: ResourceClass[] = [];
    let currentId: string | null = classId;

    while (currentId !== null) {
      const resourceClass = this.classes.get(currentId);
      if (resourceClass) {
        ancestors.push(resourceClass);
        currentId = resourceClass.parentClass;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get all descendant classes
   */
  getDescendants(classId: string): ResourceClass[] {
    const descendants: ResourceClass[] = [];
    const childIds = this.childrenMap.get(classId) ?? [];

    for (const childId of childIds) {
      const child = this.classes.get(childId);
      if (child) {
        descendants.push(child);
        descendants.push(...this.getDescendants(childId));
      }
    }

    return descendants;
  }

  /**
   * Check if one class is a subclass of another
   */
  isSubclassOf(classId: string, ancestorClassId: string): boolean {
    const ancestors = this.getAncestors(classId);
    return ancestors.some((a) => a.classId === ancestorClassId);
  }

  /**
   * Get classes that can spawn on a specific planet
   */
  getSpawnableForPlanet(planet: Planet): ResourceClass[] {
    return Array.from(this.classes.values()).filter(
      (c) => c.isSpawnable && canSpawnOnPlanet(c, planet)
    );
  }

  /**
   * Get classes by resource type
   */
  getByResourceType(type: ResourceType): ResourceClass[] {
    return Array.from(this.classes.values()).filter((c) => c.resourceType === type);
  }

  /**
   * Get classes by category
   */
  getByCategory(category: ResourceCategory): ResourceClass[] {
    return Array.from(this.classes.values()).filter((c) => c.resourceCategory === category);
  }

  /**
   * Clear all registered classes
   */
  clear(): void {
    this.classes.clear();
    this.childrenMap.clear();
  }

  /**
   * Get number of registered classes
   */
  get size(): number {
    return this.classes.size;
  }

  /**
   * Export all classes to serializable data
   */
  exportAll(): ResourceClassData[] {
    return Array.from(this.classes.values()).map(resourceClassToData);
  }

  /**
   * Import classes from serializable data
   */
  importAll(data: ResourceClassData[]): void {
    for (const classData of data) {
      this.register(dataToResourceClass(classData));
    }
  }
}

/**
 * Global resource class registry singleton
 */
export const globalResourceClassRegistry = new ResourceClassRegistry();
