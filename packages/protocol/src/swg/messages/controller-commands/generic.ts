/**
 * Generic Utility Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageTypes:
 *   - CM_secureTrade               (277)  - Client/Server bidirectional
 *   - CM_modData                   (553)  - Server->Client
 *   - CM_cancelMod                 (554)  - Client->Server
 *   - CM_setPosture                (305)  - Server->Client
 *   - CM_removeSlowDownEffect      (1094) - Server->Client
 *   - CM_cyberneticsOpen           (1201) - Server->Client
 *   - CM_cyberneticsChangeRequest  (1203) - Client->Server
 *   - CM_spaceMiningSaleOpen       (1202) - Server->Client
 *   - CM_spaceMiningSaleSellResource (1206) - Client->Server
 *   - CM_clientMinigameOpen        (1241) - Server->Client
 *   - CM_clientMinigameClose       (1242) - Client->Server
 *   - CM_clientMinigameResult      (1243) - Client->Server
 *   - CM_createSaga                (1244) - Server->Client
 *   - CM_openRatingWindow          (1245) - Server->Client
 *   - CM_ratingFinished            (1246) - Client->Server
 *   - CM_openRecipe                (1248) - Server->Client
 *
 * Also provides generic reusable helper payloads:
 *   - GenericIntPayload            - Single i32 value (packIntMessage)
 *   - GenericNetworkIdPayload      - Single u64 NetworkId (packNetworkIdMessage)
 *   - EmptyPayload                 - No fields (packNothing)
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueSecureTrade, MessageQueueModData,
 *             MessageQueueGenericValueType, MessageQueuePosture
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Posture Constants
// ============================================

/** Postures enum matching C++ Postures::Enumerator */
export const Postures = {
  Upright: 0,
  Crouched: 1,
  Prone: 2,
  Sneaking: 3,
  Blocking: 4,
  Climbing: 5,
  Flying: 6,
  LyingDown: 7,
  Sitting: 8,
  SkillAnimating: 9,
  DrivingVehicle: 10,
  RidingCreature: 11,
  KnockedDown: 12,
  Incapacitated: 13,
  Dead: 14,
} as const;

// ============================================
// GenericIntPayload (reusable helper)
// ============================================

/**
 * GenericIntPayload - A single i32 value.
 * Used by many controller commands that pack a single integer (packIntMessage).
 */
export interface GenericIntPayload {
  /** The integer value (i32) */
  value: number;
}

/**
 * Serialize a GenericIntPayload to wire format.
 *
 * Wire format:
 *   i32  value
 */
export function serializeGenericInt(msg: GenericIntPayload): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.value);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a GenericIntPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGenericInt(
  data: Uint8Array,
  offset: number = 0
): GenericIntPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const value = reader.readInt32LE();  // i32

  return { value };
}

/**
 * Create a GenericIntPayload.
 *
 * @param value - The integer value
 */
export function createGenericInt(value: number): GenericIntPayload {
  return { value };
}

// ============================================
// GenericNetworkIdPayload (reusable helper)
// ============================================

/**
 * GenericNetworkIdPayload - A single u64 NetworkId.
 * Used by many controller commands that pack a single NetworkId (packNetworkIdMessage).
 */
export interface GenericNetworkIdPayload {
  /** The NetworkId (u64) */
  id: bigint;
}

/**
 * Serialize a GenericNetworkIdPayload to wire format.
 *
 * Wire format:
 *   u64  id
 */
export function serializeGenericNetworkId(
  msg: GenericNetworkIdPayload
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.id);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a GenericNetworkIdPayload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGenericNetworkId(
  data: Uint8Array,
  offset: number = 0
): GenericNetworkIdPayload {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const id = reader.readUInt64LE();  // NetworkId

  return { id };
}

/**
 * Create a GenericNetworkIdPayload.
 *
 * @param id - The NetworkId
 */
export function createGenericNetworkId(id: bigint): GenericNetworkIdPayload {
  return { id };
}

// ============================================
// EmptyPayload (reusable helper)
// ============================================

/**
 * EmptyPayload - No fields.
 * Used by many controller commands that pack nothing (packNothing).
 */
export interface EmptyPayload {
  // No payload fields
}

/**
 * Serialize an EmptyPayload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeEmptyPayload(_msg: EmptyPayload): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize an EmptyPayload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeEmptyPayload(
  _data: Uint8Array,
  _offset: number = 0
): EmptyPayload {
  return {};
}

/**
 * Create an EmptyPayload.
 * Returns an empty object (no payload fields).
 */
export function createEmptyPayload(): EmptyPayload {
  return {};
}

// ============================================
// CM_secureTrade (277) - Client/Server bidirectional
// ============================================

/**
 * SecureTradeMessage - Secure trade controller command payload
 *
 * C++ source: MessageQueueSecureTrade
 * Wire format:
 *   i32  tradeMessageId  (trade action type)
 *   u64  initiator       (NetworkId)
 *   u64  recipient       (NetworkId)
 */
export interface SecureTradeMessage {
  /** Trade action type (i32) */
  tradeMessageId: number;
  /** NetworkId of the trade initiator (u64) */
  initiator: bigint;
  /** NetworkId of the trade recipient (u64) */
  recipient: bigint;
}

/**
 * Serialize a SecureTradeMessage payload to wire format.
 * Writes fields in C++ pack order: tradeMessageId, initiator, recipient
 */
export function serializeSecureTrade(msg: SecureTradeMessage): Uint8Array {
  const writer = new BufferWriter(20);
  writer.writeInt32LE(msg.tradeMessageId);  // i32
  writer.writeUInt64LE(msg.initiator);      // NetworkId
  writer.writeUInt64LE(msg.recipient);      // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a SecureTradeMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSecureTrade(
  data: Uint8Array,
  offset: number = 0
): SecureTradeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const tradeMessageId = reader.readInt32LE();   // i32
  const initiator = reader.readUInt64LE();       // NetworkId
  const recipient = reader.readUInt64LE();       // NetworkId

  return { tradeMessageId, initiator, recipient };
}

/**
 * Create a SecureTradeMessage.
 *
 * @param tradeMessageId - Trade action type
 * @param initiator      - NetworkId of the trade initiator
 * @param recipient      - NetworkId of the trade recipient
 */
export function createSecureTrade(
  tradeMessageId: number,
  initiator: bigint,
  recipient: bigint
): SecureTradeMessage {
  return { tradeMessageId, initiator, recipient };
}

// ============================================
// CM_modData (553) - Server->Client
// ============================================

/**
 * ModDataMessage - Mod data controller command payload
 *
 * C++ source: MessageQueueModData
 * Wire format:
 *   u32  modType   (CRC/identifier)
 *   f32  modValue
 */
export interface ModDataMessage {
  /** Mod type CRC/identifier (u32) */
  modType: number;
  /** Mod value (f32) */
  modValue: number;
}

/**
 * Serialize a ModDataMessage payload to wire format.
 * Writes fields in C++ pack order: modType, modValue
 */
export function serializeModData(msg: ModDataMessage): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt32LE(msg.modType);   // u32
  writer.writeFloatLE(msg.modValue);   // f32
  return writer.toBuffer();
}

/**
 * Deserialize a ModDataMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeModData(
  data: Uint8Array,
  offset: number = 0
): ModDataMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const modType = reader.readUInt32LE();   // u32
  const modValue = reader.readFloatLE();   // f32

  return { modType, modValue };
}

/**
 * Create a ModDataMessage.
 *
 * @param modType  - Mod type CRC/identifier
 * @param modValue - Mod value
 */
export function createModData(
  modType: number,
  modValue: number
): ModDataMessage {
  return { modType, modValue };
}

// ============================================
// CM_cancelMod (554) - Client->Server
// ============================================

/**
 * CancelModMessage - Cancel mod controller command payload
 *
 * C++ source: MessageQueueGenericValueType<uint32>
 * Wire format:
 *   u32  modType
 */
export interface CancelModMessage {
  /** Mod type to cancel (u32) */
  modType: number;
}

/**
 * Serialize a CancelModMessage payload to wire format.
 *
 * Wire format:
 *   u32  modType
 */
export function serializeCancelMod(msg: CancelModMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeUInt32LE(msg.modType);  // u32
  return writer.toBuffer();
}

/**
 * Deserialize a CancelModMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCancelMod(
  data: Uint8Array,
  offset: number = 0
): CancelModMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const modType = reader.readUInt32LE();  // u32

  return { modType };
}

/**
 * Create a CancelModMessage.
 *
 * @param modType - Mod type to cancel
 */
export function createCancelMod(modType: number): CancelModMessage {
  return { modType };
}

// ============================================
// CM_setPosture (305) - Server->Client
// ============================================

/**
 * SetPostureMessage - Set posture controller command payload
 *
 * C++ source: MessageQueuePosture
 * Wire format:
 *   u8  posture         (Postures enum value)
 *   u8  clientImmediate (bool - snap immediately vs animate)
 */
export interface SetPostureMessage {
  /** Posture enum value (u8) - see Postures constant */
  posture: number;
  /** Whether to snap immediately rather than animate (u8 bool) */
  clientImmediate: number;
}

/**
 * Serialize a SetPostureMessage payload to wire format.
 * Writes fields in C++ pack order: posture, clientImmediate
 */
export function serializeSetPosture(msg: SetPostureMessage): Uint8Array {
  const writer = new BufferWriter(2);
  writer.writeUInt8(msg.posture);          // u8
  writer.writeUInt8(msg.clientImmediate);  // u8
  return writer.toBuffer();
}

/**
 * Deserialize a SetPostureMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetPosture(
  data: Uint8Array,
  offset: number = 0
): SetPostureMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const posture = reader.readUInt8();          // u8
  const clientImmediate = reader.readUInt8();  // u8

  return { posture, clientImmediate };
}

/**
 * Create a SetPostureMessage.
 *
 * @param posture         - Posture enum value (see Postures constant)
 * @param clientImmediate - Whether to snap immediately (0 = animate, 1 = snap)
 */
export function createSetPosture(
  posture: number,
  clientImmediate: number = 0
): SetPostureMessage {
  return { posture, clientImmediate };
}

// ============================================
// CM_removeSlowDownEffect (1094) - Server->Client
// ============================================

/**
 * RemoveSlowDownEffectMessage - Remove a slow-down effect from a creature
 *
 * Wire format:
 *   u64  sourceId  (NetworkId of the slow source to remove)
 */
export interface RemoveSlowDownEffectMessage {
  /** NetworkId of the slow source to remove (u64) */
  sourceId: bigint;
}

/**
 * Serialize a RemoveSlowDownEffectMessage payload to wire format.
 *
 * Wire format:
 *   u64  sourceId
 */
export function serializeRemoveSlowDownEffect(
  msg: RemoveSlowDownEffectMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.sourceId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a RemoveSlowDownEffectMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRemoveSlowDownEffect(
  data: Uint8Array,
  offset: number = 0
): RemoveSlowDownEffectMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sourceId = reader.readUInt64LE();  // NetworkId

  return { sourceId };
}

/**
 * Create a RemoveSlowDownEffectMessage.
 *
 * @param sourceId - NetworkId of the slow source to remove
 */
export function createRemoveSlowDownEffect(
  sourceId: bigint
): RemoveSlowDownEffectMessage {
  return { sourceId };
}

// ============================================
// CM_cyberneticsOpen (1201) - Server->Client
// ============================================

/**
 * CyberneticsOpenMessage - Open the cybernetics UI
 *
 * Wire format:
 *   u64  npcId  (NetworkId of cybernetics NPC)
 */
export interface CyberneticsOpenMessage {
  /** NetworkId of the cybernetics NPC (u64) */
  npcId: bigint;
}

/**
 * Serialize a CyberneticsOpenMessage payload to wire format.
 *
 * Wire format:
 *   u64  npcId
 */
export function serializeCyberneticsOpen(
  msg: CyberneticsOpenMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.npcId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a CyberneticsOpenMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCyberneticsOpen(
  data: Uint8Array,
  offset: number = 0
): CyberneticsOpenMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const npcId = reader.readUInt64LE();  // NetworkId

  return { npcId };
}

/**
 * Create a CyberneticsOpenMessage.
 *
 * @param npcId - NetworkId of the cybernetics NPC
 */
export function createCyberneticsOpen(
  npcId: bigint
): CyberneticsOpenMessage {
  return { npcId };
}

// ============================================
// CM_cyberneticsChangeRequest (1203) - Client->Server
// ============================================

/**
 * CyberneticsChangeRequestMessage - Request to install or remove a cybernetic item
 *
 * Wire format:
 *   u64  npcId       (NetworkId of cybernetics NPC)
 *   u64  itemId      (NetworkId of cybernetic item to install/remove)
 *   i32  changeType  (0 = install, 1 = remove)
 */
export interface CyberneticsChangeRequestMessage {
  /** NetworkId of the cybernetics NPC (u64) */
  npcId: bigint;
  /** NetworkId of the cybernetic item to install/remove (u64) */
  itemId: bigint;
  /** Change type: 0 = install, 1 = remove (i32) */
  changeType: number;
}

/**
 * Serialize a CyberneticsChangeRequestMessage payload to wire format.
 * Writes fields in order: npcId, itemId, changeType
 */
export function serializeCyberneticsChangeRequest(
  msg: CyberneticsChangeRequestMessage
): Uint8Array {
  const writer = new BufferWriter(20);
  writer.writeUInt64LE(msg.npcId);        // NetworkId
  writer.writeUInt64LE(msg.itemId);       // NetworkId
  writer.writeInt32LE(msg.changeType);    // i32
  return writer.toBuffer();
}

/**
 * Deserialize a CyberneticsChangeRequestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCyberneticsChangeRequest(
  data: Uint8Array,
  offset: number = 0
): CyberneticsChangeRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const npcId = reader.readUInt64LE();       // NetworkId
  const itemId = reader.readUInt64LE();      // NetworkId
  const changeType = reader.readInt32LE();   // i32

  return { npcId, itemId, changeType };
}

/**
 * Create a CyberneticsChangeRequestMessage.
 *
 * @param npcId      - NetworkId of the cybernetics NPC
 * @param itemId     - NetworkId of the cybernetic item
 * @param changeType - 0 = install, 1 = remove
 */
export function createCyberneticsChangeRequest(
  npcId: bigint,
  itemId: bigint,
  changeType: number
): CyberneticsChangeRequestMessage {
  return { npcId, itemId, changeType };
}

// ============================================
// CM_spaceMiningSaleOpen (1202) - Server->Client
// ============================================

/**
 * SpaceMiningSaleOpenMessage - Open the space mining sale UI
 *
 * Wire format:
 *   u64  terminalId  (NetworkId of the terminal)
 */
export interface SpaceMiningSaleOpenMessage {
  /** NetworkId of the mining sale terminal (u64) */
  terminalId: bigint;
}

/**
 * Serialize a SpaceMiningSaleOpenMessage payload to wire format.
 *
 * Wire format:
 *   u64  terminalId
 */
export function serializeSpaceMiningSaleOpen(
  msg: SpaceMiningSaleOpenMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.terminalId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a SpaceMiningSaleOpenMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSpaceMiningSaleOpen(
  data: Uint8Array,
  offset: number = 0
): SpaceMiningSaleOpenMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();  // NetworkId

  return { terminalId };
}

/**
 * Create a SpaceMiningSaleOpenMessage.
 *
 * @param terminalId - NetworkId of the mining sale terminal
 */
export function createSpaceMiningSaleOpen(
  terminalId: bigint
): SpaceMiningSaleOpenMessage {
  return { terminalId };
}

// ============================================
// CM_spaceMiningSaleSellResource (1206) - Client->Server
// ============================================

/**
 * SpaceMiningSaleSellResourceMessage - Sell a space mining resource
 *
 * Wire format:
 *   u64  resourceContainerId  (NetworkId)
 *   i32  amount
 */
export interface SpaceMiningSaleSellResourceMessage {
  /** NetworkId of the resource container (u64) */
  resourceContainerId: bigint;
  /** Amount to sell (i32) */
  amount: number;
}

/**
 * Serialize a SpaceMiningSaleSellResourceMessage payload to wire format.
 * Writes fields in order: resourceContainerId, amount
 */
export function serializeSpaceMiningSaleSellResource(
  msg: SpaceMiningSaleSellResourceMessage
): Uint8Array {
  const writer = new BufferWriter(12);
  writer.writeUInt64LE(msg.resourceContainerId);  // NetworkId
  writer.writeInt32LE(msg.amount);                // i32
  return writer.toBuffer();
}

/**
 * Deserialize a SpaceMiningSaleSellResourceMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSpaceMiningSaleSellResource(
  data: Uint8Array,
  offset: number = 0
): SpaceMiningSaleSellResourceMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const resourceContainerId = reader.readUInt64LE();  // NetworkId
  const amount = reader.readInt32LE();                // i32

  return { resourceContainerId, amount };
}

/**
 * Create a SpaceMiningSaleSellResourceMessage.
 *
 * @param resourceContainerId - NetworkId of the resource container
 * @param amount              - Amount to sell
 */
export function createSpaceMiningSaleSellResource(
  resourceContainerId: bigint,
  amount: number
): SpaceMiningSaleSellResourceMessage {
  return { resourceContainerId, amount };
}

// ============================================
// CM_clientMinigameOpen (1241) - Server->Client
// ============================================

/**
 * ClientMinigameOpenMessage - Open a client minigame UI
 *
 * Wire format:
 *   u64     terminalId  (NetworkId)
 *   string  gameName    (ASCII u16LE length-prefixed)
 */
export interface ClientMinigameOpenMessage {
  /** NetworkId of the terminal (u64) */
  terminalId: bigint;
  /** Name of the minigame (ASCII) */
  gameName: string;
}

/**
 * Serialize a ClientMinigameOpenMessage payload to wire format.
 * Writes fields in order: terminalId, gameName
 */
export function serializeClientMinigameOpen(
  msg: ClientMinigameOpenMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt64LE(msg.terminalId);              // NetworkId
  writer.writeStringWithLength16LE(msg.gameName);    // string
  return writer.toBuffer();
}

/**
 * Deserialize a ClientMinigameOpenMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeClientMinigameOpen(
  data: Uint8Array,
  offset: number = 0
): ClientMinigameOpenMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();              // NetworkId
  const gameName = reader.readStringWithLength16LE();    // string

  return { terminalId, gameName };
}

/**
 * Create a ClientMinigameOpenMessage.
 *
 * @param terminalId - NetworkId of the terminal
 * @param gameName   - Name of the minigame
 */
export function createClientMinigameOpen(
  terminalId: bigint,
  gameName: string
): ClientMinigameOpenMessage {
  return { terminalId, gameName };
}

// ============================================
// CM_clientMinigameClose (1242) - Client->Server
// ============================================

/**
 * ClientMinigameCloseMessage - Close a client minigame
 *
 * Wire format:
 *   u64     terminalId  (NetworkId)
 *   string  gameName    (ASCII u16LE length-prefixed)
 */
export interface ClientMinigameCloseMessage {
  /** NetworkId of the terminal (u64) */
  terminalId: bigint;
  /** Name of the minigame (ASCII) */
  gameName: string;
}

/**
 * Serialize a ClientMinigameCloseMessage payload to wire format.
 * Writes fields in order: terminalId, gameName
 */
export function serializeClientMinigameClose(
  msg: ClientMinigameCloseMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt64LE(msg.terminalId);              // NetworkId
  writer.writeStringWithLength16LE(msg.gameName);    // string
  return writer.toBuffer();
}

/**
 * Deserialize a ClientMinigameCloseMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeClientMinigameClose(
  data: Uint8Array,
  offset: number = 0
): ClientMinigameCloseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();              // NetworkId
  const gameName = reader.readStringWithLength16LE();    // string

  return { terminalId, gameName };
}

/**
 * Create a ClientMinigameCloseMessage.
 *
 * @param terminalId - NetworkId of the terminal
 * @param gameName   - Name of the minigame
 */
export function createClientMinigameClose(
  terminalId: bigint,
  gameName: string
): ClientMinigameCloseMessage {
  return { terminalId, gameName };
}

// ============================================
// CM_clientMinigameResult (1243) - Client->Server
// ============================================

/**
 * ClientMinigameResultMessage - Report a minigame result to the server
 *
 * Wire format:
 *   u64     terminalId  (NetworkId)
 *   string  gameName    (ASCII u16LE length-prefixed)
 *   i32     score
 *   i32     status      (0 = playing, 1 = won, 2 = lost)
 */
export interface ClientMinigameResultMessage {
  /** NetworkId of the terminal (u64) */
  terminalId: bigint;
  /** Name of the minigame (ASCII) */
  gameName: string;
  /** Minigame score (i32) */
  score: number;
  /** Minigame status: 0 = playing, 1 = won, 2 = lost (i32) */
  status: number;
}

/**
 * Serialize a ClientMinigameResultMessage payload to wire format.
 * Writes fields in order: terminalId, gameName, score, status
 */
export function serializeClientMinigameResult(
  msg: ClientMinigameResultMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt64LE(msg.terminalId);              // NetworkId
  writer.writeStringWithLength16LE(msg.gameName);    // string
  writer.writeInt32LE(msg.score);                    // i32
  writer.writeInt32LE(msg.status);                   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a ClientMinigameResultMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeClientMinigameResult(
  data: Uint8Array,
  offset: number = 0
): ClientMinigameResultMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();              // NetworkId
  const gameName = reader.readStringWithLength16LE();    // string
  const score = reader.readInt32LE();                    // i32
  const status = reader.readInt32LE();                   // i32

  return { terminalId, gameName, score, status };
}

/**
 * Create a ClientMinigameResultMessage.
 *
 * @param terminalId - NetworkId of the terminal
 * @param gameName   - Name of the minigame
 * @param score      - Minigame score
 * @param status     - 0 = playing, 1 = won, 2 = lost
 */
export function createClientMinigameResult(
  terminalId: bigint,
  gameName: string,
  score: number,
  status: number
): ClientMinigameResultMessage {
  return { terminalId, gameName, score, status };
}

// ============================================
// CM_createSaga (1244) - Server->Client
// ============================================

/**
 * CreateSagaMessage - Create a saga (quest chain) on the client
 *
 * Wire format:
 *   string  sagaName  (ASCII u16LE length-prefixed)
 */
export interface CreateSagaMessage {
  /** Name of the saga (ASCII) */
  sagaName: string;
}

/**
 * Serialize a CreateSagaMessage payload to wire format.
 *
 * Wire format:
 *   string  sagaName
 */
export function serializeCreateSaga(msg: CreateSagaMessage): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeStringWithLength16LE(msg.sagaName);  // string
  return writer.toBuffer();
}

/**
 * Deserialize a CreateSagaMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCreateSaga(
  data: Uint8Array,
  offset: number = 0
): CreateSagaMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sagaName = reader.readStringWithLength16LE();  // string

  return { sagaName };
}

/**
 * Create a CreateSagaMessage.
 *
 * @param sagaName - Name of the saga
 */
export function createCreateSaga(sagaName: string): CreateSagaMessage {
  return { sagaName };
}

// ============================================
// CM_openRatingWindow (1245) - Server->Client
// ============================================

/**
 * OpenRatingWindowMessage - Open a rating window on the client
 *
 * Wire format:
 *   string  title  (ASCII u16LE length-prefixed)
 */
export interface OpenRatingWindowMessage {
  /** Title of the rating window (ASCII) */
  title: string;
}

/**
 * Serialize an OpenRatingWindowMessage payload to wire format.
 *
 * Wire format:
 *   string  title
 */
export function serializeOpenRatingWindow(
  msg: OpenRatingWindowMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeStringWithLength16LE(msg.title);  // string
  return writer.toBuffer();
}

/**
 * Deserialize an OpenRatingWindowMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeOpenRatingWindow(
  data: Uint8Array,
  offset: number = 0
): OpenRatingWindowMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const title = reader.readStringWithLength16LE();  // string

  return { title };
}

/**
 * Create an OpenRatingWindowMessage.
 *
 * @param title - Title of the rating window
 */
export function createOpenRatingWindow(
  title: string
): OpenRatingWindowMessage {
  return { title };
}

// ============================================
// CM_ratingFinished (1246) - Client->Server
// ============================================

/**
 * RatingFinishedMessage - Client submits a rating
 *
 * Wire format:
 *   string  title   (ASCII u16LE length-prefixed)
 *   i32     rating
 */
export interface RatingFinishedMessage {
  /** Title of the rating window (ASCII) */
  title: string;
  /** Rating value submitted by the client (i32) */
  rating: number;
}

/**
 * Serialize a RatingFinishedMessage payload to wire format.
 * Writes fields in order: title, rating
 */
export function serializeRatingFinished(
  msg: RatingFinishedMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeStringWithLength16LE(msg.title);  // string
  writer.writeInt32LE(msg.rating);              // i32
  return writer.toBuffer();
}

/**
 * Deserialize a RatingFinishedMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRatingFinished(
  data: Uint8Array,
  offset: number = 0
): RatingFinishedMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const title = reader.readStringWithLength16LE();  // string
  const rating = reader.readInt32LE();              // i32

  return { title, rating };
}

/**
 * Create a RatingFinishedMessage.
 *
 * @param title  - Title of the rating window
 * @param rating - Rating value
 */
export function createRatingFinished(
  title: string,
  rating: number
): RatingFinishedMessage {
  return { title, rating };
}

// ============================================
// CM_openRecipe (1248) - Server->Client
// ============================================

/**
 * OpenRecipeMessage - Open a crafting recipe on the client
 *
 * Wire format:
 *   u64  schematicId  (NetworkId)
 */
export interface OpenRecipeMessage {
  /** NetworkId of the schematic (u64) */
  schematicId: bigint;
}

/**
 * Serialize an OpenRecipeMessage payload to wire format.
 *
 * Wire format:
 *   u64  schematicId
 */
export function serializeOpenRecipe(msg: OpenRecipeMessage): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.schematicId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize an OpenRecipeMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeOpenRecipe(
  data: Uint8Array,
  offset: number = 0
): OpenRecipeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const schematicId = reader.readUInt64LE();  // NetworkId

  return { schematicId };
}

/**
 * Create an OpenRecipeMessage.
 *
 * @param schematicId - NetworkId of the schematic
 */
export function createOpenRecipe(schematicId: bigint): OpenRecipeMessage {
  return { schematicId };
}
