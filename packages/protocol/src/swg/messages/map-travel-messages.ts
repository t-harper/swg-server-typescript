/**
 * SWG Map and Planetary Travel Messages
 * Protocol messages for map locations and planetary travel points
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * Map/Travel message opcodes (CRC32 of class name)
 */
export const MapTravelMessageOpcode = {
  GetMapLocationsMessage: 0xbc8d62a9,
  GetMapLocationsResponseMessage: 0xd1ba5146,
  AddMapLocationMessage: 0x3f664cba,
  AddMapLocationResponseMessage: 0x36c9044c,
  PlanetTravelPointListRequest: 0x7273bed3,
  PlanetTravelPointListResponse: 0x4158e271,
} as const;

export type MapTravelMessageOpcodeType =
  (typeof MapTravelMessageOpcode)[keyof typeof MapTravelMessageOpcode];

// ============================================
// MapLocation (data structure, not a standalone message)
// ============================================

/**
 * MapLocation flags
 */
export const MapLocationFlags = {
  Inactive: 0x0001,
  Active: 0x0002,
} as const;

/**
 * MapLocation - A location on the planetary map
 * Used by GetMapLocationsResponseMessage
 *
 * C++ fields (from MapLocationArchive.cpp pack/unpack order):
 *   locationId (NetworkId/int64) + locationName (Unicode) +
 *   location.x (float) + location.y (float) +
 *   category (uint8) + subCategory (uint8) + flags (uint8)
 */
export interface MapLocation {
  locationId: bigint;
  locationName: string;
  locationX: number;
  locationY: number;
  category: number;
  subCategory: number;
  flags: number;
}

/**
 * Read a MapLocation from a BufferReader
 * Follows C++ MapLocationArchive::get order
 */
export function readMapLocation(reader: BufferReader): MapLocation {
  const locationId = reader.readUInt64LE();
  const locationName = reader.readUnicodeStringWithLength();
  const locationX = reader.readFloatLE();
  const locationY = reader.readFloatLE();
  const category = reader.readUInt8();
  const subCategory = reader.readUInt8();
  const flags = reader.readUInt8();
  return {
    locationId,
    locationName,
    locationX,
    locationY,
    category,
    subCategory,
    flags,
  };
}

/**
 * Write a MapLocation to a BufferWriter
 * Follows C++ MapLocationArchive::put order
 */
export function writeMapLocation(writer: BufferWriter, loc: MapLocation): void {
  writer.writeUInt64LE(loc.locationId);
  writer.writeUnicodeStringWithLength(loc.locationName);
  writer.writeFloatLE(loc.locationX);
  writer.writeFloatLE(loc.locationY);
  writer.writeUInt8(loc.category);
  writer.writeUInt8(loc.subCategory);
  writer.writeUInt8(loc.flags);
}

// ============================================
// GetMapLocationsMessage (0xBC8D62A9)
// ============================================

/**
 * GetMapLocationsMessage - Client requests map locations for a planet
 *
 * C++ addVariable order:
 *   planetName (string) + cacheVersionStatic (int) +
 *   cacheVersionDynamic (int) + cacheVersionPersist (int)
 */
export interface GetMapLocationsMessage {
  opcode: typeof MapTravelMessageOpcode.GetMapLocationsMessage;
  planetName: string;
  cacheVersionStatic: number;
  cacheVersionDynamic: number;
  cacheVersionPersist: number;
}

/**
 * Serialize GetMapLocationsMessage
 */
export function serializeGetMapLocationsMessage(message: GetMapLocationsMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.planetName);
  writer.writeInt32LE(message.cacheVersionStatic);
  writer.writeInt32LE(message.cacheVersionDynamic);
  writer.writeInt32LE(message.cacheVersionPersist);
  return writer.toBuffer();
}

/**
 * Deserialize GetMapLocationsMessage
 */
export function deserializeGetMapLocationsMessage(data: Uint8Array): GetMapLocationsMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== MapTravelMessageOpcode.GetMapLocationsMessage) {
    throw new Error(`Invalid opcode for GetMapLocationsMessage: 0x${opcode.toString(16)}`);
  }
  const planetName = reader.readStringWithLength16LE();
  const cacheVersionStatic = reader.readInt32LE();
  const cacheVersionDynamic = reader.readInt32LE();
  const cacheVersionPersist = reader.readInt32LE();
  return {
    opcode: MapTravelMessageOpcode.GetMapLocationsMessage,
    planetName,
    cacheVersionStatic,
    cacheVersionDynamic,
    cacheVersionPersist,
  };
}

/**
 * Create a GetMapLocationsMessage
 */
export function createGetMapLocationsMessage(
  planetName: string,
  cacheVersionStatic: number = 0,
  cacheVersionDynamic: number = 0,
  cacheVersionPersist: number = 0
): GetMapLocationsMessage {
  return {
    opcode: MapTravelMessageOpcode.GetMapLocationsMessage,
    planetName,
    cacheVersionStatic,
    cacheVersionDynamic,
    cacheVersionPersist,
  };
}

// ============================================
// GetMapLocationsResponseMessage (0xD1BA5146)
// ============================================

/**
 * GetMapLocationsResponseMessage - Server responds with map locations
 *
 * C++ addVariable order:
 *   planetName (string) + mapLocationsStatic (AutoArray<MapLocation>) +
 *   mapLocationsDynamic (AutoArray<MapLocation>) + mapLocationsPersist (AutoArray<MapLocation>) +
 *   versionStatic (int) + versionDynamic (int) + versionPersist (int)
 */
export interface GetMapLocationsResponseMessage {
  opcode: typeof MapTravelMessageOpcode.GetMapLocationsResponseMessage;
  planetName: string;
  mapLocationsStatic: MapLocation[];
  mapLocationsDynamic: MapLocation[];
  mapLocationsPersist: MapLocation[];
  versionStatic: number;
  versionDynamic: number;
  versionPersist: number;
}

/**
 * Serialize GetMapLocationsResponseMessage
 */
export function serializeGetMapLocationsResponseMessage(
  message: GetMapLocationsResponseMessage
): Uint8Array {
  const writer = new BufferWriter(4096);
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.planetName);

  // AutoArray<MapLocation> - static
  writer.writeUInt32LE(message.mapLocationsStatic.length);
  for (const loc of message.mapLocationsStatic) {
    writeMapLocation(writer, loc);
  }

  // AutoArray<MapLocation> - dynamic
  writer.writeUInt32LE(message.mapLocationsDynamic.length);
  for (const loc of message.mapLocationsDynamic) {
    writeMapLocation(writer, loc);
  }

  // AutoArray<MapLocation> - persist
  writer.writeUInt32LE(message.mapLocationsPersist.length);
  for (const loc of message.mapLocationsPersist) {
    writeMapLocation(writer, loc);
  }

  writer.writeInt32LE(message.versionStatic);
  writer.writeInt32LE(message.versionDynamic);
  writer.writeInt32LE(message.versionPersist);
  return writer.toBuffer();
}

/**
 * Deserialize GetMapLocationsResponseMessage
 */
export function deserializeGetMapLocationsResponseMessage(
  data: Uint8Array
): GetMapLocationsResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== MapTravelMessageOpcode.GetMapLocationsResponseMessage) {
    throw new Error(
      `Invalid opcode for GetMapLocationsResponseMessage: 0x${opcode.toString(16)}`
    );
  }
  const planetName = reader.readStringWithLength16LE();

  // AutoArray<MapLocation> - static
  const staticCount = reader.readUInt32LE();
  const mapLocationsStatic: MapLocation[] = [];
  for (let i = 0; i < staticCount; i++) {
    mapLocationsStatic.push(readMapLocation(reader));
  }

  // AutoArray<MapLocation> - dynamic
  const dynamicCount = reader.readUInt32LE();
  const mapLocationsDynamic: MapLocation[] = [];
  for (let i = 0; i < dynamicCount; i++) {
    mapLocationsDynamic.push(readMapLocation(reader));
  }

  // AutoArray<MapLocation> - persist
  const persistCount = reader.readUInt32LE();
  const mapLocationsPersist: MapLocation[] = [];
  for (let i = 0; i < persistCount; i++) {
    mapLocationsPersist.push(readMapLocation(reader));
  }

  const versionStatic = reader.readInt32LE();
  const versionDynamic = reader.readInt32LE();
  const versionPersist = reader.readInt32LE();

  return {
    opcode: MapTravelMessageOpcode.GetMapLocationsResponseMessage,
    planetName,
    mapLocationsStatic,
    mapLocationsDynamic,
    mapLocationsPersist,
    versionStatic,
    versionDynamic,
    versionPersist,
  };
}

/**
 * Create a GetMapLocationsResponseMessage
 */
export function createGetMapLocationsResponseMessage(
  planetName: string,
  mapLocationsStatic: MapLocation[] = [],
  mapLocationsDynamic: MapLocation[] = [],
  mapLocationsPersist: MapLocation[] = [],
  versionStatic: number = 0,
  versionDynamic: number = 0,
  versionPersist: number = 0
): GetMapLocationsResponseMessage {
  return {
    opcode: MapTravelMessageOpcode.GetMapLocationsResponseMessage,
    planetName,
    mapLocationsStatic,
    mapLocationsDynamic,
    mapLocationsPersist,
    versionStatic,
    versionDynamic,
    versionPersist,
  };
}

// ============================================
// AddMapLocationMessage (0x3F664CBA)
// ============================================

/**
 * AddMapLocationMessage - Client requests to add a map location
 *
 * C++ addVariable order:
 *   planetName (string) + locationId (NetworkId) + locationName (Unicode) +
 *   locationX (float) + locationY (float) + category (uint8) + subCategory (uint8)
 */
export interface AddMapLocationMessage {
  opcode: typeof MapTravelMessageOpcode.AddMapLocationMessage;
  planetName: string;
  locationId: bigint;
  locationName: string;
  locationX: number;
  locationY: number;
  category: number;
  subCategory: number;
}

/**
 * Serialize AddMapLocationMessage
 */
export function serializeAddMapLocationMessage(message: AddMapLocationMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.planetName);
  writer.writeUInt64LE(message.locationId);
  writer.writeUnicodeStringWithLength(message.locationName);
  writer.writeFloatLE(message.locationX);
  writer.writeFloatLE(message.locationY);
  writer.writeUInt8(message.category);
  writer.writeUInt8(message.subCategory);
  return writer.toBuffer();
}

/**
 * Deserialize AddMapLocationMessage
 */
export function deserializeAddMapLocationMessage(data: Uint8Array): AddMapLocationMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== MapTravelMessageOpcode.AddMapLocationMessage) {
    throw new Error(`Invalid opcode for AddMapLocationMessage: 0x${opcode.toString(16)}`);
  }
  const planetName = reader.readStringWithLength16LE();
  const locationId = reader.readUInt64LE();
  const locationName = reader.readUnicodeStringWithLength();
  const locationX = reader.readFloatLE();
  const locationY = reader.readFloatLE();
  const category = reader.readUInt8();
  const subCategory = reader.readUInt8();
  return {
    opcode: MapTravelMessageOpcode.AddMapLocationMessage,
    planetName,
    locationId,
    locationName,
    locationX,
    locationY,
    category,
    subCategory,
  };
}

/**
 * Create an AddMapLocationMessage
 */
export function createAddMapLocationMessage(
  planetName: string,
  locationId: bigint,
  locationName: string,
  locationX: number,
  locationY: number,
  category: number,
  subCategory: number
): AddMapLocationMessage {
  return {
    opcode: MapTravelMessageOpcode.AddMapLocationMessage,
    planetName,
    locationId,
    locationName,
    locationX,
    locationY,
    category,
    subCategory,
  };
}

// ============================================
// AddMapLocationResponseMessage (0x36C9044C)
// ============================================

/**
 * AddMapLocationResponseMessage - Server responds to add map location request
 *
 * C++ addVariable order:
 *   locationId (NetworkId)
 */
export interface AddMapLocationResponseMessage {
  opcode: typeof MapTravelMessageOpcode.AddMapLocationResponseMessage;
  locationId: bigint;
}

/**
 * Serialize AddMapLocationResponseMessage
 */
export function serializeAddMapLocationResponseMessage(
  message: AddMapLocationResponseMessage
): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.locationId);
  return writer.toBuffer();
}

/**
 * Deserialize AddMapLocationResponseMessage
 */
export function deserializeAddMapLocationResponseMessage(
  data: Uint8Array
): AddMapLocationResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== MapTravelMessageOpcode.AddMapLocationResponseMessage) {
    throw new Error(
      `Invalid opcode for AddMapLocationResponseMessage: 0x${opcode.toString(16)}`
    );
  }
  const locationId = reader.readUInt64LE();
  return {
    opcode: MapTravelMessageOpcode.AddMapLocationResponseMessage,
    locationId,
  };
}

/**
 * Create an AddMapLocationResponseMessage
 */
export function createAddMapLocationResponseMessage(
  locationId: bigint
): AddMapLocationResponseMessage {
  return {
    opcode: MapTravelMessageOpcode.AddMapLocationResponseMessage,
    locationId,
  };
}

// ============================================
// PlanetTravelPointListRequest (0x7273BED3)
// ============================================

/**
 * PlanetTravelPointListRequest - Client requests travel point list for a planet
 *
 * C++ addVariable order:
 *   networkId (NetworkId) + planetName (string)
 * NOTE: m_sequenceId is commented out in C++ - NOT on wire
 */
export interface PlanetTravelPointListRequest {
  opcode: typeof MapTravelMessageOpcode.PlanetTravelPointListRequest;
  networkId: bigint;
  planetName: string;
}

/**
 * Serialize PlanetTravelPointListRequest
 */
export function serializePlanetTravelPointListRequest(
  message: PlanetTravelPointListRequest
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.networkId);
  writer.writeStringWithLength16LE(message.planetName);
  return writer.toBuffer();
}

/**
 * Deserialize PlanetTravelPointListRequest
 */
export function deserializePlanetTravelPointListRequest(
  data: Uint8Array
): PlanetTravelPointListRequest {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== MapTravelMessageOpcode.PlanetTravelPointListRequest) {
    throw new Error(
      `Invalid opcode for PlanetTravelPointListRequest: 0x${opcode.toString(16)}`
    );
  }
  const networkId = reader.readUInt64LE();
  const planetName = reader.readStringWithLength16LE();
  return {
    opcode: MapTravelMessageOpcode.PlanetTravelPointListRequest,
    networkId,
    planetName,
  };
}

/**
 * Create a PlanetTravelPointListRequest
 */
export function createPlanetTravelPointListRequest(
  networkId: bigint,
  planetName: string
): PlanetTravelPointListRequest {
  return {
    opcode: MapTravelMessageOpcode.PlanetTravelPointListRequest,
    networkId,
    planetName,
  };
}

// ============================================
// PlanetTravelPointListResponse (0x4158E271)
// ============================================

/**
 * A travel point position (Vector: x, y, z)
 */
export interface TravelPointPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * PlanetTravelPointListResponse - Server responds with travel points for a planet
 *
 * C++ addVariable order:
 *   planetName (string) + travelPointNameList (AutoArray<string>) +
 *   travelPointPointList (AutoArray<Vector>) + travelPointCostList (AutoArray<int>) +
 *   travelPointInterplanetaryList (AutoArray<bool>)
 * NOTE: m_sequenceId is commented out in C++ - NOT on wire
 */
export interface PlanetTravelPointListResponse {
  opcode: typeof MapTravelMessageOpcode.PlanetTravelPointListResponse;
  planetName: string;
  travelPointNameList: string[];
  travelPointPointList: TravelPointPosition[];
  travelPointCostList: number[];
  travelPointInterplanetaryList: boolean[];
}

/**
 * Serialize PlanetTravelPointListResponse
 */
export function serializePlanetTravelPointListResponse(
  message: PlanetTravelPointListResponse
): Uint8Array {
  const writer = new BufferWriter(4096);
  writer.writeUInt16LE(6); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.planetName);

  // AutoArray<string> - travel point names
  writer.writeUInt32LE(message.travelPointNameList.length);
  for (const name of message.travelPointNameList) {
    writer.writeStringWithLength16LE(name);
  }

  // AutoArray<Vector> - travel point positions (x, y, z floats)
  writer.writeUInt32LE(message.travelPointPointList.length);
  for (const pos of message.travelPointPointList) {
    writer.writeFloatLE(pos.x);
    writer.writeFloatLE(pos.y);
    writer.writeFloatLE(pos.z);
  }

  // AutoArray<int> - travel point costs
  writer.writeUInt32LE(message.travelPointCostList.length);
  for (const cost of message.travelPointCostList) {
    writer.writeInt32LE(cost);
  }

  // AutoArray<bool> - interplanetary flags
  writer.writeUInt32LE(message.travelPointInterplanetaryList.length);
  for (const flag of message.travelPointInterplanetaryList) {
    writer.writeUInt8(flag ? 1 : 0);
  }

  return writer.toBuffer();
}

/**
 * Deserialize PlanetTravelPointListResponse
 */
export function deserializePlanetTravelPointListResponse(
  data: Uint8Array
): PlanetTravelPointListResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== MapTravelMessageOpcode.PlanetTravelPointListResponse) {
    throw new Error(
      `Invalid opcode for PlanetTravelPointListResponse: 0x${opcode.toString(16)}`
    );
  }
  const planetName = reader.readStringWithLength16LE();

  // AutoArray<string> - travel point names
  const nameCount = reader.readUInt32LE();
  const travelPointNameList: string[] = [];
  for (let i = 0; i < nameCount; i++) {
    travelPointNameList.push(reader.readStringWithLength16LE());
  }

  // AutoArray<Vector> - travel point positions (x, y, z floats)
  const posCount = reader.readUInt32LE();
  const travelPointPointList: TravelPointPosition[] = [];
  for (let i = 0; i < posCount; i++) {
    const x = reader.readFloatLE();
    const y = reader.readFloatLE();
    const z = reader.readFloatLE();
    travelPointPointList.push({ x, y, z });
  }

  // AutoArray<int> - travel point costs
  const costCount = reader.readUInt32LE();
  const travelPointCostList: number[] = [];
  for (let i = 0; i < costCount; i++) {
    travelPointCostList.push(reader.readInt32LE());
  }

  // AutoArray<bool> - interplanetary flags
  const flagCount = reader.readUInt32LE();
  const travelPointInterplanetaryList: boolean[] = [];
  for (let i = 0; i < flagCount; i++) {
    travelPointInterplanetaryList.push(reader.readUInt8() !== 0);
  }

  return {
    opcode: MapTravelMessageOpcode.PlanetTravelPointListResponse,
    planetName,
    travelPointNameList,
    travelPointPointList,
    travelPointCostList,
    travelPointInterplanetaryList,
  };
}

/**
 * Create a PlanetTravelPointListResponse
 */
export function createPlanetTravelPointListResponse(
  planetName: string,
  travelPointNameList: string[] = [],
  travelPointPointList: TravelPointPosition[] = [],
  travelPointCostList: number[] = [],
  travelPointInterplanetaryList: boolean[] = []
): PlanetTravelPointListResponse {
  return {
    opcode: MapTravelMessageOpcode.PlanetTravelPointListResponse,
    planetName,
    travelPointNameList,
    travelPointPointList,
    travelPointCostList,
    travelPointInterplanetaryList,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all map/travel messages
 */
export type MapTravelMessage =
  | GetMapLocationsMessage
  | GetMapLocationsResponseMessage
  | AddMapLocationMessage
  | AddMapLocationResponseMessage
  | PlanetTravelPointListRequest
  | PlanetTravelPointListResponse;

/**
 * Get the opcode from raw map/travel message data
 */
export function getMapTravelMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid map/travel message opcode
 */
export function isMapTravelMessageOpcode(
  opcode: number
): opcode is MapTravelMessageOpcodeType {
  return Object.values(MapTravelMessageOpcode).includes(
    opcode as MapTravelMessageOpcodeType
  );
}
