/**
 * Spatial Chat Handler
 * Handles spatial chat messages (say, yell, whisper) with range-based delivery
 */

import type { PubSubManager } from '@swg/redis';

/**
 * Chat types with their associated ranges (in meters)
 */
export enum SpatialChatType {
  /** Normal speech - 15 meter range */
  Say = 'say',
  /** Yelling - 80 meter range */
  Yell = 'yell',
  /** Whisper - 5 meter range */
  Whisper = 'whisper',
  /** Emote/mood - 15 meter range */
  Emote = 'emote',
}

/**
 * Chat range constants (in meters)
 */
export const ChatRanges: Record<SpatialChatType, number> = {
  [SpatialChatType.Say]: 15,
  [SpatialChatType.Yell]: 80,
  [SpatialChatType.Whisper]: 5,
  [SpatialChatType.Emote]: 15,
};

/**
 * Language comprehension levels
 */
export enum LanguageComprehension {
  /** Cannot understand at all */
  None = 0,
  /** Partial understanding (broken text) */
  Partial = 1,
  /** Full understanding */
  Full = 2,
}

/**
 * Player position for spatial calculations
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Chat participant information
 */
export interface ChatParticipant {
  /** Character object ID */
  objectId: bigint;
  /** Character name */
  name: string;
  /** Current position */
  position: Position;
  /** Current zone/planet ID */
  zoneId: string;
  /** Languages the character can speak */
  spokenLanguages: string[];
  /** Languages the character can comprehend */
  comprehendedLanguages: string[];
  /** Callback to send message to this participant */
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * Spatial chat message structure
 */
export interface SpatialChatMessage {
  /** Unique message ID */
  messageId: string;
  /** Type of spatial chat */
  chatType: SpatialChatType;
  /** Sender object ID */
  senderId: bigint;
  /** Sender name */
  senderName: string;
  /** Message text */
  text: string;
  /** Language the message is spoken in */
  language: string;
  /** Optional mood/animation */
  mood?: string;
  /** Optional target object ID (for whisper/emote) */
  targetId?: bigint;
  /** Sender position at time of message */
  position: Position;
  /** Zone where message was sent */
  zoneId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Pub/Sub message for cross-server chat distribution
 */
export interface SpatialChatPubSubMessage {
  type: 'spatial_chat';
  message: SpatialChatMessage;
  range: number;
}

/**
 * Spatial chat delivery result
 */
export interface SpatialChatResult {
  /** Message was sent successfully */
  success: boolean;
  /** Number of recipients who received the message */
  recipientCount: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Spatial chat handler configuration
 */
export interface SpatialChatHandlerConfig {
  /** Server ID for message routing */
  serverId: string;
  /** Enable language filtering (default: true) */
  enableLanguageFiltering?: boolean;
  /** Default language if none specified */
  defaultLanguage?: string;
}

/**
 * SpatialChatHandler manages spatial chat messages
 * Handles range-based delivery, language filtering, and moods
 */
export class SpatialChatHandler {
  private readonly pubsub: PubSubManager;
  private readonly config: Required<SpatialChatHandlerConfig>;
  private readonly participants: Map<bigint, ChatParticipant> = new Map();
  private readonly zoneParticipants: Map<string, Set<bigint>> = new Map();
  private messageIdCounter: number = 0;

  constructor(pubsub: PubSubManager, config: SpatialChatHandlerConfig) {
    this.pubsub = pubsub;
    this.config = {
      serverId: config.serverId,
      enableLanguageFiltering: config.enableLanguageFiltering ?? true,
      defaultLanguage: config.defaultLanguage ?? 'basic',
    };
  }

  /**
   * Initialize the handler and subscribe to chat channels
   */
  async initialize(): Promise<void> {
    // Subscribe to spatial chat messages from other servers
    await this.pubsub.subscribe<SpatialChatPubSubMessage>(
      'chat:spatial',
      (message) => this.handleRemoteSpatialChat(message)
    );

    console.log('[SpatialChatHandler] Initialized');
  }

  /**
   * Register a participant for spatial chat
   */
  registerParticipant(participant: ChatParticipant): void {
    this.participants.set(participant.objectId, participant);

    // Add to zone index
    let zoneSet = this.zoneParticipants.get(participant.zoneId);
    if (!zoneSet) {
      zoneSet = new Set();
      this.zoneParticipants.set(participant.zoneId, zoneSet);
    }
    zoneSet.add(participant.objectId);

    console.log(
      `[SpatialChatHandler] Registered participant ${participant.name} (${participant.objectId}) in zone ${participant.zoneId}`
    );
  }

  /**
   * Unregister a participant from spatial chat
   */
  unregisterParticipant(objectId: bigint): void {
    const participant = this.participants.get(objectId);
    if (participant) {
      // Remove from zone index
      const zoneSet = this.zoneParticipants.get(participant.zoneId);
      if (zoneSet) {
        zoneSet.delete(objectId);
        if (zoneSet.size === 0) {
          this.zoneParticipants.delete(participant.zoneId);
        }
      }

      this.participants.delete(objectId);
      console.log(
        `[SpatialChatHandler] Unregistered participant ${participant.name} (${objectId})`
      );
    }
  }

  /**
   * Update a participant's position
   */
  updateParticipantPosition(objectId: bigint, position: Position, zoneId?: string): void {
    const participant = this.participants.get(objectId);
    if (!participant) {
      return;
    }

    // Handle zone change
    if (zoneId && zoneId !== participant.zoneId) {
      // Remove from old zone
      const oldZoneSet = this.zoneParticipants.get(participant.zoneId);
      if (oldZoneSet) {
        oldZoneSet.delete(objectId);
        if (oldZoneSet.size === 0) {
          this.zoneParticipants.delete(participant.zoneId);
        }
      }

      // Add to new zone
      let newZoneSet = this.zoneParticipants.get(zoneId);
      if (!newZoneSet) {
        newZoneSet = new Set();
        this.zoneParticipants.set(zoneId, newZoneSet);
      }
      newZoneSet.add(objectId);

      participant.zoneId = zoneId;
    }

    participant.position = position;
  }

  /**
   * Handle an outgoing spatial chat message
   */
  async handleSpatialChat(
    senderId: bigint,
    chatType: SpatialChatType,
    text: string,
    options: {
      language?: string;
      mood?: string;
      targetId?: bigint;
    } = {}
  ): Promise<SpatialChatResult> {
    const sender = this.participants.get(senderId);
    if (!sender) {
      return {
        success: false,
        recipientCount: 0,
        error: 'Sender not registered',
      };
    }

    // Validate text
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        recipientCount: 0,
        error: 'Empty message',
      };
    }

    // Check language proficiency
    const language = options.language ?? this.config.defaultLanguage;
    if (this.config.enableLanguageFiltering && !sender.spokenLanguages.includes(language)) {
      return {
        success: false,
        recipientCount: 0,
        error: `Cannot speak ${language}`,
      };
    }

    // Create message
    const message: SpatialChatMessage = {
      messageId: this.generateMessageId(),
      chatType,
      senderId,
      senderName: sender.name,
      text: text.trim(),
      language,
      mood: options.mood,
      targetId: options.targetId,
      position: { ...sender.position },
      zoneId: sender.zoneId,
      timestamp: Date.now(),
    };

    // Get chat range
    const range = ChatRanges[chatType];

    // Deliver to local participants
    const recipientCount = this.deliverLocalSpatialChat(message, range);

    // Publish for cross-server delivery
    const pubsubMessage: SpatialChatPubSubMessage = {
      type: 'spatial_chat',
      message,
      range,
    };
    await this.pubsub.publish('chat:spatial', pubsubMessage);

    console.log(
      `[SpatialChatHandler] ${sender.name} ${chatType}: "${text}" (${recipientCount} local recipients)`
    );

    return {
      success: true,
      recipientCount,
    };
  }

  /**
   * Handle whisper to a specific target
   */
  async handleWhisper(
    senderId: bigint,
    targetId: bigint,
    text: string,
    language?: string
  ): Promise<SpatialChatResult> {
    const sender = this.participants.get(senderId);
    const target = this.participants.get(targetId);

    if (!sender) {
      return {
        success: false,
        recipientCount: 0,
        error: 'Sender not registered',
      };
    }

    if (!target) {
      return {
        success: false,
        recipientCount: 0,
        error: 'Target not found',
      };
    }

    // Check if target is in range
    const distance = this.calculateDistance(sender.position, target.position);
    if (distance > ChatRanges[SpatialChatType.Whisper]) {
      return {
        success: false,
        recipientCount: 0,
        error: 'Target is out of range',
      };
    }

    // Check if in same zone
    if (sender.zoneId !== target.zoneId) {
      return {
        success: false,
        recipientCount: 0,
        error: 'Target is in a different zone',
      };
    }

    return this.handleSpatialChat(senderId, SpatialChatType.Whisper, text, {
      language,
      targetId,
    });
  }

  /**
   * Deliver spatial chat to local participants within range
   */
  private deliverLocalSpatialChat(message: SpatialChatMessage, range: number): number {
    const zoneParticipants = this.zoneParticipants.get(message.zoneId);
    if (!zoneParticipants) {
      return 0;
    }

    let recipientCount = 0;

    for (const objectId of zoneParticipants) {
      // Skip sender
      if (objectId === message.senderId) {
        continue;
      }

      const recipient = this.participants.get(objectId);
      if (!recipient) {
        continue;
      }

      // For whispers, only deliver to target
      if (message.chatType === SpatialChatType.Whisper && message.targetId !== objectId) {
        continue;
      }

      // Check range
      const distance = this.calculateDistance(message.position, recipient.position);
      if (distance > range) {
        continue;
      }

      // Apply language filtering
      let displayText = message.text;
      if (this.config.enableLanguageFiltering) {
        const comprehension = this.getLanguageComprehension(
          recipient,
          message.language
        );
        displayText = this.applyLanguageFilter(message.text, comprehension);
      }

      // Deliver to recipient
      if (recipient.sendCallback) {
        const chatData = this.serializeChatMessage(message, displayText);
        recipient.sendCallback(chatData);
        recipientCount++;
      }
    }

    return recipientCount;
  }

  /**
   * Handle spatial chat received from another server via pub/sub
   */
  private handleRemoteSpatialChat(pubsubMessage: SpatialChatPubSubMessage): void {
    // Only process if we have participants in the same zone
    const zoneParticipants = this.zoneParticipants.get(pubsubMessage.message.zoneId);
    if (!zoneParticipants || zoneParticipants.size === 0) {
      return;
    }

    // Check if sender is local (avoid double delivery)
    if (this.participants.has(pubsubMessage.message.senderId)) {
      return;
    }

    // Deliver to local participants
    this.deliverLocalSpatialChat(pubsubMessage.message, pubsubMessage.range);
  }

  /**
   * Get a participant's comprehension level for a language
   */
  private getLanguageComprehension(
    participant: ChatParticipant,
    language: string
  ): LanguageComprehension {
    if (participant.comprehendedLanguages.includes(language)) {
      return LanguageComprehension.Full;
    }

    // Basic is universally understood
    if (language === 'basic') {
      return LanguageComprehension.Full;
    }

    // Check for partial comprehension (related languages, etc.)
    // For now, return none if not in comprehended list
    return LanguageComprehension.None;
  }

  /**
   * Apply language filter to message text based on comprehension
   */
  private applyLanguageFilter(
    text: string,
    comprehension: LanguageComprehension
  ): string {
    switch (comprehension) {
      case LanguageComprehension.Full:
        return text;

      case LanguageComprehension.Partial:
        // Replace some words with gibberish
        return text
          .split(' ')
          .map((word, index) =>
            index % 2 === 0 ? word : this.garbleWord(word)
          )
          .join(' ');

      case LanguageComprehension.None:
        // Replace all words with gibberish
        return text
          .split(' ')
          .map((word) => this.garbleWord(word))
          .join(' ');
    }
  }

  /**
   * Convert a word to gibberish (for language filtering)
   */
  private garbleWord(word: string): string {
    const gibberishChars = 'aeiou'.split('');
    let result = '';
    for (let i = 0; i < word.length; i++) {
      if (/[a-zA-Z]/.test(word[i] ?? '')) {
        result += gibberishChars[i % gibberishChars.length];
      } else {
        result += word[i];
      }
    }
    return result;
  }

  /**
   * Calculate 3D distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    this.messageIdCounter++;
    return `${this.config.serverId}-${Date.now()}-${this.messageIdCounter}`;
  }

  /**
   * Serialize a chat message for network transmission
   * TODO: Replace with proper protocol serialization
   */
  private serializeChatMessage(
    message: SpatialChatMessage,
    displayText: string
  ): Uint8Array {
    // Placeholder - in production, use proper SWG protocol serialization
    const data = JSON.stringify({
      ...message,
      text: displayText,
    });
    return new TextEncoder().encode(data);
  }

  /**
   * Get participant count
   */
  getParticipantCount(): number {
    return this.participants.size;
  }

  /**
   * Get participants in a zone
   */
  getZoneParticipantCount(zoneId: string): number {
    return this.zoneParticipants.get(zoneId)?.size ?? 0;
  }

  /**
   * Clean up handler
   */
  async cleanup(): Promise<void> {
    await this.pubsub.unsubscribe('chat:spatial');
    this.participants.clear();
    this.zoneParticipants.clear();
    console.log('[SpatialChatHandler] Cleaned up');
  }
}

/**
 * Create a new SpatialChatHandler instance
 */
export function createSpatialChatHandler(
  pubsub: PubSubManager,
  config: SpatialChatHandlerConfig
): SpatialChatHandler {
  return new SpatialChatHandler(pubsub, config);
}
