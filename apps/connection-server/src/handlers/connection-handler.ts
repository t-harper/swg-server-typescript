/**
 * Connection Handler
 * Manages client connections, session validation, and lifecycle events
 */

import type { SessionStore, SessionData, PubSubManager } from '@swg/redis';

/**
 * Client session information tracked by the connection handler
 */
export interface ClientSession {
  /** Session token for Redis lookup */
  token: string;
  /** Client IP address */
  address: string;
  /** Client port */
  port: number;
  /** SOE connection ID */
  connectionId: number;
  /** Account ID (after validation) */
  accountId?: number;
  /** Station ID (after validation) */
  stationId?: number;
  /** Selected character ID */
  characterId?: bigint;
  /** Last activity timestamp */
  lastActivity: number;
  /** Session creation time */
  connectedAt: number;
  /** Current state of the session */
  state: SessionState;
}

/**
 * Session states for the connection lifecycle
 */
export enum SessionState {
  /** Initial connection, awaiting token validation */
  Connecting = 'connecting',
  /** Token validated, session active */
  Authenticated = 'authenticated',
  /** Character selected, ready for game server routing */
  CharacterSelected = 'character_selected',
  /** Routed to game server */
  Routed = 'routed',
  /** Disconnecting */
  Disconnecting = 'disconnecting',
}

/**
 * Session validation result
 */
export interface ValidationResult {
  valid: boolean;
  session?: SessionData;
  error?: string;
}

/**
 * Pub/Sub message types for connection events
 */
export interface PlayerConnectedMessage {
  type: 'player_connected';
  accountId: number;
  stationId: number;
  connectionServer: { address: string; port: number };
  timestamp: number;
}

export interface PlayerDisconnectedMessage {
  type: 'player_disconnected';
  accountId: number;
  stationId: number;
  characterId?: string | undefined;
  reason: string;
  timestamp: number;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  accountId: number;
  timestamp: number;
}

/**
 * Connection handler configuration
 */
export interface ConnectionHandlerConfig {
  /** Connection server address for session registration */
  serverAddress: string;
  /** Connection server port */
  serverPort: number;
  /** Session timeout in milliseconds (default: 60000) */
  sessionTimeout?: number;
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
}

/**
 * ConnectionHandler manages client sessions and their lifecycle
 */
export class ConnectionHandler {
  private readonly sessionStore: SessionStore;
  private readonly pubsub: PubSubManager;
  private readonly config: Required<ConnectionHandlerConfig>;
  private readonly sessions: Map<string, ClientSession> = new Map();
  private readonly connectionIdToSession: Map<number, string> = new Map();

  constructor(
    sessionStore: SessionStore,
    pubsub: PubSubManager,
    config: ConnectionHandlerConfig
  ) {
    this.sessionStore = sessionStore;
    this.pubsub = pubsub;
    this.config = {
      serverAddress: config.serverAddress,
      serverPort: config.serverPort,
      sessionTimeout: config.sessionTimeout ?? 60000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
  }

  /**
   * Handle a new client connection
   * Called when a client establishes an SOE session
   * @param connectionId - SOE connection ID
   * @param address - Client IP address
   * @param port - Client port
   * @returns The created client session
   */
  handleNewConnection(
    connectionId: number,
    address: string,
    port: number
  ): ClientSession {
    const sessionKey = this.makeSessionKey(address, port);

    // Check for existing session from same address:port
    const existingSession = this.sessions.get(sessionKey);
    if (existingSession) {
      // Clean up old session
      this.connectionIdToSession.delete(existingSession.connectionId);
    }

    const session: ClientSession = {
      token: '', // Will be set during validation
      address,
      port,
      connectionId,
      lastActivity: Date.now(),
      connectedAt: Date.now(),
      state: SessionState.Connecting,
    };

    this.sessions.set(sessionKey, session);
    this.connectionIdToSession.set(connectionId, sessionKey);

    console.log(`[ConnectionHandler] New connection from ${address}:${port} (connId: ${connectionId})`);

    return session;
  }

  /**
   * Handle client disconnect
   * Cleans up session data and notifies other servers
   * @param session - The session to disconnect
   * @param reason - Disconnect reason
   */
  async handleDisconnect(session: ClientSession, reason: string = 'unknown'): Promise<void> {
    const sessionKey = this.makeSessionKey(session.address, session.port);

    console.log(
      `[ConnectionHandler] Disconnecting ${session.address}:${session.port} ` +
      `(reason: ${reason}, accountId: ${session.accountId ?? 'none'})`
    );

    // Update state
    session.state = SessionState.Disconnecting;

    // Clean up Redis session if authenticated
    if (session.token && session.accountId) {
      try {
        // Publish disconnect notification
        const message: PlayerDisconnectedMessage = {
          type: 'player_disconnected',
          accountId: session.accountId,
          stationId: session.stationId ?? 0,
          characterId: session.characterId?.toString(),
          reason,
          timestamp: Date.now(),
        };

        await this.pubsub.publish('connection:player_disconnected', message);

        // Delete the session from Redis
        await this.sessionStore.deleteSession(session.token);
      } catch (error) {
        console.error('[ConnectionHandler] Error during disconnect cleanup:', error);
      }
    }

    // Remove from local tracking
    this.sessions.delete(sessionKey);
    this.connectionIdToSession.delete(session.connectionId);
  }

  /**
   * Handle client heartbeat/activity
   * Updates last activity timestamp and refreshes Redis TTL
   * @param session - The session to update
   */
  async handleHeartbeat(session: ClientSession): Promise<void> {
    const now = Date.now();
    session.lastActivity = now;

    // Refresh Redis session TTL if authenticated
    if (session.token) {
      try {
        await this.sessionStore.refreshSession(session.token);

        // Publish heartbeat for monitoring
        if (session.accountId) {
          const message: HeartbeatMessage = {
            type: 'heartbeat',
            accountId: session.accountId,
            timestamp: now,
          };
          await this.pubsub.publish('connection:heartbeat', message);
        }
      } catch (error) {
        console.error('[ConnectionHandler] Error refreshing session:', error);
      }
    }
  }

  /**
   * Validate a session token received from the client
   * @param token - Session token to validate
   * @returns Validation result with session data if valid
   */
  async validateSession(token: string): Promise<ValidationResult> {
    if (!token || token.length === 0) {
      return { valid: false, error: 'Empty session token' };
    }

    try {
      const sessionData = await this.sessionStore.getSession(token);

      if (!sessionData) {
        return { valid: false, error: 'Session not found or expired' };
      }

      // Check if session has expired (based on lastActivity)
      const now = Date.now();
      const sessionAge = now - sessionData.lastActivity;
      if (sessionAge > this.config.sessionTimeout) {
        await this.sessionStore.deleteSession(token);
        return { valid: false, error: 'Session expired' };
      }

      return { valid: true, session: sessionData };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ConnectionHandler] Session validation error:', message);
      return { valid: false, error: `Validation error: ${message}` };
    }
  }

  /**
   * Authenticate a session with a validated token
   * Updates the local session with account information
   * @param session - The client session to authenticate
   * @param token - The validated session token
   * @param sessionData - Session data from Redis
   */
  async authenticateSession(
    session: ClientSession,
    token: string,
    sessionData: SessionData
  ): Promise<void> {
    session.token = token;
    session.accountId = sessionData.accountId;
    session.stationId = sessionData.stationId;
    session.state = SessionState.Authenticated;
    session.lastActivity = Date.now();

    // Update Redis session with connection server info
    await this.sessionStore.updateSession(token, {
      lastActivity: session.lastActivity,
      connectionServer: {
        address: this.config.serverAddress,
        port: this.config.serverPort,
      },
    });

    // Publish connection notification
    const message: PlayerConnectedMessage = {
      type: 'player_connected',
      accountId: sessionData.accountId,
      stationId: sessionData.stationId,
      connectionServer: {
        address: this.config.serverAddress,
        port: this.config.serverPort,
      },
      timestamp: Date.now(),
    };

    await this.pubsub.publish('connection:player_connected', message);

    console.log(
      `[ConnectionHandler] Session authenticated for account ${sessionData.accountId} ` +
      `(station: ${sessionData.stationId})`
    );
  }

  /**
   * Get a session by connection ID
   * @param connectionId - SOE connection ID
   * @returns The session or undefined
   */
  getSessionByConnectionId(connectionId: number): ClientSession | undefined {
    const sessionKey = this.connectionIdToSession.get(connectionId);
    if (!sessionKey) return undefined;
    return this.sessions.get(sessionKey);
  }

  /**
   * Get a session by address and port
   * @param address - Client IP address
   * @param port - Client port
   * @returns The session or undefined
   */
  getSession(address: string, port: number): ClientSession | undefined {
    return this.sessions.get(this.makeSessionKey(address, port));
  }

  /**
   * Get all active sessions
   * @returns Iterator of all sessions
   */
  getAllSessions(): IterableIterator<ClientSession> {
    return this.sessions.values();
  }

  /**
   * Get the number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Find and disconnect idle sessions
   * @returns Number of sessions disconnected
   */
  async disconnectIdleSessions(): Promise<number> {
    const now = Date.now();
    const idleSessions: ClientSession[] = [];

    for (const session of this.sessions.values()) {
      const idleTime = now - session.lastActivity;
      if (idleTime > this.config.sessionTimeout) {
        idleSessions.push(session);
      }
    }

    for (const session of idleSessions) {
      await this.handleDisconnect(session, 'idle_timeout');
    }

    if (idleSessions.length > 0) {
      console.log(`[ConnectionHandler] Disconnected ${idleSessions.length} idle sessions`);
    }

    return idleSessions.length;
  }

  /**
   * Create a unique session key from address and port
   */
  private makeSessionKey(address: string, port: number): string {
    return `${address}:${port}`;
  }

  /**
   * Clean up all sessions (for shutdown)
   */
  async cleanup(): Promise<void> {
    console.log(`[ConnectionHandler] Cleaning up ${this.sessions.size} sessions`);

    const disconnectPromises: Promise<void>[] = [];
    for (const session of this.sessions.values()) {
      disconnectPromises.push(this.handleDisconnect(session, 'server_shutdown'));
    }

    await Promise.all(disconnectPromises);
    this.sessions.clear();
    this.connectionIdToSession.clear();
  }
}

/**
 * Create a new connection handler instance
 */
export function createConnectionHandler(
  sessionStore: SessionStore,
  pubsub: PubSubManager,
  config: ConnectionHandlerConfig
): ConnectionHandler {
  return new ConnectionHandler(sessionStore, pubsub, config);
}
