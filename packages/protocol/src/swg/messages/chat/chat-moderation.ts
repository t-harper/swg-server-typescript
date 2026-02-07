import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';
import {
  type ChatAvatarId,
  readChatAvatarId,
  writeChatAvatarId,
} from './chat-core.js';

export const ChatModerationOpcodes = {
  ChatInviteAvatarToRoom: 0xccf1fbc5,
  ChatOnInviteToRoom: 0x2748a3c4,
  ChatOnReceiveRoomInvitation: 0xfea0e863,
  ChatUninviteFromRoom: 0x2be70f24,
  ChatKickAvatarFromRoom: 0xbca1d8c5,
  ChatBanAvatarFromRoom: 0x81b4d898,
  ChatUnbanAvatarFromRoom: 0x3b548e12,
  ChatAddModeratorToRoom: 0x9a7cb84e,
  ChatRemoveModeratorFromRoom: 0x7c14e706,
  ChatPersistentMessageToClient: 0x08485e17,
  ChatPersistentMessageToServer: 0x25a29fa6,
  ChatDeletePersistentMessage: 0x8f867c4a,
  ChatDeleteAllPersistentMessages: 0x1e418ea4,
  ChatRequestPersistentMessage: 0x07e3559f,
  ChatOnSendPersistentMessage: 0x805b9694,
  ChatPutAvatarInRoom: 0x18431542,
  ChatOnConnectAvatar: 0x5d1b03b4,
  ChatMessageFromGame: 0x09313066,
  ChatOnSendRoomMessage: 0x83fb6cca,
  ChatInviteGroupToRoom: 0xc90f16f8,
  ChatOnDeleteAllPersistentMessages: 0xdf5e60c3,
} as const;

// ============================================================================
// ChatInviteAvatarToRoom
// ============================================================================

export interface ChatInviteAvatarToRoom {
  avatarId: ChatAvatarId;
  roomName: string;
}

export function serializeChatInviteAvatarToRoom(
  message: ChatInviteAvatarToRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatInviteAvatarToRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  return writer.toBuffer();
}

export function deserializeChatInviteAvatarToRoom(
  data: Uint8Array
): ChatInviteAvatarToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  return { avatarId, roomName };
}

export function createChatInviteAvatarToRoom(
  avatarId: ChatAvatarId,
  roomName: string
): ChatInviteAvatarToRoom {
  return { avatarId, roomName };
}

// ============================================================================
// ChatOnInviteToRoom
// ============================================================================

export interface ChatOnInviteToRoom {
  roomName: string;
  invitor: ChatAvatarId;
  invitee: ChatAvatarId;
  result: number;
}

export function serializeChatOnInviteToRoom(
  message: ChatOnInviteToRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatOnInviteToRoom);
  writer.writeStringWithLength16LE(message.roomName);
  writeChatAvatarId(writer, message.invitor);
  writeChatAvatarId(writer, message.invitee);
  writer.writeUInt32LE(message.result);
  return writer.toBuffer();
}

export function deserializeChatOnInviteToRoom(
  data: Uint8Array
): ChatOnInviteToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const roomName = reader.readStringWithLength16LE();
  const invitor = readChatAvatarId(reader);
  const invitee = readChatAvatarId(reader);
  const result = reader.readUInt32LE();
  return { roomName, invitor, invitee, result };
}

export function createChatOnInviteToRoom(
  roomName: string,
  invitor: ChatAvatarId,
  invitee: ChatAvatarId,
  result: number
): ChatOnInviteToRoom {
  return { roomName, invitor, invitee, result };
}

// ============================================================================
// ChatOnReceiveRoomInvitation
// ============================================================================

export interface ChatOnReceiveRoomInvitation {
  invitorAvatar: ChatAvatarId;
  roomName: string;
}

export function serializeChatOnReceiveRoomInvitation(
  message: ChatOnReceiveRoomInvitation
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatOnReceiveRoomInvitation);
  writeChatAvatarId(writer, message.invitorAvatar);
  writer.writeStringWithLength16LE(message.roomName);
  return writer.toBuffer();
}

export function deserializeChatOnReceiveRoomInvitation(
  data: Uint8Array
): ChatOnReceiveRoomInvitation {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const invitorAvatar = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  return { invitorAvatar, roomName };
}

export function createChatOnReceiveRoomInvitation(
  invitorAvatar: ChatAvatarId,
  roomName: string
): ChatOnReceiveRoomInvitation {
  return { invitorAvatar, roomName };
}

// ============================================================================
// ChatUninviteFromRoom
// ============================================================================

export interface ChatUninviteFromRoom {
  avatar: ChatAvatarId;
  roomName: string;
  sequence: number;
}

export function serializeChatUninviteFromRoom(
  message: ChatUninviteFromRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatUninviteFromRoom);
  writeChatAvatarId(writer, message.avatar);
  writer.writeStringWithLength16LE(message.roomName);
  writer.writeUInt32LE(message.sequence);
  return writer.toBuffer();
}

export function deserializeChatUninviteFromRoom(
  data: Uint8Array
): ChatUninviteFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatar = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  const sequence = reader.readUInt32LE();
  return { avatar, roomName, sequence };
}

export function createChatUninviteFromRoom(
  avatar: ChatAvatarId,
  roomName: string,
  sequence: number
): ChatUninviteFromRoom {
  return { avatar, roomName, sequence };
}

// ============================================================================
// ChatKickAvatarFromRoom
// ============================================================================

export interface ChatKickAvatarFromRoom {
  avatarId: ChatAvatarId;
  roomName: string;
}

export function serializeChatKickAvatarFromRoom(
  message: ChatKickAvatarFromRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatKickAvatarFromRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  return writer.toBuffer();
}

export function deserializeChatKickAvatarFromRoom(
  data: Uint8Array
): ChatKickAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  return { avatarId, roomName };
}

export function createChatKickAvatarFromRoom(
  avatarId: ChatAvatarId,
  roomName: string
): ChatKickAvatarFromRoom {
  return { avatarId, roomName };
}

// ============================================================================
// ChatBanAvatarFromRoom
// ============================================================================

export interface ChatBanAvatarFromRoom {
  avatarId: ChatAvatarId;
  roomName: string;
  sequence: number;
}

export function serializeChatBanAvatarFromRoom(
  message: ChatBanAvatarFromRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatBanAvatarFromRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  writer.writeUInt32LE(message.sequence);
  return writer.toBuffer();
}

export function deserializeChatBanAvatarFromRoom(
  data: Uint8Array
): ChatBanAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  const sequence = reader.readUInt32LE();
  return { avatarId, roomName, sequence };
}

export function createChatBanAvatarFromRoom(
  avatarId: ChatAvatarId,
  roomName: string,
  sequence: number
): ChatBanAvatarFromRoom {
  return { avatarId, roomName, sequence };
}

// ============================================================================
// ChatUnbanAvatarFromRoom
// ============================================================================

export interface ChatUnbanAvatarFromRoom {
  avatarId: ChatAvatarId;
  roomName: string;
  sequence: number;
}

export function serializeChatUnbanAvatarFromRoom(
  message: ChatUnbanAvatarFromRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatUnbanAvatarFromRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  writer.writeUInt32LE(message.sequence);
  return writer.toBuffer();
}

export function deserializeChatUnbanAvatarFromRoom(
  data: Uint8Array
): ChatUnbanAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  const sequence = reader.readUInt32LE();
  return { avatarId, roomName, sequence };
}

export function createChatUnbanAvatarFromRoom(
  avatarId: ChatAvatarId,
  roomName: string,
  sequence: number
): ChatUnbanAvatarFromRoom {
  return { avatarId, roomName, sequence };
}

// ============================================================================
// ChatAddModeratorToRoom
// ============================================================================

export interface ChatAddModeratorToRoom {
  avatarId: ChatAvatarId;
  roomName: string;
  sequenceId: number;
}

export function serializeChatAddModeratorToRoom(
  message: ChatAddModeratorToRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatAddModeratorToRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  writer.writeUInt32LE(message.sequenceId);
  return writer.toBuffer();
}

export function deserializeChatAddModeratorToRoom(
  data: Uint8Array
): ChatAddModeratorToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  const sequenceId = reader.readUInt32LE();
  return { avatarId, roomName, sequenceId };
}

export function createChatAddModeratorToRoom(
  avatarId: ChatAvatarId,
  roomName: string,
  sequenceId: number
): ChatAddModeratorToRoom {
  return { avatarId, roomName, sequenceId };
}

// ============================================================================
// ChatRemoveModeratorFromRoom
// ============================================================================

export interface ChatRemoveModeratorFromRoom {
  avatarId: ChatAvatarId;
  roomName: string;
  sequenceId: number;
}

export function serializeChatRemoveModeratorFromRoom(
  message: ChatRemoveModeratorFromRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatRemoveModeratorFromRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  writer.writeUInt32LE(message.sequenceId);
  return writer.toBuffer();
}

export function deserializeChatRemoveModeratorFromRoom(
  data: Uint8Array
): ChatRemoveModeratorFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  const sequenceId = reader.readUInt32LE();
  return { avatarId, roomName, sequenceId };
}

export function createChatRemoveModeratorFromRoom(
  avatarId: ChatAvatarId,
  roomName: string,
  sequenceId: number
): ChatRemoveModeratorFromRoom {
  return { avatarId, roomName, sequenceId };
}

// ============================================================================
// ChatPersistentMessageToClientData (helper struct)
// ============================================================================

export interface ChatPersistentMessageToClientData {
  fromCharacterName: string;
  fromGameCode: string;
  fromServerCode: string;
  id: number;
  isHeader: boolean;
  message: string;
  subject: string;
  outOfBand: string;
  status: number; // signed byte
  timeStamp: number;
}

function writeChatPersistentMessageToClientData(
  writer: BufferWriter,
  data: ChatPersistentMessageToClientData
): void {
  writer.writeStringWithLength16LE(data.fromCharacterName);
  writer.writeStringWithLength16LE(data.fromGameCode);
  writer.writeStringWithLength16LE(data.fromServerCode);
  writer.writeUInt32LE(data.id);
  writer.writeUInt8(data.isHeader ? 1 : 0);
  writer.writeUnicodeStringWithLength(data.message);
  writer.writeUnicodeStringWithLength(data.subject);
  writer.writeUnicodeStringWithLength(data.outOfBand);
  writer.writeInt8(data.status);
  writer.writeUInt32LE(data.timeStamp);
}

function readChatPersistentMessageToClientData(
  reader: BufferReader
): ChatPersistentMessageToClientData {
  const fromCharacterName = reader.readStringWithLength16LE();
  const fromGameCode = reader.readStringWithLength16LE();
  const fromServerCode = reader.readStringWithLength16LE();
  const id = reader.readUInt32LE();
  const isHeader = reader.readUInt8() !== 0;
  const message = reader.readUnicodeStringWithLength();
  const subject = reader.readUnicodeStringWithLength();
  const outOfBand = reader.readUnicodeStringWithLength();
  const status = reader.readInt8();
  const timeStamp = reader.readUInt32LE();
  return {
    fromCharacterName,
    fromGameCode,
    fromServerCode,
    id,
    isHeader,
    message,
    subject,
    outOfBand,
    status,
    timeStamp,
  };
}

// ============================================================================
// ChatPersistentMessageToClient
// ============================================================================

export interface ChatPersistentMessageToClient {
  data: ChatPersistentMessageToClientData;
}

export function serializeChatPersistentMessageToClient(
  message: ChatPersistentMessageToClient
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount (the data struct counts as 1)
  writer.writeUInt32LE(ChatModerationOpcodes.ChatPersistentMessageToClient);
  writeChatPersistentMessageToClientData(writer, message.data);
  return writer.toBuffer();
}

export function deserializeChatPersistentMessageToClient(
  rawData: Uint8Array
): ChatPersistentMessageToClient {
  const reader = new BufferReader(rawData);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const data = readChatPersistentMessageToClientData(reader);
  return { data };
}

export function createChatPersistentMessageToClient(
  data: ChatPersistentMessageToClientData
): ChatPersistentMessageToClient {
  return { data };
}

// ============================================================================
// ChatPersistentMessageToServer
// ============================================================================

export interface ChatPersistentMessageToServer {
  message: string;
  outOfBand: string;
  sequence: number;
  subject: string;
  toCharacterName: ChatAvatarId;
}

export function serializeChatPersistentMessageToServer(
  message: ChatPersistentMessageToServer
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatPersistentMessageToServer);
  writer.writeUnicodeStringWithLength(message.message);
  writer.writeUnicodeStringWithLength(message.outOfBand);
  writer.writeUInt32LE(message.sequence);
  writer.writeUnicodeStringWithLength(message.subject);
  writeChatAvatarId(writer, message.toCharacterName);
  return writer.toBuffer();
}

export function deserializeChatPersistentMessageToServer(
  data: Uint8Array
): ChatPersistentMessageToServer {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const message = reader.readUnicodeStringWithLength();
  const outOfBand = reader.readUnicodeStringWithLength();
  const sequence = reader.readUInt32LE();
  const subject = reader.readUnicodeStringWithLength();
  const toCharacterName = readChatAvatarId(reader);
  return { message, outOfBand, sequence, subject, toCharacterName };
}

export function createChatPersistentMessageToServer(
  message: string,
  outOfBand: string,
  sequence: number,
  subject: string,
  toCharacterName: ChatAvatarId
): ChatPersistentMessageToServer {
  return { message, outOfBand, sequence, subject, toCharacterName };
}

// ============================================================================
// ChatDeletePersistentMessage
// ============================================================================

export interface ChatDeletePersistentMessage {
  messageId: number;
}

export function serializeChatDeletePersistentMessage(
  message: ChatDeletePersistentMessage
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatDeletePersistentMessage);
  writer.writeUInt32LE(message.messageId);
  return writer.toBuffer();
}

export function deserializeChatDeletePersistentMessage(
  data: Uint8Array
): ChatDeletePersistentMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const messageId = reader.readUInt32LE();
  return { messageId };
}

export function createChatDeletePersistentMessage(
  messageId: number
): ChatDeletePersistentMessage {
  return { messageId };
}

// ============================================================================
// ChatDeleteAllPersistentMessages
// ============================================================================

export interface ChatDeleteAllPersistentMessages {
  sourceNetworkId: bigint;
  targetNetworkId: bigint;
}

export function serializeChatDeleteAllPersistentMessages(
  message: ChatDeleteAllPersistentMessages
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatDeleteAllPersistentMessages);
  writer.writeUInt64LE(message.sourceNetworkId);
  writer.writeUInt64LE(message.targetNetworkId);
  return writer.toBuffer();
}

export function deserializeChatDeleteAllPersistentMessages(
  data: Uint8Array
): ChatDeleteAllPersistentMessages {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const sourceNetworkId = reader.readUInt64LE();
  const targetNetworkId = reader.readUInt64LE();
  return { sourceNetworkId, targetNetworkId };
}

export function createChatDeleteAllPersistentMessages(
  sourceNetworkId: bigint,
  targetNetworkId: bigint
): ChatDeleteAllPersistentMessages {
  return { sourceNetworkId, targetNetworkId };
}

// ============================================================================
// ChatRequestPersistentMessage
// ============================================================================

export interface ChatRequestPersistentMessage {
  sequence: number;
  messageId: number;
}

export function serializeChatRequestPersistentMessage(
  message: ChatRequestPersistentMessage
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatRequestPersistentMessage);
  writer.writeUInt32LE(message.sequence);
  writer.writeUInt32LE(message.messageId);
  return writer.toBuffer();
}

export function deserializeChatRequestPersistentMessage(
  data: Uint8Array
): ChatRequestPersistentMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const sequence = reader.readUInt32LE();
  const messageId = reader.readUInt32LE();
  return { sequence, messageId };
}

export function createChatRequestPersistentMessage(
  sequence: number,
  messageId: number
): ChatRequestPersistentMessage {
  return { sequence, messageId };
}

// ============================================================================
// ChatOnSendPersistentMessage
// ============================================================================

export interface ChatOnSendPersistentMessage {
  result: number;
  sequence: number;
}

export function serializeChatOnSendPersistentMessage(
  message: ChatOnSendPersistentMessage
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatOnSendPersistentMessage);
  writer.writeUInt32LE(message.result);
  writer.writeUInt32LE(message.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnSendPersistentMessage(
  data: Uint8Array
): ChatOnSendPersistentMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { result, sequence };
}

export function createChatOnSendPersistentMessage(
  result: number,
  sequence: number
): ChatOnSendPersistentMessage {
  return { result, sequence };
}

// ============================================================================
// ChatPutAvatarInRoom
// ============================================================================

export interface ChatPutAvatarInRoom {
  avatarName: string;
  roomName: string;
  forceCreate: boolean;
  createPrivate: boolean;
}

export function serializeChatPutAvatarInRoom(
  message: ChatPutAvatarInRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatPutAvatarInRoom);
  writer.writeStringWithLength16LE(message.avatarName);
  writer.writeStringWithLength16LE(message.roomName);
  writer.writeUInt8(message.forceCreate ? 1 : 0);
  writer.writeUInt8(message.createPrivate ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeChatPutAvatarInRoom(
  data: Uint8Array
): ChatPutAvatarInRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarName = reader.readStringWithLength16LE();
  const roomName = reader.readStringWithLength16LE();
  const forceCreate = reader.readUInt8() !== 0;
  const createPrivate = reader.readUInt8() !== 0;
  return { avatarName, roomName, forceCreate, createPrivate };
}

export function createChatPutAvatarInRoom(
  avatarName: string,
  roomName: string,
  forceCreate: boolean,
  createPrivate: boolean
): ChatPutAvatarInRoom {
  return { avatarName, roomName, forceCreate, createPrivate };
}

// ============================================================================
// ChatOnConnectAvatar
// ============================================================================

export interface ChatOnConnectAvatar {
  // Empty message - just operandCount + opcode
}

export function serializeChatOnConnectAvatar(
  _message: ChatOnConnectAvatar
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatOnConnectAvatar);
  return writer.toBuffer();
}

export function deserializeChatOnConnectAvatar(
  data: Uint8Array
): ChatOnConnectAvatar {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {};
}

export function createChatOnConnectAvatar(): ChatOnConnectAvatar {
  return {};
}

// ============================================================================
// ChatMessageFromGame
// ============================================================================

export enum ChatMessageType {
  INSTANT = 0,
  PERSISTENT = 1,
  ROOM = 2,
}

export interface ChatMessageFromGame {
  from: string;
  message: string;
  messageType: number;
  oob: string;
  room: string;
  subject: string;
  to: string;
}

export function serializeChatMessageFromGame(
  message: ChatMessageFromGame
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(7); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatMessageFromGame);
  writer.writeStringWithLength16LE(message.from);
  writer.writeUnicodeStringWithLength(message.message);
  writer.writeUInt8(message.messageType);
  writer.writeUnicodeStringWithLength(message.oob);
  writer.writeStringWithLength16LE(message.room);
  writer.writeUnicodeStringWithLength(message.subject);
  writer.writeStringWithLength16LE(message.to);
  return writer.toBuffer();
}

export function deserializeChatMessageFromGame(
  data: Uint8Array
): ChatMessageFromGame {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const from = reader.readStringWithLength16LE();
  const message = reader.readUnicodeStringWithLength();
  const messageType = reader.readUInt8();
  const oob = reader.readUnicodeStringWithLength();
  const room = reader.readStringWithLength16LE();
  const subject = reader.readUnicodeStringWithLength();
  const to = reader.readStringWithLength16LE();
  return { from, message, messageType, oob, room, subject, to };
}

export function createChatMessageFromGame(
  from: string,
  message: string,
  messageType: number,
  oob: string,
  room: string,
  subject: string,
  to: string
): ChatMessageFromGame {
  return { from, message, messageType, oob, room, subject, to };
}

// ============================================================================
// ChatOnSendRoomMessage
// ============================================================================

export interface ChatOnSendRoomMessage {
  result: number;
  sequence: number;
}

export function serializeChatOnSendRoomMessage(
  message: ChatOnSendRoomMessage
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatOnSendRoomMessage);
  writer.writeUInt32LE(message.result);
  writer.writeUInt32LE(message.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnSendRoomMessage(
  data: Uint8Array
): ChatOnSendRoomMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { result, sequence };
}

export function createChatOnSendRoomMessage(
  result: number,
  sequence: number
): ChatOnSendRoomMessage {
  return { result, sequence };
}

// ============================================================================
// ChatInviteGroupToRoom
// ============================================================================

export interface ChatInviteGroupToRoom {
  avatarId: ChatAvatarId;
  roomName: string;
}

export function serializeChatInviteGroupToRoom(
  message: ChatInviteGroupToRoom
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatModerationOpcodes.ChatInviteGroupToRoom);
  writeChatAvatarId(writer, message.avatarId);
  writer.writeStringWithLength16LE(message.roomName);
  return writer.toBuffer();
}

export function deserializeChatInviteGroupToRoom(
  data: Uint8Array
): ChatInviteGroupToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const avatarId = readChatAvatarId(reader);
  const roomName = reader.readStringWithLength16LE();
  return { avatarId, roomName };
}

export function createChatInviteGroupToRoom(
  avatarId: ChatAvatarId,
  roomName: string
): ChatInviteGroupToRoom {
  return { avatarId, roomName };
}

// ============================================================================
// ChatOnDeleteAllPersistentMessages
// ============================================================================

export interface ChatOnDeleteAllPersistentMessages {
  targetName: string;
  success: boolean;
}

export function serializeChatOnDeleteAllPersistentMessages(
  message: ChatOnDeleteAllPersistentMessages
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(
    ChatModerationOpcodes.ChatOnDeleteAllPersistentMessages
  );
  writer.writeStringWithLength16LE(message.targetName);
  writer.writeUInt8(message.success ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeChatOnDeleteAllPersistentMessages(
  data: Uint8Array
): ChatOnDeleteAllPersistentMessages {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const targetName = reader.readStringWithLength16LE();
  const success = reader.readUInt8() !== 0;
  return { targetName, success };
}

export function createChatOnDeleteAllPersistentMessages(
  targetName: string,
  success: boolean
): ChatOnDeleteAllPersistentMessages {
  return { targetName, success };
}
