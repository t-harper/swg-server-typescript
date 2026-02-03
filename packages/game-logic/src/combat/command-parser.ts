/**
 * Combat Command Parser
 * Parses and validates combat commands from clients
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  type CombatCommand,
  Posture,
  TargetType,
  WeaponType,
  isValidCombatPosture,
} from './combat-command.js';
import { canPerformAction, type CombatState } from './combat-states.js';

/**
 * Parsed command from network data
 */
export interface ParsedCommand {
  /** Command CRC identifier */
  commandCrc: number;
  /** Target object ID (0 if no target) */
  targetId: bigint;
  /** Target position for ground-targeted abilities */
  targetPosition: Vector3 | null;
  /** Command arguments string */
  arguments: string;
  /** Sequence number for command ordering */
  sequenceNumber: number;
  /** Timestamp when command was sent by client */
  clientTimestamp: number;
}

/**
 * Creature object interface for validation
 * This is a minimal interface - actual CreatureObject would have more
 */
export interface CreatureObject {
  /** Object ID */
  objectId: ObjectId;
  /** Current position */
  position: Vector3;
  /** Current posture */
  posture: Posture;
  /** Currently equipped weapon type */
  equippedWeaponType: WeaponType;
  /** Skills the creature has */
  skills: Map<string, number>;
  /** Combat level */
  combatLevel: number;
  /** Current HAM values */
  health: number;
  action: number;
  mind: number;
  /** Current force pool (for Jedi) */
  forcePower: number;
  /** Is in combat */
  inCombat: boolean;
  /** Is alive */
  isAlive: boolean;
  /** Active combat states */
  activeStates: CombatState[];
  /** Group ID (for group buffs) */
  groupId: bigint | null;
}

/**
 * Result of command validation
 */
export interface ValidationResult {
  /** Whether the command is valid */
  valid: boolean;
  /** Error code if invalid */
  errorCode: ValidationErrorCode;
  /** Human-readable error message */
  errorMessage: string;
  /** Calculated cooldown remaining (if applicable) */
  cooldownRemaining?: number;
  /** Required resource that's missing */
  missingResource?: string;
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  /** Command is valid */
  Ok = 0,
  /** Unknown command */
  UnknownCommand = 1,
  /** Invalid target */
  InvalidTarget = 2,
  /** Target out of range */
  OutOfRange = 3,
  /** Target too close */
  TooClose = 4,
  /** Not enough health */
  InsufficientHealth = 5,
  /** Not enough action */
  InsufficientAction = 6,
  /** Not enough mind */
  InsufficientMind = 7,
  /** Not enough force */
  InsufficientForce = 8,
  /** Command on cooldown */
  OnCooldown = 9,
  /** Global cooldown active */
  GlobalCooldown = 10,
  /** Wrong weapon type */
  WrongWeapon = 11,
  /** Wrong posture/stance */
  WrongPosture = 12,
  /** Missing required skill */
  MissingSkill = 13,
  /** Insufficient skill level */
  InsufficientSkillLevel = 14,
  /** Combat level too low */
  CombatLevelTooLow = 15,
  /** Not in combat (for combat-only abilities) */
  NotInCombat = 16,
  /** In combat (for out-of-combat abilities) */
  InCombat = 17,
  /** Target is dead */
  TargetDead = 18,
  /** Caster is dead */
  CasterDead = 19,
  /** Cannot target self */
  CannotTargetSelf = 20,
  /** Cannot target friendly */
  CannotTargetFriendly = 21,
  /** Cannot target enemy */
  CannotTargetEnemy = 22,
  /** State prevents action */
  StatePreventsAction = 23,
  /** No line of sight */
  NoLineOfSight = 24,
  /** Already executing */
  AlreadyExecuting = 25,
  /** Target required */
  TargetRequired = 26,
  /** Cannot use while moving */
  CannotUseWhileMoving = 27,
}

/**
 * Validation result helper - creates a success result
 */
export function validationSuccess(): ValidationResult {
  return {
    valid: true,
    errorCode: ValidationErrorCode.Ok,
    errorMessage: '',
  };
}

/**
 * Validation result helper - creates a failure result
 */
export function validationFailure(
  errorCode: ValidationErrorCode,
  errorMessage: string,
  extra?: { cooldownRemaining?: number; missingResource?: string }
): ValidationResult {
  return {
    valid: false,
    errorCode,
    errorMessage,
    ...extra,
  };
}

/**
 * Command registry - maps CRCs to command definitions
 */
export class CommandRegistry {
  private commands: Map<number, CombatCommand> = new Map();
  private commandsByName: Map<string, CombatCommand> = new Map();

  /**
   * Register a command
   */
  public register(command: CombatCommand): void {
    this.commands.set(command.commandCrc, command);
    this.commandsByName.set(command.commandName.toLowerCase(), command);
  }

  /**
   * Get a command by CRC
   */
  public getByCrc(crc: number): CombatCommand | undefined {
    return this.commands.get(crc);
  }

  /**
   * Get a command by name
   */
  public getByName(name: string): CombatCommand | undefined {
    return this.commandsByName.get(name.toLowerCase());
  }

  /**
   * Check if a command exists
   */
  public has(crc: number): boolean {
    return this.commands.has(crc);
  }

  /**
   * Get all registered commands
   */
  public getAll(): CombatCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command count
   */
  public get size(): number {
    return this.commands.size;
  }
}

/**
 * Combat Command Parser
 * Parses and validates combat commands from client network data
 */
export class CombatCommandParser {
  private commandRegistry: CommandRegistry;
  private cooldownChecker: (attackerId: bigint, commandCrc: number) => number;
  private gcdChecker: (attackerId: bigint) => number;

  constructor(
    commandRegistry: CommandRegistry,
    cooldownChecker: (attackerId: bigint, commandCrc: number) => number,
    gcdChecker: (attackerId: bigint) => number
  ) {
    this.commandRegistry = commandRegistry;
    this.cooldownChecker = cooldownChecker;
    this.gcdChecker = gcdChecker;
  }

  /**
   * Parse incoming command from network data
   * Command format:
   * - 4 bytes: Command CRC (uint32 LE)
   * - 8 bytes: Target ID (uint64 LE)
   * - 12 bytes: Target position (3x float32 LE) - optional, zeros if not used
   * - 4 bytes: Argument length (uint32 LE)
   * - N bytes: Arguments (UTF-8 string)
   * - 4 bytes: Sequence number (uint32 LE)
   * - 4 bytes: Client timestamp (uint32 LE)
   */
  public parseCommand(data: Uint8Array): ParsedCommand {
    if (data.length < 36) {
      throw new Error(`Command data too short: ${data.length} bytes, expected at least 36`);
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    // Read command CRC
    const commandCrc = view.getUint32(offset, true);
    offset += 4;

    // Read target ID
    const targetId = view.getBigUint64(offset, true);
    offset += 8;

    // Read target position
    const posX = view.getFloat32(offset, true);
    offset += 4;
    const posY = view.getFloat32(offset, true);
    offset += 4;
    const posZ = view.getFloat32(offset, true);
    offset += 4;

    // Determine if target position is valid (all zeros = no position)
    const hasTargetPosition = posX !== 0 || posY !== 0 || posZ !== 0;
    const targetPosition: Vector3 | null = hasTargetPosition
      ? { x: posX, y: posY, z: posZ }
      : null;

    // Read argument length
    const argLength = view.getUint32(offset, true);
    offset += 4;

    // Validate remaining data
    const expectedRemaining = argLength + 8; // args + sequence + timestamp
    if (data.length - offset < expectedRemaining) {
      throw new Error(
        `Command data truncated: expected ${expectedRemaining} more bytes, have ${data.length - offset}`
      );
    }

    // Read arguments
    const argBytes = data.subarray(offset, offset + argLength);
    const arguments_ = new TextDecoder('utf-8').decode(argBytes);
    offset += argLength;

    // Read sequence number
    const sequenceNumber = view.getUint32(offset, true);
    offset += 4;

    // Read client timestamp
    const clientTimestamp = view.getUint32(offset, true);

    return {
      commandCrc,
      targetId,
      targetPosition,
      arguments: arguments_,
      sequenceNumber,
      clientTimestamp,
    };
  }

  /**
   * Validate that a command can be used
   */
  public validateCommand(
    attacker: CreatureObject,
    command: CombatCommand,
    target?: CreatureObject
  ): ValidationResult {
    // Check if attacker is alive
    if (!attacker.isAlive) {
      return validationFailure(
        ValidationErrorCode.CasterDead,
        'Cannot use abilities while dead'
      );
    }

    // Check combat states
    const canAct = canPerformAction(attacker.activeStates, 'ability');
    if (!canAct) {
      return validationFailure(
        ValidationErrorCode.StatePreventsAction,
        'A combat state prevents you from using this ability'
      );
    }

    // Check posture
    if (!this.checkPostureRequirement(attacker, command)) {
      return validationFailure(
        ValidationErrorCode.WrongPosture,
        `You must be ${command.requiredStance.map((p) => Posture[p]).join(' or ')} to use this ability`
      );
    }

    // Check weapon requirement
    if (!this.checkWeaponRequirement(attacker, command)) {
      return validationFailure(
        ValidationErrorCode.WrongWeapon,
        'You do not have the correct weapon equipped for this ability'
      );
    }

    // Check skill requirement
    if (!this.checkSkillRequirement(attacker, command)) {
      return validationFailure(
        ValidationErrorCode.MissingSkill,
        `You need the skill "${command.requiredSkill}" to use this ability`
      );
    }

    // Check combat level
    if (attacker.combatLevel < command.requiredCombatLevel) {
      return validationFailure(
        ValidationErrorCode.CombatLevelTooLow,
        `You need combat level ${command.requiredCombatLevel} to use this ability`
      );
    }

    // Check costs
    const costResult = this.checkCost(attacker, command);
    if (!costResult.valid) {
      return costResult;
    }

    // Check cooldowns
    const cooldownResult = this.checkCooldown(attacker, command);
    if (!cooldownResult.valid) {
      return cooldownResult;
    }

    // Check GCD
    const gcdRemaining = this.gcdChecker(attacker.objectId);
    if (gcdRemaining > 0) {
      return validationFailure(
        ValidationErrorCode.GlobalCooldown,
        'Global cooldown active',
        { cooldownRemaining: gcdRemaining }
      );
    }

    // Check combat requirements
    if (command.flags.requiresCombat && !attacker.inCombat) {
      return validationFailure(
        ValidationErrorCode.NotInCombat,
        'You must be in combat to use this ability'
      );
    }

    if (command.flags.outOfCombatOnly && attacker.inCombat) {
      return validationFailure(
        ValidationErrorCode.InCombat,
        'You cannot use this ability while in combat'
      );
    }

    // Target-specific validations
    if (command.targetType !== TargetType.Self && command.targetType !== TargetType.None) {
      if (!target && command.targetType !== TargetType.GroupBuff) {
        return validationFailure(
          ValidationErrorCode.TargetRequired,
          'This ability requires a target'
        );
      }

      if (target) {
        const targetResult = this.validateTarget(attacker, command, target);
        if (!targetResult.valid) {
          return targetResult;
        }
      }
    }

    return validationSuccess();
  }

  /**
   * Validate target for a command
   */
  private validateTarget(
    attacker: CreatureObject,
    command: CombatCommand,
    target: CreatureObject
  ): ValidationResult {
    // Self-targeting check
    const isSelf = attacker.objectId === target.objectId;
    if (isSelf && !command.flags.canTargetSelf) {
      return validationFailure(
        ValidationErrorCode.CannotTargetSelf,
        'This ability cannot target yourself'
      );
    }

    // Dead target check
    if (!target.isAlive && !command.flags.canTargetDead) {
      return validationFailure(
        ValidationErrorCode.TargetDead,
        'Target is dead'
      );
    }

    // Range check
    const rangeResult = this.checkRange(attacker, target, command);
    if (!rangeResult.valid) {
      return rangeResult;
    }

    // TODO: Friendly/enemy detection would require faction data
    // For now, we'll skip those checks

    return validationSuccess();
  }

  /**
   * Check weapon requirement
   */
  public checkWeaponRequirement(attacker: CreatureObject, command: CombatCommand): boolean {
    // If no weapon requirement, any weapon is fine
    if (command.requiredWeaponType.length === 0) {
      return true;
    }

    // Check if any required type matches
    return command.requiredWeaponType.some(
      (reqType) =>
        reqType === WeaponType.Any || reqType === attacker.equippedWeaponType
    );
  }

  /**
   * Check posture requirement
   */
  public checkPostureRequirement(attacker: CreatureObject, command: CombatCommand): boolean {
    // If no stance requirement, check if in a valid combat posture
    if (command.requiredStance.length === 0) {
      return isValidCombatPosture(attacker.posture);
    }

    // Check if current posture is in required list
    return command.requiredStance.includes(attacker.posture);
  }

  /**
   * Check skill requirement
   */
  public checkSkillRequirement(attacker: CreatureObject, command: CombatCommand): boolean {
    // If no skill required, pass
    if (!command.requiredSkill) {
      return true;
    }

    // Check if player has the skill at required level
    const skillLevel = attacker.skills.get(command.requiredSkill) ?? 0;
    return skillLevel >= command.requiredSkillLevel;
  }

  /**
   * Check cooldown
   */
  public checkCooldown(attacker: CreatureObject, command: CombatCommand): ValidationResult {
    const remaining = this.cooldownChecker(attacker.objectId, command.commandCrc);

    if (remaining > 0) {
      return validationFailure(
        ValidationErrorCode.OnCooldown,
        `This ability is on cooldown for ${(remaining / 1000).toFixed(1)} more seconds`,
        { cooldownRemaining: remaining }
      );
    }

    return validationSuccess();
  }

  /**
   * Check range between attacker and target
   */
  public checkRange(
    attacker: CreatureObject,
    target: CreatureObject,
    command: CombatCommand
  ): ValidationResult {
    const dx = target.position.x - attacker.position.x;
    const dy = target.position.y - attacker.position.y;
    const dz = target.position.z - attacker.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > command.maxRange) {
      return validationFailure(
        ValidationErrorCode.OutOfRange,
        `Target is out of range (${distance.toFixed(1)}m, max ${command.maxRange}m)`
      );
    }

    if (distance < command.minRange) {
      return validationFailure(
        ValidationErrorCode.TooClose,
        `Target is too close (${distance.toFixed(1)}m, min ${command.minRange}m)`
      );
    }

    return validationSuccess();
  }

  /**
   * Check resource costs
   */
  public checkCost(attacker: CreatureObject, command: CombatCommand): ValidationResult {
    if (command.healthCost > 0 && attacker.health < command.healthCost) {
      return validationFailure(
        ValidationErrorCode.InsufficientHealth,
        `Not enough health (need ${command.healthCost}, have ${attacker.health})`,
        { missingResource: 'health' }
      );
    }

    if (command.actionCost > 0 && attacker.action < command.actionCost) {
      return validationFailure(
        ValidationErrorCode.InsufficientAction,
        `Not enough action (need ${command.actionCost}, have ${attacker.action})`,
        { missingResource: 'action' }
      );
    }

    if (command.mindCost > 0 && attacker.mind < command.mindCost) {
      return validationFailure(
        ValidationErrorCode.InsufficientMind,
        `Not enough mind (need ${command.mindCost}, have ${attacker.mind})`,
        { missingResource: 'mind' }
      );
    }

    if (command.forceCost > 0 && attacker.forcePower < command.forceCost) {
      return validationFailure(
        ValidationErrorCode.InsufficientForce,
        `Not enough force power (need ${command.forceCost}, have ${attacker.forcePower})`,
        { missingResource: 'force' }
      );
    }

    return validationSuccess();
  }

  /**
   * Get a command by CRC
   */
  public getCommand(crc: number): CombatCommand | undefined {
    return this.commandRegistry.getByCrc(crc);
  }

  /**
   * Get a command by name
   */
  public getCommandByName(name: string): CombatCommand | undefined {
    return this.commandRegistry.getByName(name);
  }
}

/**
 * Create a combat command parser
 */
export function createCombatCommandParser(
  registry: CommandRegistry,
  cooldownChecker: (attackerId: bigint, commandCrc: number) => number,
  gcdChecker: (attackerId: bigint) => number
): CombatCommandParser {
  return new CombatCommandParser(registry, cooldownChecker, gcdChecker);
}
