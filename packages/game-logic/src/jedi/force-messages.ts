/**
 * Force Power Network Messages
 * Protocol message types for force power system client-server communication
 *
 * Handles:
 * - ForcePowerActivateMessage
 * - ForcePowerEffectMessage
 * - ForcePoolUpdateMessage
 * - ForceChannelStartMessage
 * - ForceChannelEndMessage
 */

import type { ObjectId } from '@swg/shared-types';
import { ForceState, ForceEffectType } from './force-power-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Force power message opcodes
 */
export const ForceMessageOpcode = {
  /** Client request to activate a force power */
  ForcePowerActivate: 0xf0001001,
  /** Server response to force power activation */
  ForcePowerActivateResponse: 0xf0001002,
  /** Server notification of force effect on target */
  ForcePowerEffect: 0xf0001003,
  /** Server update for force pool (current/max) */
  ForcePoolUpdate: 0xf0001004,
  /** Server notification of channel start */
  ForceChannelStart: 0xf0001005,
  /** Server notification of channel end */
  ForceChannelEnd: 0xf0001006,
  /** Server notification of force state change */
  ForceStateChange: 0xf0001007,
  /** Client request to interrupt channel */
  ForceChannelInterrupt: 0xf0001008,
  /** Server notification of effect tick (DOT/HOT) */
  ForceEffectTick: 0xf0001009,
  /** Server notification of effect expiration */
  ForceEffectExpire: 0xf000100a,
  /** Server notification of resist */
  ForceResist: 0xf000100b,
} as const;

export type ForceMessageOpcodeType =
  (typeof ForceMessageOpcode)[keyof typeof ForceMessageOpcode];

// ============================================
// Activation Messages
// ============================================

/**
 * ForcePowerActivateMessage - Client request to use a force power
 */
export interface ForcePowerActivateMessage {
  opcode: typeof ForceMessageOpcode.ForcePowerActivate;
  /** Power ID to activate */
  powerId: string;
  /** Command CRC of the power */
  commandCrc: number;
  /** Target object ID (0 for self or AOE) */
  targetId: ObjectId;
}

/**
 * Result code for force power activation
 */
export enum ForceActivateResultCode {
  /** Power activated successfully */
  Success = 0,
  /** Insufficient force power */
  InsufficientForce = 1,
  /** Power is on cooldown */
  OnCooldown = 2,
  /** Invalid target */
  InvalidTarget = 3,
  /** Target out of range */
  OutOfRange = 4,
  /** Not a Jedi */
  NotJedi = 5,
  /** Insufficient skill level */
  InsufficientSkill = 6,
  /** Already channeling */
  AlreadyChanneling = 7,
  /** Incapacitated */
  Incapacitated = 8,
  /** Power not found */
  PowerNotFound = 9,
  /** Global cooldown active */
  GcdActive = 10,
  /** General failure */
  Failed = 99,
}

/**
 * ForcePowerActivateResponseMessage - Server response to power activation
 */
export interface ForcePowerActivateResponseMessage {
  opcode: typeof ForceMessageOpcode.ForcePowerActivateResponse;
  /** Whether the power was activated */
  success: boolean;
  /** Result code */
  resultCode: ForceActivateResultCode;
  /** Power ID that was activated */
  powerId: string;
  /** Force cost that was paid */
  forceCost: number;
  /** Remaining force after use */
  forceRemaining: number;
  /** Cooldown duration in ms */
  cooldownDuration: number;
  /** Animation CRC to play */
  animationCrc: number;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Effect Messages
// ============================================

/**
 * Effect data for network transmission
 */
export interface ForceEffectData {
  /** Unique effect ID */
  effectId: bigint;
  /** Power ID that created this effect */
  powerId: string;
  /** Effect type */
  effectType: ForceEffectType;
  /** Effect magnitude */
  magnitude: number;
  /** Duration in ms (0 for instant) */
  duration: number;
  /** Tick interval in ms (for over-time effects) */
  tickInterval: number;
  /** Force state applied (if any) */
  stateApplied: ForceState;
  /** Stat modified (if applicable) */
  statModified: string;
}

/**
 * ForcePowerEffectMessage - Server notification of effect application
 */
export interface ForcePowerEffectMessage {
  opcode: typeof ForceMessageOpcode.ForcePowerEffect;
  /** Caster object ID */
  casterId: ObjectId;
  /** Target object ID */
  targetId: ObjectId;
  /** Power ID used */
  powerId: string;
  /** Power name for display */
  powerName: string;
  /** Instant damage dealt */
  damageDealt: number;
  /** Instant healing done */
  healingDone: number;
  /** Health drained (for drain effects) */
  healthDrained: number;
  /** Effects applied */
  effects: ForceEffectData[];
  /** Whether target was killed */
  targetKilled: boolean;
  /** Animation CRC to play */
  animationCrc: number;
}

/**
 * ForceEffectTickMessage - Server notification of DOT/HOT tick
 */
export interface ForceEffectTickMessage {
  opcode: typeof ForceMessageOpcode.ForceEffectTick;
  /** Effect ID */
  effectId: bigint;
  /** Target object ID */
  targetId: ObjectId;
  /** Caster object ID */
  casterId: ObjectId;
  /** Power ID */
  powerId: string;
  /** Damage this tick */
  damage: number;
  /** Healing this tick */
  healing: number;
  /** Remaining ticks */
  remainingTicks: number;
  /** Whether target was killed */
  targetKilled: boolean;
}

/**
 * ForceEffectExpireMessage - Server notification of effect expiration
 */
export interface ForceEffectExpireMessage {
  opcode: typeof ForceMessageOpcode.ForceEffectExpire;
  /** Effect ID */
  effectId: bigint;
  /** Target object ID */
  targetId: ObjectId;
  /** Power ID */
  powerId: string;
  /** Total damage/healing done by this effect */
  totalApplied: number;
  /** State that was removed (if any) */
  stateRemoved: ForceState;
}

/**
 * ForceResistMessage - Server notification of resist
 */
export interface ForceResistMessage {
  opcode: typeof ForceMessageOpcode.ForceResist;
  /** Caster object ID */
  casterId: ObjectId;
  /** Target object ID */
  targetId: ObjectId;
  /** Power ID that was resisted */
  powerId: string;
  /** Power name for display */
  powerName: string;
}

// ============================================
// Force Pool Messages
// ============================================

/**
 * ForcePoolUpdateMessage - Server update of force pool state
 */
export interface ForcePoolUpdateMessage {
  opcode: typeof ForceMessageOpcode.ForcePoolUpdate;
  /** Object ID of the Jedi */
  jediId: ObjectId;
  /** Current force points */
  current: number;
  /** Maximum force points */
  max: number;
  /** Regeneration rate per second */
  regenRate: number;
  /** Whether regeneration is delayed */
  regenDelayed: boolean;
  /** Time until regen resumes (ms) */
  regenDelayRemaining: number;
}

// ============================================
// Channel Messages
// ============================================

/**
 * ForceChannelStartMessage - Server notification of channel start
 */
export interface ForceChannelStartMessage {
  opcode: typeof ForceMessageOpcode.ForceChannelStart;
  /** Caster object ID */
  casterId: ObjectId;
  /** Target object ID (0 if none) */
  targetId: ObjectId;
  /** Power ID being channeled */
  powerId: string;
  /** Power name for display */
  powerName: string;
  /** Channel duration in ms */
  duration: number;
  /** Animation CRC to play */
  animationCrc: number;
  /** Whether channel can be interrupted */
  interruptible: boolean;
}

/**
 * Channel end reason
 */
export enum ChannelEndReason {
  /** Channel completed normally */
  Completed = 0,
  /** Channel was interrupted */
  Interrupted = 1,
  /** Caster was killed */
  CasterKilled = 2,
  /** Target was killed */
  TargetKilled = 3,
  /** Target moved out of range */
  OutOfRange = 4,
  /** Caster cancelled the channel */
  Cancelled = 5,
  /** Caster was stunned/incapacitated */
  CasterIncapacitated = 6,
}

/**
 * ForceChannelEndMessage - Server notification of channel end
 */
export interface ForceChannelEndMessage {
  opcode: typeof ForceMessageOpcode.ForceChannelEnd;
  /** Caster object ID */
  casterId: ObjectId;
  /** Target object ID */
  targetId: ObjectId;
  /** Power ID that was channeled */
  powerId: string;
  /** Power name for display */
  powerName: string;
  /** Reason the channel ended */
  endReason: ChannelEndReason;
  /** Total damage dealt during channel */
  totalDamage: number;
  /** Total healing done during channel */
  totalHealing: number;
  /** Duration channel was active (ms) */
  actualDuration: number;
}

/**
 * ForceChannelInterruptMessage - Client request to interrupt a channel
 */
export interface ForceChannelInterruptMessage {
  opcode: typeof ForceMessageOpcode.ForceChannelInterrupt;
  /** Caster object ID to interrupt */
  casterId: ObjectId;
}

// ============================================
// State Messages
// ============================================

/**
 * ForceStateChangeMessage - Server notification of force state change
 */
export interface ForceStateChangeMessage {
  opcode: typeof ForceMessageOpcode.ForceStateChange;
  /** Target object ID */
  targetId: ObjectId;
  /** State that was added/removed */
  state: ForceState;
  /** Whether state was added (true) or removed (false) */
  added: boolean;
  /** Caster object ID (if state was applied by a power) */
  casterId: ObjectId;
  /** Power ID that caused the state change */
  powerId: string;
  /** Duration of state in ms (0 if removed) */
  duration: number;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all force power client messages
 */
export type ForceClientMessage =
  | ForcePowerActivateMessage
  | ForceChannelInterruptMessage;

/**
 * Union type of all force power server messages
 */
export type ForceServerMessage =
  | ForcePowerActivateResponseMessage
  | ForcePowerEffectMessage
  | ForceEffectTickMessage
  | ForceEffectExpireMessage
  | ForceResistMessage
  | ForcePoolUpdateMessage
  | ForceChannelStartMessage
  | ForceChannelEndMessage
  | ForceStateChangeMessage;

/**
 * Union type of all force power messages
 */
export type ForceMessage = ForceClientMessage | ForceServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid force message opcode
 */
export function isForceMessageOpcode(
  opcode: number
): opcode is ForceMessageOpcodeType {
  return Object.values(ForceMessageOpcode).includes(
    opcode as ForceMessageOpcodeType
  );
}

/**
 * Create a ForcePowerActivateResponseMessage
 */
export function createForcePowerActivateResponse(
  success: boolean,
  resultCode: ForceActivateResultCode,
  powerId: string,
  forceCost: number = 0,
  forceRemaining: number = 0,
  cooldownDuration: number = 0,
  animationCrc: number = 0,
  errorMessage: string = ''
): ForcePowerActivateResponseMessage {
  return {
    opcode: ForceMessageOpcode.ForcePowerActivateResponse,
    success,
    resultCode,
    powerId,
    forceCost,
    forceRemaining,
    cooldownDuration,
    animationCrc,
    errorMessage,
  };
}

/**
 * Create a ForcePowerEffectMessage
 */
export function createForcePowerEffectMessage(
  casterId: ObjectId,
  targetId: ObjectId,
  powerId: string,
  powerName: string,
  damageDealt: number = 0,
  healingDone: number = 0,
  healthDrained: number = 0,
  effects: ForceEffectData[] = [],
  targetKilled: boolean = false,
  animationCrc: number = 0
): ForcePowerEffectMessage {
  return {
    opcode: ForceMessageOpcode.ForcePowerEffect,
    casterId,
    targetId,
    powerId,
    powerName,
    damageDealt,
    healingDone,
    healthDrained,
    effects,
    targetKilled,
    animationCrc,
  };
}

/**
 * Create a ForceEffectTickMessage
 */
export function createForceEffectTickMessage(
  effectId: bigint,
  targetId: ObjectId,
  casterId: ObjectId,
  powerId: string,
  damage: number = 0,
  healing: number = 0,
  remainingTicks: number = 0,
  targetKilled: boolean = false
): ForceEffectTickMessage {
  return {
    opcode: ForceMessageOpcode.ForceEffectTick,
    effectId,
    targetId,
    casterId,
    powerId,
    damage,
    healing,
    remainingTicks,
    targetKilled,
  };
}

/**
 * Create a ForceEffectExpireMessage
 */
export function createForceEffectExpireMessage(
  effectId: bigint,
  targetId: ObjectId,
  powerId: string,
  totalApplied: number = 0,
  stateRemoved: ForceState = ForceState.NORMAL
): ForceEffectExpireMessage {
  return {
    opcode: ForceMessageOpcode.ForceEffectExpire,
    effectId,
    targetId,
    powerId,
    totalApplied,
    stateRemoved,
  };
}

/**
 * Create a ForceResistMessage
 */
export function createForceResistMessage(
  casterId: ObjectId,
  targetId: ObjectId,
  powerId: string,
  powerName: string
): ForceResistMessage {
  return {
    opcode: ForceMessageOpcode.ForceResist,
    casterId,
    targetId,
    powerId,
    powerName,
  };
}

/**
 * Create a ForcePoolUpdateMessage
 */
export function createForcePoolUpdateMessage(
  jediId: ObjectId,
  current: number,
  max: number,
  regenRate: number = 10,
  regenDelayed: boolean = false,
  regenDelayRemaining: number = 0
): ForcePoolUpdateMessage {
  return {
    opcode: ForceMessageOpcode.ForcePoolUpdate,
    jediId,
    current,
    max,
    regenRate,
    regenDelayed,
    regenDelayRemaining,
  };
}

/**
 * Create a ForceChannelStartMessage
 */
export function createForceChannelStartMessage(
  casterId: ObjectId,
  targetId: ObjectId,
  powerId: string,
  powerName: string,
  duration: number,
  animationCrc: number = 0,
  interruptible: boolean = true
): ForceChannelStartMessage {
  return {
    opcode: ForceMessageOpcode.ForceChannelStart,
    casterId,
    targetId,
    powerId,
    powerName,
    duration,
    animationCrc,
    interruptible,
  };
}

/**
 * Create a ForceChannelEndMessage
 */
export function createForceChannelEndMessage(
  casterId: ObjectId,
  targetId: ObjectId,
  powerId: string,
  powerName: string,
  endReason: ChannelEndReason,
  totalDamage: number = 0,
  totalHealing: number = 0,
  actualDuration: number = 0
): ForceChannelEndMessage {
  return {
    opcode: ForceMessageOpcode.ForceChannelEnd,
    casterId,
    targetId,
    powerId,
    powerName,
    endReason,
    totalDamage,
    totalHealing,
    actualDuration,
  };
}

/**
 * Create a ForceStateChangeMessage
 */
export function createForceStateChangeMessage(
  targetId: ObjectId,
  state: ForceState,
  added: boolean,
  casterId: ObjectId = 0n as ObjectId,
  powerId: string = '',
  duration: number = 0
): ForceStateChangeMessage {
  return {
    opcode: ForceMessageOpcode.ForceStateChange,
    targetId,
    state,
    added,
    casterId,
    powerId,
    duration,
  };
}

/**
 * Get human-readable description for activation result code
 */
export function getActivateResultMessage(resultCode: ForceActivateResultCode): string {
  switch (resultCode) {
    case ForceActivateResultCode.Success:
      return 'Power activated successfully.';
    case ForceActivateResultCode.InsufficientForce:
      return 'Insufficient force power.';
    case ForceActivateResultCode.OnCooldown:
      return 'Power is on cooldown.';
    case ForceActivateResultCode.InvalidTarget:
      return 'Invalid target.';
    case ForceActivateResultCode.OutOfRange:
      return 'Target is out of range.';
    case ForceActivateResultCode.NotJedi:
      return 'You must be a Jedi to use force powers.';
    case ForceActivateResultCode.InsufficientSkill:
      return 'Insufficient skill level.';
    case ForceActivateResultCode.AlreadyChanneling:
      return 'Already channeling a power.';
    case ForceActivateResultCode.Incapacitated:
      return 'Cannot use powers while incapacitated.';
    case ForceActivateResultCode.PowerNotFound:
      return 'Power not found.';
    case ForceActivateResultCode.GcdActive:
      return 'Global cooldown is active.';
    case ForceActivateResultCode.Failed:
    default:
      return 'Failed to activate power.';
  }
}

/**
 * Get human-readable description for channel end reason
 */
export function getChannelEndReasonMessage(reason: ChannelEndReason): string {
  switch (reason) {
    case ChannelEndReason.Completed:
      return 'Channel completed.';
    case ChannelEndReason.Interrupted:
      return 'Channel was interrupted.';
    case ChannelEndReason.CasterKilled:
      return 'Channel ended because caster was killed.';
    case ChannelEndReason.TargetKilled:
      return 'Channel ended because target was killed.';
    case ChannelEndReason.OutOfRange:
      return 'Channel ended because target moved out of range.';
    case ChannelEndReason.Cancelled:
      return 'Channel was cancelled.';
    case ChannelEndReason.CasterIncapacitated:
      return 'Channel ended because caster was incapacitated.';
    default:
      return 'Channel ended.';
  }
}

/**
 * Get display name for a force state
 */
export function getForceStateName(state: ForceState): string {
  switch (state) {
    case ForceState.NORMAL:
      return 'Normal';
    case ForceState.CHANNELING:
      return 'Channeling';
    case ForceState.FORCE_CHOKE_VICTIM:
      return 'Force Choked';
    case ForceState.MIND_TRICKED:
      return 'Mind Tricked';
    case ForceState.FORCE_DRAINED:
      return 'Force Drained';
    case ForceState.FORCE_FEARED:
      return 'Feared';
    case ForceState.FORCE_PUSHED:
      return 'Pushed';
    case ForceState.FORCE_PULLED:
      return 'Pulled';
    case ForceState.FORCE_SHOCKED:
      return 'Shocked';
    case ForceState.FORCE_SPEED:
      return 'Force Speed';
    case ForceState.FORCE_RAGE:
      return 'Force Rage';
    case ForceState.FORCE_SHIELDED:
      return 'Force Shielded';
    case ForceState.FORCE_ENLIGHTENED:
      return 'Force Enlightened';
    default:
      return 'Unknown';
  }
}

/**
 * Get display name for a force effect type
 */
export function getForceEffectTypeName(type: ForceEffectType): string {
  switch (type) {
    case ForceEffectType.DAMAGE:
      return 'Damage';
    case ForceEffectType.HEAL:
      return 'Heal';
    case ForceEffectType.DAMAGE_OVER_TIME:
      return 'Damage Over Time';
    case ForceEffectType.HEAL_OVER_TIME:
      return 'Heal Over Time';
    case ForceEffectType.STAT_BUFF:
      return 'Stat Buff';
    case ForceEffectType.STAT_DEBUFF:
      return 'Stat Debuff';
    case ForceEffectType.STATE_APPLY:
      return 'State Effect';
    case ForceEffectType.STATE_REMOVE:
      return 'State Remove';
    case ForceEffectType.DAMAGE_ABSORPTION:
      return 'Damage Shield';
    case ForceEffectType.HEALTH_DRAIN:
      return 'Health Drain';
    case ForceEffectType.KNOCKBACK:
      return 'Knockback';
    case ForceEffectType.PULL:
      return 'Pull';
    case ForceEffectType.FEAR:
      return 'Fear';
    case ForceEffectType.CONFUSION:
      return 'Confusion';
    case ForceEffectType.CHAIN:
      return 'Chain';
    default:
      return 'Unknown';
  }
}
