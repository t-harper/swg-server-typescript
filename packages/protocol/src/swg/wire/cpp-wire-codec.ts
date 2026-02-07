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

// --- Login cluster types ---

export interface CppLoginEnumClusterData {
  m_clusterId: number;
  m_clusterName: string;
  m_timeZone: number;
}

export interface CppLoginClusterStatusData {
  m_clusterId: number;
  m_connectionServerAddress: string;
  m_connectionServerPort: number;
  m_connectionServerPingPort: number;
  m_populationOnline: number;
  m_populationOnlineStatus: number;
  m_maxCharactersPerAccount: number;
  m_timeZone: number;
  m_status: number;
  m_dontRecommend: boolean;
  m_onlinePlayerLimit: number;
  m_onlineFreeTrialLimit: number;
}

export interface CppLoginClusterStatusExData {
  m_clusterId: number;
  m_branch: string;
  m_networkVersion: string;
  m_version: number;
  m_reserved1: number;
  m_reserved2: number;
  m_reserved3: number;
  m_reserved4: number;
}

// --- Map/survey types ---

export interface CppMapLocation {
  locationId: bigint;
  locationName: string;
  x: number;
  y: number;
  category: number;
  subCategory: number;
  flags: number;
}

export interface CppSurveyDataItem {
  x: number;
  y: number;
  z: number;
  efficiency: number;
}

export interface CppResourceListDataItem {
  resourceName: string;
  resourceId: bigint;
  parentClassName: string;
}

// --- Auction/market types ---

export interface CppSearchCondition {
  attributeNameCrc: number;
  requiredAttribute: boolean;
  comparison: number;
  intMin?: number;
  intMax?: number;
  floatMin?: number;
  floatMax?: number;
  stringValue?: string;
}

export interface CppAuctionLocation {
  locationId: bigint;
  locationNameLength: number;
  locationName: string;
  ownerId: bigint;
  salesTax: number;
  salesTaxBankId: bigint;
  emptyDate: number;
  lastAccessDate: number;
  inactiveDate: number;
  status: number;
  searchEnabled: boolean;
  entranceCharge: number;
}

export interface CppMarketAuction {
  itemId: bigint;
  ownerId: bigint;
  creatorId: bigint;
  locationId: bigint;
  minBid: number;
  buyNowPrice: number;
  auctionTimer: number;
  oobLength: number;
  oob: string;
  userDescriptionLength: number;
  userDescription: string;
  category: number;
  itemTemplateId: number;
  itemNameLength: number;
  itemName: string;
  itemTimer: number;
  active: number;
  itemSize: number;
}

export interface CppMarketAuctionAttribute {
  itemId: bigint;
  attributeName: string;
  attributeValue: string;
}

export interface CppMarketAuctionBid {
  itemId: bigint;
  bidderId: bigint;
  bid: number;
  maxProxyBid: number;
}

export interface CppPalettizedItemDataHeader {
  itemId: bigint;
  itemNameKey: number;
  highBid: number;
  timer: number;
  buyNowPrice: number;
  locationKey: number;
  ownerId: bigint;
  ownerNameKey: number;
  highBidderId: bigint;
  highBidderNameKey: number;
  maxProxyBid: number;
  myBid: number;
  itemType: number;
  resourceContainerClassCrc: number;
  flags: number;
  entranceCharge: number;
}

export interface CppAuctionQueryResponseData {
  auctionId: bigint;
  location: string;
  ownerId: bigint;
  minBid: number;
  timer: number;
  itemId: bigint;
  soldFlag: number;
  highBidderId: bigint;
  itemType: number;
  resourceContainerClassCrc: number;
  itemQuantity: number;
  itemTimer: number;
  highBid: number;
  highBidMaxProxy: number;
}

// --- Game utility types ---

export type CppAttributePair = [string, string];

export interface CppBatchBaselinesMessageData {
  networkId: bigint;
  objectType: number;
  packageId: number;
  package: Uint8Array;
}

export interface CppCharacterListMessageData {
  name: string;
  objectTemplate: string;
  characterId: bigint;
  containerId: bigint;
  location: string;
  coordinates: CppVector3;
}

export interface CppChardata {
  name: string;
  objectTemplateId: number;
  networkId: bigint;
  clusterId: number;
  characterType: number;
}

export interface CppChunk {
  process: number;
  nodeX: number;
  nodeZ: number;
}

export interface CppStructureListMessageData {
  objectTemplate: string;
  structureId: bigint;
  location: string;
  coordinates: CppVector3;
  deleted: number;
}

// --- Customer service types ---

export interface CppChatLogEntry {
  from: string;
  to: string;
  channel: string;
  message: string;
  time: number;
}

export interface CppCustomerServiceCategory {
  categoryName: string;
  categoryId: number;
  subCategories: CppCustomerServiceCategory[];
  isBugType: boolean;
  isServiceType: boolean;
}

export interface CppCustomerServiceComment {
  ticketId: number;
  commentId: number;
  fromCsr: boolean;
  comment: string;
  commentorName: string;
}

export interface CppCustomerServiceTicket {
  categoryId: number;
  subCategoryId: number;
  characterName: string;
  details: string;
  language: string;
  ticketId: number;
  modifiedDate: bigint;
  read: boolean;
  closed: boolean;
}

export interface CppCustomerServiceSearchResult {
  title: string;
  id: string;
  matchPercent: number;
}

// --- Metrics/planet/AI types ---

export interface CppMetricsPair {
  label: string;
  value: number;
  description: string;
  persistData: boolean;
  summary: boolean;
}

export interface CppAIPathInfoNodeInfo {
  node: number;
  state: number;
}

export interface CppResourceTypeData {
  networkId: bigint;
  name: string;
  depletedTimestamp: number;
  parentClass: string;
  attributes: Array<[string, number]>;
  fractalSeeds: Array<[bigint, number]>;
}

export interface CppPlanetNodeStatusMessageData {
  x: number;
  z: number;
  loaded: boolean;
  servers: number[];
  subscriptionCounts: number[];
}

export interface CppPlanetObjectStatusMessageData {
  objectId: bigint;
  x: number;
  z: number;
  authoritativeServer: number;
  interestRadius: number;
  deleteObject: number;
  objectTypeTag: number;
  level: number;
  hibernating: boolean;
  templateCrc: number;
  aiActivity: number;
  creationType: number;
}

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

// --- LoginEnumCluster::ClusterData ---

function readLoginEnumClusterData(reader: BufferReader): CppLoginEnumClusterData {
  return {
    m_clusterId: reader.readUInt32LE(),
    m_clusterName: readArchiveString(reader),
    m_timeZone: reader.readInt32LE(),
  };
}

function writeLoginEnumClusterData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppLoginEnumClusterData>;
  writer.writeUInt32LE(ensureNumber(data.m_clusterId, `${context}.m_clusterId`));
  writeArchiveString(writer, ensureString(data.m_clusterName, `${context}.m_clusterName`));
  writer.writeInt32LE(ensureNumber(data.m_timeZone, `${context}.m_timeZone`));
}

// --- LoginClusterStatus::ClusterData ---

function readLoginClusterStatusData(reader: BufferReader): CppLoginClusterStatusData {
  return {
    m_clusterId: reader.readUInt32LE(),
    m_connectionServerAddress: readArchiveString(reader),
    m_connectionServerPort: reader.readUInt16LE(),
    m_connectionServerPingPort: reader.readUInt16LE(),
    m_populationOnline: reader.readInt32LE(),
    m_populationOnlineStatus: reader.readInt32LE(),
    m_maxCharactersPerAccount: reader.readInt32LE(),
    m_timeZone: reader.readInt32LE(),
    m_status: reader.readInt32LE(),
    m_dontRecommend: reader.readUInt8() !== 0,
    m_onlinePlayerLimit: reader.readUInt32LE(),
    m_onlineFreeTrialLimit: reader.readUInt32LE(),
  };
}

function writeLoginClusterStatusData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppLoginClusterStatusData>;
  writer.writeUInt32LE(ensureNumber(data.m_clusterId, `${context}.m_clusterId`));
  writeArchiveString(writer, ensureString(data.m_connectionServerAddress, `${context}.m_connectionServerAddress`));
  writer.writeUInt16LE(ensureNumber(data.m_connectionServerPort, `${context}.m_connectionServerPort`));
  writer.writeUInt16LE(ensureNumber(data.m_connectionServerPingPort, `${context}.m_connectionServerPingPort`));
  writer.writeInt32LE(ensureNumber(data.m_populationOnline, `${context}.m_populationOnline`));
  writer.writeInt32LE(ensureNumber(data.m_populationOnlineStatus, `${context}.m_populationOnlineStatus`));
  writer.writeInt32LE(ensureNumber(data.m_maxCharactersPerAccount, `${context}.m_maxCharactersPerAccount`));
  writer.writeInt32LE(ensureNumber(data.m_timeZone, `${context}.m_timeZone`));
  writer.writeInt32LE(ensureNumber(data.m_status, `${context}.m_status`));
  writer.writeUInt8(ensureBoolean(data.m_dontRecommend, `${context}.m_dontRecommend`) ? 1 : 0);
  writer.writeUInt32LE(ensureNumber(data.m_onlinePlayerLimit, `${context}.m_onlinePlayerLimit`));
  writer.writeUInt32LE(ensureNumber(data.m_onlineFreeTrialLimit, `${context}.m_onlineFreeTrialLimit`));
}

// --- LoginClusterStatusEx::ClusterData ---

function readLoginClusterStatusExData(reader: BufferReader): CppLoginClusterStatusExData {
  return {
    m_clusterId: reader.readUInt32LE(),
    m_branch: readArchiveString(reader),
    m_networkVersion: readArchiveString(reader),
    m_version: reader.readUInt32LE(),
    m_reserved1: reader.readUInt32LE(),
    m_reserved2: reader.readUInt32LE(),
    m_reserved3: reader.readUInt32LE(),
    m_reserved4: reader.readUInt32LE(),
  };
}

function writeLoginClusterStatusExData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppLoginClusterStatusExData>;
  writer.writeUInt32LE(ensureNumber(data.m_clusterId, `${context}.m_clusterId`));
  writeArchiveString(writer, ensureString(data.m_branch, `${context}.m_branch`));
  writeArchiveString(writer, ensureString(data.m_networkVersion, `${context}.m_networkVersion`));
  writer.writeUInt32LE(ensureNumber(data.m_version, `${context}.m_version`));
  writer.writeUInt32LE(ensureNumber(data.m_reserved1, `${context}.m_reserved1`));
  writer.writeUInt32LE(ensureNumber(data.m_reserved2, `${context}.m_reserved2`));
  writer.writeUInt32LE(ensureNumber(data.m_reserved3, `${context}.m_reserved3`));
  writer.writeUInt32LE(ensureNumber(data.m_reserved4, `${context}.m_reserved4`));
}

// --- MapLocation ---

function readMapLocation(reader: BufferReader): CppMapLocation {
  return {
    locationId: reader.readUInt64LE(),
    locationName: reader.readUnicodeStringWithLength(),
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    category: reader.readUInt8(),
    subCategory: reader.readUInt8(),
    flags: reader.readUInt8(),
  };
}

function writeMapLocation(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppMapLocation>;
  writer.writeUInt64LE(ensureBigInt(data.locationId, `${context}.locationId`));
  writer.writeUnicodeStringWithLength(ensureString(data.locationName, `${context}.locationName`));
  writer.writeFloatLE(ensureNumber(data.x, `${context}.x`));
  writer.writeFloatLE(ensureNumber(data.y, `${context}.y`));
  writer.writeUInt8(ensureNumber(data.category, `${context}.category`));
  writer.writeUInt8(ensureNumber(data.subCategory, `${context}.subCategory`));
  writer.writeUInt8(ensureNumber(data.flags, `${context}.flags`));
}

// --- SurveyMessage::DataItem ---

function readSurveyDataItem(reader: BufferReader): CppSurveyDataItem {
  return {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
    efficiency: reader.readFloatLE(),
  };
}

function writeSurveyDataItem(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppSurveyDataItem>;
  writer.writeFloatLE(ensureNumber(data.x, `${context}.x`));
  writer.writeFloatLE(ensureNumber(data.y, `${context}.y`));
  writer.writeFloatLE(ensureNumber(data.z, `${context}.z`));
  writer.writeFloatLE(ensureNumber(data.efficiency, `${context}.efficiency`));
}

// --- ResourceListForSurveyMessage::DataItem ---

function readResourceListDataItem(reader: BufferReader): CppResourceListDataItem {
  return {
    resourceName: readArchiveString(reader),
    resourceId: reader.readUInt64LE(),
    parentClassName: readArchiveString(reader),
  };
}

function writeResourceListDataItem(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppResourceListDataItem>;
  writeArchiveString(writer, ensureString(data.resourceName, `${context}.resourceName`));
  writer.writeUInt64LE(ensureBigInt(data.resourceId, `${context}.resourceId`));
  writeArchiveString(writer, ensureString(data.parentClassName, `${context}.parentClassName`));
}

// --- SearchCondition (conditional serialization) ---

function readSearchCondition(reader: BufferReader): CppSearchCondition {
  const attributeNameCrc = reader.readUInt32LE();
  const requiredAttribute = reader.readUInt8() !== 0;
  const comparison = reader.readInt8();
  const result: CppSearchCondition = { attributeNameCrc, requiredAttribute, comparison };
  if (comparison === 0) {
    result.intMin = reader.readInt32LE();
    result.intMax = reader.readInt32LE();
  } else if (comparison === 1) {
    result.floatMin = reader.readDoubleLE();
    result.floatMax = reader.readDoubleLE();
  } else if (comparison >= 2 && comparison <= 5) {
    result.stringValue = readArchiveString(reader);
  }
  return result;
}

function writeSearchCondition(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppSearchCondition>;
  writer.writeUInt32LE(ensureNumber(data.attributeNameCrc, `${context}.attributeNameCrc`));
  writer.writeUInt8(ensureBoolean(data.requiredAttribute, `${context}.requiredAttribute`) ? 1 : 0);
  const comparison = ensureNumber(data.comparison, `${context}.comparison`);
  writer.writeInt8(comparison);
  if (comparison === 0) {
    writer.writeInt32LE(ensureNumber(data.intMin, `${context}.intMin`));
    writer.writeInt32LE(ensureNumber(data.intMax, `${context}.intMax`));
  } else if (comparison === 1) {
    writer.writeDoubleLE(ensureNumber(data.floatMin, `${context}.floatMin`));
    writer.writeDoubleLE(ensureNumber(data.floatMax, `${context}.floatMax`));
  } else if (comparison >= 2 && comparison <= 5) {
    writeArchiveString(writer, ensureString(data.stringValue, `${context}.stringValue`));
  }
}

// --- AuctionLocation ---

function readAuctionLocation(reader: BufferReader): CppAuctionLocation {
  return {
    locationId: reader.readUInt64LE(),
    locationNameLength: reader.readInt32LE(),
    locationName: readArchiveString(reader),
    ownerId: reader.readUInt64LE(),
    salesTax: reader.readInt32LE(),
    salesTaxBankId: reader.readUInt64LE(),
    emptyDate: reader.readInt32LE(),
    lastAccessDate: reader.readInt32LE(),
    inactiveDate: reader.readInt32LE(),
    status: reader.readInt32LE(),
    searchEnabled: reader.readUInt8() !== 0,
    entranceCharge: reader.readInt32LE(),
  };
}

function writeAuctionLocation(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppAuctionLocation>;
  writer.writeUInt64LE(ensureBigInt(data.locationId, `${context}.locationId`));
  writer.writeInt32LE(ensureNumber(data.locationNameLength, `${context}.locationNameLength`));
  writeArchiveString(writer, ensureString(data.locationName, `${context}.locationName`));
  writer.writeUInt64LE(ensureBigInt(data.ownerId, `${context}.ownerId`));
  writer.writeInt32LE(ensureNumber(data.salesTax, `${context}.salesTax`));
  writer.writeUInt64LE(ensureBigInt(data.salesTaxBankId, `${context}.salesTaxBankId`));
  writer.writeInt32LE(ensureNumber(data.emptyDate, `${context}.emptyDate`));
  writer.writeInt32LE(ensureNumber(data.lastAccessDate, `${context}.lastAccessDate`));
  writer.writeInt32LE(ensureNumber(data.inactiveDate, `${context}.inactiveDate`));
  writer.writeInt32LE(ensureNumber(data.status, `${context}.status`));
  writer.writeUInt8(ensureBoolean(data.searchEnabled, `${context}.searchEnabled`) ? 1 : 0);
  writer.writeInt32LE(ensureNumber(data.entranceCharge, `${context}.entranceCharge`));
}

// --- MarketAuction ---

function readMarketAuction(reader: BufferReader): CppMarketAuction {
  return {
    itemId: reader.readUInt64LE(),
    ownerId: reader.readUInt64LE(),
    creatorId: reader.readUInt64LE(),
    locationId: reader.readUInt64LE(),
    minBid: reader.readInt32LE(),
    buyNowPrice: reader.readInt32LE(),
    auctionTimer: reader.readInt32LE(),
    oobLength: reader.readInt32LE(),
    oob: readArchiveString(reader),
    userDescriptionLength: reader.readInt32LE(),
    userDescription: reader.readUnicodeStringWithLength(),
    category: reader.readInt32LE(),
    itemTemplateId: reader.readInt32LE(),
    itemNameLength: reader.readInt32LE(),
    itemName: reader.readUnicodeStringWithLength(),
    itemTimer: reader.readInt32LE(),
    active: reader.readInt32LE(),
    itemSize: reader.readInt32LE(),
  };
}

function writeMarketAuction(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppMarketAuction>;
  writer.writeUInt64LE(ensureBigInt(data.itemId, `${context}.itemId`));
  writer.writeUInt64LE(ensureBigInt(data.ownerId, `${context}.ownerId`));
  writer.writeUInt64LE(ensureBigInt(data.creatorId, `${context}.creatorId`));
  writer.writeUInt64LE(ensureBigInt(data.locationId, `${context}.locationId`));
  writer.writeInt32LE(ensureNumber(data.minBid, `${context}.minBid`));
  writer.writeInt32LE(ensureNumber(data.buyNowPrice, `${context}.buyNowPrice`));
  writer.writeInt32LE(ensureNumber(data.auctionTimer, `${context}.auctionTimer`));
  writer.writeInt32LE(ensureNumber(data.oobLength, `${context}.oobLength`));
  writeArchiveString(writer, ensureString(data.oob, `${context}.oob`));
  writer.writeInt32LE(ensureNumber(data.userDescriptionLength, `${context}.userDescriptionLength`));
  writer.writeUnicodeStringWithLength(ensureString(data.userDescription, `${context}.userDescription`));
  writer.writeInt32LE(ensureNumber(data.category, `${context}.category`));
  writer.writeInt32LE(ensureNumber(data.itemTemplateId, `${context}.itemTemplateId`));
  writer.writeInt32LE(ensureNumber(data.itemNameLength, `${context}.itemNameLength`));
  writer.writeUnicodeStringWithLength(ensureString(data.itemName, `${context}.itemName`));
  writer.writeInt32LE(ensureNumber(data.itemTimer, `${context}.itemTimer`));
  writer.writeInt32LE(ensureNumber(data.active, `${context}.active`));
  writer.writeInt32LE(ensureNumber(data.itemSize, `${context}.itemSize`));
}

// --- MarketAuctionAttribute ---

function readMarketAuctionAttribute(reader: BufferReader): CppMarketAuctionAttribute {
  return {
    itemId: reader.readUInt64LE(),
    attributeName: readArchiveString(reader),
    attributeValue: reader.readUnicodeStringWithLength(),
  };
}

function writeMarketAuctionAttribute(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppMarketAuctionAttribute>;
  writer.writeUInt64LE(ensureBigInt(data.itemId, `${context}.itemId`));
  writeArchiveString(writer, ensureString(data.attributeName, `${context}.attributeName`));
  writer.writeUnicodeStringWithLength(ensureString(data.attributeValue, `${context}.attributeValue`));
}

// --- MarketAuctionBid ---

function readMarketAuctionBid(reader: BufferReader): CppMarketAuctionBid {
  return {
    itemId: reader.readUInt64LE(),
    bidderId: reader.readUInt64LE(),
    bid: reader.readInt32LE(),
    maxProxyBid: reader.readInt32LE(),
  };
}

function writeMarketAuctionBid(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppMarketAuctionBid>;
  writer.writeUInt64LE(ensureBigInt(data.itemId, `${context}.itemId`));
  writer.writeUInt64LE(ensureBigInt(data.bidderId, `${context}.bidderId`));
  writer.writeInt32LE(ensureNumber(data.bid, `${context}.bid`));
  writer.writeInt32LE(ensureNumber(data.maxProxyBid, `${context}.maxProxyBid`));
}

// --- Auction::PalettizedItemDataHeader ---

function readPalettizedItemDataHeader(reader: BufferReader): CppPalettizedItemDataHeader {
  return {
    itemId: reader.readUInt64LE(),
    itemNameKey: reader.readUInt8(),
    highBid: reader.readInt32LE(),
    timer: reader.readInt32LE(),
    buyNowPrice: reader.readInt32LE(),
    locationKey: reader.readUInt16LE(),
    ownerId: reader.readUInt64LE(),
    ownerNameKey: reader.readUInt16LE(),
    highBidderId: reader.readUInt64LE(),
    highBidderNameKey: reader.readUInt16LE(),
    maxProxyBid: reader.readInt32LE(),
    myBid: reader.readInt32LE(),
    itemType: reader.readInt32LE(),
    resourceContainerClassCrc: reader.readInt32LE(),
    flags: reader.readInt32LE(),
    entranceCharge: reader.readInt32LE(),
  };
}

function writePalettizedItemDataHeader(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppPalettizedItemDataHeader>;
  writer.writeUInt64LE(ensureBigInt(data.itemId, `${context}.itemId`));
  writer.writeUInt8(ensureNumber(data.itemNameKey, `${context}.itemNameKey`));
  writer.writeInt32LE(ensureNumber(data.highBid, `${context}.highBid`));
  writer.writeInt32LE(ensureNumber(data.timer, `${context}.timer`));
  writer.writeInt32LE(ensureNumber(data.buyNowPrice, `${context}.buyNowPrice`));
  writer.writeUInt16LE(ensureNumber(data.locationKey, `${context}.locationKey`));
  writer.writeUInt64LE(ensureBigInt(data.ownerId, `${context}.ownerId`));
  writer.writeUInt16LE(ensureNumber(data.ownerNameKey, `${context}.ownerNameKey`));
  writer.writeUInt64LE(ensureBigInt(data.highBidderId, `${context}.highBidderId`));
  writer.writeUInt16LE(ensureNumber(data.highBidderNameKey, `${context}.highBidderNameKey`));
  writer.writeInt32LE(ensureNumber(data.maxProxyBid, `${context}.maxProxyBid`));
  writer.writeInt32LE(ensureNumber(data.myBid, `${context}.myBid`));
  writer.writeInt32LE(ensureNumber(data.itemType, `${context}.itemType`));
  writer.writeInt32LE(ensureNumber(data.resourceContainerClassCrc, `${context}.resourceContainerClassCrc`));
  writer.writeInt32LE(ensureNumber(data.flags, `${context}.flags`));
  writer.writeInt32LE(ensureNumber(data.entranceCharge, `${context}.entranceCharge`));
}

// --- AuctionData (AuctionQueryResponseMessage) ---

function readAuctionQueryResponseData(reader: BufferReader): CppAuctionQueryResponseData {
  return {
    auctionId: reader.readInt64LE(),
    location: readArchiveString(reader),
    ownerId: reader.readInt64LE(),
    minBid: reader.readInt32LE(),
    timer: reader.readInt32LE(),
    itemId: reader.readInt64LE(),
    soldFlag: reader.readInt32LE(),
    highBidderId: reader.readInt64LE(),
    itemType: reader.readInt32LE(),
    resourceContainerClassCrc: reader.readInt32LE(),
    itemQuantity: reader.readInt16LE(),
    itemTimer: reader.readInt32LE(),
    highBid: reader.readInt32LE(),
    highBidMaxProxy: reader.readInt32LE(),
  };
}

function writeAuctionQueryResponseData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppAuctionQueryResponseData>;
  writer.writeInt64LE(ensureBigInt(data.auctionId, `${context}.auctionId`));
  writeArchiveString(writer, ensureString(data.location, `${context}.location`));
  writer.writeInt64LE(ensureBigInt(data.ownerId, `${context}.ownerId`));
  writer.writeInt32LE(ensureNumber(data.minBid, `${context}.minBid`));
  writer.writeInt32LE(ensureNumber(data.timer, `${context}.timer`));
  writer.writeInt64LE(ensureBigInt(data.itemId, `${context}.itemId`));
  writer.writeInt32LE(ensureNumber(data.soldFlag, `${context}.soldFlag`));
  writer.writeInt64LE(ensureBigInt(data.highBidderId, `${context}.highBidderId`));
  writer.writeInt32LE(ensureNumber(data.itemType, `${context}.itemType`));
  writer.writeInt32LE(ensureNumber(data.resourceContainerClassCrc, `${context}.resourceContainerClassCrc`));
  writer.writeInt16LE(ensureNumber(data.itemQuantity, `${context}.itemQuantity`));
  writer.writeInt32LE(ensureNumber(data.itemTimer, `${context}.itemTimer`));
  writer.writeInt32LE(ensureNumber(data.highBid, `${context}.highBid`));
  writer.writeInt32LE(ensureNumber(data.highBidMaxProxy, `${context}.highBidMaxProxy`));
}

// --- AttributePair (std::pair<std::string, Unicode::String>) ---

function readAttributePair(reader: BufferReader): CppAttributePair {
  return [readArchiveString(reader), reader.readUnicodeStringWithLength()];
}

function writeAttributePair(writer: BufferWriter, value: unknown, context: string): void {
  const tuple = ensureArray(value, context);
  if (tuple.length !== 2) {
    throw new CppWireCodecError(`${context}: expected pair tuple length 2`);
  }
  writeArchiveString(writer, ensureString(tuple[0], `${context}[0]`));
  writer.writeUnicodeStringWithLength(ensureString(tuple[1], `${context}[1]`));
}

// --- BatchBaselinesMessageData ---

function readBatchBaselinesMessageData(reader: BufferReader): CppBatchBaselinesMessageData {
  return {
    networkId: reader.readUInt64LE(),
    objectType: reader.readUInt32LE(),
    packageId: reader.readInt8(),
    package: readByteStream(reader),
  };
}

function writeBatchBaselinesMessageData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppBatchBaselinesMessageData>;
  writer.writeUInt64LE(ensureBigInt(data.networkId, `${context}.networkId`));
  writer.writeUInt32LE(ensureNumber(data.objectType, `${context}.objectType`));
  writer.writeInt8(ensureNumber(data.packageId, `${context}.packageId`));
  writeByteStream(writer, data.package, `${context}.package`);
}

// --- CharacterListMessageData ---

function readCharacterListMessageData(reader: BufferReader): CppCharacterListMessageData {
  return {
    name: reader.readUnicodeStringWithLength(),
    objectTemplate: readArchiveString(reader),
    characterId: reader.readUInt64LE(),
    containerId: reader.readUInt64LE(),
    location: readArchiveString(reader),
    coordinates: readVector3(reader),
  };
}

function writeCharacterListMessageData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppCharacterListMessageData>;
  writer.writeUnicodeStringWithLength(ensureString(data.name, `${context}.name`));
  writeArchiveString(writer, ensureString(data.objectTemplate, `${context}.objectTemplate`));
  writer.writeUInt64LE(ensureBigInt(data.characterId, `${context}.characterId`));
  writer.writeUInt64LE(ensureBigInt(data.containerId, `${context}.containerId`));
  writeArchiveString(writer, ensureString(data.location, `${context}.location`));
  writeVector3(writer, data.coordinates, `${context}.coordinates`);
}

// --- Chardata (EnumerateCharacterId) ---

function readChardata(reader: BufferReader): CppChardata {
  return {
    name: reader.readUnicodeStringWithLength(),
    objectTemplateId: reader.readInt32LE(),
    networkId: reader.readUInt64LE(),
    clusterId: reader.readUInt32LE(),
    characterType: reader.readInt32LE(),
  };
}

function writeChardata(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppChardata>;
  writer.writeUnicodeStringWithLength(ensureString(data.name, `${context}.name`));
  writer.writeInt32LE(ensureNumber(data.objectTemplateId, `${context}.objectTemplateId`));
  writer.writeUInt64LE(ensureBigInt(data.networkId, `${context}.networkId`));
  writer.writeUInt32LE(ensureNumber(data.clusterId, `${context}.clusterId`));
  writer.writeInt32LE(ensureNumber(data.characterType, `${context}.characterType`));
}

// --- Chunk ---

function readChunk(reader: BufferReader): CppChunk {
  return {
    process: reader.readUInt32LE(),
    nodeX: reader.readInt32LE(),
    nodeZ: reader.readInt32LE(),
  };
}

function writeChunk(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppChunk>;
  writer.writeUInt32LE(ensureNumber(data.process, `${context}.process`));
  writer.writeInt32LE(ensureNumber(data.nodeX, `${context}.nodeX`));
  writer.writeInt32LE(ensureNumber(data.nodeZ, `${context}.nodeZ`));
}

// --- StructureListMessageData ---

function readStructureListMessageData(reader: BufferReader): CppStructureListMessageData {
  return {
    objectTemplate: readArchiveString(reader),
    structureId: reader.readUInt64LE(),
    location: readArchiveString(reader),
    coordinates: readVector3(reader),
    deleted: reader.readInt32LE(),
  };
}

function writeStructureListMessageData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppStructureListMessageData>;
  writeArchiveString(writer, ensureString(data.objectTemplate, `${context}.objectTemplate`));
  writer.writeUInt64LE(ensureBigInt(data.structureId, `${context}.structureId`));
  writeArchiveString(writer, ensureString(data.location, `${context}.location`));
  writeVector3(writer, data.coordinates, `${context}.coordinates`);
  writer.writeInt32LE(ensureNumber(data.deleted, `${context}.deleted`));
}

// --- ChatLogEntry ---

function readChatLogEntry(reader: BufferReader): CppChatLogEntry {
  return {
    from: reader.readUnicodeStringWithLength(),
    to: reader.readUnicodeStringWithLength(),
    channel: reader.readUnicodeStringWithLength(),
    message: reader.readUnicodeStringWithLength(),
    time: reader.readInt32LE(),
  };
}

function writeChatLogEntry(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppChatLogEntry>;
  writer.writeUnicodeStringWithLength(ensureString(data.from, `${context}.from`));
  writer.writeUnicodeStringWithLength(ensureString(data.to, `${context}.to`));
  writer.writeUnicodeStringWithLength(ensureString(data.channel, `${context}.channel`));
  writer.writeUnicodeStringWithLength(ensureString(data.message, `${context}.message`));
  writer.writeInt32LE(ensureNumber(data.time, `${context}.time`));
}

// --- CustomerServiceCategory (recursive) ---

function readCustomerServiceCategory(reader: BufferReader): CppCustomerServiceCategory {
  const categoryName = reader.readUnicodeStringWithLength();
  const categoryId = reader.readInt32LE();
  const subCount = reader.readInt32LE();
  const subCategories: CppCustomerServiceCategory[] = [];
  for (let i = 0; i < subCount; i += 1) {
    subCategories.push(readCustomerServiceCategory(reader));
  }
  const isBugType = reader.readUInt8() !== 0;
  const isServiceType = reader.readUInt8() !== 0;
  return { categoryName, categoryId, subCategories, isBugType, isServiceType };
}

function writeCustomerServiceCategory(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppCustomerServiceCategory>;
  writer.writeUnicodeStringWithLength(ensureString(data.categoryName, `${context}.categoryName`));
  writer.writeInt32LE(ensureNumber(data.categoryId, `${context}.categoryId`));
  const subCategories = ensureArray(data.subCategories, `${context}.subCategories`);
  writer.writeInt32LE(subCategories.length);
  for (let i = 0; i < subCategories.length; i += 1) {
    writeCustomerServiceCategory(writer, subCategories[i], `${context}.subCategories[${i}]`);
  }
  writer.writeUInt8(ensureBoolean(data.isBugType, `${context}.isBugType`) ? 1 : 0);
  writer.writeUInt8(ensureBoolean(data.isServiceType, `${context}.isServiceType`) ? 1 : 0);
}

// --- CustomerServiceComment ---

function readCustomerServiceComment(reader: BufferReader): CppCustomerServiceComment {
  return {
    ticketId: reader.readUInt32LE(),
    commentId: reader.readUInt32LE(),
    fromCsr: reader.readUInt8() !== 0,
    comment: reader.readUnicodeStringWithLength(),
    commentorName: readArchiveString(reader),
  };
}

function writeCustomerServiceComment(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppCustomerServiceComment>;
  writer.writeUInt32LE(ensureNumber(data.ticketId, `${context}.ticketId`));
  writer.writeUInt32LE(ensureNumber(data.commentId, `${context}.commentId`));
  writer.writeUInt8(ensureBoolean(data.fromCsr, `${context}.fromCsr`) ? 1 : 0);
  writer.writeUnicodeStringWithLength(ensureString(data.comment, `${context}.comment`));
  writeArchiveString(writer, ensureString(data.commentorName, `${context}.commentorName`));
}

// --- CustomerServiceTicket ---

function readCustomerServiceTicket(reader: BufferReader): CppCustomerServiceTicket {
  return {
    categoryId: reader.readUInt32LE(),
    subCategoryId: reader.readUInt32LE(),
    characterName: readArchiveString(reader),
    details: reader.readUnicodeStringWithLength(),
    language: readArchiveString(reader),
    ticketId: reader.readUInt32LE(),
    modifiedDate: reader.readInt64LE(),
    read: reader.readUInt8() !== 0,
    closed: reader.readUInt8() !== 0,
  };
}

function writeCustomerServiceTicket(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppCustomerServiceTicket>;
  writer.writeUInt32LE(ensureNumber(data.categoryId, `${context}.categoryId`));
  writer.writeUInt32LE(ensureNumber(data.subCategoryId, `${context}.subCategoryId`));
  writeArchiveString(writer, ensureString(data.characterName, `${context}.characterName`));
  writer.writeUnicodeStringWithLength(ensureString(data.details, `${context}.details`));
  writeArchiveString(writer, ensureString(data.language, `${context}.language`));
  writer.writeUInt32LE(ensureNumber(data.ticketId, `${context}.ticketId`));
  writer.writeInt64LE(ensureBigInt(data.modifiedDate, `${context}.modifiedDate`));
  writer.writeUInt8(ensureBoolean(data.read, `${context}.read`) ? 1 : 0);
  writer.writeUInt8(ensureBoolean(data.closed, `${context}.closed`) ? 1 : 0);
}

// --- CustomerServiceSearchResult ---

function readCustomerServiceSearchResult(reader: BufferReader): CppCustomerServiceSearchResult {
  return {
    title: reader.readUnicodeStringWithLength(),
    id: readArchiveString(reader),
    matchPercent: reader.readInt16LE(),
  };
}

function writeCustomerServiceSearchResult(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppCustomerServiceSearchResult>;
  writer.writeUnicodeStringWithLength(ensureString(data.title, `${context}.title`));
  writeArchiveString(writer, ensureString(data.id, `${context}.id`));
  writer.writeInt16LE(ensureNumber(data.matchPercent, `${context}.matchPercent`));
}

// --- MetricsPair ---

function readMetricsPair(reader: BufferReader): CppMetricsPair {
  return {
    label: readArchiveString(reader),
    value: reader.readInt32LE(),
    description: readArchiveString(reader),
    persistData: reader.readUInt8() !== 0,
    summary: reader.readUInt8() !== 0,
  };
}

function writeMetricsPair(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppMetricsPair>;
  writeArchiveString(writer, ensureString(data.label, `${context}.label`));
  writer.writeInt32LE(ensureNumber(data.value, `${context}.value`));
  writeArchiveString(writer, ensureString(data.description, `${context}.description`));
  writer.writeUInt8(ensureBoolean(data.persistData, `${context}.persistData`) ? 1 : 0);
  writer.writeUInt8(ensureBoolean(data.summary, `${context}.summary`) ? 1 : 0);
}

// --- AIPathInfo_NodeInfo ---

function readAIPathInfoNodeInfo(reader: BufferReader): CppAIPathInfoNodeInfo {
  return {
    node: reader.readInt32LE(),
    state: reader.readUInt8(),
  };
}

function writeAIPathInfoNodeInfo(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppAIPathInfoNodeInfo>;
  writer.writeInt32LE(ensureNumber(data.node, `${context}.node`));
  writer.writeUInt8(ensureNumber(data.state, `${context}.state`));
}

// --- AddResourceTypeMessageNamespace::ResourceTypeData ---

function readResourceTypeData(reader: BufferReader): CppResourceTypeData {
  const networkId = reader.readUInt64LE();
  const name = readArchiveString(reader);
  const depletedTimestamp = reader.readUInt32LE();
  const parentClass = readArchiveString(reader);
  const attrCount = reader.readInt32LE();
  const attributes: Array<[string, number]> = [];
  for (let i = 0; i < attrCount; i += 1) {
    attributes.push([readArchiveString(reader), reader.readInt32LE()]);
  }
  const seedCount = reader.readInt32LE();
  const fractalSeeds: Array<[bigint, number]> = [];
  for (let i = 0; i < seedCount; i += 1) {
    fractalSeeds.push([reader.readUInt64LE(), reader.readInt32LE()]);
  }
  return { networkId, name, depletedTimestamp, parentClass, attributes, fractalSeeds };
}

function writeResourceTypeData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppResourceTypeData>;
  writer.writeUInt64LE(ensureBigInt(data.networkId, `${context}.networkId`));
  writeArchiveString(writer, ensureString(data.name, `${context}.name`));
  writer.writeUInt32LE(ensureNumber(data.depletedTimestamp, `${context}.depletedTimestamp`));
  writeArchiveString(writer, ensureString(data.parentClass, `${context}.parentClass`));
  const attributes = ensureArray(data.attributes, `${context}.attributes`);
  writer.writeInt32LE(attributes.length);
  for (let i = 0; i < attributes.length; i += 1) {
    const pair = ensureArray(attributes[i], `${context}.attributes[${i}]`);
    writeArchiveString(writer, ensureString(pair[0], `${context}.attributes[${i}][0]`));
    writer.writeInt32LE(ensureNumber(pair[1], `${context}.attributes[${i}][1]`));
  }
  const fractalSeeds = ensureArray(data.fractalSeeds, `${context}.fractalSeeds`);
  writer.writeInt32LE(fractalSeeds.length);
  for (let i = 0; i < fractalSeeds.length; i += 1) {
    const pair = ensureArray(fractalSeeds[i], `${context}.fractalSeeds[${i}]`);
    writer.writeUInt64LE(ensureBigInt(pair[0], `${context}.fractalSeeds[${i}][0]`));
    writer.writeInt32LE(ensureNumber(pair[1], `${context}.fractalSeeds[${i}][1]`));
  }
}

// --- PlanetNodeStatusMessageData (nested AutoArray) ---

function readPlanetNodeStatusMessageData(reader: BufferReader): CppPlanetNodeStatusMessageData {
  const x = reader.readInt32LE();
  const z = reader.readInt32LE();
  const loaded = reader.readUInt8() !== 0;
  const serverCount = reader.readInt32LE();
  const servers: number[] = [];
  for (let i = 0; i < serverCount; i += 1) {
    servers.push(reader.readUInt32LE());
  }
  const subCount = reader.readInt32LE();
  const subscriptionCounts: number[] = [];
  for (let i = 0; i < subCount; i += 1) {
    subscriptionCounts.push(reader.readInt32LE());
  }
  return { x, z, loaded, servers, subscriptionCounts };
}

function writePlanetNodeStatusMessageData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppPlanetNodeStatusMessageData>;
  writer.writeInt32LE(ensureNumber(data.x, `${context}.x`));
  writer.writeInt32LE(ensureNumber(data.z, `${context}.z`));
  writer.writeUInt8(ensureBoolean(data.loaded, `${context}.loaded`) ? 1 : 0);
  const servers = ensureArray(data.servers, `${context}.servers`);
  writer.writeInt32LE(servers.length);
  for (let i = 0; i < servers.length; i += 1) {
    writer.writeUInt32LE(ensureNumber(servers[i], `${context}.servers[${i}]`));
  }
  const subscriptionCounts = ensureArray(data.subscriptionCounts, `${context}.subscriptionCounts`);
  writer.writeInt32LE(subscriptionCounts.length);
  for (let i = 0; i < subscriptionCounts.length; i += 1) {
    writer.writeInt32LE(ensureNumber(subscriptionCounts[i], `${context}.subscriptionCounts[${i}]`));
  }
}

// --- PlanetObjectStatusMessageData ---

function readPlanetObjectStatusMessageData(reader: BufferReader): CppPlanetObjectStatusMessageData {
  return {
    objectId: reader.readUInt64LE(),
    x: reader.readInt32LE(),
    z: reader.readInt32LE(),
    authoritativeServer: reader.readUInt32LE(),
    interestRadius: reader.readInt32LE(),
    deleteObject: reader.readInt32LE(),
    objectTypeTag: reader.readInt32LE(),
    level: reader.readInt32LE(),
    hibernating: reader.readUInt8() !== 0,
    templateCrc: reader.readUInt32LE(),
    aiActivity: reader.readInt32LE(),
    creationType: reader.readInt32LE(),
  };
}

function writePlanetObjectStatusMessageData(writer: BufferWriter, value: unknown, context: string): void {
  const data = ensureObject(value, context) as Partial<CppPlanetObjectStatusMessageData>;
  writer.writeUInt64LE(ensureBigInt(data.objectId, `${context}.objectId`));
  writer.writeInt32LE(ensureNumber(data.x, `${context}.x`));
  writer.writeInt32LE(ensureNumber(data.z, `${context}.z`));
  writer.writeUInt32LE(ensureNumber(data.authoritativeServer, `${context}.authoritativeServer`));
  writer.writeInt32LE(ensureNumber(data.interestRadius, `${context}.interestRadius`));
  writer.writeInt32LE(ensureNumber(data.deleteObject, `${context}.deleteObject`));
  writer.writeInt32LE(ensureNumber(data.objectTypeTag, `${context}.objectTypeTag`));
  writer.writeInt32LE(ensureNumber(data.level, `${context}.level`));
  writer.writeUInt8(ensureBoolean(data.hibernating, `${context}.hibernating`) ? 1 : 0);
  writer.writeUInt32LE(ensureNumber(data.templateCrc, `${context}.templateCrc`));
  writer.writeInt32LE(ensureNumber(data.aiActivity, `${context}.aiActivity`));
  writer.writeInt32LE(ensureNumber(data.creationType, `${context}.creationType`));
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
    'LoginEnumCluster::ClusterData': {
      read: readLoginEnumClusterData,
      write: writeLoginEnumClusterData,
    },
    'LoginClusterStatus::ClusterData': {
      read: readLoginClusterStatusData,
      write: writeLoginClusterStatusData,
    },
    'LoginClusterStatusEx::ClusterData': {
      read: readLoginClusterStatusExData,
      write: writeLoginClusterStatusExData,
    },
    MapLocation: {
      read: readMapLocation,
      write: writeMapLocation,
    },
    'SurveyMessage::DataItem': {
      read: readSurveyDataItem,
      write: writeSurveyDataItem,
    },
    'ResourceListForSurveyMessage::DataItem': {
      read: readResourceListDataItem,
      write: writeResourceListDataItem,
    },
    SearchCondition: {
      read: readSearchCondition,
      write: writeSearchCondition,
    },
    'AuctionQueryHeadersMessage::SearchCondition': {
      read: readSearchCondition,
      write: writeSearchCondition,
    },
    AuctionLocation: {
      read: readAuctionLocation,
      write: writeAuctionLocation,
    },
    MarketAuction: {
      read: readMarketAuction,
      write: writeMarketAuction,
    },
    MarketAuctionAttribute: {
      read: readMarketAuctionAttribute,
      write: writeMarketAuctionAttribute,
    },
    MarketAuctionBid: {
      read: readMarketAuctionBid,
      write: writeMarketAuctionBid,
    },
    'Auction::PalettizedItemDataHeader': {
      read: readPalettizedItemDataHeader,
      write: writePalettizedItemDataHeader,
    },
    AuctionData: {
      read: readAuctionQueryResponseData,
      write: writeAuctionQueryResponseData,
    },
    AttributePair: {
      read: readAttributePair,
      write: writeAttributePair,
    },
    BatchBaselinesMessageData: {
      read: readBatchBaselinesMessageData,
      write: writeBatchBaselinesMessageData,
    },
    CharacterListMessageData: {
      read: readCharacterListMessageData,
      write: writeCharacterListMessageData,
    },
    Chardata: {
      read: readChardata,
      write: writeChardata,
    },
    Chunk: {
      read: readChunk,
      write: writeChunk,
    },
    StructureListMessageData: {
      read: readStructureListMessageData,
      write: writeStructureListMessageData,
    },
    ChatLogEntry: {
      read: readChatLogEntry,
      write: writeChatLogEntry,
    },
    CustomerServiceCategory: {
      read: readCustomerServiceCategory,
      write: writeCustomerServiceCategory,
    },
    CustomerServiceComment: {
      read: readCustomerServiceComment,
      write: writeCustomerServiceComment,
    },
    CustomerServiceTicket: {
      read: readCustomerServiceTicket,
      write: writeCustomerServiceTicket,
    },
    CustomerServiceSearchResult: {
      read: readCustomerServiceSearchResult,
      write: writeCustomerServiceSearchResult,
    },
    MetricsPair: {
      read: readMetricsPair,
      write: writeMetricsPair,
    },
    AIPathInfo_NodeInfo: {
      read: readAIPathInfoNodeInfo,
      write: writeAIPathInfoNodeInfo,
    },
    'AddResourceTypeMessageNamespace::ResourceTypeData': {
      read: readResourceTypeData,
      write: writeResourceTypeData,
    },
    PlanetNodeStatusMessageData: {
      read: readPlanetNodeStatusMessageData,
      write: writePlanetNodeStatusMessageData,
    },
    PlanetObjectStatusMessageData: {
      read: readPlanetObjectStatusMessageData,
      write: writePlanetObjectStatusMessageData,
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
