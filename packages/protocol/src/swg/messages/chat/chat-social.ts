import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';
import {
  type ChatAvatarId,
  readChatAvatarId,
  writeChatAvatarId,
} from './chat-core.js';

// ============================================================================
// Opcodes
// ============================================================================

export const ChatSocialOpcodes = {
  ChatAddFriend: 0xfae0e317,
  ChatRemoveFriend: 0x1a8a3670,
  ChatOnAddFriend: 0x24c2930c,
  ChatChangeFriendStatus: 0x6cd2fcd8,
  ChatOnChangeFriendStatus: 0xca125a6c,
  ChatFriendsListUpdate: 0x6d7ebaa6,
  ChatGetFriendsList: 0x66168cca,
  ChatOnGetFriendsList: 0x8b17477e,
  ChatGetIgnoreList: 0xbb6ee0e5,
  ChatOnGetIgnoreList: 0xf8d64c68,
  ChatChangeIgnoreStatus: 0xdaec8faf,
  ChatOnChangeIgnoreStatus: 0xb61375f6,
  ChatRequestLog: 0x4e9c2a72,
  ChatOnRequestLog: 0xa9eba583,
} as const;

// ============================================================================
// Helper Types
// ============================================================================

export interface ChatLogEntry {
  from: string;
  to: string;
  channel: string;
  message: string;
  time: number;
}

function writeChatLogEntry(writer: BufferWriter, entry: ChatLogEntry): void {
  writer.writeUnicodeStringWithLength(entry.from);
  writer.writeUnicodeStringWithLength(entry.to);
  writer.writeUnicodeStringWithLength(entry.channel);
  writer.writeUnicodeStringWithLength(entry.message);
  writer.writeUInt32LE(entry.time);
}

function readChatLogEntry(reader: BufferReader): ChatLogEntry {
  const from = reader.readUnicodeStringWithLength();
  const to = reader.readUnicodeStringWithLength();
  const channel = reader.readUnicodeStringWithLength();
  const message = reader.readUnicodeStringWithLength();
  const time = reader.readUInt32LE();
  return { from, to, channel, message, time };
}

// ============================================================================
// Friends Messages
// ============================================================================

// ChatAddFriend (0xfae0e317)
export interface ChatAddFriend {
  characterName: ChatAvatarId;
  sequence: number;
}

export function serializeChatAddFriend(msg: ChatAddFriend): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatAddFriend);
  writeChatAvatarId(writer, msg.characterName);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatAddFriend(data: Uint8Array): ChatAddFriend {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  const sequence = reader.readUInt32LE();
  return { characterName, sequence };
}

export function createChatAddFriend(
  characterName: ChatAvatarId,
  sequence: number
): Uint8Array {
  return serializeChatAddFriend({ characterName, sequence });
}

// ChatRemoveFriend (0x1a8a3670)
export interface ChatRemoveFriend {
  characterName: ChatAvatarId;
}

export function serializeChatRemoveFriend(msg: ChatRemoveFriend): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatRemoveFriend);
  writeChatAvatarId(writer, msg.characterName);
  return writer.toBuffer();
}

export function deserializeChatRemoveFriend(data: Uint8Array): ChatRemoveFriend {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  return { characterName };
}

export function createChatRemoveFriend(characterName: ChatAvatarId): Uint8Array {
  return serializeChatRemoveFriend({ characterName });
}

// ChatOnAddFriend (0x24c2930c)
export interface ChatOnAddFriend {
  result: number;
  sequence: number;
}

export function serializeChatOnAddFriend(msg: ChatOnAddFriend): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatOnAddFriend);
  writer.writeUInt32LE(msg.result);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnAddFriend(data: Uint8Array): ChatOnAddFriend {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const result = reader.readUInt32LE();
  const sequence = reader.readUInt32LE();
  return { result, sequence };
}

export function createChatOnAddFriend(result: number, sequence: number): Uint8Array {
  return serializeChatOnAddFriend({ result, sequence });
}

// ChatChangeFriendStatus (0x6cd2fcd8)
export interface ChatChangeFriendStatus {
  characterName: ChatAvatarId;
  friendName: ChatAvatarId;
  sequence: number;
  add: boolean;
}

export function serializeChatChangeFriendStatus(
  msg: ChatChangeFriendStatus
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatChangeFriendStatus);
  writeChatAvatarId(writer, msg.characterName);
  writeChatAvatarId(writer, msg.friendName);
  writer.writeUInt32LE(msg.sequence);
  writer.writeUInt8(msg.add ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeChatChangeFriendStatus(
  data: Uint8Array
): ChatChangeFriendStatus {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  const friendName = readChatAvatarId(reader);
  const sequence = reader.readUInt32LE();
  const add = reader.readUInt8() !== 0;
  return { characterName, friendName, sequence, add };
}

export function createChatChangeFriendStatus(
  characterName: ChatAvatarId,
  friendName: ChatAvatarId,
  sequence: number,
  add: boolean
): Uint8Array {
  return serializeChatChangeFriendStatus({
    characterName,
    friendName,
    sequence,
    add,
  });
}

// ChatOnChangeFriendStatus (0xca125a6c)
export interface ChatOnChangeFriendStatus {
  character: bigint;
  friendName: ChatAvatarId;
  sequence: number;
  add: boolean;
  resultCode: number;
}

export function serializeChatOnChangeFriendStatus(
  msg: ChatOnChangeFriendStatus
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatOnChangeFriendStatus);
  writer.writeUInt64LE(msg.character);
  writeChatAvatarId(writer, msg.friendName);
  writer.writeUInt32LE(msg.sequence);
  writer.writeUInt8(msg.add ? 1 : 0);
  writer.writeUInt32LE(msg.resultCode);
  return writer.toBuffer();
}

export function deserializeChatOnChangeFriendStatus(
  data: Uint8Array
): ChatOnChangeFriendStatus {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const character = reader.readUInt64LE();
  const friendName = readChatAvatarId(reader);
  const sequence = reader.readUInt32LE();
  const add = reader.readUInt8() !== 0;
  const resultCode = reader.readUInt32LE();
  return { character, friendName, sequence, add, resultCode };
}

export function createChatOnChangeFriendStatus(
  character: bigint,
  friendName: ChatAvatarId,
  sequence: number,
  add: boolean,
  resultCode: number
): Uint8Array {
  return serializeChatOnChangeFriendStatus({
    character,
    friendName,
    sequence,
    add,
    resultCode,
  });
}

// ChatFriendsListUpdate (0x6d7ebaa6)
export interface ChatFriendsListUpdate {
  characterName: ChatAvatarId;
  isOnline: boolean;
}

export function serializeChatFriendsListUpdate(
  msg: ChatFriendsListUpdate
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatFriendsListUpdate);
  writeChatAvatarId(writer, msg.characterName);
  writer.writeUInt8(msg.isOnline ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeChatFriendsListUpdate(
  data: Uint8Array
): ChatFriendsListUpdate {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  const isOnline = reader.readUInt8() !== 0;
  return { characterName, isOnline };
}

export function createChatFriendsListUpdate(
  characterName: ChatAvatarId,
  isOnline: boolean
): Uint8Array {
  return serializeChatFriendsListUpdate({ characterName, isOnline });
}

// ChatGetFriendsList (0x66168cca)
export interface ChatGetFriendsList {
  characterName: ChatAvatarId;
}

export function serializeChatGetFriendsList(msg: ChatGetFriendsList): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatGetFriendsList);
  writeChatAvatarId(writer, msg.characterName);
  return writer.toBuffer();
}

export function deserializeChatGetFriendsList(
  data: Uint8Array
): ChatGetFriendsList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  return { characterName };
}

export function createChatGetFriendsList(characterName: ChatAvatarId): Uint8Array {
  return serializeChatGetFriendsList({ characterName });
}

// ChatOnGetFriendsList (0x8b17477e)
export interface ChatOnGetFriendsList {
  character: bigint;
  friends: ChatAvatarId[];
}

export function serializeChatOnGetFriendsList(
  msg: ChatOnGetFriendsList
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatOnGetFriendsList);
  writer.writeUInt64LE(msg.character);
  writer.writeUInt32LE(msg.friends.length);
  for (const friend of msg.friends) {
    writeChatAvatarId(writer, friend);
  }
  return writer.toBuffer();
}

export function deserializeChatOnGetFriendsList(
  data: Uint8Array
): ChatOnGetFriendsList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const character = reader.readUInt64LE();
  const count = reader.readUInt32LE();
  const friends: ChatAvatarId[] = [];
  for (let i = 0; i < count; i++) {
    friends.push(readChatAvatarId(reader));
  }
  return { character, friends };
}

export function createChatOnGetFriendsList(
  character: bigint,
  friends: ChatAvatarId[]
): Uint8Array {
  return serializeChatOnGetFriendsList({ character, friends });
}

// ============================================================================
// Ignore Messages
// ============================================================================

// ChatGetIgnoreList (0xbb6ee0e5)
export interface ChatGetIgnoreList {
  characterName: ChatAvatarId;
}

export function serializeChatGetIgnoreList(msg: ChatGetIgnoreList): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatGetIgnoreList);
  writeChatAvatarId(writer, msg.characterName);
  return writer.toBuffer();
}

export function deserializeChatGetIgnoreList(
  data: Uint8Array
): ChatGetIgnoreList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  return { characterName };
}

export function createChatGetIgnoreList(characterName: ChatAvatarId): Uint8Array {
  return serializeChatGetIgnoreList({ characterName });
}

// ChatOnGetIgnoreList (0xf8d64c68)
export interface ChatOnGetIgnoreList {
  character: bigint;
  ignores: ChatAvatarId[];
}

export function serializeChatOnGetIgnoreList(
  msg: ChatOnGetIgnoreList
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatOnGetIgnoreList);
  writer.writeUInt64LE(msg.character);
  writer.writeUInt32LE(msg.ignores.length);
  for (const ignore of msg.ignores) {
    writeChatAvatarId(writer, ignore);
  }
  return writer.toBuffer();
}

export function deserializeChatOnGetIgnoreList(
  data: Uint8Array
): ChatOnGetIgnoreList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const character = reader.readUInt64LE();
  const count = reader.readUInt32LE();
  const ignores: ChatAvatarId[] = [];
  for (let i = 0; i < count; i++) {
    ignores.push(readChatAvatarId(reader));
  }
  return { character, ignores };
}

export function createChatOnGetIgnoreList(
  character: bigint,
  ignores: ChatAvatarId[]
): Uint8Array {
  return serializeChatOnGetIgnoreList({ character, ignores });
}

// ChatChangeIgnoreStatus (0xdaec8faf)
export interface ChatChangeIgnoreStatus {
  characterName: ChatAvatarId;
  friendName: ChatAvatarId;
  sequence: number;
  ignore: boolean;
}

export function serializeChatChangeIgnoreStatus(
  msg: ChatChangeIgnoreStatus
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatChangeIgnoreStatus);
  writeChatAvatarId(writer, msg.characterName);
  writeChatAvatarId(writer, msg.friendName);
  writer.writeUInt32LE(msg.sequence);
  writer.writeUInt8(msg.ignore ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeChatChangeIgnoreStatus(
  data: Uint8Array
): ChatChangeIgnoreStatus {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const characterName = readChatAvatarId(reader);
  const friendName = readChatAvatarId(reader);
  const sequence = reader.readUInt32LE();
  const ignore = reader.readUInt8() !== 0;
  return { characterName, friendName, sequence, ignore };
}

export function createChatChangeIgnoreStatus(
  characterName: ChatAvatarId,
  friendName: ChatAvatarId,
  sequence: number,
  ignore: boolean
): Uint8Array {
  return serializeChatChangeIgnoreStatus({
    characterName,
    friendName,
    sequence,
    ignore,
  });
}

// ChatOnChangeIgnoreStatus (0xb61375f6)
export interface ChatOnChangeIgnoreStatus {
  character: bigint;
  ignoreName: ChatAvatarId;
  sequence: number;
  ignore: boolean;
  resultCode: number;
}

export function serializeChatOnChangeIgnoreStatus(
  msg: ChatOnChangeIgnoreStatus
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatOnChangeIgnoreStatus);
  writer.writeUInt64LE(msg.character);
  writeChatAvatarId(writer, msg.ignoreName);
  writer.writeUInt32LE(msg.sequence);
  writer.writeUInt8(msg.ignore ? 1 : 0);
  writer.writeUInt32LE(msg.resultCode);
  return writer.toBuffer();
}

export function deserializeChatOnChangeIgnoreStatus(
  data: Uint8Array
): ChatOnChangeIgnoreStatus {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const character = reader.readUInt64LE();
  const ignoreName = readChatAvatarId(reader);
  const sequence = reader.readUInt32LE();
  const ignore = reader.readUInt8() !== 0;
  const resultCode = reader.readUInt32LE();
  return { character, ignoreName, sequence, ignore, resultCode };
}

export function createChatOnChangeIgnoreStatus(
  character: bigint,
  ignoreName: ChatAvatarId,
  sequence: number,
  ignore: boolean,
  resultCode: number
): Uint8Array {
  return serializeChatOnChangeIgnoreStatus({
    character,
    ignoreName,
    sequence,
    ignore,
    resultCode,
  });
}

// ============================================================================
// Chat Log Messages
// ============================================================================

// ChatRequestLog (0x4e9c2a72)
export interface ChatRequestLog {
  player: string;
  sequence: number;
}

export function serializeChatRequestLog(msg: ChatRequestLog): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatRequestLog);
  writer.writeUnicodeStringWithLength(msg.player);
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatRequestLog(data: Uint8Array): ChatRequestLog {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const player = reader.readUnicodeStringWithLength();
  const sequence = reader.readUInt32LE();
  return { player, sequence };
}

export function createChatRequestLog(player: string, sequence: number): Uint8Array {
  return serializeChatRequestLog({ player, sequence });
}

// ChatOnRequestLog (0xa9eba583)
export interface ChatOnRequestLog {
  logEntries: ChatLogEntry[];
  sequence: number;
}

export function serializeChatOnRequestLog(msg: ChatOnRequestLog): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(ChatSocialOpcodes.ChatOnRequestLog);
  writer.writeUInt32LE(msg.logEntries.length);
  for (const entry of msg.logEntries) {
    writeChatLogEntry(writer, entry);
  }
  writer.writeUInt32LE(msg.sequence);
  return writer.toBuffer();
}

export function deserializeChatOnRequestLog(data: Uint8Array): ChatOnRequestLog {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const count = reader.readUInt32LE();
  const logEntries: ChatLogEntry[] = [];
  for (let i = 0; i < count; i++) {
    logEntries.push(readChatLogEntry(reader));
  }
  const sequence = reader.readUInt32LE();
  return { logEntries, sequence };
}

export function createChatOnRequestLog(
  logEntries: ChatLogEntry[],
  sequence: number
): Uint8Array {
  return serializeChatOnRequestLog({ logEntries, sequence });
}
