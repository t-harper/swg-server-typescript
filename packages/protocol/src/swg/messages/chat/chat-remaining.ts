import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';
import {
  type ChatAvatarId,
  readChatAvatarId,
  writeChatAvatarId,
} from './chat-core.js';

// Pre-computed CRC32 opcodes for remaining chat messages
export const ChatRemainingOpcodes = {
  ChatDestroyRoomByName: 0x3aa91d32,
  ChatOnAddModeratorToRoom: 0x1107385e,
  ChatOnBanAvatarFromRoom: 0xe299c960,
  ChatOnDestroyRoom: 0xebec9e71,
  ChatOnInviteGroupToRoom: 0x674b523b,
  ChatOnKickAvatarFromRoom: 0xfeb327d6,
  ChatOnRemoveModeratorFromRoom: 0x56692557,
  ChatOnSendRoomInvitation: 0x58060b39,
  ChatOnUnbanAvatarFromRoom: 0xed77e6b7,
  ChatOnUninviteFromRoom: 0x85b5e446,
  ChatInviteGroupMembersToRoom: 0xe1565991,
} as const;

// ============================================================================
// ChatDestroyRoomByName
// Wire: roomPath(string)
// ============================================================================

export interface ChatDestroyRoomByName {
  roomPath: string;
}

export function serializeChatDestroyRoomByName(msg: ChatDestroyRoomByName): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatDestroyRoomByName);
  writer.writeStringWithLength16LE(msg.roomPath);
  return writer.toBuffer();
}

export function deserializeChatDestroyRoomByName(data: Uint8Array): ChatDestroyRoomByName {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const roomPath = reader.readStringWithLength16LE();
  return { roomPath };
}

export function createChatDestroyRoomByName(roomPath: string): ChatDestroyRoomByName {
  return { roomPath };
}

// ============================================================================
// ChatOnAddModeratorToRoom
// Wire: avatarId(ChatAvatarId) + granterId(ChatAvatarId) + resultCode(u32)
//       + roomName(string) + sequenceId(u32)
// ============================================================================

export interface ChatOnAddModeratorToRoom {
  avatarId: ChatAvatarId;
  granterId: ChatAvatarId;
  resultCode: number;
  roomName: string;
  sequenceId: number;
}

export function serializeChatOnAddModeratorToRoom(msg: ChatOnAddModeratorToRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnAddModeratorToRoom);
  writeChatAvatarId(writer, msg.avatarId);
  writeChatAvatarId(writer, msg.granterId);
  writer.writeUInt32LE(msg.resultCode);
  writer.writeStringWithLength16LE(msg.roomName);
  writer.writeUInt32LE(msg.sequenceId);
  return writer.toBuffer();
}

export function deserializeChatOnAddModeratorToRoom(data: Uint8Array): ChatOnAddModeratorToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const granterId = readChatAvatarId(reader);
  const resultCode = reader.readUInt32LE();
  const roomName = reader.readStringWithLength16LE();
  const sequenceId = reader.readUInt32LE();
  return { avatarId, granterId, resultCode, roomName, sequenceId };
}

export function createChatOnAddModeratorToRoom(
  avatarId: ChatAvatarId,
  granterId: ChatAvatarId,
  resultCode: number,
  roomName: string,
  sequenceId: number
): ChatOnAddModeratorToRoom {
  return { avatarId, granterId, resultCode, roomName, sequenceId };
}

// ============================================================================
// ChatOnRemoveModeratorFromRoom
// Wire: avatarId(ChatAvatarId) + removerId(ChatAvatarId) + resultCode(u32)
//       + roomName(string) + sequenceId(u32)
// ============================================================================

export interface ChatOnRemoveModeratorFromRoom {
  avatarId: ChatAvatarId;
  removerId: ChatAvatarId;
  resultCode: number;
  roomName: string;
  sequenceId: number;
}

export function serializeChatOnRemoveModeratorFromRoom(msg: ChatOnRemoveModeratorFromRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnRemoveModeratorFromRoom);
  writeChatAvatarId(writer, msg.avatarId);
  writeChatAvatarId(writer, msg.removerId);
  writer.writeUInt32LE(msg.resultCode);
  writer.writeStringWithLength16LE(msg.roomName);
  writer.writeUInt32LE(msg.sequenceId);
  return writer.toBuffer();
}

export function deserializeChatOnRemoveModeratorFromRoom(data: Uint8Array): ChatOnRemoveModeratorFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const removerId = readChatAvatarId(reader);
  const resultCode = reader.readUInt32LE();
  const roomName = reader.readStringWithLength16LE();
  const sequenceId = reader.readUInt32LE();
  return { avatarId, removerId, resultCode, roomName, sequenceId };
}

export function createChatOnRemoveModeratorFromRoom(
  avatarId: ChatAvatarId,
  removerId: ChatAvatarId,
  resultCode: number,
  roomName: string,
  sequenceId: number
): ChatOnRemoveModeratorFromRoom {
  return { avatarId, removerId, resultCode, roomName, sequenceId };
}

// ============================================================================
// ChatOnBanAvatarFromRoom
// Wire: roomName(string) + banner(ChatAvatarId) + bannee(ChatAvatarId)
//       + result(u32) + sequence(u32)
// ============================================================================

export interface ChatOnBanAvatarFromRoom {
  roomName: string;
  banner: ChatAvatarId;
  bannee: ChatAvatarId;
  result: number;
  sequence: number;
}

export function serializeChatOnBanAvatarFromRoom(msg: ChatOnBanAvatarFromRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnBanAvatarFromRoom);
  writer.writeStringWithLength16LE(msg.roomName);
  writeChatAvatarId(writer, msg.banner);
  writeChatAvatarId(writer, msg.bannee);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnBanAvatarFromRoom(data: Uint8Array): ChatOnBanAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const roomName = reader.readStringWithLength16LE();
  const banner = readChatAvatarId(reader);
  const bannee = readChatAvatarId(reader);
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { roomName, banner, bannee, result, sequence };
}

export function createChatOnBanAvatarFromRoom(
  roomName: string,
  banner: ChatAvatarId,
  bannee: ChatAvatarId,
  result: number,
  sequence: number
): ChatOnBanAvatarFromRoom {
  return { roomName, banner, bannee, result, sequence };
}

// ============================================================================
// ChatOnUnbanAvatarFromRoom
// Wire: roomName(string) + banner(ChatAvatarId) + bannee(ChatAvatarId)
//       + result(u32) + sequence(u32)
// ============================================================================

export interface ChatOnUnbanAvatarFromRoom {
  roomName: string;
  unbanner: ChatAvatarId;
  unbannee: ChatAvatarId;
  result: number;
  sequence: number;
}

export function serializeChatOnUnbanAvatarFromRoom(msg: ChatOnUnbanAvatarFromRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnUnbanAvatarFromRoom);
  writer.writeStringWithLength16LE(msg.roomName);
  writeChatAvatarId(writer, msg.unbanner);
  writeChatAvatarId(writer, msg.unbannee);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnUnbanAvatarFromRoom(data: Uint8Array): ChatOnUnbanAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const roomName = reader.readStringWithLength16LE();
  const unbanner = readChatAvatarId(reader);
  const unbannee = readChatAvatarId(reader);
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { roomName, unbanner, unbannee, result, sequence };
}

export function createChatOnUnbanAvatarFromRoom(
  roomName: string,
  unbanner: ChatAvatarId,
  unbannee: ChatAvatarId,
  result: number,
  sequence: number
): ChatOnUnbanAvatarFromRoom {
  return { roomName, unbanner, unbannee, result, sequence };
}

// ============================================================================
// ChatOnDestroyRoom
// Wire: destroyer(ChatAvatarId) + resultCode(u32) + roomId(u32)
//       + sequence(u32)
// ============================================================================

export interface ChatOnDestroyRoom {
  destroyer: ChatAvatarId;
  resultCode: number;
  roomId: number;
  sequence: number;
}

export function serializeChatOnDestroyRoom(msg: ChatOnDestroyRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnDestroyRoom);
  writeChatAvatarId(writer, msg.destroyer);
  writer.writeUInt32LE(msg.resultCode);
  writer.writeUInt32LE(msg.roomId);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnDestroyRoom(data: Uint8Array): ChatOnDestroyRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const destroyer = readChatAvatarId(reader);
  const resultCode = reader.readUInt32LE();
  const roomId = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { destroyer, resultCode, roomId, sequence };
}

export function createChatOnDestroyRoom(
  destroyer: ChatAvatarId,
  resultCode: number,
  roomId: number,
  sequence: number
): ChatOnDestroyRoom {
  return { destroyer, resultCode, roomId, sequence };
}

// ============================================================================
// ChatOnKickAvatarFromRoom
// Wire: avatarId(ChatAvatarId) + removerId(ChatAvatarId) + resultCode(u32)
//       + roomName(string)
// ============================================================================

export interface ChatOnKickAvatarFromRoom {
  avatarId: ChatAvatarId;
  removerId: ChatAvatarId;
  resultCode: number;
  roomName: string;
}

export function serializeChatOnKickAvatarFromRoom(msg: ChatOnKickAvatarFromRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnKickAvatarFromRoom);
  writeChatAvatarId(writer, msg.avatarId);
  writeChatAvatarId(writer, msg.removerId);
  writer.writeUInt32LE(msg.resultCode);
  writer.writeStringWithLength16LE(msg.roomName);
  return writer.toBuffer();
}

export function deserializeChatOnKickAvatarFromRoom(data: Uint8Array): ChatOnKickAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const removerId = readChatAvatarId(reader);
  const resultCode = reader.readUInt32LE();
  const roomName = reader.readStringWithLength16LE();
  return { avatarId, removerId, resultCode, roomName };
}

export function createChatOnKickAvatarFromRoom(
  avatarId: ChatAvatarId,
  removerId: ChatAvatarId,
  resultCode: number,
  roomName: string
): ChatOnKickAvatarFromRoom {
  return { avatarId, removerId, resultCode, roomName };
}

// ============================================================================
// ChatOnSendRoomInvitation
// Wire: result(u32) + sequence(u32)
// ============================================================================

export interface ChatOnSendRoomInvitation {
  result: number;
  sequence: number;
}

export function serializeChatOnSendRoomInvitation(msg: ChatOnSendRoomInvitation): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnSendRoomInvitation);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnSendRoomInvitation(data: Uint8Array): ChatOnSendRoomInvitation {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { result, sequence };
}

export function createChatOnSendRoomInvitation(
  result: number,
  sequence: number
): ChatOnSendRoomInvitation {
  return { result, sequence };
}

// ============================================================================
// ChatOnInviteGroupToRoom
// Wire: roomName(string) + invitor(ChatAvatarId) + invitee(ChatAvatarId)
//       + result(u32)
// ============================================================================

export interface ChatOnInviteGroupToRoom {
  roomName: string;
  invitor: ChatAvatarId;
  invitee: ChatAvatarId;
  result: number;
}

export function serializeChatOnInviteGroupToRoom(msg: ChatOnInviteGroupToRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnInviteGroupToRoom);
  writer.writeStringWithLength16LE(msg.roomName);
  writeChatAvatarId(writer, msg.invitor);
  writeChatAvatarId(writer, msg.invitee);
  writer.writeUInt32LE(msg.result);
  return writer.toBuffer();
}

export function deserializeChatOnInviteGroupToRoom(data: Uint8Array): ChatOnInviteGroupToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const roomName = reader.readStringWithLength16LE();
  const invitor = readChatAvatarId(reader);
  const invitee = readChatAvatarId(reader);
  const result = reader.readUInt32LE();
  return { roomName, invitor, invitee, result };
}

export function createChatOnInviteGroupToRoom(
  roomName: string,
  invitor: ChatAvatarId,
  invitee: ChatAvatarId,
  result: number
): ChatOnInviteGroupToRoom {
  return { roomName, invitor, invitee, result };
}

// ============================================================================
// ChatInviteGroupMembersToRoom
// Wire: invitorNetworkId(u64) + groupLeaderId(ChatAvatarId) + roomName(string)
//       + invitedMembers(AutoArray<NetworkId/u64>)
// ============================================================================

export interface ChatInviteGroupMembersToRoom {
  invitorNetworkId: bigint;
  groupLeaderId: ChatAvatarId;
  roomName: string;
  invitedMembers: bigint[];
}

export function serializeChatInviteGroupMembersToRoom(msg: ChatInviteGroupMembersToRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatInviteGroupMembersToRoom);
  writer.writeUInt64LE(msg.invitorNetworkId);
  writeChatAvatarId(writer, msg.groupLeaderId);
  writer.writeStringWithLength16LE(msg.roomName);
  writer.writeUInt32LE(msg.invitedMembers.length);
  for (const member of msg.invitedMembers) {
    writer.writeUInt64LE(member);
  }
  return writer.toBuffer();
}

export function deserializeChatInviteGroupMembersToRoom(data: Uint8Array): ChatInviteGroupMembersToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const invitorNetworkId = reader.readUInt64LE();
  const groupLeaderId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  const memberCount = reader.readUInt32LE();
  const invitedMembers: bigint[] = [];
  for (let i = 0; i < memberCount; i++) {
    invitedMembers.push(reader.readUInt64LE());
  }
  return { invitorNetworkId, groupLeaderId, roomName, invitedMembers };
}

export function createChatInviteGroupMembersToRoom(
  invitorNetworkId: bigint,
  groupLeaderId: ChatAvatarId,
  roomName: string,
  invitedMembers: bigint[]
): ChatInviteGroupMembersToRoom {
  return { invitorNetworkId, groupLeaderId, roomName, invitedMembers };
}

// ============================================================================
// ChatOnUninviteFromRoom
// Wire: roomName(string) + invitor(ChatAvatarId) + invitee(ChatAvatarId)
//       + result(u32) + sequence(u32)
// ============================================================================

export interface ChatOnUninviteFromRoom {
  roomName: string;
  invitor: ChatAvatarId;
  invitee: ChatAvatarId;
  result: number;
  sequence: number;
}

export function serializeChatOnUninviteFromRoom(msg: ChatOnUninviteFromRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatRemainingOpcodes.ChatOnUninviteFromRoom);
  writer.writeStringWithLength16LE(msg.roomName);
  writeChatAvatarId(writer, msg.invitor);
  writeChatAvatarId(writer, msg.invitee);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnUninviteFromRoom(data: Uint8Array): ChatOnUninviteFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const roomName = reader.readStringWithLength16LE();
  const invitor = readChatAvatarId(reader);
  const invitee = readChatAvatarId(reader);
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { roomName, invitor, invitee, result, sequence };
}

export function createChatOnUninviteFromRoom(
  roomName: string,
  invitor: ChatAvatarId,
  invitee: ChatAvatarId,
  result: number,
  sequence: number
): ChatOnUninviteFromRoom {
  return { roomName, invitor, invitee, result, sequence };
}
