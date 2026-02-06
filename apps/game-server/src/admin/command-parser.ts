/**
 * Command Parser
 * Parses GM command strings into structured data with support for
 * quoted arguments and target resolution
 */

import type { ObjectId } from '@swg/shared-types';
import {
  type CommandContext,
  type ResolvedTarget,
  TargetType,
  AdminLevel,
} from './command-types.js';

/**
 * Result of parsing a command string
 */
export interface ParsedCommand {
  /** Command name (without leading slash) */
  name: string;
  /** Parsed arguments */
  args: string[];
  /** Whether parsing was successful */
  valid: boolean;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Player lookup function type
 * Used to resolve player names to object IDs
 */
export type PlayerLookupFn = (name: string) => Promise<ObjectId | undefined>;

/**
 * Options for the command parser
 */
export interface CommandParserOptions {
  /** Function to look up players by name */
  playerLookup?: PlayerLookupFn;
  /** Command prefix (default: '/') */
  commandPrefix?: string;
}

/**
 * Command Parser
 * Handles parsing of GM command strings and target resolution
 */
export class CommandParser {
  private readonly playerLookup?: PlayerLookupFn | undefined;
  private readonly commandPrefix: string;

  constructor(options: CommandParserOptions = {}) {
    this.playerLookup = options.playerLookup;
    this.commandPrefix = options.commandPrefix ?? '/';
  }

  /**
   * Set the player lookup function
   */
  setPlayerLookup(lookup: PlayerLookupFn): void {
    (this as unknown as { playerLookup: PlayerLookupFn | undefined }).playerLookup = lookup;
  }

  /**
   * Parse a command string into structured data
   * Handles quoted arguments and command prefix
   *
   * @example
   * parseCommand('/teleport "John Doe" 100 200 300')
   * // Returns: { name: 'teleport', args: ['John Doe', '100', '200', '300'], valid: true }
   */
  parseCommand(input: string): ParsedCommand {
    // Trim whitespace
    const trimmed = input.trim();

    // Check for command prefix
    if (!trimmed.startsWith(this.commandPrefix)) {
      return {
        name: '',
        args: [],
        valid: false,
        error: `Command must start with '${this.commandPrefix}'`,
      };
    }

    // Remove prefix
    const withoutPrefix = trimmed.slice(this.commandPrefix.length);

    if (withoutPrefix.length === 0) {
      return {
        name: '',
        args: [],
        valid: false,
        error: 'Empty command',
      };
    }

    // Parse into tokens (command name and arguments)
    const tokens = this.tokenize(withoutPrefix);

    if (tokens.length === 0) {
      return {
        name: '',
        args: [],
        valid: false,
        error: 'Failed to parse command',
      };
    }

    const [name, ...args] = tokens;

    return {
      name: name!.toLowerCase(),
      args,
      valid: true,
    };
  }

  /**
   * Tokenize a string with support for quoted arguments
   * Handles both single and double quotes
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (inQuote) {
        if (char === quoteChar) {
          // End of quoted section
          inQuote = false;
          quoteChar = '';
        } else {
          current += char;
        }
      } else {
        if (char === '"' || char === "'") {
          // Start of quoted section
          inQuote = true;
          quoteChar = char;
        } else if (char === ' ' || char === '\t') {
          // Whitespace - end current token
          if (current.length > 0) {
            tokens.push(current);
            current = '';
          }
        } else {
          current += char;
        }
      }
    }

    // Don't forget the last token
    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Resolve a target specifier to an object ID
   *
   * Supports:
   * - @self - the command executor
   * - @target - the executor's current target
   * - Player name - looks up by character name
   * - Numeric ID - direct object ID
   */
  async resolveTarget(
    specifier: string,
    executorId: ObjectId,
    currentTargetId?: ObjectId
  ): Promise<ResolvedTarget> {
    const lower = specifier.toLowerCase();

    // @self - target the executor
    if (lower === '@self') {
      return {
        type: TargetType.SELF,
        objectId: executorId,
        resolved: true,
      };
    }

    // @target - target the current selection
    if (lower === '@target') {
      if (currentTargetId === undefined) {
        return {
          type: TargetType.TARGET,
          resolved: false,
          error: 'No target selected',
        };
      }
      return {
        type: TargetType.TARGET,
        objectId: currentTargetId,
        resolved: true,
      };
    }

    // Try to parse as numeric object ID
    if (/^\d+$/.test(specifier)) {
      try {
        const objectId = BigInt(specifier);
        return {
          type: TargetType.OBJECT_ID,
          objectId,
          resolved: true,
        };
      } catch {
        return {
          type: TargetType.OBJECT_ID,
          resolved: false,
          error: 'Invalid object ID format',
        };
      }
    }

    // Try to look up as player name
    if (this.playerLookup) {
      const playerId = await this.playerLookup(specifier);
      if (playerId !== undefined) {
        return {
          type: TargetType.PLAYER_NAME,
          objectId: playerId,
          name: specifier,
          resolved: true,
        };
      }
    }

    return {
      type: TargetType.PLAYER_NAME,
      name: specifier,
      resolved: false,
      error: `Player '${specifier}' not found`,
    };
  }

  /**
   * Validate command arguments against expected parameter count
   */
  validateArgs(
    args: string[],
    minRequired: number,
    maxAllowed: number = Infinity
  ): { valid: boolean; error?: string } {
    if (args.length < minRequired) {
      return {
        valid: false,
        error: `Expected at least ${minRequired} argument(s), got ${args.length}`,
      };
    }

    if (args.length > maxAllowed) {
      return {
        valid: false,
        error: `Expected at most ${maxAllowed} argument(s), got ${args.length}`,
      };
    }

    return { valid: true };
  }

  /**
   * Parse a coordinate value (x, y, or z)
   */
  parseCoordinate(value: string): { value: number; valid: boolean; error?: string } {
    const num = parseFloat(value);

    if (isNaN(num)) {
      return {
        value: 0,
        valid: false,
        error: `Invalid coordinate: '${value}'`,
      };
    }

    // SWG coordinate limits (approximate)
    const MAX_COORD = 16384;
    if (Math.abs(num) > MAX_COORD) {
      return {
        value: 0,
        valid: false,
        error: `Coordinate out of range: ${num} (max: +/-${MAX_COORD})`,
      };
    }

    return { value: num, valid: true };
  }

  /**
   * Parse a duration string into milliseconds
   * Supports: 30s, 5m, 2h, 1d, or plain seconds
   */
  parseDuration(value: string): { milliseconds: number; valid: boolean; error?: string } {
    const lower = value.toLowerCase();

    // Check for time unit suffix
    const match = lower.match(/^(\d+(?:\.\d+)?)(s|m|h|d)?$/);
    if (!match) {
      return {
        milliseconds: 0,
        valid: false,
        error: `Invalid duration format: '${value}'`,
      };
    }

    const amount = parseFloat(match[1]!);
    const unit = match[2] ?? 's';

    let multiplier: number;
    switch (unit) {
      case 's':
        multiplier = 1000;
        break;
      case 'm':
        multiplier = 60 * 1000;
        break;
      case 'h':
        multiplier = 60 * 60 * 1000;
        break;
      case 'd':
        multiplier = 24 * 60 * 60 * 1000;
        break;
      default:
        multiplier = 1000;
    }

    return {
      milliseconds: Math.floor(amount * multiplier),
      valid: true,
    };
  }

  /**
   * Parse an integer value with optional min/max bounds
   */
  parseInt(
    value: string,
    min?: number,
    max?: number
  ): { value: number; valid: boolean; error?: string } {
    const num = parseInt(value, 10);

    if (isNaN(num)) {
      return {
        value: 0,
        valid: false,
        error: `Invalid integer: '${value}'`,
      };
    }

    if (min !== undefined && num < min) {
      return {
        value: 0,
        valid: false,
        error: `Value ${num} is below minimum ${min}`,
      };
    }

    if (max !== undefined && num > max) {
      return {
        value: 0,
        valid: false,
        error: `Value ${num} is above maximum ${max}`,
      };
    }

    return { value: num, valid: true };
  }

  /**
   * Build a command context from parsed input
   */
  buildContext(
    parsed: ParsedCommand,
    executorId: ObjectId,
    executorName: string,
    adminLevel: AdminLevel,
    targetId?: ObjectId,
    zoneId?: string,
    rawCommand?: string
  ): CommandContext {
    return {
      executorId,
      executorName,
      targetId,
      args: parsed.args,
      adminLevel,
      rawCommand: rawCommand ?? `${this.commandPrefix}${parsed.name} ${parsed.args.join(' ')}`,
      zoneId,
    };
  }
}

/**
 * Create a new CommandParser instance
 */
export function createCommandParser(options?: CommandParserOptions): CommandParser {
  return new CommandParser(options);
}
