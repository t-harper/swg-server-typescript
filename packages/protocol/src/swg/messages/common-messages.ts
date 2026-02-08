import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

export const CommonMessageOpcodes = {
  FrameEndMessage: 0x2d8aa5e5,
  SetTransformMessage: 0x0e1b97c8,
  BatchBaselinesMessage: 0x2f4483f2,
  LoginClusterStatusEx: 0xfa5b4b5a,
  PlayerMoneyRequest: 0x9d105aa1,
  PlayerMoneyResponse: 0x367c4205,
} as const;

// ============================================================================
// FrameEndMessage
// ============================================================================

export interface FrameEndMessage {
  opcode: number;
  processId: number;
  frameTime: number;
  profilerData: string;
}

export function serializeFrameEndMessage(message: FrameEndMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.processId);
  writer.writeUInt32LE(message.frameTime);
  writer.writeStringWithLength16LE(message.profilerData);
  return writer.toBuffer();
}

export function deserializeFrameEndMessage(data: Uint8Array): FrameEndMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  const processId = reader.readUInt32LE();
  const frameTime = reader.readUInt32LE();
  const profilerData = reader.readStringWithLength16LE();
  return { opcode, processId, frameTime, profilerData };
}

export function createFrameEndMessage(
  processId: number,
  frameTime: number,
  profilerData: string
): FrameEndMessage {
  return {
    opcode: CommonMessageOpcodes.FrameEndMessage,
    processId,
    frameTime,
    profilerData,
  };
}

// ============================================================================
// SetTransformMessage
// ============================================================================

export interface SetTransformMessage {
  opcode: number;
  id: bigint;
  transformData: Uint8Array; // 48 bytes raw transform matrix
  cellId: bigint;
}

export function serializeSetTransformMessage(message: SetTransformMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.id);
  if (message.transformData.length !== 48) {
    throw new Error('transformData must be exactly 48 bytes');
  }
  writer.writeBytes(message.transformData);
  writer.writeUInt64LE(message.cellId);
  return writer.toBuffer();
}

export function deserializeSetTransformMessage(data: Uint8Array): SetTransformMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  const id = reader.readUInt64LE();
  const transformData = reader.readBytes(48);
  const cellId = reader.readUInt64LE();
  return { opcode, id, transformData, cellId };
}

export function createSetTransformMessage(
  id: bigint,
  transformData: Uint8Array,
  cellId: bigint
): SetTransformMessage {
  return {
    opcode: CommonMessageOpcodes.SetTransformMessage,
    id,
    transformData,
    cellId,
  };
}

// ============================================================================
// BatchBaselinesMessage
// ============================================================================

export interface BatchBaselinesMessageData {
  networkId: bigint;
  objectType: number; // 4-char tag packed as u32 (e.g., "CREO")
  packageId: number; // i8/signed byte
  package: Uint8Array; // ByteStream serialized as u32LE length + raw bytes
}

export interface BatchBaselinesMessage {
  opcode: number;
  data: BatchBaselinesMessageData[];
}

export function serializeBatchBaselinesMessage(message: BatchBaselinesMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);

  // AutoArray<BatchBaselinesMessageData>
  writer.writeUInt32LE(message.data.length);
  for (const item of message.data) {
    writer.writeUInt64LE(item.networkId);
    writer.writeUInt32LE(item.objectType);
    writer.writeInt8(item.packageId);
    // ByteStream: u32LE length + raw bytes
    writer.writeUInt32LE(item.package.length);
    writer.writeBytes(item.package);
  }

  return writer.toBuffer();
}

export function deserializeBatchBaselinesMessage(data: Uint8Array): BatchBaselinesMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();

  // AutoArray<BatchBaselinesMessageData>
  const count = reader.readUInt32LE();
  const items: BatchBaselinesMessageData[] = [];

  for (let i = 0; i < count; i++) {
    const networkId = reader.readUInt64LE();
    const objectType = reader.readUInt32LE();
    const packageId = reader.readInt8();
    // ByteStream: u32LE length + raw bytes
    const packageLength = reader.readUInt32LE();
    const packageData = reader.readBytes(packageLength);

    items.push({
      networkId,
      objectType,
      packageId,
      package: packageData,
    });
  }

  return { opcode, data: items };
}

export function createBatchBaselinesMessage(
  data: BatchBaselinesMessageData[]
): BatchBaselinesMessage {
  return {
    opcode: CommonMessageOpcodes.BatchBaselinesMessage,
    data,
  };
}

// Helper function to convert 4-char tag string to u32 (e.g., "CREO" -> 0x4352454F)
export function tagToU32(tag: string): number {
  if (tag.length !== 4) {
    throw new Error('Tag must be exactly 4 characters');
  }
  return (tag.charCodeAt(0) << 24) | (tag.charCodeAt(1) << 16) | (tag.charCodeAt(2) << 8) | tag.charCodeAt(3);
}

// Helper function to convert u32 to 4-char tag string
export function u32ToTag(value: number): string {
  return String.fromCharCode(
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  );
}

// ============================================================================
// LoginClusterStatusEx
// ============================================================================

export interface ClusterData {
  clusterId: number;
  branch: string;
  networkVersion: string;
  version: number;
  reserved1: number;
  reserved2: number;
  reserved3: number;
  reserved4: number;
}

export interface LoginClusterStatusEx {
  opcode: number;
  data: ClusterData[];
}

export function serializeLoginClusterStatusEx(message: LoginClusterStatusEx): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount: cmd + data
  writer.writeUInt32LE(message.opcode);

  // AutoArray<ClusterData>
  writer.writeUInt32LE(message.data.length);
  for (const cluster of message.data) {
    writer.writeUInt32LE(cluster.clusterId);
    writer.writeStringWithLength16LE(cluster.branch);
    writer.writeStringWithLength16LE(cluster.networkVersion);
    writer.writeUInt32LE(cluster.version);
    writer.writeUInt32LE(cluster.reserved1);
    writer.writeUInt32LE(cluster.reserved2);
    writer.writeUInt32LE(cluster.reserved3);
    writer.writeUInt32LE(cluster.reserved4);
  }

  return writer.toBuffer();
}

export function deserializeLoginClusterStatusEx(data: Uint8Array): LoginClusterStatusEx {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();

  // AutoArray<ClusterData>
  const count = reader.readUInt32LE();
  const clusters: ClusterData[] = [];

  for (let i = 0; i < count; i++) {
    const clusterId = reader.readUInt32LE();
    const branch = reader.readStringWithLength16LE();
    const networkVersion = reader.readStringWithLength16LE();
    const version = reader.readUInt32LE();
    const reserved1 = reader.readUInt32LE();
    const reserved2 = reader.readUInt32LE();
    const reserved3 = reader.readUInt32LE();
    const reserved4 = reader.readUInt32LE();

    clusters.push({
      clusterId,
      branch,
      networkVersion,
      version,
      reserved1,
      reserved2,
      reserved3,
      reserved4,
    });
  }

  return { opcode, data: clusters };
}

export function createLoginClusterStatusEx(data: ClusterData[]): LoginClusterStatusEx {
  return {
    opcode: CommonMessageOpcodes.LoginClusterStatusEx,
    data,
  };
}

// ============================================================================
// PlayerMoneyRequest
// ============================================================================

export interface PlayerMoneyRequest {
  opcode: number;
}

export function serializePlayerMoneyRequest(message: PlayerMoneyRequest): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount (empty message)
  writer.writeUInt32LE(message.opcode);
  return writer.toBuffer();
}

export function deserializePlayerMoneyRequest(data: Uint8Array): PlayerMoneyRequest {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  return { opcode };
}

export function createPlayerMoneyRequest(): PlayerMoneyRequest {
  return {
    opcode: CommonMessageOpcodes.PlayerMoneyRequest,
  };
}

// ============================================================================
// PlayerMoneyResponse
// ============================================================================

export interface PlayerMoneyResponse {
  opcode: number;
  balanceCash: number;
  balanceBank: number;
}

export function serializePlayerMoneyResponse(message: PlayerMoneyResponse): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.balanceCash);
  writer.writeInt32LE(message.balanceBank);
  return writer.toBuffer();
}

export function deserializePlayerMoneyResponse(data: Uint8Array): PlayerMoneyResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  const balanceCash = reader.readInt32LE();
  const balanceBank = reader.readInt32LE();
  return { opcode, balanceCash, balanceBank };
}

export function createPlayerMoneyResponse(
  balanceCash: number,
  balanceBank: number
): PlayerMoneyResponse {
  return {
    opcode: CommonMessageOpcodes.PlayerMoneyResponse,
    balanceCash,
    balanceBank,
  };
}
