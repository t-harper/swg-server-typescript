/**
 * City and Guild Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with city, guild, and GCW-related messageTypes.
 *
 * City Commands:
 *   - CityCreate           - Create a new player city
 *   - CitySetName          - Rename a player city
 *   - CityInfo             - Full city info snapshot
 *   - CityRequest          - Generic city request (single cityId)
 *   - CityResponse         - Generic city response (cityId + result)
 *
 * Guild Commands:
 *   - GuildCreate          - Create a new guild
 *   - GuildRemoveMember    - Remove a member from a guild
 *   - GuildDisbandGuild    - Disband a guild (no payload)
 *   - GuildSetLeader       - Transfer guild leadership
 *   - GuildInviteMember    - Invite a player to a guild
 *   - GuildInviteAccept    - Accept a guild invitation (no payload)
 *   - GuildInviteDecline   - Decline a guild invitation (no payload)
 *
 * GCW Commands:
 *   - ModifyCurrentGcwPoints  - Modify GCW points by a value
 *   - ModifyCurrentGcwRating  - Modify GCW rating by a value
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CityCreate
// ============================================

/**
 * CityCreate - Create a new player city
 *
 * Wire format:
 *   string  cityName  (ASCII u16LE length-prefixed)
 *   f32     x
 *   f32     y
 *   f32     z
 *   u64     hallId    (NetworkId of the city hall)
 *   string  planet    (ASCII u16LE length-prefixed)
 */
export interface CityCreateMessage {
  /** Name of the city (ASCII) */
  cityName: string;
  /** X coordinate (f32) */
  x: number;
  /** Y coordinate (f32) */
  y: number;
  /** Z coordinate (f32) */
  z: number;
  /** NetworkId of the city hall (u64) */
  hallId: bigint;
  /** Planet name (ASCII) */
  planet: string;
}

/**
 * Serialize a CityCreate payload to wire format.
 * Writes fields in order: cityName, x, y, z, hallId, planet
 */
export function serializeCityCreate(msg: CityCreateMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeStringWithLength16LE(msg.cityName);  // string
  writer.writeFloatLE(msg.x);                      // f32
  writer.writeFloatLE(msg.y);                      // f32
  writer.writeFloatLE(msg.z);                      // f32
  writer.writeUInt64LE(msg.hallId);                // NetworkId
  writer.writeStringWithLength16LE(msg.planet);    // string
  return writer.toBuffer();
}

/**
 * Deserialize a CityCreate payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCityCreate(
  data: Uint8Array,
  offset: number = 0
): CityCreateMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const cityName = reader.readStringWithLength16LE();  // string
  const x = reader.readFloatLE();                      // f32
  const y = reader.readFloatLE();                      // f32
  const z = reader.readFloatLE();                      // f32
  const hallId = reader.readUInt64LE();                // NetworkId
  const planet = reader.readStringWithLength16LE();    // string

  return { cityName, x, y, z, hallId, planet };
}

/**
 * Create a CityCreate payload.
 *
 * @param cityName - Name of the city
 * @param x        - X coordinate
 * @param y        - Y coordinate
 * @param z        - Z coordinate
 * @param hallId   - NetworkId of the city hall
 * @param planet   - Planet name
 */
export function createCityCreate(
  cityName: string,
  x: number,
  y: number,
  z: number,
  hallId: bigint,
  planet: string
): CityCreateMessage {
  return { cityName, x, y, z, hallId, planet };
}

// ============================================
// CitySetName
// ============================================

/**
 * CitySetName - Rename a player city
 *
 * Wire format:
 *   string  cityName  (ASCII u16LE length-prefixed)
 */
export interface CitySetNameMessage {
  /** New city name (ASCII) */
  cityName: string;
}

/**
 * Serialize a CitySetName payload to wire format.
 *
 * Wire format:
 *   string  cityName
 */
export function serializeCitySetName(msg: CitySetNameMessage): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeStringWithLength16LE(msg.cityName);  // string
  return writer.toBuffer();
}

/**
 * Deserialize a CitySetName payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCitySetName(
  data: Uint8Array,
  offset: number = 0
): CitySetNameMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const cityName = reader.readStringWithLength16LE();  // string

  return { cityName };
}

/**
 * Create a CitySetName payload.
 *
 * @param cityName - New city name
 */
export function createCitySetName(cityName: string): CitySetNameMessage {
  return { cityName };
}

// ============================================
// CityInfo
// ============================================

/**
 * CityInfo - Full city information snapshot
 *
 * Wire format:
 *   i32     cityId
 *   string  cityName       (ASCII u16LE length-prefixed)
 *   string  planet         (ASCII u16LE length-prefixed)
 *   f32     x
 *   f32     z
 *   i32     radius
 *   u64     leaderId       (NetworkId)
 *   string  leaderName     (ASCII u16LE length-prefixed)
 *   i32     population
 *   i32     rank
 *   i32     tax
 *   i32     specialization
 */
export interface CityInfoMessage {
  /** City identifier (i32) */
  cityId: number;
  /** City name (ASCII) */
  cityName: string;
  /** Planet name (ASCII) */
  planet: string;
  /** X coordinate (f32) */
  x: number;
  /** Z coordinate (f32) */
  z: number;
  /** City radius (i32) */
  radius: number;
  /** NetworkId of the city leader (u64) */
  leaderId: bigint;
  /** Leader character name (ASCII) */
  leaderName: string;
  /** City population count (i32) */
  population: number;
  /** City rank (i32) */
  rank: number;
  /** City tax rate (i32) */
  tax: number;
  /** City specialization type (i32) */
  specialization: number;
}

/**
 * Serialize a CityInfo payload to wire format.
 * Writes fields in order: cityId, cityName, planet, x, z, radius,
 * leaderId, leaderName, population, rank, tax, specialization
 */
export function serializeCityInfo(msg: CityInfoMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeInt32LE(msg.cityId);                        // i32
  writer.writeStringWithLength16LE(msg.cityName);         // string
  writer.writeStringWithLength16LE(msg.planet);           // string
  writer.writeFloatLE(msg.x);                             // f32
  writer.writeFloatLE(msg.z);                             // f32
  writer.writeInt32LE(msg.radius);                        // i32
  writer.writeUInt64LE(msg.leaderId);                     // NetworkId
  writer.writeStringWithLength16LE(msg.leaderName);       // string
  writer.writeInt32LE(msg.population);                    // i32
  writer.writeInt32LE(msg.rank);                          // i32
  writer.writeInt32LE(msg.tax);                           // i32
  writer.writeInt32LE(msg.specialization);                // i32
  return writer.toBuffer();
}

/**
 * Deserialize a CityInfo payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCityInfo(
  data: Uint8Array,
  offset: number = 0
): CityInfoMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const cityId = reader.readInt32LE();                        // i32
  const cityName = reader.readStringWithLength16LE();         // string
  const planet = reader.readStringWithLength16LE();           // string
  const x = reader.readFloatLE();                             // f32
  const z = reader.readFloatLE();                             // f32
  const radius = reader.readInt32LE();                        // i32
  const leaderId = reader.readUInt64LE();                     // NetworkId
  const leaderName = reader.readStringWithLength16LE();       // string
  const population = reader.readInt32LE();                    // i32
  const rank = reader.readInt32LE();                          // i32
  const tax = reader.readInt32LE();                           // i32
  const specialization = reader.readInt32LE();                // i32

  return {
    cityId, cityName, planet, x, z, radius,
    leaderId, leaderName, population, rank, tax, specialization,
  };
}

/**
 * Create a CityInfo payload.
 *
 * @param cityId         - City identifier
 * @param cityName       - City name
 * @param planet         - Planet name
 * @param x              - X coordinate
 * @param z              - Z coordinate
 * @param radius         - City radius
 * @param leaderId       - NetworkId of the city leader
 * @param leaderName     - Leader character name
 * @param population     - City population count
 * @param rank           - City rank
 * @param tax            - City tax rate
 * @param specialization - City specialization type
 */
export function createCityInfo(
  cityId: number,
  cityName: string,
  planet: string,
  x: number,
  z: number,
  radius: number,
  leaderId: bigint,
  leaderName: string,
  population: number,
  rank: number,
  tax: number,
  specialization: number
): CityInfoMessage {
  return {
    cityId, cityName, planet, x, z, radius,
    leaderId, leaderName, population, rank, tax, specialization,
  };
}

// ============================================
// CityRequest (generic int - cityId)
// ============================================

/**
 * CityRequest - Generic city request with a single cityId
 *
 * Wire format:
 *   i32  cityId
 */
export interface CityRequestMessage {
  /** City identifier (i32) */
  cityId: number;
}

/**
 * Serialize a CityRequest payload to wire format.
 *
 * Wire format:
 *   i32  cityId
 */
export function serializeCityRequest(msg: CityRequestMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.cityId);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a CityRequest payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCityRequest(
  data: Uint8Array,
  offset: number = 0
): CityRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const cityId = reader.readInt32LE();  // i32

  return { cityId };
}

/**
 * Create a CityRequest payload.
 *
 * @param cityId - City identifier
 */
export function createCityRequest(cityId: number): CityRequestMessage {
  return { cityId };
}

// ============================================
// CityResponse
// ============================================

/**
 * CityResponse - Generic city response with cityId and result
 *
 * Wire format:
 *   i32  cityId
 *   i32  result
 */
export interface CityResponseMessage {
  /** City identifier (i32) */
  cityId: number;
  /** Result code (i32) */
  result: number;
}

/**
 * Serialize a CityResponse payload to wire format.
 * Writes fields in order: cityId, result
 */
export function serializeCityResponse(msg: CityResponseMessage): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeInt32LE(msg.cityId);   // i32
  writer.writeInt32LE(msg.result);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a CityResponse payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCityResponse(
  data: Uint8Array,
  offset: number = 0
): CityResponseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const cityId = reader.readInt32LE();   // i32
  const result = reader.readInt32LE();   // i32

  return { cityId, result };
}

/**
 * Create a CityResponse payload.
 *
 * @param cityId - City identifier
 * @param result - Result code
 */
export function createCityResponse(
  cityId: number,
  result: number
): CityResponseMessage {
  return { cityId, result };
}

// ============================================
// GuildCreate
// ============================================

/**
 * GuildCreate - Create a new guild
 *
 * Wire format:
 *   string  guildName     (ASCII u16LE length-prefixed)
 *   string  abbreviation  (ASCII u16LE length-prefixed)
 */
export interface GuildCreateMessage {
  /** Guild name (ASCII) */
  guildName: string;
  /** Guild abbreviation/tag (ASCII) */
  abbreviation: string;
}

/**
 * Serialize a GuildCreate payload to wire format.
 * Writes fields in order: guildName, abbreviation
 */
export function serializeGuildCreate(msg: GuildCreateMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeStringWithLength16LE(msg.guildName);      // string
  writer.writeStringWithLength16LE(msg.abbreviation);   // string
  return writer.toBuffer();
}

/**
 * Deserialize a GuildCreate payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGuildCreate(
  data: Uint8Array,
  offset: number = 0
): GuildCreateMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const guildName = reader.readStringWithLength16LE();      // string
  const abbreviation = reader.readStringWithLength16LE();   // string

  return { guildName, abbreviation };
}

/**
 * Create a GuildCreate payload.
 *
 * @param guildName    - Guild name
 * @param abbreviation - Guild abbreviation/tag
 */
export function createGuildCreate(
  guildName: string,
  abbreviation: string
): GuildCreateMessage {
  return { guildName, abbreviation };
}

// ============================================
// GuildRemoveMember
// ============================================

/**
 * GuildRemoveMember - Remove a member from a guild
 *
 * Wire format:
 *   u64  memberId  (NetworkId)
 */
export interface GuildRemoveMemberMessage {
  /** NetworkId of the member to remove (u64) */
  memberId: bigint;
}

/**
 * Serialize a GuildRemoveMember payload to wire format.
 *
 * Wire format:
 *   u64  memberId
 */
export function serializeGuildRemoveMember(
  msg: GuildRemoveMemberMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.memberId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a GuildRemoveMember payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGuildRemoveMember(
  data: Uint8Array,
  offset: number = 0
): GuildRemoveMemberMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const memberId = reader.readUInt64LE();  // NetworkId

  return { memberId };
}

/**
 * Create a GuildRemoveMember payload.
 *
 * @param memberId - NetworkId of the member to remove
 */
export function createGuildRemoveMember(
  memberId: bigint
): GuildRemoveMemberMessage {
  return { memberId };
}

// ============================================
// GuildDisbandGuild (no payload)
// ============================================

/**
 * GuildDisbandGuild - Disband a guild (empty payload)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuildDisbandGuildMessage {
  // No payload fields
}

/**
 * Serialize a GuildDisbandGuild payload (empty).
 * Returns an empty buffer (no payload).
 */
export function serializeGuildDisbandGuild(
  _msg: GuildDisbandGuildMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a GuildDisbandGuild payload (empty).
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeGuildDisbandGuild(
  _data: Uint8Array,
  _offset: number = 0
): GuildDisbandGuildMessage {
  return {};
}

/**
 * Create a GuildDisbandGuild payload (empty).
 */
export function createGuildDisbandGuild(): GuildDisbandGuildMessage {
  return {};
}

// ============================================
// GuildSetLeader
// ============================================

/**
 * GuildSetLeader - Transfer guild leadership
 *
 * Wire format:
 *   u64  newLeaderId  (NetworkId)
 */
export interface GuildSetLeaderMessage {
  /** NetworkId of the new guild leader (u64) */
  newLeaderId: bigint;
}

/**
 * Serialize a GuildSetLeader payload to wire format.
 *
 * Wire format:
 *   u64  newLeaderId
 */
export function serializeGuildSetLeader(
  msg: GuildSetLeaderMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.newLeaderId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a GuildSetLeader payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGuildSetLeader(
  data: Uint8Array,
  offset: number = 0
): GuildSetLeaderMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const newLeaderId = reader.readUInt64LE();  // NetworkId

  return { newLeaderId };
}

/**
 * Create a GuildSetLeader payload.
 *
 * @param newLeaderId - NetworkId of the new guild leader
 */
export function createGuildSetLeader(
  newLeaderId: bigint
): GuildSetLeaderMessage {
  return { newLeaderId };
}

// ============================================
// GuildInviteMember
// ============================================

/**
 * GuildInviteMember - Invite a player to a guild
 *
 * Wire format:
 *   u64  inviteeId  (NetworkId)
 */
export interface GuildInviteMemberMessage {
  /** NetworkId of the player to invite (u64) */
  inviteeId: bigint;
}

/**
 * Serialize a GuildInviteMember payload to wire format.
 *
 * Wire format:
 *   u64  inviteeId
 */
export function serializeGuildInviteMember(
  msg: GuildInviteMemberMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.inviteeId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a GuildInviteMember payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGuildInviteMember(
  data: Uint8Array,
  offset: number = 0
): GuildInviteMemberMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const inviteeId = reader.readUInt64LE();  // NetworkId

  return { inviteeId };
}

/**
 * Create a GuildInviteMember payload.
 *
 * @param inviteeId - NetworkId of the player to invite
 */
export function createGuildInviteMember(
  inviteeId: bigint
): GuildInviteMemberMessage {
  return { inviteeId };
}

// ============================================
// GuildInviteAccept (no payload)
// ============================================

/**
 * GuildInviteAccept - Accept a guild invitation (empty payload)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuildInviteAcceptMessage {
  // No payload fields
}

/**
 * Serialize a GuildInviteAccept payload (empty).
 * Returns an empty buffer (no payload).
 */
export function serializeGuildInviteAccept(
  _msg: GuildInviteAcceptMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a GuildInviteAccept payload (empty).
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeGuildInviteAccept(
  _data: Uint8Array,
  _offset: number = 0
): GuildInviteAcceptMessage {
  return {};
}

/**
 * Create a GuildInviteAccept payload (empty).
 */
export function createGuildInviteAccept(): GuildInviteAcceptMessage {
  return {};
}

// ============================================
// GuildInviteDecline (no payload)
// ============================================

/**
 * GuildInviteDecline - Decline a guild invitation (empty payload)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuildInviteDeclineMessage {
  // No payload fields
}

/**
 * Serialize a GuildInviteDecline payload (empty).
 * Returns an empty buffer (no payload).
 */
export function serializeGuildInviteDecline(
  _msg: GuildInviteDeclineMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a GuildInviteDecline payload (empty).
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeGuildInviteDecline(
  _data: Uint8Array,
  _offset: number = 0
): GuildInviteDeclineMessage {
  return {};
}

/**
 * Create a GuildInviteDecline payload (empty).
 */
export function createGuildInviteDecline(): GuildInviteDeclineMessage {
  return {};
}

// ============================================
// ModifyCurrentGcwPoints
// ============================================

/**
 * ModifyCurrentGcwPoints - Modify a player's GCW points
 *
 * Wire format:
 *   i32  value
 */
export interface ModifyCurrentGcwPointsMessage {
  /** GCW points modification value (i32) */
  value: number;
}

/**
 * Serialize a ModifyCurrentGcwPoints payload to wire format.
 *
 * Wire format:
 *   i32  value
 */
export function serializeModifyCurrentGcwPoints(
  msg: ModifyCurrentGcwPointsMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.value);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a ModifyCurrentGcwPoints payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeModifyCurrentGcwPoints(
  data: Uint8Array,
  offset: number = 0
): ModifyCurrentGcwPointsMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const value = reader.readInt32LE();  // i32

  return { value };
}

/**
 * Create a ModifyCurrentGcwPoints payload.
 *
 * @param value - GCW points modification value
 */
export function createModifyCurrentGcwPoints(
  value: number
): ModifyCurrentGcwPointsMessage {
  return { value };
}

// ============================================
// ModifyCurrentGcwRating
// ============================================

/**
 * ModifyCurrentGcwRating - Modify a player's GCW rating
 *
 * Wire format:
 *   i32  value
 */
export interface ModifyCurrentGcwRatingMessage {
  /** GCW rating modification value (i32) */
  value: number;
}

/**
 * Serialize a ModifyCurrentGcwRating payload to wire format.
 *
 * Wire format:
 *   i32  value
 */
export function serializeModifyCurrentGcwRating(
  msg: ModifyCurrentGcwRatingMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.value);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a ModifyCurrentGcwRating payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeModifyCurrentGcwRating(
  data: Uint8Array,
  offset: number = 0
): ModifyCurrentGcwRatingMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const value = reader.readInt32LE();  // i32

  return { value };
}

/**
 * Create a ModifyCurrentGcwRating payload.
 *
 * @param value - GCW rating modification value
 */
export function createModifyCurrentGcwRating(
  value: number
): ModifyCurrentGcwRatingMessage {
  return { value };
}
