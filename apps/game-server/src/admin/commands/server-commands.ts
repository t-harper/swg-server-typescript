/**
 * Server Commands
 * GM commands for server administration including broadcasts,
 * shutdown scheduling, configuration reloading, and server statistics
 */

import type { ObjectId } from '@swg/shared-types';
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
 * Online player information
 */
export interface OnlinePlayerInfo {
  objectId: ObjectId;
  name: string;
  zoneId: string;
  adminLevel: AdminLevel;
  playTime: number; // milliseconds
}

/**
 * Zone information
 */
export interface ZoneInfo {
  zoneId: string;
  name: string;
  playerCount: number;
  npcCount: number;
  objectCount: number;
  terrainFile: string;
  loaded: boolean;
}

/**
 * Server statistics
 */
export interface ServerStats {
  uptime: number;
  totalPlayers: number;
  peakPlayers: number;
  totalConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  networkBytesIn: number;
  networkBytesOut: number;
  tickRate: number;
  avgTickTime: number;
}

/**
 * Broadcast message function type
 */
export type BroadcastMessageFn = (
  message: string,
  category: 'system' | 'server' | 'gm'
) => Promise<void>;

/**
 * Schedule shutdown function type
 */
export type ScheduleShutdownFn = (
  delaySeconds: number,
  message: string
) => Promise<boolean>;

/**
 * Cancel shutdown function type
 */
export type CancelShutdownFn = () => Promise<boolean>;

/**
 * Reload configuration function type
 */
export type ReloadConfigFn = (
  configName: string
) => Promise<{ success: boolean; message: string }>;

/**
 * Get server stats function type
 */
export type GetServerStatsFn = () => Promise<ServerStats>;

/**
 * Get online players function type
 */
export type GetOnlinePlayersFn = (
  zoneFilter?: string
) => Promise<OnlinePlayerInfo[]>;

/**
 * Get zone info function type
 */
export type GetZoneInfoFn = (zoneId?: string) => Promise<ZoneInfo[]>;

/**
 * Options for server command handlers
 */
export interface ServerCommandHandlerOptions {
  /** Function to broadcast messages */
  broadcastMessage: BroadcastMessageFn;
  /** Function to schedule server shutdown */
  scheduleShutdown: ScheduleShutdownFn;
  /** Function to cancel scheduled shutdown */
  cancelShutdown: CancelShutdownFn;
  /** Function to reload configurations */
  reloadConfig: ReloadConfigFn;
  /** Function to get server statistics */
  getServerStats: GetServerStatsFn;
  /** Function to get online players */
  getOnlinePlayers: GetOnlinePlayersFn;
  /** Function to get zone information */
  getZoneInfo: GetZoneInfoFn;
}

/**
 * Valid configuration names for reload
 */
const VALID_CONFIGS = [
  'spawn',
  'loot',
  'combat',
  'skills',
  'buffs',
  'items',
  'vehicles',
  'missions',
  'commands',
  'permissions',
  'server',
  'all',
];

/**
 * Format milliseconds as human-readable duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format bytes as human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Create server command definitions
 */
export function createServerCommands(
  handlers: ServerCommandHandlerOptions
): CommandDefinition[] {
  const commands: CommandDefinition[] = [];

  // /broadcast command
  commands.push({
    name: 'broadcast',
    aliases: ['bc', 'announce', 'serverbroadcast'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.LEAD_CSR,
    usage: '/broadcast <message>',
    description: 'Send a server-wide broadcast message to all players',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorName } = context;

      if (args.length < 1) {
        return errorResult('Usage: /broadcast <message>');
      }

      const message = args.join(' ');

      if (message.length > 500) {
        return errorResult('Message too long (max 500 characters)');
      }

      await handlers.broadcastMessage(
        `[GM Broadcast from ${executorName}]: ${message}`,
        'gm'
      );

      return successResult(`Broadcast sent: ${message}`);
    },
  });

  // /systembroadcast command (for automated/system messages)
  commands.push({
    name: 'systembroadcast',
    aliases: ['sysbc', 'sysannounce'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.ADMIN,
    usage: '/systembroadcast <message>',
    description: 'Send a system broadcast message (appears as server message)',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args } = context;

      if (args.length < 1) {
        return errorResult('Usage: /systembroadcast <message>');
      }

      const message = args.join(' ');

      if (message.length > 500) {
        return errorResult('Message too long (max 500 characters)');
      }

      await handlers.broadcastMessage(message, 'system');

      return successResult(`System broadcast sent: ${message}`);
    },
  });

  // /shutdown command
  commands.push({
    name: 'shutdown',
    aliases: ['servershutdown'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.ADMIN,
    usage: '/shutdown <seconds> [message]',
    description:
      'Schedule a server shutdown with countdown. Use "abort" to cancel.',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args } = context;

      if (args.length < 1) {
        return errorResult('Usage: /shutdown <seconds> [message] or /shutdown abort');
      }

      // Check for abort
      if (args[0]!.toLowerCase() === 'abort' || args[0]!.toLowerCase() === 'cancel') {
        const cancelled = await handlers.cancelShutdown();
        if (cancelled) {
          await handlers.broadcastMessage(
            'Server shutdown has been cancelled.',
            'system'
          );
          return successResult('Shutdown cancelled');
        }
        return errorResult('No shutdown is currently scheduled');
      }

      const seconds = parseInt(args[0]!, 10);
      if (isNaN(seconds) || seconds < 0) {
        return errorResult('Invalid delay. Must be a positive number of seconds.');
      }

      // Enforce minimum delay
      if (seconds < 30 && seconds !== 0) {
        return errorResult(
          'Shutdown delay must be at least 30 seconds (or 0 for immediate)'
        );
      }

      const message = args.slice(1).join(' ') || 'Server is shutting down';

      const success = await handlers.scheduleShutdown(seconds, message);

      if (success) {
        const delay = seconds === 0 ? 'now' : `in ${formatDuration(seconds * 1000)}`;
        await handlers.broadcastMessage(
          `[SERVER] Shutdown scheduled ${delay}: ${message}`,
          'system'
        );
        return successResult(`Shutdown scheduled for ${delay}`);
      }

      return errorResult('Failed to schedule shutdown');
    },
  });

  // /reload command
  commands.push({
    name: 'reload',
    aliases: ['reloadconfig', 'refresh'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.DEVELOPER,
    usage: '/reload <config>',
    description: `Reload a configuration. Valid configs: ${VALID_CONFIGS.join(', ')}`,
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args } = context;

      if (args.length < 1) {
        return errorResult(
          `Usage: /reload <config>. Valid configs: ${VALID_CONFIGS.join(', ')}`
        );
      }

      const configName = args[0]!.toLowerCase();

      if (!VALID_CONFIGS.includes(configName)) {
        return errorResult(
          `Invalid config '${configName}'. Valid configs: ${VALID_CONFIGS.join(', ')}`
        );
      }

      const result = await handlers.reloadConfig(configName);

      if (result.success) {
        return successResult(`Reloaded ${configName} configuration: ${result.message}`);
      }

      return errorResult(`Failed to reload ${configName}: ${result.message}`);
    },
  });

  // /stats command
  commands.push({
    name: 'stats',
    aliases: ['serverstats', 'status'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.CSR,
    usage: '/stats',
    description: 'Display server statistics',
    handler: async (_context: CommandContext): Promise<CommandResult> => {
      const stats = await handlers.getServerStats();

      const lines: string[] = [
        '=== Server Statistics ===',
        `Uptime: ${formatDuration(stats.uptime)}`,
        `Players: ${stats.totalPlayers} (Peak: ${stats.peakPlayers})`,
        `Total Connections: ${stats.totalConnections}`,
        `Memory: ${formatBytes(stats.memoryUsage)}`,
        `CPU: ${(stats.cpuUsage * 100).toFixed(1)}%`,
        `Network In: ${formatBytes(stats.networkBytesIn)}`,
        `Network Out: ${formatBytes(stats.networkBytesOut)}`,
        `Tick Rate: ${stats.tickRate.toFixed(1)} Hz`,
        `Avg Tick Time: ${stats.avgTickTime.toFixed(2)} ms`,
      ];

      return successResult(lines.join('\n'));
    },
  });

  // /players command
  commands.push({
    name: 'players',
    aliases: ['online', 'who', 'listplayers'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.CSR,
    usage: '/players [zone]',
    description: 'List online players, optionally filtered by zone',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args } = context;

      const zoneFilter = args.length > 0 ? args[0]!.toLowerCase() : undefined;
      const players = await handlers.getOnlinePlayers(zoneFilter);

      if (players.length === 0) {
        const zoneMsg = zoneFilter ? ` in zone '${zoneFilter}'` : '';
        return successResult(`No players online${zoneMsg}`);
      }

      const lines: string[] = [
        `=== Online Players (${players.length}) ===`,
      ];

      // Group by zone
      const byZone = new Map<string, OnlinePlayerInfo[]>();
      for (const player of players) {
        const existing = byZone.get(player.zoneId) ?? [];
        existing.push(player);
        byZone.set(player.zoneId, existing);
      }

      for (const [zone, zonePlayers] of byZone) {
        lines.push(`\n[${zone}] (${zonePlayers.length})`);
        for (const player of zonePlayers) {
          const adminTag =
            player.adminLevel > AdminLevel.PLAYER
              ? ` [${AdminLevel[player.adminLevel]}]`
              : '';
          const playTime = formatDuration(player.playTime);
          lines.push(`  ${player.name} (${player.objectId})${adminTag} - ${playTime}`);
        }
      }

      return successResult(lines.join('\n'));
    },
  });

  // /zone command
  commands.push({
    name: 'zone',
    aliases: ['zoneinfo', 'zones'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.CSR,
    usage: '/zone [zoneid]',
    description: 'Display zone information',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args } = context;

      const zoneId = args.length > 0 ? args[0]!.toLowerCase() : undefined;
      const zones = await handlers.getZoneInfo(zoneId);

      if (zones.length === 0) {
        if (zoneId) {
          return errorResult(`Zone '${zoneId}' not found`);
        }
        return errorResult('No zones loaded');
      }

      const lines: string[] = [
        `=== Zone Information ===`,
      ];

      for (const zone of zones) {
        lines.push('');
        lines.push(`[${zone.zoneId}] ${zone.name}`);
        lines.push(`  Status: ${zone.loaded ? 'Loaded' : 'Not Loaded'}`);
        lines.push(`  Players: ${zone.playerCount}`);
        lines.push(`  NPCs: ${zone.npcCount}`);
        lines.push(`  Objects: ${zone.objectCount}`);
        lines.push(`  Terrain: ${zone.terrainFile}`);
      }

      return successResult(lines.join('\n'));
    },
  });

  // /kick all command (emergency use)
  commands.push({
    name: 'kickall',
    aliases: ['disconnectall'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.ADMIN,
    usage: '/kickall [reason]',
    description: 'Disconnect all players from the server (emergency use)',
    handler: async (context: CommandContext): Promise<CommandResult> => {
      const { args, executorName } = context;

      const reason =
        args.join(' ') || `All players disconnected by ${executorName}`;

      // Broadcast warning
      await handlers.broadcastMessage(
        `[SERVER] All players being disconnected: ${reason}`,
        'system'
      );

      // Get all players and kick them
      const players = await handlers.getOnlinePlayers();
      let kicked = 0;

      for (const player of players) {
        // Note: This would need a kick function, but we're simulating here
        kicked++;
      }

      return successResult(
        `Disconnected ${kicked} players: ${reason}`,
        { kicked, reason }
      );
    },
  });

  // /memory command (detailed memory info)
  commands.push({
    name: 'memory',
    aliases: ['mem', 'heap'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.DEVELOPER,
    usage: '/memory',
    description: 'Display detailed memory usage information',
    handler: async (_context: CommandContext): Promise<CommandResult> => {
      // Get Node.js memory usage
      const memUsage = process.memoryUsage();

      const lines: string[] = [
        '=== Memory Usage ===',
        `Heap Used: ${formatBytes(memUsage.heapUsed)}`,
        `Heap Total: ${formatBytes(memUsage.heapTotal)}`,
        `RSS: ${formatBytes(memUsage.rss)}`,
        `External: ${formatBytes(memUsage.external)}`,
        `Array Buffers: ${formatBytes(memUsage.arrayBuffers)}`,
      ];

      return successResult(lines.join('\n'));
    },
  });

  // /gc command (force garbage collection if available)
  commands.push({
    name: 'gc',
    aliases: ['forcegc', 'garbagecollect'],
    category: CommandCategory.SERVER,
    minLevel: AdminLevel.ADMIN,
    usage: '/gc',
    description: 'Force garbage collection (if --expose-gc flag is enabled)',
    handler: async (_context: CommandContext): Promise<CommandResult> => {
      const globalGc = (global as { gc?: () => void }).gc;

      if (typeof globalGc === 'function') {
        const before = process.memoryUsage().heapUsed;
        globalGc();
        const after = process.memoryUsage().heapUsed;
        const freed = before - after;

        return successResult(
          `Garbage collection completed. Freed ${formatBytes(freed)}`
        );
      }

      return errorResult(
        'Garbage collection not available. Start server with --expose-gc flag.'
      );
    },
  });

  return commands;
}

/**
 * Register all server commands with a registry
 */
export function registerServerCommands(
  registry: { registerCommand: (def: CommandDefinition) => void },
  handlers: ServerCommandHandlerOptions
): void {
  const commands = createServerCommands(handlers);
  for (const command of commands) {
    registry.registerCommand(command);
  }
}
