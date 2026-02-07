/**
 * Crafting Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with crafting-related messageTypes.
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueCraftRequestSession.cpp      (CM_requestCraftingSession = 271)
 *   MessageQueueSelectCurrentSchematic.cpp    (CM_selectDraftSchematic = 270)
 *   MessageQueueDraftSchematics.cpp           (CM_draftSchematicsMessage = 258)
 *   MessageQueueDraftSlots.cpp                (CM_draftSlotsMessage = 259, CM_draftSlotsQueryResponse = 447)
 *   MessageQueueCraftIngredients.cpp          (CM_schematicAttribsMessage = 260, CM_ingredientsHopperMessage = 261)
 *   MessageQueueCraftFillSlot.cpp             (CM_fillSchematicSlotMessage = 263)
 *   MessageQueueCraftEmptySlot.cpp            (CM_emptySchematicSlotMessage = 264)
 *   MessageQueueCraftExperiment.cpp           (CM_experimentMessage = 262)
 *   MessageQueueCraftCustomization.cpp        (CM_setCustomizationData = 346)
 *   MessageQueueResourceWeights.cpp           (CM_resourceWeights = 519)
 *   MessageQueueGenericIntResponse.cpp        (CM_craftingResult = 268, CM_nextCraftingStageResult = 446, CM_experimentResult = 275)
 *   MessageQueueGenericResponse.cpp           (CM_nextStageReady = 269)
 *   MessageQueueCraftingSessionEnded.cpp      (CM_craftingSessionEnded = 450)
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Supporting Interfaces
// ============================================

/** A draft schematic entry: server CRC, client CRC, and category */
export interface SchematicData {
  serverCrc: number;
  clientCrc: number;
  category: number;
}

/** An option within a draft slot */
export interface DraftSlotOption {
  /** Unicode name of the option */
  name: string;
  /** NetworkId of the ingredient object (u64) */
  ingredientId: bigint;
  /** Ingredient type (i32) */
  type: number;
  /** Required quantity (i32) */
  quantity: number;
}

/** A single draft slot in the schematic */
export interface DraftSlot {
  /** Unicode name of the slot */
  name: string;
  /** Whether this slot is optional (bool) */
  optional: boolean;
  /** Available ingredient options for this slot */
  options: DraftSlotOption[];
}

/** A craft ingredient entry (used in attribs/hopper messages) */
export interface CraftIngredient {
  /** Unicode name of the ingredient */
  name: string;
  /** Ingredient type (i32) */
  type: number;
  /** Quantity (i32) */
  quantity: number;
}

/** A customization property/value pair */
export interface CustomizationValue {
  /** Property index (i32) */
  property: number;
  /** Property value (i32) */
  value: number;
}

/** An attribute weight entry for resource weighting */
export interface AttribWeight {
  /** Attribute type identifier (u32) */
  attribType: number;
  /** Weight value (i32) */
  weight: number;
}

// ============================================
// GenericIntResponse (shared format)
// CM_craftingResult (268)
// CM_nextCraftingStageResult (446)
// CM_experimentResult (275)
// ============================================

/**
 * GenericIntResponse payload
 *
 * Wire format (C++ MessageQueueGenericIntResponse::pack):
 *   i32  requestId
 *   i32  response
 *   u8   sequenceId
 */
export interface GenericIntResponseMessage {
  /** Request identifier (i32) */
  requestId: number;
  /** Response code (i32) */
  response: number;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

/**
 * Serialize a GenericIntResponse payload
 */
export function serializeGenericIntResponse(msg: GenericIntResponseMessage): Uint8Array {
  const writer = new BufferWriter(9);
  writer.writeInt32LE(msg.requestId);   // i32
  writer.writeInt32LE(msg.response);    // i32
  writer.writeUInt8(msg.sequenceId);    // u8
  return writer.toBuffer();
}

/**
 * Deserialize a GenericIntResponse payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGenericIntResponse(
  data: Uint8Array,
  offset: number = 0
): GenericIntResponseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const requestId = reader.readInt32LE();   // i32
  const response = reader.readInt32LE();    // i32
  const sequenceId = reader.readUInt8();    // u8

  return { requestId, response, sequenceId };
}

/**
 * Create a GenericIntResponse payload
 */
export function createGenericIntResponse(
  requestId: number,
  response: number,
  sequenceId: number = 0
): GenericIntResponseMessage {
  return { requestId, response, sequenceId };
}

// Thin wrappers / aliases for specific CM_ values that share GenericIntResponse format

/** CM_craftingResult (268) - uses GenericIntResponse */
export const serializeCraftingResult = serializeGenericIntResponse;
export const deserializeCraftingResult = deserializeGenericIntResponse;
export const createCraftingResult = createGenericIntResponse;

/** CM_nextCraftingStageResult (446) - uses GenericIntResponse */
export const serializeNextCraftingStageResult = serializeGenericIntResponse;
export const deserializeNextCraftingStageResult = deserializeGenericIntResponse;
export const createNextCraftingStageResult = createGenericIntResponse;

/** CM_experimentResult (275) - uses GenericIntResponse */
export const serializeExperimentResult = serializeGenericIntResponse;
export const deserializeExperimentResult = deserializeGenericIntResponse;
export const createExperimentResult = createGenericIntResponse;

// ============================================
// GenericResponse (shared format)
// CM_nextStageReady (269)
// ============================================

/**
 * GenericResponse payload
 *
 * Wire format (C++ MessageQueueGenericResponse::pack):
 *   i32  requestId
 *   u8   success (bool)
 *   u8   sequenceId
 */
export interface GenericResponseMessage {
  /** Request identifier (i32) */
  requestId: number;
  /** Whether the operation succeeded (bool) */
  success: boolean;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

/**
 * Serialize a GenericResponse payload
 */
export function serializeGenericResponse(msg: GenericResponseMessage): Uint8Array {
  const writer = new BufferWriter(6);
  writer.writeInt32LE(msg.requestId);             // i32
  writer.writeUInt8(msg.success ? 1 : 0);         // bool
  writer.writeUInt8(msg.sequenceId);              // u8
  return writer.toBuffer();
}

/**
 * Deserialize a GenericResponse payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeGenericResponse(
  data: Uint8Array,
  offset: number = 0
): GenericResponseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const requestId = reader.readInt32LE();         // i32
  const success = reader.readUInt8() !== 0;       // bool
  const sequenceId = reader.readUInt8();          // u8

  return { requestId, success, sequenceId };
}

/**
 * Create a GenericResponse payload
 */
export function createGenericResponse(
  requestId: number,
  success: boolean = true,
  sequenceId: number = 0
): GenericResponseMessage {
  return { requestId, success, sequenceId };
}

/** CM_nextStageReady (269) - uses GenericResponse */
export const serializeNextStageReady = serializeGenericResponse;
export const deserializeNextStageReady = deserializeGenericResponse;
export const createNextStageReady = createGenericResponse;

// ============================================
// RequestCraftingSession (CM_requestCraftingSession = 271)
// ============================================

/**
 * RequestCraftingSession payload - Server->Client
 *
 * Wire format (C++ MessageQueueCraftRequestSession::pack):
 *   u64  stationId   (NetworkId)
 *   u8   sequenceId
 */
export interface RequestCraftingSessionMessage {
  /** NetworkId of the crafting station (u64) */
  stationId: bigint;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

/**
 * Serialize a RequestCraftingSession payload
 */
export function serializeRequestCraftingSession(msg: RequestCraftingSessionMessage): Uint8Array {
  const writer = new BufferWriter(9);
  writer.writeUInt64LE(msg.stationId);   // NetworkId (u64)
  writer.writeUInt8(msg.sequenceId);     // u8
  return writer.toBuffer();
}

/**
 * Deserialize a RequestCraftingSession payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRequestCraftingSession(
  data: Uint8Array,
  offset: number = 0
): RequestCraftingSessionMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const stationId = reader.readUInt64LE();   // NetworkId (u64)
  const sequenceId = reader.readUInt8();     // u8

  return { stationId, sequenceId };
}

/**
 * Create a RequestCraftingSession payload
 */
export function createRequestCraftingSession(
  stationId: bigint,
  sequenceId: number = 0
): RequestCraftingSessionMessage {
  return { stationId, sequenceId };
}

// ============================================
// SelectDraftSchematic (CM_selectDraftSchematic = 270)
// ============================================

/**
 * SelectDraftSchematic payload - Server->Client
 *
 * Wire format (C++ MessageQueueSelectCurrentSchematic::pack):
 *   i32  schematic
 */
export interface SelectDraftSchematicMessage {
  /** Index of the selected schematic (i32) */
  schematic: number;
}

/**
 * Serialize a SelectDraftSchematic payload
 */
export function serializeSelectDraftSchematic(msg: SelectDraftSchematicMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.schematic);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a SelectDraftSchematic payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSelectDraftSchematic(
  data: Uint8Array,
  offset: number = 0
): SelectDraftSchematicMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const schematic = reader.readInt32LE();   // i32

  return { schematic };
}

/**
 * Create a SelectDraftSchematic payload
 */
export function createSelectDraftSchematic(
  schematic: number
): SelectDraftSchematicMessage {
  return { schematic };
}

// ============================================
// DraftSchematicsMessage (CM_draftSchematicsMessage = 258)
// ============================================

/**
 * DraftSchematicsMessage payload - Server->Client
 *
 * Wire format (C++ MessageQueueDraftSchematics::pack):
 *   u64  toolId       (NetworkId)
 *   u64  stationId    (NetworkId)
 *   u32  count
 *   for each schematic:
 *     u32  serverCrc   (pair<u32,u32>.first)
 *     u32  clientCrc   (pair<u32,u32>.second)
 *     i32  category
 */
export interface DraftSchematicsMessage {
  /** NetworkId of the crafting tool (u64) */
  toolId: bigint;
  /** NetworkId of the crafting station (u64) */
  stationId: bigint;
  /** List of available draft schematics */
  schematics: SchematicData[];
}

/**
 * Serialize a DraftSchematicsMessage payload
 */
export function serializeDraftSchematics(msg: DraftSchematicsMessage): Uint8Array {
  const writer = new BufferWriter(20 + msg.schematics.length * 12);
  writer.writeUInt64LE(msg.toolId);                   // NetworkId (u64)
  writer.writeUInt64LE(msg.stationId);                // NetworkId (u64)
  writer.writeUInt32LE(msg.schematics.length);        // u32 count

  for (const s of msg.schematics) {
    writer.writeUInt32LE(s.serverCrc);                // u32 (pair first)
    writer.writeUInt32LE(s.clientCrc);                // u32 (pair second)
    writer.writeInt32LE(s.category);                  // i32
  }

  return writer.toBuffer();
}

/**
 * Deserialize a DraftSchematicsMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeDraftSchematics(
  data: Uint8Array,
  offset: number = 0
): DraftSchematicsMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const toolId = reader.readUInt64LE();               // NetworkId (u64)
  const stationId = reader.readUInt64LE();            // NetworkId (u64)
  const count = reader.readUInt32LE();                // u32

  const schematics: SchematicData[] = [];
  for (let i = 0; i < count; i++) {
    const serverCrc = reader.readUInt32LE();          // u32
    const clientCrc = reader.readUInt32LE();          // u32
    const category = reader.readInt32LE();            // i32
    schematics.push({ serverCrc, clientCrc, category });
  }

  return { toolId, stationId, schematics };
}

/**
 * Create a DraftSchematicsMessage payload
 */
export function createDraftSchematics(
  toolId: bigint,
  stationId: bigint,
  schematics: SchematicData[] = []
): DraftSchematicsMessage {
  return { toolId, stationId, schematics };
}

// ============================================
// DraftSlotsMessage (CM_draftSlotsMessage = 259)
// Also used by CM_draftSlotsQueryResponse (447)
// ============================================

/**
 * DraftSlotsMessage payload - Server->Client
 *
 * Wire format (C++ MessageQueueDraftSlots::pack):
 *   u64  toolId          (NetworkId)
 *   u64  manfSchemId     (NetworkId)
 *   u64  prototypeId     (NetworkId)
 *   i32  volume
 *   u8   canManufacture  (bool)
 *   u32  slotCount
 *   for each slot:
 *     Unicode  name
 *     u8       optional   (bool)
 *     u32      optionCount
 *     for each option:
 *       Unicode  name
 *       u64      ingredientId  (NetworkId)
 *       i32      type
 *       i32      quantity
 */
export interface DraftSlotsMessage {
  /** NetworkId of the crafting tool (u64) */
  toolId: bigint;
  /** NetworkId of the manufacturing schematic (u64) */
  manfSchemId: bigint;
  /** NetworkId of the prototype object (u64) */
  prototypeId: bigint;
  /** Volume of the resulting item (i32) */
  volume: number;
  /** Whether this schematic can be manufactured (bool) */
  canManufacture: boolean;
  /** List of ingredient slots */
  slots: DraftSlot[];
}

/**
 * Serialize a DraftSlotsMessage payload
 */
export function serializeDraftSlots(msg: DraftSlotsMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt64LE(msg.toolId);                        // NetworkId (u64)
  writer.writeUInt64LE(msg.manfSchemId);                   // NetworkId (u64)
  writer.writeUInt64LE(msg.prototypeId);                   // NetworkId (u64)
  writer.writeInt32LE(msg.volume);                         // i32
  writer.writeUInt8(msg.canManufacture ? 1 : 0);           // bool
  writer.writeUInt32LE(msg.slots.length);                  // u32 slotCount

  for (const slot of msg.slots) {
    writer.writeUnicodeStringWithLength(slot.name);        // Unicode
    writer.writeUInt8(slot.optional ? 1 : 0);              // bool
    writer.writeUInt32LE(slot.options.length);              // u32 optionCount

    for (const opt of slot.options) {
      writer.writeUnicodeStringWithLength(opt.name);       // Unicode
      writer.writeUInt64LE(opt.ingredientId);              // NetworkId (u64)
      writer.writeInt32LE(opt.type);                       // i32
      writer.writeInt32LE(opt.quantity);                   // i32
    }
  }

  return writer.toBuffer();
}

/**
 * Deserialize a DraftSlotsMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeDraftSlots(
  data: Uint8Array,
  offset: number = 0
): DraftSlotsMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const toolId = reader.readUInt64LE();                    // NetworkId (u64)
  const manfSchemId = reader.readUInt64LE();               // NetworkId (u64)
  const prototypeId = reader.readUInt64LE();               // NetworkId (u64)
  const volume = reader.readInt32LE();                     // i32
  const canManufacture = reader.readUInt8() !== 0;         // bool
  const slotCount = reader.readUInt32LE();                 // u32

  const slots: DraftSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    const name = reader.readUnicodeStringWithLength();     // Unicode
    const optional = reader.readUInt8() !== 0;             // bool
    const optionCount = reader.readUInt32LE();             // u32

    const options: DraftSlotOption[] = [];
    for (let j = 0; j < optionCount; j++) {
      const optName = reader.readUnicodeStringWithLength();  // Unicode
      const ingredientId = reader.readUInt64LE();            // NetworkId (u64)
      const type = reader.readInt32LE();                     // i32
      const quantity = reader.readInt32LE();                 // i32
      options.push({ name: optName, ingredientId, type, quantity });
    }

    slots.push({ name, optional, options });
  }

  return { toolId, manfSchemId, prototypeId, volume, canManufacture, slots };
}

/**
 * Create a DraftSlotsMessage payload
 */
export function createDraftSlots(
  toolId: bigint,
  manfSchemId: bigint,
  prototypeId: bigint,
  volume: number = 1,
  canManufacture: boolean = false,
  slots: DraftSlot[] = []
): DraftSlotsMessage {
  return { toolId, manfSchemId, prototypeId, volume, canManufacture, slots };
}

/** CM_draftSlotsQueryResponse (447) - uses same format as DraftSlotsMessage */
export const serializeDraftSlotsQueryResponse = serializeDraftSlots;
export const deserializeDraftSlotsQueryResponse = deserializeDraftSlots;
export const createDraftSlotsQueryResponse = createDraftSlots;

// ============================================
// CraftIngredients (shared format)
// CM_schematicAttribsMessage (260)
// CM_ingredientsHopperMessage (261)
// ============================================

/**
 * CraftIngredientsMessage payload - Server->Client
 *
 * Wire format (C++ MessageQueueCraftIngredients::pack):
 *   u32  count
 *   for each ingredient:
 *     Unicode  name
 *     i32      type
 *     i32      quantity
 */
export interface CraftIngredientsMessage {
  /** List of ingredients */
  ingredients: CraftIngredient[];
}

/**
 * Serialize a CraftIngredientsMessage payload
 */
export function serializeCraftIngredients(msg: CraftIngredientsMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(msg.ingredients.length);          // u32 count

  for (const ing of msg.ingredients) {
    writer.writeUnicodeStringWithLength(ing.name);       // Unicode
    writer.writeInt32LE(ing.type);                       // i32
    writer.writeInt32LE(ing.quantity);                   // i32
  }

  return writer.toBuffer();
}

/**
 * Deserialize a CraftIngredientsMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCraftIngredients(
  data: Uint8Array,
  offset: number = 0
): CraftIngredientsMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const count = reader.readUInt32LE();                   // u32

  const ingredients: CraftIngredient[] = [];
  for (let i = 0; i < count; i++) {
    const name = reader.readUnicodeStringWithLength();   // Unicode
    const type = reader.readInt32LE();                   // i32
    const quantity = reader.readInt32LE();               // i32
    ingredients.push({ name, type, quantity });
  }

  return { ingredients };
}

/**
 * Create a CraftIngredientsMessage payload
 */
export function createCraftIngredients(
  ingredients: CraftIngredient[] = []
): CraftIngredientsMessage {
  return { ingredients };
}

/** CM_schematicAttribsMessage (260) - uses CraftIngredients format */
export const serializeSchematicAttribs = serializeCraftIngredients;
export const deserializeSchematicAttribs = deserializeCraftIngredients;
export const createSchematicAttribs = createCraftIngredients;

/** CM_ingredientsHopperMessage (261) - uses CraftIngredients format */
export const serializeIngredientsHopper = serializeCraftIngredients;
export const deserializeIngredientsHopper = deserializeCraftIngredients;
export const createIngredientsHopper = createCraftIngredients;

// ============================================
// FillSchematicSlotMessage (CM_fillSchematicSlotMessage = 263)
// ============================================

/**
 * FillSchematicSlotMessage payload - Client->Server
 *
 * Wire format (C++ MessageQueueCraftFillSlot::pack):
 *   u64  ingredient    (NetworkId)
 *   i32  slot
 *   i32  option
 *   u8   sequenceId
 */
export interface FillSchematicSlotMessage {
  /** NetworkId of the ingredient to use (u64) */
  ingredient: bigint;
  /** Slot index to fill (i32) */
  slot: number;
  /** Option index within the slot (i32) */
  option: number;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

/**
 * Serialize a FillSchematicSlotMessage payload
 */
export function serializeFillSchematicSlot(msg: FillSchematicSlotMessage): Uint8Array {
  const writer = new BufferWriter(17);
  writer.writeUInt64LE(msg.ingredient);    // NetworkId (u64)
  writer.writeInt32LE(msg.slot);           // i32
  writer.writeInt32LE(msg.option);         // i32
  writer.writeUInt8(msg.sequenceId);       // u8
  return writer.toBuffer();
}

/**
 * Deserialize a FillSchematicSlotMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeFillSchematicSlot(
  data: Uint8Array,
  offset: number = 0
): FillSchematicSlotMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const ingredient = reader.readUInt64LE();    // NetworkId (u64)
  const slot = reader.readInt32LE();           // i32
  const option = reader.readInt32LE();         // i32
  const sequenceId = reader.readUInt8();       // u8

  return { ingredient, slot, option, sequenceId };
}

/**
 * Create a FillSchematicSlotMessage payload
 */
export function createFillSchematicSlot(
  ingredient: bigint,
  slot: number,
  option: number = 0,
  sequenceId: number = 0
): FillSchematicSlotMessage {
  return { ingredient, slot, option, sequenceId };
}

// ============================================
// EmptySchematicSlotMessage (CM_emptySchematicSlotMessage = 264)
// ============================================

/**
 * EmptySchematicSlotMessage payload - Client->Server
 *
 * Wire format (C++ MessageQueueCraftEmptySlot::pack):
 *   i32  slot
 *   u64  targetContainer  (NetworkId)
 *   u8   sequenceId
 */
export interface EmptySchematicSlotMessage {
  /** Slot index to empty (i32) */
  slot: number;
  /** NetworkId of the container to return ingredients to (u64) */
  targetContainer: bigint;
  /** Sequence identifier (u8) */
  sequenceId: number;
}

/**
 * Serialize an EmptySchematicSlotMessage payload
 */
export function serializeEmptySchematicSlot(msg: EmptySchematicSlotMessage): Uint8Array {
  const writer = new BufferWriter(13);
  writer.writeInt32LE(msg.slot);                 // i32
  writer.writeUInt64LE(msg.targetContainer);     // NetworkId (u64)
  writer.writeUInt8(msg.sequenceId);             // u8
  return writer.toBuffer();
}

/**
 * Deserialize an EmptySchematicSlotMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeEmptySchematicSlot(
  data: Uint8Array,
  offset: number = 0
): EmptySchematicSlotMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const slot = reader.readInt32LE();                 // i32
  const targetContainer = reader.readUInt64LE();     // NetworkId (u64)
  const sequenceId = reader.readUInt8();             // u8

  return { slot, targetContainer, sequenceId };
}

/**
 * Create an EmptySchematicSlotMessage payload
 */
export function createEmptySchematicSlot(
  slot: number,
  targetContainer: bigint,
  sequenceId: number = 0
): EmptySchematicSlotMessage {
  return { slot, targetContainer, sequenceId };
}

// ============================================
// ExperimentMessage (CM_experimentMessage = 262)
// ============================================

/** An experiment point allocation entry */
export interface ExperimentEntry {
  /** Attribute index to experiment on (i32) */
  attributeIndex: number;
  /** Number of experiment points to apply (i32) */
  experimentPoints: number;
}

/**
 * ExperimentMessage payload - Client->Server
 *
 * Wire format (C++ MessageQueueCraftExperiment::pack):
 *   u8   sequenceId
 *   i32  coreLevel
 *   u32  count
 *   for each experiment:
 *     i32  attributeIndex
 *     i32  experimentPoints
 */
export interface ExperimentMessage {
  /** Sequence identifier (u8) */
  sequenceId: number;
  /** Core level for experimentation (i32) */
  coreLevel: number;
  /** List of experiment allocations */
  experiments: ExperimentEntry[];
}

/**
 * Serialize an ExperimentMessage payload
 */
export function serializeExperiment(msg: ExperimentMessage): Uint8Array {
  const writer = new BufferWriter(9 + msg.experiments.length * 8);
  writer.writeUInt8(msg.sequenceId);                     // u8
  writer.writeInt32LE(msg.coreLevel);                    // i32
  writer.writeUInt32LE(msg.experiments.length);          // u32 count

  for (const exp of msg.experiments) {
    writer.writeInt32LE(exp.attributeIndex);             // i32
    writer.writeInt32LE(exp.experimentPoints);           // i32
  }

  return writer.toBuffer();
}

/**
 * Deserialize an ExperimentMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeExperiment(
  data: Uint8Array,
  offset: number = 0
): ExperimentMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sequenceId = reader.readUInt8();                 // u8
  const coreLevel = reader.readInt32LE();                // i32
  const count = reader.readUInt32LE();                   // u32

  const experiments: ExperimentEntry[] = [];
  for (let i = 0; i < count; i++) {
    const attributeIndex = reader.readInt32LE();         // i32
    const experimentPoints = reader.readInt32LE();       // i32
    experiments.push({ attributeIndex, experimentPoints });
  }

  return { sequenceId, coreLevel, experiments };
}

/**
 * Create an ExperimentMessage payload
 */
export function createExperiment(
  sequenceId: number = 0,
  coreLevel: number = 0,
  experiments: ExperimentEntry[] = []
): ExperimentMessage {
  return { sequenceId, coreLevel, experiments };
}

// ============================================
// SetCustomizationData (CM_setCustomizationData = 346)
// ============================================

/**
 * SetCustomizationData payload - Client->Server
 *
 * Wire format (C++ MessageQueueCraftCustomization::pack):
 *   Unicode  name
 *   i32      appearance
 *   i32      itemCount
 *   u32      count
 *   for each customization:
 *     i32  property
 *     i32  value
 */
export interface SetCustomizationDataMessage {
  /** Unicode name for the customized item */
  name: string;
  /** Appearance template index (i32) */
  appearance: number;
  /** Number of items to create (i32) */
  itemCount: number;
  /** List of customization property/value pairs */
  customizations: CustomizationValue[];
}

/**
 * Serialize a SetCustomizationData payload
 */
export function serializeSetCustomizationData(msg: SetCustomizationDataMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUnicodeStringWithLength(msg.name);           // Unicode
  writer.writeInt32LE(msg.appearance);                     // i32
  writer.writeInt32LE(msg.itemCount);                      // i32
  writer.writeUInt32LE(msg.customizations.length);         // u32 count

  for (const c of msg.customizations) {
    writer.writeInt32LE(c.property);                       // i32
    writer.writeInt32LE(c.value);                          // i32
  }

  return writer.toBuffer();
}

/**
 * Deserialize a SetCustomizationData payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetCustomizationData(
  data: Uint8Array,
  offset: number = 0
): SetCustomizationDataMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const name = reader.readUnicodeStringWithLength();       // Unicode
  const appearance = reader.readInt32LE();                 // i32
  const itemCount = reader.readInt32LE();                  // i32
  const count = reader.readUInt32LE();                     // u32

  const customizations: CustomizationValue[] = [];
  for (let i = 0; i < count; i++) {
    const property = reader.readInt32LE();                 // i32
    const value = reader.readInt32LE();                    // i32
    customizations.push({ property, value });
  }

  return { name, appearance, itemCount, customizations };
}

/**
 * Create a SetCustomizationData payload
 */
export function createSetCustomizationData(
  name: string = '',
  appearance: number = 0,
  itemCount: number = 1,
  customizations: CustomizationValue[] = []
): SetCustomizationDataMessage {
  return { name, appearance, itemCount, customizations };
}

// ============================================
// ResourceWeights (CM_resourceWeights = 519)
// ============================================

/**
 * ResourceWeights payload - Server->Client
 *
 * Wire format (C++ MessageQueueResourceWeights::pack):
 *   u32  draftSchematicCrc.first   (pair<u32,u32> server CRC)
 *   u32  draftSchematicCrc.second  (pair<u32,u32> client CRC)
 *   u32  assemblyCount
 *   for each assembly weight:
 *     u32  attribType   (pair<u32,i32>.first)
 *     i32  weight       (pair<u32,i32>.second)
 *   u32  resourceMaxCount
 *   for each resource max weight:
 *     u32  attribType   (pair<u32,i32>.first)
 *     i32  weight       (pair<u32,i32>.second)
 */
export interface ResourceWeightsMessage {
  /** Server CRC of the draft schematic (u32) */
  draftSchematicServerCrc: number;
  /** Client CRC of the draft schematic (u32) */
  draftSchematicClientCrc: number;
  /** Assembly attribute weights */
  assemblyWeights: AttribWeight[];
  /** Resource max attribute weights */
  resourceMaxWeights: AttribWeight[];
}

/**
 * Serialize a ResourceWeights payload
 */
export function serializeResourceWeights(msg: ResourceWeightsMessage): Uint8Array {
  const writer = new BufferWriter(
    12 + msg.assemblyWeights.length * 8 + msg.resourceMaxWeights.length * 8
  );
  writer.writeUInt32LE(msg.draftSchematicServerCrc);           // u32 (pair first)
  writer.writeUInt32LE(msg.draftSchematicClientCrc);           // u32 (pair second)
  writer.writeUInt32LE(msg.assemblyWeights.length);            // u32 assemblyCount

  for (const aw of msg.assemblyWeights) {
    writer.writeUInt32LE(aw.attribType);                       // u32
    writer.writeInt32LE(aw.weight);                            // i32
  }

  writer.writeUInt32LE(msg.resourceMaxWeights.length);         // u32 resourceMaxCount

  for (const rw of msg.resourceMaxWeights) {
    writer.writeUInt32LE(rw.attribType);                       // u32
    writer.writeInt32LE(rw.weight);                            // i32
  }

  return writer.toBuffer();
}

/**
 * Deserialize a ResourceWeights payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeResourceWeights(
  data: Uint8Array,
  offset: number = 0
): ResourceWeightsMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const draftSchematicServerCrc = reader.readUInt32LE();       // u32
  const draftSchematicClientCrc = reader.readUInt32LE();       // u32
  const assemblyCount = reader.readUInt32LE();                 // u32

  const assemblyWeights: AttribWeight[] = [];
  for (let i = 0; i < assemblyCount; i++) {
    const attribType = reader.readUInt32LE();                  // u32
    const weight = reader.readInt32LE();                       // i32
    assemblyWeights.push({ attribType, weight });
  }

  const resourceMaxCount = reader.readUInt32LE();              // u32

  const resourceMaxWeights: AttribWeight[] = [];
  for (let i = 0; i < resourceMaxCount; i++) {
    const attribType = reader.readUInt32LE();                  // u32
    const weight = reader.readInt32LE();                       // i32
    resourceMaxWeights.push({ attribType, weight });
  }

  return { draftSchematicServerCrc, draftSchematicClientCrc, assemblyWeights, resourceMaxWeights };
}

/**
 * Create a ResourceWeights payload
 */
export function createResourceWeights(
  draftSchematicServerCrc: number,
  draftSchematicClientCrc: number,
  assemblyWeights: AttribWeight[] = [],
  resourceMaxWeights: AttribWeight[] = []
): ResourceWeightsMessage {
  return { draftSchematicServerCrc, draftSchematicClientCrc, assemblyWeights, resourceMaxWeights };
}

// ============================================
// CraftingSessionEnded (CM_craftingSessionEnded = 450)
// ============================================

/**
 * CraftingSessionEnded payload - Server->Client
 *
 * Wire format (C++ MessageQueueCraftingSessionEnded::pack):
 *   u8  success  (bool)
 */
export interface CraftingSessionEndedMessage {
  /** Whether the crafting session ended successfully (bool) */
  success: boolean;
}

/**
 * Serialize a CraftingSessionEnded payload
 */
export function serializeCraftingSessionEnded(msg: CraftingSessionEndedMessage): Uint8Array {
  const writer = new BufferWriter(1);
  writer.writeUInt8(msg.success ? 1 : 0);   // bool
  return writer.toBuffer();
}

/**
 * Deserialize a CraftingSessionEnded payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCraftingSessionEnded(
  data: Uint8Array,
  offset: number = 0
): CraftingSessionEndedMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const success = reader.readUInt8() !== 0;   // bool

  return { success };
}

/**
 * Create a CraftingSessionEnded payload
 */
export function createCraftingSessionEnded(
  success: boolean = true
): CraftingSessionEndedMessage {
  return { success };
}
