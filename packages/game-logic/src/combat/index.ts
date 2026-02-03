/**
 * Combat Module
 * Combat commands, HAM pool management, damage calculation, regeneration, and status effects
 */

// Combat states
export {
  CombatState,
  type CombatStateEffect,
  type StateImmunity,
  CombatStateModifiers,
  StateImmunityDurations,
  canPerformAction,
  calculateCombinedModifiers,
  getCombatStateName,
} from './combat-states.js';

// Combat command definitions
export {
  TargetType,
  WeaponType,
  Posture as CombatPosture,
  DamageType as CombatDamageType,
  HamPool,
  type CombatCommand,
  type CombatCommandFlags,
  DefaultCommandFlags,
  createCombatCommand,
  calculateCommandCrc,
  isValidCombatPosture,
  getWeaponTypeName,
  getTargetTypeName,
  isMeleeWeapon,
  isRangedWeapon,
} from './combat-command.js';

// Command parser
export {
  type ParsedCommand,
  type CreatureObject as CombatCreatureObject,
  type ValidationResult,
  ValidationErrorCode,
  validationSuccess,
  validationFailure,
  CommandRegistry,
  CombatCommandParser,
  createCombatCommandParser,
} from './command-parser.js';

// Command queue
export {
  type QueuedCommand,
  type ExecutingCommand,
  type ExecutedCommand,
  CommandQueue,
  createCommandQueue,
} from './command-queue.js';

// Cooldown manager
export { CooldownManager, createCooldownManager } from './cooldown-manager.js';

// Command loader
export {
  type RawCommandData,
  loadBuiltInCommands,
  createDefaultCommandRegistry,
  loadCustomCommands,
  getBuiltInCommandNames,
  getBuiltInCommand,
  validateCommandData,
} from './command-loader.js';

// Damage types and results (HAM-specific)
export {
  DamageType,
  HitLocation,
  HIT_LOCATION_WEIGHTS,
  HIT_LOCATION_MODIFIERS,
  type DamageResult,
  type HealResult,
  calculateHitLocation,
  getHitLocationModifier,
  getHitLocationName,
  createEmptyDamageResult,
  createEmptyHealResult,
} from './damage-types.js';

// HAM modifiers (buffs/debuffs)
export {
  HamModifierType,
  ModifierSource,
  type HamModifier,
  HamModifierManager,
  createFoodBuff,
  createMedicalHoT,
  createPoisonDoT,
  createDiseaseDoT,
  createBleedingDoT,
  createFireDoT,
} from './ham-modifiers.js';

// Regeneration system
export {
  BASE_REGEN_RATES,
  POSTURE_REGEN_MODIFIERS,
  COMBAT_REGEN_MODIFIER,
  OUT_OF_COMBAT_REGEN_MODIFIER,
  WOUND_REGEN_PENALTY_PER_POINT,
  MAX_WOUND_REGEN_PENALTY,
  BATTLE_FATIGUE_REGEN_PENALTY_PER_POINT,
  MAX_BATTLE_FATIGUE_REGEN_PENALTY,
  ENTERTAINER_REGEN_BONUS,
  CAMPFIRE_REGEN_BONUS,
  type RegenCalculation,
  type RegenerationState,
  calculateWoundPenalty,
  calculateBattleFatiguePenalty,
  calculateRegenRate,
  createRegenState,
  processRegeneration,
  updateRegenBonuses,
  pauseRegeneration,
  resumeRegeneration,
  getTimeToFullRegen,
} from './regeneration.js';

// Incapacitation and death
export {
  IncapConfig,
  DeathType,
  type IncapRecord,
  type DeathRecord,
  type IncapacitationState,
  type IncapCheckResult,
  type DeathResult,
  createIncapState,
  cleanupIncapRecords,
  checkIncapacitation,
  applyIncapacitation,
  isIncapTimerExpired,
  reviveFromIncap,
  applyDeathblow,
  calculateXpLoss,
  processDeath,
  cloneCreature,
  setCloneLocation,
  hasCloneSickness,
  getCloneSicknessRemaining,
  processIncapTick,
  canBeDeathBlown,
} from './incapacitation.js';

// HAM Manager (main entry point)
export {
  type HamManagerConfig,
  DEFAULT_HAM_CONFIG,
  HamManager,
  createHamManager,
} from './ham-manager.js';

// Combat Manager (core combat system)
export {
  type CombatResult,
  type DamageCalculation,
  type HitResult,
  type MitigationResult,
  type CombatSpamMessage,
  type AoeTarget,
  type CombatManagerConfig,
  DEFAULT_COMBAT_CONFIG,
  POSTURE_DEFENSE_MODIFIERS,
  CombatManager,
  createCombatManager,
} from './combat-manager.js';
