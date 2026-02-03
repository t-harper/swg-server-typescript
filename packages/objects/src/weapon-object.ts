/**
 * WeaponObject - Represents weapons in the SWG game world
 * Extends TangibleObject with damage, speed, range, and combat properties.
 *
 * SWG weapons have complex mechanics including:
 * - Base damage (kinetic, energy, etc.)
 * - Elemental damage (heat, cold, acid, electricity)
 * - Attack speed and wound chance
 * - Range (min, max, ideal for accuracy)
 * - Armor piercing capability
 * - AOE damage radius
 * - Powerup attachment slots
 * - Certification requirements
 *
 * Baseline Types:
 * - WEAO3: Damage, speed, type, range (shared data)
 * - WEAO6: Attack mods, powerups, condition (server data)
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject, DamageType } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  WeaponType,
  ArmorPiercing,
  ElementalType,
  isRangedWeapon,
  isMeleeWeapon,
  getDefaultWeaponRange,
} from './weapon-types.js';

// Re-export weapon types for convenience
export { WeaponType, ArmorPiercing, ElementalType } from './weapon-types.js';

/**
 * WEAO property indices for delta tracking
 * These match the variable indices in WEAO baselines
 */
export const WeaoProperty = {
  // WEAO3 (Shared)
  MIN_DAMAGE: 0,
  MAX_DAMAGE: 1,
  DAMAGE_TYPE: 2,
  ELEMENTAL_TYPE: 3,
  ELEMENTAL_DAMAGE: 4,
  ATTACK_SPEED: 5,
  WOUND_CHANCE: 6,
  MIN_RANGE: 7,
  MAX_RANGE: 8,
  IDEAL_RANGE: 9,
  WEAPON_TYPE: 10,
  ARMOR_PIERCING: 11,
  DAMAGE_RADIUS: 12,

  // WEAO6 (Server)
  ATTACK_MODS: 0,
  DEFENSE_MODS: 1,
  SPECIAL_ATTACK_COST: 2,
  POWERUP_SLOTS: 3,
  ATTACHED_POWERUPS: 4,
  REQUIRED_CERTIFICATION: 5,
  HIT_TYPE: 6,
} as const;

/**
 * Hit type for combat animations
 */
export enum HitType {
  Default = 0,
  Body = 1,
  Head = 2,
  LeftArm = 3,
  RightArm = 4,
  LeftLeg = 5,
  RightLeg = 6,
}

/**
 * WeaponObject - Represents weapons that can be equipped and used in combat
 * Extends TangibleObject with weapon-specific properties
 */
export class WeaponObject extends TangibleObject {
  // ============================================
  // Damage Properties
  // ============================================

  /** Minimum base damage per attack */
  minDamage: number;

  /** Maximum base damage per attack */
  maxDamage: number;

  /** Primary damage type (kinetic, energy, etc.) */
  damageType: DamageType;

  /** Elemental damage type (heat, cold, acid, electricity) */
  elementalType: ElementalType;

  /** Additional elemental damage per attack */
  elementalDamage: number;

  // ============================================
  // Speed and Timing
  // ============================================

  /** Attack speed in attacks per second (higher = faster) */
  attackSpeed: number;

  /** Chance to inflict wounds (0.0 - 1.0) */
  woundChance: number;

  // ============================================
  // Range Properties
  // ============================================

  /** Minimum effective range in meters */
  minRange: number;

  /** Maximum effective range in meters */
  maxRange: number;

  /** Ideal range for accuracy bonus in meters */
  idealRange: number;

  // ============================================
  // Combat Modifiers
  // ============================================

  /** Accuracy modifier bonus */
  attackMods: number;

  /** Defense modifier when this weapon is equipped */
  defenseMods: number;

  // ============================================
  // Weapon Classification
  // ============================================

  /** Type of weapon (rifle, pistol, sword, etc.) */
  weaponType: WeaponType;

  /** Armor piercing capability */
  armorPiercing: ArmorPiercing;

  // ============================================
  // Special Properties
  // ============================================

  /** Area of effect damage radius (0 = single target) */
  damageRadius: number;

  /** Action cost for special attacks */
  specialAttackCost: number;

  /** Hit type for combat animations */
  hitType: HitType;

  // ============================================
  // Powerup System
  // ============================================

  /** Number of powerup attachment slots */
  powerupSlots: number;

  /** Object IDs of attached powerups */
  attachedPowerups: ObjectId[];

  // ============================================
  // Certification
  // ============================================

  /** Skill certification required to use this weapon */
  requiredCertification: string;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for WEAO3 */
  private deltaTrackerWeao3: DeltaTracker;

  /** Delta tracker for WEAO6 */
  private deltaTrackerWeao6: DeltaTracker;

  /**
   * Create a new WeaponObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Weapon;

    // Initialize damage properties
    this.minDamage = 10;
    this.maxDamage = 50;
    this.damageType = DamageType.Kinetic;
    this.elementalType = ElementalType.None;
    this.elementalDamage = 0;

    // Initialize speed properties
    this.attackSpeed = 1.0; // 1 attack per second
    this.woundChance = 0.0;

    // Initialize range properties (default melee)
    this.minRange = 0;
    this.maxRange = 5;
    this.idealRange = 0;

    // Initialize modifiers
    this.attackMods = 0;
    this.defenseMods = 0;

    // Initialize type properties
    this.weaponType = WeaponType.Unarmed;
    this.armorPiercing = ArmorPiercing.None;

    // Initialize special properties
    this.damageRadius = 0;
    this.specialAttackCost = 100;
    this.hitType = HitType.Default;

    // Initialize powerup system
    this.powerupSlots = 0;
    this.attachedPowerups = [];

    // Initialize certification
    this.requiredCertification = '';

    // Initialize delta trackers
    this.deltaTrackerWeao3 = new DeltaTracker();
    this.deltaTrackerWeao6 = new DeltaTracker();
  }

  /**
   * Get baseline type for WEAO objects
   */
  override getBaselineType(): string {
    return 'WEAO';
  }

  // ============================================
  // Damage Management
  // ============================================

  /**
   * Set the damage range
   */
  setDamageRange(min: number, max: number): void {
    if (min > max) {
      [min, max] = [max, min];
    }
    if (this.minDamage !== min || this.maxDamage !== max) {
      this.minDamage = Math.max(1, min);
      this.maxDamage = Math.max(this.minDamage, max);
      this.deltaTrackerWeao3.trackChange(WeaoProperty.MIN_DAMAGE, DeltaType.Change);
      this.deltaTrackerWeao3.trackChange(WeaoProperty.MAX_DAMAGE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the primary damage type
   */
  setDamageType(type: DamageType): void {
    if (this.damageType !== type) {
      this.damageType = type;
      this.deltaTrackerWeao3.trackChange(WeaoProperty.DAMAGE_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the elemental damage properties
   */
  setElementalDamage(type: ElementalType, damage: number): void {
    if (this.elementalType !== type || this.elementalDamage !== damage) {
      this.elementalType = type;
      this.elementalDamage = Math.max(0, damage);
      this.deltaTrackerWeao3.trackChange(WeaoProperty.ELEMENTAL_TYPE, DeltaType.Change);
      this.deltaTrackerWeao3.trackChange(WeaoProperty.ELEMENTAL_DAMAGE, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Speed Management
  // ============================================

  /**
   * Set the attack speed
   * @param speed - Attacks per second (0.5 = slow, 2.0 = fast)
   */
  setAttackSpeed(speed: number): void {
    const newSpeed = Math.max(0.1, Math.min(speed, 5.0));
    if (this.attackSpeed !== newSpeed) {
      this.attackSpeed = newSpeed;
      this.deltaTrackerWeao3.trackChange(WeaoProperty.ATTACK_SPEED, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the wound chance
   * @param chance - Probability 0.0 to 1.0
   */
  setWoundChance(chance: number): void {
    const newChance = Math.max(0, Math.min(chance, 1.0));
    if (this.woundChance !== newChance) {
      this.woundChance = newChance;
      this.deltaTrackerWeao3.trackChange(WeaoProperty.WOUND_CHANCE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the attack delay in seconds (inverse of attack speed)
   */
  getAttackDelay(): number {
    return 1.0 / this.attackSpeed;
  }

  // ============================================
  // Range Management
  // ============================================

  /**
   * Set the weapon range parameters
   */
  setRange(min: number, max: number, ideal: number): void {
    this.minRange = Math.max(0, min);
    this.maxRange = Math.max(this.minRange, max);
    this.idealRange = Math.max(this.minRange, Math.min(ideal, this.maxRange));
    this.deltaTrackerWeao3.trackChange(WeaoProperty.MIN_RANGE, DeltaType.Change);
    this.deltaTrackerWeao3.trackChange(WeaoProperty.MAX_RANGE, DeltaType.Change);
    this.deltaTrackerWeao3.trackChange(WeaoProperty.IDEAL_RANGE, DeltaType.Change);
    this.markModified();
  }

  /**
   * Set default range based on weapon type
   */
  setDefaultRangeForType(): void {
    const range = getDefaultWeaponRange(this.weaponType);
    this.setRange(range.min, range.max, range.ideal);
  }

  /**
   * Check if a target is within range
   */
  isInRange(distance: number): boolean {
    return distance >= this.minRange && distance <= this.maxRange;
  }

  /**
   * Check if this is a ranged weapon
   */
  isRanged(): boolean {
    return isRangedWeapon(this.weaponType);
  }

  /**
   * Check if this is a melee weapon
   */
  isMelee(): boolean {
    return isMeleeWeapon(this.weaponType);
  }

  // ============================================
  // Type Management
  // ============================================

  /**
   * Set the weapon type
   */
  setWeaponType(type: WeaponType): void {
    if (this.weaponType !== type) {
      this.weaponType = type;
      this.deltaTrackerWeao3.trackChange(WeaoProperty.WEAPON_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the armor piercing level
   */
  setArmorPiercing(level: ArmorPiercing): void {
    if (this.armorPiercing !== level) {
      this.armorPiercing = level;
      this.deltaTrackerWeao3.trackChange(WeaoProperty.ARMOR_PIERCING, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Modifier Management
  // ============================================

  /**
   * Set attack modifier
   */
  setAttackMods(mods: number): void {
    if (this.attackMods !== mods) {
      this.attackMods = mods;
      this.deltaTrackerWeao6.trackChange(WeaoProperty.ATTACK_MODS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set defense modifier
   */
  setDefenseMods(mods: number): void {
    if (this.defenseMods !== mods) {
      this.defenseMods = mods;
      this.deltaTrackerWeao6.trackChange(WeaoProperty.DEFENSE_MODS, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // AOE and Special Properties
  // ============================================

  /**
   * Set the damage radius for AOE weapons
   * @param radius - Radius in meters (0 = single target)
   */
  setDamageRadius(radius: number): void {
    const newRadius = Math.max(0, radius);
    if (this.damageRadius !== newRadius) {
      this.damageRadius = newRadius;
      this.deltaTrackerWeao3.trackChange(WeaoProperty.DAMAGE_RADIUS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if this weapon has AOE capability
   */
  isAOE(): boolean {
    return this.damageRadius > 0;
  }

  /**
   * Set the special attack action cost
   */
  setSpecialAttackCost(cost: number): void {
    const newCost = Math.max(0, cost);
    if (this.specialAttackCost !== newCost) {
      this.specialAttackCost = newCost;
      this.deltaTrackerWeao6.trackChange(WeaoProperty.SPECIAL_ATTACK_COST, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Powerup Management
  // ============================================

  /**
   * Set the number of powerup slots
   */
  setPowerupSlots(slots: number): void {
    const newSlots = Math.max(0, Math.min(slots, 4));
    if (this.powerupSlots !== newSlots) {
      this.powerupSlots = newSlots;
      this.deltaTrackerWeao6.trackChange(WeaoProperty.POWERUP_SLOTS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Attach a powerup to the weapon
   * @returns true if successful, false if no slots available
   */
  attachPowerup(powerupId: ObjectId): boolean {
    if (this.attachedPowerups.length >= this.powerupSlots) {
      return false;
    }
    if (this.attachedPowerups.includes(powerupId)) {
      return false;
    }

    this.attachedPowerups.push(powerupId);
    this.deltaTrackerWeao6.trackListAdd(
      WeaoProperty.ATTACHED_POWERUPS,
      this.attachedPowerups.length - 1,
      powerupId
    );
    this.markModified();
    return true;
  }

  /**
   * Remove a powerup from the weapon
   * @returns true if found and removed
   */
  removePowerup(powerupId: ObjectId): boolean {
    const index = this.attachedPowerups.indexOf(powerupId);
    if (index === -1) {
      return false;
    }

    this.attachedPowerups.splice(index, 1);
    this.deltaTrackerWeao6.trackListRemove(WeaoProperty.ATTACHED_POWERUPS, index, powerupId);
    this.markModified();
    return true;
  }

  /**
   * Get the number of available powerup slots
   */
  getAvailablePowerupSlots(): number {
    return Math.max(0, this.powerupSlots - this.attachedPowerups.length);
  }

  /**
   * Check if the weapon has powerups attached
   */
  hasPowerups(): boolean {
    return this.attachedPowerups.length > 0;
  }

  // ============================================
  // Certification
  // ============================================

  /**
   * Set the required certification
   */
  setRequiredCertification(cert: string): void {
    if (this.requiredCertification !== cert) {
      this.requiredCertification = cert;
      this.deltaTrackerWeao6.trackChange(WeaoProperty.REQUIRED_CERTIFICATION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a creature has the required certification
   * @param skills - Set of skill names the creature has
   */
  canBeUsedBy(skills: Set<string>): boolean {
    if (!this.requiredCertification) {
      return true;
    }
    return skills.has(this.requiredCertification);
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if WEAO3 has changes
   */
  hasWeao3Changes(): boolean {
    return this.deltaTrackerWeao3.hasChanges();
  }

  /**
   * Check if WEAO6 has changes
   */
  hasWeao6Changes(): boolean {
    return this.deltaTrackerWeao6.hasChanges();
  }

  /**
   * Get WEAO3 delta tracker
   */
  getWeao3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerWeao3;
  }

  /**
   * Get WEAO6 delta tracker
   */
  getWeao6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerWeao6;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.deltaTrackerWeao3.clear();
    this.deltaTrackerWeao6.clear();
    this.clearDirtyFlags();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      minDamage: this.minDamage,
      maxDamage: this.maxDamage,
      damageType: this.damageType,
      elementalType: this.elementalType,
      elementalDamage: this.elementalDamage,
      attackSpeed: this.attackSpeed,
      woundChance: this.woundChance,
      minRange: this.minRange,
      maxRange: this.maxRange,
      idealRange: this.idealRange,
      attackMods: this.attackMods,
      defenseMods: this.defenseMods,
      weaponType: this.weaponType,
      armorPiercing: this.armorPiercing,
      damageRadius: this.damageRadius,
      specialAttackCost: this.specialAttackCost,
      powerupSlots: this.powerupSlots,
      attachedPowerups: this.attachedPowerups.map((id) => id.toString()),
      requiredCertification: this.requiredCertification,
    };
  }
}

// ============================================
// Damage Calculation Helpers
// ============================================

/**
 * Calculate the average base damage for a weapon
 * @param weapon - The weapon to calculate damage for
 * @returns Average damage per hit
 */
export function calculateBaseDamage(weapon: WeaponObject): number {
  return (weapon.minDamage + weapon.maxDamage) / 2;
}

/**
 * Calculate a random damage value within the weapon's range
 * @param weapon - The weapon to calculate damage for
 * @returns Random damage value between min and max
 */
export function calculateRandomDamage(weapon: WeaponObject): number {
  const range = weapon.maxDamage - weapon.minDamage;
  return weapon.minDamage + Math.random() * range;
}

/**
 * Calculate the total average damage including elemental
 * @param weapon - The weapon to calculate damage for
 * @returns Total average damage per hit
 */
export function calculateTotalDamage(weapon: WeaponObject): number {
  const baseDamage = calculateBaseDamage(weapon);
  return baseDamage + weapon.elementalDamage;
}

/**
 * Get effective range modifier based on distance
 * Returns a multiplier for accuracy/damage based on distance from target
 *
 * @param weapon - The weapon being used
 * @param distance - Distance to target in meters
 * @returns Effectiveness multiplier (0.0 - 1.0, with 1.0+ for ideal range)
 */
export function getEffectiveRange(weapon: WeaponObject, distance: number): number {
  // Out of range = 0 effectiveness
  if (distance < weapon.minRange || distance > weapon.maxRange) {
    return 0;
  }

  // At ideal range = full effectiveness
  if (distance === weapon.idealRange) {
    return 1.0;
  }

  // Melee weapons: effectiveness decreases with distance
  if (weapon.isMelee()) {
    // Closer is better for melee
    const maxDist = weapon.maxRange;
    if (maxDist === 0) return 1.0;
    return 1.0 - (distance / maxDist) * 0.2; // Max 20% penalty at max range
  }

  // Ranged weapons: calculate falloff from ideal range
  if (distance < weapon.idealRange) {
    // Too close - penalty increases as you get closer
    const closePenalty = 1.0 - (weapon.idealRange - distance) / weapon.idealRange;
    return Math.max(0.5, closePenalty); // Min 50% at point blank
  } else {
    // Too far - penalty increases as you get farther
    const farRange = weapon.maxRange - weapon.idealRange;
    if (farRange === 0) return 1.0;
    const farPenalty = 1.0 - (distance - weapon.idealRange) / farRange;
    return Math.max(0.5, farPenalty * 0.7 + 0.3); // Min 30% at max range
  }
}

/**
 * Calculate weapon DPS (Damage Per Second)
 * @param weapon - The weapon to calculate DPS for
 * @returns Average DPS including elemental damage
 */
export function calculateWeaponDPS(weapon: WeaponObject): number {
  const totalDamage = calculateTotalDamage(weapon);
  return totalDamage * weapon.attackSpeed;
}

/**
 * Calculate time to kill based on weapon DPS and target health
 * @param weapon - The weapon being used
 * @param targetHealth - Target's health pool
 * @param armorMitigation - Percentage of damage mitigated by armor (0.0 - 1.0)
 * @returns Estimated time to kill in seconds
 */
export function calculateTimeToKill(
  weapon: WeaponObject,
  targetHealth: number,
  armorMitigation: number = 0
): number {
  const effectiveDPS = calculateWeaponDPS(weapon) * (1 - armorMitigation);
  if (effectiveDPS <= 0) return Infinity;
  return targetHealth / effectiveDPS;
}

/**
 * Compare two weapons by DPS
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareWeaponsByDPS(a: WeaponObject, b: WeaponObject): number {
  return calculateWeaponDPS(a) - calculateWeaponDPS(b);
}

/**
 * Get weapon quality rating based on stats
 * @param weapon - The weapon to rate
 * @returns Quality rating 0-100
 */
export function getWeaponQualityRating(weapon: WeaponObject): number {
  // This is a simplified rating - real implementation would be more complex
  const dps = calculateWeaponDPS(weapon);
  const rangeBonus = weapon.maxRange / 10;
  const modBonus = weapon.attackMods / 5;
  const armorPiercingBonus = weapon.armorPiercing * 10;

  const raw = dps + rangeBonus + modBonus + armorPiercingBonus;
  return Math.min(100, Math.max(0, Math.round(raw / 10)));
}
