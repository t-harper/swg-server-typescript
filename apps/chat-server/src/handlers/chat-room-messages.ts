/**
 * Chat Room Network Messages
 * Message types for chat room/channel functionality
 */

/**
 * Result codes for chat room operations
 */
export enum ChatRoomResultCode {
  /** Operation succeeded */
  Success = 0,
  /** Room already exists */
  RoomAlreadyExists = 1,
  /** Room not found */
  RoomNotFound = 2,
  /** Permission denied */
  PermissionDenied = 3,
  /** User already in room */
  AlreadyInRoom = 4,
  /** User not in room */
  NotInRoom = 5,
  /** User is banned from room */
  Banned = 6,
  /** Invalid room path */
  InvalidPath = 7,
  /** Target user not found */
  TargetNotFound = 8,
  /** Cannot perform action on self */
  CannotTargetSelf = 9,
  /** Room is full */
  RoomFull = 10,
}

/**
 * Room information for listing
 */
export interface ChatRoomInfo {
  /** Room unique ID */
  roomId: string;
  /** Room path (e.g., "SWG.Tatooine.General") */
  roomPath: string;
  /** Room display title */
  title: string;
  /** Whether the room is public */
  isPublic: boolean;
  /** Current member count */
  memberCount: number;
  /** Owner object ID as string (for serialization) */
  ownerId: string;
}

/**
 * Member information for room member lists
 */
export interface ChatRoomMemberInfo {
  /** Member object ID as string */
  objectId: string;
  /** Member name */
  name: string;
  /** Whether the member is a moderator */
  isModerator: boolean;
  /** Whether the member is the owner */
  isOwner: boolean;
}

// ============================================================================
// Client -> Server Messages
// ============================================================================

/**
 * Create a new chat room
 */
export interface ChatRoomCreateMessage {
  type: 'chat_room_create';
  /** Room path (e.g., "SWG.Tatooine.General") */
  roomPath: string;
  /** Room display title */
  title?: string;
  /** Whether the room is public (default: true) */
  isPublic?: boolean;
  /** Initial message of the day */
  messageOfDay?: string;
}

/**
 * Destroy a chat room
 */
export interface ChatRoomDestroyMessage {
  type: 'chat_room_destroy';
  /** Room path to destroy */
  roomPath: string;
}

/**
 * Join a chat room
 */
export interface ChatRoomJoinMessage {
  type: 'chat_room_join';
  /** Room path to join */
  roomPath: string;
}

/**
 * Leave a chat room
 */
export interface ChatRoomLeaveMessage {
  type: 'chat_room_leave';
  /** Room path to leave */
  roomPath: string;
}

/**
 * Send a message to a chat room
 */
export interface ChatRoomSendMessage {
  type: 'chat_room_send';
  /** Room path to send to */
  roomPath: string;
  /** Message text */
  text: string;
  /** Optional out-of-band data */
  oob?: string;
}

/**
 * Kick a user from a chat room
 */
export interface ChatRoomKickMessage {
  type: 'chat_room_kick';
  /** Room path */
  roomPath: string;
  /** Target player object ID as string */
  targetId: string;
}

/**
 * Ban a user from a chat room
 */
export interface ChatRoomBanMessage {
  type: 'chat_room_ban';
  /** Room path */
  roomPath: string;
  /** Target player object ID as string */
  targetId: string;
}

/**
 * Unban a user from a chat room
 */
export interface ChatRoomUnbanMessage {
  type: 'chat_room_unban';
  /** Room path */
  roomPath: string;
  /** Target player object ID as string */
  targetId: string;
}

/**
 * Add/remove a moderator
 */
export interface ChatRoomModeratorMessage {
  type: 'chat_room_moderator';
  /** Room path */
  roomPath: string;
  /** Target player object ID as string */
  targetId: string;
  /** Action: add or remove */
  action: 'add' | 'remove';
}

/**
 * Set room message of the day
 */
export interface ChatRoomMOTDMessage {
  type: 'chat_room_motd';
  /** Room path */
  roomPath: string;
  /** New message of the day (empty to clear) */
  message: string;
}

/**
 * Request list of available rooms
 */
export interface ChatRoomListMessage {
  type: 'chat_room_list';
  /** Optional filter prefix (e.g., "SWG.Tatooine") */
  filter?: string;
}

/**
 * Request list of room members
 */
export interface ChatRoomMembersMessage {
  type: 'chat_room_members';
  /** Room path */
  roomPath: string;
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Response to room creation
 */
export interface ChatRoomCreateResponseMessage {
  type: 'chat_room_create_response';
  /** Result code */
  result: ChatRoomResultCode;
  /** Room path */
  roomPath: string;
  /** Room ID if successful */
  roomId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Response to room destruction
 */
export interface ChatRoomDestroyResponseMessage {
  type: 'chat_room_destroy_response';
  /** Result code */
  result: ChatRoomResultCode;
  /** Room path */
  roomPath: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Response to room join
 */
export interface ChatRoomJoinResponseMessage {
  type: 'chat_room_join_response';
  /** Result code */
  result: ChatRoomResultCode;
  /** Room path */
  roomPath: string;
  /** Room info if successful */
  room?: ChatRoomInfo;
  /** Message of the day if set */
  messageOfDay?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Response to room leave
 */
export interface ChatRoomLeaveResponseMessage {
  type: 'chat_room_leave_response';
  /** Result code */
  result: ChatRoomResultCode;
  /** Room path */
  roomPath: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Chat message received in a room
 */
export interface ChatRoomReceiveMessage {
  type: 'chat_room_receive';
  /** Room path */
  roomPath: string;
  /** Sender object ID as string */
  senderId: string;
  /** Sender name */
  senderName: string;
  /** Message text */
  text: string;
  /** Timestamp */
  timestamp: number;
  /** Optional out-of-band data */
  oob?: string;
}

/**
 * Notification that a user joined the room
 */
export interface ChatRoomUserJoinedMessage {
  type: 'chat_room_user_joined';
  /** Room path */
  roomPath: string;
  /** User object ID as string */
  userId: string;
  /** User name */
  userName: string;
}

/**
 * Notification that a user left the room
 */
export interface ChatRoomUserLeftMessage {
  type: 'chat_room_user_left';
  /** Room path */
  roomPath: string;
  /** User object ID as string */
  userId: string;
  /** User name */
  userName: string;
}

/**
 * Notification that a user was kicked
 */
export interface ChatRoomUserKickedMessage {
  type: 'chat_room_user_kicked';
  /** Room path */
  roomPath: string;
  /** Kicked user object ID as string */
  userId: string;
  /** Kicked user name */
  userName: string;
  /** Actor who kicked them */
  actorName: string;
}

/**
 * Notification that a user was banned
 */
export interface ChatRoomUserBannedMessage {
  type: 'chat_room_user_banned';
  /** Room path */
  roomPath: string;
  /** Banned user object ID as string */
  userId: string;
  /** Banned user name */
  userName: string;
  /** Actor who banned them */
  actorName: string;
}

/**
 * Notification that a user was unbanned
 */
export interface ChatRoomUserUnbannedMessage {
  type: 'chat_room_user_unbanned';
  /** Room path */
  roomPath: string;
  /** Unbanned user object ID as string */
  userId: string;
  /** Actor who unbanned them */
  actorName: string;
}

/**
 * Notification that room MOTD changed
 */
export interface ChatRoomMOTDChangedMessage {
  type: 'chat_room_motd_changed';
  /** Room path */
  roomPath: string;
  /** New message of the day */
  message: string;
  /** Actor who changed it */
  actorName: string;
}

/**
 * Response to room list request
 */
export interface ChatRoomListResponseMessage {
  type: 'chat_room_list_response';
  /** List of rooms */
  rooms: ChatRoomInfo[];
}

/**
 * Response to room members request
 */
export interface ChatRoomMembersResponseMessage {
  type: 'chat_room_members_response';
  /** Result code */
  result: ChatRoomResultCode;
  /** Room path */
  roomPath: string;
  /** List of members if successful */
  members?: ChatRoomMemberInfo[];
  /** Error message if failed */
  error?: string;
}

/**
 * Notification that room was destroyed
 */
export interface ChatRoomDestroyedMessage {
  type: 'chat_room_destroyed';
  /** Room path */
  roomPath: string;
  /** Actor who destroyed it */
  actorName: string;
}

// ============================================================================
// Pub/Sub Messages for Cross-Server Sync
// ============================================================================

/**
 * Pub/Sub message for room creation
 */
export interface ChatRoomCreatedPubSubMessage {
  type: 'room_created';
  /** Room info */
  room: ChatRoomInfo;
  /** Owner name */
  ownerName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for room destruction
 */
export interface ChatRoomDestroyedPubSubMessage {
  type: 'room_destroyed';
  /** Room path */
  roomPath: string;
  /** Actor name */
  actorName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for room join
 */
export interface ChatRoomJoinPubSubMessage {
  type: 'room_join';
  /** Room path */
  roomPath: string;
  /** User object ID as string */
  userId: string;
  /** User name */
  userName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for room leave
 */
export interface ChatRoomLeavePubSubMessage {
  type: 'room_leave';
  /** Room path */
  roomPath: string;
  /** User object ID as string */
  userId: string;
  /** User name */
  userName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for room message
 */
export interface ChatRoomMessagePubSubMessage {
  type: 'room_message';
  /** Room path */
  roomPath: string;
  /** Sender object ID as string */
  senderId: string;
  /** Sender name */
  senderName: string;
  /** Message text */
  text: string;
  /** Timestamp */
  timestamp: number;
  /** Optional out-of-band data */
  oob?: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for kick
 */
export interface ChatRoomKickPubSubMessage {
  type: 'room_kick';
  /** Room path */
  roomPath: string;
  /** Target object ID as string */
  targetId: string;
  /** Target name */
  targetName: string;
  /** Actor name */
  actorName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for ban
 */
export interface ChatRoomBanPubSubMessage {
  type: 'room_ban';
  /** Room path */
  roomPath: string;
  /** Target object ID as string */
  targetId: string;
  /** Target name */
  targetName: string;
  /** Actor name */
  actorName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for unban
 */
export interface ChatRoomUnbanPubSubMessage {
  type: 'room_unban';
  /** Room path */
  roomPath: string;
  /** Target object ID as string */
  targetId: string;
  /** Actor name */
  actorName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Pub/Sub message for MOTD change
 */
export interface ChatRoomMOTDPubSubMessage {
  type: 'room_motd';
  /** Room path */
  roomPath: string;
  /** New message */
  message: string;
  /** Actor name */
  actorName: string;
  /** Origin server ID */
  serverId: string;
}

/**
 * Union type for all pub/sub messages
 */
export type ChatRoomPubSubMessage =
  | ChatRoomCreatedPubSubMessage
  | ChatRoomDestroyedPubSubMessage
  | ChatRoomJoinPubSubMessage
  | ChatRoomLeavePubSubMessage
  | ChatRoomMessagePubSubMessage
  | ChatRoomKickPubSubMessage
  | ChatRoomBanPubSubMessage
  | ChatRoomUnbanPubSubMessage
  | ChatRoomMOTDPubSubMessage;
