/**
 * TangibleObject - Physical objects that can be interacted with in the game world
 * Extends SceneObject with properties for items, equipment, containers, etc.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { SceneObject, ObjectType } from './scene-object.js';
import { PvpStatus } from './pvp-status.js';
import { TangibleOptions } from './tangible-options.js';

/**
 * Damage type enumeration for combat calculations
 */
export enum DamageType {
  None = 0,
  Kinetic = 1 << 0,
  Energy = 1 << 1,
  Blast = 1 << 2,
  Stun = 1 << 3,
  Restraint = 1 << 4,
  ElementalHeat = 1 << 5,
  ElementalCold = 1 << 6,
  ElementalAcid = 1 << 7,
  ElementalElectrical = 1 << 8,
}

/**
 * TangibleObject - Base class for all physical/tangible game objects
 * This includes items, equipment, containers, furniture, vehicles, etc.
 */
export class TangibleObject extends SceneObject {
  /** Player-assigned custom name (empty if using template name) */
  customName: string;

  /** Crafting complexity value */
  complexity: number;

  /** Current condition/durability (0 = destroyed) */
  condition: number;

  /** Maximum condition/durability */
  maxCondition: number;

  /** Whether this object is visible to other players */
  visible: boolean;

  /** Whether this object is currently in combat */
  inCombat: boolean;

  /** PvP status flags (bitmask from PvpStatus enum) */
  pvpStatus: number;

  /** Faction CRC this object belongs to (0 = neutral) */
  pvpFaction: CrcValue;

  /** Options bitmask (from TangibleOptions) */
  optionsBitmask: number;

  /** Customization data (appearance, colors, etc.) */
  appearanceData: Uint8Array;

  /** Set of object IDs currently attacking this object (defenders in SWGEmu) */
  defenders: Set<ObjectId>;

  /** Active visual effect names on this object */
  objectEffects: string[];

  /** Maximum hit points for combat */
  maxHitPoints: number;

  /** Component flags for crafted items */
  componentBitmask: number;

  /** Count for stackable items */
  count: number;

  /** Owner object ID (for bio-linked or owned items) */
  ownerId: ObjectId;

  /** Crafted by character ID */
  craftedById: ObjectId;

  /** Serial number for crafted items */
  serialNumber: bigint;

  /** Counter value for items with limited uses */
  useCount: number;

  /** Maximum uses (-1 = unlimited) */
  maxUseCount: number;

  /** Last combat timestamp */
  lastCombatTime: number;

  /** Armor rating for protection calculations */
  armorRating: number;

  /** Protection values against damage types */
  protection: Map<DamageType, number>;

  /** Delta tracking for baseline synchronization */
  private _dirtyFlags: Set<string>;

  /**
   * Create a new TangibleObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Tangible;

    // Initialize tangible-specific properties
    this.customName = '';
    this.complexity = 0;
    this.condition = 100;
    this.maxCondition = 100;
    this.visible = true;
    this.inCombat = false;
    this.pvpStatus = PvpStatus.None;
    this.pvpFaction = 0;
    this.optionsBitmask = TangibleOptions.NONE;
    this.appearanceData = new Uint8Array(0);
    this.defenders = new Set();
    this.objectEffects = [];
    this.maxHitPoints = 0;
    this.componentBitmask = 0;
    this.count = 1;
    this.ownerId = 0n;
    this.craftedById = 0n;
    this.serialNumber = 0n;
    this.useCount = 0;
    this.maxUseCount = -1;
    this.lastCombatTime = 0;
    this.armorRating = 0;
    this.protection = new Map();

    this._dirtyFlags = new Set();
  }

  /**
   * Set the custom name for this object
   */
  setCustomName(name: string): void {
    if (this.customName !== name) {
      this.customName = name;
      this.markDirty('customName');
      this.markModified();
    }
  }

  /**
   * Get the display name (custom name if set, otherwise template name)
   */
  getDisplayName(): string {
    return this.customName || this.getObjectNamePath();
  }

  /**
   * Set the condition of this object
   */
  setCondition(value: number): void {
    const newCondition = Math.max(0, Math.min(value, this.maxCondition));
    if (this.condition !== newCondition) {
      this.condition = newCondition;
      this.markDirty('condition');
      this.markModified();
    }
  }

  /**
   * Damage this object by an amount
   * @returns true if the object was destroyed (condition reached 0)
   */
  damage(amount: number): boolean {
    if (this.hasOption(TangibleOptions.INVULNERABLE)) {
      return false;
    }

    this.setCondition(this.condition - amount);
    return this.condition <= 0;
  }

  /**
   * Repair this object by an amount
   */
  repair(amount: number): void {
    this.setCondition(this.condition + amount);
  }

  /**
   * Get condition as a percentage (0.0 - 1.0)
   */
  getConditionPercent(): number {
    if (this.maxCondition <= 0) return 1.0;
    return this.condition / this.maxCondition;
  }

  /**
   * Check if this object has a specific option flag
   */
  hasOption(option: number): boolean {
    return (this.optionsBitmask & option) !== 0;
  }

  /**
   * Set an option flag
   */
  setOption(option: number): void {
    if ((this.optionsBitmask & option) === 0) {
      this.optionsBitmask |= option;
      this.markDirty('optionsBitmask');
      this.markModified();
    }
  }

  /**
   * Clear an option flag
   */
  clearOption(option: number): void {
    if ((this.optionsBitmask & option) !== 0) {
      this.optionsBitmask &= ~option;
      this.markDirty('optionsBitmask');
      this.markModified();
    }
  }

  /**
   * Check if this object has a specific PvP status flag
   */
  hasPvpFlag(flag: PvpStatus): boolean {
    return (this.pvpStatus & flag) !== 0;
  }

  /**
   * Set a PvP status flag
   */
  setPvpFlag(flag: PvpStatus): void {
    if ((this.pvpStatus & flag) === 0) {
      this.pvpStatus |= flag;
      this.markDirty('pvpStatus');
      this.markModified();
    }
  }

  /**
   * Clear a PvP status flag
   */
  clearPvpFlag(flag: PvpStatus): void {
    if ((this.pvpStatus & flag) !== 0) {
      this.pvpStatus &= ~flag;
      this.markDirty('pvpStatus');
      this.markModified();
    }
  }

  /**
   * Set the PvP faction
   */
  setFaction(factionCrc: CrcValue): void {
    if (this.pvpFaction !== factionCrc) {
      this.pvpFaction = factionCrc;
      this.markDirty('pvpFaction');
      this.markModified();
    }
  }

  /**
   * Add an attacker to the defenders list
   */
  addDefender(attackerId: ObjectId): void {
    if (!this.defenders.has(attackerId)) {
      this.defenders.add(attackerId);
      this.inCombat = true;
      this.lastCombatTime = Date.now();
      this.markDirty('defenders');
      this.markModified();
    }
  }

  /**
   * Remove an attacker from the defenders list
   */
  removeDefender(attackerId: ObjectId): void {
    if (this.defenders.has(attackerId)) {
      this.defenders.delete(attackerId);
      if (this.defenders.size === 0) {
        this.inCombat = false;
      }
      this.markDirty('defenders');
      this.markModified();
    }
  }

  /**
   * Clear all defenders (exit combat)
   */
  clearDefenders(): void {
    if (this.defenders.size > 0) {
      this.defenders.clear();
      this.inCombat = false;
      this.markDirty('defenders');
      this.markModified();
    }
  }

  /**
   * Check if this object is being attacked by a specific object
   */
  isDefendingAgainst(attackerId: ObjectId): boolean {
    return this.defenders.has(attackerId);
  }

  /**
   * Add a visual effect to this object
   */
  addEffect(effectName: string): void {
    if (!this.objectEffects.includes(effectName)) {
      this.objectEffects.push(effectName);
      this.markDirty('objectEffects');
      this.markModified();
    }
  }

  /**
   * Remove a visual effect from this object
   */
  removeEffect(effectName: string): void {
    const index = this.objectEffects.indexOf(effectName);
    if (index !== -1) {
      this.objectEffects.splice(index, 1);
      this.markDirty('objectEffects');
      this.markModified();
    }
  }

  /**
   * Clear all visual effects
   */
  clearEffects(): void {
    if (this.objectEffects.length > 0) {
      this.objectEffects = [];
      this.markDirty('objectEffects');
      this.markModified();
    }
  }

  /**
   * Set appearance/customization data
   */
  setAppearanceData(data: Uint8Array): void {
    this.appearanceData = data;
    this.markDirty('appearanceData');
    this.markModified();
  }

  /**
   * Set item count for stackable items
   */
  setCount(count: number): void {
    if (this.count !== count) {
      this.count = Math.max(0, count);
      this.markDirty('count');
      this.markModified();
    }
  }

  /**
   * Use the item (decrements use count if applicable)
   * @returns true if the item can be used (has uses remaining)
   */
  use(): boolean {
    if (this.maxUseCount >= 0 && this.useCount >= this.maxUseCount) {
      return false;
    }

    if (this.maxUseCount >= 0) {
      this.useCount++;
      this.markDirty('useCount');
      this.markModified();
    }

    return true;
  }

  /**
   * Check if the item has uses remaining
   */
  hasUsesRemaining(): boolean {
    return this.maxUseCount < 0 || this.useCount < this.maxUseCount;
  }

  /**
   * Set protection against a damage type
   */
  setProtection(damageType: DamageType, value: number): void {
    this.protection.set(damageType, value);
    this.markDirty('protection');
    this.markModified();
  }

  /**
   * Get protection against a damage type
   */
  getProtection(damageType: DamageType): number {
    return this.protection.get(damageType) ?? 0;
  }

  /**
   * Set the owner of this object
   */
  setOwner(ownerId: ObjectId): void {
    if (this.ownerId !== ownerId) {
      this.ownerId = ownerId;
      this.markDirty('ownerId');
      this.markModified();
    }
  }

  /**
   * Check if this object is owned by a specific object
   */
  isOwnedBy(objectId: ObjectId): boolean {
    return this.ownerId === objectId;
  }

  /**
   * Mark a property as dirty (changed since last baseline)
   */
  markDirty(property: string): void {
    this._dirtyFlags.add(property);
  }

  /**
   * Check if a property is dirty
   */
  isDirty(property: string): boolean {
    return this._dirtyFlags.has(property);
  }

  /**
   * Get all dirty properties
   */
  getDirtyProperties(): string[] {
    return Array.from(this._dirtyFlags);
  }

  /**
   * Clear all dirty flags (after sending baseline/delta)
   */
  clearDirtyFlags(): void {
    this._dirtyFlags.clear();
  }

  /**
   * Check if any properties are dirty
   */
  hasDirtyProperties(): boolean {
    return this._dirtyFlags.size > 0;
  }

  /**
   * Check if this object can be traded
   */
  canTrade(): boolean {
    return (
      !this.hasOption(TangibleOptions.NO_TRADE) &&
      !this.hasOption(TangibleOptions.BIO_LINK) &&
      !this.hasOption(TangibleOptions.QUEST_ITEM)
    );
  }

  /**
   * Check if this object can be dropped
   */
  canDrop(): boolean {
    return !this.hasOption(TangibleOptions.NO_DROP) && !this.hasOption(TangibleOptions.QUEST_ITEM);
  }

  /**
   * Check if this object can be destroyed
   */
  canDestroy(): boolean {
    return (
      !this.hasOption(TangibleOptions.NO_DESTROY) &&
      !this.hasOption(TangibleOptions.INVULNERABLE) &&
      !this.hasOption(TangibleOptions.QUEST_ITEM)
    );
  }

  /**
   * Clone this tangible object's properties to another
   */
  copyPropertiesTo(target: TangibleObject): void {
    target.customName = this.customName;
    target.volume = this.volume;
    target.complexity = this.complexity;
    target.condition = this.condition;
    target.maxCondition = this.maxCondition;
    target.visible = this.visible;
    target.pvpStatus = this.pvpStatus;
    target.pvpFaction = this.pvpFaction;
    target.optionsBitmask = this.optionsBitmask;
    target.appearanceData = new Uint8Array(this.appearanceData);
    target.objectEffects = [...this.objectEffects];
    target.maxHitPoints = this.maxHitPoints;
    target.componentBitmask = this.componentBitmask;
    target.count = this.count;
    target.armorRating = this.armorRating;

    // Copy protection map
    for (const [damageType, value] of this.protection) {
      target.protection.set(damageType, value);
    }
  }
}
