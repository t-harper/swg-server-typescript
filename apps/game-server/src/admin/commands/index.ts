/**
 * Admin Commands
 * Re-exports all command modules for convenient importing
 */

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
} from './player-commands.js';

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
} from './object-commands.js';

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
} from './server-commands.js';
