/**
 * SOE Packet Structures and Serialization
 * Defines packet types for each SOE opcode and provides serialize/deserialize functions
 */

import {
  SoeOpcode,
  SoeOpcodeType,
  DisconnectReasonType,
  getOpcodeName,
} from './constants.js';
import { BufferReader, BufferWriter } from './buffer-utils.js';

/**
 * Base interface for all SOE packets
 */
export interface SoePacketBase {
  opcode: SoeOpcodeType;
}

/**
 * Session Request packet (0x01)
 * Sent by client to initiate a new session
 */
export interface SessionRequestPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.SessionRequest;
  crcLength: number;
  connectionId: number;
  clientUdpBufferSize: number;
  protocolVersion: string;
}

/**
 * Session Response packet (0x02)
 * Server response to session request
 * C++ format: [opcode:2][connectionId:4][crcSeed:4][crcBytes:1][encryptMethod[0]:1][encryptMethod[1]:1][maxRawPacketSize:4][protocolVersion:4]
 */
export interface SessionResponsePacket extends SoePacketBase {
  opcode: typeof SoeOpcode.SessionResponse;
  connectionId: number;
  crcSeed: number;
  crcBytes: number;
  encryptMethod0: number;
  encryptMethod1: number;
  serverUdpBufferSize: number;
  protocolVersion: number;
}

/**
 * Multi-Packet container (0x03)
 * Contains multiple sub-packets
 */
export interface MultiPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.MultiPacket;
  subPackets: Uint8Array[];
}

/**
 * Disconnect packet (0x05)
 */
export interface DisconnectPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.Disconnect;
  connectionId: number;
  reason: DisconnectReasonType;
}

/**
 * Ping packet (0x06)
 * Keep-alive message
 */
export interface PingPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.Ping;
}

/**
 * Network Status Request packet (0x07)
 */
export interface NetStatusRequestPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.NetStatusRequest;
  clientTickCount: number;
  lastLocalPacketReceive: number;
  averagePing: number;
  lowestPing: number;
  highestPing: number;
  lastRemotePacketSent: number;
  packetsSent: bigint;
  packetsReceived: bigint;
}

/**
 * Network Status Response packet (0x08)
 */
export interface NetStatusResponsePacket extends SoePacketBase {
  opcode: typeof SoeOpcode.NetStatusResponse;
  clientTickCount: number;
  serverTickCount: number;
  clientPacketsSent: bigint;
  clientPacketsReceived: bigint;
  serverPacketsSent: bigint;
  serverPacketsReceived: bigint;
}

/**
 * Reliable Data packet (0x09)
 */
export interface DataPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.Data;
  sequence: number;
  data: Uint8Array;
}

/**
 * Data Fragment packet (0x0D)
 * Part of a fragmented data packet
 */
export interface DataFragmentPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.DataFragment;
  sequence: number;
  data: Uint8Array;
}

/**
 * Out of Order notification (0x11)
 */
export interface OutOfOrderPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.OutOfOrder;
  sequence: number;
}

/**
 * Acknowledgement packet (0x15)
 */
export interface AckPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.Ack;
  sequence: number;
}

/**
 * Fatal Error packet (0x1D)
 */
export interface FatalErrorPacket extends SoePacketBase {
  opcode: typeof SoeOpcode.FatalError;
}

/**
 * Fatal Error Response packet (0x1E)
 */
export interface FatalErrorResponsePacket extends SoePacketBase {
  opcode: typeof SoeOpcode.FatalErrorResponse;
}

/**
 * Unknown/raw packet type for unrecognized opcodes
 */
export interface UnknownPacket extends SoePacketBase {
  opcode: SoeOpcodeType;
  rawData: Uint8Array;
}

/**
 * Union type of all SOE packet types
 */
export type SoePacket =
  | SessionRequestPacket
  | SessionResponsePacket
  | MultiPacket
  | DisconnectPacket
  | PingPacket
  | NetStatusRequestPacket
  | NetStatusResponsePacket
  | DataPacket
  | DataFragmentPacket
  | OutOfOrderPacket
  | AckPacket
  | FatalErrorPacket
  | FatalErrorResponsePacket
  | UnknownPacket;

/**
 * Serialize a Session Request packet
 */
function serializeSessionRequest(packet: SessionRequestPacket): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt16BE(SoeOpcode.SessionRequest);
  writer.writeUInt32BE(packet.crcLength);
  writer.writeUInt32BE(packet.connectionId);
  writer.writeUInt32BE(packet.clientUdpBufferSize);
  writer.writeStringNT(packet.protocolVersion);
  return writer.toBuffer();
}

/**
 * Deserialize a Session Request packet
 */
function deserializeSessionRequest(reader: BufferReader): SessionRequestPacket {
  const crcLength = reader.readUInt32BE();
  const connectionId = reader.readUInt32BE();
  const clientUdpBufferSize = reader.readUInt32BE();
  const protocolVersion = reader.readStringNT();

  return {
    opcode: SoeOpcode.SessionRequest,
    crcLength,
    connectionId,
    clientUdpBufferSize,
    protocolVersion,
  };
}

/**
 * Serialize a Session Response packet
 */
function serializeSessionResponse(packet: SessionResponsePacket): Uint8Array {
  // Match C++ UdpPacket_ConnectConfirm: 17 bytes total (no protocolVersion)
  const writer = new BufferWriter(17);
  writer.writeUInt16BE(SoeOpcode.SessionResponse);
  writer.writeUInt32BE(packet.connectionId);
  writer.writeUInt32BE(packet.crcSeed);
  writer.writeUInt8(packet.crcBytes);
  writer.writeUInt8(packet.encryptMethod0);
  writer.writeUInt8(packet.encryptMethod1);
  writer.writeUInt32BE(packet.serverUdpBufferSize);
  return writer.toBuffer();
}

/**
 * Deserialize a Session Response packet
 */
function deserializeSessionResponse(reader: BufferReader): SessionResponsePacket {
  const connectionId = reader.readUInt32BE();
  const crcSeed = reader.readUInt32BE();
  const crcBytes = reader.readUInt8();
  const encryptMethod0 = reader.readUInt8();
  const encryptMethod1 = reader.readUInt8();
  const serverUdpBufferSize = reader.readUInt32BE();
  const protocolVersion = reader.readUInt32BE();

  return {
    opcode: SoeOpcode.SessionResponse,
    connectionId,
    crcSeed,
    crcBytes,
    encryptMethod0,
    encryptMethod1,
    serverUdpBufferSize,
    protocolVersion,
  };
}

/**
 * Serialize a Multi-Packet
 */
function serializeMultiPacket(packet: MultiPacket): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16BE(SoeOpcode.MultiPacket);

  for (const subPacket of packet.subPackets) {
    // Write variable-length size prefix
    writer.writeVariableLength(subPacket.length);
    writer.writeBytes(subPacket);
  }

  return writer.toBuffer();
}

/**
 * Deserialize a Multi-Packet
 */
function deserializeMultiPacket(reader: BufferReader): MultiPacket {
  const subPackets: Uint8Array[] = [];

  while (reader.remaining() > 0) {
    const length = reader.readVariableLength();
    if (length > 0 && reader.hasRemaining(length)) {
      const subPacket = reader.readBytes(length);
      subPackets.push(subPacket);
    } else {
      break;
    }
  }

  return {
    opcode: SoeOpcode.MultiPacket,
    subPackets,
  };
}

/**
 * Serialize a Disconnect packet
 */
function serializeDisconnect(packet: DisconnectPacket): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt16BE(SoeOpcode.Disconnect);
  writer.writeUInt32BE(packet.connectionId);
  writer.writeUInt16BE(packet.reason);
  return writer.toBuffer();
}

/**
 * Deserialize a Disconnect packet
 */
function deserializeDisconnect(reader: BufferReader): DisconnectPacket {
  const connectionId = reader.readUInt32BE();
  const reason = reader.readUInt16BE() as DisconnectReasonType;

  return {
    opcode: SoeOpcode.Disconnect,
    connectionId,
    reason,
  };
}

/**
 * Serialize a Ping packet
 */
function serializePing(): Uint8Array {
  const writer = new BufferWriter(2);
  writer.writeUInt16BE(SoeOpcode.Ping);
  return writer.toBuffer();
}

/**
 * Serialize a Net Status Request packet
 */
function serializeNetStatusRequest(packet: NetStatusRequestPacket): Uint8Array {
  const writer = new BufferWriter(48);
  writer.writeUInt16BE(SoeOpcode.NetStatusRequest);
  writer.writeUInt16BE(packet.clientTickCount);
  writer.writeUInt32BE(packet.lastLocalPacketReceive);
  writer.writeUInt32BE(packet.averagePing);
  writer.writeUInt32BE(packet.lowestPing);
  writer.writeUInt32BE(packet.highestPing);
  writer.writeUInt32BE(packet.lastRemotePacketSent);
  writer.writeUInt64BE(packet.packetsSent);
  writer.writeUInt64BE(packet.packetsReceived);
  return writer.toBuffer();
}

/**
 * Deserialize a Net Status Request packet
 */
function deserializeNetStatusRequest(reader: BufferReader): NetStatusRequestPacket {
  const clientTickCount = reader.readUInt16BE();
  const lastLocalPacketReceive = reader.readUInt32BE();
  const averagePing = reader.readUInt32BE();
  const lowestPing = reader.readUInt32BE();
  const highestPing = reader.readUInt32BE();
  const lastRemotePacketSent = reader.readUInt32BE();
  const packetsSent = reader.readUInt64BE();
  const packetsReceived = reader.readUInt64BE();

  return {
    opcode: SoeOpcode.NetStatusRequest,
    clientTickCount,
    lastLocalPacketReceive,
    averagePing,
    lowestPing,
    highestPing,
    lastRemotePacketSent,
    packetsSent,
    packetsReceived,
  };
}

/**
 * Serialize a Net Status Response packet
 */
function serializeNetStatusResponse(packet: NetStatusResponsePacket): Uint8Array {
  const writer = new BufferWriter(48);
  writer.writeUInt16BE(SoeOpcode.NetStatusResponse);
  writer.writeUInt16BE(packet.clientTickCount);
  writer.writeUInt32BE(packet.serverTickCount);
  writer.writeUInt64BE(packet.clientPacketsSent);
  writer.writeUInt64BE(packet.clientPacketsReceived);
  writer.writeUInt64BE(packet.serverPacketsSent);
  writer.writeUInt64BE(packet.serverPacketsReceived);
  return writer.toBuffer();
}

/**
 * Deserialize a Net Status Response packet
 */
function deserializeNetStatusResponse(reader: BufferReader): NetStatusResponsePacket {
  const clientTickCount = reader.readUInt16BE();
  const serverTickCount = reader.readUInt32BE();
  const clientPacketsSent = reader.readUInt64BE();
  const clientPacketsReceived = reader.readUInt64BE();
  const serverPacketsSent = reader.readUInt64BE();
  const serverPacketsReceived = reader.readUInt64BE();

  return {
    opcode: SoeOpcode.NetStatusResponse,
    clientTickCount,
    serverTickCount,
    clientPacketsSent,
    clientPacketsReceived,
    serverPacketsSent,
    serverPacketsReceived,
  };
}

/**
 * Serialize a Data packet
 */
function serializeData(packet: DataPacket): Uint8Array {
  const writer = new BufferWriter(packet.data.length + 4);
  writer.writeUInt16BE(SoeOpcode.Data);
  writer.writeUInt16BE(packet.sequence);
  writer.writeBytes(packet.data);
  return writer.toBuffer();
}

/**
 * Deserialize a Data packet
 */
function deserializeData(reader: BufferReader): DataPacket {
  const sequence = reader.readUInt16BE();
  const data = reader.readRemaining();

  return {
    opcode: SoeOpcode.Data,
    sequence,
    data,
  };
}

/**
 * Serialize a Data Fragment packet
 */
function serializeDataFragment(packet: DataFragmentPacket): Uint8Array {
  const writer = new BufferWriter(packet.data.length + 4);
  writer.writeUInt16BE(SoeOpcode.DataFragment);
  writer.writeUInt16BE(packet.sequence);
  writer.writeBytes(packet.data);
  return writer.toBuffer();
}

/**
 * Deserialize a Data Fragment packet
 */
function deserializeDataFragment(reader: BufferReader): DataFragmentPacket {
  const sequence = reader.readUInt16BE();
  const data = reader.readRemaining();

  return {
    opcode: SoeOpcode.DataFragment,
    sequence,
    data,
  };
}

/**
 * Serialize an Out of Order packet
 */
function serializeOutOfOrder(packet: OutOfOrderPacket): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeUInt16BE(SoeOpcode.OutOfOrder);
  writer.writeUInt16BE(packet.sequence);
  return writer.toBuffer();
}

/**
 * Deserialize an Out of Order packet
 */
function deserializeOutOfOrder(reader: BufferReader): OutOfOrderPacket {
  const sequence = reader.readUInt16BE();

  return {
    opcode: SoeOpcode.OutOfOrder,
    sequence,
  };
}

/**
 * Serialize an Ack packet
 */
function serializeAck(packet: AckPacket): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeUInt16BE(SoeOpcode.Ack);
  writer.writeUInt16BE(packet.sequence);
  return writer.toBuffer();
}

/**
 * Deserialize an Ack packet
 */
function deserializeAck(reader: BufferReader): AckPacket {
  const sequence = reader.readUInt16BE();

  return {
    opcode: SoeOpcode.Ack,
    sequence,
  };
}

/**
 * Serialize a Fatal Error packet
 */
function serializeFatalError(): Uint8Array {
  const writer = new BufferWriter(2);
  writer.writeUInt16BE(SoeOpcode.FatalError);
  return writer.toBuffer();
}

/**
 * Serialize a Fatal Error Response packet
 */
function serializeFatalErrorResponse(): Uint8Array {
  const writer = new BufferWriter(2);
  writer.writeUInt16BE(SoeOpcode.FatalErrorResponse);
  return writer.toBuffer();
}

/**
 * Serialize any SOE packet to bytes
 * @param packet - The packet to serialize
 * @returns Serialized packet data
 */
export function serialize(packet: SoePacket): Uint8Array {
  switch (packet.opcode) {
    case SoeOpcode.SessionRequest:
      return serializeSessionRequest(packet as SessionRequestPacket);
    case SoeOpcode.SessionResponse:
      return serializeSessionResponse(packet as SessionResponsePacket);
    case SoeOpcode.MultiPacket:
      return serializeMultiPacket(packet as MultiPacket);
    case SoeOpcode.Disconnect:
      return serializeDisconnect(packet as DisconnectPacket);
    case SoeOpcode.Ping:
      return serializePing();
    case SoeOpcode.NetStatusRequest:
      return serializeNetStatusRequest(packet as NetStatusRequestPacket);
    case SoeOpcode.NetStatusResponse:
      return serializeNetStatusResponse(packet as NetStatusResponsePacket);
    case SoeOpcode.Data:
      return serializeData(packet as DataPacket);
    case SoeOpcode.DataFragment:
      return serializeDataFragment(packet as DataFragmentPacket);
    case SoeOpcode.OutOfOrder:
      return serializeOutOfOrder(packet as OutOfOrderPacket);
    case SoeOpcode.Ack:
      return serializeAck(packet as AckPacket);
    case SoeOpcode.FatalError:
      return serializeFatalError();
    case SoeOpcode.FatalErrorResponse:
      return serializeFatalErrorResponse();
    default: {
      // For unknown packets, return raw data if available
      const unknown = packet as UnknownPacket;
      if (unknown.rawData) {
        return unknown.rawData;
      }
      throw new Error(`Cannot serialize unknown packet type: ${getOpcodeName(unknown.opcode)}`);
    }
  }
}

/**
 * Deserialize bytes to an SOE packet
 * @param data - The raw packet data
 * @returns Deserialized packet
 */
export function deserialize(data: Uint8Array): SoePacket {
  if (data.length < 2) {
    throw new Error('Packet too short: must have at least 2 bytes for opcode');
  }

  const reader = new BufferReader(data);
  const opcode = reader.readUInt16BE();

  switch (opcode) {
    case SoeOpcode.SessionRequest:
      return deserializeSessionRequest(reader);
    case SoeOpcode.SessionResponse:
      return deserializeSessionResponse(reader);
    case SoeOpcode.MultiPacket:
      return deserializeMultiPacket(reader);
    case SoeOpcode.Disconnect:
      return deserializeDisconnect(reader);
    case SoeOpcode.Ping:
      return { opcode: SoeOpcode.Ping };
    case SoeOpcode.NetStatusRequest:
      return deserializeNetStatusRequest(reader);
    case SoeOpcode.NetStatusResponse:
      return deserializeNetStatusResponse(reader);
    case SoeOpcode.Data:
      return deserializeData(reader);
    case SoeOpcode.DataFragment:
      return deserializeDataFragment(reader);
    case SoeOpcode.OutOfOrder:
      return deserializeOutOfOrder(reader);
    case SoeOpcode.Ack:
      return deserializeAck(reader);
    case SoeOpcode.FatalError:
      return { opcode: SoeOpcode.FatalError };
    case SoeOpcode.FatalErrorResponse:
      return { opcode: SoeOpcode.FatalErrorResponse };
    default:
      // Return as unknown packet with raw data
      return {
        opcode: opcode as SoeOpcodeType,
        rawData: data,
      };
  }
}

/**
 * Create a Session Request packet
 */
export function createSessionRequest(
  connectionId: number,
  clientUdpBufferSize: number,
  protocolVersion: string = 'SOE/2'
): SessionRequestPacket {
  return {
    opcode: SoeOpcode.SessionRequest,
    crcLength: 2,
    connectionId,
    clientUdpBufferSize,
    protocolVersion,
  };
}

/**
 * Create a Session Response packet
 */
export function createSessionResponse(
  connectionId: number,
  crcSeed: number,
  serverUdpBufferSize: number,
  options: {
    crcBytes?: number;
    encryptMethod0?: number;
    encryptMethod1?: number;
    protocolVersion?: number;
  } = {}
): SessionResponsePacket {
  return {
    opcode: SoeOpcode.SessionResponse,
    connectionId,
    crcSeed,
    crcBytes: options.crcBytes ?? 2,
    encryptMethod0: options.encryptMethod0 ?? 1, // UserSupplied (compression)
    encryptMethod1: options.encryptMethod1 ?? 1, // UserSupplied (compression)
    serverUdpBufferSize,
    protocolVersion: options.protocolVersion ?? 2,
  };
}

/**
 * Create a Disconnect packet
 */
export function createDisconnect(
  connectionId: number,
  reason: DisconnectReasonType
): DisconnectPacket {
  return {
    opcode: SoeOpcode.Disconnect,
    connectionId,
    reason,
  };
}

/**
 * Create a Ping packet
 */
export function createPing(): PingPacket {
  return { opcode: SoeOpcode.Ping };
}

/**
 * Create a Data packet
 */
export function createData(sequence: number, data: Uint8Array): DataPacket {
  return {
    opcode: SoeOpcode.Data,
    sequence,
    data,
  };
}

/**
 * Create a Data Fragment packet
 */
export function createDataFragment(
  sequence: number,
  data: Uint8Array
): DataFragmentPacket {
  return {
    opcode: SoeOpcode.DataFragment,
    sequence,
    data,
  };
}

/**
 * Create an Ack packet
 */
export function createAck(sequence: number): AckPacket {
  return {
    opcode: SoeOpcode.Ack,
    sequence,
  };
}

/**
 * Create an Out of Order packet
 */
export function createOutOfOrder(sequence: number): OutOfOrderPacket {
  return {
    opcode: SoeOpcode.OutOfOrder,
    sequence,
  };
}

/**
 * Create a Multi-Packet
 */
export function createMultiPacket(subPackets: Uint8Array[]): MultiPacket {
  return {
    opcode: SoeOpcode.MultiPacket,
    subPackets,
  };
}

/**
 * Get the opcode from raw packet data without full deserialization
 */
export function getPacketOpcode(data: Uint8Array): number {
  if (data.length < 2) {
    throw new Error('Packet too short to contain opcode');
  }
  return ((data[0] ?? 0) << 8) | (data[1] ?? 0);
}

/**
 * Check if a packet is a reliable packet (needs acknowledgement)
 */
export function isReliablePacket(packet: SoePacket): boolean {
  return (
    packet.opcode === SoeOpcode.Data ||
    packet.opcode === SoeOpcode.DataFragment
  );
}

/**
 * Check if a packet has a sequence number
 */
export function hasSequence(
  packet: SoePacket
): packet is DataPacket | DataFragmentPacket | AckPacket | OutOfOrderPacket {
  return (
    packet.opcode === SoeOpcode.Data ||
    packet.opcode === SoeOpcode.DataFragment ||
    packet.opcode === SoeOpcode.Ack ||
    packet.opcode === SoeOpcode.OutOfOrder
  );
}
