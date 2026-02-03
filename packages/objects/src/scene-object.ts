/**
 * SceneObject - Base class for all objects that exist in the game world
 * This is the foundation class from which all game objects derive
 *
 * Based on SWGEmu Core3's SceneObject implementation. This class provides:
 * - Unique 64-bit snowflake-style object identification
 * - Position and orientation in 3D space
 * - Container/hierarchy relationships
 * - Network synchronization (baselines and deltas)
 * - Observer pattern for client visibility
 */

import type { ObjectId, Vector3, Quaternion, CrcValue, SceneId } from '@swg/shared-types';

/**
 * Object type enumeration matching SWG object types
 * These correspond to the different baseline types used by the client
 */
export enum ObjectType {
  /** Base scene object (SCLT baseline) */
  Scene = 0,
  /** Tangible objects (TANO baseline) */
  Tangible = 1,
  /** Creatures and NPCs (CREO baseline) */
  Creature = 2,
  /** Player characters (PLAY baseline) */
  Player = 3,
  /** Buildings and structures (BUIO baseline) */
  Building = 4,
  /** Cells within buildings (SCLT baseline) */
  Cell = 5,
  /** Installations like harvesters (HINO/MINO baseline) */
  Installation = 6,
  /** Intangible objects like missions, waypoints (ITNO baseline) */
  Intangible = 7,
  /** Static world objects */
  Static = 8,
  /** Waypoint markers (WAYP baseline) */
  Waypoint = 9,
  /** Weapons (WEAO baseline) */
  Weapon = 10,
  /** Armor pieces */
  Armor = 11,
  /** Resource containers */
  Resource = 12,
  /** Mission objects (MISO baseline) */
  Mission = 13,
  /** Manufacturing schematics (MSCO baseline) */
  Manufacturing = 14,
  /** Groups (GRUP baseline) */
  Group = 15,
  /** Guilds (GILD baseline) */
  Guild = 16,
  /** Ships and vehicles (SHIP baseline) */
  Ship = 17,
  /** Generic containers */
  Container = 18,
  /** Deeds for structures/vehicles */
  Deed = 19,
  /** Crafting tools */
  CraftingTool = 20,
  /** Survey tools */
  SurveyTool = 21,
  /** Terminals */
  Terminal = 22,
}

/**
 * SceneObject - Base class for all game objects
 * Provides common properties like position, orientation, containment, and object identity
 */
export class SceneObject {
  /** Unique 64-bit object identifier (snowflake-style) */
  readonly objectId: ObjectId;

  /** CRC hash of the object template (.iff file) */
  templateCrc: CrcValue;

  /** Object type for runtime type checking */
  objectType: ObjectType;

  /** ID of the scene/zone this object is in (empty if in a container) */
  sceneId: SceneId;

  /** Position in world or cell coordinates */
  position: Vector3;

  /** Orientation as a quaternion */
  orientation: Quaternion;

  /** ID of the container holding this object (0n if in world) */
  containerId: ObjectId;

  /** Network ID for client synchronization (unique per-session identifier) */
  networkId: number;

  /** Slot arrangement index within container (-1 if not slotted) */
  slotArrangement: number;

  /** Scale factor for object rendering (1.0 = normal) */
  scale: number;

  /** Complexity value for crafting/resources */
  objectComplexity: number;

  /** Volume (space consumed in containers) */
  volume: number;

  /** Name from string table (e.g., "@item_n:blaster") */
  objectNameStfFile: string;
  objectNameStfName: string;

  /** Detailed description string table reference */
  detailStfFile: string;
  detailStfName: string;

  /** Set of object IDs observing this object */
  observers: Set<ObjectId>;

  /** Set of object IDs contained by this object */
  containedObjects: Set<ObjectId>;

  /** Baseline update counter for delta synchronization */
  baselineVersion: number;

  /** Flag indicating if this object is active in the world */
  isActive: boolean;

  /** Timestamp of object creation */
  createdAt: number;

  /** Timestamp of last modification */
  modifiedAt: number;

  /** Static counter for generating unique network IDs */
  private static nextNetworkId: number = 1;

  /**
   * Create a new SceneObject
   * @param objectId - Unique 64-bit identifier for this object
   * @param templateCrc - CRC32 hash of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    this.objectId = objectId;
    this.templateCrc = templateCrc;
    this.objectType = ObjectType.Scene;
    this.sceneId = '';
    this.position = { x: 0, y: 0, z: 0 };
    this.orientation = { x: 0, y: 0, z: 0, w: 1 };
    this.containerId = 0n;
    this.networkId = SceneObject.nextNetworkId++;
    this.slotArrangement = -1;
    this.scale = 1.0;
    this.objectComplexity = 0;
    this.volume = 1;
    this.objectNameStfFile = '';
    this.objectNameStfName = '';
    this.detailStfFile = '';
    this.detailStfName = '';
    this.observers = new Set();
    this.containedObjects = new Set();
    this.baselineVersion = 0;
    this.isActive = false;
    this.createdAt = Date.now();
    this.modifiedAt = Date.now();
  }

  /**
   * Reset the network ID counter (useful for testing)
   */
  static resetNetworkIdCounter(): void {
    SceneObject.nextNetworkId = 1;
  }

  /**
   * Get the current network ID counter value
   */
  static getNextNetworkId(): number {
    return SceneObject.nextNetworkId;
  }

  /**
   * Set the object's position in world coordinates
   */
  setPosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.markModified();
  }

  /**
   * Set the object's orientation
   */
  setOrientation(x: number, y: number, z: number, w: number): void {
    this.orientation.x = x;
    this.orientation.y = y;
    this.orientation.z = z;
    this.orientation.w = w;
    this.markModified();
  }

  /**
   * Set the object's heading (rotation around Y axis)
   * @param radians - Heading in radians
   */
  setHeading(radians: number): void {
    // Convert heading to quaternion (rotation around Y axis)
    const halfAngle = radians / 2;
    this.orientation.x = 0;
    this.orientation.y = Math.sin(halfAngle);
    this.orientation.z = 0;
    this.orientation.w = Math.cos(halfAngle);
    this.markModified();
  }

  /**
   * Get the object's heading in radians (0 to 2*PI)
   * @returns Heading normalized to range [0, 2*PI)
   */
  getHeading(): number {
    // Extract heading from quaternion
    let heading = 2 * Math.atan2(this.orientation.y, this.orientation.w);
    // Normalize to 0-2PI range
    const twoPi = Math.PI * 2;
    heading = heading % twoPi;
    if (heading < 0) {
      heading += twoPi;
    }
    return heading;
  }

  /**
   * Set the object name from string table references
   */
  setObjectName(stfFile: string, stfName: string): void {
    this.objectNameStfFile = stfFile;
    this.objectNameStfName = stfName;
    this.markModified();
  }

  /**
   * Set the detail description from string table references
   */
  setDetailDescription(stfFile: string, stfName: string): void {
    this.detailStfFile = stfFile;
    this.detailStfName = stfName;
    this.markModified();
  }

  /**
   * Move this object into a container
   */
  moveToContainer(containerId: ObjectId, slotArrangement: number = -1): void {
    this.containerId = containerId;
    this.slotArrangement = slotArrangement;
    this.sceneId = ''; // Not in world when in a container
    this.markModified();
  }

  /**
   * Move this object to the world
   */
  moveToWorld(sceneId: SceneId, x: number, y: number, z: number): void {
    this.sceneId = sceneId;
    this.containerId = 0n;
    this.slotArrangement = -1;
    this.setPosition(x, y, z);
  }

  /**
   * Check if this object is in a container
   */
  isInContainer(): boolean {
    return this.containerId !== 0n;
  }

  /**
   * Check if this object is in the world
   */
  isInWorld(): boolean {
    return this.sceneId !== '' && !this.isInContainer();
  }

  /**
   * Add an object to this object's contents
   */
  addContainedObject(objectId: ObjectId): void {
    this.containedObjects.add(objectId);
    this.markModified();
  }

  /**
   * Remove an object from this object's contents
   */
  removeContainedObject(objectId: ObjectId): void {
    this.containedObjects.delete(objectId);
    this.markModified();
  }

  /**
   * Add an observer to this object
   */
  addObserver(observerId: ObjectId): void {
    this.observers.add(observerId);
  }

  /**
   * Remove an observer from this object
   */
  removeObserver(observerId: ObjectId): void {
    this.observers.delete(observerId);
  }

  /**
   * Check if an object is observing this one
   */
  hasObserver(observerId: ObjectId): boolean {
    return this.observers.has(observerId);
  }

  /**
   * Mark this object as modified (updates timestamp and baseline version)
   */
  markModified(): void {
    this.modifiedAt = Date.now();
    this.baselineVersion++;
  }

  /**
   * Calculate distance to another position
   */
  distanceTo(other: Vector3): number {
    const dx = this.position.x - other.x;
    const dy = this.position.y - other.y;
    const dz = this.position.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate squared distance (faster, good for comparisons)
   */
  distanceSquaredTo(other: Vector3): number {
    const dx = this.position.x - other.x;
    const dy = this.position.y - other.y;
    const dz = this.position.z - other.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Check if another position is within range
   */
  isInRange(other: Vector3, range: number): boolean {
    return this.distanceSquaredTo(other) <= range * range;
  }

  /**
   * Get the full object name string table path
   */
  getObjectNamePath(): string {
    if (this.objectNameStfFile && this.objectNameStfName) {
      return `@${this.objectNameStfFile}:${this.objectNameStfName}`;
    }
    return '';
  }

  /**
   * Get the full detail description string table path
   */
  getDetailPath(): string {
    if (this.detailStfFile && this.detailStfName) {
      return `@${this.detailStfFile}:${this.detailStfName}`;
    }
    return '';
  }

  /**
   * Calculate 2D distance (ignoring Y axis) to another position
   * Useful for ground-based range checks
   */
  distanceTo2D(other: Vector3): number {
    const dx = this.position.x - other.x;
    const dz = this.position.z - other.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Check if another position is within 2D range (ignoring Y)
   */
  isInRange2D(other: Vector3, range: number): boolean {
    const dx = this.position.x - other.x;
    const dz = this.position.z - other.z;
    return (dx * dx + dz * dz) <= range * range;
  }

  /**
   * Get the baseline type string for this object
   * Override in subclasses to return the appropriate type
   * @returns Four-character baseline type (e.g., 'SCLT', 'TANO', 'CREO')
   */
  getBaselineType(): string {
    return 'SCLT';
  }

  /**
   * Serialize the object to a plain JSON-compatible object
   * Used for persistence and debugging
   */
  toJSON(): Record<string, unknown> {
    return {
      objectId: this.objectId.toString(),
      templateCrc: this.templateCrc,
      objectType: this.objectType,
      sceneId: this.sceneId,
      position: { ...this.position },
      orientation: { ...this.orientation },
      containerId: this.containerId.toString(),
      networkId: this.networkId,
      slotArrangement: this.slotArrangement,
      scale: this.scale,
      objectComplexity: this.objectComplexity,
      volume: this.volume,
      objectNameStfFile: this.objectNameStfFile,
      objectNameStfName: this.objectNameStfName,
      detailStfFile: this.detailStfFile,
      detailStfName: this.detailStfName,
      baselineVersion: this.baselineVersion,
      isActive: this.isActive,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    };
  }
}
