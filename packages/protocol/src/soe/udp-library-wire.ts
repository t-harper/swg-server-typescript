import { BufferReader, BufferWriter } from './buffer-utils.js';

/**
 * UdpPacketType from UdpLibrary (cUdpPacket* values).
 * Values and ordering are mirrored from NETWORK.md / C++ UdpLibrary.hpp.
 */
export const UdpPacketType = {
  cUdpPacketZeroEscape: 0,
  cUdpPacketConnect: 1,
  cUdpPacketConfirm: 2,
  cUdpPacketMulti: 3,
  cUdpPacketBig: 4,
  cUdpPacketTerminate: 5,
  cUdpPacketKeepAlive: 6,
  cUdpPacketClockSync: 7,
  cUdpPacketClockReflect: 8,
  cUdpPacketReliable1: 9,
  cUdpPacketReliable2: 10,
  cUdpPacketReliable3: 11,
  cUdpPacketReliable4: 12,
  cUdpPacketFragment1: 13,
  cUdpPacketFragment2: 14,
  cUdpPacketFragment3: 15,
  cUdpPacketFragment4: 16,
  cUdpPacketAck1: 17,
  cUdpPacketAck2: 18,
  cUdpPacketAck3: 19,
  cUdpPacketAck4: 20,
  cUdpPacketAckAll1: 21,
  cUdpPacketAckAll2: 22,
  cUdpPacketAckAll3: 23,
  cUdpPacketAckAll4: 24,
  cUdpPacketGroup: 25,
  cUdpPacketOrdered: 26,
  cUdpPacketOrdered2: 27,
  cUdpPacketPortAlive: 28,
  cUdpPacketUnreachableConnection: 29,
  cUdpPacketRequestRemap: 30,
} as const;

export type UdpPacketTypeValue = (typeof UdpPacketType)[keyof typeof UdpPacketType];

export const DisconnectReasonUdp = {
  cDisconnectReasonNone: 0,
  cDisconnectReasonIcmpError: 1,
  cDisconnectReasonTimeout: 2,
  cDisconnectReasonOtherSideTerminated: 3,
  cDisconnectReasonManagerDeleted: 4,
  cDisconnectReasonConnectFail: 5,
  cDisconnectReasonApplication: 6,
  cDisconnectReasonUnreachableConnection: 7,
  cDisconnectReasonUnacknowledgedTimeout: 8,
  cDisconnectReasonNewConnectionAttempt: 9,
  cDisconnectReasonConnectionRefused: 10,
  cDisconnectReasonMutualConnectError: 11,
  cDisconnectReasonConnectingToSelf: 12,
  cDisconnectReasonReliableOverflow: 13,
  cDisconnectReasonDosAttack: 14,
  cDisconnectReasonCount: 15,
} as const;

export type DisconnectReasonUdpValue =
  (typeof DisconnectReasonUdp)[keyof typeof DisconnectReasonUdp];

export interface UdpPacketBase {
  zeroByte: number;
  packetType: UdpPacketTypeValue;
}

export interface UdpPacketConnectWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketConnect;
  protocolVersion: number;
  connectCode: number;
  maxRawPacketSize: number;
}

export interface UdpPacketConfirmWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketConfirm;
  connectCode: number;
  /**
   * Opaque bytes for UdpLibrary::Configuration.
   * The config struct is C++ internal and intentionally preserved as raw bytes.
   */
  configBytes: Uint8Array;
  maxRawPacketSize: number;
}

export interface UdpPacketTerminateWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketTerminate;
  connectCode: number;
}

export interface UdpPacketKeepAliveWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketKeepAlive;
}

export interface UdpPacketGroupWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketGroup;
}

export interface UdpPacketClockSyncWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketClockSync;
  timeStamp: number;
  masterPingTime: number;
  averagePingTime: number;
  lowPingTime: number;
  highPingTime: number;
  lastPingTime: number;
  ourSent: bigint;
  ourReceived: bigint;
}

export interface UdpPacketClockReflectWire extends UdpPacketBase {
  packetType: typeof UdpPacketType.cUdpPacketClockReflect;
  timeStamp: number;
  serverSyncStampLong: number;
  yourSent: bigint;
  yourReceived: bigint;
  ourSent: bigint;
  ourReceived: bigint;
}

export interface UdpPacketReliableWire extends UdpPacketBase {
  packetType:
    | typeof UdpPacketType.cUdpPacketReliable1
    | typeof UdpPacketType.cUdpPacketReliable2
    | typeof UdpPacketType.cUdpPacketReliable3
    | typeof UdpPacketType.cUdpPacketReliable4
    | typeof UdpPacketType.cUdpPacketFragment1
    | typeof UdpPacketType.cUdpPacketFragment2
    | typeof UdpPacketType.cUdpPacketFragment3
    | typeof UdpPacketType.cUdpPacketFragment4
    | typeof UdpPacketType.cUdpPacketAck1
    | typeof UdpPacketType.cUdpPacketAck2
    | typeof UdpPacketType.cUdpPacketAck3
    | typeof UdpPacketType.cUdpPacketAck4
    | typeof UdpPacketType.cUdpPacketAckAll1
    | typeof UdpPacketType.cUdpPacketAckAll2
    | typeof UdpPacketType.cUdpPacketAckAll3
    | typeof UdpPacketType.cUdpPacketAckAll4;
  reliableStamp: number;
}

export interface UdpPacketReliableFragmentStartWire extends UdpPacketReliableWire {
  packetType:
    | typeof UdpPacketType.cUdpPacketFragment1
    | typeof UdpPacketType.cUdpPacketFragment2
    | typeof UdpPacketType.cUdpPacketFragment3
    | typeof UdpPacketType.cUdpPacketFragment4;
  length: number;
}

export interface UdpPacketOrderedWire extends UdpPacketBase {
  packetType:
    | typeof UdpPacketType.cUdpPacketOrdered
    | typeof UdpPacketType.cUdpPacketOrdered2;
  orderStamp: number;
}

export interface UdpPacketUnknownWire extends UdpPacketBase {
  rawPayload: Uint8Array;
}

export type UdpLibraryWirePacket =
  | UdpPacketConnectWire
  | UdpPacketConfirmWire
  | UdpPacketTerminateWire
  | UdpPacketKeepAliveWire
  | UdpPacketGroupWire
  | UdpPacketClockSyncWire
  | UdpPacketClockReflectWire
  | UdpPacketReliableWire
  | UdpPacketReliableFragmentStartWire
  | UdpPacketOrderedWire
  | UdpPacketUnknownWire;

function assertZeroByte(value: number): void {
  if (value !== 0) {
    throw new Error(`Invalid UdpLibrary zero-byte prefix: ${value}`);
  }
}

function isAckOrReliableType(type: number): boolean {
  return type >= UdpPacketType.cUdpPacketReliable1 && type <= UdpPacketType.cUdpPacketAckAll4;
}

function isFragmentType(type: number): boolean {
  return (
    type >= UdpPacketType.cUdpPacketFragment1 &&
    type <= UdpPacketType.cUdpPacketFragment4
  );
}

function isOrderedType(type: number): boolean {
  return (
    type === UdpPacketType.cUdpPacketOrdered ||
    type === UdpPacketType.cUdpPacketOrdered2
  );
}

export function serializeUdpLibraryWirePacket(packet: UdpLibraryWirePacket): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt8(packet.zeroByte & 0xff);
  writer.writeUInt8(packet.packetType);

  switch (packet.packetType) {
    case UdpPacketType.cUdpPacketConnect: {
      const typed = packet as UdpPacketConnectWire;
      writer.writeInt32BE(typed.protocolVersion);
      writer.writeInt32BE(typed.connectCode);
      writer.writeInt32BE(typed.maxRawPacketSize);
      break;
    }

    case UdpPacketType.cUdpPacketConfirm: {
      const typed = packet as UdpPacketConfirmWire;
      writer.writeInt32BE(typed.connectCode);
      writer.writeBytes(typed.configBytes);
      writer.writeInt32BE(typed.maxRawPacketSize);
      break;
    }

    case UdpPacketType.cUdpPacketTerminate: {
      const typed = packet as UdpPacketTerminateWire;
      writer.writeInt32BE(typed.connectCode);
      break;
    }

    case UdpPacketType.cUdpPacketClockSync: {
      const typed = packet as UdpPacketClockSyncWire;
      writer.writeUInt16BE(typed.timeStamp);
      writer.writeInt32BE(typed.masterPingTime);
      writer.writeInt32BE(typed.averagePingTime);
      writer.writeInt32BE(typed.lowPingTime);
      writer.writeInt32BE(typed.highPingTime);
      writer.writeInt32BE(typed.lastPingTime);
      writer.writeInt64BE(typed.ourSent);
      writer.writeInt64BE(typed.ourReceived);
      break;
    }

    case UdpPacketType.cUdpPacketClockReflect: {
      const typed = packet as UdpPacketClockReflectWire;
      writer.writeUInt16BE(typed.timeStamp);
      writer.writeUInt32BE(typed.serverSyncStampLong);
      writer.writeInt64BE(typed.yourSent);
      writer.writeInt64BE(typed.yourReceived);
      writer.writeInt64BE(typed.ourSent);
      writer.writeInt64BE(typed.ourReceived);
      break;
    }

    default: {
      if (isAckOrReliableType(packet.packetType)) {
        const typed = packet as UdpPacketReliableWire;
        writer.writeUInt16BE(typed.reliableStamp);
        if (isFragmentType(packet.packetType)) {
          const fragment = typed as UdpPacketReliableFragmentStartWire;
          if (typeof fragment.length === 'number') {
            writer.writeInt32BE(fragment.length);
          }
        }
        break;
      }

      if (isOrderedType(packet.packetType)) {
        const typed = packet as UdpPacketOrderedWire;
        writer.writeUInt16BE(typed.orderStamp);
        break;
      }

      if ('rawPayload' in packet) {
        writer.writeBytes(packet.rawPayload);
      }
      break;
    }
  }

  return writer.toBuffer();
}

export function deserializeUdpLibraryWirePacket(data: Uint8Array): UdpLibraryWirePacket {
  const reader = new BufferReader(data);
  const zeroByte = reader.readUInt8();
  assertZeroByte(zeroByte);
  const packetType = reader.readUInt8();

  switch (packetType) {
    case UdpPacketType.cUdpPacketConnect:
      return {
        zeroByte,
        packetType,
        protocolVersion: reader.readInt32BE(),
        connectCode: reader.readInt32BE(),
        maxRawPacketSize: reader.readInt32BE(),
      };

    case UdpPacketType.cUdpPacketConfirm: {
      const connectCode = reader.readInt32BE();
      const remainingBeforeTail = reader.remaining() - 4;
      if (remainingBeforeTail < 0) {
        throw new Error('Invalid UdpPacketConfirm payload length');
      }
      const configBytes = reader.readBytes(remainingBeforeTail);
      const maxRawPacketSize = reader.readInt32BE();
      return {
        zeroByte,
        packetType,
        connectCode,
        configBytes,
        maxRawPacketSize,
      };
    }

    case UdpPacketType.cUdpPacketTerminate:
      return {
        zeroByte,
        packetType,
        connectCode: reader.readInt32BE(),
      };

    case UdpPacketType.cUdpPacketKeepAlive:
      return { zeroByte, packetType };

    case UdpPacketType.cUdpPacketGroup:
      return { zeroByte, packetType };

    case UdpPacketType.cUdpPacketClockSync:
      return {
        zeroByte,
        packetType,
        timeStamp: reader.readUInt16BE(),
        masterPingTime: reader.readInt32BE(),
        averagePingTime: reader.readInt32BE(),
        lowPingTime: reader.readInt32BE(),
        highPingTime: reader.readInt32BE(),
        lastPingTime: reader.readInt32BE(),
        ourSent: reader.readInt64BE(),
        ourReceived: reader.readInt64BE(),
      };

    case UdpPacketType.cUdpPacketClockReflect:
      return {
        zeroByte,
        packetType,
        timeStamp: reader.readUInt16BE(),
        serverSyncStampLong: reader.readUInt32BE(),
        yourSent: reader.readInt64BE(),
        yourReceived: reader.readInt64BE(),
        ourSent: reader.readInt64BE(),
        ourReceived: reader.readInt64BE(),
      };

    default: {
      if (isAckOrReliableType(packetType)) {
        const reliableStamp = reader.readUInt16BE();
        if (isFragmentType(packetType) && reader.remaining() >= 4) {
          return {
            zeroByte,
            packetType: packetType as UdpPacketReliableFragmentStartWire['packetType'],
            reliableStamp,
            length: reader.readInt32BE(),
          };
        }
        return {
          zeroByte,
          packetType: packetType as UdpPacketReliableWire['packetType'],
          reliableStamp,
        };
      }

      if (isOrderedType(packetType)) {
        return {
          zeroByte,
          packetType: packetType as UdpPacketOrderedWire['packetType'],
          orderStamp: reader.readUInt16BE(),
        };
      }

      return {
        zeroByte,
        packetType: packetType as UdpPacketTypeValue,
        rawPayload: reader.readRemaining(),
      };
    }
  }
}
