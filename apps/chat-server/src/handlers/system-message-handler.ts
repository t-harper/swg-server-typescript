/**
 * System Message Handler
 * Handles system messages, announcements, and categorized game notifications
 */

import type { PubSubManager } from '@swg/redis';

/**
 * System message types
 */
export enum SystemMessageType {
  /** General system notification */
  System = 'system',
  /** Combat-related messages (damage, kills, etc.) */
  Combat = 'combat',
  /** Harvesting and resource gathering */
  Harvest = 'harvest',
  /** Group/party messages */
  Group = 'group',
  /** Guild messages */
  Guild = 'guild',
  /** Server-wide announcements */
  Broadcast = 'broadcast',
  /** Error messages */
  Error = 'error',
  /** Mission/quest updates */
  Mission = 'mission',
  /** Trade and bazaar notifications */
  Trade = 'trade',
  /** Spatial/world events */
  Spatial = 'spatial',
  /** Skill and experience gains */
  Skill = 'skill',
  /** Crafting messages */
  Crafting = 'crafting',
  /** Faction/PvP messages */
  Faction = 'faction',
}

/**
 * Message priority levels
 */
export enum MessagePriority {
  /** Low priority - can be filtered */
  Low = 0,
  /** Normal priority */
  Normal = 1,
  /** High priority - always shown */
  High = 2,
  /** Critical - cannot be ignored */
  Critical = 3,
}

/**
 * System message structure
 */
export interface SystemMessage {
  /** Unique message ID */
  messageId: string;
  /** Message type category */
  type: SystemMessageType;
  /** Message text content */
  text: string;
  /** Priority level */
  priority: MessagePriority;
  /** Optional sender name (for attributed messages) */
  senderName?: string;
  /** Optional target recipients (empty = broadcast to scope) */
  targetIds?: bigint[];
  /** Optional zone restriction */
  zoneId?: string;
  /** Timestamp */
  timestamp: number;
  /** Optional custom color (0xRRGGBB) */
  color?: number;
  /** Whether to show in system tray */
  showInTray?: boolean;
  /** Optional string ID for localization */
  stringId?: string;
  /** Optional parameters for string formatting */
  stringParams?: Record<string, string>;
}

/**
 * Broadcast scope for announcements
 */
export enum BroadcastScope {
  /** All connected players on all servers */
  Global = 'global',
  /** All players on this server cluster */
  Cluster = 'cluster',
  /** All players in a specific zone */
  Zone = 'zone',
  /** Specific player list */
  Players = 'players',
}

/**
 * Broadcast announcement structure
 */
export interface BroadcastAnnouncement {
  /** Announcement ID */
  announcementId: string;
  /** Announcement text */
  text: string;
  /** Broadcast scope */
  scope: BroadcastScope;
  /** Source of announcement (admin name, system, etc.) */
  source: string;
  /** Optional zone for zone-scoped broadcasts */
  zoneId?: string;
  /** Optional player IDs for player-scoped broadcasts */
  playerIds?: bigint[];
  /** Priority */
  priority: MessagePriority;
  /** Timestamp */
  timestamp: number;
}

/**
 * Pub/Sub message for cross-server system messages
 */
export interface SystemMessagePubSubMessage {
  type: 'system_message';
  message: SystemMessage;
}

/**
 * Pub/Sub message for broadcast announcements
 */
export interface BroadcastPubSubMessage {
  type: 'broadcast';
  announcement: BroadcastAnnouncement;
}

/**
 * Combat spam message for damage/effects
 */
export interface CombatSpamMessage {
  /** Attacker object ID */
  attackerId: bigint;
  /** Attacker name */
  attackerName: string;
  /** Defender object ID */
  defenderId: bigint;
  /** Defender name */
  defenderName: string;
  /** Damage amount */
  damage: number;
  /** Damage type (kinetic, energy, etc.) */
  damageType: string;
  /** Attack name/ability */
  attackName: string;
  /** Whether it was a critical hit */
  critical: boolean;
  /** Whether the attack was blocked/parried/dodged */
  result: 'hit' | 'miss' | 'dodge' | 'parry' | 'block' | 'glancing';
  /** Timestamp */
  timestamp: number;
}

/**
 * Recipient callback for message delivery
 */
export interface MessageRecipient {
  /** Character object ID */
  objectId: bigint;
  /** Character name */
  name: string;
  /** Current zone ID */
  zoneId: string;
  /** Guild ID if in a guild */
  guildId?: bigint;
  /** Group ID if in a group */
  groupId?: bigint;
  /** Message filters/preferences */
  messageFilters: Set<SystemMessageType>;
  /** Callback to send message */
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * System message handler configuration
 */
export interface SystemMessageHandlerConfig {
  /** Server ID for message routing */
  serverId: string;
  /** Cluster ID for cluster-wide broadcasts */
  clusterId: string;
  /** Enable spam filtering (default: true) */
  enableSpamFiltering?: boolean;
  /** Maximum messages per second per type (default: 10) */
  maxMessagesPerSecond?: number;
}

/**
 * SystemMessageHandler manages system notifications and broadcasts
 */
export class SystemMessageHandler {
  private readonly pubsub: PubSubManager;
  private readonly config: Required<SystemMessageHandlerConfig>;
  private readonly recipients: Map<bigint, MessageRecipient> = new Map();
  private readonly zoneRecipients: Map<string, Set<bigint>> = new Map();
  private readonly guildRecipients: Map<bigint, Set<bigint>> = new Map();
  private readonly groupRecipients: Map<bigint, Set<bigint>> = new Map();
  private messageIdCounter: number = 0;

  // Spam tracking
  private readonly messageRateLimits: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor(pubsub: PubSubManager, config: SystemMessageHandlerConfig) {
    this.pubsub = pubsub;
    this.config = {
      serverId: config.serverId,
      clusterId: config.clusterId,
      enableSpamFiltering: config.enableSpamFiltering ?? true,
      maxMessagesPerSecond: config.maxMessagesPerSecond ?? 10,
    };
  }

  /**
   * Initialize the handler and subscribe to message channels
   */
  async initialize(): Promise<void> {
    // Subscribe to system messages from other servers
    await this.pubsub.subscribe<SystemMessagePubSubMessage>(
      'chat:system',
      (message) => this.handleRemoteSystemMessage(message)
    );

    // Subscribe to broadcast announcements
    await this.pubsub.subscribe<BroadcastPubSubMessage>(
      'chat:broadcast',
      (message) => this.handleRemoteBroadcast(message)
    );

    console.log('[SystemMessageHandler] Initialized');
  }

  /**
   * Register a recipient for system messages
   */
  registerRecipient(recipient: MessageRecipient): void {
    this.recipients.set(recipient.objectId, recipient);

    // Add to zone index
    this.addToIndex(this.zoneRecipients, recipient.zoneId, recipient.objectId);

    // Add to guild index if applicable
    if (recipient.guildId) {
      this.addToIndex(this.guildRecipients, recipient.guildId, recipient.objectId);
    }

    // Add to group index if applicable
    if (recipient.groupId) {
      this.addToIndex(this.groupRecipients, recipient.groupId, recipient.objectId);
    }

    console.log(
      `[SystemMessageHandler] Registered recipient ${recipient.name} (${recipient.objectId})`
    );
  }

  /**
   * Unregister a recipient from system messages
   */
  unregisterRecipient(objectId: bigint): void {
    const recipient = this.recipients.get(objectId);
    if (recipient) {
      this.removeFromIndex(this.zoneRecipients, recipient.zoneId, objectId);

      if (recipient.guildId) {
        this.removeFromIndex(this.guildRecipients, recipient.guildId, objectId);
      }

      if (recipient.groupId) {
        this.removeFromIndex(this.groupRecipients, recipient.groupId, objectId);
      }

      this.recipients.delete(objectId);
      console.log(
        `[SystemMessageHandler] Unregistered recipient ${recipient.name} (${objectId})`
      );
    }
  }

  /**
   * Update recipient's zone
   */
  updateRecipientZone(objectId: bigint, newZoneId: string): void {
    const recipient = this.recipients.get(objectId);
    if (recipient && recipient.zoneId !== newZoneId) {
      this.removeFromIndex(this.zoneRecipients, recipient.zoneId, objectId);
      this.addToIndex(this.zoneRecipients, newZoneId, objectId);
      recipient.zoneId = newZoneId;
    }
  }

  /**
   * Update recipient's group
   */
  updateRecipientGroup(objectId: bigint, groupId: bigint | undefined): void {
    const recipient = this.recipients.get(objectId);
    if (!recipient) return;

    // Remove from old group
    if (recipient.groupId) {
      this.removeFromIndex(this.groupRecipients, recipient.groupId, objectId);
    }

    // Add to new group
    if (groupId) {
      this.addToIndex(this.groupRecipients, groupId, objectId);
    }

    recipient.groupId = groupId;
  }

  /**
   * Update recipient's guild
   */
  updateRecipientGuild(objectId: bigint, guildId: bigint | undefined): void {
    const recipient = this.recipients.get(objectId);
    if (!recipient) return;

    // Remove from old guild
    if (recipient.guildId) {
      this.removeFromIndex(this.guildRecipients, recipient.guildId, objectId);
    }

    // Add to new guild
    if (guildId) {
      this.addToIndex(this.guildRecipients, guildId, objectId);
    }

    recipient.guildId = guildId;
  }

  /**
   * Send a system message to specific recipients
   */
  async sendSystemMessage(
    type: SystemMessageType,
    text: string,
    options: {
      priority?: MessagePriority;
      targetIds?: bigint[];
      zoneId?: string;
      senderName?: string;
      color?: number;
      showInTray?: boolean;
      stringId?: string;
      stringParams?: Record<string, string>;
    } = {}
  ): Promise<number> {
    // Check rate limiting
    if (this.config.enableSpamFiltering && !this.checkRateLimit(type)) {
      return 0;
    }

    const message: SystemMessage = {
      messageId: this.generateMessageId(),
      type,
      text,
      priority: options.priority ?? MessagePriority.Normal,
      targetIds: options.targetIds,
      zoneId: options.zoneId,
      senderName: options.senderName,
      color: options.color,
      showInTray: options.showInTray,
      stringId: options.stringId,
      stringParams: options.stringParams,
      timestamp: Date.now(),
    };

    // Deliver locally
    const deliveredCount = this.deliverSystemMessage(message);

    // Publish for cross-server delivery
    const pubsubMessage: SystemMessagePubSubMessage = {
      type: 'system_message',
      message,
    };
    await this.pubsub.publish('chat:system', pubsubMessage);

    return deliveredCount;
  }

  /**
   * Send a combat spam message
   */
  async sendCombatSpam(combat: CombatSpamMessage): Promise<void> {
    // Format combat message
    let text: string;
    switch (combat.result) {
      case 'hit':
        text = combat.critical
          ? `${combat.attackerName} critically hits ${combat.defenderName} with ${combat.attackName} for ${combat.damage} ${combat.damageType} damage!`
          : `${combat.attackerName} hits ${combat.defenderName} with ${combat.attackName} for ${combat.damage} ${combat.damageType} damage.`;
        break;
      case 'miss':
        text = `${combat.attackerName} misses ${combat.defenderName} with ${combat.attackName}.`;
        break;
      case 'dodge':
        text = `${combat.defenderName} dodges ${combat.attackerName}'s ${combat.attackName}.`;
        break;
      case 'parry':
        text = `${combat.defenderName} parries ${combat.attackerName}'s ${combat.attackName}.`;
        break;
      case 'block':
        text = `${combat.defenderName} blocks ${combat.attackerName}'s ${combat.attackName}.`;
        break;
      case 'glancing':
        text = `${combat.attackerName}'s ${combat.attackName} glances off ${combat.defenderName} for ${combat.damage} ${combat.damageType} damage.`;
        break;
    }

    // Send to attacker and defender
    await this.sendSystemMessage(SystemMessageType.Combat, text, {
      targetIds: [combat.attackerId, combat.defenderId],
      priority: MessagePriority.Normal,
    });
  }

  /**
   * Send a group message
   */
  async sendGroupMessage(
    groupId: bigint,
    text: string,
    senderName?: string
  ): Promise<number> {
    const groupMembers = this.groupRecipients.get(groupId);
    if (!groupMembers || groupMembers.size === 0) {
      return 0;
    }

    return this.sendSystemMessage(SystemMessageType.Group, text, {
      targetIds: Array.from(groupMembers),
      senderName,
      priority: MessagePriority.Normal,
    });
  }

  /**
   * Send a guild message
   */
  async sendGuildMessage(
    guildId: bigint,
    text: string,
    senderName?: string
  ): Promise<number> {
    const guildMembers = this.guildRecipients.get(guildId);
    if (!guildMembers || guildMembers.size === 0) {
      return 0;
    }

    return this.sendSystemMessage(SystemMessageType.Guild, text, {
      targetIds: Array.from(guildMembers),
      senderName,
      priority: MessagePriority.Normal,
    });
  }

  /**
   * Broadcast a server announcement
   */
  async broadcastAnnouncement(
    text: string,
    scope: BroadcastScope,
    options: {
      source?: string;
      zoneId?: string;
      playerIds?: bigint[];
      priority?: MessagePriority;
    } = {}
  ): Promise<number> {
    const announcement: BroadcastAnnouncement = {
      announcementId: this.generateMessageId(),
      text,
      scope,
      source: options.source ?? 'System',
      zoneId: options.zoneId,
      playerIds: options.playerIds,
      priority: options.priority ?? MessagePriority.High,
      timestamp: Date.now(),
    };

    // Deliver locally
    const deliveredCount = this.deliverBroadcast(announcement);

    // Publish for cross-server delivery (except for player-specific)
    if (scope !== BroadcastScope.Players) {
      const pubsubMessage: BroadcastPubSubMessage = {
        type: 'broadcast',
        announcement,
      };
      await this.pubsub.publish('chat:broadcast', pubsubMessage);
    }

    console.log(
      `[SystemMessageHandler] Broadcast from ${announcement.source}: "${text}" (${deliveredCount} local recipients)`
    );

    return deliveredCount;
  }

  /**
   * Deliver a system message to local recipients
   */
  private deliverSystemMessage(message: SystemMessage): number {
    let recipients: bigint[];

    if (message.targetIds && message.targetIds.length > 0) {
      // Specific targets
      recipients = message.targetIds;
    } else if (message.zoneId) {
      // Zone-wide
      recipients = Array.from(this.zoneRecipients.get(message.zoneId) ?? []);
    } else {
      // All local recipients
      recipients = Array.from(this.recipients.keys());
    }

    let deliveredCount = 0;
    for (const objectId of recipients) {
      const recipient = this.recipients.get(objectId);
      if (!recipient) continue;

      // Check message filters (unless high priority)
      if (
        message.priority < MessagePriority.High &&
        recipient.messageFilters.has(message.type)
      ) {
        continue;
      }

      if (recipient.sendCallback) {
        const data = this.serializeSystemMessage(message);
        recipient.sendCallback(data);
        deliveredCount++;
      }
    }

    return deliveredCount;
  }

  /**
   * Deliver a broadcast to local recipients
   */
  private deliverBroadcast(announcement: BroadcastAnnouncement): number {
    let recipients: bigint[];

    switch (announcement.scope) {
      case BroadcastScope.Global:
      case BroadcastScope.Cluster:
        recipients = Array.from(this.recipients.keys());
        break;
      case BroadcastScope.Zone:
        recipients = Array.from(
          this.zoneRecipients.get(announcement.zoneId ?? '') ?? []
        );
        break;
      case BroadcastScope.Players:
        recipients = announcement.playerIds ?? [];
        break;
    }

    let deliveredCount = 0;
    for (const objectId of recipients) {
      const recipient = this.recipients.get(objectId);
      if (!recipient?.sendCallback) continue;

      const data = this.serializeBroadcast(announcement);
      recipient.sendCallback(data);
      deliveredCount++;
    }

    return deliveredCount;
  }

  /**
   * Handle system message from another server
   */
  private handleRemoteSystemMessage(pubsubMessage: SystemMessagePubSubMessage): void {
    this.deliverSystemMessage(pubsubMessage.message);
  }

  /**
   * Handle broadcast from another server
   */
  private handleRemoteBroadcast(pubsubMessage: BroadcastPubSubMessage): void {
    this.deliverBroadcast(pubsubMessage.announcement);
  }

  /**
   * Check rate limiting for a message type
   */
  private checkRateLimit(type: SystemMessageType): boolean {
    const now = Date.now();
    const key = type;
    const limit = this.messageRateLimits.get(key);

    if (!limit || now > limit.resetTime) {
      this.messageRateLimits.set(key, {
        count: 1,
        resetTime: now + 1000, // 1 second window
      });
      return true;
    }

    if (limit.count >= this.config.maxMessagesPerSecond) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Add an object to an index map
   */
  private addToIndex<K>(
    index: Map<K, Set<bigint>>,
    key: K,
    objectId: bigint
  ): void {
    let set = index.get(key);
    if (!set) {
      set = new Set();
      index.set(key, set);
    }
    set.add(objectId);
  }

  /**
   * Remove an object from an index map
   */
  private removeFromIndex<K>(
    index: Map<K, Set<bigint>>,
    key: K,
    objectId: bigint
  ): void {
    const set = index.get(key);
    if (set) {
      set.delete(objectId);
      if (set.size === 0) {
        index.delete(key);
      }
    }
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    this.messageIdCounter++;
    return `${this.config.serverId}-${Date.now()}-${this.messageIdCounter}`;
  }

  /**
   * Serialize a system message for network transmission
   * TODO: Replace with proper protocol serialization
   */
  private serializeSystemMessage(message: SystemMessage): Uint8Array {
    // Placeholder - in production, use proper SWG protocol serialization
    const data = JSON.stringify(message);
    return new TextEncoder().encode(data);
  }

  /**
   * Serialize a broadcast for network transmission
   * TODO: Replace with proper protocol serialization
   */
  private serializeBroadcast(announcement: BroadcastAnnouncement): Uint8Array {
    // Placeholder - in production, use proper SWG protocol serialization
    const data = JSON.stringify(announcement);
    return new TextEncoder().encode(data);
  }

  /**
   * Get recipient count
   */
  getRecipientCount(): number {
    return this.recipients.size;
  }

  /**
   * Get group count
   */
  getGroupCount(): number {
    return this.groupRecipients.size;
  }

  /**
   * Get guild count
   */
  getGuildCount(): number {
    return this.guildRecipients.size;
  }

  /**
   * Clean up handler
   */
  async cleanup(): Promise<void> {
    await this.pubsub.unsubscribe('chat:system');
    await this.pubsub.unsubscribe('chat:broadcast');
    this.recipients.clear();
    this.zoneRecipients.clear();
    this.guildRecipients.clear();
    this.groupRecipients.clear();
    this.messageRateLimits.clear();
    console.log('[SystemMessageHandler] Cleaned up');
  }
}

/**
 * Create a new SystemMessageHandler instance
 */
export function createSystemMessageHandler(
  pubsub: PubSubManager,
  config: SystemMessageHandlerConfig
): SystemMessageHandler {
  return new SystemMessageHandler(pubsub, config);
}
