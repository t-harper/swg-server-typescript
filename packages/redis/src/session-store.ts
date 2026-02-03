/**
 * @swg/redis - Session Store
 * Manages player sessions with Redis hash sets
 */

import { randomBytes } from 'crypto';
import type { Redis } from 'ioredis';
import { getRedisClient, type RedisClient } from './client.js';

/**
 * Session data interface matching @swg/shared-types
 */
export interface SessionData {
  accountId: number;
  stationId: number;
  characterId?: bigint;
  loginTime: number;
  lastActivity: number;
  connectionServer?: { address: string; port: number };
  gameServer?: { address: string; port: number };
}

/**
 * Data passed when creating a new session
 */
export interface SessionCreateData {
  characterId?: bigint;
  connectionServer?: { address: string; port: number };
  gameServer?: { address: string; port: number };
}

/**
 * Partial session data for updates
 */
export type SessionUpdateData = Partial<Omit<SessionData, 'accountId' | 'stationId' | 'loginTime'>>;

/**
 * Internal serialized format for Redis storage
 */
interface SerializedSessionData {
  accountId: string;
  stationId: string;
  characterId?: string;
  loginTime: string;
  lastActivity: string;
  connectionServer?: string;
  gameServer?: string;
}

/**
 * Session store configuration
 */
export interface SessionStoreConfig {
  /** Default TTL in seconds (default: 3600 = 1 hour) */
  defaultTtlSeconds?: number;
  /** Key prefix for sessions (default: 'session:') */
  keyPrefix?: string;
  /** Token length in bytes (default: 32, produces 64 hex chars) */
  tokenLength?: number;
}

/**
 * SessionStore manages player sessions using Redis hash sets
 */
export class SessionStore {
  private readonly redis: Redis;
  private readonly config: Required<SessionStoreConfig>;
  private readonly sessionPrefix: string;
  private readonly accountIndexPrefix: string;

  constructor(redisClient?: RedisClient, config: SessionStoreConfig = {}) {
    const client = redisClient ?? getRedisClient();
    this.redis = client.getClient();

    this.config = {
      defaultTtlSeconds: config.defaultTtlSeconds ?? 3600, // 1 hour
      keyPrefix: config.keyPrefix ?? 'session:',
      tokenLength: config.tokenLength ?? 32,
    };

    this.sessionPrefix = this.config.keyPrefix;
    this.accountIndexPrefix = `${this.config.keyPrefix}account:`;
  }

  /**
   * Generate a cryptographically secure session token
   */
  private generateToken(): string {
    return randomBytes(this.config.tokenLength).toString('hex');
  }

  /**
   * Get the Redis key for a session token
   */
  private getSessionKey(token: string): string {
    return `${this.sessionPrefix}${token}`;
  }

  /**
   * Get the Redis key for an account index
   */
  private getAccountIndexKey(accountId: number): string {
    return `${this.accountIndexPrefix}${accountId}`;
  }

  /**
   * Serialize session data for Redis storage
   * Converts bigint and objects to strings
   */
  private serialize(data: SessionData): SerializedSessionData {
    const serialized: SerializedSessionData = {
      accountId: data.accountId.toString(),
      stationId: data.stationId.toString(),
      loginTime: data.loginTime.toString(),
      lastActivity: data.lastActivity.toString(),
    };

    if (data.characterId !== undefined) {
      serialized.characterId = data.characterId.toString();
    }

    if (data.connectionServer !== undefined) {
      serialized.connectionServer = JSON.stringify(data.connectionServer);
    }

    if (data.gameServer !== undefined) {
      serialized.gameServer = JSON.stringify(data.gameServer);
    }

    return serialized;
  }

  /**
   * Deserialize session data from Redis storage
   */
  private deserialize(data: Record<string, string>): SessionData | null {
    const accountIdStr = data['accountId'];
    const stationIdStr = data['stationId'];
    const loginTimeStr = data['loginTime'];
    const lastActivityStr = data['lastActivity'];

    if (!accountIdStr || !stationIdStr || !loginTimeStr || !lastActivityStr) {
      return null;
    }

    const session: SessionData = {
      accountId: parseInt(accountIdStr, 10),
      stationId: parseInt(stationIdStr, 10),
      loginTime: parseInt(loginTimeStr, 10),
      lastActivity: parseInt(lastActivityStr, 10),
    };

    const characterIdStr = data['characterId'];
    if (characterIdStr) {
      session.characterId = BigInt(characterIdStr);
    }

    const connectionServerStr = data['connectionServer'];
    if (connectionServerStr) {
      session.connectionServer = JSON.parse(connectionServerStr) as { address: string; port: number };
    }

    const gameServerStr = data['gameServer'];
    if (gameServerStr) {
      session.gameServer = JSON.parse(gameServerStr) as { address: string; port: number };
    }

    return session;
  }

  /**
   * Create a new session for a player
   * @param accountId - The account ID
   * @param stationId - The station ID
   * @param data - Optional additional session data
   * @returns The generated session token
   */
  async createSession(
    accountId: number,
    stationId: number,
    data: SessionCreateData = {}
  ): Promise<string> {
    const token = this.generateToken();
    const sessionKey = this.getSessionKey(token);
    const accountIndexKey = this.getAccountIndexKey(accountId);
    const now = Date.now();

    const sessionData: SessionData = {
      accountId,
      stationId,
      loginTime: now,
      lastActivity: now,
      ...data,
    };

    const serialized = this.serialize(sessionData);

    // Use a pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Store session data as hash
    pipeline.hset(sessionKey, serialized as unknown as Record<string, string>);
    pipeline.expire(sessionKey, this.config.defaultTtlSeconds);

    // Store account -> token mapping for reverse lookup
    // Delete any existing session for this account first
    const existingToken = await this.redis.get(accountIndexKey);
    if (existingToken) {
      pipeline.del(this.getSessionKey(existingToken));
    }

    pipeline.set(accountIndexKey, token, 'EX', this.config.defaultTtlSeconds);

    await pipeline.exec();

    return token;
  }

  /**
   * Get session data by token
   * @param token - The session token
   * @returns Session data or null if not found
   */
  async getSession(token: string): Promise<SessionData | null> {
    const sessionKey = this.getSessionKey(token);
    const data = await this.redis.hgetall(sessionKey);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return this.deserialize(data);
  }

  /**
   * Update session data (partial update)
   * @param token - The session token
   * @param data - Partial session data to update
   * @returns True if session exists and was updated
   */
  async updateSession(token: string, data: SessionUpdateData): Promise<boolean> {
    const sessionKey = this.getSessionKey(token);

    // Check if session exists
    const exists = await this.redis.exists(sessionKey);
    if (!exists) {
      return false;
    }

    // Build update object with serialized values
    const updates: Record<string, string> = {
      lastActivity: Date.now().toString(),
    };

    if (data.characterId !== undefined) {
      updates['characterId'] = data.characterId.toString();
    }

    if (data.lastActivity !== undefined) {
      updates['lastActivity'] = data.lastActivity.toString();
    }

    if (data.connectionServer !== undefined) {
      updates['connectionServer'] = JSON.stringify(data.connectionServer);
    }

    if (data.gameServer !== undefined) {
      updates['gameServer'] = JSON.stringify(data.gameServer);
    }

    await this.redis.hset(sessionKey, updates);
    return true;
  }

  /**
   * Delete a session
   * @param token - The session token
   * @returns True if session existed and was deleted
   */
  async deleteSession(token: string): Promise<boolean> {
    const sessionKey = this.getSessionKey(token);

    // Get session to find account ID for index cleanup
    const session = await this.getSession(token);
    if (!session) {
      return false;
    }

    const accountIndexKey = this.getAccountIndexKey(session.accountId);

    // Delete both session and account index
    const pipeline = this.redis.pipeline();
    pipeline.del(sessionKey);
    pipeline.del(accountIndexKey);
    await pipeline.exec();

    return true;
  }

  /**
   * Refresh session TTL
   * @param token - The session token
   * @param ttlSeconds - Optional custom TTL (uses default if not provided)
   * @returns True if session exists and TTL was refreshed
   */
  async refreshSession(token: string, ttlSeconds?: number): Promise<boolean> {
    const sessionKey = this.getSessionKey(token);
    const ttl = ttlSeconds ?? this.config.defaultTtlSeconds;

    // Check if session exists
    const exists = await this.redis.exists(sessionKey);
    if (!exists) {
      return false;
    }

    // Get session to update account index TTL too
    const session = await this.getSession(token);
    if (!session) {
      return false;
    }

    const accountIndexKey = this.getAccountIndexKey(session.accountId);

    // Update TTL and lastActivity
    const pipeline = this.redis.pipeline();
    pipeline.expire(sessionKey, ttl);
    pipeline.expire(accountIndexKey, ttl);
    pipeline.hset(sessionKey, 'lastActivity', Date.now().toString());
    await pipeline.exec();

    return true;
  }

  /**
   * Get session by account ID
   * @param accountId - The account ID
   * @returns Session data or null if not found
   */
  async getSessionByAccountId(accountId: number): Promise<SessionData | null> {
    const accountIndexKey = this.getAccountIndexKey(accountId);
    const token = await this.redis.get(accountIndexKey);

    if (!token) {
      return null;
    }

    return this.getSession(token);
  }

  /**
   * Get session token by account ID
   * @param accountId - The account ID
   * @returns Session token or null if not found
   */
  async getTokenByAccountId(accountId: number): Promise<string | null> {
    const accountIndexKey = this.getAccountIndexKey(accountId);
    return this.redis.get(accountIndexKey);
  }

  /**
   * Check if a session exists
   * @param token - The session token
   * @returns True if session exists
   */
  async sessionExists(token: string): Promise<boolean> {
    const sessionKey = this.getSessionKey(token);
    const exists = await this.redis.exists(sessionKey);
    return exists === 1;
  }

  /**
   * Get remaining TTL for a session
   * @param token - The session token
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async getSessionTtl(token: string): Promise<number> {
    const sessionKey = this.getSessionKey(token);
    return this.redis.ttl(sessionKey);
  }

  /**
   * Get all active session tokens (use sparingly - scans keys)
   * @returns Array of session tokens
   */
  async getAllSessionTokens(): Promise<string[]> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);

    // Filter out account index keys and extract tokens
    return keys
      .filter(key => !key.includes('account:'))
      .map(key => key.replace(this.sessionPrefix, ''));
  }

  /**
   * Count active sessions
   * @returns Number of active sessions
   */
  async countSessions(): Promise<number> {
    const tokens = await this.getAllSessionTokens();
    return tokens.length;
  }

  /**
   * Delete all sessions (use with caution!)
   * @returns Number of sessions deleted
   */
  async deleteAllSessions(): Promise<number> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    await this.redis.del(...keys);
    return keys.length;
  }
}

/**
 * Create a new session store instance
 */
export function createSessionStore(
  redisClient?: RedisClient,
  config?: SessionStoreConfig
): SessionStore {
  return new SessionStore(redisClient, config);
}
