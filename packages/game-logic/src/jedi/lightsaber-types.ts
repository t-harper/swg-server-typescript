/**
 * Lightsaber Types
 * Type definitions for lightsaber components, crystals, and crafting
 * Implements the pre-NGE lightsaber crafting and customization system
 */

import type { ObjectId } from '@swg/shared-types';

// ============================================
// Lightsaber Hilt Types
// ============================================

/**
 * Types of lightsaber hilts that can be crafted
 * Each type has different stats and requirements
 */
export enum LightsaberHiltType {
  /** Standard single-bladed lightsaber */
  SINGLE = 'single',
  /** Double-bladed (Darth Maul style) lightsaber */
  DOUBLE = 'double',
  /** Curved hilt (Count Dooku style) for precision */
  CURVED = 'curved',
  /** Crossguard hilt with side vents */
  CROSSGUARD = 'crossguard',
}

/**
 * Display names for hilt types
 */
export const HiltTypeNames: Record<LightsaberHiltType, string> = {
  [LightsaberHiltType.SINGLE]: 'Single-Bladed Lightsaber',
  [LightsaberHiltType.DOUBLE]: 'Double-Bladed Lightsaber',
  [LightsaberHiltType.CURVED]: 'Curved-Hilt Lightsaber',
  [LightsaberHiltType.CROSSGUARD]: 'Crossguard Lightsaber',
};

/**
 * Base stat modifiers for each hilt type
 */
export const HiltTypeModifiers: Record<LightsaberHiltType, HiltModifiers> = {
  [LightsaberHiltType.SINGLE]: {
    damageModifier: 1.0,
    speedModifier: 1.0,
    defenseModifier: 1.0,
    forceCostModifier: 1.0,
  },
  [LightsaberHiltType.DOUBLE]: {
    damageModifier: 0.85, // Lower per-hit damage
    speedModifier: 1.3, // Faster attack speed
    defenseModifier: 1.15, // Better defense
    forceCostModifier: 1.2, // Higher force cost
  },
  [LightsaberHiltType.CURVED]: {
    damageModifier: 1.1, // Better precision = more damage
    speedModifier: 0.95, // Slightly slower
    defenseModifier: 0.9, // Less defensive capability
    forceCostModifier: 0.9, // More efficient
  },
  [LightsaberHiltType.CROSSGUARD]: {
    damageModifier: 1.2, // High damage
    speedModifier: 0.8, // Slower
    defenseModifier: 1.25, // Excellent defense
    forceCostModifier: 1.3, // Unstable, high force cost
  },
};

/**
 * Modifiers applied by a hilt type
 */
export interface HiltModifiers {
  /** Damage multiplier */
  damageModifier: number;
  /** Attack speed multiplier */
  speedModifier: number;
  /** Defense bonus multiplier */
  defenseModifier: number;
  /** Force cost multiplier */
  forceCostModifier: number;
}

// ============================================
// Crystal Types
// ============================================

/**
 * Types of lightsaber crystals that can be used
 * Each crystal has unique properties and effects
 */
export enum CrystalType {
  /** Common focusing crystal */
  FOCUSING_CRYSTAL = 'focusing_crystal',
  /** Basic power crystal */
  POWER_CRYSTAL = 'power_crystal',
  /** Krayt Dragon Pearl - extremely rare and powerful */
  KRAYT_PEARL = 'krayt_pearl',
  /** Sunrider's Destiny - legendary light-side crystal */
  SUNRIDER_DESTINY = 'sunrider_destiny',
  /** Bane's Heart - legendary dark-side crystal */
  BANES_HEART = 'banes_heart',
  /** Windu's Guile - amethyst crystal with unique properties */
  WINDUS_GUILE = 'windus_guile',
  /** Opila crystal - increased damage */
  OPILA = 'opila',
  /** Jenruax crystal - increased speed */
  JENRUAX = 'jenruax',
  /** Luxum crystal - force enhancement */
  LUXUM = 'luxum',
  /** Firkrann crystal - electrical damage */
  FIRKRANN = 'firkrann',
  /** Bondar crystal - stun effects */
  BONDAR = 'bondar',
  /** Damind crystal - balanced stats */
  DAMIND = 'damind',
  /** Eralam crystal - pure damage */
  ERALAM = 'eralam',
  /** Sapith crystal - defensive properties */
  SAPITH = 'sapith',
  /** Rubat crystal - accuracy bonus */
  RUBAT = 'rubat',
  /** Sigil crystal - critical hit bonus */
  SIGIL = 'sigil',
  /** Upari crystal - high damage, rare */
  UPARI = 'upari',
  /** Adegan crystal - standard Jedi crystal */
  ADEGAN = 'adegan',
  /** Synthetic crystal - crafted, dark side associations */
  SYNTHETIC = 'synthetic',
}

/**
 * Crystal type categories
 */
export enum CrystalCategory {
  /** Primary blade crystal (determines color) */
  BLADE = 'blade',
  /** Focusing crystal (improves accuracy) */
  FOCUSING = 'focusing',
  /** Power crystal (increases damage) */
  POWER = 'power',
}

/**
 * Which category each crystal type belongs to
 */
export const CrystalCategories: Record<CrystalType, CrystalCategory> = {
  [CrystalType.FOCUSING_CRYSTAL]: CrystalCategory.FOCUSING,
  [CrystalType.POWER_CRYSTAL]: CrystalCategory.POWER,
  [CrystalType.KRAYT_PEARL]: CrystalCategory.BLADE,
  [CrystalType.SUNRIDER_DESTINY]: CrystalCategory.BLADE,
  [CrystalType.BANES_HEART]: CrystalCategory.BLADE,
  [CrystalType.WINDUS_GUILE]: CrystalCategory.BLADE,
  [CrystalType.OPILA]: CrystalCategory.POWER,
  [CrystalType.JENRUAX]: CrystalCategory.POWER,
  [CrystalType.LUXUM]: CrystalCategory.FOCUSING,
  [CrystalType.FIRKRANN]: CrystalCategory.POWER,
  [CrystalType.BONDAR]: CrystalCategory.FOCUSING,
  [CrystalType.DAMIND]: CrystalCategory.FOCUSING,
  [CrystalType.ERALAM]: CrystalCategory.POWER,
  [CrystalType.SAPITH]: CrystalCategory.FOCUSING,
  [CrystalType.RUBAT]: CrystalCategory.FOCUSING,
  [CrystalType.SIGIL]: CrystalCategory.POWER,
  [CrystalType.UPARI]: CrystalCategory.POWER,
  [CrystalType.ADEGAN]: CrystalCategory.BLADE,
  [CrystalType.SYNTHETIC]: CrystalCategory.BLADE,
};

// ============================================
// Crystal Colors
// ============================================

/**
 * Lightsaber blade colors
 */
export enum CrystalColor {
  /** Blue - traditional Jedi Guardian color */
  BLUE = 'blue',
  /** Green - traditional Jedi Consular color */
  GREEN = 'green',
  /** Yellow - Jedi Sentinel color */
  YELLOW = 'yellow',
  /** Red - Sith/Dark side synthetic crystal */
  RED = 'red',
  /** Purple - rare, balanced Force user */
  PURPLE = 'purple',
  /** Orange - rare variant */
  ORANGE = 'orange',
  /** White - purified dark side crystal */
  WHITE = 'white',
  /** Silver - rare natural color */
  SILVER = 'silver',
  /** Cyan - light blue variant */
  CYAN = 'cyan',
  /** Bronze - ancient Jedi color */
  BRONZE = 'bronze',
  /** Gold - extremely rare */
  GOLD = 'gold',
  /** Black - legendary darksaber style */
  BLACK = 'black',
}

/**
 * Default colors for blade crystals
 */
export const CrystalDefaultColors: Partial<Record<CrystalType, CrystalColor>> = {
  [CrystalType.KRAYT_PEARL]: CrystalColor.SILVER,
  [CrystalType.SUNRIDER_DESTINY]: CrystalColor.GOLD,
  [CrystalType.BANES_HEART]: CrystalColor.RED,
  [CrystalType.WINDUS_GUILE]: CrystalColor.PURPLE,
  [CrystalType.ADEGAN]: CrystalColor.BLUE,
  [CrystalType.SYNTHETIC]: CrystalColor.RED,
};

// ============================================
// Crystal Stats
// ============================================

/**
 * Special effects that crystals can grant
 */
export enum CrystalSpecialEffect {
  /** No special effect */
  NONE = 'none',
  /** Bonus damage vs dark side */
  LIGHT_SIDE_BONUS = 'light_side_bonus',
  /** Bonus damage vs light side */
  DARK_SIDE_BONUS = 'dark_side_bonus',
  /** Chance to stun on hit */
  STUN_CHANCE = 'stun_chance',
  /** Adds electrical damage */
  ELECTRICAL_DAMAGE = 'electrical_damage',
  /** Chance for critical hit */
  CRITICAL_BONUS = 'critical_bonus',
  /** Improved force regeneration */
  FORCE_REGEN_BONUS = 'force_regen_bonus',
  /** Reduced visibility generation */
  STEALTH_BONUS = 'stealth_bonus',
  /** Bonus accuracy */
  ACCURACY_BONUS = 'accuracy_bonus',
  /** Damage reflection */
  DAMAGE_REFLECTION = 'damage_reflection',
  /** Force power effectiveness bonus */
  FORCE_POWER_BONUS = 'force_power_bonus',
  /** Healing on hit */
  LIFE_DRAIN = 'life_drain',
  /** Armor penetration */
  ARMOR_PIERCING = 'armor_piercing',
}

/**
 * Statistics for a crystal
 */
export interface CrystalStats {
  /** Flat damage bonus */
  damageBonus: number;
  /** Damage multiplier (1.0 = 100%) */
  damageMultiplier: number;
  /** Attack speed bonus (negative = faster) */
  speedBonus: number;
  /** Force cost reduction (percentage) */
  forceReduction: number;
  /** Accuracy bonus */
  accuracyBonus: number;
  /** Defense bonus */
  defenseBonus: number;
  /** Special effect granted by this crystal */
  specialEffect: CrystalSpecialEffect;
  /** Magnitude of the special effect */
  specialEffectMagnitude: number;
}

/**
 * Default stats for each crystal type
 */
export const CrystalBaseStats: Record<CrystalType, CrystalStats> = {
  [CrystalType.FOCUSING_CRYSTAL]: {
    damageBonus: 0,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 5,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.POWER_CRYSTAL]: {
    damageBonus: 10,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.KRAYT_PEARL]: {
    damageBonus: 50,
    damageMultiplier: 1.15,
    speedBonus: -5,
    forceReduction: 10,
    accuracyBonus: 10,
    defenseBonus: 5,
    specialEffect: CrystalSpecialEffect.CRITICAL_BONUS,
    specialEffectMagnitude: 15,
  },
  [CrystalType.SUNRIDER_DESTINY]: {
    damageBonus: 40,
    damageMultiplier: 1.1,
    speedBonus: 0,
    forceReduction: 20,
    accuracyBonus: 15,
    defenseBonus: 10,
    specialEffect: CrystalSpecialEffect.LIGHT_SIDE_BONUS,
    specialEffectMagnitude: 25,
  },
  [CrystalType.BANES_HEART]: {
    damageBonus: 55,
    damageMultiplier: 1.2,
    speedBonus: -10,
    forceReduction: 0,
    accuracyBonus: 5,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.DARK_SIDE_BONUS,
    specialEffectMagnitude: 30,
  },
  [CrystalType.WINDUS_GUILE]: {
    damageBonus: 35,
    damageMultiplier: 1.1,
    speedBonus: 5,
    forceReduction: 15,
    accuracyBonus: 20,
    defenseBonus: 15,
    specialEffect: CrystalSpecialEffect.FORCE_POWER_BONUS,
    specialEffectMagnitude: 10,
  },
  [CrystalType.OPILA]: {
    damageBonus: 25,
    damageMultiplier: 1.05,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.ARMOR_PIERCING,
    specialEffectMagnitude: 10,
  },
  [CrystalType.JENRUAX]: {
    damageBonus: 5,
    damageMultiplier: 1.0,
    speedBonus: 15,
    forceReduction: 5,
    accuracyBonus: 5,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.LUXUM]: {
    damageBonus: 10,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 25,
    accuracyBonus: 10,
    defenseBonus: 5,
    specialEffect: CrystalSpecialEffect.FORCE_REGEN_BONUS,
    specialEffectMagnitude: 10,
  },
  [CrystalType.FIRKRANN]: {
    damageBonus: 20,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.ELECTRICAL_DAMAGE,
    specialEffectMagnitude: 20,
  },
  [CrystalType.BONDAR]: {
    damageBonus: 5,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 5,
    accuracyBonus: 5,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.STUN_CHANCE,
    specialEffectMagnitude: 10,
  },
  [CrystalType.DAMIND]: {
    damageBonus: 15,
    damageMultiplier: 1.02,
    speedBonus: 5,
    forceReduction: 5,
    accuracyBonus: 5,
    defenseBonus: 5,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.ERALAM]: {
    damageBonus: 30,
    damageMultiplier: 1.08,
    speedBonus: -5,
    forceReduction: 0,
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.SAPITH]: {
    damageBonus: 5,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 10,
    accuracyBonus: 5,
    defenseBonus: 15,
    specialEffect: CrystalSpecialEffect.DAMAGE_REFLECTION,
    specialEffectMagnitude: 5,
  },
  [CrystalType.RUBAT]: {
    damageBonus: 10,
    damageMultiplier: 1.0,
    speedBonus: 5,
    forceReduction: 0,
    accuracyBonus: 15,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.ACCURACY_BONUS,
    specialEffectMagnitude: 10,
  },
  [CrystalType.SIGIL]: {
    damageBonus: 15,
    damageMultiplier: 1.05,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 5,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.CRITICAL_BONUS,
    specialEffectMagnitude: 12,
  },
  [CrystalType.UPARI]: {
    damageBonus: 35,
    damageMultiplier: 1.1,
    speedBonus: -5,
    forceReduction: 5,
    accuracyBonus: 5,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.ADEGAN]: {
    damageBonus: 20,
    damageMultiplier: 1.05,
    speedBonus: 0,
    forceReduction: 10,
    accuracyBonus: 10,
    defenseBonus: 5,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  },
  [CrystalType.SYNTHETIC]: {
    damageBonus: 25,
    damageMultiplier: 1.08,
    speedBonus: -5,
    forceReduction: -10, // Increases force cost
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.DARK_SIDE_BONUS,
    specialEffectMagnitude: 10,
  },
};

// ============================================
// Lightsaber Components
// ============================================

/**
 * Component slots in a lightsaber
 */
export enum LightsaberComponentSlot {
  /** The hilt/handle */
  HILT = 'hilt',
  /** Primary blade crystal (determines color) */
  BLADE_CRYSTAL = 'blade_crystal',
  /** Focusing crystal (accuracy/precision) */
  FOCUSING_CRYSTAL = 'focusing_crystal',
  /** Power crystal (damage enhancement) */
  POWER_CRYSTAL = 'power_crystal',
  /** Lens (beam focusing) */
  LENS = 'lens',
  /** Power cell */
  POWER_CELL = 'power_cell',
  /** Handgrip */
  HANDGRIP = 'handgrip',
  /** Emitter matrix */
  EMITTER = 'emitter',
}

/**
 * A crystal that has been prepared for use in a lightsaber
 */
export interface LightsaberCrystal {
  /** Object ID of the crystal */
  objectId: ObjectId;
  /** Type of crystal */
  crystalType: CrystalType;
  /** Category of crystal */
  category: CrystalCategory;
  /** Crystal color (for blade crystals) */
  color: CrystalColor | null;
  /** Quality of the crystal (0-100) */
  quality: number;
  /** Purity level affecting stats (0-100) */
  purity: number;
  /** Stats provided by this crystal */
  stats: CrystalStats;
  /** Whether the crystal has been attuned */
  attuned: boolean;
  /** Object ID of the Jedi this crystal is attuned to */
  attunedToId: ObjectId | null;
  /** Timestamp when attunement was completed */
  attunementTime: number | null;
  /** Whether the crystal is soulbound (cannot be traded) */
  soulbound: boolean;
}

/**
 * A hilt component for a lightsaber
 */
export interface LightsaberHilt {
  /** Object ID of the hilt */
  objectId: ObjectId;
  /** Type of hilt */
  hiltType: LightsaberHiltType;
  /** Quality of the hilt (0-100) */
  quality: number;
  /** Hilt modifiers */
  modifiers: HiltModifiers;
  /** Whether this is a crafted hilt (vs looted) */
  crafted: boolean;
  /** Crafter ID if crafted */
  crafterId: ObjectId | null;
}

/**
 * A lens component for beam focusing
 */
export interface LightsaberLens {
  /** Object ID of the lens */
  objectId: ObjectId;
  /** Quality of the lens (0-100) */
  quality: number;
  /** Accuracy bonus */
  accuracyBonus: number;
  /** Range bonus (in meters) */
  rangeBonus: number;
  /** Damage focusing multiplier */
  focusMultiplier: number;
}

/**
 * All components needed to assemble a lightsaber
 */
export interface LightsaberComponents {
  /** The hilt component */
  hilt: LightsaberHilt;
  /** Primary blade crystal */
  bladeCrystal: LightsaberCrystal;
  /** Optional focusing crystal */
  focusingCrystal: LightsaberCrystal | null;
  /** Optional power crystal */
  powerCrystal: LightsaberCrystal | null;
  /** Optional lens */
  lens: LightsaberLens | null;
}

// ============================================
// Lightsaber Stats
// ============================================

/**
 * Final stats of a completed lightsaber
 */
export interface LightsaberStats {
  /** Minimum damage per hit */
  minDamage: number;
  /** Maximum damage per hit */
  maxDamage: number;
  /** Attack speed (attacks per second) */
  speed: number;
  /** Force cost per attack */
  forceCost: number;
  /** Accuracy rating */
  accuracy: number;
  /** Defense rating */
  defense: number;
  /** Elemental damage type (if any) */
  elementalDamageType: string | null;
  /** Elemental damage amount */
  elementalDamage: number;
  /** Special abilities/effects */
  specialAbilities: LightsaberSpecialAbility[];
  /** Overall quality rating (0-100) */
  quality: number;
  /** Durability (current) */
  durability: number;
  /** Durability (max) */
  maxDurability: number;
}

/**
 * A special ability granted by the lightsaber
 */
export interface LightsaberSpecialAbility {
  /** Effect type */
  effect: CrystalSpecialEffect;
  /** Effect name for display */
  name: string;
  /** Effect description */
  description: string;
  /** Effect magnitude/chance */
  magnitude: number;
}

// ============================================
// Lightsaber Generation
// ============================================

/**
 * Lightsaber generation levels
 * Higher generations require more skill and materials
 */
export enum LightsaberGeneration {
  /** First generation - basic training saber */
  FIRST = 1,
  /** Second generation - improved materials */
  SECOND = 2,
  /** Third generation - quality components */
  THIRD = 3,
  /** Fourth generation - master crafted */
  FOURTH = 4,
  /** Fifth generation - legendary */
  FIFTH = 5,
}

/**
 * Generation requirements and bonuses
 */
export interface GenerationConfig {
  /** Generation level */
  generation: LightsaberGeneration;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Base minimum damage */
  baseMinDamage: number;
  /** Base maximum damage */
  baseMaxDamage: number;
  /** Base attack speed */
  baseSpeed: number;
  /** Base force cost */
  baseForceCost: number;
  /** Base accuracy */
  baseAccuracy: number;
  /** Base defense */
  baseDefense: number;
  /** Required Jedi skill level */
  requiredSkillLevel: number;
  /** Required lightsaber skill tier */
  requiredLightsaberTier: number;
  /** Whether Jedi Master rank is required */
  requiresMaster: boolean;
  /** Minimum crystal quality */
  minCrystalQuality: number;
  /** Number of optional crystals allowed */
  maxOptionalCrystals: number;
  /** Base durability */
  baseDurability: number;
}

/**
 * Configuration for each lightsaber generation
 */
export const GenerationConfigs: Record<LightsaberGeneration, GenerationConfig> = {
  [LightsaberGeneration.FIRST]: {
    generation: LightsaberGeneration.FIRST,
    name: 'Training Lightsaber',
    description: 'A basic lightsaber for initiates',
    baseMinDamage: 50,
    baseMaxDamage: 100,
    baseSpeed: 1.0,
    baseForceCost: 10,
    baseAccuracy: 0,
    baseDefense: 0,
    requiredSkillLevel: 0,
    requiredLightsaberTier: 1,
    requiresMaster: false,
    minCrystalQuality: 0,
    maxOptionalCrystals: 0,
    baseDurability: 500,
  },
  [LightsaberGeneration.SECOND]: {
    generation: LightsaberGeneration.SECOND,
    name: 'Padawan Lightsaber',
    description: 'An improved lightsaber for padawans',
    baseMinDamage: 75,
    baseMaxDamage: 150,
    baseSpeed: 1.1,
    baseForceCost: 12,
    baseAccuracy: 5,
    baseDefense: 5,
    requiredSkillLevel: 25,
    requiredLightsaberTier: 2,
    requiresMaster: false,
    minCrystalQuality: 20,
    maxOptionalCrystals: 1,
    baseDurability: 750,
  },
  [LightsaberGeneration.THIRD]: {
    generation: LightsaberGeneration.THIRD,
    name: 'Knight Lightsaber',
    description: 'A well-crafted lightsaber for Jedi Knights',
    baseMinDamage: 100,
    baseMaxDamage: 200,
    baseSpeed: 1.2,
    baseForceCost: 14,
    baseAccuracy: 10,
    baseDefense: 10,
    requiredSkillLevel: 50,
    requiredLightsaberTier: 3,
    requiresMaster: false,
    minCrystalQuality: 40,
    maxOptionalCrystals: 2,
    baseDurability: 1000,
  },
  [LightsaberGeneration.FOURTH]: {
    generation: LightsaberGeneration.FOURTH,
    name: 'Master Lightsaber',
    description: 'A masterwork lightsaber for Jedi Masters',
    baseMinDamage: 150,
    baseMaxDamage: 300,
    baseSpeed: 1.3,
    baseForceCost: 16,
    baseAccuracy: 15,
    baseDefense: 15,
    requiredSkillLevel: 75,
    requiredLightsaberTier: 4,
    requiresMaster: true,
    minCrystalQuality: 60,
    maxOptionalCrystals: 2,
    baseDurability: 1500,
  },
  [LightsaberGeneration.FIFTH]: {
    generation: LightsaberGeneration.FIFTH,
    name: 'Legendary Lightsaber',
    description: 'A legendary lightsaber of unmatched quality',
    baseMinDamage: 200,
    baseMaxDamage: 400,
    baseSpeed: 1.4,
    baseForceCost: 18,
    baseAccuracy: 20,
    baseDefense: 20,
    requiredSkillLevel: 100,
    requiredLightsaberTier: 4,
    requiresMaster: true,
    minCrystalQuality: 80,
    maxOptionalCrystals: 2,
    baseDurability: 2000,
  },
};

// ============================================
// Assembled Lightsaber
// ============================================

/**
 * A fully assembled lightsaber
 */
export interface Lightsaber {
  /** Object ID of the lightsaber */
  objectId: ObjectId;
  /** Name of the lightsaber */
  name: string;
  /** Custom name (if set by crafter) */
  customName: string | null;
  /** Hilt type */
  hiltType: LightsaberHiltType;
  /** Blade color */
  bladeColor: CrystalColor;
  /** Generation level */
  generation: LightsaberGeneration;
  /** Final stats */
  stats: LightsaberStats;
  /** Component IDs used to craft this */
  componentIds: {
    hiltId: ObjectId;
    bladeCrystalId: ObjectId;
    focusingCrystalId: ObjectId | null;
    powerCrystalId: ObjectId | null;
    lensId: ObjectId | null;
  };
  /** Crafter's object ID */
  crafterId: ObjectId;
  /** Crafter's name */
  crafterName: string;
  /** Timestamp of creation */
  createdAt: number;
  /** Whether the lightsaber is bound to the crafter */
  soulbound: boolean;
  /** Object ID of the owner (if soulbound) */
  ownerId: ObjectId | null;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get the display name for a crystal type
 */
export function getCrystalTypeName(type: CrystalType): string {
  const names: Record<CrystalType, string> = {
    [CrystalType.FOCUSING_CRYSTAL]: 'Focusing Crystal',
    [CrystalType.POWER_CRYSTAL]: 'Power Crystal',
    [CrystalType.KRAYT_PEARL]: 'Krayt Dragon Pearl',
    [CrystalType.SUNRIDER_DESTINY]: "Sunrider's Destiny",
    [CrystalType.BANES_HEART]: "Bane's Heart",
    [CrystalType.WINDUS_GUILE]: "Windu's Guile",
    [CrystalType.OPILA]: 'Opila Crystal',
    [CrystalType.JENRUAX]: 'Jenruax Crystal',
    [CrystalType.LUXUM]: 'Luxum Crystal',
    [CrystalType.FIRKRANN]: 'Firkrann Crystal',
    [CrystalType.BONDAR]: 'Bondar Crystal',
    [CrystalType.DAMIND]: 'Damind Crystal',
    [CrystalType.ERALAM]: 'Eralam Crystal',
    [CrystalType.SAPITH]: 'Sapith Crystal',
    [CrystalType.RUBAT]: 'Rubat Crystal',
    [CrystalType.SIGIL]: 'Sigil Crystal',
    [CrystalType.UPARI]: 'Upari Crystal',
    [CrystalType.ADEGAN]: 'Adegan Crystal',
    [CrystalType.SYNTHETIC]: 'Synthetic Crystal',
  };
  return names[type] ?? 'Unknown Crystal';
}

/**
 * Get the display name for a crystal color
 */
export function getCrystalColorName(color: CrystalColor): string {
  const names: Record<CrystalColor, string> = {
    [CrystalColor.BLUE]: 'Blue',
    [CrystalColor.GREEN]: 'Green',
    [CrystalColor.YELLOW]: 'Yellow',
    [CrystalColor.RED]: 'Red',
    [CrystalColor.PURPLE]: 'Purple',
    [CrystalColor.ORANGE]: 'Orange',
    [CrystalColor.WHITE]: 'White',
    [CrystalColor.SILVER]: 'Silver',
    [CrystalColor.CYAN]: 'Cyan',
    [CrystalColor.BRONZE]: 'Bronze',
    [CrystalColor.GOLD]: 'Gold',
    [CrystalColor.BLACK]: 'Black',
  };
  return names[color] ?? 'Unknown';
}

/**
 * Get the display name for a special effect
 */
export function getSpecialEffectName(effect: CrystalSpecialEffect): string {
  const names: Record<CrystalSpecialEffect, string> = {
    [CrystalSpecialEffect.NONE]: 'None',
    [CrystalSpecialEffect.LIGHT_SIDE_BONUS]: 'Light Side Mastery',
    [CrystalSpecialEffect.DARK_SIDE_BONUS]: 'Dark Side Fury',
    [CrystalSpecialEffect.STUN_CHANCE]: 'Stunning Strikes',
    [CrystalSpecialEffect.ELECTRICAL_DAMAGE]: 'Electrical Discharge',
    [CrystalSpecialEffect.CRITICAL_BONUS]: 'Precision Strikes',
    [CrystalSpecialEffect.FORCE_REGEN_BONUS]: 'Force Attunement',
    [CrystalSpecialEffect.STEALTH_BONUS]: 'Shadow Shroud',
    [CrystalSpecialEffect.ACCURACY_BONUS]: 'True Strike',
    [CrystalSpecialEffect.DAMAGE_REFLECTION]: 'Reflecting Shield',
    [CrystalSpecialEffect.FORCE_POWER_BONUS]: 'Force Amplification',
    [CrystalSpecialEffect.LIFE_DRAIN]: 'Life Steal',
    [CrystalSpecialEffect.ARMOR_PIERCING]: 'Armor Piercing',
  };
  return names[effect] ?? 'Unknown Effect';
}

/**
 * Check if a crystal type is a legendary/rare crystal
 */
export function isLegendaryCrystal(type: CrystalType): boolean {
  return [
    CrystalType.KRAYT_PEARL,
    CrystalType.SUNRIDER_DESTINY,
    CrystalType.BANES_HEART,
    CrystalType.WINDUS_GUILE,
    CrystalType.UPARI,
  ].includes(type);
}

/**
 * Check if a crystal requires light side alignment
 */
export function requiresLightSide(type: CrystalType): boolean {
  return type === CrystalType.SUNRIDER_DESTINY;
}

/**
 * Check if a crystal requires dark side alignment
 */
export function requiresDarkSide(type: CrystalType): boolean {
  return type === CrystalType.BANES_HEART || type === CrystalType.SYNTHETIC;
}

/**
 * Create default crystal stats
 */
export function createDefaultCrystalStats(): CrystalStats {
  return {
    damageBonus: 0,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectMagnitude: 0,
  };
}

/**
 * Create default lightsaber stats
 */
export function createDefaultLightsaberStats(): LightsaberStats {
  return {
    minDamage: 50,
    maxDamage: 100,
    speed: 1.0,
    forceCost: 10,
    accuracy: 0,
    defense: 0,
    elementalDamageType: null,
    elementalDamage: 0,
    specialAbilities: [],
    quality: 0,
    durability: 500,
    maxDurability: 500,
  };
}
