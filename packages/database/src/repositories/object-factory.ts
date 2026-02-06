/**
 * Object Factory
 * Converts database rows to typed SceneObject hierarchy instances
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { SceneObject, ObjectType, TangibleObject } from '@swg/objects';
import type {
  GameObject,
  ObjectTangible,
  ObjectCreature,
  ObjectWithRelations,
} from '../schema/objects.js';

/**
 * Template loader interface for resolving template CRCs to objects
 */
export interface TemplateLoader {
  /**
   * Load a template by its CRC value
   * @param templateCrc - The CRC32 hash of the template path
   * @returns Template data or null if not found
   */
  loadTemplate(templateCrc: CrcValue): Promise<TemplateData | null>;
}

/**
 * Template data structure
 */
export interface TemplateData {
  templateCrc: CrcValue;
  templatePath: string;
  objectType: ObjectType;
  defaultProperties?: Record<string, unknown>;
}

/**
 * Object factory configuration
 */
export interface ObjectFactoryConfig {
  /** Template loader for resolving templates */
  templateLoader?: TemplateLoader;
}

/**
 * Object Factory
 * Converts database rows to typed SceneObject instances
 */
export class ObjectFactory {
  private templateLoader?: TemplateLoader | undefined;
  private templateCache: Map<CrcValue, TemplateData | null> = new Map();

  constructor(config: ObjectFactoryConfig = {}) {
    this.templateLoader = config.templateLoader;
  }

  /**
   * Create a SceneObject from database row data
   * Automatically determines the correct subclass based on typeId
   * @param row - Combined database row with relations
   * @returns Typed SceneObject instance
   */
  createFromRow(row: ObjectWithRelations): SceneObject {
    const objectType = row.typeId as ObjectType;

    switch (objectType) {
      case ObjectType.Tangible:
      case ObjectType.Weapon:
      case ObjectType.Armor:
      case ObjectType.Resource:
      case ObjectType.Container:
      case ObjectType.Deed:
      case ObjectType.CraftingTool:
      case ObjectType.SurveyTool:
      case ObjectType.Terminal:
        return this.createTangibleObject(row);

      // TODO: Add CreatureObject, PlayerObject, etc. when implemented
      // case ObjectType.Creature:
      // case ObjectType.Player:
      //   return this.createCreatureObject(row);

      case ObjectType.Scene:
      default:
        return this.createSceneObject(row);
    }
  }

  /**
   * Create a base SceneObject from database row
   * @param row - Database row data
   * @returns SceneObject instance
   */
  createSceneObject(row: GameObject): SceneObject {
    const obj = new SceneObject(
      row.objectId as ObjectId,
      row.templateCrc as CrcValue
    );

    this.populateSceneObjectFields(obj, row);

    return obj;
  }

  /**
   * Create a TangibleObject from database row with tangible data
   * @param row - Database row with tangible relation
   * @returns TangibleObject instance
   */
  createTangibleObject(row: ObjectWithRelations): TangibleObject {
    const obj = new TangibleObject(
      row.objectId as ObjectId,
      row.templateCrc as CrcValue
    );

    this.populateSceneObjectFields(obj, row);
    this.populateTangibleFields(obj, row.tangible);

    return obj;
  }

  /**
   * Populate base SceneObject fields from database row
   * @param obj - SceneObject to populate
   * @param row - Database row data
   */
  private populateSceneObjectFields(obj: SceneObject, row: GameObject): void {
    obj.objectType = row.typeId as ObjectType;
    obj.sceneId = row.sceneId ?? '';
    obj.position = { x: row.x, y: row.y, z: row.z };
    obj.orientation = {
      w: row.orientationW,
      x: row.orientationX,
      y: row.orientationY,
      z: row.orientationZ,
    };
    obj.containerId = row.containerId ?? 0n;
    obj.slotArrangement = row.slotArrangement;
    obj.scale = row.scale;
    obj.volume = row.volume;
    obj.objectComplexity = row.objectComplexity;
    obj.objectNameStfFile = row.objectNameStfFile ?? '';
    obj.objectNameStfName = row.objectNameStfName ?? '';
    obj.createdAt = row.createdAt.getTime();
    obj.modifiedAt = row.updatedAt.getTime();
  }

  /**
   * Populate TangibleObject-specific fields from database row
   * @param obj - TangibleObject to populate
   * @param tangible - Tangible data from database
   */
  private populateTangibleFields(
    obj: TangibleObject,
    tangible?: ObjectTangible | null
  ): void {
    if (!tangible) {
      return;
    }

    obj.customName = tangible.customName ?? '';
    obj.condition = tangible.condition;
    obj.maxCondition = tangible.maxCondition;
    obj.pvpStatus = tangible.pvpStatus;
    obj.pvpFaction = tangible.pvpFaction as CrcValue;
    obj.optionsBitmask = tangible.optionsBitmask;
    obj.count = tangible.count;
    obj.maxHitPoints = tangible.maxHitPoints;
    obj.ownerId = tangible.ownerId ?? 0n;
    obj.craftedById = tangible.craftedById ?? 0n;
    obj.serialNumber = tangible.serialNumber ?? 0n;
    obj.useCount = tangible.useCount;
    obj.maxUseCount = tangible.maxUseCount;
    obj.armorRating = tangible.armorRating;

    if (tangible.appearanceData) {
      obj.appearanceData = new Uint8Array(tangible.appearanceData);
    }
  }

  /**
   * Extract base object data for database insertion
   * @param obj - SceneObject to extract data from
   * @returns Database-compatible object data
   */
  extractObjectData(obj: SceneObject): Omit<GameObject, 'createdAt' | 'updatedAt'> {
    return {
      objectId: obj.objectId,
      templateCrc: obj.templateCrc,
      typeId: obj.objectType,
      containerId: obj.containerId !== 0n ? obj.containerId : null,
      slotArrangement: obj.slotArrangement,
      sceneId: obj.sceneId || null,
      x: obj.position.x,
      y: obj.position.y,
      z: obj.position.z,
      orientationW: obj.orientation.w,
      orientationX: obj.orientation.x,
      orientationY: obj.orientation.y,
      orientationZ: obj.orientation.z,
      loadContents: true,
      objectNameStfFile: obj.objectNameStfFile || null,
      objectNameStfName: obj.objectNameStfName || null,
      scale: obj.scale,
      volume: obj.volume,
      objectComplexity: obj.objectComplexity,
    };
  }

  /**
   * Extract tangible data for database insertion
   * @param obj - TangibleObject to extract data from
   * @returns Database-compatible tangible data
   */
  extractTangibleData(obj: TangibleObject): ObjectTangible {
    return {
      objectId: obj.objectId,
      customName: obj.customName || null,
      condition: obj.condition,
      maxCondition: obj.maxCondition,
      pvpStatus: obj.pvpStatus,
      pvpFaction: obj.pvpFaction,
      optionsBitmask: obj.optionsBitmask,
      count: obj.count,
      maxHitPoints: obj.maxHitPoints,
      ownerId: obj.ownerId !== 0n ? obj.ownerId : null,
      craftedById: obj.craftedById !== 0n ? obj.craftedById : null,
      serialNumber: obj.serialNumber !== 0n ? obj.serialNumber : null,
      useCount: obj.useCount,
      maxUseCount: obj.maxUseCount,
      appearanceData: obj.appearanceData.length > 0
        ? Buffer.from(obj.appearanceData)
        : null,
      armorRating: obj.armorRating,
    };
  }

  /**
   * Check if a SceneObject is a TangibleObject
   * @param obj - Object to check
   * @returns True if object is a TangibleObject
   */
  isTangibleObject(obj: SceneObject): obj is TangibleObject {
    return obj instanceof TangibleObject;
  }

  /**
   * Get the object type enum value for a SceneObject
   * @param obj - Object to check
   * @returns ObjectType value
   */
  getObjectType(obj: SceneObject): ObjectType {
    if (obj instanceof TangibleObject) {
      return obj.objectType;
    }
    return ObjectType.Scene;
  }

  /**
   * Determine if an object type requires tangible data
   * @param typeId - Object type ID
   * @returns True if tangible data is needed
   */
  requiresTangibleData(typeId: ObjectType): boolean {
    return [
      ObjectType.Tangible,
      ObjectType.Weapon,
      ObjectType.Armor,
      ObjectType.Resource,
      ObjectType.Container,
      ObjectType.Deed,
      ObjectType.CraftingTool,
      ObjectType.SurveyTool,
      ObjectType.Terminal,
    ].includes(typeId);
  }

  /**
   * Determine if an object type requires creature data
   * @param typeId - Object type ID
   * @returns True if creature data is needed
   */
  requiresCreatureData(typeId: ObjectType): boolean {
    return [ObjectType.Creature, ObjectType.Player].includes(typeId);
  }

  /**
   * Load and cache a template by CRC
   * @param templateCrc - Template CRC to load
   * @returns Template data or null
   */
  async loadTemplate(templateCrc: CrcValue): Promise<TemplateData | null> {
    if (this.templateCache.has(templateCrc)) {
      return this.templateCache.get(templateCrc)!;
    }

    if (!this.templateLoader) {
      return null;
    }

    const template = await this.templateLoader.loadTemplate(templateCrc);
    this.templateCache.set(templateCrc, template);
    return template;
  }

  /**
   * Clear the template cache
   */
  clearTemplateCache(): void {
    this.templateCache.clear();
  }
}

/**
 * Create a new ObjectFactory instance
 * @param config - Factory configuration
 * @returns ObjectFactory instance
 */
export function createObjectFactory(
  config: ObjectFactoryConfig = {}
): ObjectFactory {
  return new ObjectFactory(config);
}
