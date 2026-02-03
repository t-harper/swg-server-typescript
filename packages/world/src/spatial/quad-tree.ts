/**
 * @swg/world - QuadTree Spatial Index
 * Efficient spatial partitioning for O(log n) range queries
 */

import {
  BoundingBox,
  containsPoint,
  intersects,
  intersectsCircle,
  subdivide,
} from './bounding-box.js';

/**
 * Interface for objects that can be stored in the QuadTree.
 * Objects must have an id and 2D position.
 */
export interface Spatial {
  id: bigint;
  x: number;
  y: number;
}

/**
 * Internal node structure for the QuadTree.
 */
export interface QuadTreeNode<T extends Spatial> {
  /** The bounding box this node covers */
  bounds: BoundingBox;
  /** Objects stored directly in this node */
  objects: Map<bigint, T>;
  /** Child nodes (NW, NE, SW, SE) or null if leaf */
  children: QuadTreeNode<T>[] | null;
  /** Current depth of this node */
  depth: number;
}

/** Default maximum objects per node before splitting */
const DEFAULT_MAX_OBJECTS = 10;

/** Default maximum depth of the tree */
const DEFAULT_MAX_DEPTH = 8;

/**
 * QuadTree implementation for efficient 2D spatial indexing.
 *
 * Supports SWG's 16km x 16km zone size with O(log n) query performance
 * for 10,000+ objects per zone.
 *
 * @example
 * ```typescript
 * const tree = new QuadTree<SceneObject>(
 *   { minX: -8192, minY: -8192, maxX: 8192, maxY: 8192 }
 * );
 * tree.insert({ id: 1n, x: 100, y: 200 });
 * const nearby = tree.queryRadius(100, 200, 50);
 * ```
 */
export class QuadTree<T extends Spatial> {
  private root: QuadTreeNode<T>;
  private readonly maxObjects: number;
  private readonly maxDepth: number;
  private objectLocations: Map<bigint, QuadTreeNode<T>>;
  private totalObjects: number = 0;

  /**
   * Creates a new QuadTree.
   *
   * @param bounds - The total bounds of the tree (e.g., zone boundaries)
   * @param maxObjects - Maximum objects per node before splitting (default: 10)
   * @param maxDepth - Maximum depth of the tree (default: 8)
   */
  constructor(
    bounds: BoundingBox,
    maxObjects: number = DEFAULT_MAX_OBJECTS,
    maxDepth: number = DEFAULT_MAX_DEPTH
  ) {
    this.maxObjects = maxObjects;
    this.maxDepth = maxDepth;
    this.objectLocations = new Map();
    this.root = this.createNode(bounds, 0);
  }

  /**
   * Creates a new node.
   */
  private createNode(bounds: BoundingBox, depth: number): QuadTreeNode<T> {
    return {
      bounds,
      objects: new Map(),
      children: null,
      depth,
    };
  }

  /**
   * Gets the total number of objects in the tree.
   */
  get size(): number {
    return this.totalObjects;
  }

  /**
   * Gets the bounds of the tree.
   */
  get bounds(): BoundingBox {
    return this.root.bounds;
  }

  /**
   * Inserts an object into the QuadTree.
   *
   * @param object - The object to insert (must have id, x, y)
   * @throws Error if object is outside tree bounds
   */
  insert(object: T): void {
    if (!containsPoint(this.root.bounds, object.x, object.y)) {
      throw new Error(
        `Object ${object.id} at (${object.x}, ${object.y}) is outside tree bounds`
      );
    }

    // Remove existing entry if updating
    if (this.objectLocations.has(object.id)) {
      this.remove(object.id);
    }

    this.insertIntoNode(this.root, object);
    this.totalObjects++;
  }

  /**
   * Recursively inserts an object into the appropriate node.
   */
  private insertIntoNode(node: QuadTreeNode<T>, object: T): void {
    // If node has children, insert into appropriate child
    if (node.children !== null) {
      const childIndex = this.getChildIndex(node, object.x, object.y);
      if (childIndex !== -1) {
        this.insertIntoNode(node.children[childIndex], object);
        return;
      }
    }

    // Insert into this node
    node.objects.set(object.id, object);
    this.objectLocations.set(object.id, node);

    // Check if we need to split
    if (
      node.children === null &&
      node.objects.size > this.maxObjects &&
      node.depth < this.maxDepth
    ) {
      this.split(node);
    }
  }

  /**
   * Splits a node into four children and redistributes objects.
   */
  private split(node: QuadTreeNode<T>): void {
    const childBounds = subdivide(node.bounds);
    node.children = childBounds.map((bounds) =>
      this.createNode(bounds, node.depth + 1)
    );

    // Redistribute objects to children
    const objectsToRedistribute = new Map(node.objects);
    node.objects.clear();

    for (const [id, object] of objectsToRedistribute) {
      const childIndex = this.getChildIndex(node, object.x, object.y);
      if (childIndex !== -1) {
        const child = node.children[childIndex];
        child.objects.set(id, object);
        this.objectLocations.set(id, child);
      } else {
        // Object straddles boundaries, keep in parent
        node.objects.set(id, object);
      }
    }
  }

  /**
   * Gets the index of the child that contains the given point.
   * Returns -1 if point straddles multiple children.
   */
  private getChildIndex(
    node: QuadTreeNode<T>,
    x: number,
    y: number
  ): number {
    if (node.children === null) return -1;

    const midX = (node.bounds.minX + node.bounds.maxX) / 2;
    const midY = (node.bounds.minY + node.bounds.maxY) / 2;

    const isLeft = x < midX;
    const isBottom = y < midY;

    if (isLeft) {
      return isBottom ? 2 : 0; // SW : NW
    } else {
      return isBottom ? 3 : 1; // SE : NE
    }
  }

  /**
   * Removes an object from the QuadTree by its ID.
   *
   * @param id - The ID of the object to remove
   * @returns true if the object was found and removed
   */
  remove(id: bigint): boolean {
    const node = this.objectLocations.get(id);
    if (!node) return false;

    node.objects.delete(id);
    this.objectLocations.delete(id);
    this.totalObjects--;

    return true;
  }

  /**
   * Updates an object's position in the QuadTree.
   * More efficient than remove + insert when staying in the same region.
   *
   * @param id - The ID of the object to update
   * @param newX - New X coordinate
   * @param newY - New Y coordinate
   * @throws Error if object not found or new position is out of bounds
   */
  update(id: bigint, newX: number, newY: number): void {
    const node = this.objectLocations.get(id);
    if (!node) {
      throw new Error(`Object ${id} not found in QuadTree`);
    }

    const object = node.objects.get(id);
    if (!object) {
      throw new Error(`Object ${id} not found in node`);
    }

    // Check if new position is within tree bounds
    if (!containsPoint(this.root.bounds, newX, newY)) {
      throw new Error(
        `New position (${newX}, ${newY}) is outside tree bounds`
      );
    }

    // Check if object can stay in current node
    if (containsPoint(node.bounds, newX, newY)) {
      // Update position in place
      object.x = newX;
      object.y = newY;
      return;
    }

    // Need to reinsert into different node
    node.objects.delete(id);
    this.objectLocations.delete(id);

    object.x = newX;
    object.y = newY;
    this.insertIntoNode(this.root, object);
  }

  /**
   * Queries all objects within a rectangular range.
   *
   * @param bounds - The bounding box to query
   * @returns Array of objects within the bounds
   */
  queryRange(bounds: BoundingBox): T[] {
    const results: T[] = [];
    this.queryRangeNode(this.root, bounds, results);
    return results;
  }

  /**
   * Recursively queries a node and its children for objects in range.
   */
  private queryRangeNode(
    node: QuadTreeNode<T>,
    bounds: BoundingBox,
    results: T[]
  ): void {
    // Early exit if query bounds don't intersect this node
    if (!intersects(node.bounds, bounds)) {
      return;
    }

    // Check objects in this node
    for (const object of node.objects.values()) {
      if (containsPoint(bounds, object.x, object.y)) {
        results.push(object);
      }
    }

    // Recursively check children
    if (node.children !== null) {
      for (const child of node.children) {
        this.queryRangeNode(child, bounds, results);
      }
    }
  }

  /**
   * Queries all objects within a circular radius.
   *
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param radius - Search radius
   * @returns Array of objects within the radius
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const radiusSquared = radius * radius;
    this.queryRadiusNode(this.root, x, y, radius, radiusSquared, results);
    return results;
  }

  /**
   * Recursively queries a node for objects within radius.
   */
  private queryRadiusNode(
    node: QuadTreeNode<T>,
    x: number,
    y: number,
    radius: number,
    radiusSquared: number,
    results: T[]
  ): void {
    // Early exit if circle doesn't intersect this node
    if (!intersectsCircle(node.bounds, x, y, radius)) {
      return;
    }

    // Check objects in this node
    for (const object of node.objects.values()) {
      const dx = object.x - x;
      const dy = object.y - y;
      if (dx * dx + dy * dy <= radiusSquared) {
        results.push(object);
      }
    }

    // Recursively check children
    if (node.children !== null) {
      for (const child of node.children) {
        this.queryRadiusNode(child, x, y, radius, radiusSquared, results);
      }
    }
  }

  /**
   * Queries the N nearest objects to a point.
   *
   * @param x - Query point X coordinate
   * @param y - Query point Y coordinate
   * @param count - Maximum number of results
   * @returns Array of nearest objects, sorted by distance (closest first)
   */
  queryNearest(x: number, y: number, count: number): T[] {
    if (count <= 0) return [];

    // Use a max-heap approach: keep track of the N closest objects
    const candidates: Array<{ object: T; distanceSquared: number }> = [];
    this.queryNearestNode(this.root, x, y, count, candidates);

    // Sort by distance and return objects
    candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
    return candidates.slice(0, count).map((c) => c.object);
  }

  /**
   * Recursively collects nearest candidates.
   */
  private queryNearestNode(
    node: QuadTreeNode<T>,
    x: number,
    y: number,
    count: number,
    candidates: Array<{ object: T; distanceSquared: number }>
  ): void {
    // Get worst distance in candidates (if we have enough)
    const maxDistanceSquared =
      candidates.length >= count
        ? candidates[candidates.length - 1].distanceSquared
        : Infinity;

    // Check if this node could contain closer objects
    const closestX = Math.max(node.bounds.minX, Math.min(x, node.bounds.maxX));
    const closestY = Math.max(node.bounds.minY, Math.min(y, node.bounds.maxY));
    const nodeDistanceSquared =
      (closestX - x) * (closestX - x) + (closestY - y) * (closestY - y);

    if (nodeDistanceSquared > maxDistanceSquared && candidates.length >= count) {
      return;
    }

    // Check objects in this node
    for (const object of node.objects.values()) {
      const dx = object.x - x;
      const dy = object.y - y;
      const distanceSquared = dx * dx + dy * dy;

      // Add to candidates if closer than worst or we don't have enough
      if (candidates.length < count || distanceSquared < maxDistanceSquared) {
        candidates.push({ object, distanceSquared });
        // Keep sorted by distance (descending for easy pop)
        candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
        // Trim to count
        if (candidates.length > count) {
          candidates.pop();
        }
      }
    }

    // Recursively check children, prioritizing closer ones
    if (node.children !== null) {
      // Sort children by distance to query point for better pruning
      const childDistances = node.children.map((child, index) => {
        const cX = Math.max(
          child.bounds.minX,
          Math.min(x, child.bounds.maxX)
        );
        const cY = Math.max(
          child.bounds.minY,
          Math.min(y, child.bounds.maxY)
        );
        return { index, distance: (cX - x) * (cX - x) + (cY - y) * (cY - y) };
      });
      childDistances.sort((a, b) => a.distance - b.distance);

      for (const { index } of childDistances) {
        this.queryNearestNode(node.children[index], x, y, count, candidates);
      }
    }
  }

  /**
   * Clears all objects from the QuadTree.
   */
  clear(): void {
    this.root = this.createNode(this.root.bounds, 0);
    this.objectLocations.clear();
    this.totalObjects = 0;
  }

  /**
   * Checks if an object with the given ID exists in the tree.
   */
  has(id: bigint): boolean {
    return this.objectLocations.has(id);
  }

  /**
   * Gets an object by its ID.
   */
  get(id: bigint): T | undefined {
    const node = this.objectLocations.get(id);
    if (!node) return undefined;
    return node.objects.get(id);
  }

  /**
   * Returns all objects in the tree.
   */
  getAll(): T[] {
    const results: T[] = [];
    this.collectAll(this.root, results);
    return results;
  }

  /**
   * Recursively collects all objects.
   */
  private collectAll(node: QuadTreeNode<T>, results: T[]): void {
    for (const object of node.objects.values()) {
      results.push(object);
    }
    if (node.children !== null) {
      for (const child of node.children) {
        this.collectAll(child, results);
      }
    }
  }

  /**
   * Gets statistics about the tree structure.
   */
  getStats(): {
    totalObjects: number;
    totalNodes: number;
    maxDepth: number;
    averageObjectsPerNode: number;
  } {
    let totalNodes = 0;
    let actualMaxDepth = 0;

    const countNodes = (node: QuadTreeNode<T>): void => {
      totalNodes++;
      actualMaxDepth = Math.max(actualMaxDepth, node.depth);
      if (node.children !== null) {
        for (const child of node.children) {
          countNodes(child);
        }
      }
    };

    countNodes(this.root);

    return {
      totalObjects: this.totalObjects,
      totalNodes,
      maxDepth: actualMaxDepth,
      averageObjectsPerNode:
        totalNodes > 0 ? this.totalObjects / totalNodes : 0,
    };
  }
}
