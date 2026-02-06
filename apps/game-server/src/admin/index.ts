/**
 * Admin Command System
 * GM/Admin command system for Star Wars Galaxies server administration
 *
 * This module provides a complete command system for server moderation
 * and administration, including:
 * - Player management (teleport, kick, ban, heal, buff)
 * - Object manipulation (spawn, destroy, move, give items)
 * - Server administration (broadcast, shutdown, reload, stats)
 * - Full audit logging of all commands
 *
 * @example
 * ```typescript
 * import {
 *   createCommandRegistry,
 *   registerPlayerCommands,
 *   registerObjectCommands,
 *   registerServerCommands,
 *   AdminLevel,
 * } from './admin/index.js';
 *
 * // Create registry
 * const registry = createCommandRegistry();
 *
 * // Register command handlers
 * registerPlayerCommands(registry, playerHandlers);
 * registerObjectCommands(registry, objectHandlers);
 * registerServerCommands(registry, serverHandlers);
 *
 * // Execute a command
 * const result = await registry.executeCommand('/teleport 100 0 200', {
 *   objectId: playerId,
 *   name: 'PlayerName',
 *   adminLevel: AdminLevel.CSR,
 * });
 * ```
 */

// Core types and enums
export {
  AdminLevel,
  CommandCategory,
  TargetType,
  type CommandResult,
  type CommandContext,
  type CommandHandler,
  type CommandDefinition,
  type ResolvedTarget,
  type CommandLogEntry,
  successResult,
  errorResult,
  hasAdminLevel,
  getAdminLevelName,
  getCategoryName,
} from './command-types.js';

// Command parser
export {
  CommandParser,
  createCommandParser,
  type ParsedCommand,
  type PlayerLookupFn as ParserPlayerLookupFn,
  type CommandParserOptions,
} from './command-parser.js';

// Command registry
export {
  CommandRegistry,
  createCommandRegistry,
  getCommandRegistry,
  setCommandRegistry,
  type CommandRegistryOptions,
  type PlayerInfo,
  type AdminLevelLookupFn,
} from './command-registry.js';

// Command logger
export {
  CommandLogger,
  createCommandLogger,
  type CommandLogData,
  type LogPersistenceProvider,
  type LogQueryFilters,
  type CommandLoggerOptions,
} from './command-logger.js';

// Player commands
export {
  createPlayerCommands,
  registerPlayerCommands,
  type PlayerCommandHandlerOptions,
  type PlayerLookupFn,
  type PlayerTeleportFn,
  type PlayerKickFn,
  type PlayerBanFn,
  type PlayerUnbanFn,
  type SetPlayerStatFn,
  type HealPlayerFn,
  type ApplyBuffFn,
} from './commands/player-commands.js';

// Object commands
export {
  createObjectCommands,
  registerObjectCommands,
  type ObjectCommandHandlerOptions,
  type SpawnedObjectInfo,
  type SpawnObjectFn,
  type DestroyObjectFn,
  type GiveItemFn,
  type MoveObjectFn,
  type RotateObjectFn,
  type SetObjectNameFn,
  type GetPlayerPositionFn,
  type PlayerLookupFn as ObjectPlayerLookupFn,
} from './commands/object-commands.js';

// Server commands
export {
  createServerCommands,
  registerServerCommands,
  type ServerCommandHandlerOptions,
  type OnlinePlayerInfo,
  type ZoneInfo,
  type ServerStats,
  type BroadcastMessageFn,
  type ScheduleShutdownFn,
  type CancelShutdownFn,
  type ReloadConfigFn,
  type GetServerStatsFn,
  type GetOnlinePlayersFn,
  type GetZoneInfoFn,
} from './commands/server-commands.js';
