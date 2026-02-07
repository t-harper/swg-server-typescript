/**
 * SWG Guild, Faction, Expertise, Stat Migration, Who List, and MFD Status Messages
 * Protocol messages for guild info, faction standings, expertise allocation,
 * stat migration, who list queries, and MFD (mission/group) status updates
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * Guild/Faction/Misc message opcodes
 * Each opcode is the CRC32 of the C++ message class name string passed to GameNetworkMessage()
 */
export const GuildFactionMessageOpcode = {
  /** Client requests guild info for a target */
  GuildRequestMessage: 0x636bda3b,
  /** Server responds with guild info for a target */
  GuildResponseMessage: 0x3d366b50,
  /** Client requests faction standings */
  FactionRequestMessage: 0xdea15140,
  /** Server responds with faction standings */
  FactionResponseMessage: 0xfa5c096f,
  /** Client requests expertise allocation */
  ExpertiseRequestMessage: 0x1e2816ec,
  /** Server sends who list data */
  WhoListMessage: 0x67d28307,
  /** Server sends stat migration targets */
  StatMigrationTargetsMessage: 0xf74e1f8e,
  /** Server sends MFD (group member) status update */
  ClientMfdStatusUpdateMessage: 0xd2e61e3b,
} as const;

export type GuildFactionMessageOpcodeType =
  (typeof GuildFactionMessageOpcode)[keyof typeof GuildFactionMessageOpcode];

// ============================================
// GuildRequestMessage (0x636BDA3B)
// ============================================

/**
 * GuildRequestMessage - Client requests guild info for a target
 * C++ fields: targetId(NetworkId)
 */
export interface GuildRequestMessage {
  opcode: typeof GuildFactionMessageOpcode.GuildRequestMessage;
  targetId: bigint;
}

/**
 * Serialize GuildRequestMessage
 */
export function serializeGuildRequestMessage(message: GuildRequestMessage): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.targetId);
  return writer.toBuffer();
}

/**
 * Deserialize GuildRequestMessage
 */
export function deserializeGuildRequestMessage(data: Uint8Array): GuildRequestMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.GuildRequestMessage) {
    throw new Error(`Invalid opcode for GuildRequestMessage: 0x${opcode.toString(16)}`);
  }
  const targetId = reader.readUInt64LE();

  return {
    opcode: GuildFactionMessageOpcode.GuildRequestMessage,
    targetId,
  };
}

/**
 * Create a GuildRequestMessage
 */
export function createGuildRequestMessage(targetId: bigint): GuildRequestMessage {
  return {
    opcode: GuildFactionMessageOpcode.GuildRequestMessage,
    targetId,
  };
}

// ============================================
// GuildResponseMessage (0x3D366B50)
// ============================================

/**
 * GuildResponseMessage - Server responds with guild info for a target
 * C++ fields: targetId(NetworkId) + guildName(string) + memberTitle(string)
 */
export interface GuildResponseMessage {
  opcode: typeof GuildFactionMessageOpcode.GuildResponseMessage;
  targetId: bigint;
  guildName: string;
  memberTitle: string;
}

/**
 * Serialize GuildResponseMessage
 */
export function serializeGuildResponseMessage(message: GuildResponseMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.targetId);
  writer.writeStringWithLength16LE(message.guildName);
  writer.writeStringWithLength16LE(message.memberTitle);
  return writer.toBuffer();
}

/**
 * Deserialize GuildResponseMessage
 */
export function deserializeGuildResponseMessage(data: Uint8Array): GuildResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.GuildResponseMessage) {
    throw new Error(`Invalid opcode for GuildResponseMessage: 0x${opcode.toString(16)}`);
  }
  const targetId = reader.readUInt64LE();
  const guildName = reader.readStringWithLength16LE();
  const memberTitle = reader.readStringWithLength16LE();

  return {
    opcode: GuildFactionMessageOpcode.GuildResponseMessage,
    targetId,
    guildName,
    memberTitle,
  };
}

/**
 * Create a GuildResponseMessage
 */
export function createGuildResponseMessage(
  targetId: bigint,
  guildName: string,
  memberTitle: string
): GuildResponseMessage {
  return {
    opcode: GuildFactionMessageOpcode.GuildResponseMessage,
    targetId,
    guildName,
    memberTitle,
  };
}

// ============================================
// FactionRequestMessage (0xDEA15140)
// ============================================

/**
 * FactionRequestMessage - Client requests faction standings
 * C++ fields: none (empty message body)
 */
export interface FactionRequestMessage {
  opcode: typeof GuildFactionMessageOpcode.FactionRequestMessage;
}

/**
 * Serialize FactionRequestMessage
 */
export function serializeFactionRequestMessage(): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(GuildFactionMessageOpcode.FactionRequestMessage);
  return writer.toBuffer();
}

/**
 * Deserialize FactionRequestMessage
 */
export function deserializeFactionRequestMessage(data: Uint8Array): FactionRequestMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.FactionRequestMessage) {
    throw new Error(`Invalid opcode for FactionRequestMessage: 0x${opcode.toString(16)}`);
  }

  return {
    opcode: GuildFactionMessageOpcode.FactionRequestMessage,
  };
}

/**
 * Create a FactionRequestMessage
 */
export function createFactionRequestMessage(): FactionRequestMessage {
  return {
    opcode: GuildFactionMessageOpcode.FactionRequestMessage,
  };
}

// ============================================
// FactionResponseMessage (0xFA5C096F)
// ============================================

/**
 * FactionResponseMessage - Server responds with faction standings
 * C++ fields: factionRebelValue(int) + factionImperialValue(int) + factionCriminalValue(int)
 *   + npcFactionNameList(AutoArray<string>) + npcFactionValueList(AutoArray<float>)
 */
export interface FactionResponseMessage {
  opcode: typeof GuildFactionMessageOpcode.FactionResponseMessage;
  rebelValue: number;
  imperialValue: number;
  criminalValue: number;
  npcFactionNames: string[];
  npcFactionValues: number[];
}

/**
 * Serialize FactionResponseMessage
 */
export function serializeFactionResponseMessage(message: FactionResponseMessage): Uint8Array {
  const writer = new BufferWriter(1024);
  writer.writeUInt16LE(6); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.rebelValue);
  writer.writeInt32LE(message.imperialValue);
  writer.writeInt32LE(message.criminalValue);
  // AutoArray<string>: u32LE count + count * string(u16LE len + bytes)
  writer.writeUInt32LE(message.npcFactionNames.length);
  for (const name of message.npcFactionNames) {
    writer.writeStringWithLength16LE(name);
  }
  // AutoArray<float>: u32LE count + count * float
  writer.writeUInt32LE(message.npcFactionValues.length);
  for (const value of message.npcFactionValues) {
    writer.writeFloatLE(value);
  }
  return writer.toBuffer();
}

/**
 * Deserialize FactionResponseMessage
 */
export function deserializeFactionResponseMessage(data: Uint8Array): FactionResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.FactionResponseMessage) {
    throw new Error(`Invalid opcode for FactionResponseMessage: 0x${opcode.toString(16)}`);
  }
  const rebelValue = reader.readInt32LE();
  const imperialValue = reader.readInt32LE();
  const criminalValue = reader.readInt32LE();
  // AutoArray<string>
  const nameCount = reader.readUInt32LE();
  const npcFactionNames: string[] = [];
  for (let i = 0; i < nameCount; i++) {
    npcFactionNames.push(reader.readStringWithLength16LE());
  }
  // AutoArray<float>
  const valueCount = reader.readUInt32LE();
  const npcFactionValues: number[] = [];
  for (let i = 0; i < valueCount; i++) {
    npcFactionValues.push(reader.readFloatLE());
  }

  return {
    opcode: GuildFactionMessageOpcode.FactionResponseMessage,
    rebelValue,
    imperialValue,
    criminalValue,
    npcFactionNames,
    npcFactionValues,
  };
}

/**
 * Create a FactionResponseMessage
 */
export function createFactionResponseMessage(
  rebelValue: number,
  imperialValue: number,
  criminalValue: number,
  npcFactionNames: string[] = [],
  npcFactionValues: number[] = []
): FactionResponseMessage {
  return {
    opcode: GuildFactionMessageOpcode.FactionResponseMessage,
    rebelValue,
    imperialValue,
    criminalValue,
    npcFactionNames,
    npcFactionValues,
  };
}

// ============================================
// ExpertiseRequestMessage (0x1E2816EC)
// ============================================

/**
 * ExpertiseRequestMessage - Client requests expertise allocation
 * C++ fields: addExpertisesList(AutoArray<string>) + clearAllExpertisesFirst(bool)
 */
export interface ExpertiseRequestMessage {
  opcode: typeof GuildFactionMessageOpcode.ExpertiseRequestMessage;
  addExpertisesList: string[];
  clearAllExpertisesFirst: boolean;
}

/**
 * Serialize ExpertiseRequestMessage
 */
export function serializeExpertiseRequestMessage(message: ExpertiseRequestMessage): Uint8Array {
  const writer = new BufferWriter(1024);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  // AutoArray<string>: u32LE count + count * string(u16LE len + bytes)
  writer.writeUInt32LE(message.addExpertisesList.length);
  for (const expertise of message.addExpertisesList) {
    writer.writeStringWithLength16LE(expertise);
  }
  writer.writeUInt8(message.clearAllExpertisesFirst ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize ExpertiseRequestMessage
 */
export function deserializeExpertiseRequestMessage(data: Uint8Array): ExpertiseRequestMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.ExpertiseRequestMessage) {
    throw new Error(`Invalid opcode for ExpertiseRequestMessage: 0x${opcode.toString(16)}`);
  }
  // AutoArray<string>
  const listCount = reader.readUInt32LE();
  const addExpertisesList: string[] = [];
  for (let i = 0; i < listCount; i++) {
    addExpertisesList.push(reader.readStringWithLength16LE());
  }
  const clearAllExpertisesFirst = reader.readUInt8() !== 0;

  return {
    opcode: GuildFactionMessageOpcode.ExpertiseRequestMessage,
    addExpertisesList,
    clearAllExpertisesFirst,
  };
}

/**
 * Create an ExpertiseRequestMessage
 */
export function createExpertiseRequestMessage(
  addExpertisesList: string[],
  clearAllExpertisesFirst: boolean = false
): ExpertiseRequestMessage {
  return {
    opcode: GuildFactionMessageOpcode.ExpertiseRequestMessage,
    addExpertisesList,
    clearAllExpertisesFirst,
  };
}

// ============================================
// WhoListMessage (0x67D28307)
// ============================================

/**
 * WhoListMessage - Server sends who list data
 * C++ message type string: "WhoListMessage::MESSAGE_TYPE"
 * C++ fields: data(AutoArray<Unicode::String>)
 */
export interface WhoListMessage {
  opcode: typeof GuildFactionMessageOpcode.WhoListMessage;
  data: string[];
}

/**
 * Serialize WhoListMessage
 */
export function serializeWhoListMessage(message: WhoListMessage): Uint8Array {
  const writer = new BufferWriter(4096);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  // AutoArray<Unicode::String>: u32LE count + count * unicode(u32LE charCount + utf16le bytes)
  writer.writeUInt32LE(message.data.length);
  for (const entry of message.data) {
    writer.writeUnicodeStringWithLength(entry);
  }
  return writer.toBuffer();
}

/**
 * Deserialize WhoListMessage
 */
export function deserializeWhoListMessage(data: Uint8Array): WhoListMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.WhoListMessage) {
    throw new Error(`Invalid opcode for WhoListMessage: 0x${opcode.toString(16)}`);
  }
  // AutoArray<Unicode::String>
  const count = reader.readUInt32LE();
  const entries: string[] = [];
  for (let i = 0; i < count; i++) {
    entries.push(reader.readUnicodeStringWithLength());
  }

  return {
    opcode: GuildFactionMessageOpcode.WhoListMessage,
    data: entries,
  };
}

/**
 * Create a WhoListMessage
 */
export function createWhoListMessage(data: string[] = []): WhoListMessage {
  return {
    opcode: GuildFactionMessageOpcode.WhoListMessage,
    data,
  };
}

// ============================================
// StatMigrationTargetsMessage (0xF74E1F8E)
// ============================================

/**
 * StatMigrationTargetsMessage - Server sends stat migration targets
 * C++ fields: health(int) + constitution(int) + action(int) + stamina(int)
 *   + mind(int) + willpower(int) + pointsLeft(int)
 */
export interface StatMigrationTargetsMessage {
  opcode: typeof GuildFactionMessageOpcode.StatMigrationTargetsMessage;
  health: number;
  constitution: number;
  action: number;
  stamina: number;
  mind: number;
  willpower: number;
  pointsLeft: number;
}

/**
 * Serialize StatMigrationTargetsMessage
 */
export function serializeStatMigrationTargetsMessage(
  message: StatMigrationTargetsMessage
): Uint8Array {
  const writer = new BufferWriter(34);
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.health);
  writer.writeInt32LE(message.constitution);
  writer.writeInt32LE(message.action);
  writer.writeInt32LE(message.stamina);
  writer.writeInt32LE(message.mind);
  writer.writeInt32LE(message.willpower);
  writer.writeInt32LE(message.pointsLeft);
  return writer.toBuffer();
}

/**
 * Deserialize StatMigrationTargetsMessage
 */
export function deserializeStatMigrationTargetsMessage(
  data: Uint8Array
): StatMigrationTargetsMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.StatMigrationTargetsMessage) {
    throw new Error(
      `Invalid opcode for StatMigrationTargetsMessage: 0x${opcode.toString(16)}`
    );
  }
  const health = reader.readInt32LE();
  const constitution = reader.readInt32LE();
  const action = reader.readInt32LE();
  const stamina = reader.readInt32LE();
  const mind = reader.readInt32LE();
  const willpower = reader.readInt32LE();
  const pointsLeft = reader.readInt32LE();

  return {
    opcode: GuildFactionMessageOpcode.StatMigrationTargetsMessage,
    health,
    constitution,
    action,
    stamina,
    mind,
    willpower,
    pointsLeft,
  };
}

/**
 * Create a StatMigrationTargetsMessage
 */
export function createStatMigrationTargetsMessage(
  health: number,
  constitution: number,
  action: number,
  stamina: number,
  mind: number,
  willpower: number,
  pointsLeft: number
): StatMigrationTargetsMessage {
  return {
    opcode: GuildFactionMessageOpcode.StatMigrationTargetsMessage,
    health,
    constitution,
    action,
    stamina,
    mind,
    willpower,
    pointsLeft,
  };
}

// ============================================
// ClientMfdStatusUpdateMessage (0xD2E61E3B)
// ============================================

/**
 * ClientMfdStatusUpdateMessage - Server sends MFD (group member) status update
 * C++ fields: sceneName(string) + sourceId(NetworkId) + worldCoordinates(Vector: x,y,z)
 */
export interface ClientMfdStatusUpdateMessage {
  opcode: typeof GuildFactionMessageOpcode.ClientMfdStatusUpdateMessage;
  sceneName: string;
  sourceId: bigint;
  worldX: number;
  worldY: number;
  worldZ: number;
}

/**
 * Serialize ClientMfdStatusUpdateMessage
 */
export function serializeClientMfdStatusUpdateMessage(
  message: ClientMfdStatusUpdateMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.sceneName);
  writer.writeUInt64LE(message.sourceId);
  // Vector: 3 floats (x, y, z)
  writer.writeFloatLE(message.worldX);
  writer.writeFloatLE(message.worldY);
  writer.writeFloatLE(message.worldZ);
  return writer.toBuffer();
}

/**
 * Deserialize ClientMfdStatusUpdateMessage
 */
export function deserializeClientMfdStatusUpdateMessage(
  data: Uint8Array
): ClientMfdStatusUpdateMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== GuildFactionMessageOpcode.ClientMfdStatusUpdateMessage) {
    throw new Error(
      `Invalid opcode for ClientMfdStatusUpdateMessage: 0x${opcode.toString(16)}`
    );
  }
  const sceneName = reader.readStringWithLength16LE();
  const sourceId = reader.readUInt64LE();
  // Vector: 3 floats (x, y, z)
  const worldX = reader.readFloatLE();
  const worldY = reader.readFloatLE();
  const worldZ = reader.readFloatLE();

  return {
    opcode: GuildFactionMessageOpcode.ClientMfdStatusUpdateMessage,
    sceneName,
    sourceId,
    worldX,
    worldY,
    worldZ,
  };
}

/**
 * Create a ClientMfdStatusUpdateMessage
 */
export function createClientMfdStatusUpdateMessage(
  sceneName: string,
  sourceId: bigint,
  worldX: number,
  worldY: number,
  worldZ: number
): ClientMfdStatusUpdateMessage {
  return {
    opcode: GuildFactionMessageOpcode.ClientMfdStatusUpdateMessage,
    sceneName,
    sourceId,
    worldX,
    worldY,
    worldZ,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all guild/faction/misc messages
 */
export type GuildFactionMessage =
  | GuildRequestMessage
  | GuildResponseMessage
  | FactionRequestMessage
  | FactionResponseMessage
  | ExpertiseRequestMessage
  | WhoListMessage
  | StatMigrationTargetsMessage
  | ClientMfdStatusUpdateMessage;

/**
 * Get the opcode from raw guild/faction message data
 */
export function getGuildFactionMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid guild/faction message opcode
 */
export function isGuildFactionMessageOpcode(
  opcode: number
): opcode is GuildFactionMessageOpcodeType {
  return Object.values(GuildFactionMessageOpcode).includes(
    opcode as GuildFactionMessageOpcodeType
  );
}
