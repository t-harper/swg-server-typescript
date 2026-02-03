/**
 * SOE Protocol Constants
 * Based on the Sony Online Entertainment protocol used by Star Wars Galaxies
 * Reference: wiki.swganh.org
 */

/**
 * SOE Protocol Opcodes
 * These are the primary packet types used in the SOE protocol layer
 */
export const SoeOpcode = {
  /** Client requesting a new session */
  SessionRequest: 0x01,
  /** Server response to session request */
  SessionResponse: 0x02,
  /** Container for multiple sub-packets */
  MultiPacket: 0x03,
  /** Session disconnection */
  Disconnect: 0x05,
  /** Keep-alive ping */
  Ping: 0x06,
  /** Network status request */
  NetStatusRequest: 0x07,
  /** Network status response */
  NetStatusResponse: 0x08,
  /** Reliable data packet (single) */
  Data: 0x09,
  /** Fragmented data packet */
  DataFragment: 0x0d,
  /** Out of order notification */
  OutOfOrder: 0x11,
  /** Acknowledgement of received packet */
  Ack: 0x15,
  /** Fatal error notification */
  FatalError: 0x1d,
  /** Fatal error response */
  FatalErrorResponse: 0x1e,
} as const;

export type SoeOpcodeType = (typeof SoeOpcode)[keyof typeof SoeOpcode];

/**
 * Opcode names for debugging/logging
 */
export const SoeOpcodeNames: Record<SoeOpcodeType, string> = {
  [SoeOpcode.SessionRequest]: 'SessionRequest',
  [SoeOpcode.SessionResponse]: 'SessionResponse',
  [SoeOpcode.MultiPacket]: 'MultiPacket',
  [SoeOpcode.Disconnect]: 'Disconnect',
  [SoeOpcode.Ping]: 'Ping',
  [SoeOpcode.NetStatusRequest]: 'NetStatusRequest',
  [SoeOpcode.NetStatusResponse]: 'NetStatusResponse',
  [SoeOpcode.Data]: 'Data',
  [SoeOpcode.DataFragment]: 'DataFragment',
  [SoeOpcode.OutOfOrder]: 'OutOfOrder',
  [SoeOpcode.Ack]: 'Ack',
  [SoeOpcode.FatalError]: 'FatalError',
  [SoeOpcode.FatalErrorResponse]: 'FatalErrorResponse',
};

/**
 * Disconnect reason codes
 */
export const DisconnectReason = {
  None: 0x00,
  IcmpError: 0x01,
  Timeout: 0x02,
  OtherSideTerminated: 0x03,
  ManagerDeleted: 0x04,
  ConnectFail: 0x05,
  Application: 0x06,
  UnreachableConnection: 0x07,
  UnacknowledgedTimeout: 0x08,
  NewConnectionAttempt: 0x09,
  ConnectionRefused: 0x0a,
  MutualConnectError: 0x0b,
  ConnectingToSelf: 0x0c,
  ReliableOverflow: 0x0d,
} as const;

export type DisconnectReasonType =
  (typeof DisconnectReason)[keyof typeof DisconnectReason];

/**
 * Protocol default values
 */
export const SoeProtocolDefaults = {
  /** Maximum UDP packet size (MTU safe) */
  UDP_MAX_SIZE: 496,

  /** Default CRC seed for new sessions */
  DEFAULT_CRC_SEED: 0x00000000,

  /** Protocol version used by SWG */
  PROTOCOL_VERSION: 2,

  /** Default session ID for initial requests */
  INITIAL_SESSION_ID: 0,

  /** Maximum reliable data size before fragmentation */
  MAX_RELIABLE_DATA_SIZE: 489, // UDP_MAX_SIZE - headers - CRC

  /** Default compression threshold (bytes) */
  COMPRESSION_THRESHOLD: 40,

  /** Session timeout in milliseconds */
  SESSION_TIMEOUT_MS: 30000,

  /** Ping interval in milliseconds */
  PING_INTERVAL_MS: 5000,

  /** Maximum out-of-order packets to buffer */
  MAX_OUT_OF_ORDER_PACKETS: 400,

  /** Maximum unacknowledged packets before resend */
  MAX_UNACKED_PACKETS: 100,

  /** Resend timeout in milliseconds */
  RESEND_TIMEOUT_MS: 500,
} as const;

/**
 * Encryption flags used in session negotiation
 */
export const EncryptionFlag = {
  /** No encryption */
  None: 0x00,
  /** XOR encryption enabled */
  XorEnabled: 0x01,
} as const;

export type EncryptionFlagType =
  (typeof EncryptionFlag)[keyof typeof EncryptionFlag];

/**
 * Compression flags used in packet headers
 */
export const CompressionFlag = {
  /** Packet is not compressed */
  None: 0x00,
  /** Packet data is zlib compressed */
  Compressed: 0x01,
} as const;

export type CompressionFlagType =
  (typeof CompressionFlag)[keyof typeof CompressionFlag];

/**
 * CRC configuration
 */
export const CrcConfig = {
  /** Standard CRC32 polynomial (IEEE 802.3) */
  POLYNOMIAL: 0xedb88320,
  /** Initial CRC value */
  INITIAL_VALUE: 0xffffffff,
  /** Final XOR value */
  FINAL_XOR: 0xffffffff,
  /** CRC length in bytes */
  CRC_LENGTH: 2, // SOE uses 2-byte CRC
} as const;

/**
 * Packet header sizes
 */
export const HeaderSize = {
  /** Opcode size (2 bytes for most packets) */
  OPCODE: 2,
  /** Session request header size */
  SESSION_REQUEST: 14,
  /** Session response header size */
  SESSION_RESPONSE: 21,
  /** Data packet header size (opcode + sequence) */
  DATA: 4,
  /** Fragment header size (opcode + sequence) */
  DATA_FRAGMENT: 4,
  /** Ack header size */
  ACK: 4,
  /** Disconnect header size */
  DISCONNECT: 6,
} as const;

/**
 * String encoding types used in the protocol
 */
export const StringEncoding = {
  ASCII: 'ascii',
  UTF16LE: 'utf16le',
  UTF8: 'utf8',
} as const;

export type StringEncodingType =
  (typeof StringEncoding)[keyof typeof StringEncoding];

/**
 * Check if an opcode is valid
 */
export function isValidOpcode(opcode: number): opcode is SoeOpcodeType {
  return Object.values(SoeOpcode).includes(opcode as SoeOpcodeType);
}

/**
 * Get opcode name for debugging
 */
export function getOpcodeName(opcode: number): string {
  if (isValidOpcode(opcode)) {
    return SoeOpcodeNames[opcode];
  }
  return `Unknown(0x${opcode.toString(16).padStart(2, '0')})`;
}
