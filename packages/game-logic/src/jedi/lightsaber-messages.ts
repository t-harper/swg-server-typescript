/**
 * Lightsaber Crafting Network Messages
 * Protocol message types for lightsaber crafting client-server communication
 *
 * Handles:
 * - Crystal attunement messages
 * - Lightsaber assembly messages
 * - Component validation messages
 * - Stats updates
 */

import type { ObjectId } from '@swg/shared-types';
import {
  CrystalType,
  CrystalColor,
  CrystalSpecialEffect,
  LightsaberHiltType,
  LightsaberGeneration,
  type LightsaberStats,
  type CrystalStats,
  type LightsaberSpecialAbility,
} from './lightsaber-types.js';
import { AttunementState, CrystalPurity, AttunementResultCode } from './crystal-attunement.js';
import { LightsaberCraftingResultCode, LightsaberCraftingState } from './lightsaber-crafting.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Lightsaber message opcodes
 */
export const LightsaberMessageOpcode = {
  // Crystal Attunement
  /** Client request to start crystal attunement */
  CrystalAttuneStart: 0xf0002001,
  /** Server response to attunement start */
  CrystalAttuneStartResponse: 0xf0002002,
  /** Server notification of attunement progress */
  CrystalAttuneProgress: 0xf0002003,
  /** Server notification of attunement completion */
  CrystalAttuneComplete: 0xf0002004,
  /** Client request to cancel attunement */
  CrystalAttuneCancel: 0xf0002005,

  // Lightsaber Crafting
  /** Client request to start crafting session */
  LightsaberCraftStart: 0xf0002010,
  /** Server response to craft start */
  LightsaberCraftStartResponse: 0xf0002011,
  /** Client request to load component */
  LightsaberLoadComponent: 0xf0002012,
  /** Server response to component load */
  LightsaberLoadComponentResponse: 0xf0002013,
  /** Client request to validate components */
  LightsaberValidate: 0xf0002014,
  /** Server response to validation */
  LightsaberValidateResponse: 0xf0002015,
  /** Client request to assemble */
  LightsaberAssemble: 0xf0002016,
  /** Server notification of assembly result */
  LightsaberAssemblyResult: 0xf0002017,
  /** Client request to cancel crafting */
  LightsaberCraftCancel: 0xf0002018,

  // Stats
  /** Server notification of lightsaber stats */
  LightsaberStats: 0xf0002020,
  /** Server notification of crystal stats */
  CrystalStats: 0xf0002021,
} as const;

export type LightsaberMessageOpcodeType =
  (typeof LightsaberMessageOpcode)[keyof typeof LightsaberMessageOpcode];

// ============================================
// Crystal Attunement Messages
// ============================================

/**
 * CrystalAttuneStartMessage - Client request to start attunement
 */
export interface CrystalAttuneStartMessage {
  opcode: typeof LightsaberMessageOpcode.CrystalAttuneStart;
  /** Crystal object ID */
  crystalId: ObjectId;
  /** Crystal type */
  crystalType: CrystalType;
}

/**
 * CrystalAttuneStartResponseMessage - Server response to attunement start
 */
export interface CrystalAttuneStartResponseMessage {
  opcode: typeof LightsaberMessageOpcode.CrystalAttuneStartResponse;
  /** Whether attunement started successfully */
  success: boolean;
  /** Result code */
  resultCode: AttunementResultCode;
  /** Session ID (if successful) */
  sessionId: bigint;
  /** Crystal object ID */
  crystalId: ObjectId;
  /** Crystal type */
  crystalType: CrystalType;
  /** Crystal display name */
  crystalName: string;
  /** Required meditation time in ms */
  meditationTimeRequired: number;
  /** Required bonding time in ms */
  bondingTimeRequired: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * CrystalAttuneProgressMessage - Server notification of progress
 */
export interface CrystalAttuneProgressMessage {
  opcode: typeof LightsaberMessageOpcode.CrystalAttuneProgress;
  /** Session ID */
  sessionId: bigint;
  /** Crystal object ID */
  crystalId: ObjectId;
  /** Current attunement state */
  state: AttunementState;
  /** Meditation progress (0-100) */
  meditationProgress: number;
  /** Bonding progress (0-100) */
  bondingProgress: number;
  /** Total progress (0-100) */
  totalProgress: number;
  /** Force drained this tick */
  forceDrained: number;
  /** Remaining force after drain */
  forceRemaining: number;
}

/**
 * CrystalAttuneCompleteMessage - Server notification of attunement completion
 */
export interface CrystalAttuneCompleteMessage {
  opcode: typeof LightsaberMessageOpcode.CrystalAttuneComplete;
  /** Whether attunement succeeded */
  success: boolean;
  /** Result code */
  resultCode: AttunementResultCode;
  /** Session ID */
  sessionId: bigint;
  /** Crystal object ID */
  crystalId: ObjectId;
  /** Crystal type */
  crystalType: CrystalType;
  /** Crystal display name */
  crystalName: string;
  /** Final purity value */
  purity: number;
  /** Purity level */
  purityLevel: CrystalPurity;
  /** Crystal color (for blade crystals) */
  color: CrystalColor | null;
  /** Final crystal stats */
  stats: CrystalStatsData;
  /** Whether crystal is now soulbound */
  soulbound: boolean;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * CrystalAttuneCancelMessage - Client request to cancel attunement
 */
export interface CrystalAttuneCancelMessage {
  opcode: typeof LightsaberMessageOpcode.CrystalAttuneCancel;
  /** Session ID to cancel */
  sessionId: bigint;
}

// ============================================
// Lightsaber Crafting Messages
// ============================================

/**
 * LightsaberCraftStartMessage - Client request to start crafting
 */
export interface LightsaberCraftStartMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberCraftStart;
  /** Target generation */
  generation: LightsaberGeneration;
}

/**
 * LightsaberCraftStartResponseMessage - Server response to craft start
 */
export interface LightsaberCraftStartResponseMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberCraftStartResponse;
  /** Whether session started successfully */
  success: boolean;
  /** Result code */
  resultCode: LightsaberCraftingResultCode;
  /** Session ID (if successful) */
  sessionId: bigint;
  /** Target generation */
  generation: LightsaberGeneration;
  /** Generation display name */
  generationName: string;
  /** Minimum crystal quality required */
  minCrystalQuality: number;
  /** Maximum optional crystals allowed */
  maxOptionalCrystals: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * Component types for loading
 */
export enum LightsaberComponentType {
  HILT = 'hilt',
  BLADE_CRYSTAL = 'blade_crystal',
  FOCUSING_CRYSTAL = 'focusing_crystal',
  POWER_CRYSTAL = 'power_crystal',
  LENS = 'lens',
}

/**
 * LightsaberLoadComponentMessage - Client request to load a component
 */
export interface LightsaberLoadComponentMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberLoadComponent;
  /** Session ID */
  sessionId: bigint;
  /** Component type */
  componentType: LightsaberComponentType;
  /** Component object ID */
  componentId: ObjectId;
}

/**
 * LightsaberLoadComponentResponseMessage - Server response to component load
 */
export interface LightsaberLoadComponentResponseMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberLoadComponentResponse;
  /** Whether component was loaded successfully */
  success: boolean;
  /** Result code */
  resultCode: LightsaberCraftingResultCode;
  /** Session ID */
  sessionId: bigint;
  /** Component type */
  componentType: LightsaberComponentType;
  /** Component object ID */
  componentId: ObjectId;
  /** Component display name */
  componentName: string;
  /** Component quality (0-100) */
  componentQuality: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * LightsaberValidateMessage - Client request to validate components
 */
export interface LightsaberValidateMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberValidate;
  /** Session ID */
  sessionId: bigint;
}

/**
 * LightsaberValidateResponseMessage - Server response to validation
 */
export interface LightsaberValidateResponseMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberValidateResponse;
  /** Whether validation passed */
  valid: boolean;
  /** Result code */
  resultCode: LightsaberCraftingResultCode;
  /** Session ID */
  sessionId: bigint;
  /** List of validation issues */
  issues: string[];
  /** Component status */
  componentStatus: ComponentStatusData;
  /** Estimated stats (if valid) */
  estimatedStats: LightsaberStatsData | null;
}

/**
 * LightsaberAssembleMessage - Client request to assemble
 */
export interface LightsaberAssembleMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberAssemble;
  /** Session ID */
  sessionId: bigint;
  /** Custom name for the lightsaber (optional) */
  customName: string | null;
}

/**
 * LightsaberAssemblyResultMessage - Server notification of assembly result
 */
export interface LightsaberAssemblyResultMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberAssemblyResult;
  /** Whether assembly succeeded */
  success: boolean;
  /** Result code */
  resultCode: LightsaberCraftingResultCode;
  /** Session ID */
  sessionId: bigint;
  /** Whether critical success occurred */
  criticalSuccess: boolean;
  /** Lightsaber data (if successful) */
  lightsaber: LightsaberData | null;
  /** Force cost paid */
  forceCost: number;
  /** Remaining force after assembly */
  forceRemaining: number;
  /** Message for the player */
  message: string;
}

/**
 * LightsaberCraftCancelMessage - Client request to cancel crafting
 */
export interface LightsaberCraftCancelMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberCraftCancel;
  /** Session ID to cancel */
  sessionId: bigint;
}

// ============================================
// Stats Messages
// ============================================

/**
 * LightsaberStatsMessage - Server notification of lightsaber stats
 */
export interface LightsaberStatsMessage {
  opcode: typeof LightsaberMessageOpcode.LightsaberStats;
  /** Lightsaber object ID */
  lightsaberId: ObjectId;
  /** Lightsaber name */
  name: string;
  /** Custom name (if any) */
  customName: string | null;
  /** Hilt type */
  hiltType: LightsaberHiltType;
  /** Blade color */
  bladeColor: CrystalColor;
  /** Generation */
  generation: LightsaberGeneration;
  /** Stats */
  stats: LightsaberStatsData;
  /** Crafter name */
  crafterName: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * CrystalStatsMessage - Server notification of crystal stats
 */
export interface CrystalStatsMessage {
  opcode: typeof LightsaberMessageOpcode.CrystalStats;
  /** Crystal object ID */
  crystalId: ObjectId;
  /** Crystal type */
  crystalType: CrystalType;
  /** Crystal display name */
  crystalName: string;
  /** Crystal color (for blade crystals) */
  color: CrystalColor | null;
  /** Quality (0-100) */
  quality: number;
  /** Purity (0-100) */
  purity: number;
  /** Purity level */
  purityLevel: CrystalPurity;
  /** Whether attuned */
  attuned: boolean;
  /** Attuned to Jedi name (if attuned) */
  attunedToName: string | null;
  /** Stats */
  stats: CrystalStatsData;
  /** Whether soulbound */
  soulbound: boolean;
}

// ============================================
// Data Transfer Objects
// ============================================

/**
 * Crystal stats data for network transfer
 */
export interface CrystalStatsData {
  /** Flat damage bonus */
  damageBonus: number;
  /** Damage multiplier (percentage) */
  damageMultiplier: number;
  /** Attack speed bonus */
  speedBonus: number;
  /** Force cost reduction (percentage) */
  forceReduction: number;
  /** Accuracy bonus */
  accuracyBonus: number;
  /** Defense bonus */
  defenseBonus: number;
  /** Special effect */
  specialEffect: CrystalSpecialEffect;
  /** Special effect display name */
  specialEffectName: string;
  /** Special effect magnitude */
  specialEffectMagnitude: number;
}

/**
 * Lightsaber stats data for network transfer
 */
export interface LightsaberStatsData {
  /** Minimum damage */
  minDamage: number;
  /** Maximum damage */
  maxDamage: number;
  /** Attack speed */
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
  /** Special abilities */
  specialAbilities: SpecialAbilityData[];
  /** Overall quality (0-100) */
  quality: number;
  /** Current durability */
  durability: number;
  /** Maximum durability */
  maxDurability: number;
}

/**
 * Special ability data for network transfer
 */
export interface SpecialAbilityData {
  /** Effect type */
  effect: CrystalSpecialEffect;
  /** Effect display name */
  name: string;
  /** Effect description */
  description: string;
  /** Effect magnitude */
  magnitude: number;
}

/**
 * Lightsaber data for network transfer
 */
export interface LightsaberData {
  /** Object ID */
  objectId: ObjectId;
  /** Name */
  name: string;
  /** Custom name (if any) */
  customName: string | null;
  /** Hilt type */
  hiltType: LightsaberHiltType;
  /** Blade color */
  bladeColor: CrystalColor;
  /** Generation */
  generation: LightsaberGeneration;
  /** Generation display name */
  generationName: string;
  /** Stats */
  stats: LightsaberStatsData;
  /** Crafter name */
  crafterName: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Component status data for validation response
 */
export interface ComponentStatusData {
  /** Has hilt loaded */
  hasHilt: boolean;
  /** Hilt name (if loaded) */
  hiltName: string | null;
  /** Has blade crystal loaded */
  hasBladeCrystal: boolean;
  /** Blade crystal name (if loaded) */
  bladeCrystalName: string | null;
  /** Blade crystal color (if loaded) */
  bladeCrystalColor: CrystalColor | null;
  /** Has focusing crystal loaded */
  hasFocusingCrystal: boolean;
  /** Focusing crystal name (if loaded) */
  focusingCrystalName: string | null;
  /** Has power crystal loaded */
  hasPowerCrystal: boolean;
  /** Power crystal name (if loaded) */
  powerCrystalName: string | null;
  /** Has lens loaded */
  hasLens: boolean;
  /** Lens name (if loaded) */
  lensName: string | null;
  /** Number of optional crystals */
  optionalCrystalCount: number;
  /** Maximum allowed optional crystals */
  maxOptionalCrystals: number;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all lightsaber client messages
 */
export type LightsaberClientMessage =
  | CrystalAttuneStartMessage
  | CrystalAttuneCancelMessage
  | LightsaberCraftStartMessage
  | LightsaberLoadComponentMessage
  | LightsaberValidateMessage
  | LightsaberAssembleMessage
  | LightsaberCraftCancelMessage;

/**
 * Union type of all lightsaber server messages
 */
export type LightsaberServerMessage =
  | CrystalAttuneStartResponseMessage
  | CrystalAttuneProgressMessage
  | CrystalAttuneCompleteMessage
  | LightsaberCraftStartResponseMessage
  | LightsaberLoadComponentResponseMessage
  | LightsaberValidateResponseMessage
  | LightsaberAssemblyResultMessage
  | LightsaberStatsMessage
  | CrystalStatsMessage;

/**
 * Union type of all lightsaber messages
 */
export type LightsaberMessage = LightsaberClientMessage | LightsaberServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid lightsaber message opcode
 */
export function isLightsaberMessageOpcode(
  opcode: number
): opcode is LightsaberMessageOpcodeType {
  return Object.values(LightsaberMessageOpcode).includes(
    opcode as LightsaberMessageOpcodeType
  );
}

/**
 * Convert CrystalStats to CrystalStatsData for network transfer
 */
export function crystalStatsToData(stats: CrystalStats): CrystalStatsData {
  return {
    damageBonus: stats.damageBonus,
    damageMultiplier: stats.damageMultiplier,
    speedBonus: stats.speedBonus,
    forceReduction: stats.forceReduction,
    accuracyBonus: stats.accuracyBonus,
    defenseBonus: stats.defenseBonus,
    specialEffect: stats.specialEffect,
    specialEffectName: getSpecialEffectDisplayName(stats.specialEffect),
    specialEffectMagnitude: stats.specialEffectMagnitude,
  };
}

/**
 * Convert LightsaberStats to LightsaberStatsData for network transfer
 */
export function lightsaberStatsToData(stats: LightsaberStats): LightsaberStatsData {
  return {
    minDamage: stats.minDamage,
    maxDamage: stats.maxDamage,
    speed: stats.speed,
    forceCost: stats.forceCost,
    accuracy: stats.accuracy,
    defense: stats.defense,
    elementalDamageType: stats.elementalDamageType,
    elementalDamage: stats.elementalDamage,
    specialAbilities: stats.specialAbilities.map(specialAbilityToData),
    quality: stats.quality,
    durability: stats.durability,
    maxDurability: stats.maxDurability,
  };
}

/**
 * Convert LightsaberSpecialAbility to SpecialAbilityData
 */
export function specialAbilityToData(ability: LightsaberSpecialAbility): SpecialAbilityData {
  return {
    effect: ability.effect,
    name: ability.name,
    description: ability.description,
    magnitude: ability.magnitude,
  };
}

/**
 * Get display name for a special effect
 */
function getSpecialEffectDisplayName(effect: CrystalSpecialEffect): string {
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
  return names[effect] ?? 'Unknown';
}

// ============================================
// Message Factory Functions
// ============================================

/**
 * Create CrystalAttuneStartResponseMessage
 */
export function createCrystalAttuneStartResponse(
  success: boolean,
  resultCode: AttunementResultCode,
  sessionId: bigint,
  crystalId: ObjectId,
  crystalType: CrystalType,
  crystalName: string,
  meditationTimeRequired: number = 0,
  bondingTimeRequired: number = 0,
  errorMessage: string = ''
): CrystalAttuneStartResponseMessage {
  return {
    opcode: LightsaberMessageOpcode.CrystalAttuneStartResponse,
    success,
    resultCode,
    sessionId,
    crystalId,
    crystalType,
    crystalName,
    meditationTimeRequired,
    bondingTimeRequired,
    errorMessage,
  };
}

/**
 * Create CrystalAttuneProgressMessage
 */
export function createCrystalAttuneProgressMessage(
  sessionId: bigint,
  crystalId: ObjectId,
  state: AttunementState,
  meditationProgress: number,
  bondingProgress: number,
  totalProgress: number,
  forceDrained: number,
  forceRemaining: number
): CrystalAttuneProgressMessage {
  return {
    opcode: LightsaberMessageOpcode.CrystalAttuneProgress,
    sessionId,
    crystalId,
    state,
    meditationProgress: Math.floor(meditationProgress * 100),
    bondingProgress: Math.floor(bondingProgress * 100),
    totalProgress: Math.floor(totalProgress * 100),
    forceDrained,
    forceRemaining,
  };
}

/**
 * Create CrystalAttuneCompleteMessage
 */
export function createCrystalAttuneCompleteMessage(
  success: boolean,
  resultCode: AttunementResultCode,
  sessionId: bigint,
  crystalId: ObjectId,
  crystalType: CrystalType,
  crystalName: string,
  purity: number = 0,
  purityLevel: CrystalPurity = CrystalPurity.STANDARD,
  color: CrystalColor | null = null,
  stats: CrystalStatsData | null = null,
  soulbound: boolean = false,
  errorMessage: string = ''
): CrystalAttuneCompleteMessage {
  return {
    opcode: LightsaberMessageOpcode.CrystalAttuneComplete,
    success,
    resultCode,
    sessionId,
    crystalId,
    crystalType,
    crystalName,
    purity,
    purityLevel,
    color,
    stats: stats ?? createEmptyCrystalStatsData(),
    soulbound,
    errorMessage,
  };
}

/**
 * Create LightsaberCraftStartResponseMessage
 */
export function createLightsaberCraftStartResponse(
  success: boolean,
  resultCode: LightsaberCraftingResultCode,
  sessionId: bigint,
  generation: LightsaberGeneration,
  generationName: string,
  minCrystalQuality: number = 0,
  maxOptionalCrystals: number = 0,
  errorMessage: string = ''
): LightsaberCraftStartResponseMessage {
  return {
    opcode: LightsaberMessageOpcode.LightsaberCraftStartResponse,
    success,
    resultCode,
    sessionId,
    generation,
    generationName,
    minCrystalQuality,
    maxOptionalCrystals,
    errorMessage,
  };
}

/**
 * Create LightsaberAssemblyResultMessage
 */
export function createLightsaberAssemblyResultMessage(
  success: boolean,
  resultCode: LightsaberCraftingResultCode,
  sessionId: bigint,
  criticalSuccess: boolean,
  lightsaber: LightsaberData | null,
  forceCost: number,
  forceRemaining: number,
  message: string
): LightsaberAssemblyResultMessage {
  return {
    opcode: LightsaberMessageOpcode.LightsaberAssemblyResult,
    success,
    resultCode,
    sessionId,
    criticalSuccess,
    lightsaber,
    forceCost,
    forceRemaining,
    message,
  };
}

/**
 * Create LightsaberStatsMessage
 */
export function createLightsaberStatsMessage(
  lightsaberId: ObjectId,
  name: string,
  customName: string | null,
  hiltType: LightsaberHiltType,
  bladeColor: CrystalColor,
  generation: LightsaberGeneration,
  stats: LightsaberStatsData,
  crafterName: string,
  createdAt: number
): LightsaberStatsMessage {
  return {
    opcode: LightsaberMessageOpcode.LightsaberStats,
    lightsaberId,
    name,
    customName,
    hiltType,
    bladeColor,
    generation,
    stats,
    crafterName,
    createdAt,
  };
}

/**
 * Create empty crystal stats data
 */
function createEmptyCrystalStatsData(): CrystalStatsData {
  return {
    damageBonus: 0,
    damageMultiplier: 1.0,
    speedBonus: 0,
    forceReduction: 0,
    accuracyBonus: 0,
    defenseBonus: 0,
    specialEffect: CrystalSpecialEffect.NONE,
    specialEffectName: 'None',
    specialEffectMagnitude: 0,
  };
}

// ============================================
// Display Name Functions
// ============================================

/**
 * Get display name for attunement state
 */
export function getAttunementStateDisplayName(state: AttunementState): string {
  const names: Record<AttunementState, string> = {
    [AttunementState.NOT_STARTED]: 'Not Started',
    [AttunementState.MEDITATING]: 'Meditating',
    [AttunementState.BONDING]: 'Bonding with Crystal',
    [AttunementState.COMPLETE]: 'Complete',
    [AttunementState.FAILED]: 'Failed',
    [AttunementState.INTERRUPTED]: 'Interrupted',
  };
  return names[state];
}

/**
 * Get display name for crafting state
 */
export function getCraftingStateDisplayName(state: LightsaberCraftingState): string {
  const names: Record<LightsaberCraftingState, string> = {
    [LightsaberCraftingState.GATHERING]: 'Gathering Components',
    [LightsaberCraftingState.VALIDATING]: 'Validating',
    [LightsaberCraftingState.ASSEMBLING]: 'Assembling',
    [LightsaberCraftingState.COMPLETE]: 'Complete',
    [LightsaberCraftingState.FAILED]: 'Failed',
  };
  return names[state];
}

/**
 * Get display name for purity level
 */
export function getPurityDisplayName(purity: CrystalPurity): string {
  const names: Record<CrystalPurity, string> = {
    [CrystalPurity.IMPURE]: 'Impure',
    [CrystalPurity.STANDARD]: 'Standard',
    [CrystalPurity.PURE]: 'Pure',
    [CrystalPurity.EXCEPTIONAL]: 'Exceptional',
    [CrystalPurity.FLAWLESS]: 'Flawless',
  };
  return names[purity];
}

/**
 * Get display name for component type
 */
export function getComponentTypeDisplayName(type: LightsaberComponentType): string {
  const names: Record<LightsaberComponentType, string> = {
    [LightsaberComponentType.HILT]: 'Hilt',
    [LightsaberComponentType.BLADE_CRYSTAL]: 'Blade Crystal',
    [LightsaberComponentType.FOCUSING_CRYSTAL]: 'Focusing Crystal',
    [LightsaberComponentType.POWER_CRYSTAL]: 'Power Crystal',
    [LightsaberComponentType.LENS]: 'Lens',
  };
  return names[type];
}
