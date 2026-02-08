import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// Pre-computed CRC32 opcodes for chat messages
export const ChatCoreOpcodes = {
  ChatInstantMessageToCharacter: 0x84bb21f7,
  ChatInstantMessageToClient: 0x6188a16c,
  ChatOnSendInstantMessage: 0x8f251641,
  ChatEnterRoom: 0xbc6bdeda,
  ChatEnterRoomById: 0xbc552f21,
  ChatOnEnteredRoom: 0xe69bdc0a,
  ChatSendToRoom: 0x20e4dbe3,
  ChatRoomMessage: 0xcd4ce444,
  ChatCreateRoom: 0x35366bed,
  ChatOnCreateRoom: 0x35d7cc9f,
  ChatSystemMessage: 0x6d2a6413,
  ChatRequestRoomList: 0x4c3d2cfa,
  ChatRoomList: 0x70cc5afc,
  ChatQueryRoom: 0x9cf2b3b0,
  ChatQueryRoomResults: 0xc4de864e,
  ChatRemoveAvatarFromRoom: 0x493e3ffa,
  ChatOnLeaveRoom: 0x60b5098b,
  ChatDestroyRoom: 0x094b2a47,
  ChatServerStatus: 0x7102b15f,
} as const;

// Helper interfaces and functions for composite types

export interface ChatAvatarId {
  gameCode: string;
  cluster: string;
  name: string;
}

export function readChatAvatarId(reader: BufferReader): ChatAvatarId {
  return {
    gameCode: reader.readStringWithLength16LE(),
    cluster: reader.readStringWithLength16LE(),
    name: reader.readStringWithLength16LE(),
  };
}

export function writeChatAvatarId(writer: BufferWriter, avatarId: ChatAvatarId): void {
  writer.writeStringWithLength16LE(avatarId.gameCode);
  writer.writeStringWithLength16LE(avatarId.cluster);
  writer.writeStringWithLength16LE(avatarId.name);
}

export interface ChatRoomData {
  id: number;
  roomType: number;
  moderated: number;
  path: string;
  owner: ChatAvatarId;
  creator: ChatAvatarId;
  title: string;
  moderators: ChatAvatarId[];
  invitees: ChatAvatarId[];
}

export function readChatRoomData(reader: BufferReader): ChatRoomData {
  const id = reader.readUInt32LE();
  const roomType = reader.readUInt32LE();
  const moderated = reader.readUInt8();
  const path = reader.readStringWithLength16LE();
  const owner = readChatAvatarId(reader);
  const creator = readChatAvatarId(reader);
  const title = reader.readUnicodeStringWithLength();

  const moderatorCount = reader.readUInt32LE();
  const moderators: ChatAvatarId[] = [];
  for (let i = 0; i < moderatorCount; i++) {
    moderators.push(readChatAvatarId(reader));
  }

  const inviteeCount = reader.readUInt32LE();
  const invitees: ChatAvatarId[] = [];
  for (let i = 0; i < inviteeCount; i++) {
    invitees.push(readChatAvatarId(reader));
  }

  return {
    id,
    roomType,
    moderated,
    path,
    owner,
    creator,
    title,
    moderators,
    invitees,
  };
}

export function writeChatRoomData(writer: BufferWriter, roomData: ChatRoomData): void {
  writer.writeUInt32LE(roomData.id);
  writer.writeUInt32LE(roomData.roomType);
  writer.writeUInt8(roomData.moderated);
  writer.writeStringWithLength16LE(roomData.path);
  writeChatAvatarId(writer, roomData.owner);
  writeChatAvatarId(writer, roomData.creator);
  writer.writeUnicodeStringWithLength(roomData.title);

  writer.writeUInt32LE(roomData.moderators.length);
  for (const moderator of roomData.moderators) {
    writeChatAvatarId(writer, moderator);
  }

  writer.writeUInt32LE(roomData.invitees.length);
  for (const invitee of roomData.invitees) {
    writeChatAvatarId(writer, invitee);
  }
}

// 1. ChatInstantMessageToCharacter

export interface ChatInstantMessageToCharacter {
  characterName: ChatAvatarId;
  message: string;
  outOfBand: string;
  sequence: number;
}

export function serializeChatInstantMessageToCharacter(msg: ChatInstantMessageToCharacter): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatInstantMessageToCharacter);
  writeChatAvatarId(writer, msg.characterName);
  writer.writeUnicodeStringWithLength(msg.message);
  writer.writeUnicodeStringWithLength(msg.outOfBand);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatInstantMessageToCharacter(data: Uint8Array): ChatInstantMessageToCharacter {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatInstantMessageToCharacter) {
    throw new Error(`Invalid opcode for ChatInstantMessageToCharacter: ${opcode.toString(16)}`);
  }

  return {
    characterName: readChatAvatarId(reader),
    message: reader.readUnicodeStringWithLength(),
    outOfBand: reader.readUnicodeStringWithLength(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatInstantMessageToCharacter(
  characterName: ChatAvatarId,
  message: string,
  outOfBand: string,
  sequence: number
): ChatInstantMessageToCharacter {
  return { characterName, message, outOfBand, sequence };
}

// 2. ChatInstantMessageToClient

export interface ChatInstantMessageToClient {
  fromName: ChatAvatarId;
  message: string;
  outOfBand: string;
}

export function serializeChatInstantMessageToClient(msg: ChatInstantMessageToClient): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatInstantMessageToClient);
  writeChatAvatarId(writer, msg.fromName);
  writer.writeUnicodeStringWithLength(msg.message);
  writer.writeUnicodeStringWithLength(msg.outOfBand);
  return writer.toBuffer();
}

export function deserializeChatInstantMessageToClient(data: Uint8Array): ChatInstantMessageToClient {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatInstantMessageToClient) {
    throw new Error(`Invalid opcode for ChatInstantMessageToClient: ${opcode.toString(16)}`);
  }

  return {
    fromName: readChatAvatarId(reader),
    message: reader.readUnicodeStringWithLength(),
    outOfBand: reader.readUnicodeStringWithLength(),
  };
}

export function createChatInstantMessageToClient(
  fromName: ChatAvatarId,
  message: string,
  outOfBand: string
): ChatInstantMessageToClient {
  return { fromName, message, outOfBand };
}

// 3. ChatOnSendInstantMessage

export interface ChatOnSendInstantMessage {
  result: number;
  sequence: number;
}

export function serializeChatOnSendInstantMessage(msg: ChatOnSendInstantMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatOnSendInstantMessage);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnSendInstantMessage(data: Uint8Array): ChatOnSendInstantMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatOnSendInstantMessage) {
    throw new Error(`Invalid opcode for ChatOnSendInstantMessage: ${opcode.toString(16)}`);
  }

  return {
    result: reader.readUInt32LE(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatOnSendInstantMessage(result: number, sequence: number): ChatOnSendInstantMessage {
  return { result, sequence };
}

// 4. ChatEnterRoom

export interface ChatEnterRoom {
  sequence: number;
  roomName: string;
}

export function serializeChatEnterRoom(msg: ChatEnterRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatEnterRoom);
  writer.writeUInt32LE(msg.sequence);
  writer.writeStringWithLength16LE(msg.roomName);
  return writer.toBuffer();
}

export function deserializeChatEnterRoom(data: Uint8Array): ChatEnterRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatEnterRoom) {
    throw new Error(`Invalid opcode for ChatEnterRoom: ${opcode.toString(16)}`);
  }

  return {
    sequence: reader.readUInt32LE(),
    roomName: reader.readStringWithLength16LE(),
  };
}

export function createChatEnterRoom(sequence: number, roomName: string): ChatEnterRoom {
  return { sequence, roomName };
}

// 5. ChatEnterRoomById

export interface ChatEnterRoomById {
  sequence: number;
  roomId: number;
  roomName: string;
}

export function serializeChatEnterRoomById(msg: ChatEnterRoomById): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatEnterRoomById);
  writer.writeUInt32LE(msg.sequence);
  writer.writeUInt32LE(msg.roomId);
  writer.writeStringWithLength16LE(msg.roomName);
  return writer.toBuffer();
}

export function deserializeChatEnterRoomById(data: Uint8Array): ChatEnterRoomById {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatEnterRoomById) {
    throw new Error(`Invalid opcode for ChatEnterRoomById: ${opcode.toString(16)}`);
  }

  return {
    sequence: reader.readUInt32LE(),
    roomId: reader.readUInt32LE(),
    roomName: reader.readStringWithLength16LE(),
  };
}

export function createChatEnterRoomById(sequence: number, roomId: number, roomName: string): ChatEnterRoomById {
  return { sequence, roomId, roomName };
}

// 6. ChatOnEnteredRoom

export interface ChatOnEnteredRoom {
  characterName: ChatAvatarId;
  result: number;
  roomId: number;
  sequence: number;
}

export function serializeChatOnEnteredRoom(msg: ChatOnEnteredRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatOnEnteredRoom);
  writeChatAvatarId(writer, msg.characterName);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.roomId);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnEnteredRoom(data: Uint8Array): ChatOnEnteredRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatOnEnteredRoom) {
    throw new Error(`Invalid opcode for ChatOnEnteredRoom: ${opcode.toString(16)}`);
  }

  return {
    characterName: readChatAvatarId(reader),
    result: reader.readUInt32LE(),
    roomId: reader.readUInt32LE(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatOnEnteredRoom(
  characterName: ChatAvatarId,
  result: number,
  roomId: number,
  sequence: number
): ChatOnEnteredRoom {
  return { characterName, result, roomId, sequence };
}

// 7. ChatSendToRoom

export interface ChatSendToRoom {
  message: string;
  outOfBand: string;
  roomId: number;
  sequence: number;
}

export function serializeChatSendToRoom(msg: ChatSendToRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatSendToRoom);
  writer.writeUnicodeStringWithLength(msg.message);
  writer.writeUnicodeStringWithLength(msg.outOfBand);
  writer.writeUInt32LE(msg.roomId);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatSendToRoom(data: Uint8Array): ChatSendToRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatSendToRoom) {
    throw new Error(`Invalid opcode for ChatSendToRoom: ${opcode.toString(16)}`);
  }

  return {
    message: reader.readUnicodeStringWithLength(),
    outOfBand: reader.readUnicodeStringWithLength(),
    roomId: reader.readUInt32LE(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatSendToRoom(
  message: string,
  outOfBand: string,
  roomId: number,
  sequence: number
): ChatSendToRoom {
  return { message, outOfBand, roomId, sequence };
}

// 8. ChatRoomMessage

export interface ChatRoomMessage {
  fromName: ChatAvatarId;
  fromRoom: number;
  message: string;
  outOfBand: string;
}

export function serializeChatRoomMessage(msg: ChatRoomMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatRoomMessage);
  writeChatAvatarId(writer, msg.fromName);
  writer.writeUInt32LE(msg.fromRoom);
  writer.writeUnicodeStringWithLength(msg.message);
  writer.writeUnicodeStringWithLength(msg.outOfBand);
  return writer.toBuffer();
}

export function deserializeChatRoomMessage(data: Uint8Array): ChatRoomMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatRoomMessage) {
    throw new Error(`Invalid opcode for ChatRoomMessage: ${opcode.toString(16)}`);
  }

  return {
    fromName: readChatAvatarId(reader),
    fromRoom: reader.readUInt32LE(),
    message: reader.readUnicodeStringWithLength(),
    outOfBand: reader.readUnicodeStringWithLength(),
  };
}

export function createChatRoomMessage(
  fromName: ChatAvatarId,
  fromRoom: number,
  message: string,
  outOfBand: string
): ChatRoomMessage {
  return { fromName, fromRoom, message, outOfBand };
}

// 9. ChatCreateRoom

export interface ChatCreateRoom {
  isPublic: boolean;
  isModerated: boolean;
  ownerName: string;
  roomName: string;
  roomTitle: string;
  sequence: number;
}

export function serializeChatCreateRoom(msg: ChatCreateRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(6); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatCreateRoom);
  writer.writeUInt8(msg.isPublic ? 1 : 0);
  writer.writeUInt8(msg.isModerated ? 1 : 0);
  writer.writeStringWithLength16LE(msg.ownerName);
  writer.writeStringWithLength16LE(msg.roomName);
  writer.writeStringWithLength16LE(msg.roomTitle);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatCreateRoom(data: Uint8Array): ChatCreateRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatCreateRoom) {
    throw new Error(`Invalid opcode for ChatCreateRoom: ${opcode.toString(16)}`);
  }

  return {
    isPublic: reader.readUInt8() !== 0,
    isModerated: reader.readUInt8() !== 0,
    ownerName: reader.readStringWithLength16LE(),
    roomName: reader.readStringWithLength16LE(),
    roomTitle: reader.readStringWithLength16LE(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatCreateRoom(
  isPublic: boolean,
  isModerated: boolean,
  ownerName: string,
  roomName: string,
  roomTitle: string,
  sequence: number
): ChatCreateRoom {
  return { isPublic, isModerated, ownerName, roomName, roomTitle, sequence };
}

// 10. ChatOnCreateRoom

export interface ChatOnCreateRoom {
  resultCode: number;
  roomData: ChatRoomData;
  sequence: number;
}

export function serializeChatOnCreateRoom(msg: ChatOnCreateRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatOnCreateRoom);
  writer.writeUInt32LE(msg.resultCode);
  writeChatRoomData(writer, msg.roomData);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnCreateRoom(data: Uint8Array): ChatOnCreateRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatOnCreateRoom) {
    throw new Error(`Invalid opcode for ChatOnCreateRoom: ${opcode.toString(16)}`);
  }

  return {
    resultCode: reader.readUInt32LE(),
    roomData: readChatRoomData(reader),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatOnCreateRoom(
  resultCode: number,
  roomData: ChatRoomData,
  sequence: number
): ChatOnCreateRoom {
  return { resultCode, roomData, sequence };
}

// 11. ChatSystemMessage

export enum ChatSystemMessageFlags {
  PERSONAL = 0x00,
  BROADCAST = 0x01,
  F_chatBoxOnly = 0x02,
  F_quest = 0x04,
}

export interface ChatSystemMessage {
  flags: number;
  message: string;
  outOfBand: string;
}

export function serializeChatSystemMessage(msg: ChatSystemMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatSystemMessage);
  writer.writeUInt8(msg.flags);
  writer.writeUnicodeStringWithLength(msg.message);
  writer.writeUnicodeStringWithLength(msg.outOfBand);
  return writer.toBuffer();
}

export function deserializeChatSystemMessage(data: Uint8Array): ChatSystemMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatSystemMessage) {
    throw new Error(`Invalid opcode for ChatSystemMessage: ${opcode.toString(16)}`);
  }

  return {
    flags: reader.readUInt8(),
    message: reader.readUnicodeStringWithLength(),
    outOfBand: reader.readUnicodeStringWithLength(),
  };
}

export function createChatSystemMessage(flags: number, message: string, outOfBand: string): ChatSystemMessage {
  return { flags, message, outOfBand };
}

// 12. ChatRequestRoomList

export interface ChatRequestRoomList {
  // Empty message - no fields
}

export function serializeChatRequestRoomList(): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount (no fields)
  writer.writeUInt32LE(ChatCoreOpcodes.ChatRequestRoomList);
  return writer.toBuffer();
}

export function deserializeChatRequestRoomList(data: Uint8Array): ChatRequestRoomList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatRequestRoomList) {
    throw new Error(`Invalid opcode for ChatRequestRoomList: ${opcode.toString(16)}`);
  }

  return {};
}

export function createChatRequestRoomList(): ChatRequestRoomList {
  return {};
}

// 13. ChatRoomList

export interface ChatRoomList {
  roomData: ChatRoomData[];
}

export function serializeChatRoomList(msg: ChatRoomList): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatRoomList);
  writer.writeUInt32LE(msg.roomData.length);
  for (const room of msg.roomData) {
    writeChatRoomData(writer, room);
  }
  return writer.toBuffer();
}

export function deserializeChatRoomList(data: Uint8Array): ChatRoomList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatRoomList) {
    throw new Error(`Invalid opcode for ChatRoomList: ${opcode.toString(16)}`);
  }

  const count = reader.readUInt32LE();
  const roomData: ChatRoomData[] = [];
  for (let i = 0; i < count; i++) {
    roomData.push(readChatRoomData(reader));
  }

  return { roomData };
}

export function createChatRoomList(roomData: ChatRoomData[]): ChatRoomList {
  return { roomData };
}

// 14. ChatQueryRoom

export interface ChatQueryRoom {
  sequence: number;
  roomName: string;
}

export function serializeChatQueryRoom(msg: ChatQueryRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatQueryRoom);
  writer.writeUInt32LE(msg.sequence);
  writer.writeStringWithLength16LE(msg.roomName);
  return writer.toBuffer();
}

export function deserializeChatQueryRoom(data: Uint8Array): ChatQueryRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatQueryRoom) {
    throw new Error(`Invalid opcode for ChatQueryRoom: ${opcode.toString(16)}`);
  }

  return {
    sequence: reader.readUInt32LE(),
    roomName: reader.readStringWithLength16LE(),
  };
}

export function createChatQueryRoom(sequence: number, roomName: string): ChatQueryRoom {
  return { sequence, roomName };
}

// 15. ChatQueryRoomResults

export interface ChatQueryRoomResults {
  avatars: ChatAvatarId[];
  invitees: ChatAvatarId[];
  moderators: ChatAvatarId[];
  banned: ChatAvatarId[];
  sequence: number;
  roomData: ChatRoomData;
}

export function serializeChatQueryRoomResults(msg: ChatQueryRoomResults): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(6); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatQueryRoomResults);

  writer.writeUInt32LE(msg.avatars.length);
  for (const avatar of msg.avatars) {
    writeChatAvatarId(writer, avatar);
  }

  writer.writeUInt32LE(msg.invitees.length);
  for (const invitee of msg.invitees) {
    writeChatAvatarId(writer, invitee);
  }

  writer.writeUInt32LE(msg.moderators.length);
  for (const moderator of msg.moderators) {
    writeChatAvatarId(writer, moderator);
  }

  writer.writeUInt32LE(msg.banned.length);
  for (const banned of msg.banned) {
    writeChatAvatarId(writer, banned);
  }

  writer.writeUInt32LE(msg.sequence);
  writeChatRoomData(writer, msg.roomData);

  return writer.toBuffer();
}

export function deserializeChatQueryRoomResults(data: Uint8Array): ChatQueryRoomResults {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatQueryRoomResults) {
    throw new Error(`Invalid opcode for ChatQueryRoomResults: ${opcode.toString(16)}`);
  }

  const avatarCount = reader.readUInt32LE();
  const avatars: ChatAvatarId[] = [];
  for (let i = 0; i < avatarCount; i++) {
    avatars.push(readChatAvatarId(reader));
  }

  const inviteeCount = reader.readUInt32LE();
  const invitees: ChatAvatarId[] = [];
  for (let i = 0; i < inviteeCount; i++) {
    invitees.push(readChatAvatarId(reader));
  }

  const moderatorCount = reader.readUInt32LE();
  const moderators: ChatAvatarId[] = [];
  for (let i = 0; i < moderatorCount; i++) {
    moderators.push(readChatAvatarId(reader));
  }

  const bannedCount = reader.readUInt32LE();
  const banned: ChatAvatarId[] = [];
  for (let i = 0; i < bannedCount; i++) {
    banned.push(readChatAvatarId(reader));
  }

  const sequence = reader.readUInt32LE();
  const roomData = readChatRoomData(reader);

  return { avatars, invitees, moderators, banned, sequence, roomData };
}

export function createChatQueryRoomResults(
  avatars: ChatAvatarId[],
  invitees: ChatAvatarId[],
  moderators: ChatAvatarId[],
  banned: ChatAvatarId[],
  sequence: number,
  roomData: ChatRoomData
): ChatQueryRoomResults {
  return { avatars, invitees, moderators, banned, sequence, roomData };
}

// 16. ChatRemoveAvatarFromRoom

export interface ChatRemoveAvatarFromRoom {
  avatarId: ChatAvatarId;
  roomName: string;
}

export function serializeChatRemoveAvatarFromRoom(msg: ChatRemoveAvatarFromRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatRemoveAvatarFromRoom);
  writeChatAvatarId(writer, msg.avatarId);
  writer.writeStringWithLength16LE(msg.roomName);
  return writer.toBuffer();
}

export function deserializeChatRemoveAvatarFromRoom(data: Uint8Array): ChatRemoveAvatarFromRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatRemoveAvatarFromRoom) {
    throw new Error(`Invalid opcode for ChatRemoveAvatarFromRoom: ${opcode.toString(16)}`);
  }

  return {
    avatarId: readChatAvatarId(reader),
    roomName: reader.readStringWithLength16LE(),
  };
}

export function createChatRemoveAvatarFromRoom(avatarId: ChatAvatarId, roomName: string): ChatRemoveAvatarFromRoom {
  return { avatarId, roomName };
}

// 17. ChatOnLeaveRoom

export interface ChatOnLeaveRoom {
  characterName: ChatAvatarId;
  resultCode: number;
  roomId: number;
  sequence: number;
}

export function serializeChatOnLeaveRoom(msg: ChatOnLeaveRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatOnLeaveRoom);
  writeChatAvatarId(writer, msg.characterName);
  writer.writeUInt32LE(msg.resultCode);
  writer.writeUInt32LE(msg.roomId);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnLeaveRoom(data: Uint8Array): ChatOnLeaveRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatOnLeaveRoom) {
    throw new Error(`Invalid opcode for ChatOnLeaveRoom: ${opcode.toString(16)}`);
  }

  return {
    characterName: readChatAvatarId(reader),
    resultCode: reader.readUInt32LE(),
    roomId: reader.readUInt32LE(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatOnLeaveRoom(
  characterName: ChatAvatarId,
  resultCode: number,
  roomId: number,
  sequence: number
): ChatOnLeaveRoom {
  return { characterName, resultCode, roomId, sequence };
}

// 18. ChatDestroyRoom

export interface ChatDestroyRoom {
  roomId: number;
  sequence: number;
}

export function serializeChatDestroyRoom(msg: ChatDestroyRoom): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatCoreOpcodes.ChatDestroyRoom);
  writer.writeUInt32LE(msg.roomId);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatDestroyRoom(data: Uint8Array): ChatDestroyRoom {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatDestroyRoom) {
    throw new Error(`Invalid opcode for ChatDestroyRoom: ${opcode.toString(16)}`);
  }

  return {
    roomId: reader.readUInt32LE(),
    sequence: reader.readUInt32LE(),
  };
}

export function createChatDestroyRoom(roomId: number, sequence: number): ChatDestroyRoom {
  return { roomId, sequence };
}

// 19. ChatServerStatus

export interface ChatServerStatus {
  status: boolean;
}

export function serializeChatServerStatus(msg: ChatServerStatus): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount (1 field + operandCount itself)
  writer.writeUInt32LE(ChatCoreOpcodes.ChatServerStatus);
  writer.writeUInt8(msg.status ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeChatServerStatus(data: Uint8Array): ChatServerStatus {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ChatCoreOpcodes.ChatServerStatus) {
    throw new Error(`Invalid opcode for ChatServerStatus: ${opcode.toString(16)}`);
  }

  return {
    status: reader.readUInt8() !== 0,
  };
}

export function createChatServerStatus(status: boolean): ChatServerStatus {
  return { status };
}
