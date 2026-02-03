/**
 * Chat Server
 * Main server orchestration for chat functionality
 */

import net from 'net';
import type { ServerConfig } from '@swg/config';
import {
  getRedisClient,
  SessionStore,
  PubSubManager,
  createSessionStore,
  createPubSubManager,
} from '@swg/redis';

import {
  SpatialChatHandler,
  createSpatialChatHandler,
  type ChatParticipant,
  type SpatialChatType,
} from './handlers/spatial-chat-handler.js';
import {
  SystemMessageHandler,
  createSystemMessageHandler,
  type MessageRecipient,
  SystemMessageType,
  BroadcastScope,
} from './handlers/system-message-handler.js';

/**
 * Chat client session
 */
export interface ChatClientSession {
  /** Socket connection */
  socket: net.Socket;
  /** Session ID */
  sessionId: string;
  /** Character object ID */
  objectId?: bigint;
  /** Character name */
  characterName?: string;
  /** Current zone ID */
  zoneId?: string;
  /** Account ID */
  accountId?: number;
  /** Session token for validation */
  sessionToken?: string;
  /** Whether the session is authenticated */
  authenticated: boolean;
  /** Last activity timestamp */
  lastActivity: number;
  /** Connection time */
  connectedAt: number;
}

/**
 * Chat server statistics
 */
export interface ChatServerStats {
  /** Number of connected clients */
  connectedClients: number;
  /** Number of authenticated sessions */
  authenticatedSessions: number;
  /** Spatial chat participant count */
  spatialChatParticipants: number;
  /** System message recipient count */
  systemMessageRecipients: number;
  /** Server uptime in milliseconds */
  uptime: number;
  /** Start time */
  startTime: number;
  /** Messages processed */
  messagesProcessed: bigint;
  /** Bytes received */
  bytesReceived: bigint;
  /** Bytes sent */
  bytesSent: bigint;
}

/**
 * Chat server instance interface
 */
export interface ChatServer {
  /** Start the server */
  start(): Promise<void>;
  /** Stop the server gracefully */
  stop(): Promise<void>;
  /** Get server statistics */
  getStats(): ChatServerStats;
  /** Check if server is running */
  isRunning(): boolean;
}

/**
 * Chat server configuration
 */
export interface ChatServerConfig {
  /** TCP port for chat connections */
  port: number;
  /** Bind address */
  bindAddress: string;
  /** Maximum connections */
  maxConnections: number;
  /** Session timeout in milliseconds */
  sessionTimeout: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
}

/**
 * Internal server state
 */
interface ServerState {
  tcpServer: net.Server | null;
  sessionStore: SessionStore;
  pubsub: PubSubManager;
  spatialChatHandler: SpatialChatHandler;
  systemMessageHandler: SystemMessageHandler;
  clients: Map<string, ChatClientSession>;
  config: ServerConfig;
  chatConfig: ChatServerConfig;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  cleanupInterval: ReturnType<typeof setInterval> | null;
  stats: {
    startTime: number;
    messagesProcessed: bigint;
    bytesReceived: bigint;
    bytesSent: bigint;
  };
  isRunning: boolean;
  serverId: string;
}

/**
 * Create and configure the chat server
 * @param config - Server configuration
 * @returns ChatServer instance
 */
export async function createServer(config: ServerConfig): Promise<ChatServer> {
  // Generate unique server ID
  const serverId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Get chat server config with defaults
  const chatConfig: ChatServerConfig = {
    port: parseInt(process.env['CHAT_PORT'] ?? '44460', 10),
    bindAddress: process.env['CHAT_BIND'] ?? '0.0.0.0',
    maxConnections: parseInt(process.env['CHAT_MAX_CONNECTIONS'] ?? '5000', 10),
    sessionTimeout: parseInt(process.env['CHAT_SESSION_TIMEOUT'] ?? '60000', 10),
    heartbeatInterval: parseInt(process.env['CHAT_HEARTBEAT_INTERVAL'] ?? '30000', 10),
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

  // Create handlers
  const spatialChatHandler = createSpatialChatHandler(pubsub, {
    serverId,
    enableLanguageFiltering: true,
    defaultLanguage: 'basic',
  });

  const systemMessageHandler = createSystemMessageHandler(pubsub, {
    serverId,
    clusterId: config.clusterId,
    enableSpamFiltering: true,
    maxMessagesPerSecond: 10,
  });

  // Create server state
  const state: ServerState = {
    tcpServer: null,
    sessionStore,
    pubsub,
    spatialChatHandler,
    systemMessageHandler,
    clients: new Map(),
    config,
    chatConfig,
    heartbeatInterval: null,
    cleanupInterval: null,
    stats: {
      startTime: 0,
      messagesProcessed: BigInt(0),
      bytesReceived: BigInt(0),
      bytesSent: BigInt(0),
    },
    isRunning: false,
    serverId,
  };

  return {
    start: () => startServer(state),
    stop: () => stopServer(state),
    getStats: () => getServerStats(state),
    isRunning: () => state.isRunning,
  };
}

/**
 * Start the chat server
 */
async function startServer(state: ServerState): Promise<void> {
  console.log('[ChatServer] Connecting to Redis...');
  const redisClient = getRedisClient();
  await redisClient.connect();
  console.log('[ChatServer] Redis connected');

  // Initialize handlers
  await state.spatialChatHandler.initialize();
  await state.systemMessageHandler.initialize();

  // Subscribe to relevant pub/sub channels
  await setupPubSubSubscriptions(state);

  // Create TCP server
  state.tcpServer = net.createServer((socket) => {
    handleNewConnection(state, socket);
  });

  // Set up server event handlers
  state.tcpServer.on('error', (error) => {
    console.error('[ChatServer] Server error:', error);
  });

  state.tcpServer.on('close', () => {
    console.log('[ChatServer] Server closed');
  });

  // Bind and listen
  await new Promise<void>((resolve, reject) => {
    state.tcpServer!.listen(state.chatConfig.port, state.chatConfig.bindAddress, () => {
      resolve();
    });

    state.tcpServer!.once('error', reject);
  });

  // Start periodic tasks
  state.heartbeatInterval = setInterval(
    () => runHeartbeatCheck(state),
    state.chatConfig.heartbeatInterval
  );

  state.cleanupInterval = setInterval(
    () => runCleanupTask(state),
    60000 // Clean up stale sessions every minute
  );

  state.stats.startTime = Date.now();
  state.isRunning = true;

  console.log(
    `[ChatServer] Started on ${state.chatConfig.bindAddress}:${state.chatConfig.port} (id: ${state.serverId})`
  );
}

/**
 * Stop the chat server gracefully
 */
async function stopServer(state: ServerState): Promise<void> {
  if (!state.isRunning) {
    return;
  }

  console.log('[ChatServer] Shutting down...');
  state.isRunning = false;

  // Stop periodic tasks
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
  }

  if (state.cleanupInterval) {
    clearInterval(state.cleanupInterval);
    state.cleanupInterval = null;
  }

  // Disconnect all clients
  for (const [sessionId, client] of state.clients) {
    try {
      client.socket.end();
      client.socket.destroy();
    } catch {
      // Ignore errors during shutdown
    }
    state.clients.delete(sessionId);
  }

  // Clean up handlers
  await state.spatialChatHandler.cleanup();
  await state.systemMessageHandler.cleanup();

  // Close pub/sub
  await state.pubsub.close();

  // Close TCP server
  if (state.tcpServer) {
    await new Promise<void>((resolve) => {
      state.tcpServer!.close(() => resolve());
    });
    state.tcpServer = null;
  }

  // Disconnect Redis
  const redisClient = getRedisClient();
  await redisClient.disconnect();

  console.log('[ChatServer] Shutdown complete');
}

/**
 * Set up pub/sub subscriptions
 */
async function setupPubSubSubscriptions(state: ServerState): Promise<void> {
  // Subscribe to server shutdown notifications
  await state.pubsub.subscribe('server:shutdown', (message: unknown) => {
    const shutdown = message as { serverType: string; serverId: string };
    console.log(`[ChatServer] Server ${shutdown.serverId} (${shutdown.serverType}) shut down`);
  });

  // Subscribe to player connection events
  await state.pubsub.subscribe('connection:player_connected', (message: unknown) => {
    const connected = message as { accountId: number; stationId: number };
    console.log(`[ChatServer] Player connected: account ${connected.accountId}`);
  });

  await state.pubsub.subscribe('connection:player_disconnected', (message: unknown) => {
    const disconnected = message as { accountId: number; characterId?: string };
    console.log(`[ChatServer] Player disconnected: account ${disconnected.accountId}`);

    // Clean up any chat sessions for this player
    if (disconnected.characterId) {
      const objectId = BigInt(disconnected.characterId);
      state.spatialChatHandler.unregisterParticipant(objectId);
      state.systemMessageHandler.unregisterRecipient(objectId);
    }
  });
}

/**
 * Handle a new TCP connection
 */
function handleNewConnection(state: ServerState, socket: net.Socket): void {
  // Check connection limit
  if (state.clients.size >= state.chatConfig.maxConnections) {
    console.warn('[ChatServer] Connection limit reached, rejecting connection');
    socket.end();
    socket.destroy();
    return;
  }

  // Generate session ID
  const sessionId = `${socket.remoteAddress}:${socket.remotePort}-${Date.now()}`;

  const session: ChatClientSession = {
    socket,
    sessionId,
    authenticated: false,
    lastActivity: Date.now(),
    connectedAt: Date.now(),
  };

  state.clients.set(sessionId, session);
  console.log(`[ChatServer] New connection from ${socket.remoteAddress}:${socket.remotePort}`);

  // Set up socket event handlers
  socket.on('data', (data) => {
    handleSocketData(state, session, data);
  });

  socket.on('close', () => {
    handleSocketClose(state, session);
  });

  socket.on('error', (error) => {
    handleSocketError(state, session, error);
  });

  socket.on('timeout', () => {
    console.log(`[ChatServer] Socket timeout for ${sessionId}`);
    socket.end();
  });

  // Set socket timeout
  socket.setTimeout(state.chatConfig.sessionTimeout);
}

/**
 * Handle incoming socket data
 */
function handleSocketData(
  state: ServerState,
  session: ChatClientSession,
  data: Buffer
): void {
  session.lastActivity = Date.now();
  state.stats.bytesReceived += BigInt(data.length);

  // TODO: Parse and handle chat protocol messages
  // For now, this is a placeholder that handles JSON messages

  try {
    const message = JSON.parse(data.toString('utf-8')) as {
      type: string;
      [key: string]: unknown;
    };
    state.stats.messagesProcessed += BigInt(1);

    handleChatMessage(state, session, message).catch((error) => {
      console.error('[ChatServer] Error handling message:', error);
    });
  } catch {
    console.warn('[ChatServer] Invalid message format');
  }
}

/**
 * Handle a parsed chat message
 */
async function handleChatMessage(
  state: ServerState,
  session: ChatClientSession,
  message: { type: string; [key: string]: unknown }
): Promise<void> {
  switch (message.type) {
    case 'authenticate': {
      await handleAuthenticate(state, session, message);
      break;
    }

    case 'spatial_chat': {
      if (!session.authenticated || !session.objectId) {
        sendError(state, session, 'Not authenticated');
        return;
      }
      await state.spatialChatHandler.handleSpatialChat(
        session.objectId,
        message['chatType'] as SpatialChatType,
        message['text'] as string,
        {
          language: message['language'] as string | undefined,
          mood: message['mood'] as string | undefined,
          targetId: message['targetId']
            ? BigInt(message['targetId'] as string)
            : undefined,
        }
      );
      break;
    }

    case 'system_message': {
      if (!session.authenticated) {
        sendError(state, session, 'Not authenticated');
        return;
      }
      await state.systemMessageHandler.sendSystemMessage(
        message['messageType'] as SystemMessageType,
        message['text'] as string,
        {
          priority: message['priority'] as number | undefined,
          targetIds: message['targetIds']
            ? (message['targetIds'] as string[]).map((id) => BigInt(id))
            : undefined,
          zoneId: message['zoneId'] as string | undefined,
        }
      );
      break;
    }

    case 'broadcast': {
      if (!session.authenticated) {
        sendError(state, session, 'Not authenticated');
        return;
      }
      await state.systemMessageHandler.broadcastAnnouncement(
        message['text'] as string,
        message['scope'] as BroadcastScope,
        {
          source: session.characterName ?? 'Unknown',
          zoneId: message['zoneId'] as string | undefined,
        }
      );
      break;
    }

    case 'update_position': {
      if (!session.authenticated || !session.objectId) {
        return;
      }
      const position = message['position'] as { x: number; y: number; z: number };
      state.spatialChatHandler.updateParticipantPosition(
        session.objectId,
        position,
        message['zoneId'] as string | undefined
      );
      break;
    }

    case 'heartbeat': {
      session.lastActivity = Date.now();
      sendMessage(state, session, { type: 'heartbeat_ack' });
      break;
    }

    default:
      console.warn(`[ChatServer] Unknown message type: ${message.type}`);
  }
}

/**
 * Handle authentication message
 */
async function handleAuthenticate(
  state: ServerState,
  session: ChatClientSession,
  message: { type: string; [key: string]: unknown }
): Promise<void> {
  const token = message['token'] as string;
  if (!token) {
    sendError(state, session, 'Missing session token');
    return;
  }

  // Validate token with session store
  const sessionData = await state.sessionStore.getSession(token);
  if (!sessionData) {
    sendError(state, session, 'Invalid or expired session token');
    return;
  }

  // Get character info from the authentication message
  // These are provided by the game server when routing the player to chat
  const characterName = message['characterName'] as string | undefined;
  const zoneId = message['zoneId'] as string | undefined;

  // Update session
  session.authenticated = true;
  session.sessionToken = token;
  session.accountId = sessionData.accountId;
  session.objectId = sessionData.characterId;
  session.characterName = characterName;
  session.zoneId = zoneId;

  // Register with handlers if we have character info
  if (session.objectId && session.characterName && session.zoneId) {
    // Register as spatial chat participant
    const chatParticipant: ChatParticipant = {
      objectId: session.objectId,
      name: session.characterName,
      position: { x: 0, y: 0, z: 0 }, // Will be updated by game server
      zoneId: session.zoneId,
      spokenLanguages: ['basic'],
      comprehendedLanguages: ['basic'],
      sendCallback: (data) => sendRawData(state, session, data),
    };
    state.spatialChatHandler.registerParticipant(chatParticipant);

    // Register as system message recipient
    const messageRecipient: MessageRecipient = {
      objectId: session.objectId,
      name: session.characterName,
      zoneId: session.zoneId,
      messageFilters: new Set(),
      sendCallback: (data) => sendRawData(state, session, data),
    };
    state.systemMessageHandler.registerRecipient(messageRecipient);
  }

  console.log(
    `[ChatServer] Session authenticated: ${session.characterName ?? 'Unknown'} (account: ${session.accountId})`
  );

  sendMessage(state, session, {
    type: 'authenticate_success',
    characterName: session.characterName,
  });
}

/**
 * Handle socket close
 */
function handleSocketClose(state: ServerState, session: ChatClientSession): void {
  console.log(`[ChatServer] Connection closed: ${session.sessionId}`);

  // Unregister from handlers
  if (session.objectId) {
    state.spatialChatHandler.unregisterParticipant(session.objectId);
    state.systemMessageHandler.unregisterRecipient(session.objectId);
  }

  state.clients.delete(session.sessionId);
}

/**
 * Handle socket error
 */
function handleSocketError(
  state: ServerState,
  session: ChatClientSession,
  error: Error
): void {
  console.error(`[ChatServer] Socket error for ${session.sessionId}:`, error.message);
}

/**
 * Send a message to a client
 */
function sendMessage(
  state: ServerState,
  session: ChatClientSession,
  message: object
): void {
  if (session.socket.destroyed) {
    return;
  }

  const data = JSON.stringify(message) + '\n';
  const buffer = Buffer.from(data, 'utf-8');
  session.socket.write(buffer);
  state.stats.bytesSent += BigInt(buffer.length);
}

/**
 * Send raw data to a client
 */
function sendRawData(
  state: ServerState,
  session: ChatClientSession,
  data: Uint8Array
): void {
  if (session.socket.destroyed) {
    return;
  }

  session.socket.write(Buffer.from(data));
  state.stats.bytesSent += BigInt(data.length);
}

/**
 * Send an error message to a client
 */
function sendError(
  state: ServerState,
  session: ChatClientSession,
  error: string
): void {
  sendMessage(state, session, { type: 'error', error });
}

/**
 * Run periodic heartbeat check
 */
function runHeartbeatCheck(state: ServerState): void {
  if (!state.isRunning) return;

  const now = Date.now();
  const timeout = state.chatConfig.sessionTimeout;

  for (const [sessionId, session] of state.clients) {
    if (now - session.lastActivity > timeout) {
      console.log(`[ChatServer] Session timeout: ${sessionId}`);
      session.socket.end();
      session.socket.destroy();
    }
  }
}

/**
 * Run periodic cleanup task
 */
function runCleanupTask(state: ServerState): void {
  if (!state.isRunning) return;

  // Clean up destroyed sockets
  for (const [sessionId, session] of state.clients) {
    if (session.socket.destroyed) {
      handleSocketClose(state, session);
    }
  }
}

/**
 * Get server statistics
 */
function getServerStats(state: ServerState): ChatServerStats {
  const authenticatedCount = Array.from(state.clients.values()).filter(
    (c) => c.authenticated
  ).length;

  return {
    connectedClients: state.clients.size,
    authenticatedSessions: authenticatedCount,
    spatialChatParticipants: state.spatialChatHandler.getParticipantCount(),
    systemMessageRecipients: state.systemMessageHandler.getRecipientCount(),
    uptime: state.stats.startTime > 0 ? Date.now() - state.stats.startTime : 0,
    startTime: state.stats.startTime,
    messagesProcessed: state.stats.messagesProcessed,
    bytesReceived: state.stats.bytesReceived,
    bytesSent: state.stats.bytesSent,
  };
}
