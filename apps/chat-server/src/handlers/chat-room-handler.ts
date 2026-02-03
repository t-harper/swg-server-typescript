/**
 * Chat Room Handler
 * Handles chat room/channel functionality including creation, membership, and messaging
 */

import type { PubSubManager } from '@swg/redis';
import {
  ChatRoomResultCode,
  type ChatRoomInfo,
  type ChatRoomMemberInfo,
  type ChatRoomReceiveMessage,
  type ChatRoomUserJoinedMessage,
  type ChatRoomUserLeftMessage,
  type ChatRoomUserKickedMessage,
  type ChatRoomUserBannedMessage,
  type ChatRoomUserUnbannedMessage,
  type ChatRoomMOTDChangedMessage,
  type ChatRoomDestroyedMessage,
  type ChatRoomPubSubMessage,
  type ChatRoomCreatedPubSubMessage,
  type ChatRoomDestroyedPubSubMessage,
  type ChatRoomJoinPubSubMessage,
  type ChatRoomLeavePubSubMessage,
  type ChatRoomMessagePubSubMessage,
  type ChatRoomKickPubSubMessage,
  type ChatRoomBanPubSubMessage,
  type ChatRoomUnbanPubSubMessage,
  type ChatRoomMOTDPubSubMessage,
} from './chat-room-messages.js';

/**
 * Type alias for object IDs (bigint)
 */
export type ObjectId = bigint;

/**
 * Chat room structure
 */
export interface ChatRoom {
  /** Unique room ID */
  roomId: string;
  /** Room path (e.g., "SWG.Tatooine.General") */
  roomPath: string;
  /** Owner object ID */
  ownerId: ObjectId;
  /** Owner name */
  ownerName: string;
  /** Whether the room is public */
  isPublic: boolean;
  /** Room moderators */
  moderators: Set<ObjectId>;
  /** Current room members */
  members: Set<ObjectId>;
  /** Banned users */
  bannedUsers: Set<ObjectId>;
  /** Room display title */
  title: string;
  /** Message of the day */
  messageOfDay: string;
  /** Creation timestamp */
  createdAt: number;
  /** Whether this room is persistent (survives server restart) */
  persistent: boolean;
}

/**
 * Room member information (for local tracking)
 */
export interface RoomMember {
  /** Member object ID */
  objectId: ObjectId;
  /** Member name */
  name: string;
  /** Callback to send message to this member */
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * Options for creating a room
 */
export interface CreateRoomOptions {
  /** Room display title (defaults to last path segment) */
  title?: string;
  /** Whether the room is public (default: true) */
  isPublic?: boolean;
  /** Initial message of the day */
  messageOfDay?: string;
  /** Whether the room is persistent (default: false) */
  persistent?: boolean;
}

/**
 * Result of a room operation
 */
export interface RoomOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  code: ChatRoomResultCode;
  /** Error message if failed */
  error?: string;
  /** Room info if applicable */
  room?: ChatRoomInfo;
}

/**
 * Chat room handler configuration
 */
export interface ChatRoomHandlerConfig {
  /** Server ID for message routing */
  serverId: string;
  /** Maximum members per room (default: 500) */
  maxMembersPerRoom?: number;
  /** Maximum rooms a user can be in (default: 100) */
  maxRoomsPerUser?: number;
  /** Database connection for persistent rooms (optional) */
  database?: ChatRoomDatabase;
}

/**
 * Database interface for persistent rooms
 */
export interface ChatRoomDatabase {
  /** Load all persistent rooms */
  loadRooms(): Promise<ChatRoom[]>;
  /** Save a room */
  saveRoom(room: ChatRoom): Promise<void>;
  /** Delete a room */
  deleteRoom(roomPath: string): Promise<void>;
  /** Update room MOTD */
  updateMOTD(roomPath: string, message: string): Promise<void>;
  /** Add banned user */
  addBannedUser(roomPath: string, userId: ObjectId): Promise<void>;
  /** Remove banned user */
  removeBannedUser(roomPath: string, userId: ObjectId): Promise<void>;
  /** Add moderator */
  addModerator(roomPath: string, userId: ObjectId): Promise<void>;
  /** Remove moderator */
  removeModerator(roomPath: string, userId: ObjectId): Promise<void>;
}

/**
 * ChatRoomHandler manages chat rooms/channels
 * Handles room creation, membership, messaging, and moderation
 */
export class ChatRoomHandler {
  private readonly pubsub: PubSubManager;
  private readonly config: Required<Omit<ChatRoomHandlerConfig, 'database'>> & {
    database?: ChatRoomDatabase;
  };

  /** Rooms indexed by roomPath */
  private readonly rooms: Map<string, ChatRoom> = new Map();

  /** Rooms each user is in (userId -> Set of roomPaths) */
  private readonly userRooms: Map<ObjectId, Set<string>> = new Map();

  /** Local members for each room (roomPath -> Map of userId -> RoomMember) */
  private readonly localMembers: Map<string, Map<ObjectId, RoomMember>> = new Map();

  /** Member names cache (userId -> name) */
  private readonly memberNames: Map<ObjectId, string> = new Map();

  private roomIdCounter: number = 0;

  constructor(pubsub: PubSubManager, config: ChatRoomHandlerConfig) {
    this.pubsub = pubsub;
    this.config = {
      serverId: config.serverId,
      maxMembersPerRoom: config.maxMembersPerRoom ?? 500,
      maxRoomsPerUser: config.maxRoomsPerUser ?? 100,
      database: config.database,
    };
  }

  /**
   * Initialize the handler and subscribe to chat room channels
   */
  async initialize(): Promise<void> {
    // Subscribe to chat room pub/sub messages
    await this.pubsub.subscribe<ChatRoomPubSubMessage>(
      'chat:room',
      (message) => this.handlePubSubMessage(message)
    );

    // Load persistent rooms from database
    if (this.config.database) {
      try {
        const persistentRooms = await this.config.database.loadRooms();
        for (const room of persistentRooms) {
          // Recreate Sets from loaded data
          room.moderators = new Set(room.moderators);
          room.members = new Set(); // Start with no members, they'll rejoin
          room.bannedUsers = new Set(room.bannedUsers);
          this.rooms.set(room.roomPath, room);
        }
        console.log(`[ChatRoomHandler] Loaded ${persistentRooms.length} persistent rooms`);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to load persistent rooms:', error);
      }
    }

    console.log('[ChatRoomHandler] Initialized');
  }

  /**
   * Register a member for room participation
   * This should be called when a player connects to the chat server
   */
  registerMember(member: RoomMember): void {
    this.memberNames.set(member.objectId, member.name);

    // Register callback for all rooms the user is in
    const userRoomSet = this.userRooms.get(member.objectId);
    if (userRoomSet) {
      for (const roomPath of userRoomSet) {
        const roomMembers = this.localMembers.get(roomPath);
        if (roomMembers) {
          const existingMember = roomMembers.get(member.objectId);
          if (existingMember) {
            existingMember.sendCallback = member.sendCallback;
          } else {
            roomMembers.set(member.objectId, member);
          }
        }
      }
    }

    console.log(`[ChatRoomHandler] Registered member ${member.name} (${member.objectId})`);
  }

  /**
   * Unregister a member from room participation
   * This should be called when a player disconnects
   */
  unregisterMember(objectId: ObjectId): void {
    const memberName = this.memberNames.get(objectId);

    // Remove from all local member lists (but keep room membership)
    for (const [roomPath, roomMembers] of this.localMembers) {
      if (roomMembers.has(objectId)) {
        roomMembers.delete(objectId);
      }
    }

    this.memberNames.delete(objectId);

    console.log(
      `[ChatRoomHandler] Unregistered member ${memberName ?? 'Unknown'} (${objectId})`
    );
  }

  /**
   * Create a new chat room
   */
  async createRoom(
    ownerId: ObjectId,
    ownerName: string,
    roomPath: string,
    options: CreateRoomOptions = {}
  ): Promise<RoomOperationResult> {
    // Validate room path
    if (!this.isValidRoomPath(roomPath)) {
      return {
        success: false,
        code: ChatRoomResultCode.InvalidPath,
        error: 'Invalid room path format',
      };
    }

    // Check if room already exists
    if (this.rooms.has(roomPath)) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomAlreadyExists,
        error: 'Room already exists',
      };
    }

    // Create room
    const room: ChatRoom = {
      roomId: this.generateRoomId(),
      roomPath,
      ownerId,
      ownerName,
      isPublic: options.isPublic ?? true,
      moderators: new Set([ownerId]), // Owner is always a moderator
      members: new Set([ownerId]), // Owner auto-joins
      bannedUsers: new Set(),
      title: options.title ?? this.extractTitleFromPath(roomPath),
      messageOfDay: options.messageOfDay ?? '',
      createdAt: Date.now(),
      persistent: options.persistent ?? false,
    };

    this.rooms.set(roomPath, room);

    // Add owner to user rooms
    this.addUserToRoom(ownerId, roomPath);

    // Store member name
    this.memberNames.set(ownerId, ownerName);

    // Save to database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.saveRoom(room);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to save room to database:', error);
      }
    }

    // Publish room creation to other servers
    const pubsubMessage: ChatRoomCreatedPubSubMessage = {
      type: 'room_created',
      room: this.toRoomInfo(room),
      ownerName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(
      `[ChatRoomHandler] Room created: ${roomPath} by ${ownerName} (${ownerId})`
    );

    return {
      success: true,
      code: ChatRoomResultCode.Success,
      room: this.toRoomInfo(room),
    };
  }

  /**
   * Destroy a chat room
   */
  async destroyRoom(roomPath: string, actorId: ObjectId): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check permissions (only owner can destroy)
    if (room.ownerId !== actorId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Only the room owner can destroy the room',
      };
    }

    const actorName = this.memberNames.get(actorId) ?? 'Unknown';

    // Notify all local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_destroyed',
      roomPath,
      actorName,
    } as ChatRoomDestroyedMessage);

    // Remove all members from user rooms
    for (const memberId of room.members) {
      this.removeUserFromRoom(memberId, roomPath);
    }

    // Clean up
    this.rooms.delete(roomPath);
    this.localMembers.delete(roomPath);

    // Delete from database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.deleteRoom(roomPath);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to delete room from database:', error);
      }
    }

    // Publish destruction to other servers
    const pubsubMessage: ChatRoomDestroyedPubSubMessage = {
      type: 'room_destroyed',
      roomPath,
      actorName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] Room destroyed: ${roomPath} by ${actorName}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Join a chat room
   */
  async joinRoom(
    roomPath: string,
    playerId: ObjectId,
    playerName: string
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check if already in room
    if (room.members.has(playerId)) {
      return {
        success: false,
        code: ChatRoomResultCode.AlreadyInRoom,
        error: 'Already in room',
      };
    }

    // Check if banned
    if (room.bannedUsers.has(playerId)) {
      return {
        success: false,
        code: ChatRoomResultCode.Banned,
        error: 'You are banned from this room',
      };
    }

    // Check if room is full
    if (room.members.size >= this.config.maxMembersPerRoom) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomFull,
        error: 'Room is full',
      };
    }

    // Check user room limit
    const userRoomCount = this.userRooms.get(playerId)?.size ?? 0;
    if (userRoomCount >= this.config.maxRoomsPerUser) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'You are in too many rooms',
      };
    }

    // Add to room
    room.members.add(playerId);
    this.addUserToRoom(playerId, roomPath);
    this.memberNames.set(playerId, playerName);

    // Notify local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_user_joined',
      roomPath,
      userId: playerId.toString(),
      userName: playerName,
    } as ChatRoomUserJoinedMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomJoinPubSubMessage = {
      type: 'room_join',
      roomPath,
      userId: playerId.toString(),
      userName: playerName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] ${playerName} joined ${roomPath}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
      room: this.toRoomInfo(room),
    };
  }

  /**
   * Leave a chat room
   */
  async leaveRoom(roomPath: string, playerId: ObjectId): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check if in room
    if (!room.members.has(playerId)) {
      return {
        success: false,
        code: ChatRoomResultCode.NotInRoom,
        error: 'Not in room',
      };
    }

    const playerName = this.memberNames.get(playerId) ?? 'Unknown';

    // Remove from room
    room.members.delete(playerId);
    this.removeUserFromRoom(playerId, roomPath);

    // Remove from local members
    const roomMembers = this.localMembers.get(roomPath);
    if (roomMembers) {
      roomMembers.delete(playerId);
    }

    // Notify local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_user_left',
      roomPath,
      userId: playerId.toString(),
      userName: playerName,
    } as ChatRoomUserLeftMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomLeavePubSubMessage = {
      type: 'room_leave',
      roomPath,
      userId: playerId.toString(),
      userName: playerName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] ${playerName} left ${roomPath}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(
    roomPath: string,
    senderId: ObjectId,
    senderName: string,
    message: string,
    oob?: string
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check if in room
    if (!room.members.has(senderId)) {
      return {
        success: false,
        code: ChatRoomResultCode.NotInRoom,
        error: 'Not in room',
      };
    }

    const timestamp = Date.now();

    // Broadcast to local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_receive',
      roomPath,
      senderId: senderId.toString(),
      senderName,
      text: message,
      timestamp,
      oob,
    } as ChatRoomReceiveMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomMessagePubSubMessage = {
      type: 'room_message',
      roomPath,
      senderId: senderId.toString(),
      senderName,
      text: message,
      timestamp,
      oob,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Kick a user from a chat room
   */
  async kickUser(
    roomPath: string,
    targetId: ObjectId,
    actorId: ObjectId
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check permissions
    if (!this.canModerate(room, actorId)) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Permission denied',
      };
    }

    // Cannot kick self
    if (targetId === actorId) {
      return {
        success: false,
        code: ChatRoomResultCode.CannotTargetSelf,
        error: 'Cannot kick yourself',
      };
    }

    // Check if target is in room
    if (!room.members.has(targetId)) {
      return {
        success: false,
        code: ChatRoomResultCode.TargetNotFound,
        error: 'Target not in room',
      };
    }

    // Cannot kick owner
    if (targetId === room.ownerId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Cannot kick the room owner',
      };
    }

    // Non-owners cannot kick moderators
    if (room.moderators.has(targetId) && actorId !== room.ownerId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Cannot kick a moderator',
      };
    }

    const targetName = this.memberNames.get(targetId) ?? 'Unknown';
    const actorName = this.memberNames.get(actorId) ?? 'Unknown';

    // Remove from room
    room.members.delete(targetId);
    this.removeUserFromRoom(targetId, roomPath);

    // Notify local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_user_kicked',
      roomPath,
      userId: targetId.toString(),
      userName: targetName,
      actorName,
    } as ChatRoomUserKickedMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomKickPubSubMessage = {
      type: 'room_kick',
      roomPath,
      targetId: targetId.toString(),
      targetName,
      actorName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] ${targetName} was kicked from ${roomPath} by ${actorName}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Ban a user from a chat room
   */
  async banUser(
    roomPath: string,
    targetId: ObjectId,
    actorId: ObjectId
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check permissions
    if (!this.canModerate(room, actorId)) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Permission denied',
      };
    }

    // Cannot ban self
    if (targetId === actorId) {
      return {
        success: false,
        code: ChatRoomResultCode.CannotTargetSelf,
        error: 'Cannot ban yourself',
      };
    }

    // Cannot ban owner
    if (targetId === room.ownerId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Cannot ban the room owner',
      };
    }

    // Non-owners cannot ban moderators
    if (room.moderators.has(targetId) && actorId !== room.ownerId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Cannot ban a moderator',
      };
    }

    const targetName = this.memberNames.get(targetId) ?? 'Unknown';
    const actorName = this.memberNames.get(actorId) ?? 'Unknown';

    // Add to ban list
    room.bannedUsers.add(targetId);

    // Remove from room if present
    if (room.members.has(targetId)) {
      room.members.delete(targetId);
      this.removeUserFromRoom(targetId, roomPath);
    }

    // Save ban to database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.addBannedUser(roomPath, targetId);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to save ban to database:', error);
      }
    }

    // Notify local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_user_banned',
      roomPath,
      userId: targetId.toString(),
      userName: targetName,
      actorName,
    } as ChatRoomUserBannedMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomBanPubSubMessage = {
      type: 'room_ban',
      roomPath,
      targetId: targetId.toString(),
      targetName,
      actorName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] ${targetName} was banned from ${roomPath} by ${actorName}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Unban a user from a chat room
   */
  async unbanUser(
    roomPath: string,
    targetId: ObjectId,
    actorId: ObjectId
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check permissions
    if (!this.canModerate(room, actorId)) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Permission denied',
      };
    }

    // Check if target is banned
    if (!room.bannedUsers.has(targetId)) {
      return {
        success: false,
        code: ChatRoomResultCode.TargetNotFound,
        error: 'Target is not banned',
      };
    }

    const actorName = this.memberNames.get(actorId) ?? 'Unknown';

    // Remove from ban list
    room.bannedUsers.delete(targetId);

    // Remove ban from database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.removeBannedUser(roomPath, targetId);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to remove ban from database:', error);
      }
    }

    // Notify local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_user_unbanned',
      roomPath,
      userId: targetId.toString(),
      actorName,
    } as ChatRoomUserUnbannedMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomUnbanPubSubMessage = {
      type: 'room_unban',
      roomPath,
      targetId: targetId.toString(),
      actorName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] User ${targetId} was unbanned from ${roomPath} by ${actorName}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Add a moderator to a chat room
   */
  async addModerator(
    roomPath: string,
    targetId: ObjectId,
    actorId: ObjectId
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Only owner can add moderators
    if (room.ownerId !== actorId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Only the room owner can add moderators',
      };
    }

    // Check if target is in room
    if (!room.members.has(targetId)) {
      return {
        success: false,
        code: ChatRoomResultCode.TargetNotFound,
        error: 'Target must be a room member',
      };
    }

    // Check if already a moderator
    if (room.moderators.has(targetId)) {
      return {
        success: false,
        code: ChatRoomResultCode.AlreadyInRoom,
        error: 'Target is already a moderator',
      };
    }

    // Add moderator
    room.moderators.add(targetId);

    // Save to database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.addModerator(roomPath, targetId);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to save moderator to database:', error);
      }
    }

    const targetName = this.memberNames.get(targetId) ?? 'Unknown';
    console.log(`[ChatRoomHandler] ${targetName} was made a moderator of ${roomPath}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Remove a moderator from a chat room
   */
  async removeModerator(
    roomPath: string,
    targetId: ObjectId,
    actorId: ObjectId
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Only owner can remove moderators
    if (room.ownerId !== actorId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Only the room owner can remove moderators',
      };
    }

    // Cannot remove owner as moderator
    if (targetId === room.ownerId) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Cannot remove owner as moderator',
      };
    }

    // Check if target is a moderator
    if (!room.moderators.has(targetId)) {
      return {
        success: false,
        code: ChatRoomResultCode.TargetNotFound,
        error: 'Target is not a moderator',
      };
    }

    // Remove moderator
    room.moderators.delete(targetId);

    // Remove from database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.removeModerator(roomPath, targetId);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to remove moderator from database:', error);
      }
    }

    const targetName = this.memberNames.get(targetId) ?? 'Unknown';
    console.log(`[ChatRoomHandler] ${targetName} was removed as moderator of ${roomPath}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * Set the message of the day for a chat room
   */
  async setMOTD(
    roomPath: string,
    message: string,
    actorId: ObjectId
  ): Promise<RoomOperationResult> {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return {
        success: false,
        code: ChatRoomResultCode.RoomNotFound,
        error: 'Room not found',
      };
    }

    // Check permissions
    if (!this.canModerate(room, actorId)) {
      return {
        success: false,
        code: ChatRoomResultCode.PermissionDenied,
        error: 'Permission denied',
      };
    }

    const actorName = this.memberNames.get(actorId) ?? 'Unknown';

    // Update MOTD
    room.messageOfDay = message;

    // Save to database if persistent
    if (room.persistent && this.config.database) {
      try {
        await this.config.database.updateMOTD(roomPath, message);
      } catch (error) {
        console.error('[ChatRoomHandler] Failed to save MOTD to database:', error);
      }
    }

    // Notify local members
    this.broadcastToRoom(roomPath, {
      type: 'chat_room_motd_changed',
      roomPath,
      message,
      actorName,
    } as ChatRoomMOTDChangedMessage);

    // Publish to other servers
    const pubsubMessage: ChatRoomMOTDPubSubMessage = {
      type: 'room_motd',
      roomPath,
      message,
      actorName,
      serverId: this.config.serverId,
    };
    await this.pubsub.publish('chat:room', pubsubMessage);

    console.log(`[ChatRoomHandler] MOTD changed in ${roomPath} by ${actorName}`);

    return {
      success: true,
      code: ChatRoomResultCode.Success,
    };
  }

  /**
   * List rooms visible to a player
   */
  listRooms(playerId: ObjectId, filter?: string): ChatRoomInfo[] {
    const results: ChatRoomInfo[] = [];

    for (const room of this.rooms.values()) {
      // Filter by prefix if specified
      if (filter && !room.roomPath.startsWith(filter)) {
        continue;
      }

      // Show public rooms or rooms the player is in
      if (room.isPublic || room.members.has(playerId)) {
        results.push(this.toRoomInfo(room));
      }
    }

    return results;
  }

  /**
   * Get members of a room
   */
  getRoomMembers(roomPath: string): ChatRoomMemberInfo[] | null {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return null;
    }

    const members: ChatRoomMemberInfo[] = [];
    for (const memberId of room.members) {
      const memberName = this.memberNames.get(memberId) ?? 'Unknown';
      members.push({
        objectId: memberId.toString(),
        name: memberName,
        isModerator: room.moderators.has(memberId),
        isOwner: room.ownerId === memberId,
      });
    }

    return members;
  }

  /**
   * Get room info
   */
  getRoom(roomPath: string): ChatRoomInfo | null {
    const room = this.rooms.get(roomPath);
    if (!room) {
      return null;
    }
    return this.toRoomInfo(room);
  }

  /**
   * Get room MOTD
   */
  getRoomMOTD(roomPath: string): string | null {
    const room = this.rooms.get(roomPath);
    return room?.messageOfDay ?? null;
  }

  /**
   * Get rooms a user is in
   */
  getUserRooms(playerId: ObjectId): string[] {
    const roomSet = this.userRooms.get(playerId);
    return roomSet ? Array.from(roomSet) : [];
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get total member count across all rooms
   */
  getTotalMemberCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.members.size;
    }
    return count;
  }

  /**
   * Clean up handler
   */
  async cleanup(): Promise<void> {
    await this.pubsub.unsubscribe('chat:room');
    this.rooms.clear();
    this.userRooms.clear();
    this.localMembers.clear();
    this.memberNames.clear();
    console.log('[ChatRoomHandler] Cleaned up');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Handle a pub/sub message from another server
   */
  private handlePubSubMessage(message: ChatRoomPubSubMessage): void {
    // Skip messages from this server
    if (message.serverId === this.config.serverId) {
      return;
    }

    switch (message.type) {
      case 'room_created':
        this.handleRemoteRoomCreated(message);
        break;
      case 'room_destroyed':
        this.handleRemoteRoomDestroyed(message);
        break;
      case 'room_join':
        this.handleRemoteRoomJoin(message);
        break;
      case 'room_leave':
        this.handleRemoteRoomLeave(message);
        break;
      case 'room_message':
        this.handleRemoteRoomMessage(message);
        break;
      case 'room_kick':
        this.handleRemoteRoomKick(message);
        break;
      case 'room_ban':
        this.handleRemoteRoomBan(message);
        break;
      case 'room_unban':
        this.handleRemoteRoomUnban(message);
        break;
      case 'room_motd':
        this.handleRemoteRoomMOTD(message);
        break;
    }
  }

  private handleRemoteRoomCreated(message: ChatRoomCreatedPubSubMessage): void {
    // Only sync if we don't have this room
    if (this.rooms.has(message.room.roomPath)) {
      return;
    }

    const room: ChatRoom = {
      roomId: message.room.roomId,
      roomPath: message.room.roomPath,
      ownerId: BigInt(message.room.ownerId),
      ownerName: message.ownerName,
      isPublic: message.room.isPublic,
      moderators: new Set([BigInt(message.room.ownerId)]),
      members: new Set(),
      bannedUsers: new Set(),
      title: message.room.title,
      messageOfDay: '',
      createdAt: Date.now(),
      persistent: false, // Remote rooms are not locally persistent
    };

    this.rooms.set(message.room.roomPath, room);
    console.log(`[ChatRoomHandler] Remote room synced: ${message.room.roomPath}`);
  }

  private handleRemoteRoomDestroyed(message: ChatRoomDestroyedPubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_destroyed',
      roomPath: message.roomPath,
      actorName: message.actorName,
    } as ChatRoomDestroyedMessage);

    // Remove all members from user rooms
    for (const memberId of room.members) {
      this.removeUserFromRoom(memberId, message.roomPath);
    }

    this.rooms.delete(message.roomPath);
    this.localMembers.delete(message.roomPath);
    console.log(`[ChatRoomHandler] Remote room destroyed: ${message.roomPath}`);
  }

  private handleRemoteRoomJoin(message: ChatRoomJoinPubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    const userId = BigInt(message.userId);
    room.members.add(userId);
    this.memberNames.set(userId, message.userName);

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_user_joined',
      roomPath: message.roomPath,
      userId: message.userId,
      userName: message.userName,
    } as ChatRoomUserJoinedMessage);
  }

  private handleRemoteRoomLeave(message: ChatRoomLeavePubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    const userId = BigInt(message.userId);
    room.members.delete(userId);

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_user_left',
      roomPath: message.roomPath,
      userId: message.userId,
      userName: message.userName,
    } as ChatRoomUserLeftMessage);
  }

  private handleRemoteRoomMessage(message: ChatRoomMessagePubSubMessage): void {
    // Broadcast to local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_receive',
      roomPath: message.roomPath,
      senderId: message.senderId,
      senderName: message.senderName,
      text: message.text,
      timestamp: message.timestamp,
      oob: message.oob,
    } as ChatRoomReceiveMessage);
  }

  private handleRemoteRoomKick(message: ChatRoomKickPubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    const targetId = BigInt(message.targetId);
    room.members.delete(targetId);
    this.removeUserFromRoom(targetId, message.roomPath);

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_user_kicked',
      roomPath: message.roomPath,
      userId: message.targetId,
      userName: message.targetName,
      actorName: message.actorName,
    } as ChatRoomUserKickedMessage);
  }

  private handleRemoteRoomBan(message: ChatRoomBanPubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    const targetId = BigInt(message.targetId);
    room.bannedUsers.add(targetId);
    room.members.delete(targetId);
    this.removeUserFromRoom(targetId, message.roomPath);

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_user_banned',
      roomPath: message.roomPath,
      userId: message.targetId,
      userName: message.targetName,
      actorName: message.actorName,
    } as ChatRoomUserBannedMessage);
  }

  private handleRemoteRoomUnban(message: ChatRoomUnbanPubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    const targetId = BigInt(message.targetId);
    room.bannedUsers.delete(targetId);

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_user_unbanned',
      roomPath: message.roomPath,
      userId: message.targetId,
      actorName: message.actorName,
    } as ChatRoomUserUnbannedMessage);
  }

  private handleRemoteRoomMOTD(message: ChatRoomMOTDPubSubMessage): void {
    const room = this.rooms.get(message.roomPath);
    if (!room) {
      return;
    }

    room.messageOfDay = message.message;

    // Notify local members
    this.broadcastToRoom(message.roomPath, {
      type: 'chat_room_motd_changed',
      roomPath: message.roomPath,
      message: message.message,
      actorName: message.actorName,
    } as ChatRoomMOTDChangedMessage);
  }

  /**
   * Broadcast a message to all local members of a room
   */
  private broadcastToRoom(roomPath: string, message: object): void {
    const roomMembers = this.localMembers.get(roomPath);
    if (!roomMembers) {
      return;
    }

    const data = this.serializeMessage(message);
    for (const member of roomMembers.values()) {
      if (member.sendCallback) {
        member.sendCallback(data);
      }
    }
  }

  /**
   * Check if a user can moderate a room
   */
  private canModerate(room: ChatRoom, userId: ObjectId): boolean {
    return room.ownerId === userId || room.moderators.has(userId);
  }

  /**
   * Validate room path format (e.g., "SWG.Tatooine.General")
   */
  private isValidRoomPath(roomPath: string): boolean {
    // Must have at least one segment
    if (!roomPath || roomPath.length === 0) {
      return false;
    }

    // Max length check
    if (roomPath.length > 200) {
      return false;
    }

    // Must only contain alphanumeric, dots, underscores, and hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(roomPath)) {
      return false;
    }

    // Must not start or end with a dot
    if (roomPath.startsWith('.') || roomPath.endsWith('.')) {
      return false;
    }

    // Must not have consecutive dots
    if (roomPath.includes('..')) {
      return false;
    }

    return true;
  }

  /**
   * Extract a display title from a room path
   */
  private extractTitleFromPath(roomPath: string): string {
    const segments = roomPath.split('.');
    return segments[segments.length - 1] ?? roomPath;
  }

  /**
   * Add a user to the user rooms index
   */
  private addUserToRoom(userId: ObjectId, roomPath: string): void {
    let roomSet = this.userRooms.get(userId);
    if (!roomSet) {
      roomSet = new Set();
      this.userRooms.set(userId, roomSet);
    }
    roomSet.add(roomPath);

    // Also add to local members if we have a callback registered
    let roomMembers = this.localMembers.get(roomPath);
    if (!roomMembers) {
      roomMembers = new Map();
      this.localMembers.set(roomPath, roomMembers);
    }

    // Check if we have member info cached
    const memberName = this.memberNames.get(userId);
    if (memberName && !roomMembers.has(userId)) {
      roomMembers.set(userId, {
        objectId: userId,
        name: memberName,
      });
    }
  }

  /**
   * Remove a user from the user rooms index
   */
  private removeUserFromRoom(userId: ObjectId, roomPath: string): void {
    const roomSet = this.userRooms.get(userId);
    if (roomSet) {
      roomSet.delete(roomPath);
      if (roomSet.size === 0) {
        this.userRooms.delete(userId);
      }
    }

    const roomMembers = this.localMembers.get(roomPath);
    if (roomMembers) {
      roomMembers.delete(userId);
    }
  }

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    this.roomIdCounter++;
    return `${this.config.serverId}-room-${Date.now()}-${this.roomIdCounter}`;
  }

  /**
   * Convert a ChatRoom to ChatRoomInfo
   */
  private toRoomInfo(room: ChatRoom): ChatRoomInfo {
    return {
      roomId: room.roomId,
      roomPath: room.roomPath,
      title: room.title,
      isPublic: room.isPublic,
      memberCount: room.members.size,
      ownerId: room.ownerId.toString(),
    };
  }

  /**
   * Serialize a message for network transmission
   * TODO: Replace with proper protocol serialization
   */
  private serializeMessage(message: object): Uint8Array {
    const data = JSON.stringify(message);
    return new TextEncoder().encode(data);
  }
}

/**
 * Create a new ChatRoomHandler instance
 */
export function createChatRoomHandler(
  pubsub: PubSubManager,
  config: ChatRoomHandlerConfig
): ChatRoomHandler {
  return new ChatRoomHandler(pubsub, config);
}
