/**
 * Player Commands
 * GM commands for player management including teleportation,
 * moderation, and stat manipulation
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  type CommandDefinition,
  type CommandContext,
  type CommandResult,
  AdminLevel,
  CommandCategory,
  successResult,
  errorResult,
} from '../command-types.js';

/**
 * Player lookup function type
 */
export type PlayerLookupFn = (name: string) => Promise<{
  objectId: ObjectId;
  name: string;
  position: Vector3;
  zoneId: string;
} | undefined>;

/**
 * Player teleport function type
 */
export type PlayerTeleportFn = (
  playerId: ObjectId,
  x: number,
  y: number,
  z: number,
  planet?: string
) => Promise<boolean>;

/**
 * Player kick function type
 */
export type PlayerKickFn = (
  playerId: ObjectId,
  reason: string,
  kickedBy: ObjectId
) => Promise<boolean>;

/**
 * Player ban function type
 */
export type PlayerBanFn = (
  playerId: ObjectId,
  durationMs: number,
  reason: string,
  bannedBy: ObjectId
) => Promise<boolean>;

/**
 * Player unban function type
 */
export type PlayerUnbanFn = (playerName: string) => Promise<boolean>;

/**
 * Set player stat function type
 */
export type SetPlayerStatFn = (
  playerId: ObjectId,
  stat: string,
  value: number
) => Promise<boolean>;

/**
 * Heal player function type
 */
export type HealPlayerFn = (playerId: ObjectId) => Promise<boolean>;

/**
 * Apply buff function type
 */
export type ApplyBuffFn = (
  playerId: ObjectId,
  buffName: string
) => Promise<boolean>;

/**
 * Options for player command handlers
 */
export interface PlayerCommandHandlerOptions {
  /** Function to look up players by name */
  playerLookup: PlayerLookupFn;
  /** Function to teleport players */
  teleportPlayer: PlayerTeleportFn;
  /** Function to kick players */
  kickPlayer: PlayerKickFn;
  /** Function to ban players */
  banPlayer: PlayerBanFn;
  /** Function to unban players */
  unbanPlayer: PlayerUnbanFn;
  /** Function to set player stats */
  setPlayerStat: SetPlayerStatFn;
  /** Function to heal players */
  healPlayer: HealPlayerFn;
  /** Function to apply buffs */
  applyBuff: ApplyBuffFn;
}

/**
 * Valid player stats for the setstat command
 */
const VALID_STATS = [
  'health',
  'action',
  'mind',
  'healthMax',
  'actionMax',
  'mindMax',
  'strength',
  'constitution',
  'stamina',
  'quickness',
  'focus',
  'willpower',
  'level',
  'credits',
  'bankCredits',
];

/**
 * Known planet names for teleportation
 */
const VALID_PLANETS = [
  'corellia',
  'dantooine',
  'dathomir',
  'endor',
  'kashyyyk',
  'lok',
  'naboo',
  'rori',
  'talus',
  'tatooine',
  'yavin4',
  'mustafar',
];

/**
 * Create player command definitions
 */
export function createPlayerCommands(
  handlers: PlayerCommandHandlerOptions
): CommandDefinition[] {
  const commands: CommandDefinition[] = [];

  // /teleport command
  commands.push({
    name: 'teleport',
    aliases: ['tp', 'goto', 'warp'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.CSR,
    usage: '/teleport [player] <x> <y> <z> [planet]',
    description:
      'Teleport yourself or another player to coordinates. Planet is optional if same zone.',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 3) {
        return errorResult('Usage: /teleport [player] <x> <y> <z> [planet]');
      }

      let targetId = executorId;
      let coordStart = 0;

      // Check if first arg is a player name
      const firstArg = args[0]!;
      if (firstArg.startsWith('@') || isNaN(parseFloat(firstArg))) {
        // First arg is a target specifier or player name
        if (firstArg === '@self') {
          targetId = executorId;
        } else if (firstArg === '@target') {
          if (!context.targetId) {
            return errorResult('No target selected');
          }
          targetId = context.targetId;
        } else {
          const player = await handlers.playerLookup(firstArg);
          if (!player) {
            return errorResult(`Player '${firstArg}' not found`);
          }
          targetId = player.objectId;
        }
        coordStart = 1;
      }

      // Need at least 3 more args for coordinates
      if (args.length < coordStart + 3) {
        return errorResult('Must specify x, y, and z coordinates');
      }

      const x = parseFloat(args[coordStart]!);
      const y = parseFloat(args[coordStart + 1]!);
      const z = parseFloat(args[coordStart + 2]!);

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        return errorResult('Invalid coordinates');
      }

      // Check coordinate bounds
      const MAX_COORD = 16384;
      if (Math.abs(x) > MAX_COORD || Math.abs(z) > MAX_COORD) {
        return errorResult(`Coordinates out of bounds (max: +/-${MAX_COORD})`);
      }

      // Optional planet
      let planet: string | undefined;
      if (args.length > coordStart + 3) {
        planet = args[coordStart + 3]!.toLowerCase();
        if (!VALID_PLANETS.includes(planet)) {
          return errorResult(
            `Invalid planet '${planet}'. Valid planets: ${VALID_PLANETS.join(', ')}`
          );
        }
      }

      const success = await handlers.teleportPlayer(targetId, x, y, z, planet);

      if (success) {
        const planetStr = planet ? ` on ${planet}` : '';
        return successResult(
          `Teleported to (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})${planetStr}`
        );
      }

      return errorResult('Failed to teleport');
    },
  });

  // /kick command
  commands.push({
    name: 'kick',
    aliases: ['boot'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.CSR,
    usage: '/kick <player> [reason]',
    description: 'Disconnect a player from the server',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 1) {
        return errorResult('Usage: /kick <player> [reason]');
      }

      const targetName = args[0]!;
      const reason = args.slice(1).join(' ') || 'Kicked by GM';

      let targetId: ObjectId;
      if (targetName === '@target') {
        if (!context.targetId) {
          return errorResult('No target selected');
        }
        targetId = context.targetId;
      } else {
        const player = await handlers.playerLookup(targetName);
        if (!player) {
          return errorResult(`Player '${targetName}' not found`);
        }
        targetId = player.objectId;
      }

      const success = await handlers.kickPlayer(targetId, reason, executorId);

      if (success) {
        return successResult(`Kicked player: ${reason}`);
      }

      return errorResult('Failed to kick player');
    },
  });

  // /ban command
  commands.push({
    name: 'ban',
    aliases: ['tempban'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.LEAD_CSR,
    usage: '/ban <player> <duration> [reason]',
    description:
      'Ban a player for a specified duration (e.g., 30m, 2h, 1d, permanent)',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 2) {
        return errorResult('Usage: /ban <player> <duration> [reason]');
      }

      const targetName = args[0]!;
      const durationStr = args[1]!.toLowerCase();
      const reason = args.slice(2).join(' ') || 'Banned by GM';

      // Parse duration
      let durationMs: number;
      if (durationStr === 'permanent' || durationStr === 'perm') {
        durationMs = -1; // -1 indicates permanent
      } else {
        const match = durationStr.match(/^(\d+)(m|h|d)$/);
        if (!match) {
          return errorResult(
            'Invalid duration. Use format: 30m, 2h, 1d, or permanent'
          );
        }
        const amount = parseInt(match[1]!, 10);
        const unit = match[2]!;
        switch (unit) {
          case 'm':
            durationMs = amount * 60 * 1000;
            break;
          case 'h':
            durationMs = amount * 60 * 60 * 1000;
            break;
          case 'd':
            durationMs = amount * 24 * 60 * 60 * 1000;
            break;
          default:
            return errorResult('Invalid duration unit');
        }
      }

      const player = await handlers.playerLookup(targetName);
      if (!player) {
        return errorResult(`Player '${targetName}' not found`);
      }

      const success = await handlers.banPlayer(
        player.objectId,
        durationMs,
        reason,
        executorId
      );

      if (success) {
        const durationText =
          durationMs === -1 ? 'permanently' : `for ${durationStr}`;
        return successResult(`Banned ${targetName} ${durationText}: ${reason}`);
      }

      return errorResult('Failed to ban player');
    },
  });

  // /unban command
  commands.push({
    name: 'unban',
    aliases: ['pardon'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.LEAD_CSR,
    usage: '/unban <player>',
    description: 'Remove a ban from a player',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args } = context;

      if (args.length < 1) {
        return errorResult('Usage: /unban <player>');
      }

      const targetName = args[0]!;
      const success = await handlers.unbanPlayer(targetName);

      if (success) {
        return successResult(`Unbanned ${targetName}`);
      }

      return errorResult(`Failed to unban ${targetName} (may not be banned)`);
    },
  });

  // /setstat command
  commands.push({
    name: 'setstat',
    aliases: ['stat', 'setattr'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.QA,
    usage: '/setstat [player] <stat> <value>',
    description: `Set a player stat. Stats: ${VALID_STATS.join(', ')}`,
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 2) {
        return errorResult('Usage: /setstat [player] <stat> <value>');
      }

      let targetId = executorId;
      let statIndex = 0;

      // Check if first arg is a player name
      if (args.length >= 3 && !VALID_STATS.includes(args[0]!.toLowerCase())) {
        const targetName = args[0]!;
        if (targetName === '@self') {
          targetId = executorId;
        } else if (targetName === '@target') {
          if (!context.targetId) {
            return errorResult('No target selected');
          }
          targetId = context.targetId;
        } else {
          const player = await handlers.playerLookup(targetName);
          if (!player) {
            return errorResult(`Player '${targetName}' not found`);
          }
          targetId = player.objectId;
        }
        statIndex = 1;
      }

      const stat = args[statIndex]!.toLowerCase();
      const valueStr = args[statIndex + 1]!;

      if (!VALID_STATS.includes(stat)) {
        return errorResult(
          `Invalid stat '${stat}'. Valid stats: ${VALID_STATS.join(', ')}`
        );
      }

      const value = parseInt(valueStr, 10);
      if (isNaN(value)) {
        return errorResult(`Invalid value '${valueStr}'`);
      }

      const success = await handlers.setPlayerStat(targetId, stat, value);

      if (success) {
        return successResult(`Set ${stat} to ${value}`);
      }

      return errorResult('Failed to set stat');
    },
  });

  // /heal command
  commands.push({
    name: 'heal',
    aliases: ['fullheal', 'restore'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.CSR,
    usage: '/heal [player]',
    description: 'Fully heal a player (restores all HAM pools)',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      let targetId = executorId;

      if (args.length >= 1) {
        const targetName = args[0]!;
        if (targetName === '@self') {
          targetId = executorId;
        } else if (targetName === '@target') {
          if (!context.targetId) {
            return errorResult('No target selected');
          }
          targetId = context.targetId;
        } else {
          const player = await handlers.playerLookup(targetName);
          if (!player) {
            return errorResult(`Player '${targetName}' not found`);
          }
          targetId = player.objectId;
        }
      }

      const success = await handlers.healPlayer(targetId);

      if (success) {
        return successResult('Player healed');
      }

      return errorResult('Failed to heal player');
    },
  });

  // /buff command
  commands.push({
    name: 'buff',
    aliases: ['applybuff', 'addbuff'],
    category: CommandCategory.PLAYER,
    minLevel: AdminLevel.QA,
    usage: '/buff [player] <buff_name>',
    description: 'Apply a buff to a player',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorId } = context;

      if (args.length < 1) {
        return errorResult('Usage: /buff [player] <buff_name>');
      }

      let targetId = executorId;
      let buffIndex = 0;

      // Check if first arg might be a player name (not a known buff)
      if (args.length >= 2) {
        const firstArg = args[0]!;
        if (firstArg === '@self') {
          targetId = executorId;
          buffIndex = 1;
        } else if (firstArg === '@target') {
          if (!context.targetId) {
            return errorResult('No target selected');
          }
          targetId = context.targetId;
          buffIndex = 1;
        } else {
          // Try to look up as player
          const player = await handlers.playerLookup(firstArg);
          if (player) {
            targetId = player.objectId;
            buffIndex = 1;
          }
        }
      }

      const buffName = args[buffIndex];
      if (!buffName) {
        return errorResult('Must specify a buff name');
      }

      const success = await handlers.applyBuff(targetId, buffName);

      if (success) {
        return successResult(`Applied buff: ${buffName}`);
      }

      return errorResult(`Failed to apply buff '${buffName}'`);
    },
  });

  return commands;
}

/**
 * Register all player commands with a registry
 */
export function registerPlayerCommands(
  registry: { registerCommand: (def: CommandDefinition) => void },
  handlers: PlayerCommandHandlerOptions
): void {
  const commands = createPlayerCommands(handlers);
  for (const command of commands) {
    registry.registerCommand(command);
  }
}
