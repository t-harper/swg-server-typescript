/**
 * Image Designer, Buff Builder, and Incubator Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with image designer, buff builder,
 * and incubator-related messageTypes.
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueImageDesignerChangeMessage.cpp  (CM_imageDesignerStart = 570,
 *                                                CM_imageDesignerChange = 568,
 *                                                CM_imageDesignerCancel = 569)
 *   MessageQueueBuffBuilderChangeMessage.cpp    (CM_buffBuilderStart = 604,
 *                                                CM_buffBuilderChange = 602,
 *                                                CM_buffBuilderCancel = 603)
 *   MessageQueueIncubatorStart.cpp              (CM_incubatorStart = 605)
 *   MessageQueueIncubatorCommit.cpp             (CM_incubatorCommit = 606)
 *   (CM_incubatorCancel = 607 -- no payload)
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Supporting Interfaces
// ============================================

/** A single morph parameter change (e.g. face width, jaw size) */
export interface MorphChange {
  /** Name of the customization parameter (ASCII) */
  parameterName: string;
  /** New morph value (f32) */
  value: number;
}

/** A single index parameter change (e.g. hair color, skin tone index) */
export interface IndexChange {
  /** Name of the customization parameter (ASCII) */
  parameterName: string;
  /** New index value (i32) */
  value: number;
}

/** A single buff component entry */
export interface BuffComponent {
  /** Name of the buff component (ASCII) */
  name: string;
  /** First value parameter (i32) */
  value1: number;
  /** Second value parameter (i32) */
  value2: number;
}

// ============================================
// ImageDesignChangeMessage (shared format)
// CM_imageDesignerStart (570)
// CM_imageDesignerChange (568)
// CM_imageDesignerCancel (569)
// ============================================

/**
 * ImageDesignChangeMessage payload
 *
 * Wire format (C++ MessageQueueImageDesignerChangeMessage::pack):
 *   u64    designerId
 *   u64    recipientId
 *   u64    terminalId
 *   u8     newHairSet          (bool)
 *   string newHairAsset        (ASCII u16LE len + bytes)
 *   string hairCustomizationData (ASCII u16LE len + bytes)
 *   i32    designType
 *   i32    startingTime
 *   i32    requiredCredits
 *   i32    offeredCredits
 *   u8     accepted            (bool)
 *   i32    origin
 *   u32    morphChangeCount
 *   for each morph change:
 *     string parameterName     (ASCII)
 *     f32    value
 *   u32    indexChangeCount
 *   for each index change:
 *     string parameterName     (ASCII)
 *     i32    value
 *   string holoEmote           (ASCII)
 *   i32    bodySkillMod
 *   i32    faceSkillMod
 *   i32    markingSkillMod
 *   i32    hairSkillMod
 */
export interface ImageDesignChangeMessage {
  /** NetworkId of the designer player (u64) */
  designerId: bigint;
  /** NetworkId of the recipient player (u64) */
  recipientId: bigint;
  /** NetworkId of the image design terminal (u64) */
  terminalId: bigint;
  /** Whether a new hair style is being set (bool) */
  newHairSet: boolean;
  /** Template path of the new hair asset (ASCII) */
  newHairAsset: string;
  /** Customization string for the hair (ASCII) */
  hairCustomizationData: string;
  /** Type of design session (i32) */
  designType: number;
  /** Starting time of the session (i32) */
  startingTime: number;
  /** Credits required for the design (i32) */
  requiredCredits: number;
  /** Credits offered by the recipient (i32) */
  offeredCredits: number;
  /** Whether the recipient has accepted the changes (bool) */
  accepted: boolean;
  /** Origin of the design request (i32) */
  origin: number;
  /** List of morph (float) parameter changes */
  morphChanges: MorphChange[];
  /** List of index (integer) parameter changes */
  indexChanges: IndexChange[];
  /** Holo-emote to play after the design session (ASCII) */
  holoEmote: string;
  /** Body skill modifier (i32) */
  bodySkillMod: number;
  /** Face skill modifier (i32) */
  faceSkillMod: number;
  /** Marking skill modifier (i32) */
  markingSkillMod: number;
  /** Hair skill modifier (i32) */
  hairSkillMod: number;
}

/**
 * Serialize an ImageDesignChangeMessage payload
 */
export function serializeImageDesignChange(msg: ImageDesignChangeMessage): Uint8Array {
  const writer = new BufferWriter(512);

  writer.writeUInt64LE(msg.designerId);                          // u64
  writer.writeUInt64LE(msg.recipientId);                         // u64
  writer.writeUInt64LE(msg.terminalId);                          // u64
  writer.writeUInt8(msg.newHairSet ? 1 : 0);                    // bool
  writer.writeStringWithLength16LE(msg.newHairAsset);            // ASCII string
  writer.writeStringWithLength16LE(msg.hairCustomizationData);   // ASCII string
  writer.writeInt32LE(msg.designType);                           // i32
  writer.writeInt32LE(msg.startingTime);                         // i32
  writer.writeInt32LE(msg.requiredCredits);                      // i32
  writer.writeInt32LE(msg.offeredCredits);                       // i32
  writer.writeUInt8(msg.accepted ? 1 : 0);                      // bool
  writer.writeInt32LE(msg.origin);                               // i32

  // Morph changes
  writer.writeUInt32LE(msg.morphChanges.length);                 // u32 count
  for (const morph of msg.morphChanges) {
    writer.writeStringWithLength16LE(morph.parameterName);       // ASCII string
    writer.writeFloatLE(morph.value);                            // f32
  }

  // Index changes
  writer.writeUInt32LE(msg.indexChanges.length);                 // u32 count
  for (const index of msg.indexChanges) {
    writer.writeStringWithLength16LE(index.parameterName);       // ASCII string
    writer.writeInt32LE(index.value);                            // i32
  }

  writer.writeStringWithLength16LE(msg.holoEmote);               // ASCII string
  writer.writeInt32LE(msg.bodySkillMod);                         // i32
  writer.writeInt32LE(msg.faceSkillMod);                         // i32
  writer.writeInt32LE(msg.markingSkillMod);                      // i32
  writer.writeInt32LE(msg.hairSkillMod);                         // i32

  return writer.toBuffer();
}

/**
 * Deserialize an ImageDesignChangeMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeImageDesignChange(
  data: Uint8Array,
  offset: number = 0
): ImageDesignChangeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const designerId = reader.readUInt64LE();                      // u64
  const recipientId = reader.readUInt64LE();                     // u64
  const terminalId = reader.readUInt64LE();                      // u64
  const newHairSet = reader.readUInt8() !== 0;                   // bool
  const newHairAsset = reader.readStringWithLength16LE();         // ASCII string
  const hairCustomizationData = reader.readStringWithLength16LE(); // ASCII string
  const designType = reader.readInt32LE();                       // i32
  const startingTime = reader.readInt32LE();                     // i32
  const requiredCredits = reader.readInt32LE();                  // i32
  const offeredCredits = reader.readInt32LE();                   // i32
  const accepted = reader.readUInt8() !== 0;                     // bool
  const origin = reader.readInt32LE();                           // i32

  // Morph changes
  const morphChangeCount = reader.readUInt32LE();                // u32
  const morphChanges: MorphChange[] = [];
  for (let i = 0; i < morphChangeCount; i++) {
    const parameterName = reader.readStringWithLength16LE();     // ASCII string
    const value = reader.readFloatLE();                          // f32
    morphChanges.push({ parameterName, value });
  }

  // Index changes
  const indexChangeCount = reader.readUInt32LE();                // u32
  const indexChanges: IndexChange[] = [];
  for (let i = 0; i < indexChangeCount; i++) {
    const parameterName = reader.readStringWithLength16LE();     // ASCII string
    const value = reader.readInt32LE();                          // i32
    indexChanges.push({ parameterName, value });
  }

  const holoEmote = reader.readStringWithLength16LE();           // ASCII string
  const bodySkillMod = reader.readInt32LE();                     // i32
  const faceSkillMod = reader.readInt32LE();                     // i32
  const markingSkillMod = reader.readInt32LE();                  // i32
  const hairSkillMod = reader.readInt32LE();                     // i32

  return {
    designerId, recipientId, terminalId, newHairSet,
    newHairAsset, hairCustomizationData,
    designType, startingTime, requiredCredits, offeredCredits,
    accepted, origin,
    morphChanges, indexChanges,
    holoEmote, bodySkillMod, faceSkillMod, markingSkillMod, hairSkillMod,
  };
}

/**
 * Create an ImageDesignChangeMessage payload
 */
export function createImageDesignChange(
  designerId: bigint,
  recipientId: bigint,
  terminalId: bigint = BigInt(0),
  newHairSet: boolean = false,
  newHairAsset: string = '',
  hairCustomizationData: string = '',
  designType: number = 0,
  startingTime: number = 0,
  requiredCredits: number = 0,
  offeredCredits: number = 0,
  accepted: boolean = false,
  origin: number = 0,
  morphChanges: MorphChange[] = [],
  indexChanges: IndexChange[] = [],
  holoEmote: string = '',
  bodySkillMod: number = 0,
  faceSkillMod: number = 0,
  markingSkillMod: number = 0,
  hairSkillMod: number = 0
): ImageDesignChangeMessage {
  return {
    designerId, recipientId, terminalId, newHairSet,
    newHairAsset, hairCustomizationData,
    designType, startingTime, requiredCredits, offeredCredits,
    accepted, origin,
    morphChanges, indexChanges,
    holoEmote, bodySkillMod, faceSkillMod, markingSkillMod, hairSkillMod,
  };
}

// ============================================
// BuffBuilderChangeMessage (shared format)
// CM_buffBuilderStart (604)
// CM_buffBuilderChange (602)
// CM_buffBuilderCancel (603)
// ============================================

/**
 * BuffBuilderChangeMessage payload
 *
 * Wire format (C++ MessageQueueBuffBuilderChangeMessage::pack):
 *   u64  bufferId
 *   u64  recipientId
 *   i32  startingTime
 *   i32  credits
 *   u8   accepted            (bool)
 *   i32  origin
 *   u32  buffComponentCount
 *   for each buff component:
 *     string name            (ASCII u16LE)
 *     i32    value1
 *     i32    value2
 */
export interface BuffBuilderChangeMessage {
  /** NetworkId of the buff builder player (u64) */
  bufferId: bigint;
  /** NetworkId of the recipient player (u64) */
  recipientId: bigint;
  /** Starting time of the session (i32) */
  startingTime: number;
  /** Credits for the buff session (i32) */
  credits: number;
  /** Whether the recipient has accepted (bool) */
  accepted: boolean;
  /** Origin of the buff request (i32) */
  origin: number;
  /** List of buff components to apply */
  buffComponents: BuffComponent[];
}

/**
 * Serialize a BuffBuilderChangeMessage payload
 */
export function serializeBuffBuilderChange(msg: BuffBuilderChangeMessage): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt64LE(msg.bufferId);                            // u64
  writer.writeUInt64LE(msg.recipientId);                         // u64
  writer.writeInt32LE(msg.startingTime);                         // i32
  writer.writeInt32LE(msg.credits);                              // i32
  writer.writeUInt8(msg.accepted ? 1 : 0);                      // bool
  writer.writeInt32LE(msg.origin);                               // i32

  // Buff components
  writer.writeUInt32LE(msg.buffComponents.length);               // u32 count
  for (const comp of msg.buffComponents) {
    writer.writeStringWithLength16LE(comp.name);                 // ASCII string
    writer.writeInt32LE(comp.value1);                            // i32
    writer.writeInt32LE(comp.value2);                            // i32
  }

  return writer.toBuffer();
}

/**
 * Deserialize a BuffBuilderChangeMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeBuffBuilderChange(
  data: Uint8Array,
  offset: number = 0
): BuffBuilderChangeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const bufferId = reader.readUInt64LE();                        // u64
  const recipientId = reader.readUInt64LE();                     // u64
  const startingTime = reader.readInt32LE();                     // i32
  const credits = reader.readInt32LE();                          // i32
  const accepted = reader.readUInt8() !== 0;                     // bool
  const origin = reader.readInt32LE();                           // i32

  // Buff components
  const buffComponentCount = reader.readUInt32LE();              // u32
  const buffComponents: BuffComponent[] = [];
  for (let i = 0; i < buffComponentCount; i++) {
    const name = reader.readStringWithLength16LE();              // ASCII string
    const value1 = reader.readInt32LE();                         // i32
    const value2 = reader.readInt32LE();                         // i32
    buffComponents.push({ name, value1, value2 });
  }

  return { bufferId, recipientId, startingTime, credits, accepted, origin, buffComponents };
}

/**
 * Create a BuffBuilderChangeMessage payload
 */
export function createBuffBuilderChange(
  bufferId: bigint,
  recipientId: bigint,
  startingTime: number = 0,
  credits: number = 0,
  accepted: boolean = false,
  origin: number = 0,
  buffComponents: BuffComponent[] = []
): BuffBuilderChangeMessage {
  return { bufferId, recipientId, startingTime, credits, accepted, origin, buffComponents };
}

// ============================================
// IncubatorStart (CM_incubatorStart = 605)
// ============================================

/**
 * IncubatorStartMessage payload
 *
 * Wire format (C++ MessageQueueIncubatorStart::pack):
 *   u64  terminalId
 *   u32  slot
 */
export interface IncubatorStartMessage {
  /** NetworkId of the incubator terminal (u64) */
  terminalId: bigint;
  /** Slot index in the incubator (u32) */
  slot: number;
}

/**
 * Serialize an IncubatorStartMessage payload
 */
export function serializeIncubatorStart(msg: IncubatorStartMessage): Uint8Array {
  const writer = new BufferWriter(12);
  writer.writeUInt64LE(msg.terminalId);   // u64
  writer.writeUInt32LE(msg.slot);         // u32
  return writer.toBuffer();
}

/**
 * Deserialize an IncubatorStartMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeIncubatorStart(
  data: Uint8Array,
  offset: number = 0
): IncubatorStartMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();   // u64
  const slot = reader.readUInt32LE();         // u32

  return { terminalId, slot };
}

/**
 * Create an IncubatorStartMessage payload
 */
export function createIncubatorStart(
  terminalId: bigint,
  slot: number = 0
): IncubatorStartMessage {
  return { terminalId, slot };
}

// ============================================
// IncubatorCommit (CM_incubatorCommit = 606)
// ============================================

/**
 * IncubatorCommitMessage payload
 *
 * Wire format (C++ MessageQueueIncubatorCommit::pack):
 *   u64  terminalId
 *   i32  powerGauge
 *   i32  initialPointsSurvival
 *   i32  initialPointsBravery
 *   i32  initialPointsCunning
 *   i32  totalPointsSurvival
 *   i32  totalPointsBravery
 *   i32  totalPointsCunning
 *   f32  temperatureGauge
 *   f32  nutrientGauge
 *   u32  newCreatureColor
 */
export interface IncubatorCommitMessage {
  /** NetworkId of the incubator terminal (u64) */
  terminalId: bigint;
  /** Power gauge level (i32) */
  powerGauge: number;
  /** Initial survival stat points (i32) */
  initialPointsSurvival: number;
  /** Initial bravery stat points (i32) */
  initialPointsBravery: number;
  /** Initial cunning stat points (i32) */
  initialPointsCunning: number;
  /** Total survival stat points (i32) */
  totalPointsSurvival: number;
  /** Total bravery stat points (i32) */
  totalPointsBravery: number;
  /** Total cunning stat points (i32) */
  totalPointsCunning: number;
  /** Temperature gauge value (f32) */
  temperatureGauge: number;
  /** Nutrient gauge value (f32) */
  nutrientGauge: number;
  /** New creature color index (u32) */
  newCreatureColor: number;
}

/**
 * Serialize an IncubatorCommitMessage payload
 */
export function serializeIncubatorCommit(msg: IncubatorCommitMessage): Uint8Array {
  const writer = new BufferWriter(44);

  writer.writeUInt64LE(msg.terminalId);             // u64
  writer.writeInt32LE(msg.powerGauge);              // i32
  writer.writeInt32LE(msg.initialPointsSurvival);   // i32
  writer.writeInt32LE(msg.initialPointsBravery);    // i32
  writer.writeInt32LE(msg.initialPointsCunning);    // i32
  writer.writeInt32LE(msg.totalPointsSurvival);     // i32
  writer.writeInt32LE(msg.totalPointsBravery);      // i32
  writer.writeInt32LE(msg.totalPointsCunning);      // i32
  writer.writeFloatLE(msg.temperatureGauge);        // f32
  writer.writeFloatLE(msg.nutrientGauge);           // f32
  writer.writeUInt32LE(msg.newCreatureColor);       // u32

  return writer.toBuffer();
}

/**
 * Deserialize an IncubatorCommitMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeIncubatorCommit(
  data: Uint8Array,
  offset: number = 0
): IncubatorCommitMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();             // u64
  const powerGauge = reader.readInt32LE();              // i32
  const initialPointsSurvival = reader.readInt32LE();   // i32
  const initialPointsBravery = reader.readInt32LE();    // i32
  const initialPointsCunning = reader.readInt32LE();    // i32
  const totalPointsSurvival = reader.readInt32LE();     // i32
  const totalPointsBravery = reader.readInt32LE();      // i32
  const totalPointsCunning = reader.readInt32LE();      // i32
  const temperatureGauge = reader.readFloatLE();        // f32
  const nutrientGauge = reader.readFloatLE();           // f32
  const newCreatureColor = reader.readUInt32LE();       // u32

  return {
    terminalId, powerGauge,
    initialPointsSurvival, initialPointsBravery, initialPointsCunning,
    totalPointsSurvival, totalPointsBravery, totalPointsCunning,
    temperatureGauge, nutrientGauge, newCreatureColor,
  };
}

/**
 * Create an IncubatorCommitMessage payload
 */
export function createIncubatorCommit(
  terminalId: bigint,
  powerGauge: number = 0,
  initialPointsSurvival: number = 0,
  initialPointsBravery: number = 0,
  initialPointsCunning: number = 0,
  totalPointsSurvival: number = 0,
  totalPointsBravery: number = 0,
  totalPointsCunning: number = 0,
  temperatureGauge: number = 0,
  nutrientGauge: number = 0,
  newCreatureColor: number = 0
): IncubatorCommitMessage {
  return {
    terminalId, powerGauge,
    initialPointsSurvival, initialPointsBravery, initialPointsCunning,
    totalPointsSurvival, totalPointsBravery, totalPointsCunning,
    temperatureGauge, nutrientGauge, newCreatureColor,
  };
}
