/**
 * ShipComponentObject - Represents ship components in the JTL expansion
 * Extends TangibleObject with ship-specific properties for installation,
 * damage tracking, and reverse engineering.
 *
 * Ship components are modular parts that can be installed in ships:
 * - Reactors: Power generation
 * - Engines: Propulsion and maneuverability
 * - Shields: Regenerating protection
 * - Armor: Static hull protection
 * - Capacitors: Weapon energy storage
 * - Boosters: Temporary speed boost
 * - Droid Interface: Astromech assistance
 * - Weapons: Blasters, missiles, countermeasures
 *
 * Baseline Types:
 * - SCMP3: Component type, quality, stats (shared data)
 * - SCMP6: Damage state, installation status (server data)
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  ShipComponentType,
  ComponentQuality,
  WeaponFireMode,
  type ReactorStats,
  type EngineStats,
  type ShieldStats,
  type ArmorStats,
  type CapacitorStats,
  type BoosterStats,
  type DroidInterfaceStats,
  type WeaponStats,
  type ComponentCertification,
  type ReverseEngineeringResult,
  type ReverseEngineeringPart,
  getQualityMultiplier,
  isWeaponComponent,
  getLootTierForLevel,
} from './ship-component-types.js';

// Re-export types for convenience
export {
  ShipComponentType,
  ComponentQuality,
  WeaponFireMode,
} from './ship-component-types.js';

/**
 * SCMP property indices for delta tracking
 * These match the variable indices in SCMP baselines
 */
export const ScmpProperty = {
  // SCMP3 (Shared)
  COMPONENT_TYPE: 0,
  QUALITY: 1,
  HITPOINTS: 2,
  MAX_HITPOINTS: 3,
  MASS: 4,
  ENERGY_DRAIN: 5,
  // Type-specific stats start at index 6
  REACTOR_ENERGY_GENERATION: 6,
  REACTOR_ENERGY_MAINTENANCE: 7,
  ENGINE_TOP_SPEED: 6,
  ENGINE_ACCELERATION: 7,
  ENGINE_YAW_RATE: 8,
  ENGINE_PITCH_RATE: 9,
  ENGINE_ROLL_RATE: 10,
  SHIELD_FRONT_HP: 6,
  SHIELD_REAR_HP: 7,
  SHIELD_RECHARGE: 8,
  ARMOR_VALUE: 6,
  ARMOR_DAMAGE_REDUCTION: 7,
  CAPACITOR_ENERGY_STORAGE: 6,
  CAPACITOR_RECHARGE: 7,
  BOOSTER_ENERGY: 6,
  BOOSTER_CONSUMPTION: 7,
  BOOSTER_RECHARGE: 8,
  BOOSTER_SPEED_MULT: 9,
  DROID_COMMAND_SPEED: 6,
  DROID_MAX_COMMANDS: 7,
  WEAPON_MIN_DAMAGE: 6,
  WEAPON_MAX_DAMAGE: 7,
  WEAPON_REFIRE_RATE: 8,
  WEAPON_ENERGY_PER_SHOT: 9,
  WEAPON_PROJECTILE_SPEED: 10,
  WEAPON_EFFECTIVE_RANGE: 11,
  WEAPON_FIRE_MODE: 12,
  WEAPON_AMMO_COUNT: 13,
  WEAPON_MAX_AMMO: 14,

  // SCMP6 (Server)
  INSTALLED_SHIP_ID: 0,
  INSTALLED_SLOT: 1,
  CERTIFICATION: 2,
} as const;

/**
 * ShipComponentObject - Represents ship components that can be installed in ships
 * Extends TangibleObject with component-specific properties
 */
export class ShipComponentObject extends TangibleObject {
  // ============================================
  // Core Component Properties
  // ============================================

  /** Type of component (reactor, engine, weapon, etc.) */
  componentType: ShipComponentType;

  /** Quality tier of the component */
  quality: ComponentQuality;

  /** Current hitpoints of the component */
  hitpoints: number;

  /** Maximum hitpoints */
  maxHitpoints: number;

  /** Mass in kilograms (affects ship handling) */
  mass: number;

  /** Energy drain per second when active */
  energyDrain: number;

  // ============================================
  // Type-Specific Stats
  // ============================================

  /** Reactor stats (only for REACTOR type) */
  reactorStats?: ReactorStats;

  /** Engine stats (only for ENGINE type) */
  engineStats?: EngineStats;

  /** Shield stats (only for SHIELD_GENERATOR type) */
  shieldStats?: ShieldStats;

  /** Armor stats (only for ARMOR type) */
  armorStats?: ArmorStats;

  /** Capacitor stats (only for CAPACITOR type) */
  capacitorStats?: CapacitorStats;

  /** Booster stats (only for BOOSTER type) */
  boosterStats?: BoosterStats;

  /** Droid interface stats (only for DROID_INTERFACE type) */
  droidInterfaceStats?: DroidInterfaceStats;

  /** Weapon stats (only for weapon types) */
  weaponStats?: WeaponStats;

  // ============================================
  // Installation Properties
  // ============================================

  /** Object ID of the ship this component is installed in (0n if not installed) */
  installedShipId: ObjectId;

  /** Slot index where this component is installed (-1 if not installed) */
  installedSlot: number;

  /** Certification required to use this component */
  certification: ComponentCertification;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for SCMP3 */
  private deltaTrackerScmp3: DeltaTracker;

  /** Delta tracker for SCMP6 */
  private deltaTrackerScmp6: DeltaTracker;

  /**
   * Create a new ShipComponentObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   * @param componentType - Type of ship component
   */
  constructor(
    objectId: ObjectId,
    templateCrc: CrcValue = 0,
    componentType: ShipComponentType = ShipComponentType.REACTOR
  ) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Tangible;

    // Initialize core properties
    this.componentType = componentType;
    this.quality = ComponentQuality.STANDARD;
    this.hitpoints = 100;
    this.maxHitpoints = 100;
    this.mass = 100;
    this.energyDrain = 0;

    // Installation state
    this.installedShipId = 0n;
    this.installedSlot = -1;
    this.certification = {
      requiredSkill: 'pilot_novice',
      requiredLevel: 1,
    };

    // Initialize type-specific stats based on component type
    this.initializeTypeStats(componentType);

    // Initialize delta trackers
    this.deltaTrackerScmp3 = new DeltaTracker();
    this.deltaTrackerScmp6 = new DeltaTracker();
  }

  /**
   * Initialize type-specific stats based on component type
   */
  private initializeTypeStats(type: ShipComponentType): void {
    switch (type) {
      case ShipComponentType.REACTOR:
        this.reactorStats = {
          energyGeneration: 100,
          energyMaintenance: 10,
        };
        this.energyDrain = 0; // Reactors generate, not drain
        break;

      case ShipComponentType.ENGINE:
        this.engineStats = {
          topSpeed: 50,
          acceleration: 20,
          yawRate: 45,
          pitchRate: 45,
          rollRate: 90,
        };
        this.energyDrain = 10;
        break;

      case ShipComponentType.SHIELD_GENERATOR:
        this.shieldStats = {
          frontHitpoints: 200,
          rearHitpoints: 200,
          rechargeRate: 5,
        };
        this.energyDrain = 15;
        break;

      case ShipComponentType.ARMOR:
        this.armorStats = {
          armorValue: 500,
          damageReduction: 0.1,
        };
        this.energyDrain = 0; // Armor is passive
        break;

      case ShipComponentType.CAPACITOR:
        this.capacitorStats = {
          energyStorage: 500,
          rechargeRate: 25,
        };
        this.energyDrain = 5;
        break;

      case ShipComponentType.BOOSTER:
        this.boosterStats = {
          boosterEnergy: 100,
          consumptionRate: 20,
          rechargeRate: 5,
          speedMultiplier: 1.0,
        };
        this.energyDrain = 0; // Only drains when active
        break;

      case ShipComponentType.DROID_INTERFACE:
        this.droidInterfaceStats = {
          commandSpeed: 1.0,
          maxCommands: 3,
        };
        this.energyDrain = 2;
        break;

      case ShipComponentType.WEAPON_BLASTER:
        this.weaponStats = {
          minDamage: 50,
          maxDamage: 100,
          refireRate: 0.5,
          energyPerShot: 10,
          projectileSpeed: 500,
          effectiveRange: 500,
          fireMode: WeaponFireMode.SINGLE,
          ammoCount: -1, // Unlimited for energy weapons
          maxAmmo: -1,
        };
        this.energyDrain = 0; // Uses energy per shot instead
        break;

      case ShipComponentType.WEAPON_MISSILE:
        this.weaponStats = {
          minDamage: 200,
          maxDamage: 400,
          refireRate: 3.0,
          energyPerShot: 0,
          projectileSpeed: 200,
          effectiveRange: 1000,
          fireMode: WeaponFireMode.SINGLE,
          ammoCount: 20,
          maxAmmo: 20,
        };
        this.energyDrain = 0;
        break;

      case ShipComponentType.WEAPON_COUNTERMEASURE:
        this.weaponStats = {
          minDamage: 0,
          maxDamage: 0,
          refireRate: 2.0,
          energyPerShot: 5,
          projectileSpeed: 100,
          effectiveRange: 200,
          fireMode: WeaponFireMode.BURST,
          ammoCount: 10,
          maxAmmo: 10,
        };
        this.energyDrain = 0;
        break;
    }
  }

  /**
   * Get baseline type for SCMP objects
   */
  override getBaselineType(): string {
    return 'SCMP';
  }

  // ============================================
  // Core Property Setters
  // ============================================

  /**
   * Set the component quality and apply quality multiplier to stats
   */
  setQuality(quality: ComponentQuality): void {
    if (this.quality !== quality) {
      const oldMultiplier = getQualityMultiplier(this.quality);
      const newMultiplier = getQualityMultiplier(quality);
      const ratio = newMultiplier / oldMultiplier;

      this.quality = quality;
      this.maxHitpoints = Math.round(this.maxHitpoints * ratio);
      this.hitpoints = Math.min(this.hitpoints, this.maxHitpoints);

      // Scale type-specific stats
      this.scaleStatsByRatio(ratio);

      this.deltaTrackerScmp3.trackChange(ScmpProperty.QUALITY, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Scale type-specific stats by a ratio
   */
  private scaleStatsByRatio(ratio: number): void {
    if (this.reactorStats) {
      this.reactorStats.energyGeneration = Math.round(this.reactorStats.energyGeneration * ratio);
    }
    if (this.engineStats) {
      this.engineStats.topSpeed = Math.round(this.engineStats.topSpeed * ratio);
      this.engineStats.acceleration = Math.round(this.engineStats.acceleration * ratio);
    }
    if (this.shieldStats) {
      this.shieldStats.frontHitpoints = Math.round(this.shieldStats.frontHitpoints * ratio);
      this.shieldStats.rearHitpoints = Math.round(this.shieldStats.rearHitpoints * ratio);
      this.shieldStats.rechargeRate = Math.round(this.shieldStats.rechargeRate * ratio);
    }
    if (this.armorStats) {
      this.armorStats.armorValue = Math.round(this.armorStats.armorValue * ratio);
    }
    if (this.capacitorStats) {
      this.capacitorStats.energyStorage = Math.round(this.capacitorStats.energyStorage * ratio);
      this.capacitorStats.rechargeRate = Math.round(this.capacitorStats.rechargeRate * ratio);
    }
    if (this.boosterStats) {
      this.boosterStats.boosterEnergy = Math.round(this.boosterStats.boosterEnergy * ratio);
    }
    if (this.weaponStats) {
      this.weaponStats.minDamage = Math.round(this.weaponStats.minDamage * ratio);
      this.weaponStats.maxDamage = Math.round(this.weaponStats.maxDamage * ratio);
    }
  }

  /**
   * Set the component mass
   */
  setMass(mass: number): void {
    const newMass = Math.max(0, mass);
    if (this.mass !== newMass) {
      this.mass = newMass;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.MASS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the energy drain
   */
  setEnergyDrain(drain: number): void {
    const newDrain = Math.max(0, drain);
    if (this.energyDrain !== newDrain) {
      this.energyDrain = newDrain;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ENERGY_DRAIN, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Efficiency Calculation
  // ============================================

  /**
   * Calculate the efficiency of this component based on damage
   * @returns Efficiency as a percentage (0.0 - 1.0)
   */
  calculateEfficiency(): number {
    if (this.maxHitpoints <= 0) return 0;

    const healthPercent = this.hitpoints / this.maxHitpoints;

    // Efficiency drops faster than health
    // At 50% health, efficiency is ~25%
    // At 25% health, efficiency is ~6%
    return healthPercent * healthPercent;
  }

  /**
   * Get effective stat value accounting for damage
   * @param baseValue - The base stat value at full health
   * @returns The effective value after applying efficiency
   */
  getEffectiveStat(baseValue: number): number {
    return baseValue * this.calculateEfficiency();
  }

  // ============================================
  // Damage and Repair
  // ============================================

  /**
   * Apply damage to this component
   * @param amount - Amount of damage to apply
   * @returns true if the component was destroyed (hitpoints reached 0)
   */
  applyDamage(amount: number): boolean {
    const oldHitpoints = this.hitpoints;
    this.hitpoints = Math.max(0, this.hitpoints - amount);

    if (this.hitpoints !== oldHitpoints) {
      this.deltaTrackerScmp3.trackChange(ScmpProperty.HITPOINTS, DeltaType.Change);
      this.markModified();
    }

    return this.hitpoints <= 0;
  }

  /**
   * Repair this component
   * @param amount - Amount of hitpoints to restore
   */
  override repair(amount: number): void {
    const oldHitpoints = this.hitpoints;
    this.hitpoints = Math.min(this.maxHitpoints, this.hitpoints + amount);

    if (this.hitpoints !== oldHitpoints) {
      this.deltaTrackerScmp3.trackChange(ScmpProperty.HITPOINTS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Fully repair this component
   */
  fullRepair(): void {
    this.repair(this.maxHitpoints);
  }

  /**
   * Check if this component is destroyed
   */
  isDestroyed(): boolean {
    return this.hitpoints <= 0;
  }

  /**
   * Check if this component is damaged
   */
  isDamaged(): boolean {
    return this.hitpoints < this.maxHitpoints;
  }

  /**
   * Get damage percentage (0.0 = no damage, 1.0 = destroyed)
   */
  getDamagePercent(): number {
    if (this.maxHitpoints <= 0) return 1.0;
    return 1.0 - this.hitpoints / this.maxHitpoints;
  }

  // ============================================
  // Installation
  // ============================================

  /**
   * Mark this component as installed in a ship
   * @param shipId - The ship's object ID
   * @param slot - The slot index
   */
  installInShip(shipId: ObjectId, slot: number): void {
    this.installedShipId = shipId;
    this.installedSlot = slot;
    this.deltaTrackerScmp6.trackChange(ScmpProperty.INSTALLED_SHIP_ID, DeltaType.Change);
    this.deltaTrackerScmp6.trackChange(ScmpProperty.INSTALLED_SLOT, DeltaType.Change);
    this.markModified();
  }

  /**
   * Remove this component from its current ship
   */
  uninstallFromShip(): void {
    this.installedShipId = 0n;
    this.installedSlot = -1;
    this.deltaTrackerScmp6.trackChange(ScmpProperty.INSTALLED_SHIP_ID, DeltaType.Change);
    this.deltaTrackerScmp6.trackChange(ScmpProperty.INSTALLED_SLOT, DeltaType.Change);
    this.markModified();
  }

  /**
   * Check if this component is installed in a ship
   */
  isInstalled(): boolean {
    return this.installedShipId !== 0n;
  }

  /**
   * Set the certification requirement
   */
  setCertification(skill: string, level: number): void {
    this.certification = {
      requiredSkill: skill,
      requiredLevel: level,
    };
    this.deltaTrackerScmp6.trackChange(ScmpProperty.CERTIFICATION, DeltaType.Change);
    this.markModified();
  }

  /**
   * Check if a player can use this component
   * @param skills - Map of skill name to skill level
   */
  canBeUsedBy(skills: Map<string, number>): boolean {
    const playerLevel = skills.get(this.certification.requiredSkill) ?? 0;
    return playerLevel >= this.certification.requiredLevel;
  }

  // ============================================
  // Reverse Engineering
  // ============================================

  /**
   * Reverse engineer this component
   * Destroys the component and returns materials/schematics
   *
   * @param playerSkillLevel - Player's RE skill level (0-4)
   * @returns Result of the reverse engineering attempt
   */
  reverseEngineer(playerSkillLevel: number = 0): ReverseEngineeringResult {
    // Base success chance based on quality (harder for better items)
    let successChance = 0.9 - this.quality * 0.1;

    // Skill level improves success chance
    successChance += playerSkillLevel * 0.05;
    successChance = Math.min(0.99, Math.max(0.1, successChance));

    const success = Math.random() < successChance;

    if (!success) {
      return {
        success: false,
        creditsObtained: 0,
        partsObtained: [],
        experienceGained: 10,
        schematicChance: 0,
      };
    }

    // Calculate credits based on quality and condition
    const baseCredits = 100 * (this.quality + 1);
    const conditionMultiplier = this.hitpoints / this.maxHitpoints;
    const creditsObtained = Math.round(baseCredits * conditionMultiplier);

    // Generate parts based on component type
    const partsObtained = this.generateREParts(playerSkillLevel);

    // Experience based on quality
    const experienceGained = 25 * (this.quality + 1);

    // Schematic chance for rare components
    let schematicChance = 0;
    let schematicObtained: string | undefined;

    if (this.quality >= ComponentQuality.ADVANCED) {
      schematicChance = 0.05 + playerSkillLevel * 0.02;
      if (Math.random() < schematicChance) {
        schematicObtained = this.generateSchematicTemplate();
      }
    }

    return {
      success: true,
      creditsObtained,
      partsObtained,
      experienceGained,
      schematicChance,
      schematicObtained,
    };
  }

  /**
   * Generate RE parts based on component type
   */
  private generateREParts(skillLevel: number): ReverseEngineeringPart[] {
    const parts: ReverseEngineeringPart[] = [];

    // Base parts count
    let partsCount = 1 + Math.floor(skillLevel / 2);

    // Quality affects parts quantity
    partsCount += Math.floor(this.quality / 2);

    // Get appropriate part template based on component type
    const partTemplate = this.getPartTemplateForType();

    parts.push({
      partTemplate,
      quantity: partsCount,
      quality: Math.max(ComponentQuality.BASIC, this.quality - 1),
    });

    // Chance for bonus rare part
    if (Math.random() < 0.1 + skillLevel * 0.05) {
      parts.push({
        partTemplate: 'object/tangible/ship/components/parts/rare_component_part.iff',
        quantity: 1,
        quality: this.quality,
      });
    }

    return parts;
  }

  /**
   * Get the part template for this component type
   */
  private getPartTemplateForType(): string {
    const basePath = 'object/tangible/ship/components/parts/';
    switch (this.componentType) {
      case ShipComponentType.REACTOR:
        return `${basePath}reactor_part.iff`;
      case ShipComponentType.ENGINE:
        return `${basePath}engine_part.iff`;
      case ShipComponentType.SHIELD_GENERATOR:
        return `${basePath}shield_part.iff`;
      case ShipComponentType.ARMOR:
        return `${basePath}armor_part.iff`;
      case ShipComponentType.CAPACITOR:
        return `${basePath}capacitor_part.iff`;
      case ShipComponentType.BOOSTER:
        return `${basePath}booster_part.iff`;
      case ShipComponentType.DROID_INTERFACE:
        return `${basePath}droid_interface_part.iff`;
      case ShipComponentType.WEAPON_BLASTER:
      case ShipComponentType.WEAPON_MISSILE:
      case ShipComponentType.WEAPON_COUNTERMEASURE:
        return `${basePath}weapon_part.iff`;
      default:
        return `${basePath}generic_part.iff`;
    }
  }

  /**
   * Generate a schematic template for rare RE result
   */
  private generateSchematicTemplate(): string {
    const basePath = 'object/draft_schematic/ship/';
    const qualitySuffix = this.quality >= ComponentQuality.ELITE ? 'elite_' : 'advanced_';

    switch (this.componentType) {
      case ShipComponentType.REACTOR:
        return `${basePath}${qualitySuffix}reactor.iff`;
      case ShipComponentType.ENGINE:
        return `${basePath}${qualitySuffix}engine.iff`;
      case ShipComponentType.SHIELD_GENERATOR:
        return `${basePath}${qualitySuffix}shield.iff`;
      case ShipComponentType.WEAPON_BLASTER:
        return `${basePath}${qualitySuffix}blaster.iff`;
      case ShipComponentType.WEAPON_MISSILE:
        return `${basePath}${qualitySuffix}missile_launcher.iff`;
      default:
        return `${basePath}${qualitySuffix}component.iff`;
    }
  }

  // ============================================
  // Loot Tier Calculation
  // ============================================

  /**
   * Calculate and set stats based on loot tier
   * @param level - The loot level (enemy level)
   */
  applyLootTier(level: number): void {
    const tier = getLootTierForLevel(level);
    if (!tier) return;

    this.setQuality(tier.quality);

    // Additional scaling based on level within tier
    const tierRange = tier.maxLevel - tier.minLevel;
    const levelInTier = level - tier.minLevel;
    const tierProgress = tierRange > 0 ? levelInTier / tierRange : 0;

    // Scale max hitpoints by level progress
    const hpBonus = 1 + tierProgress * 0.5;
    this.maxHitpoints = Math.round(this.maxHitpoints * hpBonus);
    this.hitpoints = this.maxHitpoints;

    this.markModified();
  }

  // ============================================
  // Type-Specific Stat Setters
  // ============================================

  /**
   * Set reactor stats (only for REACTOR type)
   */
  setReactorStats(stats: Partial<ReactorStats>): void {
    if (this.componentType !== ShipComponentType.REACTOR || !this.reactorStats) return;

    if (stats.energyGeneration !== undefined) {
      this.reactorStats.energyGeneration = stats.energyGeneration;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.REACTOR_ENERGY_GENERATION, DeltaType.Change);
    }
    if (stats.energyMaintenance !== undefined) {
      this.reactorStats.energyMaintenance = stats.energyMaintenance;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.REACTOR_ENERGY_MAINTENANCE, DeltaType.Change);
    }
    this.markModified();
  }

  /**
   * Set engine stats (only for ENGINE type)
   */
  setEngineStats(stats: Partial<EngineStats>): void {
    if (this.componentType !== ShipComponentType.ENGINE || !this.engineStats) return;

    if (stats.topSpeed !== undefined) {
      this.engineStats.topSpeed = stats.topSpeed;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ENGINE_TOP_SPEED, DeltaType.Change);
    }
    if (stats.acceleration !== undefined) {
      this.engineStats.acceleration = stats.acceleration;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ENGINE_ACCELERATION, DeltaType.Change);
    }
    if (stats.yawRate !== undefined) {
      this.engineStats.yawRate = stats.yawRate;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ENGINE_YAW_RATE, DeltaType.Change);
    }
    if (stats.pitchRate !== undefined) {
      this.engineStats.pitchRate = stats.pitchRate;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ENGINE_PITCH_RATE, DeltaType.Change);
    }
    if (stats.rollRate !== undefined) {
      this.engineStats.rollRate = stats.rollRate;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ENGINE_ROLL_RATE, DeltaType.Change);
    }
    this.markModified();
  }

  /**
   * Set shield stats (only for SHIELD_GENERATOR type)
   */
  setShieldStats(stats: Partial<ShieldStats>): void {
    if (this.componentType !== ShipComponentType.SHIELD_GENERATOR || !this.shieldStats) return;

    if (stats.frontHitpoints !== undefined) {
      this.shieldStats.frontHitpoints = stats.frontHitpoints;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.SHIELD_FRONT_HP, DeltaType.Change);
    }
    if (stats.rearHitpoints !== undefined) {
      this.shieldStats.rearHitpoints = stats.rearHitpoints;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.SHIELD_REAR_HP, DeltaType.Change);
    }
    if (stats.rechargeRate !== undefined) {
      this.shieldStats.rechargeRate = stats.rechargeRate;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.SHIELD_RECHARGE, DeltaType.Change);
    }
    this.markModified();
  }

  /**
   * Set armor stats (only for ARMOR type)
   */
  setArmorStats(stats: Partial<ArmorStats>): void {
    if (this.componentType !== ShipComponentType.ARMOR || !this.armorStats) return;

    if (stats.armorValue !== undefined) {
      this.armorStats.armorValue = stats.armorValue;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ARMOR_VALUE, DeltaType.Change);
    }
    if (stats.damageReduction !== undefined) {
      this.armorStats.damageReduction = Math.max(0, Math.min(1, stats.damageReduction));
      this.deltaTrackerScmp3.trackChange(ScmpProperty.ARMOR_DAMAGE_REDUCTION, DeltaType.Change);
    }
    this.markModified();
  }

  /**
   * Set capacitor stats (only for CAPACITOR type)
   */
  setCapacitorStats(stats: Partial<CapacitorStats>): void {
    if (this.componentType !== ShipComponentType.CAPACITOR || !this.capacitorStats) return;

    if (stats.energyStorage !== undefined) {
      this.capacitorStats.energyStorage = stats.energyStorage;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.CAPACITOR_ENERGY_STORAGE, DeltaType.Change);
    }
    if (stats.rechargeRate !== undefined) {
      this.capacitorStats.rechargeRate = stats.rechargeRate;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.CAPACITOR_RECHARGE, DeltaType.Change);
    }
    this.markModified();
  }

  /**
   * Set weapon stats (only for weapon types)
   */
  setWeaponStats(stats: Partial<WeaponStats>): void {
    if (!isWeaponComponent(this.componentType) || !this.weaponStats) return;

    if (stats.minDamage !== undefined) {
      this.weaponStats.minDamage = stats.minDamage;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_MIN_DAMAGE, DeltaType.Change);
    }
    if (stats.maxDamage !== undefined) {
      this.weaponStats.maxDamage = stats.maxDamage;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_MAX_DAMAGE, DeltaType.Change);
    }
    if (stats.refireRate !== undefined) {
      this.weaponStats.refireRate = stats.refireRate;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_REFIRE_RATE, DeltaType.Change);
    }
    if (stats.energyPerShot !== undefined) {
      this.weaponStats.energyPerShot = stats.energyPerShot;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_ENERGY_PER_SHOT, DeltaType.Change);
    }
    if (stats.projectileSpeed !== undefined) {
      this.weaponStats.projectileSpeed = stats.projectileSpeed;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_PROJECTILE_SPEED, DeltaType.Change);
    }
    if (stats.effectiveRange !== undefined) {
      this.weaponStats.effectiveRange = stats.effectiveRange;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_EFFECTIVE_RANGE, DeltaType.Change);
    }
    if (stats.fireMode !== undefined) {
      this.weaponStats.fireMode = stats.fireMode;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_FIRE_MODE, DeltaType.Change);
    }
    if (stats.ammoCount !== undefined) {
      this.weaponStats.ammoCount = stats.ammoCount;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_AMMO_COUNT, DeltaType.Change);
    }
    if (stats.maxAmmo !== undefined) {
      this.weaponStats.maxAmmo = stats.maxAmmo;
      this.deltaTrackerScmp3.trackChange(ScmpProperty.WEAPON_MAX_AMMO, DeltaType.Change);
    }
    this.markModified();
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if SCMP3 has changes
   */
  hasScmp3Changes(): boolean {
    return this.deltaTrackerScmp3.hasChanges();
  }

  /**
   * Check if SCMP6 has changes
   */
  hasScmp6Changes(): boolean {
    return this.deltaTrackerScmp6.hasChanges();
  }

  /**
   * Get SCMP3 delta tracker
   */
  getScmp3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerScmp3;
  }

  /**
   * Get SCMP6 delta tracker
   */
  getScmp6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerScmp6;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.deltaTrackerScmp3.clear();
    this.deltaTrackerScmp6.clear();
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
      componentType: this.componentType,
      quality: this.quality,
      hitpoints: this.hitpoints,
      maxHitpoints: this.maxHitpoints,
      mass: this.mass,
      energyDrain: this.energyDrain,
      installedShipId: this.installedShipId.toString(),
      installedSlot: this.installedSlot,
      certification: this.certification,
      reactorStats: this.reactorStats,
      engineStats: this.engineStats,
      shieldStats: this.shieldStats,
      armorStats: this.armorStats,
      capacitorStats: this.capacitorStats,
      boosterStats: this.boosterStats,
      droidInterfaceStats: this.droidInterfaceStats,
      weaponStats: this.weaponStats,
    };
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a ship component with specified type and quality
 */
export function createShipComponent(
  objectId: ObjectId,
  componentType: ShipComponentType,
  quality: ComponentQuality = ComponentQuality.STANDARD,
  templateCrc: CrcValue = 0
): ShipComponentObject {
  const component = new ShipComponentObject(objectId, templateCrc, componentType);
  component.setQuality(quality);
  return component;
}

/**
 * Create a reactor component
 */
export function createReactor(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.REACTOR, quality);
}

/**
 * Create an engine component
 */
export function createEngine(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.ENGINE, quality);
}

/**
 * Create a shield generator component
 */
export function createShieldGenerator(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.SHIELD_GENERATOR, quality);
}

/**
 * Create an armor component
 */
export function createArmor(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.ARMOR, quality);
}

/**
 * Create a capacitor component
 */
export function createCapacitor(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.CAPACITOR, quality);
}

/**
 * Create a booster component
 */
export function createBooster(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.BOOSTER, quality);
}

/**
 * Create a blaster weapon component
 */
export function createBlasterWeapon(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.WEAPON_BLASTER, quality);
}

/**
 * Create a missile launcher component
 */
export function createMissileLauncher(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.WEAPON_MISSILE, quality);
}

/**
 * Create a countermeasure launcher component
 */
export function createCountermeasureLauncher(
  objectId: ObjectId,
  quality: ComponentQuality = ComponentQuality.STANDARD
): ShipComponentObject {
  return createShipComponent(objectId, ShipComponentType.WEAPON_COUNTERMEASURE, quality);
}

/**
 * Create a random loot component based on level
 */
export function createLootComponent(
  objectId: ObjectId,
  level: number,
  componentType?: ShipComponentType
): ShipComponentObject {
  // Random type if not specified
  const type =
    componentType ??
    (Math.floor(Math.random() * Object.keys(ShipComponentType).length / 2) as ShipComponentType);

  const component = new ShipComponentObject(objectId, 0, type);
  component.applyLootTier(level);
  return component;
}
