/**
 * Pet and Vehicle Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with pet/vehicle-related messageTypes:
 *   - CM_mountDismount                      - Client->Server
 *   - CM_petToolbarSlot0 .. CM_petToolbarSlot8 - Client->Server
 *   - CM_callVehicle                        - Client->Server
 *   - CM_storeVehicle                       - Client->Server
 *   - CM_addBuff                            - Server->Client
 *   - CM_removeBuff                         - Server->Client
 *   - CM_addObjectEffect                    - Server->Client
 *   - CM_removeObjectEffect                 - Server->Client
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CM_mountDismount - Client->Server
// ============================================

/**
 * MountDismountPayload - Mount or dismount a vehicle/creature mount.
 * No payload fields (empty command).
 */
export interface MountDismountPayload {
  // No payload fields
}

/**
 * Serialize a MountDismountPayload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeMountDismount(_msg: MountDismountPayload): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a MountDismountPayload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeMountDismount(
  _data: Uint8Array,
  _offset: number = 0
): MountDismountPayload {
  return {};
}

/**
 * Create a MountDismountPayload.
 * Returns an empty object (no payload fields).
 */
export function createMountDismount(): MountDismountPayload {
  return {};
}

// ============================================
// CM_petToolbarSlot0 .. CM_petToolbarSlot8 - Client->Server
// ============================================

/**
 * PetToolbarSlotPayload - Pet toolbar command payload.
 * Used by all 9 pet toolbar slots (CM_petToolbarSlot0 through CM_petToolbarSlot8).
 *
 * Wire format:
 *   u64  targetId     (NetworkId of the target)
 *   u32  commandHash  (CRC hash of the command to execute)
 */
export interface PetToolbarSlotPayload {
  /** NetworkId of the target (u64) */
  targetId: bigint;
  /** CRC hash of the command to execute (u32) */
  commandHash: number;
}

/**
 * Serialize a PetToolbarSlotPayload to wire format.
 * Writes fields in order: targetId, commandHash
 */
export function serializePetToolbarSlot(msg: PetToolbarSlotPayload): Uint8Array {
  const writer = new BufferWriter(12);
  writer.writeUInt64LE(msg.targetId);     // NetworkId
  writer.writeUInt32LE(msg.commandHash);  // u32
  return writer.toBuffer();
}

/**
 * Deserialize a PetToolbarSlotPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializePetToolbarSlot(
  data: Uint8Array,
  offset: number = 0
): PetToolbarSlotPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const targetId = reader.readUInt64LE();     // NetworkId
  const commandHash = reader.readUInt32LE();  // u32

  return { targetId, commandHash };
}

/**
 * Create a PetToolbarSlotPayload.
 *
 * @param targetId    - NetworkId of the target
 * @param commandHash - CRC hash of the command to execute
 */
export function createPetToolbarSlot(
  targetId: bigint,
  commandHash: number
): PetToolbarSlotPayload {
  return { targetId, commandHash };
}

// ============================================
// CM_callVehicle - Client->Server
// ============================================

/**
 * CallVehiclePayload - Call/summon a vehicle.
 * No payload fields (empty command).
 */
export interface CallVehiclePayload {
  // No payload fields
}

/**
 * Serialize a CallVehiclePayload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeCallVehicle(_msg: CallVehiclePayload): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a CallVehiclePayload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeCallVehicle(
  _data: Uint8Array,
  _offset: number = 0
): CallVehiclePayload {
  return {};
}

/**
 * Create a CallVehiclePayload.
 * Returns an empty object (no payload fields).
 */
export function createCallVehicle(): CallVehiclePayload {
  return {};
}

// ============================================
// CM_storeVehicle - Client->Server
// ============================================

/**
 * StoreVehiclePayload - Store/dismiss a vehicle.
 * No payload fields (empty command).
 */
export interface StoreVehiclePayload {
  // No payload fields
}

/**
 * Serialize a StoreVehiclePayload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeStoreVehicle(_msg: StoreVehiclePayload): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a StoreVehiclePayload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeStoreVehicle(
  _data: Uint8Array,
  _offset: number = 0
): StoreVehiclePayload {
  return {};
}

/**
 * Create a StoreVehiclePayload.
 * Returns an empty object (no payload fields).
 */
export function createStoreVehicle(): StoreVehiclePayload {
  return {};
}

// ============================================
// CM_addBuff - Server->Client
// ============================================

/**
 * AddBuffPayload - Add a buff to a creature.
 *
 * Wire format:
 *   u32  buffNameCrc  (CRC of the buff name)
 *   f32  duration     (buff duration in seconds)
 */
export interface AddBuffPayload {
  /** CRC of the buff name (u32) */
  buffNameCrc: number;
  /** Buff duration in seconds (f32) */
  duration: number;
}

/**
 * Serialize an AddBuffPayload to wire format.
 * Writes fields in order: buffNameCrc, duration
 */
export function serializeAddBuff(msg: AddBuffPayload): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt32LE(msg.buffNameCrc);  // u32
  writer.writeFloatLE(msg.duration);      // f32
  return writer.toBuffer();
}

/**
 * Deserialize an AddBuffPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeAddBuff(
  data: Uint8Array,
  offset: number = 0
): AddBuffPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const buffNameCrc = reader.readUInt32LE();  // u32
  const duration = reader.readFloatLE();      // f32

  return { buffNameCrc, duration };
}

/**
 * Create an AddBuffPayload.
 *
 * @param buffNameCrc - CRC of the buff name
 * @param duration    - Buff duration in seconds
 */
export function createAddBuff(
  buffNameCrc: number,
  duration: number
): AddBuffPayload {
  return { buffNameCrc, duration };
}

// ============================================
// CM_removeBuff - Server->Client
// ============================================

/**
 * RemoveBuffPayload - Remove a buff from a creature.
 *
 * Wire format:
 *   u32  buffNameCrc  (CRC of the buff name)
 */
export interface RemoveBuffPayload {
  /** CRC of the buff name to remove (u32) */
  buffNameCrc: number;
}

/**
 * Serialize a RemoveBuffPayload to wire format.
 *
 * Wire format:
 *   u32  buffNameCrc
 */
export function serializeRemoveBuff(msg: RemoveBuffPayload): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeUInt32LE(msg.buffNameCrc);  // u32
  return writer.toBuffer();
}

/**
 * Deserialize a RemoveBuffPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRemoveBuff(
  data: Uint8Array,
  offset: number = 0
): RemoveBuffPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const buffNameCrc = reader.readUInt32LE();  // u32

  return { buffNameCrc };
}

/**
 * Create a RemoveBuffPayload.
 *
 * @param buffNameCrc - CRC of the buff name to remove
 */
export function createRemoveBuff(buffNameCrc: number): RemoveBuffPayload {
  return { buffNameCrc };
}

// ============================================
// CM_addObjectEffect - Server->Client
// ============================================

/**
 * AddObjectEffectPayload - Add a visual effect to an object.
 *
 * Wire format:
 *   u64     objectId        (NetworkId of the object)
 *   string  effectFileName  (ASCII u16LE length-prefixed, path to the effect file)
 *   string  label           (ASCII u16LE length-prefixed, effect label/hardpoint)
 */
export interface AddObjectEffectPayload {
  /** NetworkId of the object to apply the effect to (u64) */
  objectId: bigint;
  /** Path to the effect file (ASCII) */
  effectFileName: string;
  /** Effect label/hardpoint name (ASCII) */
  label: string;
}

/**
 * Serialize an AddObjectEffectPayload to wire format.
 * Writes fields in order: objectId, effectFileName, label
 */
export function serializeAddObjectEffect(
  msg: AddObjectEffectPayload
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt64LE(msg.objectId);                       // NetworkId
  writer.writeStringWithLength16LE(msg.effectFileName);     // string
  writer.writeStringWithLength16LE(msg.label);              // string
  return writer.toBuffer();
}

/**
 * Deserialize an AddObjectEffectPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeAddObjectEffect(
  data: Uint8Array,
  offset: number = 0
): AddObjectEffectPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const objectId = reader.readUInt64LE();                       // NetworkId
  const effectFileName = reader.readStringWithLength16LE();     // string
  const label = reader.readStringWithLength16LE();              // string

  return { objectId, effectFileName, label };
}

/**
 * Create an AddObjectEffectPayload.
 *
 * @param objectId       - NetworkId of the object
 * @param effectFileName - Path to the effect file
 * @param label          - Effect label/hardpoint name
 */
export function createAddObjectEffect(
  objectId: bigint,
  effectFileName: string,
  label: string
): AddObjectEffectPayload {
  return { objectId, effectFileName, label };
}

// ============================================
// CM_removeObjectEffect - Server->Client
// ============================================

/**
 * RemoveObjectEffectPayload - Remove a visual effect from an object.
 *
 * Wire format:
 *   u64     objectId  (NetworkId of the object)
 *   string  label     (ASCII u16LE length-prefixed, effect label/hardpoint)
 */
export interface RemoveObjectEffectPayload {
  /** NetworkId of the object to remove the effect from (u64) */
  objectId: bigint;
  /** Effect label/hardpoint name to remove (ASCII) */
  label: string;
}

/**
 * Serialize a RemoveObjectEffectPayload to wire format.
 * Writes fields in order: objectId, label
 */
export function serializeRemoveObjectEffect(
  msg: RemoveObjectEffectPayload
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt64LE(msg.objectId);              // NetworkId
  writer.writeStringWithLength16LE(msg.label);     // string
  return writer.toBuffer();
}

/**
 * Deserialize a RemoveObjectEffectPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRemoveObjectEffect(
  data: Uint8Array,
  offset: number = 0
): RemoveObjectEffectPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const objectId = reader.readUInt64LE();              // NetworkId
  const label = reader.readStringWithLength16LE();     // string

  return { objectId, label };
}

/**
 * Create a RemoveObjectEffectPayload.
 *
 * @param objectId - NetworkId of the object
 * @param label    - Effect label/hardpoint name to remove
 */
export function createRemoveObjectEffect(
  objectId: bigint,
  label: string
): RemoveObjectEffectPayload {
  return { objectId, label };
}
