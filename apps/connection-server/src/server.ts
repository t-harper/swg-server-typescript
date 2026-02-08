/**
 * Connection Server
 * Main server orchestration for client connections and routing
 *
 * Uses SessionManager from @swg/protocol/soe for proper SOE protocol handling
 * including encryption, CRC validation, reliable delivery, and fragmentation.
 */

import type { ServerConfig } from '@swg/config';
import {
  getRedisClient,
  SessionStore,
  PubSubManager,
  createSessionStore,
  createPubSubManager,
} from '@swg/redis';
import {
  SessionManager,
  type Session,
  DisconnectReason,
} from '@swg/protocol/soe';
import {
  ConnectionMessageOpcode,
  deserializeClientIdMsg,
  deserializeSelectCharacter,
  getConnectionMessageOpcode,
} from '@swg/protocol/swg/messages/connection-messages.js';
import { BufferWriter } from '@swg/protocol/soe/buffer-utils.js';
import { serializeHeartBeat } from '@swg/protocol/swg/messages/character-messages.js';
import { createClientPermissionsMessage } from '@swg/protocol/swg/messages/object-messages.js';
import {
  createChatServerStatus,
  serializeChatServerStatus,
} from '@swg/protocol/swg/messages/chat/chat-core.js';

import { UdpServer, createUdpServer } from './network/udp-server.js';
import {
  ConnectionHandler,
  createConnectionHandler,
  type ClientSession,
  SessionState,
} from './handlers/connection-handler.js';
import {
  RoutingHandler,
  createRoutingHandler,
  GameServerStatus,
  type GameServerInfo,
} from './handlers/routing-handler.js';

/**
 * Server shutdown message for pub/sub
 */
interface ServerShutdownMessage {
  type: 'server_shutdown';
  serverId: string;
  serverType: string;
  address: string;
  port: number;
  timestamp: number;
}

/**
 * Connection server instance interface
 */
export interface ConnectionServer {
  /** Start the server */
  start(): Promise<void>;
  /** Stop the server gracefully */
  stop(): Promise<void>;
  /** Get server statistics */
  getStats(): ConnectionServerStats;
}

/**
 * Server statistics
 */
export interface ConnectionServerStats {
  /** Number of active SOE sessions */
  activeSessions: number;
  /** Number of authenticated connection sessions */
  connectionSessions: number;
  /** Server start time */
  startTime: number;
}

/**
 * Extended session linking SOE session to connection handler session
 */
interface ConnectionSession {
  soeSession: Session;
  clientSession: ClientSession;
  authenticated: boolean;
  receivedConnectionOpen: boolean;
  sentPostAuthPackets: boolean;
  sentPostSelectPackets: boolean;
  accountId?: number;
  stationId?: number;
  sessionToken?: string;
  gameFeatures?: number;
  subscriptionFeatures?: number;
}

const ConnectionServerClientOpcode = {
  ConnectionOpen: 0x31805ee0,
} as const;

const ConnectionServerMessageOpcode = {
  AccountFeatureBits: 0x979f0279,
  VoiceChatStatus: 0x9e601905,
} as const;

const DefaultFeatureBits = {
  game: 0xffffffff,
  subscription: 0x00000001,
} as const;

function serializeAccountFeatureBits(
  gameFeatures: number,
  subscriptionFeatures: number,
  connectionServerNumber: number,
  epochSeconds: number,
): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt16LE(1); // GenericValueTypeMessage has 1 variable payload
  writer.writeUInt32LE(ConnectionServerMessageOpcode.AccountFeatureBits);
  writer.writeUInt32LE(gameFeatures >>> 0);
  writer.writeUInt32LE(subscriptionFeatures >>> 0);
  writer.writeInt32LE(connectionServerNumber | 0);
  writer.writeInt32LE(epochSeconds | 0);
  return writer.toBuffer();
}

function serializeVoiceChatStatus(statusCode: number): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt16LE(1);
  writer.writeUInt32LE(ConnectionServerMessageOpcode.VoiceChatStatus);
  writer.writeUInt32LE(statusCode >>> 0);
  return writer.toBuffer();
}

/**
 * Create and configure the connection server
 * @param config - Server configuration
 * @returns ConnectionServer instance
 */
export async function createServer(config: ServerConfig): Promise<ConnectionServer> {
  // Generate unique server ID
  const serverId = `connection-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Get connection server config with defaults
  const connectionConfig = config.connectionServer ?? {
    port: 44455,
    bindAddress: '0.0.0.0',
    maxConnections: 3000,
    pingInterval: 30000,
    disconnectTimeout: 60000,
  };

  // Initialize Redis client
  const redisClient = getRedisClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    connectionName: serverId,
  });

  // Create session store and pub/sub manager
  const sessionStore = createSessionStore(redisClient);
  const pubsub = createPubSubManager(redisClient);

  // Create UDP server
  const udpServer = createUdpServer({
    type: 'udp4',
    reuseAddr: true,
  });

  // Create SOE session manager
  const sessionManager = new SessionManager({
    udpBufferSize: 496,
    sessionTimeout: connectionConfig.disconnectTimeout ?? 60000,
    resendTimeout: 500,
    maxRetries: 5,
    enableCompression: true,
    enableEncryption: true,
    tickInterval: 100,
  });

  // Create handlers
  const connectionHandler = createConnectionHandler(sessionStore, pubsub, {
    serverAddress: connectionConfig.bindAddress,
    serverPort: connectionConfig.port,
    sessionTimeout: connectionConfig.disconnectTimeout,
    heartbeatInterval: connectionConfig.pingInterval,
  });

  const routingHandler = createRoutingHandler(sessionStore, pubsub, {
    defaultGameServer: { address: '127.0.0.1', port: 44463 },
  });

  // Connection sessions map (keyed by SOE session key address:port)
  const connectionSessions = new Map<string, ConnectionSession>();

  // Server state
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let pruneInterval: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;
  let isRunning = false;

  /**
   * Get or create a connection session for a SOE session
   */
  function getConnectionSession(soeSession: Session): ConnectionSession {
    const key = soeSession.getKey();
    let connSession = connectionSessions.get(key);

    if (!connSession) {
      // Create a new client session in the connection handler
      const clientSession = connectionHandler.handleNewConnection(
        soeSession.sessionId,
        soeSession.clientAddress.address,
        soeSession.clientAddress.port,
      );

      connSession = {
        soeSession,
        clientSession,
        authenticated: false,
        receivedConnectionOpen: false,
        sentPostAuthPackets: false,
        sentPostSelectPackets: false,
      };

      connectionSessions.set(key, connSession);
    }

    return connSession;
  }

  /**
   * Handle SWG message received from client via SessionManager 'data' event
   */
  async function handleSwgMessage(
    soeSession: Session,
    data: Uint8Array,
  ): Promise<void> {
    const clientKey = soeSession.getKey();

    if (data.length < 6) {
      console.warn(`[ConnectionServer] SWG message too short from ${clientKey}`);
      return;
    }

    const connSession = getConnectionSession(soeSession);
    const opcode = getConnectionMessageOpcode(data);

    try {
      switch (opcode) {
        case ConnectionMessageOpcode.ClientIdMsg: {
          await handleClientIdMsg(connSession, data, clientKey);
          break;
        }

        case ConnectionMessageOpcode.SelectCharacter: {
          await handleSelectCharacter(connSession, data, clientKey);
          break;
        }

        case ConnectionServerClientOpcode.ConnectionOpen: {
          handleConnectionOpen(connSession, clientKey);
          break;
        }

        default:
          console.log(
            `[ConnectionServer] Unknown SWG message opcode: 0x${opcode.toString(16)} from ${clientKey}`,
          );
      }
    } catch (error) {
      console.error(`[ConnectionServer] Error handling SWG message from ${clientKey}:`, error);
    }
  }

  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function tryUnpackLegacyLoginToken(tokenBytes: Uint8Array): Uint8Array | null {
    // Legacy C++ LoginClientToken format:
    // u32LE cipherDataLen + u32LE dataLen + cipherData + digest[16]
    if (tokenBytes.length < 24) {
      return null;
    }

    const view = new DataView(
      tokenBytes.buffer,
      tokenBytes.byteOffset,
      tokenBytes.byteLength,
    );
    const cipherDataLen = view.getUint32(0, true);
    const dataLen = view.getUint32(4, true);
    const expectedLen = 8 + cipherDataLen + 16;

    if (expectedLen !== tokenBytes.length) {
      return null;
    }

    // In TS login we preserve Redis token bytes inside cipherData.
    if (cipherDataLen !== dataLen || dataLen === 0) {
      return null;
    }

    return tokenBytes.subarray(8, 8 + dataLen);
  }

  function sendPostAuthPackets(
    connSession: ConnectionSession,
    clientKey: string,
  ): void {
    if (!connSession.authenticated || !connSession.receivedConnectionOpen || connSession.sentPostAuthPackets) {
      return;
    }

    const accountFeatureBits = serializeAccountFeatureBits(
      connSession.gameFeatures ?? DefaultFeatureBits.game,
      connSession.subscriptionFeatures ?? DefaultFeatureBits.subscription,
      1,
      Math.floor(Date.now() / 1000),
    );

    const clientPermissions = createClientPermissionsMessage(
      true,
      true,
      true,
      true,
    );

    // Match C++ post-auth ordering seen in packet captures.
    const postAuthGroup = [
      serializeHeartBeat(),
      accountFeatureBits,
      clientPermissions,
    ];

    sessionManager.sendReliableGroup(connSession.soeSession, postAuthGroup);
    connSession.sentPostAuthPackets = true;

    console.log(
      `[ConnectionServer] Sent post-auth packet group (${postAuthGroup.length} messages) to ${clientKey}`,
    );
  }

  function sendPostSelectPackets(
    connSession: ConnectionSession,
    clientKey: string,
  ): void {
    if (connSession.sentPostSelectPackets) {
      return;
    }

    const chatStatus = serializeChatServerStatus(createChatServerStatus(true));
    // VoiceChatStatus::SC_VoiceEnabled = 0 in C++
    const voiceStatus = serializeVoiceChatStatus(0);

    sessionManager.sendReliableGroup(connSession.soeSession, [
      chatStatus,
      voiceStatus,
    ]);
    connSession.sentPostSelectPackets = true;

    console.log(`[ConnectionServer] Sent chat/voice status packets to ${clientKey}`);
  }

  function handleConnectionOpen(
    connSession: ConnectionSession,
    clientKey: string,
  ): void {
    connSession.receivedConnectionOpen = true;
    console.log(`[ConnectionServer] ConnectionOpen from ${clientKey}`);
    sendPostAuthPackets(connSession, clientKey);
  }

  /**
   * Handle ClientIdMsg (0xD5899226) - client sends auth token
   */
  async function handleClientIdMsg(
    connSession: ConnectionSession,
    data: Uint8Array,
    clientKey: string,
  ): Promise<void> {
    console.log(`[ConnectionServer] ClientIdMsg from ${clientKey}`);

    const message = deserializeClientIdMsg(data);

    const tokenBytes = new Uint8Array(message.token);
    const unpackedLegacyToken = tryUnpackLegacyLoginToken(tokenBytes);
    const tokenHex = bytesToHex(unpackedLegacyToken ?? tokenBytes);

    console.log(
      `[ConnectionServer] Token received from ${clientKey}, ` +
      `clientVersion: ${message.clientVersion}`,
    );
    if (unpackedLegacyToken) {
      console.log(
        `[ConnectionServer] Unpacked legacy login token envelope: ` +
        `${tokenBytes.length} -> ${unpackedLegacyToken.length} bytes`,
      );
    }

    if (!tokenHex || tokenHex.length === 0) {
      console.log(`[ConnectionServer] Empty token from ${clientKey}`);
      sessionManager.disconnectSession(
        connSession.soeSession,
        DisconnectReason.Application,
      );
      return;
    }

    // Validate the token against Redis session store
    const result = await connectionHandler.validateSession(tokenHex);

    if (!result.valid || !result.session) {
      console.log(
        `[ConnectionServer] Invalid token from ${clientKey}: ${result.error}`,
      );
      sessionManager.disconnectSession(
        connSession.soeSession,
        DisconnectReason.Application,
      );
      return;
    }

    // Authenticate the session
    await connectionHandler.authenticateSession(
      connSession.clientSession,
      tokenHex,
      result.session,
    );

    // Update connection session state
    connSession.authenticated = true;
    connSession.accountId = result.session.accountId;
    connSession.stationId = result.session.stationId;
    connSession.sessionToken = tokenHex;
    connSession.gameFeatures = DefaultFeatureBits.game;
    connSession.subscriptionFeatures = DefaultFeatureBits.subscription;

    console.log(
      `[ConnectionServer] Session authenticated for account ${result.session.accountId} ` +
      `(station: ${result.session.stationId}) from ${clientKey}`,
    );

    // The client sends ConnectionOpen (0x31805ee0) right after ClientIdMsg.
    // If we've already received it, release the post-auth packet group now.
    sendPostAuthPackets(connSession, clientKey);
  }

  /**
   * Handle SelectCharacter (0xB5098D76) - client selects a character
   */
  async function handleSelectCharacter(
    connSession: ConnectionSession,
    data: Uint8Array,
    clientKey: string,
  ): Promise<void> {
    console.log(`[ConnectionServer] SelectCharacter from ${clientKey}`);

    if (!connSession.authenticated || !connSession.sessionToken) {
      console.warn(
        `[ConnectionServer] SelectCharacter from unauthenticated session ${clientKey}`,
      );
      sessionManager.disconnectSession(
        connSession.soeSession,
        DisconnectReason.Application,
      );
      return;
    }

    const message = deserializeSelectCharacter(data);
    const characterId = message.characterId;

    console.log(
      `[ConnectionServer] Character ${characterId} selected by account ` +
      `${connSession.accountId} from ${clientKey}`,
    );

    // Update the client session with the selected character
    connSession.clientSession.characterId = characterId;
    connSession.clientSession.state = SessionState.CharacterSelected;

    // Update Redis session with characterId and game server info
    try {
      await sessionStore.updateSession(connSession.sessionToken, {
        characterId,
        lastActivity: Date.now(),
        gameServer: {
          address: connectionConfig.bindAddress ?? '127.0.0.1',
          port: 44463,
        },
      });

      // Route to game server via the routing handler
      const routeResult = await routingHandler.routeToGameServer(
        connSession.clientSession,
        'tatooine', // Default scene; in production this would come from character data
      );

      if (routeResult.success && routeResult.gameServer) {
        // Update Redis with the actual game server assignment
        await sessionStore.updateSession(connSession.sessionToken, {
          gameServer: {
            address: routeResult.gameServer.address,
            port: routeResult.gameServer.port,
          },
        });

        console.log(
          `[ConnectionServer] Character ${characterId} routed to game server ` +
          `${routeResult.gameServer.address}:${routeResult.gameServer.port}`,
        );
      } else {
        console.warn(
          `[ConnectionServer] Failed to route character ${characterId}: ` +
          `${routeResult.error ?? 'unknown error'}`,
        );
      }

      // Publish zone request so the game server knows to expect this player
      await pubsub.publish('connection:zone_request', {
        type: 'zone_request',
        accountId: connSession.accountId,
        stationId: connSession.stationId,
        characterId: characterId.toString(),
        sessionToken: connSession.sessionToken,
        gameServer: routeResult.gameServer,
        timestamp: Date.now(),
      });

      // Match C++ behavior: after character selection, push chat/voice status.
      sendPostSelectPackets(connSession, clientKey);
    } catch (error) {
      console.error(
        `[ConnectionServer] Error handling SelectCharacter for ${clientKey}:`,
        error,
      );
    }
  }

  /**
   * Clean up a connection session
   */
  async function cleanupConnectionSession(key: string): Promise<void> {
    const connSession = connectionSessions.get(key);
    if (connSession) {
      // Clean up through the connection handler
      await connectionHandler.handleDisconnect(
        connSession.clientSession,
        'session_disconnected',
      );
      connectionSessions.delete(key);
    }
  }

  // -------------------------------------------------------
  // Wire up SessionManager callbacks
  // -------------------------------------------------------

  // Set the send callback so SessionManager can transmit packets via UDP
  sessionManager.setSendCallback((data, address, port) => {
    udpServer.sendAsync(data, address, port);
  });

  // Handle new SOE sessions
  sessionManager.on('session:connected', (session: Session) => {
    const key = session.getKey();
    console.log(`[ConnectionServer] SOE session connected: ${key}`);
    getConnectionSession(session);
  });

  // Handle SOE session disconnections
  sessionManager.on('session:disconnected', (session: Session, reason: number) => {
    const key = session.getKey();
    console.log(
      `[ConnectionServer] SOE session disconnected: ${key}, reason: ${reason}`,
    );
    void cleanupConnectionSession(key);
  });

  // Handle received data (SWG messages delivered by SessionManager after
  // SOE-level decryption, CRC validation, decompression, and reassembly)
  sessionManager.on('data', (session: Session, data: Uint8Array) => {
    void handleSwgMessage(session, data);
  });

  // Handle errors from SessionManager
  sessionManager.on('error', (error: Error, session?: Session) => {
    if (session) {
      console.error(
        `[ConnectionServer] SessionManager error for ${session.getKey()}:`,
        error,
      );
    } else {
      console.error('[ConnectionServer] SessionManager error:', error);
    }
  });

  // Route all incoming UDP packets through SessionManager
  udpServer.onMessage((data, rinfo) => {
    const packet = new Uint8Array(data);

    // C++ ConnectionServer exposes a lightweight ping endpoint that echoes
    // short probe packets so the client can measure cluster latency.
    // Without this, the client hangs after "connection is now open".
    if (packet.length > 0 && packet.length <= 4) {
      udpServer.sendAsync(packet, rinfo.address, rinfo.port);
      return;
    }

    sessionManager.handlePacket(packet, {
      address: rinfo.address,
      port: rinfo.port,
    });
  });

  // Handle UDP-level errors
  udpServer.on('error', (error: Error) => {
    console.error('[ConnectionServer] UDP error:', error);
  });

  // -------------------------------------------------------
  // Pub/Sub subscriptions
  // -------------------------------------------------------

  async function setupPubSubSubscriptions(): Promise<void> {
    // Subscribe to server shutdown notifications from other servers
    await pubsub.subscribe('server:shutdown', (message: unknown) => {
      const shutdown = message as ServerShutdownMessage;
      if (shutdown.serverType === 'game') {
        console.log(
          `[ConnectionServer] Game server ${shutdown.serverId} shut down`,
        );
      }
    });

    // Subscribe to broadcast messages
    await pubsub.subscribe('broadcast:all', (message: unknown) => {
      console.log('[ConnectionServer] Received broadcast:', message);
    });
  }

  // -------------------------------------------------------
  // Periodic tasks
  // -------------------------------------------------------

  function runHeartbeatCheck(): void {
    if (!isRunning) return;
    connectionHandler.disconnectIdleSessions().catch((error) => {
      console.error('[ConnectionServer] Error in heartbeat check:', error);
    });
  }

  function runPruneTask(): void {
    if (!isRunning) return;
    routingHandler.pruneStaleServers();
  }

  // -------------------------------------------------------
  // Server lifecycle
  // -------------------------------------------------------

  return {
    async start(): Promise<void> {
      if (isRunning) {
        throw new Error('Server is already running');
      }

      console.log('[ConnectionServer] Connecting to Redis...');
      const redis = getRedisClient();
      await redis.connect();
      console.log('[ConnectionServer] Redis connected');

      // Initialize routing handler (subscribes to game server updates)
      await routingHandler.initialize();

      // Register default game servers
      const defaultGameServer: GameServerInfo = {
        serverId: 'gameserver-1',
        address: '127.0.0.1',
        port: 44463,
        scenes: [
          'tatooine',
          'naboo',
          'corellia',
          'dantooine',
          'dathomir',
          'endor',
          'lok',
          'rori',
          'talus',
          'yavin4',
          'tutorial',
        ],
        playerCount: 0,
        maxPlayers: 3000,
        status: GameServerStatus.Online,
        lastHeartbeat: Date.now(),
      };
      routingHandler.registerGameServer(defaultGameServer);

      // Set up pub/sub subscriptions
      await setupPubSubSubscriptions();

      // Bind UDP server
      const port = connectionConfig.port ?? 44455;
      const bindAddress = connectionConfig.bindAddress ?? '0.0.0.0';

      console.log(
        `[ConnectionServer] Binding UDP server to ${bindAddress}:${port}...`,
      );
      await udpServer.bind(port, bindAddress);
      console.log('[ConnectionServer] UDP server bound');

      // Start SessionManager tick loop (handles timeouts & retransmissions)
      sessionManager.start();

      // Start periodic tasks
      heartbeatInterval = setInterval(
        () => runHeartbeatCheck(),
        connectionConfig.pingInterval ?? 30000,
      );

      pruneInterval = setInterval(
        () => runPruneTask(),
        60000,
      );

      startTime = Date.now();
      isRunning = true;

      console.log(
        `[ConnectionServer] Started on ${bindAddress}:${port} (id: ${serverId})`,
      );
    },

    async stop(): Promise<void> {
      if (!isRunning) {
        return;
      }

      console.log('[ConnectionServer] Shutting down...');
      isRunning = false;

      // Stop periodic tasks
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (pruneInterval) {
        clearInterval(pruneInterval);
        pruneInterval = null;
      }

      // Publish shutdown notification
      try {
        const shutdownMessage: ServerShutdownMessage = {
          type: 'server_shutdown',
          serverId,
          serverType: 'connection',
          address: connectionConfig.bindAddress ?? '0.0.0.0',
          port: connectionConfig.port ?? 44455,
          timestamp: Date.now(),
        };
        await pubsub.publish('server:shutdown', shutdownMessage);
      } catch (error) {
        console.error(
          '[ConnectionServer] Failed to publish shutdown notification:',
          error,
        );
      }

      // Stop SessionManager (stops tick timer)
      sessionManager.stop();

      // Disconnect all SOE sessions gracefully
      for (const session of sessionManager.getSessions()) {
        sessionManager.disconnectSession(session, DisconnectReason.Application);
      }

      // Clean up all connection sessions
      for (const key of connectionSessions.keys()) {
        await cleanupConnectionSession(key);
      }

      // Destroy SessionManager (clears all internal state)
      sessionManager.destroy();

      // Clean up connection handler sessions
      await connectionHandler.cleanup();

      // Clean up routing handler
      await routingHandler.cleanup();

      // Close pub/sub
      await pubsub.close();

      // Close UDP server
      await udpServer.close();

      // Disconnect Redis
      const redis = getRedisClient();
      await redis.disconnect();

      console.log('[ConnectionServer] Shutdown complete');
    },

    getStats(): ConnectionServerStats {
      return {
        activeSessions: sessionManager.getSessionCount(),
        connectionSessions: connectionSessions.size,
        startTime,
      };
    },
  };
}
