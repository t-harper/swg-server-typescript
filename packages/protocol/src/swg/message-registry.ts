import {
  CPP_PACKET_DEFINITIONS,
  CPP_PACKET_DEFINITIONS_BY_NAME,
  type CppPacketDefinition,
} from './messages/generated/cpp-packet-manifest.js';
import {
  CppWireCodec,
  decodeCppWirePacketByName,
  encodeCppWirePacketByName,
  defaultCppWireCodec,
  type CppWirePacket,
} from './wire/cpp-wire-codec.js';

export interface MessageRegistryEntry {
  name: string;
  opcode: number;
  definition: CppPacketDefinition;
}

export interface MessageRegistry {
  getByName(name: string): MessageRegistryEntry | undefined;
  getByOpcode(opcode: number): MessageRegistryEntry[];
  list(): MessageRegistryEntry[];
  encodeByName(name: string, fields: Record<string, unknown>): Uint8Array;
  decodeByName(name: string, data: Uint8Array): CppWirePacket;
  decodeByOpcode(data: Uint8Array, preferredName?: string): CppWirePacket;
}

function parseOpcode(hex: string): number {
  return Number.parseInt(hex, 16) >>> 0;
}

export class SwgMessageRegistry implements MessageRegistry {
  private readonly byName = new Map<string, MessageRegistryEntry>();
  private readonly byOpcode = new Map<number, MessageRegistryEntry[]>();
  private readonly codec: CppWireCodec;

  constructor(codec: CppWireCodec = defaultCppWireCodec) {
    this.codec = codec;
    for (const definition of CPP_PACKET_DEFINITIONS) {
      const opcode = parseOpcode(definition.swgCrc32);
      const entry: MessageRegistryEntry = {
        name: definition.name,
        opcode,
        definition,
      };
      this.byName.set(definition.name, entry);
      const existing = this.byOpcode.get(opcode);
      if (existing) {
        existing.push(entry);
      } else {
        this.byOpcode.set(opcode, [entry]);
      }
    }
  }

  getByName(name: string): MessageRegistryEntry | undefined {
    return this.byName.get(name);
  }

  getByOpcode(opcode: number): MessageRegistryEntry[] {
    return this.byOpcode.get(opcode >>> 0) ?? [];
  }

  list(): MessageRegistryEntry[] {
    return [...this.byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  encodeByName(name: string, fields: Record<string, unknown>): Uint8Array {
    if (!CPP_PACKET_DEFINITIONS_BY_NAME.has(name)) {
      throw new Error(`Unknown packet name: ${name}`);
    }
    return encodeCppWirePacketByName(name, fields, this.codec);
  }

  decodeByName(name: string, data: Uint8Array): CppWirePacket {
    if (!CPP_PACKET_DEFINITIONS_BY_NAME.has(name)) {
      throw new Error(`Unknown packet name: ${name}`);
    }
    return decodeCppWirePacketByName(name, data, this.codec);
  }

  decodeByOpcode(data: Uint8Array, preferredName?: string): CppWirePacket {
    if (data.length < 6) {
      throw new Error('Message too short to decode opcode');
    }
    const opcode = (data[2] ?? 0) | ((data[3] ?? 0) << 8) | ((data[4] ?? 0) << 16) | ((data[5] ?? 0) << 24);
    const entries = this.getByOpcode(opcode >>> 0);
    if (entries.length === 0) {
      throw new Error(`No packet registered for opcode 0x${(opcode >>> 0).toString(16)}`);
    }
    if (entries.length === 1) {
      const single = entries[0];
      if (!single) {
        throw new Error(`No packet registered for opcode 0x${(opcode >>> 0).toString(16)}`);
      }
      return this.codec.decodeByDefinition(single.definition, data);
    }
    if (preferredName) {
      const match = entries.find((entry) => entry.name === preferredName);
      if (match) {
        return this.codec.decodeByDefinition(match.definition, data);
      }
    }
    throw new Error(
      `Opcode 0x${(opcode >>> 0).toString(16)} is ambiguous (${entries.map((entry) => entry.name).join(', ')})`
    );
  }
}

export const defaultMessageRegistry = new SwgMessageRegistry();
