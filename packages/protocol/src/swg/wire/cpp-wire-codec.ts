import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';
import {
  CPP_PACKET_DEFINITIONS,
  CPP_PACKET_DEFINITIONS_BY_NAME,
  type CppPacketDefinition,
  type CppPacketFieldDefinition,
} from '../messages/generated/cpp-packet-manifest.js';
import {
  readChatAvatarId,
  readChatRoomData,
  writeChatAvatarId,
  writeChatRoomData,
  type ChatAvatarId,
  type ChatRoomData,
} from '../messages/chat/chat-core.js';
import {
  readSuiPageData,
  writeSuiPageData,
  type SuiPageData,
} from '../messages/sui-messages.js';

export interface CppVector3 {
  x: number;
  y: number;
  z: number;
}

export interface CppQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface CppTransform {
  rotation: CppQuaternion;
  position: CppVector3;
}

export interface CppStringId {
  table: string;
  textIndex: number;
  text: string;
}

export interface CppPackedTransform {
  rotation: {
    w: number;
    x: number;
    y: number;
    z: number;
  };
  position: CppVector3;
}

export interface CppPackedVelocity {
  vx: number;
  vy: number;
  vz: number;
}

export type CppValueDictionaryType = 'bool' | 'float' | 'object id' | 'signed int' | 'string';

export interface CppValueDictionaryEntry {
  type: CppValueDictionaryType;
  value: boolean | number | bigint | string;
}

export interface CppProsePackageParticipant {
  id: bigint;
  stringId: CppStringId;
  str: string;
}

export interface CppProsePackage {
  stringId: CppStringId;
  actor: CppProsePackageParticipant;
  target: CppProsePackageParticipant;
  other: CppProsePackageParticipant;
  digitInteger: number;
  digitFloat: number;
  complexGrammar: boolean;
}

export interface CppGroupMemberParam {
  m_memberId: bigint;
  m_memberName: string;
  m_memberDifficulty: number;
  m_memberProfession: number;
  m_memberIsPC: boolean;
  m_memberShipId: bigint;
  m_memberShipIsPOB: boolean;
  m_memberOwnsPOB: boolean;
}

export interface CppNebulaLightningData {
  lightningId: number;
  nebulaId: number;
  syncStampStart: number;
  syncStampEnd: number;
  endpoint0: CppVector3;
  endpoint1: CppVector3;
}

export interface CppServerInfo {
  ipAddress: string;
  serverId: number;
  systemPid: number;
  sceneId: string;
}

export interface CppAuctionItemDataDetails {
  itemId: bigint;
  userDescription: string;
  propertyList: Array<[string, string]>;
  templateName: string;
  appearanceString: string;
}

export interface CppAuctionDataHeader {
  type: number;
  auctionId: bigint;
  itemId: bigint;
  itemNameLength: number;
  itemName: string;
  minBid: number;
  highBid: number;
  timer: number;
  buyNowPrice: number;
  location: string;
  ownerId: bigint;
  highBidderId: bigint;
  maxProxyBid: number;
  myBid: number;
  itemType: number;
  resourceContainerClassCrc: number;
  flags: number;
  entranceCharge: number;
}

export type CppAuctionDataVector = CppAuctionDataHeader[];

export interface CppPopulationEntry {
  scene: string;
  x: number;
  z: number;
  population: number;
}

export type CppPopulationList = CppPopulationEntry[];

export interface CppAvatarRecord {
  m_name: string;
  m_objectTemplateId: number;
  m_networkId: bigint;
  m_clusterId: number;
  m_characterType: number;
}

export type CppAvatarList = CppAvatarRecord[];

export interface CppWirePacket {
  name: string;
  opcode: number;
  operandCount: number;
  definition: CppPacketDefinition;
  fields: Record<string, unknown>;
}

export type CppCustomTypeCodec = {
  read: (reader: BufferReader) => unknown;
  write: (writer: BufferWriter, value: unknown, context: string) => void;
};

export interface CppWireCodecOptions {
  customTypeCodecs?: Record<string, CppCustomTypeCodec>;
  strictOperandCount?: boolean;
}

export class CppWireCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CppWireCodecError';
  }
}

const PACKED_POSITION_SCALE = 32767.0 / 8000.0;
const PACKED_POSITION_UNSCALE = 8000.0 / 32767.0;
const PACKED_VELOCITY_SCALE = 32767.0 / 512.0;
const PACKED_VELOCITY_UNSCALE = 512.0 / 32767.0;
const PI_OVER_2 = Math.PI / 2;
const PACKED_ROTATION_RATE_SCALE = 127.0 / PI_OVER_2;
const PACKED_ROTATION_RATE_UNSCALE = PI_OVER_2 / 127.0;

const PACKED_UNIT_VECTOR_X_SIGN_MASK = 0x8000;
const PACKED_UNIT_VECTOR_Y_SIGN_MASK = 0x4000;
const PACKED_UNIT_VECTOR_Z_SIGN_MASK = 0x2000;
const PACKED_UNIT_VECTOR_COMPONENT_MASK = 0x003f;
const PACKED_UNIT_VECTOR_COMPONENT_BITS = 6;

const INT8_TYPES = new Set([
  'char',
  'signed char',
  'int8',
]);
const UINT8_TYPES = new Set([
  'unsigned char',
  'uint8',
  'byte',
  'uchar',
]);
const INT16_TYPES = new Set([
  'short',
  'signed short',
  'signed short int',
  'int16',
]);
const UINT16_TYPES = new Set([
  'unsigned short',
  'unsigned short int',
  'uint16',
  'ushort',
]);
const INT32_TYPES = new Set([
  'int',
  'signed int',
  'long',
  'signed long',
  'signed long int',
  'int32',
]);
const UINT32_TYPES = new Set([
  'unsigned int',
  'unsigned long',
  'unsigned long int',
  'uint32',
  'stationid',
  'tag',
  'packedrgb',
  'unsigned',
]);
const INT64_TYPES = new Set([
  'int64',
  'long long',
  'signed long long',
  'signed long long int',
]);
const UINT64_TYPES = new Set([
  'uint64',
  'unsigned long long',
  'unsigned long long int',
  'networkid',
]);
const FLOAT_TYPES = new Set(['float', 'real']);
const DOUBLE_TYPES = new Set(['double']);

function clamp(min: number, value: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeCppType(rawType: string): string {
  return rawType
    .replace(/\bconst\b/g, '')
    .replace(/\s*&/g, '')
    .replace(/\s*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTopLevelTemplateArgs(typeString: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of typeString) {
    if (ch === '<') {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === '>') {
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

function parseTemplateType(normalizedCppType: string): {
  container: string;
  args: string[];
} | null {
  const open = normalizedCppType.indexOf('<');
  const close = normalizedCppType.lastIndexOf('>');
  if (open < 0 || close < 0 || close < open) {
    return null;
  }
  const container = normalizedCppType.slice(0, open).trim();
  const args = splitTopLevelTemplateArgs(normalizedCppType.slice(open + 1, close));
  return { container, args };
}

function parseOpcode(hex: string): number {
  return Number.parseInt(hex, 16) >>> 0;
}

function ensureNumber(value: unknown, context: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new CppWireCodecError(`${context}: expected number`);
  }
  return value;
}

function ensureBigInt(value: unknown, context: string): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return BigInt(value);
  }
  throw new CppWireCodecError(`${context}: expected bigint`);
}

function ensureString(value: unknown, context: string): string {
  if (typeof value !== 'string') {
    throw new CppWireCodecError(`${context}: expected string`);
  }
  return value;
}

function ensureBoolean(value: unknown, context: string): boolean {
  if (typeof value !== 'boolean') {
    throw new CppWireCodecError(`${context}: expected boolean`);
  }
  return value;
}

function ensureArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new CppWireCodecError(`${context}: expected array`);
  }
  return value;
}

function ensureObject(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CppWireCodecError(`${context}: expected object`);
  }
  return value as Record<string, unknown>;
}

function toUint8Array(value: unknown, context: string): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value.map((entry) => ensureNumber(entry, context)));
  }
  throw new CppWireCodecError(`${context}: expected Uint8Array`);
}

function readArchiveString(reader: BufferReader): string {
  const length16 = reader.readUInt16LE();
  let length = length16;
  if (length16 === 0xffff) {
    length = reader.readUInt32LE();
  }
  if (length === 0) {
    return '';
  }
  const bytes = reader.readBytes(length);
  return new TextDecoder('ascii').decode(bytes);
}

function writeArchiveString(writer: BufferWriter, value: string): void {
  const encoded = new TextEncoder().encode(value);
  if (encoded.length >= 0xffff) {
    writer.writeUInt16LE(0xffff);
    writer.writeUInt32LE(encoded.length);
  } else {
    writer.writeUInt16LE(encoded.length);
  }
  writer.writeBytes(encoded);
}

function readByteStream(reader: BufferReader): Uint8Array {
  const length = reader.readUInt32LE();
  if (length === 0) {
    return new Uint8Array(0);
  }
  return reader.readBytes(length);
}

function writeByteStream(writer: BufferWriter, value: unknown, context: string): void {
  const bytes = toUint8Array(value, context);
  writer.writeUInt32LE(bytes.length);
  writer.writeBytes(bytes);
}

function readVector3(reader: BufferReader): CppVector3 {
  return {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
  };
}

function writeVector3(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected vector object`);
  }
  const data = value as Partial<CppVector3>;
  writer.writeFloatLE(ensureNumber(data.x, `${context}.x`));
  writer.writeFloatLE(ensureNumber(data.y, `${context}.y`));
  writer.writeFloatLE(ensureNumber(data.z, `${context}.z`));
}

function readQuaternion(reader: BufferReader): CppQuaternion {
  return {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
    w: reader.readFloatLE(),
  };
}

function writeQuaternion(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected quaternion object`);
  }
  const data = value as Partial<CppQuaternion>;
  writer.writeFloatLE(ensureNumber(data.x, `${context}.x`));
  writer.writeFloatLE(ensureNumber(data.y, `${context}.y`));
  writer.writeFloatLE(ensureNumber(data.z, `${context}.z`));
  writer.writeFloatLE(ensureNumber(data.w, `${context}.w`));
}

function readTransform(reader: BufferReader): CppTransform {
  return {
    rotation: readQuaternion(reader),
    position: readVector3(reader),
  };
}

function writeTransform(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected transform object`);
  }
  const data = value as Partial<CppTransform>;
  writeQuaternion(writer, data.rotation, `${context}.rotation`);
  writeVector3(writer, data.position, `${context}.position`);
}

function readStringId(reader: BufferReader): CppStringId {
  return {
    table: readArchiveString(reader),
    textIndex: reader.readUInt32LE(),
    text: readArchiveString(reader),
  };
}

function writeStringId(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected StringId object`);
  }
  const data = value as Partial<CppStringId>;
  writeArchiveString(writer, ensureString(data.table, `${context}.table`));
  writer.writeUInt32LE(ensureNumber(data.textIndex, `${context}.textIndex`));
  writeArchiveString(writer, ensureString(data.text, `${context}.text`));
}

function readPackedPosition(reader: BufferReader): CppVector3 {
  const px = reader.readInt16LE();
  const py = reader.readInt16LE();
  const pz = reader.readInt16LE();
  return {
    x: px * PACKED_POSITION_UNSCALE,
    y: py * PACKED_POSITION_UNSCALE,
    z: pz * PACKED_POSITION_UNSCALE,
  };
}

function writePackedPosition(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected packed position object`);
  }
  const data = value as Partial<CppVector3>;
  writer.writeInt16LE(
    Math.round(clamp(-8000, ensureNumber(data.x, `${context}.x`), 8000) * PACKED_POSITION_SCALE)
  );
  writer.writeInt16LE(
    Math.round(clamp(-8000, ensureNumber(data.y, `${context}.y`), 8000) * PACKED_POSITION_SCALE)
  );
  writer.writeInt16LE(
    Math.round(clamp(-8000, ensureNumber(data.z, `${context}.z`), 8000) * PACKED_POSITION_SCALE)
  );
}

function readPackedUnitVector(reader: BufferReader): CppVector3 {
  const value = reader.readUInt16LE();
  let x = (value >> PACKED_UNIT_VECTOR_COMPONENT_BITS) & PACKED_UNIT_VECTOR_COMPONENT_MASK;
  let y = value & PACKED_UNIT_VECTOR_COMPONENT_MASK;
  let z = PACKED_UNIT_VECTOR_COMPONENT_MASK - x - y;
  if (value & PACKED_UNIT_VECTOR_X_SIGN_MASK) x = -x;
  if (value & PACKED_UNIT_VECTOR_Y_SIGN_MASK) y = -y;
  if (value & PACKED_UNIT_VECTOR_Z_SIGN_MASK) z = -z;
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  if (magnitude === 0) {
    return { x: 0, y: 0, z: 1 };
  }
  return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}

function writePackedUnitVector(writer: BufferWriter, vector: CppVector3): void {
  let value = 0;
  let x = vector.x;
  let y = vector.y;
  let z = vector.z;
  if (x < 0) {
    x = -x;
    value |= PACKED_UNIT_VECTOR_X_SIGN_MASK;
  }
  if (y < 0) {
    y = -y;
    value |= PACKED_UNIT_VECTOR_Y_SIGN_MASK;
  }
  if (z < 0) {
    z = -z;
    value |= PACKED_UNIT_VECTOR_Z_SIGN_MASK;
  }
  const sum = x + y + z;
  const weight = sum > 0 ? (PACKED_UNIT_VECTOR_COMPONENT_MASK - 1) / sum : 0;
  value |=
    (Math.floor(x * weight) & PACKED_UNIT_VECTOR_COMPONENT_MASK) << PACKED_UNIT_VECTOR_COMPONENT_BITS;
  value |= Math.floor(y * weight) & PACKED_UNIT_VECTOR_COMPONENT_MASK;
  writer.writeUInt16LE(value);
}

function readPackedVelocity(reader: BufferReader): CppPackedVelocity {
  const speed = reader.readInt16LE();
  const direction = readPackedUnitVector(reader);
  const scaled = speed * PACKED_VELOCITY_UNSCALE;
  return {
    vx: direction.x * scaled,
    vy: direction.y * scaled,
    vz: direction.z * scaled,
  };
}

function writePackedVelocity(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected packed velocity object`);
  }
  const data = value as Partial<CppPackedVelocity>;
  const vx = ensureNumber(data.vx, `${context}.vx`);
  const vy = ensureNumber(data.vy, `${context}.vy`);
  const vz = ensureNumber(data.vz, `${context}.vz`);
  const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const speed = Math.round(clamp(-512, magnitude, 512) * PACKED_VELOCITY_SCALE);
  writer.writeInt16LE(speed);
  if (magnitude > 0) {
    writePackedUnitVector(writer, {
      x: vx / magnitude,
      y: vy / magnitude,
      z: vz / magnitude,
    });
  } else {
    writePackedUnitVector(writer, { x: 0, y: 0, z: 1 });
  }
}

function readPackedRotationRate(reader: BufferReader): number {
  return reader.readInt8() * PACKED_ROTATION_RATE_UNSCALE;
}

function writePackedRotationRate(writer: BufferWriter, value: unknown, context: string): void {
  const rate = ensureNumber(value, context);
  writer.writeInt8(Math.round(clamp(-PI_OVER_2, rate, PI_OVER_2) * PACKED_ROTATION_RATE_SCALE));
}

function readPackedTransform(reader: BufferReader): CppPackedTransform {
  const qw = reader.readInt8() / 127.0;
  const qx = reader.readInt8() / 127.0;
  const qy = reader.readInt8() / 127.0;
  const qz = reader.readInt8() / 127.0;
  const position = readPackedPosition(reader);
  return {
    rotation: {
      w: qw,
      x: qx,
      y: qy,
      z: qz,
    },
    position,
  };
}

function writePackedTransform(writer: BufferWriter, value: unknown, context: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new CppWireCodecError(`${context}: expected packed transform object`);
  }
  const data = value as Partial<CppPackedTransform>;
  if (typeof data.rotation !== 'object' || data.rotation === null) {
    throw new CppWireCodecError(`${context}.rotation: expected object`);
  }
  writer.writeInt8(Math.round(clamp(-1, ensureNumber(data.rotation.w, `${context}.rotation.w`), 1) * 127.0));
  writer.writeInt8(Math.round(clamp(-1, ensureNumber(data.rotation.x, `${context}.rotation.x`), 1) * 127.0));
  writer.writeInt8(Math.round(clamp(-1, ensureNumber(data.rotation.y, `${context}.rotation.y`), 1) * 127.0));
  writer.writeInt8(Math.round(clamp(-1, ensureNumber(data.rotation.z, `${context}.rotation.z`), 1) * 127.0));
  writePackedPosition(writer, data.position, `${context}.position`);
}

function readKeyShareKey(reader: BufferReader): Uint8Array {
  return reader.readBytes(16);
}

function writeKeyShareKey(writer: BufferWriter, value: unknown, context: string): void {
  if (!(value instanceof Uint8Array) || value.length !== 16) {
    throw new CppWireCodecError(`${context}: expected Uint8Array(16)`);
  }
  writer.writeBytes(value);
}

function readTag(reader: BufferReader): number {
  return reader.readUInt32LE();
}

function writeTag(writer: BufferWriter, value: unknown, context: string): void {
  writer.writeUInt32LE(ensureNumber(value, context));
}

function readRawTail(reader: BufferReader): Uint8Array {
  return reader.readRemaining();
}

function writeRawTail(writer: BufferWriter, value: unknown, context: string): void {
  writer.writeBytes(toUint8Array(value, context));
}

const VALUE_DICTIONARY_TYPES = new Set<CppValueDictionaryType>([
  'bool',
  'float',
  'object id',
  'signed int',
  'string',
]);

function readValueDictionary(reader: BufferReader): Map<string, CppValueDictionaryEntry> {
  const count = reader.readInt32LE();
  const result = new Map<string, CppValueDictionaryEntry>();
  for (let i = 0; i < count; i += 1) {
    const name = readArchiveString(reader);
    const type = readArchiveString(reader) as CppValueDictionaryType;
    if (!VALUE_DICTIONARY_TYPES.has(type)) {
      throw new CppWireCodecError(`ValueDictionary[${name}]: unsupported type "${type}"`);
    }

    if (type === 'bool') {
      result.set(name, { type, value: reader.readUInt8() !== 0 });
      continue;
    }
    if (type === 'float') {
      result.set(name, { type, value: reader.readFloatLE() });
      continue;
    }
    if (type === 'object id') {
      result.set(name, { type, value: reader.readUInt64LE() });
      continue;
    }
    if (type === 'signed int') {
      result.set(name, { type, value: reader.readInt32LE() });
      continue;
    }

    result.set(name, { type, value: readArchiveString(reader) });
  }
  return result;
}

function normalizeValueDictionaryEntry(
  rawEntry: unknown,
  context: string
): CppValueDictionaryEntry {
  if (typeof rawEntry === 'boolean') {
    return { type: 'bool', value: rawEntry };
  }
  if (typeof rawEntry === 'bigint') {
    return { type: 'object id', value: rawEntry };
  }
  if (typeof rawEntry === 'string') {
    return { type: 'string', value: rawEntry };
  }
  if (typeof rawEntry === 'number') {
    return {
      type: Number.isInteger(rawEntry) ? 'signed int' : 'float',
      value: rawEntry,
    };
  }

  const entry = ensureObject(rawEntry, context);
  const type = ensureString(entry['type'], `${context}.type`) as CppValueDictionaryType;
  if (!VALUE_DICTIONARY_TYPES.has(type)) {
    throw new CppWireCodecError(`${context}.type: unsupported type "${type}"`);
  }
  const value = entry['value'];

  if (type === 'bool') {
    return { type, value: ensureBoolean(value, `${context}.value`) };
  }
  if (type === 'float') {
    return { type, value: ensureNumber(value, `${context}.value`) };
  }
  if (type === 'object id') {
    return { type, value: ensureBigInt(value, `${context}.value`) };
  }
  if (type === 'signed int') {
    const numberValue = ensureNumber(value, `${context}.value`);
    if (!Number.isInteger(numberValue)) {
      throw new CppWireCodecError(`${context}.value: expected integer`);
    }
    return { type, value: numberValue };
  }
  return { type, value: ensureString(value, `${context}.value`) };
}

function normalizeValueDictionaryEntries(
  value: unknown,
  context: string
): Array<[string, CppValueDictionaryEntry]> {
  const entries: Array<[string, unknown]> =
    value instanceof Map
      ? [...value.entries()] as Array<[string, unknown]>
      : Array.isArray(value)
        ? value as Array<[string, unknown]>
        : Object.entries(ensureObject(value, context));

  const normalized: Array<[string, CppValueDictionaryEntry]> = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new CppWireCodecError(`${context}[${i}]: expected [name, value] tuple`);
    }
    const name = ensureString(entry[0], `${context}[${i}][0]`);
    const dictEntry = normalizeValueDictionaryEntry(entry[1], `${context}.${name}`);
    normalized.push([name, dictEntry]);
  }

  // std::map iteration order is lexicographical by key in C++.
  normalized.sort((lhs, rhs) => {
    if (lhs[0] < rhs[0]) return -1;
    if (lhs[0] > rhs[0]) return 1;
    return 0;
  });
  return normalized;
}

function writeValueDictionary(writer: BufferWriter, value: unknown, context: string): void {
  const entries = normalizeValueDictionaryEntries(value, context);
  writer.writeInt32LE(entries.length);
  for (let i = 0; i < entries.length; i += 1) {
    const [name, entry] = entries[i] as [string, CppValueDictionaryEntry];
    writeArchiveString(writer, name);
    writeArchiveString(writer, entry.type);
    if (entry.type === 'bool') {
      writer.writeUInt8(ensureBoolean(entry.value, `${context}.${name}.value`) ? 1 : 0);
      continue;
    }
    if (entry.type === 'float') {
      writer.writeFloatLE(ensureNumber(entry.value, `${context}.${name}.value`));
      continue;
    }
    if (entry.type === 'object id') {
      writer.writeUInt64LE(ensureBigInt(entry.value, `${context}.${name}.value`));
      continue;
    }
    if (entry.type === 'signed int') {
      const intValue = ensureNumber(entry.value, `${context}.${name}.value`);
      if (!Number.isInteger(intValue)) {
        throw new CppWireCodecError(`${context}.${name}.value: expected integer`);
      }
      writer.writeInt32LE(intValue);
      continue;
    }
    writeArchiveString(writer, ensureString(entry.value, `${context}.${name}.value`));
  }
}

function readProsePackageParticipant(reader: BufferReader): CppProsePackageParticipant {
  return {
    id: reader.readUInt64LE(),
    stringId: readStringId(reader),
    str: reader.readUnicodeStringWithLength(),
  };
}

function writeProsePackageParticipant(
  writer: BufferWriter,
  value: unknown,
  context: string
): void {
  const participant = ensureObject(value, context) as Partial<CppProsePackageParticipant>;
  writer.writeUInt64LE(ensureBigInt(participant.id, `${context}.id`));
  writeStringId(writer, participant.stringId, `${context}.stringId`);
  writer.writeUnicodeStringWithLength(ensureString(participant.str, `${context}.str`));
}

function readProsePackage(reader: BufferReader): CppProsePackage {
  return {
    stringId: readStringId(reader),
    actor: readProsePackageParticipant(reader),
    target: readProsePackageParticipant(reader),
    other: readProsePackageParticipant(reader),
    digitInteger: reader.readInt32LE(),
    digitFloat: reader.readFloatLE(),
    complexGrammar: reader.readUInt8() !== 0,
  };
}

function writeProsePackage(writer: BufferWriter, value: unknown, context: string): void {
  const prosePackage = ensureObject(value, context) as Partial<CppProsePackage>;
  writeStringId(writer, prosePackage.stringId, `${context}.stringId`);
  writeProsePackageParticipant(writer, prosePackage.actor, `${context}.actor`);
  writeProsePackageParticipant(writer, prosePackage.target, `${context}.target`);
  writeProsePackageParticipant(writer, prosePackage.other, `${context}.other`);
  writer.writeInt32LE(ensureNumber(prosePackage.digitInteger, `${context}.digitInteger`));
  writer.writeFloatLE(ensureNumber(prosePackage.digitFloat, `${context}.digitFloat`));
  writer.writeUInt8(ensureBoolean(prosePackage.complexGrammar, `${context}.complexGrammar`) ? 1 : 0);
}

function readGroupMemberParam(reader: BufferReader): CppGroupMemberParam {
  return {
    m_memberId: reader.readUInt64LE(),
    m_memberName: readArchiveString(reader),
    m_memberDifficulty: reader.readInt32LE(),
    m_memberProfession: reader.readUInt8(),
    m_memberIsPC: reader.readUInt8() !== 0,
    m_memberShipId: reader.readUInt64LE(),
    m_memberShipIsPOB: reader.readUInt8() !== 0,
    m_memberOwnsPOB: reader.readUInt8() !== 0,
  };
}

function writeGroupMemberParam(writer: BufferWriter, value: unknown, context: string): void {
  const groupMember = ensureObject(value, context) as Partial<CppGroupMemberParam>;
  writer.writeUInt64LE(ensureBigInt(groupMember.m_memberId, `${context}.m_memberId`));
  writeArchiveString(writer, ensureString(groupMember.m_memberName, `${context}.m_memberName`));
  writer.writeInt32LE(ensureNumber(groupMember.m_memberDifficulty, `${context}.m_memberDifficulty`));
  writer.writeUInt8(ensureNumber(groupMember.m_memberProfession, `${context}.m_memberProfession`));
  writer.writeUInt8(ensureBoolean(groupMember.m_memberIsPC, `${context}.m_memberIsPC`) ? 1 : 0);
  writer.writeUInt64LE(ensureBigInt(groupMember.m_memberShipId, `${context}.m_memberShipId`));
  writer.writeUInt8(ensureBoolean(groupMember.m_memberShipIsPOB, `${context}.m_memberShipIsPOB`) ? 1 : 0);
  writer.writeUInt8(ensureBoolean(groupMember.m_memberOwnsPOB, `${context}.m_memberOwnsPOB`) ? 1 : 0);
}

function readNebulaLightningData(reader: BufferReader): CppNebulaLightningData {
  return {
    lightningId: reader.readUInt16LE(),
    nebulaId: reader.readInt32LE(),
    syncStampStart: reader.readUInt32LE(),
    syncStampEnd: reader.readUInt32LE(),
    endpoint0: readVector3(reader),
    endpoint1: readVector3(reader),
  };
}

function writeNebulaLightningData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppNebulaLightningData>;
  writer.writeUInt16LE(ensureNumber(data.lightningId, `${context}.lightningId`));
  writer.writeInt32LE(ensureNumber(data.nebulaId, `${context}.nebulaId`));
  writer.writeUInt32LE(ensureNumber(data.syncStampStart, `${context}.syncStampStart`));
  writer.writeUInt32LE(ensureNumber(data.syncStampEnd, `${context}.syncStampEnd`));
  writeVector3(writer, data.endpoint0, `${context}.endpoint0`);
  writeVector3(writer, data.endpoint1, `${context}.endpoint1`);
}

function readServerInfo(reader: BufferReader): CppServerInfo {
  return {
    ipAddress: readArchiveString(reader),
    serverId: reader.readUInt32LE(),
    systemPid: reader.readUInt32LE(),
    sceneId: readArchiveString(reader),
  };
}

function writeServerInfo(writer: BufferWriter, value: unknown, context: string): void {
  const serverInfo = ensureObject(value, context) as Partial<CppServerInfo>;
  writeArchiveString(writer, ensureString(serverInfo.ipAddress, `${context}.ipAddress`));
  writer.writeUInt32LE(ensureNumber(serverInfo.serverId, `${context}.serverId`));
  writer.writeUInt32LE(ensureNumber(serverInfo.systemPid, `${context}.systemPid`));
  writeArchiveString(writer, ensureString(serverInfo.sceneId, `${context}.sceneId`));
}

function readAuctionItemDataDetails(reader: BufferReader): CppAuctionItemDataDetails {
  const itemId = reader.readUInt64LE();
  const userDescription = reader.readUnicodeStringWithLength();
  const propertyCount = reader.readInt32LE();
  const propertyList: Array<[string, string]> = [];
  for (let i = 0; i < propertyCount; i += 1) {
    propertyList.push([
      readArchiveString(reader),
      reader.readUnicodeStringWithLength(),
    ]);
  }
  return {
    itemId,
    userDescription,
    propertyList,
    templateName: readArchiveString(reader),
    appearanceString: readArchiveString(reader),
  };
}

function writeAuctionItemDataDetails(writer: BufferWriter, value: unknown, context: string): void {
  const details = ensureObject(value, context) as Partial<CppAuctionItemDataDetails>;
  writer.writeUInt64LE(ensureBigInt(details.itemId, `${context}.itemId`));
  writer.writeUnicodeStringWithLength(ensureString(details.userDescription, `${context}.userDescription`));

  const properties = ensureArray(details.propertyList, `${context}.propertyList`);
  writer.writeInt32LE(properties.length);
  for (let i = 0; i < properties.length; i += 1) {
    const tuple = ensureArray(properties[i], `${context}.propertyList[${i}]`);
    if (tuple.length !== 2) {
      throw new CppWireCodecError(`${context}.propertyList[${i}]: expected pair tuple length 2`);
    }
    writeArchiveString(writer, ensureString(tuple[0], `${context}.propertyList[${i}][0]`));
    writer.writeUnicodeStringWithLength(
      ensureString(tuple[1], `${context}.propertyList[${i}][1]`)
    );
  }

  writeArchiveString(writer, ensureString(details.templateName, `${context}.templateName`));
  writeArchiveString(writer, ensureString(details.appearanceString, `${context}.appearanceString`));
}

function readAuctionDataHeader(reader: BufferReader): CppAuctionDataHeader {
  return {
    type: reader.readInt32LE(),
    auctionId: reader.readUInt64LE(),
    itemId: reader.readUInt64LE(),
    itemNameLength: reader.readInt32LE(),
    itemName: reader.readUnicodeStringWithLength(),
    minBid: reader.readInt32LE(),
    highBid: reader.readInt32LE(),
    timer: reader.readInt32LE(),
    buyNowPrice: reader.readInt32LE(),
    location: readArchiveString(reader),
    ownerId: reader.readUInt64LE(),
    highBidderId: reader.readUInt64LE(),
    maxProxyBid: reader.readInt32LE(),
    myBid: reader.readInt32LE(),
    itemType: reader.readInt32LE(),
    resourceContainerClassCrc: reader.readInt32LE(),
    flags: reader.readInt32LE(),
    entranceCharge: reader.readInt32LE(),
  };
}

function writeAuctionDataHeader(writer: BufferWriter, value: unknown, context: string): void {
  const header = ensureObject(value, context) as Partial<CppAuctionDataHeader>;
  writer.writeInt32LE(ensureNumber(header.type, `${context}.type`));
  writer.writeUInt64LE(ensureBigInt(header.auctionId, `${context}.auctionId`));
  writer.writeUInt64LE(ensureBigInt(header.itemId, `${context}.itemId`));
  writer.writeInt32LE(ensureNumber(header.itemNameLength, `${context}.itemNameLength`));
  writer.writeUnicodeStringWithLength(ensureString(header.itemName, `${context}.itemName`));
  writer.writeInt32LE(ensureNumber(header.minBid, `${context}.minBid`));
  writer.writeInt32LE(ensureNumber(header.highBid, `${context}.highBid`));
  writer.writeInt32LE(ensureNumber(header.timer, `${context}.timer`));
  writer.writeInt32LE(ensureNumber(header.buyNowPrice, `${context}.buyNowPrice`));
  writeArchiveString(writer, ensureString(header.location, `${context}.location`));
  writer.writeUInt64LE(ensureBigInt(header.ownerId, `${context}.ownerId`));
  writer.writeUInt64LE(ensureBigInt(header.highBidderId, `${context}.highBidderId`));
  writer.writeInt32LE(ensureNumber(header.maxProxyBid, `${context}.maxProxyBid`));
  writer.writeInt32LE(ensureNumber(header.myBid, `${context}.myBid`));
  writer.writeInt32LE(ensureNumber(header.itemType, `${context}.itemType`));
  writer.writeInt32LE(
    ensureNumber(header.resourceContainerClassCrc, `${context}.resourceContainerClassCrc`)
  );
  writer.writeInt32LE(ensureNumber(header.flags, `${context}.flags`));
  writer.writeInt32LE(ensureNumber(header.entranceCharge, `${context}.entranceCharge`));
}

function readAuctionDataVector(reader: BufferReader): CppAuctionDataVector {
  const count = reader.readInt32LE();
  const result: CppAuctionDataHeader[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(readAuctionDataHeader(reader));
  }
  return result;
}

function writeAuctionDataVector(writer: BufferWriter, value: unknown, context: string): void {
  const values = ensureArray(value, context);
  writer.writeInt32LE(values.length);
  for (let i = 0; i < values.length; i += 1) {
    writeAuctionDataHeader(writer, values[i], `${context}[${i}]`);
  }
}

function readPopulationList(reader: BufferReader): CppPopulationList {
  const count = reader.readUInt32LE();
  const result: CppPopulationEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push({
      scene: readArchiveString(reader),
      x: reader.readInt32LE(),
      z: reader.readInt32LE(),
      population: reader.readInt32LE(),
    });
  }
  return result;
}

function writePopulationList(writer: BufferWriter, value: unknown, context: string): void {
  const entriesRaw = ensureArray(value, context);
  const entries: CppPopulationEntry[] = entriesRaw.map((entry, index) => {
    const obj = ensureObject(entry, `${context}[${index}]`);
    return {
      scene: ensureString(obj['scene'], `${context}[${index}].scene`),
      x: ensureNumber(obj['x'], `${context}[${index}].x`),
      z: ensureNumber(obj['z'], `${context}[${index}].z`),
      population: ensureNumber(obj['population'], `${context}[${index}].population`),
    };
  });

  // PopulationList uses std::map<Location, int> where key ordering is z, then x, then scene.
  entries.sort((lhs, rhs) => {
    if (lhs.z !== rhs.z) {
      return lhs.z - rhs.z;
    }
    if (lhs.x !== rhs.x) {
      return lhs.x - rhs.x;
    }
    if (lhs.scene < rhs.scene) return -1;
    if (lhs.scene > rhs.scene) return 1;
    return 0;
  });

  writer.writeUInt32LE(entries.length);
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i] as CppPopulationEntry;
    writeArchiveString(writer, entry.scene);
    writer.writeInt32LE(entry.x);
    writer.writeInt32LE(entry.z);
    writer.writeInt32LE(entry.population);
  }
}

function readAvatarRecord(reader: BufferReader): CppAvatarRecord {
  return {
    m_name: reader.readUnicodeStringWithLength(),
    m_objectTemplateId: reader.readInt32LE(),
    m_networkId: reader.readUInt64LE(),
    m_clusterId: reader.readUInt32LE(),
    m_characterType: reader.readInt32LE(),
  };
}

function writeAvatarRecord(writer: BufferWriter, value: unknown, context: string): void {
  const record = ensureObject(value, context) as Partial<CppAvatarRecord>;
  writer.writeUnicodeStringWithLength(ensureString(record.m_name, `${context}.m_name`));
  writer.writeInt32LE(ensureNumber(record.m_objectTemplateId, `${context}.m_objectTemplateId`));
  writer.writeUInt64LE(ensureBigInt(record.m_networkId, `${context}.m_networkId`));
  writer.writeUInt32LE(ensureNumber(record.m_clusterId, `${context}.m_clusterId`));
  writer.writeInt32LE(ensureNumber(record.m_characterType, `${context}.m_characterType`));
}

function readAvatarList(reader: BufferReader): CppAvatarList {
  const count = reader.readInt32LE();
  const result: CppAvatarRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(readAvatarRecord(reader));
  }
  return result;
}

function writeAvatarList(writer: BufferWriter, value: unknown, context: string): void {
  const values = ensureArray(value, context);
  writer.writeInt32LE(values.length);
  for (let i = 0; i < values.length; i += 1) {
    writeAvatarRecord(writer, values[i], `${context}[${i}]`);
  }
}

function createBuiltinCustomTypeCodecs(): Record<string, CppCustomTypeCodec> {
  return {
    Vector: {
      read: readVector3,
      write: writeVector3,
    },
    Quaternion: {
      read: readQuaternion,
      write: writeQuaternion,
    },
    Transform: {
      read: readTransform,
      write: writeTransform,
    },
    StringId: {
      read: readStringId,
      write: writeStringId,
    },
    ChatAvatarId: {
      read: readChatAvatarId,
      write: (writer, value, context) => {
        if (typeof value !== 'object' || value === null) {
          throw new CppWireCodecError(`${context}: expected ChatAvatarId object`);
        }
        writeChatAvatarId(writer, value as ChatAvatarId);
      },
    },
    ChatRoomData: {
      read: readChatRoomData,
      write: (writer, value, context) => {
        if (typeof value !== 'object' || value === null) {
          throw new CppWireCodecError(`${context}: expected ChatRoomData object`);
        }
        writeChatRoomData(writer, value as ChatRoomData);
      },
    },
    SuiPageData: {
      read: readSuiPageData,
      write: (writer, value, context) => {
        if (typeof value !== 'object' || value === null) {
          throw new CppWireCodecError(`${context}: expected SuiPageData object`);
        }
        writeSuiPageData(writer, value as SuiPageData);
      },
    },
    PackedPosition: {
      read: readPackedPosition,
      write: writePackedPosition,
    },
    PackedVelocity: {
      read: readPackedVelocity,
      write: writePackedVelocity,
    },
    PackedRotationRate: {
      read: readPackedRotationRate,
      write: writePackedRotationRate,
    },
    PackedTransform: {
      read: readPackedTransform,
      write: writePackedTransform,
    },
    'KeyShare::Key': {
      read: readKeyShareKey,
      write: writeKeyShareKey,
    },
    Tag: {
      read: readTag,
      write: writeTag,
    },
    ValueDictionary: {
      read: readValueDictionary,
      write: writeValueDictionary,
    },
    ProsePackage: {
      read: readProsePackage,
      write: writeProsePackage,
    },
    GroupMemberParam: {
      read: readGroupMemberParam,
      write: writeGroupMemberParam,
    },
    NebulaLightningData: {
      read: readNebulaLightningData,
      write: writeNebulaLightningData,
    },
    ServerInfo: {
      read: readServerInfo,
      write: writeServerInfo,
    },
    'Auction::ItemDataDetails': {
      read: readAuctionItemDataDetails,
      write: writeAuctionItemDataDetails,
    },
    ADV: {
      read: readAuctionDataVector,
      write: writeAuctionDataVector,
    },
    PopulationList: {
      read: readPopulationList,
      write: writePopulationList,
    },
    AvatarList: {
      read: readAvatarList,
      write: writeAvatarList,
    },
    ValueType: {
      read: readRawTail,
      write: writeRawTail,
    },
  };
}

function getExtensionCodec(
  normalizedType: string,
  customTypeCodecs: Record<string, CppCustomTypeCodec>
): CppCustomTypeCodec | null {
  const direct = customTypeCodecs[normalizedType];
  if (direct) {
    return direct;
  }
  const alias = customTypeCodecs[normalizedType.replace(/^Archive::/, '')];
  return alias ?? null;
}

export class CppWireCodec {
  private readonly customTypeCodecs: Record<string, CppCustomTypeCodec>;
  private readonly strictOperandCount: boolean;

  constructor(options: CppWireCodecOptions = {}) {
    this.customTypeCodecs = {
      ...createBuiltinCustomTypeCodecs(),
      ...(options.customTypeCodecs ?? {}),
    };
    this.strictOperandCount = options.strictOperandCount ?? true;
  }

  encodeByName(packetName: string, fields: Record<string, unknown>): Uint8Array {
    const definition = CPP_PACKET_DEFINITIONS_BY_NAME.get(packetName);
    if (!definition) {
      throw new CppWireCodecError(`Unknown packet definition "${packetName}"`);
    }
    return this.encodeByDefinition(definition, fields);
  }

  encodeByDefinition(
    definition: CppPacketDefinition,
    fields: Record<string, unknown>
  ): Uint8Array {
    const writer = new BufferWriter();
    const operandCount = definition.fields.length + 1;
    writer.writeUInt16LE(operandCount);
    writer.writeUInt32LE(parseOpcode(definition.swgCrc32));

    for (const field of definition.fields) {
      const value = fields[field.name];
      this.writeFieldValue(writer, field, value, `${definition.name}.${field.name}`);
    }

    return writer.toBuffer();
  }

  decodeByName(packetName: string, data: Uint8Array): CppWirePacket {
    const definition = CPP_PACKET_DEFINITIONS_BY_NAME.get(packetName);
    if (!definition) {
      throw new CppWireCodecError(`Unknown packet definition "${packetName}"`);
    }
    return this.decodeByDefinition(definition, data);
  }

  decodeByOpcode(data: Uint8Array): CppWirePacket {
    const reader = new BufferReader(data);
    const operandCount = reader.readUInt16LE();
    const opcode = reader.readUInt32LE();
    const candidates = CPP_PACKET_DEFINITIONS_BY_OPCODE.get(opcode);
    if (!candidates || candidates.length === 0) {
      throw new CppWireCodecError(`No packet definition for opcode 0x${opcode.toString(16)}`);
    }
    if (candidates.length > 1) {
      throw new CppWireCodecError(
        `Ambiguous opcode 0x${opcode.toString(16)} maps to: ${candidates.map((c) => c.name).join(', ')}`
      );
    }
    const definition = candidates[0];
    if (!definition) {
      throw new CppWireCodecError(`No packet definition for opcode 0x${opcode.toString(16)}`);
    }
    reader.setPosition(0);
    const packet = this.decodeByDefinition(definition, data);
    if (this.strictOperandCount && packet.operandCount !== definition.fields.length + 1) {
      throw new CppWireCodecError(
        `${definition.name}: operandCount mismatch (got ${packet.operandCount}, expected ${definition.fields.length + 1})`
      );
    }
    if (this.strictOperandCount && packet.operandCount !== operandCount) {
      throw new CppWireCodecError(
        `${definition.name}: operandCount parse mismatch (got ${packet.operandCount}, expected ${operandCount})`
      );
    }
    return packet;
  }

  decodeByDefinition(definition: CppPacketDefinition, data: Uint8Array): CppWirePacket {
    const reader = new BufferReader(data);
    const operandCount = reader.readUInt16LE();
    const opcode = reader.readUInt32LE();
    const expectedOpcode = parseOpcode(definition.swgCrc32);
    if (opcode !== expectedOpcode) {
      throw new CppWireCodecError(
        `${definition.name}: opcode mismatch (got 0x${opcode.toString(16)}, expected 0x${expectedOpcode.toString(16)})`
      );
    }

    const fields: Record<string, unknown> = {};
    for (const field of definition.fields) {
      fields[field.name] = this.readFieldValue(reader, field, `${definition.name}.${field.name}`);
    }

    return {
      name: definition.name,
      opcode,
      operandCount,
      definition,
      fields,
    };
  }

  private readFieldValue(
    reader: BufferReader,
    field: CppPacketFieldDefinition,
    context: string
  ): unknown {
    const container = field.archiveContainer;
    if (container === 'AutoVariable' || container === 'AutoDeltaVariable') {
      return this.readValue(reader, field.cppType, context);
    }
    if (
      container === 'AutoArray' ||
      container === 'AutoList' ||
      container === 'AutoSet' ||
      container === 'AutoDeltaVector' ||
      container === 'AutoDeltaSet' ||
      container === 'AutoDeltaQueue'
    ) {
      return this.readSequentialContainer(reader, field.cppType, context);
    }
    if (
      container === 'AutoMap' ||
      container === 'AutoDeltaMap' ||
      container === 'AutoDeltaPackedMap'
    ) {
      return this.readMapContainer(reader, field.cppType, context);
    }
    if (container === 'AutoByteStream' || container === 'AutoDeltaByteStream') {
      return readByteStream(reader);
    }
    if (container === 'AutoVariableKeyShare') {
      return readKeyShareKey(reader);
    }
    throw new CppWireCodecError(`${context}: unsupported archive container ${container}`);
  }

  private writeFieldValue(
    writer: BufferWriter,
    field: CppPacketFieldDefinition,
    value: unknown,
    context: string
  ): void {
    const container = field.archiveContainer;
    if (container === 'AutoVariable' || container === 'AutoDeltaVariable') {
      this.writeValue(writer, field.cppType, value, context);
      return;
    }
    if (
      container === 'AutoArray' ||
      container === 'AutoList' ||
      container === 'AutoSet' ||
      container === 'AutoDeltaVector' ||
      container === 'AutoDeltaSet' ||
      container === 'AutoDeltaQueue'
    ) {
      this.writeSequentialContainer(writer, field.cppType, value, context);
      return;
    }
    if (
      container === 'AutoMap' ||
      container === 'AutoDeltaMap' ||
      container === 'AutoDeltaPackedMap'
    ) {
      this.writeMapContainer(writer, field.cppType, value, context);
      return;
    }
    if (container === 'AutoByteStream' || container === 'AutoDeltaByteStream') {
      writeByteStream(writer, value, context);
      return;
    }
    if (container === 'AutoVariableKeyShare') {
      writeKeyShareKey(writer, value, context);
      return;
    }
    throw new CppWireCodecError(`${context}: unsupported archive container ${container}`);
  }

  private readSequentialContainer(reader: BufferReader, cppTypeRaw: string, context: string): unknown {
    const count = reader.readInt32LE();
    if (count <= 0) {
      return [];
    }

    const normalizedType = normalizeCppType(cppTypeRaw);
    if (UINT8_TYPES.has(normalizedType.toLowerCase())) {
      return reader.readBytes(count);
    }

    const values: unknown[] = [];
    for (let i = 0; i < count; i += 1) {
      values.push(this.readValue(reader, cppTypeRaw, `${context}[${i}]`));
    }
    return values;
  }

  private writeSequentialContainer(
    writer: BufferWriter,
    cppTypeRaw: string,
    value: unknown,
    context: string
  ): void {
    const normalizedType = normalizeCppType(cppTypeRaw);
    if (UINT8_TYPES.has(normalizedType.toLowerCase()) && value instanceof Uint8Array) {
      writer.writeInt32LE(value.length);
      writer.writeBytes(value);
      return;
    }

    const values = ensureArray(value, context);
    writer.writeInt32LE(values.length);
    for (let i = 0; i < values.length; i += 1) {
      this.writeValue(writer, cppTypeRaw, values[i], `${context}[${i}]`);
    }
  }

  private readMapContainer(reader: BufferReader, cppTypeRaw: string, context: string): Map<unknown, unknown> {
    const count = reader.readInt32LE();
    const parsed = parseTemplateType(normalizeCppType(cppTypeRaw));
    if (!parsed || parsed.args.length !== 2) {
      throw new CppWireCodecError(`${context}: expected map<K,V> type, got ${cppTypeRaw}`);
    }
    const keyType = parsed.args[0];
    const valueType = parsed.args[1];
    if (!keyType || !valueType) {
      throw new CppWireCodecError(`${context}: malformed map<K,V> args`);
    }
    const result = new Map<unknown, unknown>();
    for (let i = 0; i < count; i += 1) {
      const key = this.readValue(reader, keyType, `${context}.key[${i}]`);
      const mapValue = this.readValue(reader, valueType, `${context}.value[${i}]`);
      result.set(key, mapValue);
    }
    return result;
  }

  private writeMapContainer(
    writer: BufferWriter,
    cppTypeRaw: string,
    value: unknown,
    context: string
  ): void {
    const parsed = parseTemplateType(normalizeCppType(cppTypeRaw));
    if (!parsed || parsed.args.length !== 2) {
      throw new CppWireCodecError(`${context}: expected map<K,V> type, got ${cppTypeRaw}`);
    }
    const keyType = parsed.args[0];
    const valueType = parsed.args[1];
    if (!keyType || !valueType) {
      throw new CppWireCodecError(`${context}: malformed map<K,V> args`);
    }

    const mapValue =
      value instanceof Map ? [...value.entries()] :
      Array.isArray(value) ? value :
      null;

    if (!mapValue) {
      throw new CppWireCodecError(`${context}: expected Map or [key,value][]`);
    }

    writer.writeInt32LE(mapValue.length);
    for (let i = 0; i < mapValue.length; i += 1) {
      const entry = mapValue[i];
      if (!Array.isArray(entry) || entry.length !== 2) {
        throw new CppWireCodecError(`${context}[${i}]: expected [key,value] tuple`);
      }
      this.writeValue(writer, keyType, entry[0], `${context}.key[${i}]`);
      this.writeValue(writer, valueType, entry[1], `${context}.value[${i}]`);
    }
  }

  private readValue(reader: BufferReader, cppTypeRaw: string, context: string): unknown {
    const normalizedType = normalizeCppType(cppTypeRaw);
    const lower = normalizedType.toLowerCase();
    const extensionCodec = getExtensionCodec(normalizedType, this.customTypeCodecs);
    if (extensionCodec) {
      return extensionCodec.read(reader);
    }

    if (lower === 'bool') {
      return reader.readUInt8() !== 0;
    }
    if (INT8_TYPES.has(lower)) {
      return reader.readInt8();
    }
    if (UINT8_TYPES.has(lower)) {
      return reader.readUInt8();
    }
    if (INT16_TYPES.has(lower)) {
      return reader.readInt16LE();
    }
    if (UINT16_TYPES.has(lower)) {
      return reader.readUInt16LE();
    }
    if (INT32_TYPES.has(lower)) {
      return reader.readInt32LE();
    }
    if (UINT32_TYPES.has(lower)) {
      return reader.readUInt32LE();
    }
    if (INT64_TYPES.has(lower)) {
      return reader.readInt64LE();
    }
    if (UINT64_TYPES.has(lower)) {
      return reader.readUInt64LE();
    }
    if (FLOAT_TYPES.has(lower)) {
      return reader.readFloatLE();
    }
    if (DOUBLE_TYPES.has(lower)) {
      return reader.readDoubleLE();
    }
    if (normalizedType === 'std::string') {
      return readArchiveString(reader);
    }
    if (normalizedType === 'Unicode::String' || normalizedType.endsWith('::String')) {
      return reader.readUnicodeStringWithLength();
    }
    if (
      normalizedType === 'Archive::ByteStream' ||
      normalizedType === 'Data' ||
      normalizedType === 'MessageToPayload'
    ) {
      return readByteStream(reader);
    }

    const parsedTemplate = parseTemplateType(normalizedType);
    if (parsedTemplate && parsedTemplate.container === 'std::pair' && parsedTemplate.args.length === 2) {
      return [
        this.readValue(reader, parsedTemplate.args[0] as string, `${context}[0]`),
        this.readValue(reader, parsedTemplate.args[1] as string, `${context}[1]`),
      ];
    }

    if (
      parsedTemplate &&
      (
        parsedTemplate.container === 'std::vector' ||
        parsedTemplate.container === 'std::list' ||
        parsedTemplate.container === 'std::deque' ||
        parsedTemplate.container === 'std::set'
      ) &&
      parsedTemplate.args.length === 1
    ) {
      const count = reader.readInt32LE();
      const values: unknown[] = [];
      for (let i = 0; i < count; i += 1) {
        values.push(this.readValue(reader, parsedTemplate.args[0] as string, `${context}[${i}]`));
      }
      return values;
    }

    if (
      parsedTemplate &&
      (
        parsedTemplate.container === 'std::map' ||
        parsedTemplate.container === 'std::unordered_map'
      ) &&
      parsedTemplate.args.length === 2
    ) {
      const count = reader.readInt32LE();
      const result = new Map<unknown, unknown>();
      for (let i = 0; i < count; i += 1) {
        const key = this.readValue(reader, parsedTemplate.args[0] as string, `${context}.key[${i}]`);
        const value = this.readValue(reader, parsedTemplate.args[1] as string, `${context}.value[${i}]`);
        result.set(key, value);
      }
      return result;
    }

    throw new CppWireCodecError(`${context}: unsupported C++ type ${cppTypeRaw}`);
  }

  private writeValue(
    writer: BufferWriter,
    cppTypeRaw: string,
    value: unknown,
    context: string
  ): void {
    const normalizedType = normalizeCppType(cppTypeRaw);
    const lower = normalizedType.toLowerCase();
    const extensionCodec = getExtensionCodec(normalizedType, this.customTypeCodecs);
    if (extensionCodec) {
      extensionCodec.write(writer, value, context);
      return;
    }

    if (lower === 'bool') {
      writer.writeUInt8(ensureBoolean(value, context) ? 1 : 0);
      return;
    }
    if (INT8_TYPES.has(lower)) {
      writer.writeInt8(ensureNumber(value, context));
      return;
    }
    if (UINT8_TYPES.has(lower)) {
      writer.writeUInt8(ensureNumber(value, context));
      return;
    }
    if (INT16_TYPES.has(lower)) {
      writer.writeInt16LE(ensureNumber(value, context));
      return;
    }
    if (UINT16_TYPES.has(lower)) {
      writer.writeUInt16LE(ensureNumber(value, context));
      return;
    }
    if (INT32_TYPES.has(lower)) {
      writer.writeInt32LE(ensureNumber(value, context));
      return;
    }
    if (UINT32_TYPES.has(lower)) {
      writer.writeUInt32LE(ensureNumber(value, context));
      return;
    }
    if (INT64_TYPES.has(lower)) {
      writer.writeInt64LE(ensureBigInt(value, context));
      return;
    }
    if (UINT64_TYPES.has(lower)) {
      writer.writeUInt64LE(ensureBigInt(value, context));
      return;
    }
    if (FLOAT_TYPES.has(lower)) {
      writer.writeFloatLE(ensureNumber(value, context));
      return;
    }
    if (DOUBLE_TYPES.has(lower)) {
      writer.writeDoubleLE(ensureNumber(value, context));
      return;
    }
    if (normalizedType === 'std::string') {
      writeArchiveString(writer, ensureString(value, context));
      return;
    }
    if (normalizedType === 'Unicode::String' || normalizedType.endsWith('::String')) {
      writer.writeUnicodeStringWithLength(ensureString(value, context));
      return;
    }
    if (
      normalizedType === 'Archive::ByteStream' ||
      normalizedType === 'Data' ||
      normalizedType === 'MessageToPayload'
    ) {
      writeByteStream(writer, value, context);
      return;
    }

    const parsedTemplate = parseTemplateType(normalizedType);
    if (parsedTemplate && parsedTemplate.container === 'std::pair' && parsedTemplate.args.length === 2) {
      const tuple = ensureArray(value, context);
      if (tuple.length !== 2) {
        throw new CppWireCodecError(`${context}: expected pair tuple length 2`);
      }
      this.writeValue(writer, parsedTemplate.args[0] as string, tuple[0], `${context}[0]`);
      this.writeValue(writer, parsedTemplate.args[1] as string, tuple[1], `${context}[1]`);
      return;
    }

    if (
      parsedTemplate &&
      (
        parsedTemplate.container === 'std::vector' ||
        parsedTemplate.container === 'std::list' ||
        parsedTemplate.container === 'std::deque' ||
        parsedTemplate.container === 'std::set'
      ) &&
      parsedTemplate.args.length === 1
    ) {
      const values = ensureArray(value, context);
      writer.writeInt32LE(values.length);
      for (let i = 0; i < values.length; i += 1) {
        this.writeValue(writer, parsedTemplate.args[0] as string, values[i], `${context}[${i}]`);
      }
      return;
    }

    if (
      parsedTemplate &&
      (
        parsedTemplate.container === 'std::map' ||
        parsedTemplate.container === 'std::unordered_map'
      ) &&
      parsedTemplate.args.length === 2
    ) {
      const mapValue =
        value instanceof Map ? [...value.entries()] :
        Array.isArray(value) ? value :
        null;
      if (!mapValue) {
        throw new CppWireCodecError(`${context}: expected Map or [key,value][]`);
      }
      writer.writeInt32LE(mapValue.length);
      for (let i = 0; i < mapValue.length; i += 1) {
        const entry = mapValue[i];
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new CppWireCodecError(`${context}[${i}]: expected [key,value] tuple`);
        }
        this.writeValue(writer, parsedTemplate.args[0] as string, entry[0], `${context}.key[${i}]`);
        this.writeValue(writer, parsedTemplate.args[1] as string, entry[1], `${context}.value[${i}]`);
      }
      return;
    }

    throw new CppWireCodecError(`${context}: unsupported C++ type ${cppTypeRaw}`);
  }
}

export const CPP_PACKET_DEFINITIONS_BY_OPCODE = new Map<number, CppPacketDefinition[]>();
for (const definition of CPP_PACKET_DEFINITIONS) {
  const opcode = parseOpcode(definition.swgCrc32);
  const existing = CPP_PACKET_DEFINITIONS_BY_OPCODE.get(opcode);
  if (existing) {
    existing.push(definition);
  } else {
    CPP_PACKET_DEFINITIONS_BY_OPCODE.set(opcode, [definition]);
  }
}

export const defaultCppWireCodec = new CppWireCodec();

export function encodeCppWirePacketByName(
  packetName: string,
  fields: Record<string, unknown>,
  codec: CppWireCodec = defaultCppWireCodec
): Uint8Array {
  return codec.encodeByName(packetName, fields);
}

export function decodeCppWirePacketByName(
  packetName: string,
  data: Uint8Array,
  codec: CppWireCodec = defaultCppWireCodec
): CppWirePacket {
  return codec.decodeByName(packetName, data);
}

export function decodeCppWirePacketByOpcode(
  data: Uint8Array,
  codec: CppWireCodec = defaultCppWireCodec
): CppWirePacket {
  return codec.decodeByOpcode(data);
}
