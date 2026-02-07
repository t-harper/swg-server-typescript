/**
 * Harvester / Resource Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with harvester-related messageTypes:
 *   - CM_clientResourceHarvesterActivate       (229) - no payload
 *   - CM_clientResourceHarvesterDeactivate      (230) - no payload
 *   - CM_clientResourceHarvesterListen          (231) - no payload
 *   - CM_clientResourceHarvesterStopListening   (232) - no payload
 *   - CM_clientResourceHarvesterGetResourceData (233) - no payload
 *   - CM_clientResourceHarvesterResourceData    (234) - Server->Client
 *   - CM_clientResourceHarvesterResourceSelect  (235) - Client->Server
 *   - CM_clientResourceHarvesterEmptyHopper     (237) - Client->Server
 *   - CM_clientResourceHarvesterEmptyHopperResponse (238) - Server->Client
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueResourceData.cpp
 *   MessageQueueResourceEmptyHopper.cpp
 *   MessageQueueGenericResponse.cpp
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CM_clientResourceHarvesterActivate (229)
// No payload
// ============================================

/** Empty payload for CM_clientResourceHarvesterActivate (229) */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResourceHarvesterActivateMessage {}

/**
 * Serialize a ResourceHarvesterActivate payload (empty)
 */
export function serializeResourceHarvesterActivate(
  _msg: ResourceHarvesterActivateMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a ResourceHarvesterActivate payload (empty)
 * @param _data   - Raw payload bytes (after ObjControllerMessage header)
 * @param _offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterActivate(
  _data: Uint8Array,
  _offset: number = 0
): ResourceHarvesterActivateMessage {
  return {};
}

/**
 * Create a ResourceHarvesterActivate payload (empty)
 */
export function createResourceHarvesterActivate(): ResourceHarvesterActivateMessage {
  return {};
}

// ============================================
// CM_clientResourceHarvesterDeactivate (230)
// No payload
// ============================================

/** Empty payload for CM_clientResourceHarvesterDeactivate (230) */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResourceHarvesterDeactivateMessage {}

/**
 * Serialize a ResourceHarvesterDeactivate payload (empty)
 */
export function serializeResourceHarvesterDeactivate(
  _msg: ResourceHarvesterDeactivateMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a ResourceHarvesterDeactivate payload (empty)
 * @param _data   - Raw payload bytes (after ObjControllerMessage header)
 * @param _offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterDeactivate(
  _data: Uint8Array,
  _offset: number = 0
): ResourceHarvesterDeactivateMessage {
  return {};
}

/**
 * Create a ResourceHarvesterDeactivate payload (empty)
 */
export function createResourceHarvesterDeactivate(): ResourceHarvesterDeactivateMessage {
  return {};
}

// ============================================
// CM_clientResourceHarvesterListen (231)
// No payload
// ============================================

/** Empty payload for CM_clientResourceHarvesterListen (231) */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResourceHarvesterListenMessage {}

/**
 * Serialize a ResourceHarvesterListen payload (empty)
 */
export function serializeResourceHarvesterListen(
  _msg: ResourceHarvesterListenMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a ResourceHarvesterListen payload (empty)
 * @param _data   - Raw payload bytes (after ObjControllerMessage header)
 * @param _offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterListen(
  _data: Uint8Array,
  _offset: number = 0
): ResourceHarvesterListenMessage {
  return {};
}

/**
 * Create a ResourceHarvesterListen payload (empty)
 */
export function createResourceHarvesterListen(): ResourceHarvesterListenMessage {
  return {};
}

// ============================================
// CM_clientResourceHarvesterStopListening (232)
// No payload
// ============================================

/** Empty payload for CM_clientResourceHarvesterStopListening (232) */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResourceHarvesterStopListeningMessage {}

/**
 * Serialize a ResourceHarvesterStopListening payload (empty)
 */
export function serializeResourceHarvesterStopListening(
  _msg: ResourceHarvesterStopListeningMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a ResourceHarvesterStopListening payload (empty)
 * @param _data   - Raw payload bytes (after ObjControllerMessage header)
 * @param _offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterStopListening(
  _data: Uint8Array,
  _offset: number = 0
): ResourceHarvesterStopListeningMessage {
  return {};
}

/**
 * Create a ResourceHarvesterStopListening payload (empty)
 */
export function createResourceHarvesterStopListening(): ResourceHarvesterStopListeningMessage {
  return {};
}

// ============================================
// CM_clientResourceHarvesterGetResourceData (233)
// No payload
// ============================================

/** Empty payload for CM_clientResourceHarvesterGetResourceData (233) */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResourceHarvesterGetResourceDataMessage {}

/**
 * Serialize a ResourceHarvesterGetResourceData payload (empty)
 */
export function serializeResourceHarvesterGetResourceData(
  _msg: ResourceHarvesterGetResourceDataMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a ResourceHarvesterGetResourceData payload (empty)
 * @param _data   - Raw payload bytes (after ObjControllerMessage header)
 * @param _offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterGetResourceData(
  _data: Uint8Array,
  _offset: number = 0
): ResourceHarvesterGetResourceDataMessage {
  return {};
}

/**
 * Create a ResourceHarvesterGetResourceData payload (empty)
 */
export function createResourceHarvesterGetResourceData(): ResourceHarvesterGetResourceDataMessage {
  return {};
}

// ============================================
// CM_clientResourceHarvesterResourceData (234)
// Server -> Client
// ============================================

/** A single resource entry in the harvester resource data */
export interface HarvesterResourceEntry {
  /** NetworkId of the resource (u64) */
  resourceId: bigint;
  /** ASCII name of the resource */
  resourceName: string;
  /** NetworkId of the resource type (u64) */
  resourceTypeId: bigint;
  /** Pool efficiency percentage (u8, 0-100) */
  resourcePoolPercent: number;
}

/**
 * ResourceHarvesterResourceData payload - Server->Client
 *
 * Wire format (C++ MessageQueueResourceData::pack):
 *   u64  harvesterId
 *   u32  resourceCount
 *   for each resource:
 *     u64     resourceId
 *     string  resourceName  (ASCII, u16LE length + bytes)
 *     u64     resourceTypeId
 *     u8      resourcePoolPercent
 */
export interface ResourceHarvesterResourceDataMessage {
  /** NetworkId of the harvester (u64) */
  harvesterId: bigint;
  /** List of available resources */
  resources: HarvesterResourceEntry[];
}

// ============================================
// ResourceHarvesterResourceData -- Serialize
// ============================================

/**
 * Serialize a ResourceHarvesterResourceData payload to wire format.
 *
 * Pack order (C++ MessageQueueResourceData::pack):
 *   u64   harvesterId
 *   u32   resourceCount
 *   for each resource:
 *     u64     resourceId
 *     string  resourceName  (u16LE len + ASCII bytes)
 *     u64     resourceTypeId
 *     u8      resourcePoolPercent
 */
export function serializeResourceHarvesterResourceData(
  msg: ResourceHarvesterResourceDataMessage
): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt64LE(msg.harvesterId);          // u64
  writer.writeUInt32LE(msg.resources.length);     // u32 resourceCount

  for (const res of msg.resources) {
    writer.writeUInt64LE(res.resourceId);                     // u64
    writer.writeStringWithLength16LE(res.resourceName);       // ASCII string
    writer.writeUInt64LE(res.resourceTypeId);                 // u64
    writer.writeUInt8(res.resourcePoolPercent);               // u8
  }

  return writer.toBuffer();
}

// ============================================
// ResourceHarvesterResourceData -- Deserialize
// ============================================

/**
 * Deserialize a ResourceHarvesterResourceData payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterResourceData(
  data: Uint8Array,
  offset: number = 0
): ResourceHarvesterResourceDataMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const harvesterId = reader.readUInt64LE();          // u64
  const resourceCount = reader.readUInt32LE();        // u32

  const resources: HarvesterResourceEntry[] = [];
  for (let i = 0; i < resourceCount; i++) {
    const resourceId = reader.readUInt64LE();                     // u64
    const resourceName = reader.readStringWithLength16LE();       // ASCII string
    const resourceTypeId = reader.readUInt64LE();                 // u64
    const resourcePoolPercent = reader.readUInt8();               // u8
    resources.push({ resourceId, resourceName, resourceTypeId, resourcePoolPercent });
  }

  return { harvesterId, resources };
}

// ============================================
// ResourceHarvesterResourceData -- Factory
// ============================================

/**
 * Create a ResourceHarvesterResourceData payload.
 *
 * @param harvesterId - NetworkId of the harvester
 * @param resources   - List of available resource entries
 */
export function createResourceHarvesterResourceData(
  harvesterId: bigint,
  resources: HarvesterResourceEntry[] = []
): ResourceHarvesterResourceDataMessage {
  return { harvesterId, resources };
}

// ============================================
// CM_clientResourceHarvesterResourceSelect (235)
// Client -> Server
// ============================================

/**
 * ResourceHarvesterResourceSelect payload - Client->Server
 *
 * Wire format:
 *   u64  resourceId  (the selected resource NetworkId)
 */
export interface ResourceHarvesterResourceSelectMessage {
  /** NetworkId of the selected resource (u64) */
  resourceId: bigint;
}

// ============================================
// ResourceHarvesterResourceSelect -- Serialize
// ============================================

/**
 * Serialize a ResourceHarvesterResourceSelect payload to wire format.
 *
 * Pack order:
 *   u64  resourceId
 */
export function serializeResourceHarvesterResourceSelect(
  msg: ResourceHarvesterResourceSelectMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.resourceId);   // u64
  return writer.toBuffer();
}

// ============================================
// ResourceHarvesterResourceSelect -- Deserialize
// ============================================

/**
 * Deserialize a ResourceHarvesterResourceSelect payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterResourceSelect(
  data: Uint8Array,
  offset: number = 0
): ResourceHarvesterResourceSelectMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const resourceId = reader.readUInt64LE();   // u64

  return { resourceId };
}

// ============================================
// ResourceHarvesterResourceSelect -- Factory
// ============================================

/**
 * Create a ResourceHarvesterResourceSelect payload.
 *
 * @param resourceId - NetworkId of the selected resource
 */
export function createResourceHarvesterResourceSelect(
  resourceId: bigint
): ResourceHarvesterResourceSelectMessage {
  return { resourceId };
}

// ============================================
// CM_clientResourceHarvesterEmptyHopper (237)
// Client -> Server
// ============================================

/**
 * ResourceHarvesterEmptyHopper payload - Client->Server
 *
 * Wire format (C++ MessageQueueResourceEmptyHopper::pack):
 *   u64  playerId
 *   u64  harvesterId
 *   u64  resourceId
 *   i32  amount
 *   u8   discard     (bool)
 *   u8   sequenceId
 */
export interface ResourceHarvesterEmptyHopperMessage {
  /** NetworkId of the player (u64) */
  playerId: bigint;
  /** NetworkId of the harvester (u64) */
  harvesterId: bigint;
  /** NetworkId of the resource to retrieve (u64) */
  resourceId: bigint;
  /** Amount of resource to retrieve (i32) */
  amount: number;
  /** Whether to discard the resource instead of retrieving it (bool) */
  discard: boolean;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

// ============================================
// ResourceHarvesterEmptyHopper -- Serialize
// ============================================

/**
 * Serialize a ResourceHarvesterEmptyHopper payload to wire format.
 *
 * Pack order (C++ MessageQueueResourceEmptyHopper::pack):
 *   u64  playerId
 *   u64  harvesterId
 *   u64  resourceId
 *   i32  amount
 *   u8   discard     (bool)
 *   u8   sequenceId
 */
export function serializeResourceHarvesterEmptyHopper(
  msg: ResourceHarvesterEmptyHopperMessage
): Uint8Array {
  const writer = new BufferWriter(30);

  writer.writeUInt64LE(msg.playerId);              // u64
  writer.writeUInt64LE(msg.harvesterId);           // u64
  writer.writeUInt64LE(msg.resourceId);            // u64
  writer.writeInt32LE(msg.amount);                 // i32
  writer.writeUInt8(msg.discard ? 1 : 0);          // bool
  writer.writeUInt8(msg.sequenceId);               // u8

  return writer.toBuffer();
}

// ============================================
// ResourceHarvesterEmptyHopper -- Deserialize
// ============================================

/**
 * Deserialize a ResourceHarvesterEmptyHopper payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterEmptyHopper(
  data: Uint8Array,
  offset: number = 0
): ResourceHarvesterEmptyHopperMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const playerId = reader.readUInt64LE();              // u64
  const harvesterId = reader.readUInt64LE();           // u64
  const resourceId = reader.readUInt64LE();            // u64
  const amount = reader.readInt32LE();                 // i32
  const discard = reader.readUInt8() !== 0;            // bool
  const sequenceId = reader.readUInt8();               // u8

  return { playerId, harvesterId, resourceId, amount, discard, sequenceId };
}

// ============================================
// ResourceHarvesterEmptyHopper -- Factory
// ============================================

/**
 * Create a ResourceHarvesterEmptyHopper payload.
 *
 * @param playerId    - NetworkId of the player
 * @param harvesterId - NetworkId of the harvester
 * @param resourceId  - NetworkId of the resource to retrieve
 * @param amount      - Amount of resource to retrieve
 * @param discard     - Whether to discard the resource (default false)
 * @param sequenceId  - Sequence identifier (default 0)
 */
export function createResourceHarvesterEmptyHopper(
  playerId: bigint,
  harvesterId: bigint,
  resourceId: bigint,
  amount: number,
  discard: boolean = false,
  sequenceId: number = 0
): ResourceHarvesterEmptyHopperMessage {
  return { playerId, harvesterId, resourceId, amount, discard, sequenceId };
}

// ============================================
// CM_clientResourceHarvesterEmptyHopperResponse (238)
// Server -> Client
// ============================================

/**
 * ResourceHarvesterEmptyHopperResponse payload - Server->Client
 *
 * Wire format (C++ GenericResponse::pack):
 *   i32  requestId
 *   u8   success     (bool)
 *   u8   sequenceId
 */
export interface ResourceHarvesterEmptyHopperResponseMessage {
  /** Request identifier (i32) */
  requestId: number;
  /** Whether the operation succeeded (bool) */
  success: boolean;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

// ============================================
// ResourceHarvesterEmptyHopperResponse -- Serialize
// ============================================

/**
 * Serialize a ResourceHarvesterEmptyHopperResponse payload to wire format.
 *
 * Pack order (C++ GenericResponse::pack):
 *   i32  requestId
 *   u8   success     (bool)
 *   u8   sequenceId
 */
export function serializeResourceHarvesterEmptyHopperResponse(
  msg: ResourceHarvesterEmptyHopperResponseMessage
): Uint8Array {
  const writer = new BufferWriter(6);

  writer.writeInt32LE(msg.requestId);              // i32
  writer.writeUInt8(msg.success ? 1 : 0);          // bool
  writer.writeUInt8(msg.sequenceId);               // u8

  return writer.toBuffer();
}

// ============================================
// ResourceHarvesterEmptyHopperResponse -- Deserialize
// ============================================

/**
 * Deserialize a ResourceHarvesterEmptyHopperResponse payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceHarvesterEmptyHopperResponse(
  data: Uint8Array,
  offset: number = 0
): ResourceHarvesterEmptyHopperResponseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const requestId = reader.readInt32LE();              // i32
  const success = reader.readUInt8() !== 0;            // bool
  const sequenceId = reader.readUInt8();               // u8

  return { requestId, success, sequenceId };
}

// ============================================
// ResourceHarvesterEmptyHopperResponse -- Factory
// ============================================

/**
 * Create a ResourceHarvesterEmptyHopperResponse payload.
 *
 * @param requestId  - Request identifier
 * @param success    - Whether the operation succeeded (default true)
 * @param sequenceId - Sequence identifier (default 0)
 */
export function createResourceHarvesterEmptyHopperResponse(
  requestId: number,
  success: boolean = true,
  sequenceId: number = 0
): ResourceHarvesterEmptyHopperResponseMessage {
  return { requestId, success, sequenceId };
}
