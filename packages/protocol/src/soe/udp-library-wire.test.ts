import { describe, expect, it } from 'vitest';

import {
  deserializeUdpLibraryWirePacket,
  serializeUdpLibraryWirePacket,
  UdpPacketType,
  type UdpPacketClockReflectWire,
  type UdpPacketConnectWire,
  type UdpPacketConfirmWire,
} from './udp-library-wire.js';

describe('udp-library-wire', () => {
  it('round-trips UdpPacketConnect', () => {
    const packet: UdpPacketConnectWire = {
      zeroByte: 0,
      packetType: UdpPacketType.cUdpPacketConnect,
      protocolVersion: 2,
      connectCode: 0x12345678,
      maxRawPacketSize: 496,
    };

    const encoded = serializeUdpLibraryWirePacket(packet);
    const decoded = deserializeUdpLibraryWirePacket(encoded);

    expect(decoded).toEqual(packet);
  });

  it('round-trips UdpPacketConfirm preserving opaque config bytes', () => {
    const packet: UdpPacketConfirmWire = {
      zeroByte: 0,
      packetType: UdpPacketType.cUdpPacketConfirm,
      connectCode: 0x11223344,
      configBytes: Uint8Array.from([1, 2, 3, 4, 5, 6]),
      maxRawPacketSize: 512,
    };

    const encoded = serializeUdpLibraryWirePacket(packet);
    const decoded = deserializeUdpLibraryWirePacket(encoded);
    expect(decoded).toEqual(packet);
  });

  it('round-trips UdpPacketClockReflect with 64-bit counters', () => {
    const packet: UdpPacketClockReflectWire = {
      zeroByte: 0,
      packetType: UdpPacketType.cUdpPacketClockReflect,
      timeStamp: 0x7fff,
      serverSyncStampLong: 0xdeadbeef,
      yourSent: 100n,
      yourReceived: 200n,
      ourSent: 300n,
      ourReceived: 400n,
    };

    const encoded = serializeUdpLibraryWirePacket(packet);
    const decoded = deserializeUdpLibraryWirePacket(encoded);
    expect(decoded).toEqual(packet);
  });
});

