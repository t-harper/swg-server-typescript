/**
 * Collection, Droid Programming, Survey, Waypoint, and Combat Damage
 * Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageType:
 *   - CM_collectionServerFirst   - Server->Client (collection first completion announcement)
 *   - CM_droidCommandProgramming - Server->Client (droid programmable commands)
 *   - CM_resourceSurveyRequest   - Client->Server (request resource survey)
 *   - CM_resourceSurveyResponse  - Server->Client (survey results)
 *   - CM_createWaypointAtPosition - Client->Server (create waypoint)
 *   - CM_combatDamage            - Server->Client (detailed combat damage)
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueCollectionServerFirst.cpp
 *   MessageQueueDroidCommand.cpp
 *   MessageQueueResourceSurvey.cpp
 *   MessageQueueCreateWaypoint.cpp
 *   MessageQueueCombatDamage.cpp
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CM_collectionServerFirst - Collection First Completion
// ============================================

/**
 * CollectionServerFirstMessage - Announces to the server that a player
 * completed a collection first (server-wide first completion).
 *
 * Wire format:
 *   string   collectionName  (ASCII u16LE length-prefixed)
 *   u64      playerId        (NetworkId)
 *   Unicode  playerName      (Unicode u32LE char count)
 */
export interface CollectionServerFirstMessage {
  /** Name of the collection that was completed first (ASCII) */
  collectionName: string;
  /** NetworkId of the player who completed the collection (u64) */
  playerId: bigint;
  /** Display name of the player (Unicode) */
  playerName: string;
}

/**
 * Serialize a CollectionServerFirstMessage payload to wire format.
 *
 * Pack order:
 *   string   collectionName
 *   u64      playerId
 *   Unicode  playerName
 */
export function serializeCollectionServerFirst(
  msg: CollectionServerFirstMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeStringWithLength16LE(msg.collectionName);  // string
  writer.writeUInt64LE(msg.playerId);                    // u64 NetworkId
  writer.writeUnicodeStringWithLength(msg.playerName);   // Unicode

  return writer.toBuffer();
}

/**
 * Deserialize a CollectionServerFirstMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCollectionServerFirst(
  data: Uint8Array,
  offset: number = 0
): CollectionServerFirstMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const collectionName = reader.readStringWithLength16LE();  // string
  const playerId = reader.readUInt64LE();                    // u64 NetworkId
  const playerName = reader.readUnicodeStringWithLength();   // Unicode

  return { collectionName, playerId, playerName };
}

/**
 * Create a CollectionServerFirstMessage.
 *
 * @param collectionName - Name of the collection completed first
 * @param playerId       - NetworkId of the completing player
 * @param playerName     - Display name of the completing player
 */
export function createCollectionServerFirst(
  collectionName: string,
  playerId: bigint,
  playerName: string
): CollectionServerFirstMessage {
  return { collectionName, playerId, playerName };
}

// ============================================
// Droid Command Programming
// ============================================

/**
 * DroidCommand - A single droid command entry with CRC and name.
 */
export interface DroidCommand {
  /** CRC identifier for the command (u32) */
  commandCrc: number;
  /** Human-readable command name (ASCII) */
  commandName: string;
}

/**
 * DroidCommandProgrammingMessage - Server sends the list of available
 * programmable commands for a droid.
 *
 * Wire format:
 *   u64  droidId       (NetworkId)
 *   u32  commandCount
 *   for each command:
 *     u32     commandCrc
 *     string  commandName  (ASCII u16LE length-prefixed)
 */
export interface DroidCommandProgrammingMessage {
  /** NetworkId of the droid being programmed (u64) */
  droidId: bigint;
  /** List of available droid commands */
  commands: DroidCommand[];
}

/**
 * Serialize a DroidCommandProgrammingMessage payload to wire format.
 *
 * Pack order:
 *   u64  droidId
 *   u32  commandCount
 *   for each command:
 *     u32     commandCrc
 *     string  commandName
 */
export function serializeDroidCommandProgramming(
  msg: DroidCommandProgrammingMessage
): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt64LE(msg.droidId);               // u64 NetworkId
  writer.writeUInt32LE(msg.commands.length);        // u32 commandCount

  for (const cmd of msg.commands) {
    writer.writeUInt32LE(cmd.commandCrc);                   // u32
    writer.writeStringWithLength16LE(cmd.commandName);      // string
  }

  return writer.toBuffer();
}

/**
 * Deserialize a DroidCommandProgrammingMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeDroidCommandProgramming(
  data: Uint8Array,
  offset: number = 0
): DroidCommandProgrammingMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const droidId = reader.readUInt64LE();             // u64 NetworkId
  const commandCount = reader.readUInt32LE();        // u32

  const commands: DroidCommand[] = [];
  for (let i = 0; i < commandCount; i++) {
    const commandCrc = reader.readUInt32LE();                  // u32
    const commandName = reader.readStringWithLength16LE();     // string
    commands.push({ commandCrc, commandName });
  }

  return { droidId, commands };
}

/**
 * Create a DroidCommandProgrammingMessage.
 *
 * @param droidId  - NetworkId of the droid
 * @param commands - List of available droid commands
 */
export function createDroidCommandProgramming(
  droidId: bigint,
  commands: DroidCommand[] = []
): DroidCommandProgrammingMessage {
  return { droidId, commands };
}

// ============================================
// Resource Survey Request
// ============================================

/**
 * ResourceSurveyRequestMessage - Client requests a resource survey for
 * a specific resource type.
 *
 * Wire format:
 *   u32  resourceTypeCrc
 */
export interface ResourceSurveyRequestMessage {
  /** CRC of the resource type to survey (u32) */
  resourceTypeCrc: number;
}

/**
 * Serialize a ResourceSurveyRequestMessage payload to wire format.
 *
 * Wire format:
 *   u32  resourceTypeCrc
 */
export function serializeResourceSurveyRequest(
  msg: ResourceSurveyRequestMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeUInt32LE(msg.resourceTypeCrc);  // u32
  return writer.toBuffer();
}

/**
 * Deserialize a ResourceSurveyRequestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceSurveyRequest(
  data: Uint8Array,
  offset: number = 0
): ResourceSurveyRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const resourceTypeCrc = reader.readUInt32LE();  // u32

  return { resourceTypeCrc };
}

/**
 * Create a ResourceSurveyRequestMessage.
 *
 * @param resourceTypeCrc - CRC of the resource type to survey
 */
export function createResourceSurveyRequest(
  resourceTypeCrc: number
): ResourceSurveyRequestMessage {
  return { resourceTypeCrc };
}

// ============================================
// Resource Survey Response
// ============================================

/**
 * ResourceSurveyPoint - A single survey data point with position and density.
 */
export interface ResourceSurveyPoint {
  /** World X coordinate (f32) */
  x: number;
  /** World Z coordinate (f32) */
  z: number;
  /** Resource density at this point, 0.0 to 1.0 (f32) */
  density: number;
}

/**
 * ResourceSurveyResponseMessage - Server responds with resource survey data
 * containing density readings at various positions.
 *
 * Wire format:
 *   u32  resourceCount
 *   for each resource point:
 *     f32  x
 *     f32  z
 *     f32  density
 */
export interface ResourceSurveyResponseMessage {
  /** Array of survey data points */
  resources: ResourceSurveyPoint[];
}

/**
 * Serialize a ResourceSurveyResponseMessage payload to wire format.
 *
 * Pack order:
 *   u32  resourceCount
 *   for each:
 *     f32  x
 *     f32  z
 *     f32  density
 */
export function serializeResourceSurveyResponse(
  msg: ResourceSurveyResponseMessage
): Uint8Array {
  // 4 (count) + 12 * resources.length
  const writer = new BufferWriter(4 + 12 * msg.resources.length);

  writer.writeUInt32LE(msg.resources.length);  // u32 resourceCount

  for (const point of msg.resources) {
    writer.writeFloatLE(point.x);        // f32
    writer.writeFloatLE(point.z);        // f32
    writer.writeFloatLE(point.density);  // f32
  }

  return writer.toBuffer();
}

/**
 * Deserialize a ResourceSurveyResponseMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceSurveyResponse(
  data: Uint8Array,
  offset: number = 0
): ResourceSurveyResponseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const resourceCount = reader.readUInt32LE();  // u32

  const resources: ResourceSurveyPoint[] = [];
  for (let i = 0; i < resourceCount; i++) {
    const x = reader.readFloatLE();        // f32
    const z = reader.readFloatLE();        // f32
    const density = reader.readFloatLE();  // f32
    resources.push({ x, z, density });
  }

  return { resources };
}

/**
 * Create a ResourceSurveyResponseMessage.
 *
 * @param resources - Array of survey data points
 */
export function createResourceSurveyResponse(
  resources: ResourceSurveyPoint[] = []
): ResourceSurveyResponseMessage {
  return { resources };
}

// ============================================
// Create Waypoint at Position
// ============================================

/**
 * CreateWaypointAtPositionMessage - Client requests creation of a waypoint
 * at a specific world position.
 *
 * Wire format:
 *   f32      x       (world X coordinate)
 *   f32      y       (world Y coordinate)
 *   f32      z       (world Z coordinate)
 *   Unicode  name    (waypoint display name, Unicode u32LE char count)
 *   string   planet  (planet/scene name, ASCII u16LE length-prefixed)
 */
export interface CreateWaypointAtPositionMessage {
  /** World X coordinate (f32) */
  x: number;
  /** World Y coordinate (f32) */
  y: number;
  /** World Z coordinate (f32) */
  z: number;
  /** Display name for the waypoint (Unicode) */
  name: string;
  /** Planet/scene name (ASCII) */
  planet: string;
}

/**
 * Serialize a CreateWaypointAtPositionMessage payload to wire format.
 *
 * Pack order:
 *   f32      x
 *   f32      y
 *   f32      z
 *   Unicode  name
 *   string   planet
 */
export function serializeCreateWaypointAtPosition(
  msg: CreateWaypointAtPositionMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeFloatLE(msg.x);                            // f32
  writer.writeFloatLE(msg.y);                            // f32
  writer.writeFloatLE(msg.z);                            // f32
  writer.writeUnicodeStringWithLength(msg.name);         // Unicode
  writer.writeStringWithLength16LE(msg.planet);          // string

  return writer.toBuffer();
}

/**
 * Deserialize a CreateWaypointAtPositionMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCreateWaypointAtPosition(
  data: Uint8Array,
  offset: number = 0
): CreateWaypointAtPositionMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const x = reader.readFloatLE();                            // f32
  const y = reader.readFloatLE();                            // f32
  const z = reader.readFloatLE();                            // f32
  const name = reader.readUnicodeStringWithLength();         // Unicode
  const planet = reader.readStringWithLength16LE();          // string

  return { x, y, z, name, planet };
}

/**
 * Create a CreateWaypointAtPositionMessage.
 *
 * @param x      - World X coordinate
 * @param y      - World Y coordinate
 * @param z      - World Z coordinate
 * @param name   - Display name for the waypoint
 * @param planet - Planet/scene name
 */
export function createCreateWaypointAtPosition(
  x: number,
  y: number,
  z: number,
  name: string,
  planet: string
): CreateWaypointAtPositionMessage {
  return { x, y, z, name, planet };
}

// ============================================
// CM_combatDamage - Combat Damage Detail
// ============================================

/**
 * CombatDamageMessage - Detailed combat damage information sent from
 * the server, including attacker, weapon, hit location, and damage breakdown.
 *
 * Wire format:
 *   u64  attackerId       (NetworkId)
 *   u64  weaponId         (NetworkId)
 *   u8   hitLocation
 *   i32  rawDamage
 *   i32  elementalType
 *   i32  elementalDamage
 *   i32  bleedDamage
 */
export interface CombatDamageMessage {
  /** NetworkId of the attacker (u64) */
  attackerId: bigint;
  /** NetworkId of the weapon used (u64) */
  weaponId: bigint;
  /** Body hit location index (u8) */
  hitLocation: number;
  /** Raw damage before mitigation (i32) */
  rawDamage: number;
  /** Elemental damage type identifier (i32) */
  elementalType: number;
  /** Elemental damage amount (i32) */
  elementalDamage: number;
  /** Bleed/DoT damage amount (i32) */
  bleedDamage: number;
}

/**
 * Serialize a CombatDamageMessage payload to wire format.
 *
 * Pack order:
 *   u64  attackerId
 *   u64  weaponId
 *   u8   hitLocation
 *   i32  rawDamage
 *   i32  elementalType
 *   i32  elementalDamage
 *   i32  bleedDamage
 */
export function serializeCombatDamage(msg: CombatDamageMessage): Uint8Array {
  // 8 + 8 + 1 + 4 + 4 + 4 + 4 = 33 bytes
  const writer = new BufferWriter(33);

  writer.writeUInt64LE(msg.attackerId);       // u64 NetworkId
  writer.writeUInt64LE(msg.weaponId);         // u64 NetworkId
  writer.writeUInt8(msg.hitLocation);         // u8
  writer.writeInt32LE(msg.rawDamage);         // i32
  writer.writeInt32LE(msg.elementalType);     // i32
  writer.writeInt32LE(msg.elementalDamage);   // i32
  writer.writeInt32LE(msg.bleedDamage);       // i32

  return writer.toBuffer();
}

/**
 * Deserialize a CombatDamageMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCombatDamage(
  data: Uint8Array,
  offset: number = 0
): CombatDamageMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const attackerId = reader.readUInt64LE();       // u64 NetworkId
  const weaponId = reader.readUInt64LE();         // u64 NetworkId
  const hitLocation = reader.readUInt8();         // u8
  const rawDamage = reader.readInt32LE();         // i32
  const elementalType = reader.readInt32LE();     // i32
  const elementalDamage = reader.readInt32LE();   // i32
  const bleedDamage = reader.readInt32LE();       // i32

  return {
    attackerId,
    weaponId,
    hitLocation,
    rawDamage,
    elementalType,
    elementalDamage,
    bleedDamage,
  };
}

/**
 * Create a CombatDamageMessage.
 *
 * @param attackerId     - NetworkId of the attacker
 * @param weaponId       - NetworkId of the weapon used
 * @param rawDamage      - Raw damage before mitigation
 * @param hitLocation    - Body hit location index (default 0)
 * @param elementalType  - Elemental damage type (default 0)
 * @param elementalDamage - Elemental damage amount (default 0)
 * @param bleedDamage    - Bleed/DoT damage amount (default 0)
 */
export function createCombatDamage(
  attackerId: bigint,
  weaponId: bigint,
  rawDamage: number,
  hitLocation: number = 0,
  elementalType: number = 0,
  elementalDamage: number = 0,
  bleedDamage: number = 0
): CombatDamageMessage {
  return {
    attackerId,
    weaponId,
    hitLocation,
    rawDamage,
    elementalType,
    elementalDamage,
    bleedDamage,
  };
}
