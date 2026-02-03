/**
 * Connection Server
 * Main server orchestration for client connections and routing
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
  SoeOpcode,
  deserialize,
  serialize,
  createSessionResponse,
  createDisconnect,
  createPing,
  DisconnectReason,
  SoeProtocolDefaults,
  type SoePacket,
  type SessionRequestPacket,
  type DataPacket,
} from '@swg/protocol';

import { UdpServer, createUdpServer, type RemoteInfo } from './network/udp-server.js';
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
  serverType: 'connection';
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
  /** Number of active sessions */
  activeSessions: number;
  /** UDP server stats */
  network: {
    bytesReceived: bigint;
    bytesSent: bigint;
    packetsReceived: bigint;
    packetsSent: bigint;
    uptime: number;
  };
  /** Server start time */
  startTime: number;
}

/**
 * Internal server state
 */
interface ServerState {
  udpServer: UdpServer;
  connectionHandler: ConnectionHandler;
  routingHandler: RoutingHandler;
  sessionStore: SessionStore;
  pubsub: PubSubManager;
  config: ServerConfig;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  pruneInterval: ReturnType<typeof setInterval> | null;
  startTime: number;
  isRunning: boolean;
  serverId: string;
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

  // Create server state
  const state: ServerState = {
    udpServer,
    connectionHandler,
    routingHandler,
    sessionStore,
    pubsub,
    config,
    heartbeatInterval: null,
    pruneInterval: null,
    startTime: 0,
    isRunning: false,
    serverId,
  };

  // Set up message handler
  udpServer.onMessage((data, rinfo) => {
    handlePacket(state, data, rinfo).catch((error) => {
      console.error('[Server] Error handling packet:', error);
    });
  });

  return {
    start: () => startServer(state),
    stop: () => stopServer(state),
    getStats: () => getServerStats(state),
  };
}

/**
 * Start the connection server
 */
async function startServer(state: ServerState): Promise<void> {
  const connectionConfig = state.config.connectionServer ?? {
    port: 44455,
    bindAddress: '0.0.0.0',
    pingInterval: 30000,
    disconnectTimeout: 60000,
  };

  console.log('[Server] Connecting to Redis...');
  const redisClient = getRedisClient();
  await redisClient.connect();
  console.log('[Server] Redis connected');

  // Initialize routing handler (subscribes to game server updates)
  await state.routingHandler.initialize();

  // Register some default game servers for testing
  // In production, these would come from Redis or config
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
  state.routingHandler.registerGameServer(defaultGameServer);

  // Subscribe to relevant pub/sub channels
  await setupPubSubSubscriptions(state);

  // Bind UDP server
  console.log(`[Server] Binding UDP server to ${connectionConfig.bindAddress}:${connectionConfig.port}...`);
  await state.udpServer.bind(connectionConfig.port, connectionConfig.bindAddress);
  console.log('[Server] UDP server bound');

  // Start periodic tasks
  state.heartbeatInterval = setInterval(
    () => runHeartbeatCheck(state),
    connectionConfig.pingInterval
  );

  state.pruneInterval = setInterval(
    () => runPruneTask(state),
    60000 // Prune stale servers every minute
  );

  state.startTime = Date.now();
  state.isRunning = true;

  console.log(`[Server] Connection server started (id: ${state.serverId})`);
}

/**
 * Stop the connection server gracefully
 */
async function stopServer(state: ServerState): Promise<void> {
  if (!state.isRunning) {
    return;
  }

  console.log('[Server] Shutting down...');
  state.isRunning = false;

  // Stop periodic tasks
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
  }

  if (state.pruneInterval) {
    clearInterval(state.pruneInterval);
    state.pruneInterval = null;
  }

  // Publish shutdown notification
  try {
    const shutdownMessage: ServerShutdownMessage = {
      type: 'server_shutdown',
      serverId: state.serverId,
      serverType: 'connection',
      address: state.config.connectionServer?.bindAddress ?? '0.0.0.0',
      port: state.config.connectionServer?.port ?? 44455,
      timestamp: Date.now(),
    };
    await state.pubsub.publish('server:shutdown', shutdownMessage);
  } catch (error) {
    console.error('[Server] Failed to publish shutdown notification:', error);
  }

  // Disconnect all clients
  await state.connectionHandler.cleanup();

  // Clean up routing handler
  await state.routingHandler.cleanup();

  // Close pub/sub
  await state.pubsub.close();

  // Close UDP server
  await state.udpServer.close();

  // Disconnect Redis
  const redisClient = getRedisClient();
  await redisClient.disconnect();

  console.log('[Server] Shutdown complete');
}

/**
 * Set up pub/sub subscriptions
 */
async function setupPubSubSubscriptions(state: ServerState): Promise<void> {
  // Subscribe to server shutdown notifications from other servers
  await state.pubsub.subscribe('server:shutdown', (message: unknown) => {
    const shutdown = message as ServerShutdownMessage;
    if (shutdown.serverType === 'game') {
      // A game server shut down - mark it offline
      console.log(`[Server] Game server ${shutdown.serverId} shut down`);
    }
  });

  // Subscribe to broadcast messages
  await state.pubsub.subscribe('broadcast:all', (message: unknown) => {
    console.log('[Server] Received broadcast:', message);
    // Could forward to connected clients
  });
}

/**
 * Handle incoming UDP packet
 */
async function handlePacket(
  state: ServerState,
  data: Buffer,
  rinfo: RemoteInfo
): Promise<void> {
  if (data.length < 2) {
    return; // Too short to be valid
  }

  try {
    const packet = deserialize(new Uint8Array(data));
    await processPacket(state, packet, rinfo);
  } catch (error) {
    console.error(`[Server] Failed to deserialize packet from ${rinfo.address}:${rinfo.port}:`, error);
  }
}

/**
 * Process a deserialized SOE packet
 */
async function processPacket(
  state: ServerState,
  packet: SoePacket,
  rinfo: RemoteInfo
): Promise<void> {
  switch (packet.opcode) {
    case SoeOpcode.SessionRequest:
      await handleSessionRequest(state, packet as SessionRequestPacket, rinfo);
      break;

    case SoeOpcode.Disconnect:
      await handleDisconnectPacket(state, rinfo);
      break;

    case SoeOpcode.Ping:
      await handlePing(state, rinfo);
      break;

    case SoeOpcode.NetStatusRequest:
      await handleNetStatusRequest(state, rinfo);
      break;

    case SoeOpcode.Data:
      await handleDataPacket(state, packet as DataPacket, rinfo);
      break;

    case SoeOpcode.Ack:
      // Acknowledgements - update session activity
      await updateSessionActivity(state, rinfo);
      break;

    default:
      // Unknown or unhandled opcode
      console.log(`[Server] Unhandled opcode 0x${packet.opcode.toString(16)} from ${rinfo.address}:${rinfo.port}`);
  }
}

/**
 * Handle session request (new connection)
 */
async function handleSessionRequest(
  state: ServerState,
  packet: SessionRequestPacket,
  rinfo: RemoteInfo
): Promise<void> {
  console.log(`[Server] Session request from ${rinfo.address}:${rinfo.port} (connId: ${packet.connectionId})`);

  // Create new session
  const session = state.connectionHandler.handleNewConnection(
    packet.connectionId,
    rinfo.address,
    rinfo.port
  );

  // Generate CRC seed for this session
  const crcSeed = Math.floor(Math.random() * 0xffffffff);

  // Send session response
  const response = createSessionResponse(
    packet.connectionId,
    crcSeed,
    SoeProtocolDefaults.UDP_MAX_SIZE,
    {
      useCompression: true,
      encryptionFlag: 0,
    }
  );

  const responseData = serialize(response);
  await state.udpServer.send(Buffer.from(responseData), rinfo.address, rinfo.port);

  console.log(`[Server] Session established for ${rinfo.address}:${rinfo.port}`);
}

/**
 * Handle disconnect packet
 */
async function handleDisconnectPacket(state: ServerState, rinfo: RemoteInfo): Promise<void> {
  const session = state.connectionHandler.getSession(rinfo.address, rinfo.port);
  if (session) {
    await state.connectionHandler.handleDisconnect(session, 'client_disconnect');
  }
}

/**
 * Handle ping packet
 */
async function handlePing(state: ServerState, rinfo: RemoteInfo): Promise<void> {
  await updateSessionActivity(state, rinfo);

  // Send ping response
  const pong = createPing();
  const responseData = serialize(pong);
  await state.udpServer.send(Buffer.from(responseData), rinfo.address, rinfo.port);
}

/**
 * Handle net status request
 */
async function handleNetStatusRequest(state: ServerState, rinfo: RemoteInfo): Promise<void> {
  await updateSessionActivity(state, rinfo);
  // In a full implementation, we'd send a NetStatusResponse with actual statistics
}

/**
 * Handle data packet (contains SWG protocol messages)
 */
async function handleDataPacket(
  state: ServerState,
  packet: DataPacket,
  rinfo: RemoteInfo
): Promise<void> {
  const session = state.connectionHandler.getSession(rinfo.address, rinfo.port);
  if (!session) {
    console.log(`[Server] Data packet from unknown session ${rinfo.address}:${rinfo.port}`);
    return;
  }

  session.lastActivity = Date.now();

  // The data payload contains SWG protocol messages
  // In a full implementation, we'd parse the SWG message type and route accordingly
  // For now, we'll handle basic message types

  // The first bytes of the data indicate the SWG message type
  // This is where session token validation and character selection would be handled

  await handleSwgMessage(state, session, packet.data, rinfo);
}

/**
 * Handle SWG protocol message within a data packet
 */
async function handleSwgMessage(
  state: ServerState,
  session: ClientSession,
  data: Uint8Array,
  rinfo: RemoteInfo
): Promise<void> {
  if (data.length < 4) {
    return; // Too short for a valid SWG message
  }

  // SWG messages have a 4-byte type identifier
  // In a full implementation, we'd use the message registry from @swg/protocol

  // For demonstration, we'll handle token validation messages
  // The client would send a token after session establishment

  // Check session state and route message appropriately
  switch (session.state) {
    case SessionState.Connecting:
      // Expecting session token for validation
      await handleTokenValidation(state, session, data, rinfo);
      break;

    case SessionState.Authenticated:
      // Expecting character selection
      // In a full implementation, parse character selection message
      console.log(`[Server] Received message from authenticated session ${session.accountId}`);
      break;

    case SessionState.CharacterSelected:
    case SessionState.Routed:
      // Forward to game server or handle game messages
      console.log(`[Server] Received game message from ${session.accountId}`);
      break;

    default:
      console.log(`[Server] Message in unexpected state: ${session.state}`);
  }
}

/**
 * Handle token validation message
 */
async function handleTokenValidation(
  state: ServerState,
  session: ClientSession,
  data: Uint8Array,
  rinfo: RemoteInfo
): Promise<void> {
  // In a real implementation, the token would be extracted from the SWG message format
  // For now, we'll treat the data as a raw token string
  const token = new TextDecoder().decode(data).trim();

  if (!token || token.length === 0) {
    console.log(`[Server] Empty token from ${rinfo.address}:${rinfo.port}`);
    await disconnectClient(state, session, DisconnectReason.Application);
    return;
  }

  // Validate the token
  const result = await state.connectionHandler.validateSession(token);

  if (!result.valid || !result.session) {
    console.log(`[Server] Invalid token from ${rinfo.address}:${rinfo.port}: ${result.error}`);
    await disconnectClient(state, session, DisconnectReason.Application);
    return;
  }

  // Authenticate the session
  await state.connectionHandler.authenticateSession(session, token, result.session);

  console.log(`[Server] Session validated for account ${result.session.accountId}`);

  // In a full implementation, we'd send a success message to the client
  // and wait for character selection
}

/**
 * Disconnect a client
 */
async function disconnectClient(
  state: ServerState,
  session: ClientSession,
  reason: number
): Promise<void> {
  // Send disconnect packet
  const disconnectPacket = createDisconnect(session.connectionId, reason);
  const data = serialize(disconnectPacket);
  await state.udpServer.send(Buffer.from(data), session.address, session.port);

  // Clean up session
  await state.connectionHandler.handleDisconnect(session, `reason_${reason}`);
}

/**
 * Update session activity timestamp
 */
async function updateSessionActivity(state: ServerState, rinfo: RemoteInfo): Promise<void> {
  const session = state.connectionHandler.getSession(rinfo.address, rinfo.port);
  if (session) {
    await state.connectionHandler.handleHeartbeat(session);
  }
}

/**
 * Run periodic heartbeat check
 */
function runHeartbeatCheck(state: ServerState): void {
  if (!state.isRunning) return;

  state.connectionHandler.disconnectIdleSessions().catch((error) => {
    console.error('[Server] Error in heartbeat check:', error);
  });
}

/**
 * Run periodic server prune task
 */
function runPruneTask(state: ServerState): void {
  if (!state.isRunning) return;

  state.routingHandler.pruneStaleServers();
}

/**
 * Get server statistics
 */
function getServerStats(state: ServerState): ConnectionServerStats {
  const networkStats = state.udpServer.getStats();

  return {
    activeSessions: state.connectionHandler.getSessionCount(),
    network: {
      bytesReceived: networkStats.bytesReceived,
      bytesSent: networkStats.bytesSent,
      packetsReceived: networkStats.packetsReceived,
      packetsSent: networkStats.packetsSent,
      uptime: networkStats.uptime,
    },
    startTime: state.startTime,
  };
}
