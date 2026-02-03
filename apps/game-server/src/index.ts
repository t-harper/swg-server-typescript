/**
 * @swg/game-server
 * Main game server for SWG (port 44463)
 */

// Export server components for programmatic use
export { createServer, type GameServer } from './server.js';
export {
  MovementHandler,
  createMovementHandler,
  type GameSession,
  type PlayerObject,
} from './handlers/movement-handler.js';

// Export services
export {
  ZoneService,
  createZoneService,
  type ZoneState,
  type PlayerZoneState,
  type ZoneServiceOptions,
  SpawnManager,
  createSpawnManager,
  type SpawnLocation,
  type SpawnEntry,
  type SpawnTable,
  type ActiveSpawn,
  type SpawnConfig,
  type SpawnManagerOptions,
} from './services/index.js';

// Main entry point when run directly
import { createServer } from './server.js';
import { loadConfigFromEnv, parseConfig } from '@swg/config';

async function main(): Promise<void> {
  console.log('Starting SWG Game Server...');

  const config = parseConfig({
    ...loadConfigFromEnv(),
    gameServer: {
      port: parseInt(process.env['GAME_PORT'] ?? '44463', 10),
      bindAddress: process.env['GAME_BIND'] ?? '0.0.0.0',
    },
  });

  const server = await createServer(config);
  await server.start();

  console.log(
    `Game Server listening on ${config.gameServer?.bindAddress}:${config.gameServer?.port}`
  );

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('Shutting down Game Server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

// Only run main if this is the entry point
const isMainModule =
  process.argv[1]?.endsWith('index.js') ||
  process.argv[1]?.endsWith('index.ts') ||
  process.argv[1]?.includes('game-server');

if (isMainModule) {
  void main().catch((error: unknown) => {
    console.error('Fatal error starting Game Server:', error);
    process.exit(1);
  });
}
