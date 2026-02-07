/**
 * Space / JTL (Jump to Lightspeed) Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageTypes:
 *   - CM_shipDamageMessage        - Server->Client (ship combat damage)
 *   - CM_shipFireWeapon           - Client->Server (fire a weapon slot)
 *   - CM_spaceTerminalRequest     - Client->Server (empty payload)
 *   - CM_incubatorCancel          - Client->Server (empty payload)
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueShipDamage.cpp
 *   ShipWeaponStatus / ShipObject fire logic
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// ShipDamageMessage (ship combat)
// ============================================

/**
 * ShipDamageMessage - Damage notification for ship combat.
 *
 * Sent server->client to inform about damage dealt to a ship component.
 *
 * Wire format:
 *   u64  attackerId      (NetworkId of the attacking ship)
 *   u64  defenderId      (NetworkId of the defending ship)
 *   i32  chassisSlot     (ship component slot that was hit)
 *   f32  damage          (amount of damage dealt)
 *   f32  previousHealth  (component health before damage)
 *   f32  currentHealth   (component health after damage)
 */
export interface ShipDamageMessage {
  /** NetworkId of the attacking ship (u64) */
  attackerId: bigint;
  /** NetworkId of the defending ship (u64) */
  defenderId: bigint;
  /** Ship component chassis slot that was hit (i32) */
  chassisSlot: number;
  /** Amount of damage dealt (f32) */
  damage: number;
  /** Component health before damage was applied (f32) */
  previousHealth: number;
  /** Component health after damage was applied (f32) */
  currentHealth: number;
}

/**
 * Serialize a ShipDamageMessage payload to wire format.
 *
 * Pack order:
 *   u64  attackerId
 *   u64  defenderId
 *   i32  chassisSlot
 *   f32  damage
 *   f32  previousHealth
 *   f32  currentHealth
 */
export function serializeShipDamage(msg: ShipDamageMessage): Uint8Array {
  // 8+8 + 4+4+4+4 = 32 bytes
  const writer = new BufferWriter(32);

  writer.writeUInt64LE(msg.attackerId);      // u64
  writer.writeUInt64LE(msg.defenderId);      // u64
  writer.writeInt32LE(msg.chassisSlot);      // i32
  writer.writeFloatLE(msg.damage);           // f32
  writer.writeFloatLE(msg.previousHealth);   // f32
  writer.writeFloatLE(msg.currentHealth);    // f32

  return writer.toBuffer();
}

/**
 * Deserialize a ShipDamageMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeShipDamage(
  data: Uint8Array,
  offset: number = 0
): ShipDamageMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const attackerId = reader.readUInt64LE();      // u64
  const defenderId = reader.readUInt64LE();      // u64
  const chassisSlot = reader.readInt32LE();      // i32
  const damage = reader.readFloatLE();           // f32
  const previousHealth = reader.readFloatLE();   // f32
  const currentHealth = reader.readFloatLE();    // f32

  return { attackerId, defenderId, chassisSlot, damage, previousHealth, currentHealth };
}

/**
 * Create a ShipDamageMessage.
 *
 * @param attackerId     - NetworkId of the attacking ship
 * @param defenderId     - NetworkId of the defending ship
 * @param chassisSlot    - Ship component slot that was hit
 * @param damage         - Amount of damage dealt
 * @param previousHealth - Component health before damage
 * @param currentHealth  - Component health after damage
 */
export function createShipDamage(
  attackerId: bigint,
  defenderId: bigint,
  chassisSlot: number,
  damage: number,
  previousHealth: number,
  currentHealth: number
): ShipDamageMessage {
  return { attackerId, defenderId, chassisSlot, damage, previousHealth, currentHealth };
}

// ============================================
// ShipFireWeapon (weapon slots 0-7)
// ============================================

/**
 * ShipFireWeaponMessage - Fire a ship weapon at a target.
 *
 * Sent client->server when the player fires a weapon. Generic for weapon
 * slots 0 through 7.
 *
 * Wire format:
 *   u32  weaponIndex   (weapon slot index, 0-7)
 *   u64  targetId      (NetworkId of the target)
 *   f32  targetX       (target position X)
 *   f32  targetY       (target position Y)
 *   f32  targetZ       (target position Z)
 *   u32  projectileCrc (CRC of the projectile template)
 */
export interface ShipFireWeaponMessage {
  /** Weapon slot index, 0-7 (u32) */
  weaponIndex: number;
  /** NetworkId of the target (u64) */
  targetId: bigint;
  /** Target position X component (f32) */
  targetX: number;
  /** Target position Y component (f32) */
  targetY: number;
  /** Target position Z component (f32) */
  targetZ: number;
  /** CRC of the projectile template (u32) */
  projectileCrc: number;
}

/**
 * Serialize a ShipFireWeaponMessage payload to wire format.
 *
 * Pack order:
 *   u32  weaponIndex
 *   u64  targetId
 *   f32  targetX
 *   f32  targetY
 *   f32  targetZ
 *   u32  projectileCrc
 */
export function serializeShipFireWeapon(msg: ShipFireWeaponMessage): Uint8Array {
  // 4+8 + 4+4+4 + 4 = 28 bytes
  const writer = new BufferWriter(28);

  writer.writeUInt32LE(msg.weaponIndex);     // u32
  writer.writeUInt64LE(msg.targetId);        // u64
  writer.writeFloatLE(msg.targetX);          // f32
  writer.writeFloatLE(msg.targetY);          // f32
  writer.writeFloatLE(msg.targetZ);          // f32
  writer.writeUInt32LE(msg.projectileCrc);   // u32

  return writer.toBuffer();
}

/**
 * Deserialize a ShipFireWeaponMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeShipFireWeapon(
  data: Uint8Array,
  offset: number = 0
): ShipFireWeaponMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const weaponIndex = reader.readUInt32LE();     // u32
  const targetId = reader.readUInt64LE();        // u64
  const targetX = reader.readFloatLE();          // f32
  const targetY = reader.readFloatLE();          // f32
  const targetZ = reader.readFloatLE();          // f32
  const projectileCrc = reader.readUInt32LE();   // u32

  return { weaponIndex, targetId, targetX, targetY, targetZ, projectileCrc };
}

/**
 * Create a ShipFireWeaponMessage.
 *
 * @param weaponIndex   - Weapon slot index (0-7)
 * @param targetId      - NetworkId of the target
 * @param targetX       - Target position X
 * @param targetY       - Target position Y
 * @param targetZ       - Target position Z
 * @param projectileCrc - CRC of the projectile template
 */
export function createShipFireWeapon(
  weaponIndex: number,
  targetId: bigint,
  targetX: number,
  targetY: number,
  targetZ: number,
  projectileCrc: number
): ShipFireWeaponMessage {
  return { weaponIndex, targetId, targetX, targetY, targetZ, projectileCrc };
}

// ============================================
// SpaceTerminalRequest (empty payload)
// ============================================

/**
 * SpaceTerminalRequestMessage - Request to interact with a space terminal.
 *
 * Sent client->server. Contains no payload data (packNothing).
 */
export interface SpaceTerminalRequestMessage {
  // No payload fields
}

/**
 * Serialize a SpaceTerminalRequestMessage payload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeSpaceTerminalRequest(
  _msg: SpaceTerminalRequestMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a SpaceTerminalRequestMessage payload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeSpaceTerminalRequest(
  _data: Uint8Array,
  _offset: number = 0
): SpaceTerminalRequestMessage {
  return {};
}

/**
 * Create a SpaceTerminalRequestMessage.
 * Returns an empty object (no payload fields).
 */
export function createSpaceTerminalRequest(): SpaceTerminalRequestMessage {
  return {};
}

// ============================================
// IncubatorCancel (empty payload)
// ============================================

/**
 * IncubatorCancelMessage - Cancel an incubator session.
 *
 * Sent client->server. Contains no payload data (packNothing).
 */
export interface IncubatorCancelMessage {
  // No payload fields
}

/**
 * Serialize an IncubatorCancelMessage payload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeIncubatorCancel(): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize an IncubatorCancelMessage payload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeIncubatorCancel(
  _data?: Uint8Array,
  _offset?: number
): IncubatorCancelMessage {
  return {};
}

/**
 * Create an IncubatorCancelMessage.
 * Returns an empty object (no payload fields).
 */
export function createIncubatorCancel(): IncubatorCancelMessage {
  return {};
}
