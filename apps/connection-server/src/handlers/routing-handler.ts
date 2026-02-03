/**
 * Routing Handler
 * Manages zone routing and game server selection
 */

import type { SessionStore, PubSubManager } from '@swg/redis';
import type { ClientSession } from './connection-handler.js';
import { SessionState } from './connection-handler.js';

/**
 * Game server information
 */
export interface GameServerInfo {
  /** Unique server ID */
  serverId: string;
  /** Server address */
  address: string;
  /** Server port */
  port: number;
  /** Scenes/zones this server handles */
  scenes: string[];
  /** Current player count */
  playerCount: number;
  /** Maximum player capacity */
  maxPlayers: number;
  /** Server status */
  status: GameServerStatus;
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
}

/**
 * Game server status
 */
export enum GameServerStatus {
  Online = 'online',
  Loading = 'loading',
  Full = 'full',
  Maintenance = 'maintenance',
  Offline = 'offline',
}

/**
 * Routing result returned to client
 */
export interface RoutingResult {
  success: boolean;
  gameServer?: {
    address: string;
    port: number;
  };
  error?: string;
}

/**
 * Character data for routing decisions
 */
export interface CharacterInfo {
  characterId: bigint;
  accountId: number;
  sceneId: string;
  templateId: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Pub/Sub messages for routing
 */
export interface GameServerStatusMessage {
  type: 'game_server_status';
  serverId: string;
  status: GameServerStatus;
  playerCount: number;
  scenes: string[];
  timestamp: number;
}

export interface PlayerRoutedMessage {
  type: 'player_routed';
  accountId: number;
  characterId: string;
  gameServerId: string;
  sceneId: string;
  timestamp: number;
}

/**
 * Routing handler configuration
 */
export interface RoutingHandlerConfig {
  /** Default game server for new characters */
  defaultGameServer?: { address: string; port: number };
  /** Scene to server mapping (can be loaded from config/Redis) */
  sceneServerMapping?: Map<string, string>;
  /** Server timeout in milliseconds (consider offline if no heartbeat) */
  serverTimeout?: number;
}

/**
 * RoutingHandler manages game server selection and zone routing
 */
export class RoutingHandler {
  private readonly sessionStore: SessionStore;
  private readonly pubsub: PubSubManager;
  private readonly config: Required<RoutingHandlerConfig>;
  private readonly gameServers: Map<string, GameServerInfo> = new Map();
  private readonly sceneToServer: Map<string, string> = new Map();

  constructor(
    sessionStore: SessionStore,
    pubsub: PubSubManager,
    config: RoutingHandlerConfig = {}
  ) {
    this.sessionStore = sessionStore;
    this.pubsub = pubsub;
    this.config = {
      defaultGameServer: config.defaultGameServer ?? { address: '127.0.0.1', port: 44463 },
      sceneServerMapping: config.sceneServerMapping ?? new Map(),
      serverTimeout: config.serverTimeout ?? 60000,
    };

    // Initialize scene mapping from config
    if (config.sceneServerMapping) {
      for (const [scene, serverId] of config.sceneServerMapping) {
        this.sceneToServer.set(scene, serverId);
      }
    }
  }

  /**
   * Initialize pub/sub subscriptions for game server updates
   */
  async initialize(): Promise<void> {
    // Subscribe to game server status updates
    await this.pubsub.subscribe<GameServerStatusMessage>(
      'gameserver:status',
      (message) => this.handleGameServerStatus(message)
    );

    console.log('[RoutingHandler] Initialized and subscribed to game server updates');
  }

  /**
   * Handle game server status update
   */
  private handleGameServerStatus(message: GameServerStatusMessage): void {
    const server = this.gameServers.get(message.serverId);

    if (server) {
      // Update existing server
      server.status = message.status;
      server.playerCount = message.playerCount;
      server.scenes = message.scenes;
      server.lastHeartbeat = message.timestamp;
    } else {
      // This is a new server announcement - we'd need full info
      // For now, we just log it
      console.log(`[RoutingHandler] Received status from unknown server: ${message.serverId}`);
    }

    // Update scene mappings
    for (const scene of message.scenes) {
      this.sceneToServer.set(scene, message.serverId);
    }
  }

  /**
   * Register a game server (called on startup or from Redis)
   * @param server - Game server information
   */
  registerGameServer(server: GameServerInfo): void {
    this.gameServers.set(server.serverId, server);

    // Map scenes to this server
    for (const scene of server.scenes) {
      this.sceneToServer.set(scene, server.serverId);
    }

    console.log(
      `[RoutingHandler] Registered game server ${server.serverId} ` +
      `(${server.address}:${server.port}) handling ${server.scenes.length} scenes`
    );
  }

  /**
   * Unregister a game server
   * @param serverId - Server ID to remove
   */
  unregisterGameServer(serverId: string): void {
    const server = this.gameServers.get(serverId);
    if (!server) return;

    // Remove scene mappings
    for (const scene of server.scenes) {
      const mappedServer = this.sceneToServer.get(scene);
      if (mappedServer === serverId) {
        this.sceneToServer.delete(scene);
      }
    }

    this.gameServers.delete(serverId);
    console.log(`[RoutingHandler] Unregistered game server ${serverId}`);
  }

  /**
   * Route a session to the appropriate game server for a scene
   * @param session - Client session
   * @param sceneId - Target scene ID
   * @returns Routing result with game server address
   */
  async routeToGameServer(
    session: ClientSession,
    sceneId: string
  ): Promise<RoutingResult> {
    if (!session.accountId || !session.token) {
      return { success: false, error: 'Session not authenticated' };
    }

    // Find the game server for this scene
    const gameServer = this.getGameServerForScene(sceneId);

    if (!gameServer) {
      console.log(`[RoutingHandler] No game server found for scene ${sceneId}, using default`);
      return {
        success: true,
        gameServer: this.config.defaultGameServer,
      };
    }

    // Verify server is online and has capacity
    if (gameServer.status !== GameServerStatus.Online) {
      if (gameServer.status === GameServerStatus.Full) {
        return { success: false, error: 'Game server is full' };
      }
      if (gameServer.status === GameServerStatus.Maintenance) {
        return { success: false, error: 'Game server is in maintenance' };
      }
      return { success: false, error: 'Game server is offline' };
    }

    // Check capacity
    if (gameServer.playerCount >= gameServer.maxPlayers) {
      return { success: false, error: 'Game server is at capacity' };
    }

    // Update session with game server info
    try {
      await this.sessionStore.updateSession(session.token, {
        gameServer: {
          address: gameServer.address,
          port: gameServer.port,
        },
      });

      session.state = SessionState.Routed;

      // Publish routing notification
      if (session.characterId) {
        const message: PlayerRoutedMessage = {
          type: 'player_routed',
          accountId: session.accountId,
          characterId: session.characterId.toString(),
          gameServerId: gameServer.serverId,
          sceneId,
          timestamp: Date.now(),
        };
        await this.pubsub.publish('connection:player_routed', message);
      }

      console.log(
        `[RoutingHandler] Routed account ${session.accountId} to ` +
        `${gameServer.address}:${gameServer.port} for scene ${sceneId}`
      );

      return {
        success: true,
        gameServer: {
          address: gameServer.address,
          port: gameServer.port,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RoutingHandler] Failed to update session:', message);
      return { success: false, error: 'Failed to update session' };
    }
  }

  /**
   * Handle character selection
   * Updates the session with selected character and determines initial scene
   * @param session - Client session
   * @param characterId - Selected character ID
   * @param characterInfo - Character information (position, scene, etc.)
   * @returns Routing result
   */
  async handleSelectCharacter(
    session: ClientSession,
    characterId: bigint,
    characterInfo: CharacterInfo
  ): Promise<RoutingResult> {
    if (!session.accountId || !session.token) {
      return { success: false, error: 'Session not authenticated' };
    }

    // Verify character belongs to this account
    if (characterInfo.accountId !== session.accountId) {
      console.warn(
        `[RoutingHandler] Account ${session.accountId} attempted to select ` +
        `character ${characterId} belonging to account ${characterInfo.accountId}`
      );
      return { success: false, error: 'Character does not belong to this account' };
    }

    // Update session with character info
    session.characterId = characterId;
    session.state = SessionState.CharacterSelected;

    try {
      await this.sessionStore.updateSession(session.token, {
        characterId,
        lastActivity: Date.now(),
      });

      console.log(
        `[RoutingHandler] Character ${characterId} selected for account ${session.accountId} ` +
        `(scene: ${characterInfo.sceneId})`
      );

      // Route to the appropriate game server for this character's scene
      return this.routeToGameServer(session, characterInfo.sceneId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RoutingHandler] Failed to update session with character:', message);
      return { success: false, error: 'Failed to update session' };
    }
  }

  /**
   * Get the game server handling a specific scene
   * @param sceneId - Scene ID to look up
   * @returns Game server info or null if not found
   */
  getGameServerForScene(sceneId: string): GameServerInfo | null {
    const serverId = this.sceneToServer.get(sceneId);
    if (!serverId) {
      return null;
    }

    const server = this.gameServers.get(serverId);
    if (!server) {
      // Server ID mapping exists but server is not registered
      this.sceneToServer.delete(sceneId);
      return null;
    }

    // Check if server is stale (no heartbeat)
    const now = Date.now();
    if (now - server.lastHeartbeat > this.config.serverTimeout) {
      server.status = GameServerStatus.Offline;
      return null;
    }

    return server;
  }

  /**
   * Get all registered game servers
   * @returns Map of server ID to server info
   */
  getAllGameServers(): Map<string, GameServerInfo> {
    return new Map(this.gameServers);
  }

  /**
   * Get all online game servers
   * @returns Array of online game servers
   */
  getOnlineGameServers(): GameServerInfo[] {
    const now = Date.now();
    return Array.from(this.gameServers.values()).filter(
      (server) =>
        server.status === GameServerStatus.Online &&
        now - server.lastHeartbeat <= this.config.serverTimeout
    );
  }

  /**
   * Find the best game server for a scene (load balancing)
   * If multiple servers handle the same scene, pick the one with lowest load
   * @param sceneId - Scene ID
   * @returns Best available game server or null
   */
  findBestServerForScene(sceneId: string): GameServerInfo | null {
    const candidates: GameServerInfo[] = [];

    for (const server of this.gameServers.values()) {
      if (
        server.scenes.includes(sceneId) &&
        server.status === GameServerStatus.Online &&
        server.playerCount < server.maxPlayers
      ) {
        candidates.push(server);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by load (playerCount / maxPlayers ratio)
    candidates.sort((a, b) => {
      const loadA = a.playerCount / a.maxPlayers;
      const loadB = b.playerCount / b.maxPlayers;
      return loadA - loadB;
    });

    return candidates[0] ?? null;
  }

  /**
   * Prune stale game servers
   * @returns Number of servers pruned
   */
  pruneStaleServers(): number {
    const now = Date.now();
    const staleServerIds: string[] = [];

    for (const [serverId, server] of this.gameServers) {
      if (now - server.lastHeartbeat > this.config.serverTimeout) {
        staleServerIds.push(serverId);
      }
    }

    for (const serverId of staleServerIds) {
      this.unregisterGameServer(serverId);
    }

    if (staleServerIds.length > 0) {
      console.log(`[RoutingHandler] Pruned ${staleServerIds.length} stale game servers`);
    }

    return staleServerIds.length;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.pubsub.unsubscribe('gameserver:status');
    this.gameServers.clear();
    this.sceneToServer.clear();
    console.log('[RoutingHandler] Cleaned up');
  }
}

/**
 * Create a new routing handler instance
 */
export function createRoutingHandler(
  sessionStore: SessionStore,
  pubsub: PubSubManager,
  config?: RoutingHandlerConfig
): RoutingHandler {
  return new RoutingHandler(sessionStore, pubsub, config);
}
