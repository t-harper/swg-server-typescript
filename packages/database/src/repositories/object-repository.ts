/**
 * Object Repository
 * Data access layer for game object persistence
 */

import { eq, and, isNull, inArray, between, sql } from 'drizzle-orm';
import { getDb, type Database } from '../connection.js';
import {
  objects,
  objectTangibles,
  objectCreatures,
  objectDirtyTracking,
  type NewObject,
  type NewObjectTangible,
  type NewObjectCreature,
  type NewObjectDirtyTracking,
  type GameObject,
  type ObjectWithRelations,
} from '../schema/objects.js';
import { ObjectFactory, createObjectFactory } from './object-factory.js';
import type { ObjectId } from '@swg/shared-types';
import { SceneObject, ObjectType, TangibleObject } from '@swg/objects';

/**
 * Bounding box for spatial queries
 */
export interface BoundingBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Save options for object persistence
 */
export interface SaveOptions {
  /** Save only dirty properties (default: true) */
  incrementalSave?: boolean;
  /** Update the lastSavedAt timestamp (default: true) */
  updateTimestamp?: boolean;
}

/**
 * Load options for object queries
 */
export interface LoadOptions {
  /** Include contained objects (default: false) */
  includeContents?: boolean;
  /** Maximum depth for recursive content loading (default: 1) */
  contentDepth?: number;
}

/**
 * Dirty tracking information for an object
 */
export interface DirtyInfo {
  objectId: bigint;
  baseObjectDirty: boolean;
  tangibleDirty: boolean;
  creatureDirty: boolean;
  lastSavedAt: Date | null;
  dirtyProperties: string[];
}

/**
 * Object Repository
 * Provides data access methods for game object persistence
 */
export class ObjectRepository {
  private db: Database;
  private factory: ObjectFactory;

  constructor(db?: Database, factory?: ObjectFactory) {
    this.db = db ?? getDb();
    this.factory = factory ?? createObjectFactory();
  }

  /**
   * Save a single object to the database
   * @param object - SceneObject to save
   * @param options - Save options
   */
  async save(object: SceneObject, options: SaveOptions = {}): Promise<void> {
    const { incrementalSave = true, updateTimestamp = true } = options;

    await this.db.transaction(async (tx) => {
      const objectData = this.factory.extractObjectData(object);
      const now = new Date();

      // Check if object exists
      const existing = await tx
        .select({ objectId: objects.objectId })
        .from(objects)
        .where(eq(objects.objectId, object.objectId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing object
        await tx
          .update(objects)
          .set({
            ...objectData,
            updatedAt: updateTimestamp ? now : undefined,
          })
          .where(eq(objects.objectId, object.objectId));
      } else {
        // Insert new object
        const newObject: NewObject = {
          ...objectData,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(objects).values(newObject);
      }

      // Save type-specific data
      if (this.factory.isTangibleObject(object)) {
        await this.saveTangibleData(tx, object);
      }

      // Update dirty tracking
      if (updateTimestamp) {
        await this.updateDirtyTracking(tx, object.objectId, now);
      }
    });
  }

  /**
   * Save tangible-specific data
   */
  private async saveTangibleData(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    object: TangibleObject
  ): Promise<void> {
    const tangibleData = this.factory.extractTangibleData(object);

    const existing = await tx
      .select({ objectId: objectTangibles.objectId })
      .from(objectTangibles)
      .where(eq(objectTangibles.objectId, object.objectId))
      .limit(1);

    if (existing.length > 0) {
      await tx
        .update(objectTangibles)
        .set(tangibleData)
        .where(eq(objectTangibles.objectId, object.objectId));
    } else {
      const newTangible: NewObjectTangible = tangibleData;
      await tx.insert(objectTangibles).values(newTangible);
    }
  }

  /**
   * Update dirty tracking after save
   */
  private async updateDirtyTracking(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    objectId: bigint,
    savedAt: Date
  ): Promise<void> {
    const existing = await tx
      .select({ objectId: objectDirtyTracking.objectId })
      .from(objectDirtyTracking)
      .where(eq(objectDirtyTracking.objectId, objectId))
      .limit(1);

    if (existing.length > 0) {
      await tx
        .update(objectDirtyTracking)
        .set({
          baseObjectDirty: false,
          tangibleDirty: false,
          creatureDirty: false,
          lastSavedAt: savedAt,
          dirtyProperties: null,
        })
        .where(eq(objectDirtyTracking.objectId, objectId));
    } else {
      const newTracking: NewObjectDirtyTracking = {
        objectId,
        baseObjectDirty: false,
        tangibleDirty: false,
        creatureDirty: false,
        lastSavedAt: savedAt,
        dirtyProperties: null,
      };
      await tx.insert(objectDirtyTracking).values(newTracking);
    }
  }

  /**
   * Load a single object by ID
   * @param objectId - Object ID to load
   * @param options - Load options
   * @returns SceneObject or null if not found
   */
  async load(
    objectId: bigint,
    options: LoadOptions = {}
  ): Promise<SceneObject | null> {
    const row = await this.loadObjectRow(objectId);
    if (!row) {
      return null;
    }

    const object = this.factory.createFromRow(row);

    if (options.includeContents) {
      await this.loadContentsRecursive(object, options.contentDepth ?? 1);
    }

    return object;
  }

  /**
   * Load raw object row with relations
   */
  private async loadObjectRow(
    objectId: bigint
  ): Promise<ObjectWithRelations | null> {
    const baseRows = await this.db
      .select()
      .from(objects)
      .where(eq(objects.objectId, objectId))
      .limit(1);

    if (baseRows.length === 0) {
      return null;
    }

    const baseRow = baseRows[0];
    const row: ObjectWithRelations = { ...baseRow };

    // Load type-specific data
    if (this.factory.requiresTangibleData(baseRow.typeId as ObjectType)) {
      const tangibleRows = await this.db
        .select()
        .from(objectTangibles)
        .where(eq(objectTangibles.objectId, objectId))
        .limit(1);
      row.tangible = tangibleRows[0] ?? null;
    }

    if (this.factory.requiresCreatureData(baseRow.typeId as ObjectType)) {
      const creatureRows = await this.db
        .select()
        .from(objectCreatures)
        .where(eq(objectCreatures.objectId, objectId))
        .limit(1);
      row.creature = creatureRows[0] ?? null;
    }

    return row;
  }

  /**
   * Load contents recursively into an object
   */
  private async loadContentsRecursive(
    object: SceneObject,
    depth: number
  ): Promise<void> {
    if (depth <= 0) {
      return;
    }

    const contents = await this.loadByContainer(object.objectId);

    for (const contained of contents) {
      object.addContainedObject(contained.objectId);

      if (depth > 1) {
        await this.loadContentsRecursive(contained, depth - 1);
      }
    }
  }

  /**
   * Load all objects in a container
   * @param containerId - Container object ID
   * @returns Array of SceneObjects
   */
  async loadByContainer(containerId: bigint): Promise<SceneObject[]> {
    const rows = await this.db
      .select()
      .from(objects)
      .where(eq(objects.containerId, containerId));

    const result: SceneObject[] = [];

    for (const baseRow of rows) {
      const row = await this.loadObjectRow(baseRow.objectId);
      if (row) {
        result.push(this.factory.createFromRow(row));
      }
    }

    return result;
  }

  /**
   * Load all objects in a zone
   * @param sceneId - Zone/scene identifier
   * @param bounds - Optional bounding box to filter by position
   * @returns Array of SceneObjects
   */
  async loadByZone(
    sceneId: string,
    bounds?: BoundingBox
  ): Promise<SceneObject[]> {
    let query = this.db
      .select()
      .from(objects)
      .where(
        and(
          eq(objects.sceneId, sceneId),
          isNull(objects.containerId)
        )
      );

    if (bounds) {
      query = this.db
        .select()
        .from(objects)
        .where(
          and(
            eq(objects.sceneId, sceneId),
            isNull(objects.containerId),
            between(objects.x, bounds.minX, bounds.maxX),
            between(objects.z, bounds.minZ, bounds.maxZ)
          )
        );
    }

    const rows = await query;
    const result: SceneObject[] = [];

    for (const baseRow of rows) {
      const row = await this.loadObjectRow(baseRow.objectId);
      if (row) {
        result.push(this.factory.createFromRow(row));
      }
    }

    return result;
  }

  /**
   * Delete an object and all its contents
   * @param objectId - Object ID to delete
   * @returns True if the object was deleted
   */
  async delete(objectId: bigint): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      // First, recursively delete all contained objects
      const contents = await tx
        .select({ objectId: objects.objectId })
        .from(objects)
        .where(eq(objects.containerId, objectId));

      for (const contained of contents) {
        await this.deleteWithTransaction(tx, contained.objectId);
      }

      // Delete the object itself (cascade will handle type-specific tables)
      const result = await tx
        .delete(objects)
        .where(eq(objects.objectId, objectId));

      return result[0].affectedRows > 0;
    });
  }

  /**
   * Delete object within a transaction
   */
  private async deleteWithTransaction(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    objectId: bigint
  ): Promise<void> {
    // Recursively delete contents
    const contents = await tx
      .select({ objectId: objects.objectId })
      .from(objects)
      .where(eq(objects.containerId, objectId));

    for (const contained of contents) {
      await this.deleteWithTransaction(tx, contained.objectId);
    }

    await tx.delete(objects).where(eq(objects.objectId, objectId));
  }

  /**
   * Save multiple objects in a batch
   * @param objectList - Array of SceneObjects to save
   * @param options - Save options
   */
  async saveAll(
    objectList: SceneObject[],
    options: SaveOptions = {}
  ): Promise<void> {
    if (objectList.length === 0) {
      return;
    }

    const { updateTimestamp = true } = options;

    await this.db.transaction(async (tx) => {
      const now = new Date();

      for (const object of objectList) {
        const objectData = this.factory.extractObjectData(object);

        // Check if object exists
        const existing = await tx
          .select({ objectId: objects.objectId })
          .from(objects)
          .where(eq(objects.objectId, object.objectId))
          .limit(1);

        if (existing.length > 0) {
          await tx
            .update(objects)
            .set({
              ...objectData,
              updatedAt: updateTimestamp ? now : undefined,
            })
            .where(eq(objects.objectId, object.objectId));
        } else {
          const newObject: NewObject = {
            ...objectData,
            createdAt: now,
            updatedAt: now,
          };
          await tx.insert(objects).values(newObject);
        }

        // Save type-specific data
        if (this.factory.isTangibleObject(object)) {
          await this.saveTangibleData(tx, object);
        }

        // Update dirty tracking
        if (updateTimestamp) {
          await this.updateDirtyTracking(tx, object.objectId, now);
        }
      }
    });
  }

  /**
   * Load multiple objects by their IDs
   * @param objectIds - Array of object IDs to load
   * @returns Array of SceneObjects
   */
  async loadMany(objectIds: bigint[]): Promise<SceneObject[]> {
    if (objectIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(objects)
      .where(inArray(objects.objectId, objectIds));

    const result: SceneObject[] = [];

    for (const baseRow of rows) {
      const row = await this.loadObjectRow(baseRow.objectId);
      if (row) {
        result.push(this.factory.createFromRow(row));
      }
    }

    return result;
  }

  /**
   * Mark an object as dirty (needs saving)
   * @param objectId - Object ID to mark dirty
   * @param properties - Specific properties that changed
   */
  async markDirty(objectId: bigint, properties: string[] = []): Promise<void> {
    const existing = await this.db
      .select()
      .from(objectDirtyTracking)
      .where(eq(objectDirtyTracking.objectId, objectId))
      .limit(1);

    const dirtyPropertiesStr =
      properties.length > 0 ? JSON.stringify(properties) : null;

    if (existing.length > 0) {
      await this.db
        .update(objectDirtyTracking)
        .set({
          baseObjectDirty: true,
          dirtyProperties: dirtyPropertiesStr,
        })
        .where(eq(objectDirtyTracking.objectId, objectId));
    } else {
      const newTracking: NewObjectDirtyTracking = {
        objectId,
        baseObjectDirty: true,
        tangibleDirty: false,
        creatureDirty: false,
        lastSavedAt: null,
        dirtyProperties: dirtyPropertiesStr,
      };
      await this.db.insert(objectDirtyTracking).values(newTracking);
    }
  }

  /**
   * Get dirty tracking info for an object
   * @param objectId - Object ID to check
   * @returns DirtyInfo or null if not tracked
   */
  async getDirtyInfo(objectId: bigint): Promise<DirtyInfo | null> {
    const rows = await this.db
      .select()
      .from(objectDirtyTracking)
      .where(eq(objectDirtyTracking.objectId, objectId))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      objectId: row.objectId,
      baseObjectDirty: row.baseObjectDirty,
      tangibleDirty: row.tangibleDirty,
      creatureDirty: row.creatureDirty,
      lastSavedAt: row.lastSavedAt,
      dirtyProperties: row.dirtyProperties
        ? JSON.parse(row.dirtyProperties)
        : [],
    };
  }

  /**
   * Get all dirty objects that need saving
   * @param olderThan - Optional timestamp to filter objects modified before
   * @returns Array of object IDs that are dirty
   */
  async getDirtyObjects(olderThan?: Date): Promise<bigint[]> {
    let query = this.db
      .select({ objectId: objectDirtyTracking.objectId })
      .from(objectDirtyTracking)
      .where(eq(objectDirtyTracking.baseObjectDirty, true));

    // For now, we'll filter in code if olderThan is provided
    const rows = await query;

    if (olderThan) {
      return rows
        .filter((row) => {
          // Include objects that haven't been saved or were saved before olderThan
          return true; // We'd need additional logic here based on lastSavedAt
        })
        .map((row) => row.objectId);
    }

    return rows.map((row) => row.objectId);
  }

  /**
   * Save all dirty objects (periodic save cycle)
   * @param maxAge - Maximum age in milliseconds for objects to save (default: 5 minutes)
   */
  async saveDirtyObjects(maxAge: number = 5 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAge);
    const dirtyIds = await this.getDirtyObjects(cutoff);

    if (dirtyIds.length === 0) {
      return 0;
    }

    const objectsToSave = await this.loadMany(dirtyIds);
    await this.saveAll(objectsToSave);

    return objectsToSave.length;
  }

  /**
   * Check if an object exists in the database
   * @param objectId - Object ID to check
   * @returns True if the object exists
   */
  async exists(objectId: bigint): Promise<boolean> {
    const rows = await this.db
      .select({ objectId: objects.objectId })
      .from(objects)
      .where(eq(objects.objectId, objectId))
      .limit(1);

    return rows.length > 0;
  }

  /**
   * Get the count of objects in a zone
   * @param sceneId - Zone/scene identifier
   * @returns Number of objects in the zone
   */
  async getZoneObjectCount(sceneId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(objects)
      .where(
        and(eq(objects.sceneId, sceneId), isNull(objects.containerId))
      );

    return result[0]?.count ?? 0;
  }

  /**
   * Get the count of objects in a container
   * @param containerId - Container object ID
   * @returns Number of objects in the container
   */
  async getContainerObjectCount(containerId: bigint): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(objects)
      .where(eq(objects.containerId, containerId));

    return result[0]?.count ?? 0;
  }

  /**
   * Move an object to a different container
   * @param objectId - Object ID to move
   * @param newContainerId - New container ID (null for world)
   * @param slotArrangement - Slot in the new container
   */
  async moveToContainer(
    objectId: bigint,
    newContainerId: bigint | null,
    slotArrangement: number = -1
  ): Promise<void> {
    await this.db
      .update(objects)
      .set({
        containerId: newContainerId,
        slotArrangement,
        sceneId: newContainerId ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(objects.objectId, objectId));
  }

  /**
   * Move an object to a world position
   * @param objectId - Object ID to move
   * @param sceneId - Zone/scene identifier
   * @param x - X coordinate
   * @param y - Y coordinate (height)
   * @param z - Z coordinate
   */
  async moveToWorld(
    objectId: bigint,
    sceneId: string,
    x: number,
    y: number,
    z: number
  ): Promise<void> {
    await this.db
      .update(objects)
      .set({
        containerId: null,
        slotArrangement: -1,
        sceneId,
        x,
        y,
        z,
        updatedAt: new Date(),
      })
      .where(eq(objects.objectId, objectId));
  }

  /**
   * Update object position
   * @param objectId - Object ID to update
   * @param x - X coordinate
   * @param y - Y coordinate (height)
   * @param z - Z coordinate
   */
  async updatePosition(
    objectId: bigint,
    x: number,
    y: number,
    z: number
  ): Promise<void> {
    await this.db
      .update(objects)
      .set({
        x,
        y,
        z,
        updatedAt: new Date(),
      })
      .where(eq(objects.objectId, objectId));
  }

  /**
   * Get the object factory instance
   * @returns ObjectFactory
   */
  getFactory(): ObjectFactory {
    return this.factory;
  }
}

/**
 * Create a new ObjectRepository instance
 * @param db - Optional database instance (uses getDb() if not provided)
 * @param factory - Optional object factory
 * @returns ObjectRepository instance
 */
export function createObjectRepository(
  db?: Database,
  factory?: ObjectFactory
): ObjectRepository {
  return new ObjectRepository(db, factory);
}
