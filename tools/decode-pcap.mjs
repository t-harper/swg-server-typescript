#!/usr/bin/env node
/**
 * SOE/SWG PCAP Decoder
 * Decodes SOE-encrypted packets from pcap captures for protocol analysis.
 * Usage: node tools/decode-pcap.mjs <pcap-file> [port-filter]
 */
import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';

// ── Pcap parsing ──────────────────────────────────────────────────────
function parsePcap(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = dv.getUint32(0, true);
  let le = true;
  if (magic === 0xa1b2c3d4) le = true;
  else if (magic === 0xd4c3b2a1) le = false;
  else throw new Error(`Not a pcap file (magic: 0x${magic.toString(16)})`);

  const linkType = dv.getUint32(20, le);
  let offset = 24; // global header size
  const packets = [];

  while (offset + 16 <= buf.length) {
    const inclLen = dv.getUint32(offset + 8, le);
    const pktData = buf.subarray(offset + 16, offset + 16 + inclLen);
    offset += 16 + inclLen;

    // Parse Ethernet (linkType 1) or raw IP
    let ipStart = 0;
    if (linkType === 1) {
      // Ethernet: 14 bytes header
      ipStart = 14;
    } else if (linkType === 101) {
      // Raw IP
      ipStart = 0;
    } else if (linkType === 113) {
      // Linux cooked capture
      ipStart = 16;
    } else {
      continue;
    }

    if (ipStart >= pktData.length) continue;
    const ipVersion = (pktData[ipStart] >> 4) & 0xf;
    if (ipVersion !== 4) continue;

    const ihl = (pktData[ipStart] & 0xf) * 4;
    const protocol = pktData[ipStart + 9];
    if (protocol !== 17) continue; // UDP only

    const srcIp = `${pktData[ipStart + 12]}.${pktData[ipStart + 13]}.${pktData[ipStart + 14]}.${pktData[ipStart + 15]}`;
    const dstIp = `${pktData[ipStart + 16]}.${pktData[ipStart + 17]}.${pktData[ipStart + 18]}.${pktData[ipStart + 19]}`;

    const udpStart = ipStart + ihl;
    const srcPort = (pktData[udpStart] << 8) | pktData[udpStart + 1];
    const dstPort = (pktData[udpStart + 2] << 8) | pktData[udpStart + 3];
    const udpPayload = pktData.subarray(udpStart + 8);

    packets.push({ srcIp, dstIp, srcPort, dstPort, data: new Uint8Array(udpPayload) });
  }
  return packets;
}

// ── SOE XOR CBC Decrypt (matches C++ UdpConnection::DecryptXor) ──────
function xorDecrypt(payload, encryptCode) {
  const result = new Uint8Array(payload.length);
  let prev = encryptCode;
  let off = 0;

  while (off + 4 <= payload.length) {
    const encrypted = (payload[off]) | (payload[off + 1] << 8) |
                      (payload[off + 2] << 16) | (payload[off + 3] << 24);
    const decrypted = (encrypted ^ prev) | 0;
    result[off]     = decrypted & 0xff;
    result[off + 1] = (decrypted >> 8) & 0xff;
    result[off + 2] = (decrypted >> 16) & 0xff;
    result[off + 3] = (decrypted >> 24) & 0xff;
    prev = encrypted;
    off += 4;
  }
  // Remaining bytes
  while (off < payload.length) {
    result[off] = (payload[off] ^ prev) & 0xff;
    off++;
  }
  return result;
}

// ── SOE User-Supplied Decrypt (trailing flag = compression) ──────────
function soeDecryptOnePass(payload) {
  if (payload.length === 0) return payload;
  const flag = payload[payload.length - 1];
  const data = payload.subarray(0, payload.length - 1);
  if (flag === 0x01 && data.length > 0) {
    try { return new Uint8Array(inflateSync(Buffer.from(data))); } catch { return data; }
  }
  return data;
}

// ── Full SOE 2-pass decrypt ──────────────────────────────────────────
function soeDecrypt(packetData, session) {
  if (packetData.length <= 2) return packetData;
  const opcode = packetData.subarray(0, 2);
  let payload = packetData.subarray(2);

  // Pass 1: XOR CBC (encryptMethod1 = 4)
  if (session.encryptMethod1 === 4) {
    payload = xorDecrypt(payload, session.crcSeed);
  } else if (session.encryptMethod1 === 1) {
    payload = soeDecryptOnePass(payload);
  }
  // Pass 0: UserSupplied (encryptMethod0 = 1)
  if (session.encryptMethod0 === 1) {
    payload = soeDecryptOnePass(payload);
  }

  const result = new Uint8Array(2 + payload.length);
  result.set(opcode);
  result.set(payload, 2);
  return result;
}

// ── CRC32 ────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
{
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xedb88320) : (crc >>> 1);
    }
    CRC_TABLE[i] = crc >>> 0;
  }
}
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function soeCrc32(data, seed) {
  // Match crc32.ts: mix seed in LE byte order, then data
  let crc = 0xffffffff;
  // Seed bytes in LE order
  const seedBytes = [seed & 0xff, (seed >>> 8) & 0xff, (seed >>> 16) & 0xff, (seed >>> 24) & 0xff];
  for (const b of seedBytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ b) & 0xff];
  }
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validateAndStripCrc(data, crcLen, seed) {
  if (data.length <= crcLen) return null;
  const body = data.subarray(0, data.length - crcLen);
  const computed = soeCrc32(body, seed) & 0xffff; // 16-bit
  const appended = (data[data.length - 2] << 8) | data[data.length - 1];
  if (computed !== appended) {
    return null; // CRC mismatch
  }
  return body;
}

// ── SWG Message Opcode Names ─────────────────────────────────────────
const KNOWN_OPCODES = {
  // Login messages
  0x41131f96: 'LoginClientId',
  0x00000005: 'LoginClientToken',
  0xc11c63b9: 'LoginEnumCluster',
  0x3436aeb6: 'LoginClusterStatus',
  0xc4de864c: 'EnumerateCharacterId',
  0xa25b53d0: 'EnumerateCharacterIdResponse',
  0xd5ea6a39: 'LoginIncorrectClientId',
  0x44b3a15c: 'StationIdHasJediSlot',
  0x60579eb3: 'GalaxyLoopTimesResponse',
  // Character creation
  0xb97f3074: 'ClientCreateCharacter',
  0x1db575cc: 'CreateCharacterSuccess',
  0xdf333c6e: 'CreateCharacterFailure',
  0x9eb04b9f: 'ClientVerifyAndLockNameRequest',
  0x9b2c6ba7: 'ClientVerifyAndLockNameResponse',
  0xd6d1b6d1: 'ClientRandomNameRequest',
  0xe85fb868: 'ClientRandomNameResponse',
  // Connection messages
  0xd5899226: 'ClientIdMsg',
  0xb5098d76: 'SelectCharacter',
  0x31805ee0: 'ConnectionOpen',
  0x979f0279: 'AccountFeatureBits',
  // Zone messages (verified from C++ pcap)
  0x3ae6dfae: 'CmdStartScene',
  0x487652da: 'ParametersMessage',
  0xfe89ddea: 'SceneCreateObjectByCrc',
  0x68a75f0c: 'BaselinesMessage',
  0x12862153: 'DeltasMessage',
  0x2c436037: 'SceneEndBaselines',
  0x43fd1c22: 'CmdSceneReady',
  0x2efaa1e9: 'ServerTimeMessage',
  0x56cbde9e: 'UpdateContainment',
  0x08a1c126: 'UpdatePvpStatusMessage',
  0x0bde6b41: 'UpdatePostureMessage',
  // Object/game messages
  0x80ce5e46: 'ObjControllerMessage',
  0xe00730e5: 'ClientPermissionsMessage',
  0x7102b15f: 'ChatServerStatus',
  0x9e601905: 'VoiceChatStatus',
  0xf5ea7b42: 'PostureMessage',
  0xf35dbfbe: 'AttributeListMessage',
  // Client post-zone messages
  0x4c3d2cfa: 'ChatRequestRoomList',
  0x2e365218: 'ConnectPlayerMessage',
  0xd44b7259: 'SuiCreatePageMessage',
  0x6d2a6413: 'PlayClientEffectObjectMessage',
};

function opcodeName(op) {
  return KNOWN_OPCODES[op] ?? `Unknown_0x${op.toString(16).padStart(8, '0')}`;
}

function hex(bytes, max) {
  const arr = Array.from(bytes.subarray(0, max ?? bytes.length));
  return arr.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// ── Parse SWG message from decrypted payload ─────────────────────────
function parseSwgMessages(data) {
  const messages = [];
  if (data.length < 2) return messages;

  // Check for UdpPacketGroup (0x00 0x19) — multiple SWG messages bundled
  // with variable-length size prefixes
  if (data[0] === 0x00 && data[1] === 0x19) {
    let off = 2;
    while (off < data.length) {
      // Read variable-length size: 1 byte if < 0xFF, else 0xFF + u16BE
      let msgSize = data[off++];
      if (msgSize === 0xff && off + 2 <= data.length) {
        msgSize = (data[off] << 8) | data[off + 1];
        off += 2;
      } else if (msgSize === 0xfe && off + 3 <= data.length) {
        msgSize = (data[off] << 16) | (data[off + 1] << 8) | data[off + 2];
        off += 3;
      }
      if (msgSize === 0 || off + msgSize > data.length) break;

      const msgData = data.subarray(off, off + msgSize);
      off += msgSize;

      if (msgData.length >= 6) {
        const operandCount = msgData[0] | (msgData[1] << 8);
        const opcode = (msgData[2] | (msgData[3] << 8) | (msgData[4] << 16) | (msgData[5] << 24)) >>> 0;
        messages.push({ operandCount, opcode, name: opcodeName(opcode), data: msgData });
      } else if (msgData.length >= 2) {
        // Short message (e.g., CmdSceneReady with operandCount=1)
        const operandCount = msgData[0] | (msgData[1] << 8);
        if (msgData.length >= 6) {
          const opcode = (msgData[2] | (msgData[3] << 8) | (msgData[4] << 16) | (msgData[5] << 24)) >>> 0;
          messages.push({ operandCount, opcode, name: opcodeName(opcode), data: msgData });
        } else {
          messages.push({ operandCount, opcode: 0, name: `Short(${msgData.length}b)`, data: msgData });
        }
      }
    }
    return messages;
  }

  // Single SWG message: operandCount(u16LE) + opcode(u32LE)
  if (data.length < 6) {
    if (data.length >= 2) {
      const operandCount = data[0] | (data[1] << 8);
      messages.push({ operandCount, opcode: 0, name: `Short(${data.length}b)`, data });
    }
    return messages;
  }

  const operandCount = data[0] | (data[1] << 8);
  const opcode = (data[2] | (data[3] << 8) | (data[4] << 16) | (data[5] << 24)) >>> 0;

  messages.push({
    operandCount,
    opcode,
    name: opcodeName(opcode),
    data,
  });
  return messages;
}

// ── Parse reliable data sequence ─────────────────────────────────────
function parseReliableData(packetData) {
  // Data packet: opcode(2) + sequence(2) + payload
  if (packetData.length < 4) return null;
  const seq = (packetData[2] << 8) | packetData[3];
  const payload = packetData.subarray(4);
  return { seq, payload };
}

// ── Parse MultiPacket (opcode 0x0003) ────────────────────────────────
function parseMultiPacket(packetData) {
  // Multi: opcode(2) + [varlen_size + sub_packet]*
  const subPackets = [];
  let off = 2;
  while (off < packetData.length) {
    // Variable-length size encoding
    let size = packetData[off++];
    if (size === 0xff) {
      if (off + 2 > packetData.length) break;
      size = (packetData[off] << 8) | packetData[off + 1];
      off += 2;
    } else if (size === 0xfe) {
      // 3-byte size, but uncommon
      if (off + 3 > packetData.length) break;
      size = (packetData[off] << 16) | (packetData[off + 1] << 8) | packetData[off + 2];
      off += 3;
    }
    if (off + size > packetData.length) break;
    subPackets.push(packetData.subarray(off, off + size));
    off += size;
  }
  return subPackets;
}

// ── Main ─────────────────────────────────────────────────────────────
const pcapFile = process.argv[2] ?? 'docs/pcaps/character_creation_zone_in_process.pcap';
const portFilter = process.argv[3] ? parseInt(process.argv[3]) : null;

const buf = readFileSync(pcapFile);
const packets = parsePcap(buf);

console.log(`Parsed ${packets.length} UDP packets from ${pcapFile}\n`);

// Track sessions by server port
const sessions = new Map();

for (let i = 0; i < packets.length; i++) {
  const pkt = packets[i];
  if (portFilter && pkt.srcPort !== portFilter && pkt.dstPort !== portFilter) continue;

  const serverPort = Math.min(pkt.srcPort, pkt.dstPort) < 50000
    ? (pkt.srcPort < 50000 ? pkt.srcPort : pkt.dstPort)
    : pkt.dstPort;
  const isFromServer = pkt.srcPort === serverPort;
  const direction = isFromServer ? 'S->C' : 'C->S';

  if (pkt.data.length < 2) continue;
  const soeOpcode = (pkt.data[0] << 8) | pkt.data[1];

  // Track sessions
  let session = sessions.get(serverPort);

  if (soeOpcode === 0x0001) {
    // SessionRequest
    const connId = (pkt.data[6] << 24) | (pkt.data[7] << 16) | (pkt.data[8] << 8) | pkt.data[9];
    const maxPkt = (pkt.data[10] << 24) | (pkt.data[11] << 16) | (pkt.data[12] << 8) | pkt.data[13];
    session = { crcSeed: 0, crcLen: 0, encryptMethod0: 0, encryptMethod1: 0, connId };
    sessions.set(serverPort, session);
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=SessionRequest connId=0x${connId.toString(16)} maxPkt=${maxPkt}`);
    continue;
  }

  if (soeOpcode === 0x0002) {
    // SessionResponse
    const connId = (pkt.data[2] << 24) | (pkt.data[3] << 16) | (pkt.data[4] << 8) | pkt.data[5];
    const seed = ((pkt.data[6] << 24) | (pkt.data[7] << 16) | (pkt.data[8] << 8) | pkt.data[9]) >>> 0;
    const crcLen = pkt.data[10];
    const em0 = pkt.data[11];
    const em1 = pkt.data[12];
    const maxPkt = (pkt.data[13] << 24) | (pkt.data[14] << 16) | (pkt.data[15] << 8) | pkt.data[16];
    session = { crcSeed: seed, crcLen, encryptMethod0: em0, encryptMethod1: em1, connId };
    sessions.set(serverPort, session);
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=SessionResponse seed=0x${seed.toString(16)} crcLen=${crcLen} em0=${em0} em1=${em1} maxPkt=${maxPkt}`);
    continue;
  }

  if (!session) {
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=0x${soeOpcode.toString(16).padStart(4, '0')} (no session)`);
    continue;
  }

  // SOE opcodes that carry data
  const isAck = soeOpcode === 0x0015;
  const isOoo = soeOpcode === 0x0011;
  const isPing = soeOpcode === 0x0006;

  if (isAck || isOoo || isPing) {
    const name = isAck ? 'Ack' : isOoo ? 'OutOfOrder' : 'Ping';
    if (pkt.data.length >= 4) {
      // Strip CRC first, then read sequence from decrypted data
      let payload = pkt.data;
      if (session.crcLen > 0) {
        const stripped = validateAndStripCrc(payload, session.crcLen, session.crcSeed);
        if (stripped) payload = stripped;
      }
      const decrypted = soeDecrypt(payload, session);
      if (decrypted.length >= 4) {
        const seq = (decrypted[2] << 8) | decrypted[3];
        console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=${name} seq=${seq}`);
      } else {
        console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=${name}`);
      }
    } else {
      console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=${name}`);
    }
    continue;
  }

  // Data (0x0009), Fragment (0x000D), Multi (0x0003)
  const soeNames = { 0x0003: 'Multi', 0x0005: 'Disconnect', 0x0007: 'NetStatusReq', 0x0008: 'NetStatusResp',
                     0x0009: 'Data', 0x000d: 'Fragment' };
  const soeName = soeNames[soeOpcode] ?? `SOE_0x${soeOpcode.toString(16).padStart(4, '0')}`;

  // Strip CRC
  let stripped = pkt.data;
  if (session.crcLen > 0) {
    const s = validateAndStripCrc(pkt.data, session.crcLen, session.crcSeed);
    if (s) {
      stripped = s;
    } else {
      console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=${soeName} ** CRC FAILED ** raw=[${hex(pkt.data, 40)}]`);
      continue;
    }
  }

  // Decrypt
  const decrypted = soeDecrypt(stripped, session);

  if (soeOpcode === 0x0007 || soeOpcode === 0x0008) {
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=${soeName} len=${decrypted.length}`);
    continue;
  }

  if (soeOpcode === 0x0005) {
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=Disconnect`);
    continue;
  }

  // For Data packets, extract sequence + SWG payload
  if (soeOpcode === 0x0009) {
    const rel = parseReliableData(decrypted);
    if (!rel) continue;
    const msgs = parseSwgMessages(rel.payload);
    const isGroup = rel.payload.length >= 2 && rel.payload[0] === 0x00 && rel.payload[1] === 0x19;
    if (isGroup && msgs.length > 0) {
      console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=Data seq=${rel.seq} | MultiMessage (${msgs.length} SWG messages)`);
      for (let mi = 0; mi < msgs.length; mi++) {
        const msg = msgs[mi];
        console.log(`    [${mi}] ${msg.name} (0x${msg.opcode.toString(16)}) operands=${msg.operandCount} len=${msg.data.length}`);
        console.log(`        hex: ${hex(msg.data, 80)}`);
      }
    } else if (msgs.length > 0) {
      for (const msg of msgs) {
        console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=Data seq=${rel.seq} | SWG: ${msg.name} (0x${msg.opcode.toString(16)}) operands=${msg.operandCount} len=${msg.data.length}`);
        console.log(`    hex: ${hex(msg.data, 80)}`);
      }
    }
    if (msgs.length === 0) {
      console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=Data seq=${rel.seq} payload_len=${rel.payload.length} hex=[${hex(rel.payload, 60)}]`);
    }
    continue;
  }

  // For Multi packets, extract sub-packets
  if (soeOpcode === 0x0003) {
    const subs = parseMultiPacket(decrypted);
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=Multi (${subs.length} sub-packets)`);
    for (let si = 0; si < subs.length; si++) {
      const sub = subs[si];
      if (sub.length < 2) continue;
      const subOp = (sub[0] << 8) | sub[1];

      if (subOp === 0x0009) {
        // Reliable data inside multi
        if (sub.length >= 4) {
          const seq = (sub[2] << 8) | sub[3];
          const payload = sub.subarray(4);
          const msgs = parseSwgMessages(payload);
          const isGroup = payload.length >= 2 && payload[0] === 0x00 && payload[1] === 0x19;
          if (isGroup && msgs.length > 0) {
            console.log(`    sub[${si}] Data seq=${seq} | MultiMessage (${msgs.length} SWG messages)`);
            for (let mi = 0; mi < msgs.length; mi++) {
              const msg = msgs[mi];
              console.log(`      [${mi}] ${msg.name} (0x${msg.opcode.toString(16)}) operands=${msg.operandCount} len=${msg.data.length}`);
              console.log(`          hex: ${hex(msg.data, 80)}`);
            }
          } else {
            for (const msg of msgs) {
              console.log(`    sub[${si}] Data seq=${seq} | SWG: ${msg.name} (0x${msg.opcode.toString(16)}) operands=${msg.operandCount} len=${msg.data.length}`);
              console.log(`      hex: ${hex(msg.data, 80)}`);
            }
          }
          if (msgs.length === 0) {
            console.log(`    sub[${si}] Data seq=${seq} payload_len=${payload.length} hex=[${hex(payload, 40)}]`);
          }
        }
      } else if (subOp === 0x0015) {
        if (sub.length >= 4) {
          const seq = (sub[2] << 8) | sub[3];
          console.log(`    sub[${si}] Ack seq=${seq}`);
        }
      } else {
        console.log(`    sub[${si}] SOE=0x${subOp.toString(16).padStart(4, '0')} len=${sub.length} hex=[${hex(sub, 40)}]`);
      }
    }
    continue;
  }

  // Fragment packets
  if (soeOpcode === 0x000d) {
    const rel = parseReliableData(decrypted);
    if (!rel) continue;
    console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=Fragment seq=${rel.seq} payload_len=${rel.payload.length} hex=[${hex(rel.payload, 60)}]`);
    continue;
  }

  console.log(`--- Frame ${i + 1} [${direction}] port=${serverPort} SOE=${soeName} len=${decrypted.length} hex=[${hex(decrypted, 60)}]`);
}
