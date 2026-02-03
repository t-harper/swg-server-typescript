/**
 * @swg/redis - Pub/Sub Manager
 * Provides typed pub/sub messaging for inter-process communication
 */

import type { Redis } from 'ioredis';
import { getRedisClient, type RedisClient } from './client.js';

/**
 * Message handler callback type
 */
export type MessageHandler<T = unknown> = (message: T, channel: string) => void | Promise<void>;

/**
 * Pattern message handler callback type
 */
export type PatternMessageHandler<T = unknown> = (
  message: T,
  channel: string,
  pattern: string
) => void | Promise<void>;

/**
 * Subscription entry for tracking handlers
 */
interface SubscriptionEntry {
  handler: MessageHandler;
  isPattern: boolean;
}

/**
 * Pub/Sub configuration
 */
export interface PubSubConfig {
  /** Channel prefix for namespacing (default: 'swg:') */
  channelPrefix?: string;
  /** Enable JSON parsing of messages (default: true) */
  parseJson?: boolean;
  /** Error handler for subscription errors */
  onError?: (error: Error, channel: string) => void;
}

/**
 * PubSubManager handles Redis pub/sub with typed messages
 */
export class PubSubManager {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly config: Required<Omit<PubSubConfig, 'onError'>> & { onError?: PubSubConfig['onError'] };
  private readonly subscriptions: Map<string, Set<SubscriptionEntry>>;
  private readonly patternSubscriptions: Map<string, Set<SubscriptionEntry>>;
  private isInitialized: boolean = false;

  constructor(redisClient?: RedisClient, config: PubSubConfig = {}) {
    const client = redisClient ?? getRedisClient();

    // Use separate connections for pub and sub (required by Redis)
    this.publisher = client.getClient();
    this.subscriber = client.duplicate();

    this.config = {
      channelPrefix: config.channelPrefix ?? 'swg:',
      parseJson: config.parseJson ?? true,
      onError: config.onError,
    };

    this.subscriptions = new Map();
    this.patternSubscriptions = new Map();
  }

  /**
   * Initialize the subscriber with message handlers
   * Called automatically on first subscription
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Handle regular channel messages
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message, false);
    });

    // Handle pattern messages
    this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      this.handlePatternMessage(pattern, channel, message);
    });

    // Handle subscription errors
    this.subscriber.on('error', (error: Error) => {
      console.error('[PubSub] Subscriber error:', error.message);
      if (this.config.onError) {
        this.config.onError(error, 'subscriber');
      }
    });

    this.isInitialized = true;
  }

  /**
   * Get the full channel name with prefix
   */
  private getChannelName(channel: string): string {
    return `${this.config.channelPrefix}${channel}`;
  }

  /**
   * Parse a message from string to typed value
   */
  private parseMessage<T>(message: string): T {
    if (!this.config.parseJson) {
      return message as T;
    }

    try {
      return JSON.parse(message) as T;
    } catch {
      // If JSON parsing fails, return as string
      return message as T;
    }
  }

  /**
   * Handle incoming messages for regular subscriptions
   */
  private handleMessage(channel: string, message: string, isPattern: boolean): void {
    const entries = this.subscriptions.get(channel);
    if (!entries) {
      return;
    }

    const parsed = this.parseMessage(message);

    for (const entry of entries) {
      if (entry.isPattern === isPattern) {
        try {
          void entry.handler(parsed, channel);
        } catch (error) {
          console.error('[PubSub] Handler error:', error);
          if (this.config.onError) {
            this.config.onError(error as Error, channel);
          }
        }
      }
    }
  }

  /**
   * Handle incoming messages for pattern subscriptions
   */
  private handlePatternMessage(pattern: string, channel: string, message: string): void {
    const entries = this.patternSubscriptions.get(pattern);
    if (!entries) {
      return;
    }

    const parsed = this.parseMessage(message);

    for (const entry of entries) {
      try {
        void entry.handler(parsed, channel);
      } catch (error) {
        console.error('[PubSub] Pattern handler error:', error);
        if (this.config.onError) {
          this.config.onError(error as Error, channel);
        }
      }
    }
  }

  /**
   * Subscribe to a channel
   * @param channel - Channel name (without prefix)
   * @param handler - Message handler callback
   */
  async subscribe<T = unknown>(channel: string, handler: MessageHandler<T>): Promise<void> {
    this.initialize();

    const fullChannel = this.getChannelName(channel);

    // Add handler to subscription map
    let entries = this.subscriptions.get(fullChannel);
    if (!entries) {
      entries = new Set();
      this.subscriptions.set(fullChannel, entries);

      // Only subscribe to Redis if this is the first handler for this channel
      await this.subscriber.subscribe(fullChannel);
    }

    entries.add({
      handler: handler as MessageHandler,
      isPattern: false,
    });
  }

  /**
   * Subscribe to a pattern (e.g., 'server:*')
   * @param pattern - Pattern to match (without prefix)
   * @param handler - Message handler callback
   */
  async subscribePattern<T = unknown>(
    pattern: string,
    handler: PatternMessageHandler<T>
  ): Promise<void> {
    this.initialize();

    const fullPattern = this.getChannelName(pattern);

    // Add handler to pattern subscription map
    let entries = this.patternSubscriptions.get(fullPattern);
    if (!entries) {
      entries = new Set();
      this.patternSubscriptions.set(fullPattern, entries);

      // Only subscribe to Redis if this is the first handler for this pattern
      await this.subscriber.psubscribe(fullPattern);
    }

    entries.add({
      handler: ((message: T, channel: string) => {
        handler(message, channel, fullPattern);
      }) as MessageHandler,
      isPattern: true,
    });
  }

  /**
   * Unsubscribe from a channel
   * @param channel - Channel name (without prefix)
   * @param handler - Optional specific handler to remove (removes all if not provided)
   */
  async unsubscribe<T = unknown>(channel: string, handler?: MessageHandler<T>): Promise<void> {
    const fullChannel = this.getChannelName(channel);
    const entries = this.subscriptions.get(fullChannel);

    if (!entries) {
      return;
    }

    if (handler) {
      // Remove specific handler
      for (const entry of entries) {
        if (entry.handler === handler) {
          entries.delete(entry);
          break;
        }
      }

      // Only unsubscribe from Redis if no handlers remain
      if (entries.size === 0) {
        this.subscriptions.delete(fullChannel);
        await this.subscriber.unsubscribe(fullChannel);
      }
    } else {
      // Remove all handlers for this channel
      this.subscriptions.delete(fullChannel);
      await this.subscriber.unsubscribe(fullChannel);
    }
  }

  /**
   * Unsubscribe from a pattern
   * @param pattern - Pattern to unsubscribe from (without prefix)
   * @param handler - Optional specific handler to remove
   */
  async unsubscribePattern<T = unknown>(
    pattern: string,
    handler?: PatternMessageHandler<T>
  ): Promise<void> {
    const fullPattern = this.getChannelName(pattern);
    const entries = this.patternSubscriptions.get(fullPattern);

    if (!entries) {
      return;
    }

    if (handler) {
      // Remove specific handler - need to find by reference
      for (const entry of entries) {
        entries.delete(entry);
        break;
      }

      if (entries.size === 0) {
        this.patternSubscriptions.delete(fullPattern);
        await this.subscriber.punsubscribe(fullPattern);
      }
    } else {
      this.patternSubscriptions.delete(fullPattern);
      await this.subscriber.punsubscribe(fullPattern);
    }
  }

  /**
   * Publish a message to a channel
   * @param channel - Channel name (without prefix)
   * @param message - Message to publish (will be JSON serialized if parseJson is true)
   * @returns Number of clients that received the message
   */
  async publish<T = unknown>(channel: string, message: T): Promise<number> {
    const fullChannel = this.getChannelName(channel);
    const serialized = this.config.parseJson
      ? JSON.stringify(message)
      : String(message);

    return this.publisher.publish(fullChannel, serialized);
  }

  /**
   * Get the number of subscribers for a channel
   * @param channel - Channel name (without prefix)
   * @returns Number of subscribers
   */
  async getSubscriberCount(channel: string): Promise<number> {
    const fullChannel = this.getChannelName(channel);
    const result = await this.publisher.pubsub('NUMSUB', fullChannel);

    // Result is [channel, count, ...]
    if (Array.isArray(result) && result.length >= 2) {
      const count = result[1];
      return typeof count === 'number' ? count : parseInt(String(count), 10);
    }
    return 0;
  }

  /**
   * Get all active channels matching a pattern
   * @param pattern - Optional pattern to match (without prefix)
   * @returns Array of channel names (without prefix)
   */
  async getActiveChannels(pattern?: string): Promise<string[]> {
    const fullPattern = pattern
      ? this.getChannelName(pattern)
      : `${this.config.channelPrefix}*`;

    const channels = await this.publisher.pubsub('CHANNELS', fullPattern);

    if (!Array.isArray(channels)) {
      return [];
    }

    // Remove prefix from channel names
    const prefixLength = this.config.channelPrefix.length;
    return channels.map(ch => String(ch).substring(prefixLength));
  }

  /**
   * Check if subscribed to a channel
   * @param channel - Channel name (without prefix)
   */
  isSubscribed(channel: string): boolean {
    const fullChannel = this.getChannelName(channel);
    return this.subscriptions.has(fullChannel);
  }

  /**
   * Check if subscribed to a pattern
   * @param pattern - Pattern (without prefix)
   */
  isPatternSubscribed(pattern: string): boolean {
    const fullPattern = this.getChannelName(pattern);
    return this.patternSubscriptions.has(fullPattern);
  }

  /**
   * Get all subscribed channels
   * @returns Array of channel names (without prefix)
   */
  getSubscribedChannels(): string[] {
    const prefixLength = this.config.channelPrefix.length;
    return Array.from(this.subscriptions.keys()).map(ch => ch.substring(prefixLength));
  }

  /**
   * Get all subscribed patterns
   * @returns Array of patterns (without prefix)
   */
  getSubscribedPatterns(): string[] {
    const prefixLength = this.config.channelPrefix.length;
    return Array.from(this.patternSubscriptions.keys()).map(p => p.substring(prefixLength));
  }

  /**
   * Unsubscribe from all channels and patterns
   */
  async unsubscribeAll(): Promise<void> {
    // Unsubscribe from all channels
    for (const channel of this.subscriptions.keys()) {
      await this.subscriber.unsubscribe(channel);
    }
    this.subscriptions.clear();

    // Unsubscribe from all patterns
    for (const pattern of this.patternSubscriptions.keys()) {
      await this.subscriber.punsubscribe(pattern);
    }
    this.patternSubscriptions.clear();
  }

  /**
   * Close the pub/sub manager and disconnect subscriber
   */
  async close(): Promise<void> {
    await this.unsubscribeAll();
    await this.subscriber.quit();
    this.isInitialized = false;
  }
}

/**
 * Create a typed channel for type-safe pub/sub
 */
export interface TypedChannel<T> {
  subscribe(handler: MessageHandler<T>): Promise<void>;
  unsubscribe(handler?: MessageHandler<T>): Promise<void>;
  publish(message: T): Promise<number>;
}

/**
 * Create a typed channel wrapper for type-safe messaging
 * @param pubsub - PubSubManager instance
 * @param channel - Channel name
 * @returns Typed channel interface
 */
export function createTypedChannel<T>(
  pubsub: PubSubManager,
  channel: string
): TypedChannel<T> {
  return {
    subscribe: (handler: MessageHandler<T>) => pubsub.subscribe(channel, handler),
    unsubscribe: (handler?: MessageHandler<T>) => pubsub.unsubscribe(channel, handler),
    publish: (message: T) => pubsub.publish(channel, message),
  };
}

/**
 * Create a new PubSubManager instance
 */
export function createPubSubManager(
  redisClient?: RedisClient,
  config?: PubSubConfig
): PubSubManager {
  return new PubSubManager(redisClient, config);
}
