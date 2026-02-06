/**
 * Admin Command Types
 * Type definitions for the GM/admin command system
 */

import type { ObjectId } from '@swg/shared-types';

/**
 * Admin privilege levels
 * Higher levels include all permissions from lower levels
 */
export enum AdminLevel {
  /** Regular player - no admin privileges */
  PLAYER = 0,
  /** Customer Service Representative - basic GM commands */
  CSR = 1,
  /** Lead CSR - additional moderation powers */
  LEAD_CSR = 2,
  /** Quality Assurance - testing and debug commands */
  QA = 3,
  /** Developer - full access to debug and object commands */
  DEVELOPER = 4,
  /** Administrator - unrestricted server access */
  ADMIN = 5,
}

/**
 * Command categories for organization and help display
 */
export enum CommandCategory {
  /** Player management commands (teleport, kick, ban, etc.) */
  PLAYER = 'player',
  /** Object manipulation commands (spawn, destroy, modify, etc.) */
  OBJECT = 'object',
  /** World/zone management commands */
  WORLD = 'world',
  /** Server administration commands */
  SERVER = 'server',
  /** Debug and testing commands */
  DEBUG = 'debug',
}

/**
 * Result of executing a command
 */
export interface CommandResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Human-readable message describing the result */
  message: string;
  /** Optional data returned by the command */
  data?: unknown;
}

/**
 * Context passed to command handlers
 */
export interface CommandContext {
  /** Object ID of the player executing the command */
  executorId: ObjectId;
  /** Object ID of the current target (if any) */
  targetId?: ObjectId | undefined;
  /** Parsed command arguments */
  args: string[];
  /** Admin level of the executor */
  adminLevel: AdminLevel;
  /** Raw command string as entered */
  rawCommand: string;
  /** Character name of the executor */
  executorName: string;
  /** Current zone/scene ID of the executor */
  zoneId?: string | undefined;
}

/**
 * Command handler function type
 */
export type CommandHandler = (context: CommandContext) => Promise<CommandResult>;

/**
 * Definition of a single command
 */
export interface CommandDefinition {
  /** Primary command name (without leading slash) */
  name: string;
  /** Alternative names/aliases for the command */
  aliases: string[];
  /** Category for organization */
  category: CommandCategory;
  /** Minimum admin level required to use this command */
  minLevel: AdminLevel;
  /** Usage string showing syntax */
  usage: string;
  /** Detailed description of what the command does */
  description: string;
  /** Function that handles command execution */
  handler: CommandHandler;
}

/**
 * Target specifier types for command parsing
 */
export enum TargetType {
  /** @self - targets the command executor */
  SELF = 'self',
  /** @target - targets the executor's current selection */
  TARGET = 'target',
  /** Player name - targets a specific player by name */
  PLAYER_NAME = 'player_name',
  /** Object ID - targets a specific object by ID */
  OBJECT_ID = 'object_id',
}

/**
 * Resolved target information
 */
export interface ResolvedTarget {
  /** Type of target resolution used */
  type: TargetType;
  /** Resolved object ID of the target */
  objectId?: ObjectId;
  /** Name of the target (if applicable) */
  name?: string;
  /** Whether the target was successfully resolved */
  resolved: boolean;
  /** Error message if resolution failed */
  error?: string;
}

/**
 * Command log entry for audit trail
 */
export interface CommandLogEntry {
  /** Unique log entry ID */
  id: bigint;
  /** Timestamp of command execution */
  timestamp: Date;
  /** Object ID of command executor */
  executorId: ObjectId;
  /** Character name of executor */
  executorName: string;
  /** Admin level at time of execution */
  adminLevel: AdminLevel;
  /** Command name */
  command: string;
  /** Command arguments */
  args: string[];
  /** Target object ID (if applicable) */
  targetId?: ObjectId | undefined;
  /** Whether command succeeded */
  success: boolean;
  /** Result message */
  resultMessage: string;
  /** Zone where command was executed */
  zoneId?: string | undefined;
}

/**
 * Create a successful command result
 */
export function successResult(message: string, data?: unknown): CommandResult {
  return { success: true, message, data };
}

/**
 * Create a failed command result
 */
export function errorResult(message: string): CommandResult {
  return { success: false, message };
}

/**
 * Check if an admin level meets the required level
 */
export function hasAdminLevel(current: AdminLevel, required: AdminLevel): boolean {
  return current >= required;
}

/**
 * Get the display name for an admin level
 */
export function getAdminLevelName(level: AdminLevel): string {
  switch (level) {
    case AdminLevel.PLAYER:
      return 'Player';
    case AdminLevel.CSR:
      return 'CSR';
    case AdminLevel.LEAD_CSR:
      return 'Lead CSR';
    case AdminLevel.QA:
      return 'QA';
    case AdminLevel.DEVELOPER:
      return 'Developer';
    case AdminLevel.ADMIN:
      return 'Administrator';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for a command category
 */
export function getCategoryName(category: CommandCategory): string {
  switch (category) {
    case CommandCategory.PLAYER:
      return 'Player Management';
    case CommandCategory.OBJECT:
      return 'Object Manipulation';
    case CommandCategory.WORLD:
      return 'World Management';
    case CommandCategory.SERVER:
      return 'Server Administration';
    case CommandCategory.DEBUG:
      return 'Debug & Testing';
    default:
      return 'Unknown';
  }
}
