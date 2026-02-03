/**
 * Game Server
 * Main server orchestration for the game world
 */

import type { ServerConfig } from '@swg/config';
import { initDb, CharacterRepository, ObjectRepository } from '@swg/database';
import { getRedisClient, SessionStore } from '@swg/redis';
import {
  SessionManager,
  type Session,
  DisconnectReason,
} from '@swg/protocol/soe';
import {
  MovementMessageOpcode,
  deserializeDataTransform,
  deserializeDataTransformWithParent,
  getMovementMessageOpcode,
} from '@swg/protocol/swg/messages/movement.js';
import {
  ZoneMessageOpcode,
  deserializeCmdSceneReady,
  isZoneMessageOpcode,
} from '@swg/protocol/swg/messages/zone-messages.js';

import {
  MovementHandler,
  createMovementHandler,
  type GameSession,
  type PlayerObject,
} from './handlers/movement-handler.js';
import {
  ZoneService,
  createZoneService,
  SpawnManager,
  createSpawnManager,
} from './services/index.js';

/**
 * Game Server instance interface
 */
export interface GameServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getConnectionCount(): number;
  getPlayerCount(): number;
  getZoneService(): ZoneService;
  getSpawnManager(): SpawnManager;
}

/**
 * Create a unique key for a client endpoint
 */
function getClientKey(address: string, port: number): string {
  return `${address}:${port}`;
}

/**
 * Create the Game Server
 * @param config - Server configuration
 * @returns GameServer instance
 */
export async function createServer(config: ServerConfig): Promise<GameServer> {
  // Initialize database
  const db = initDb(config.database);
  console.log('[GameServer] Database initialized');

  // Initialize Redis
  const redisClient = getRedisClient(config.redis);
  await redisClient.connect();
  console.log('[GameServer] Redis connected');

  // Create repositories
  const characterRepository = new CharacterRepository(db);
  const objectRepository = new ObjectRepository(db);

  // Create session store
  const sessionStore = new SessionStore(redisClient, {
    defaultTtlSeconds: config.gameServer?.sessionTimeout ?? 3600,
    keyPrefix: 'game:session:',
  });

  // Create zone service
  const zoneService = createZoneService(objectRepository, {
    viewDistance: config.gameServer?.viewDistance ?? 192,
    autoLoadZones: ['tatooine', 'naboo', 'corellia'],
    enableAutoSave: true,
    autoSaveInterval: 300000, // 5 minutes
  });

  // Create spawn manager
  const spawnManager = createSpawnManager(zoneService, {
    defaultRespawnDelay: 300000, // 5 minutes
  });

  // Create handlers
  const movementHandler = createMovementHandler({
    cellSize: config.gameServer?.spatialCellSize ?? 64,
    viewDistance: config.gameServer?.viewDistance ?? 192,
  });

  // Create UDP socket (placeholder - will use actual UDP server)
  // For now, using a similar pattern to login-server
  const { createSocket } = await import('node:dgram');
  const udpSocket = createSocket('udp4');

  // Create SOE session manager
  const sessionManager = new SessionManager({
    udpBufferSize: 496,
    sessionTimeout: 30000,
    resendTimeout: 500,
    maxRetries: 5,
    enableCompression: true,
    enableEncryption: true,
    tickInterval: 100,
  });

  // Game sessions map (keyed by client address:port)
  const gameSessions = new Map<string, GameSession>();

  // Player objects map (keyed by object ID)
  const playerObjects = new Map<bigint, PlayerObject>();

  // Server configuration
  const serverPort = config.gameServer?.port ?? 44463;
  const bindAddress = config.gameServer?.bindAddress ?? '0.0.0.0';

  /**
   * Get or create a game session for a SOE session
   */
  function getGameSession(soeSession: Session): GameSession | undefined {
    const key = soeSession.getKey();
    return gameSessions.get(key);
  }

  /**
   * Handle SWG message received from client
   */
  async function handleSwgMessage(
    soeSession: Session,
    data: Uint8Array
  ): Promise<void> {
    const clientKey = soeSession.getKey();

    if (data.length < 1) {
      console.warn(`[GameServer] SWG message too short from ${clientKey}`);
      return;
    }

    const session = getGameSession(soeSession);
    if (!session) {
      console.warn(`[GameServer] No game session for ${clientKey}`);
      return;
    }

    try {
      // Check for movement messages (single byte opcodes)
      const firstByte = data[0];

      if (firstByte === MovementMessageOpcode.DataTransform) {
        const message = deserializeDataTransform(data);
        movementHandler.handleDataTransform(session, message);

        // Update zone position
        if (session.player) {
          zoneService.updateObjectPosition(session.player.objectId, {
            x: message.transform.x,
            y: message.transform.y,
            z: message.transform.z,
          });
        }
        return;
      }

      if (firstByte === MovementMessageOpcode.DataTransformWithParent) {
        const message = deserializeDataTransformWithParent(data);
        movementHandler.handleDataTransformWithParent(session, message);

        // Update zone position for cell-relative movement
        if (session.player) {
          zoneService.updateObjectPosition(session.player.objectId, {
            x: message.transform.x,
            y: message.transform.y,
            z: message.transform.z,
          });
        }
        return;
      }

      // Check for 4-byte opcode messages
      if (data.length >= 4) {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const opcode = view.getUint32(0, true);

        // Handle zone messages
        if (opcode === ZoneMessageOpcode.CmdSceneReady) {
          console.log(`[GameServer] CmdSceneReady from ${clientKey}`);
          if (session.player) {
            await zoneService.onSceneReady(session.player);
          }
          return;
        }

        // Log unknown opcodes
        if (!isZoneMessageOpcode(opcode)) {
          console.log(
            `[GameServer] Unknown SWG message opcode: 0x${opcode.toString(16)} from ${clientKey}`
          );
        }
      }
    } catch (error) {
      console.error(
        `[GameServer] Error handling SWG message from ${clientKey}:`,
        error
      );
    }
  }

  /**
   * Clean up a game session
   */
  async function cleanupGameSession(key: string): Promise<void> {
    const session = gameSessions.get(key);
    if (session) {
      // Remove player from zone
      if (session.player) {
        await zoneService.exitZone(session.player);
        movementHandler.unregisterPlayer(session.player.objectId);
        playerObjects.delete(session.player.objectId);
      }
      gameSessions.delete(key);
    }
  }

  /**
   * Send callback for zone service
   */
  function sendToPlayer(objectId: bigint, data: Uint8Array): void {
    // Find the session for this player
    for (const [key, session] of gameSessions) {
      if (session.player?.objectId === objectId && session.sendCallback) {
        session.sendCallback(data);
        return;
      }
    }
  }

  // Set up zone service send callback
  zoneService.setSendCallback(sendToPlayer);

  // Set up session manager callbacks
  sessionManager.setSendCallback((data, address, port) => {
    udpSocket.send(data, port, address);
  });

  // Handle new connections
  sessionManager.on('session:connected', (session) => {
    const key = session.getKey();
    console.log(`[GameServer] Session connected: ${key}`);
    // Session will be fully initialized when player authenticates
  });

  // Handle disconnections
  sessionManager.on('session:disconnected', (session, reason) => {
    const key = session.getKey();
    console.log(`[GameServer] Session disconnected: ${key}, reason: ${reason}`);
    void cleanupGameSession(key);
  });

  // Handle received data (SWG messages)
  sessionManager.on('data', (session, data) => {
    void handleSwgMessage(session, data);
  });

  // Handle errors
  sessionManager.on('error', (error, session) => {
    if (session) {
      console.error(`[GameServer] Error for session ${session.getKey()}:`, error);
    } else {
      console.error('[GameServer] Error:', error);
    }
  });

  // Server control state
  let running = false;

  return {
    async start(): Promise<void> {
      if (running) {
        throw new Error('Server is already running');
      }

      // Initialize zone service
      await zoneService.initialize();
      console.log('[GameServer] Zone service initialized');

      // Initialize spawn manager
      await spawnManager.initialize();
      console.log('[GameServer] Spawn manager initialized');

      return new Promise((resolve, reject) => {
        udpSocket.on('message', (msg, rinfo) => {
          sessionManager.handlePacket(new Uint8Array(msg), {
            address: rinfo.address,
            port: rinfo.port,
          });
        });

        udpSocket.on('error', (error) => {
          console.error('[GameServer] UDP error:', error);
          if (!running) {
            reject(error);
          }
        });

        udpSocket.bind(serverPort, bindAddress, () => {
          sessionManager.start();
          running = true;
          console.log(`[GameServer] Started on ${bindAddress}:${serverPort}`);
          resolve();
        });
      });
    },

    async stop(): Promise<void> {
      if (!running) {
        return;
      }

      // Stop session manager (disconnects all sessions)
      sessionManager.stop();

      // Disconnect all sessions gracefully
      for (const session of sessionManager.getSessions()) {
        sessionManager.disconnectSession(session, DisconnectReason.Application);
      }

      // Clean up all game sessions
      for (const key of gameSessions.keys()) {
        await cleanupGameSession(key);
      }

      // Shutdown spawn manager
      await spawnManager.shutdown();
      console.log('[GameServer] Spawn manager shutdown');

      // Shutdown zone service
      await zoneService.shutdown();
      console.log('[GameServer] Zone service shutdown');

      // Destroy session manager
      sessionManager.destroy();

      // Close UDP socket
      return new Promise((resolve) => {
        udpSocket.close(() => {
          // Disconnect Redis
          redisClient
            .disconnect()
            .then(() => {
              running = false;
              console.log('[GameServer] Stopped');
              resolve();
            })
            .catch((error) => {
              console.error('[GameServer] Error disconnecting Redis:', error);
              running = false;
              resolve();
            });
        });
      });
    },

    isRunning(): boolean {
      return running;
    },

    getConnectionCount(): number {
      return sessionManager.getSessionCount();
    },

    getPlayerCount(): number {
      return playerObjects.size;
    },

    getZoneService(): ZoneService {
      return zoneService;
    },

    getSpawnManager(): SpawnManager {
      return spawnManager;
    },
  };
}
