/**
 * Game Server Services
 * Service exports for game server functionality
 */

// Zone Service
export {
  ZoneService,
  createZoneService,
  type ZoneState,
  type PlayerZoneState,
  type ZoneServiceOptions,
  type SendCallback,
} from './zone-service.js';

// Spawn Manager
export {
  SpawnManager,
  createSpawnManager,
  type SpawnLocation,
  type SpawnEntry,
  type SpawnTable,
  type ActiveSpawn,
  type SpawnConfig,
  type SpawnManagerOptions,
} from './spawn-manager.js';
