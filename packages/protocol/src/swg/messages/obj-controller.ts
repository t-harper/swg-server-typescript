/**
 * ObjControllerMessage (0x80CE5E46)
 * GameNetworkMessage wrapper for object controller commands.
 *
 * On the wire (C++ ObjectChannelMessages.h):
 *   u16  operandCount
 *   u32  opcode (0x80CE5E46)
 *   u32  flags
 *   i32  message   (GameControllerMessage enum)
 *   u64  networkId (target object)
 *   f32  value     (generic float param)
 *   ...  payload   (variable per messageType, packed by ControllerMessageFactory)
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

// ============================================
// Opcode
// ============================================

/** CRC32("ObjControllerMessage") */
export const OBJ_CONTROLLER_MESSAGE_OPCODE = 0x80ce5e46;

// ============================================
// GameControllerMessage enum constants
// ============================================

/**
 * Controller message type identifiers.
 * Values are sequential positions from GameControllerMessage.def (C++ enum).
 *
 * Only the constants that are actively used by the server are listed here.
 * Values were verified by counting from the confirmed checkpoints in the .def
 * file (comments like "//110", "//120", "//200", "//240", etc.).
 */
export const GameControllerMessage = {
  /** No-op / placeholder */
  CM_nothing: 0,

  // --- Network transforms (verified from checkpoint //110) ---
  /** World-space position update */
  CM_netUpdateTransform: 113,

  // --- Combat (verified from checkpoint //200) ---
  /** Combat action animation / hit result */
  CM_combatAction: 204,
  /** Combat damage details */
  CM_combatDamage: 205,

  // --- NPC Conversation (verified from checkpoint //220) ---
  /** Start NPC conversation */
  CM_npcConversationStart: 222,
  /** Stop NPC conversation */
  CM_npcConversationStop: 223,
  /** NPC conversation message text */
  CM_npcConversationMessage: 224,
  /** NPC conversation response options */
  CM_npcConversationResponses: 225,
  /** Player selects conversation response */
  CM_npcConversationSelect: 226,

  // --- Opponent info (verified from checkpoint //220) ---
  /** Opponent information for combat */
  CM_opponentInfo: 228,

  // --- Harvester/Resource (verified from checkpoint //220) ---
  /** Activate harvester */
  CM_clientResourceHarvesterActivate: 229,
  /** Deactivate harvester */
  CM_clientResourceHarvesterDeactivate: 230,
  /** Start listening to harvester */
  CM_clientResourceHarvesterListen: 231,
  /** Stop listening to harvester */
  CM_clientResourceHarvesterStopListening: 232,
  /** Request harvester resource data */
  CM_clientResourceHarvesterGetResourceData: 233,
  /** Harvester resource data response */
  CM_clientResourceHarvesterResourceData: 234,
  /** Select resource for harvester */
  CM_clientResourceHarvesterResourceSelect: 235,
  /** Empty harvester hopper */
  CM_clientResourceHarvesterEmptyHopper: 237,
  /** Empty hopper response */
  CM_clientResourceHarvesterEmptyHopperResponse: 238,

  // --- Cell-relative position update ---
  /** Cell-relative position update (inside buildings/ships) */
  CM_netUpdateTransformWithParent: 241,

  // --- Spatial chat (verified from checkpoint //240) ---
  /** Client sends a spatial chat message */
  CM_spatialChatSend: 243,
  /** Server broadcasts a spatial chat message */
  CM_spatialChatReceive: 244,

  // --- Missions (verified from checkpoint //240) ---
  /** Request mission list from terminal */
  CM_missionListRequest: 245,
  /** Mission list response */
  CM_missionListResponse: 246,
  /** Request mission details */
  CM_missionDetailsRequest: 247,
  /** Mission details response */
  CM_missionDetailsResponse: 248,
  /** Accept a mission */
  CM_missionAcceptRequest: 249,
  /** Server creates mission */
  CM_missionCreateRequest: 255,

  // --- Crafting (verified from checkpoint //250) ---
  /** Draft schematics message */
  CM_draftSchematicsMessage: 258,
  /** Draft slots message */
  CM_draftSlotsMessage: 259,
  /** Schematic attributes message */
  CM_schematicAttribsMessage: 260,
  /** Ingredients hopper message */
  CM_ingredientsHopperMessage: 261,
  /** Experiment with crafting */
  CM_experimentMessage: 262,
  /** Fill schematic slot */
  CM_fillSchematicSlotMessage: 263,
  /** Empty schematic slot */
  CM_emptySchematicSlotMessage: 264,
  /** Crafting result */
  CM_craftingResult: 268,
  /** Next crafting stage ready */
  CM_nextStageReady: 269,
  /** Select draft schematic */
  CM_selectDraftSchematic: 270,
  /** Request crafting session */
  CM_requestCraftingSession: 271,
  /** Schematic customizations message */
  CM_schematicCustomizationsMessage: 274,
  /** Experiment result */
  CM_experimentResult: 275,

  // --- Secure trade (verified from checkpoint //270) ---
  /** Secure trade message */
  CM_secureTrade: 277,

  // --- Command queue (verified from checkpoint //270) ---
  /** Enqueue a command (ability, action, etc.) */
  CM_commandQueueEnqueue: 278,
  /** Remove a command from the queue */
  CM_commandQueueRemove: 279,

  // --- Targeting (verified from checkpoint //290) ---
  /** Client sets look-at target */
  CM_clientLookAtTarget: 294,
  /** Client mood change */
  CM_clientMoodChange: 300,

  // --- Social (verified from checkpoint //300) ---
  /** Receive a social animation (mood, emote) */
  CM_socialReceive: 302,
  /** Send a social animation */
  CM_socialSend: 303,

  // --- Posture (verified from checkpoint //300) ---
  /** Set posture (stand, sit, kneel, prone, etc.) */
  CM_setPosture: 305,
  /** Combat spam details */
  CM_combatSpam: 308,

  // --- Sit / Teleport (verified from checkpoint //310) ---
  /** Sit on a specific object (chair) */
  CM_sitOnObject: 315,
  /** Acknowledge teleport */
  CM_teleportAck: 319,
  /** Abort active mission */
  CM_missionAbort: 322,

  // --- Radial menu (verified from checkpoint //320) ---
  /** Client requests radial menu for object */
  CM_objectMenuRequest: 326,
  /** Server responds with radial menu */
  CM_objectMenuResponse: 327,

  // --- Crafting customization (verified from checkpoint //340) ---
  /** Set crafting customization data */
  CM_setCustomizationData: 346,

  // --- Entertainer (verified from checkpoint //350) ---
  /** Set performance type */
  CM_setPerformanceType: 352,
  /** Set performance listen target */
  CM_setPerformanceListenTarget: 353,
  /** Set performance watch target */
  CM_setPerformanceWatchTarget: 354,
  /** Set performance start time */
  CM_setPerformanceStartTime: 356,
  /** Forward NPC conversation message */
  CM_forwardNpcConversationMessage: 357,
  /** Music flourish */
  CM_musicFlourish: 358,

  // --- Fly text / Combat feedback (verified from checkpoint //440) ---
  /** Show floating text above object */
  CM_showFlyText: 445,
  /** Next crafting stage result */
  CM_nextCraftingStageResult: 446,
  /** Draft slots query response */
  CM_draftSlotsQueryResponse: 447,
  /** Crafting session ended */
  CM_craftingSessionEnded: 450,

  // --- Resource weights (verified from checkpoint //510) ---
  /** Resource attribute weights */
  CM_resourceWeights: 519,

  // --- Mod data (verified from checkpoint //550) ---
  /** Modifier data */
  CM_modData: 553,
  /** Cancel modifier */
  CM_cancelMod: 554,

  // --- Quests (verified from checkpoint //570) ---
  /** Set current quest */
  CM_setCurrentQuest: 579,

  // --- Buff builder (verified from checkpoint //600) ---
  /** Buff builder change */
  CM_buffBuilderChange: 602,
  /** Buff builder cancel */
  CM_buffBuilderCancel: 603,
  /** Buff builder start */
  CM_buffBuilderStart: 604,

  // --- Incubator (verified from checkpoint //600) ---
  /** Incubator start */
  CM_incubatorStart: 605,
  /** Incubator commit */
  CM_incubatorCommit: 606,
  /** Incubator cancel */
  CM_incubatorCancel: 607,

  // --- Image designer (verified from checkpoint //560) ---
  /** Image designer change */
  CM_imageDesignerChange: 568,
  /** Image designer cancel */
  CM_imageDesignerCancel: 569,
  /** Image designer start */
  CM_imageDesignerStart: 570,

  // --- Push / Slow down / Quest tasks (verified from checkpoint //1080) ---
  /** Quest task counter data */
  CM_questTaskCounterData: 1089,
  /** Push creature (knockback) */
  CM_pushCreature: 1090,
  /** Quest task timer data */
  CM_questTaskTimerData: 1092,
  /** Slow down visual effect */
  CM_slowDownEffect: 1093,
  /** Remove slow down effect */
  CM_removeSlowDownEffect: 1094,

  // --- Command timer (verified from checkpoint //1090) ---
  /** Command timer (warmup/execute/cooldown) */
  CM_commandTimer: 1096,

  // --- Role icon / combat text (verified from checkpoint //1100) ---
  /** Change group role icon */
  CM_changeRoleIconChoice: 1101,
  /** Show combat text between attacker/defender */
  CM_showCombatText: 1114,
  /** Set current working skill */
  CM_setCurrentWorkingSkill: 1115,
  /** Set profession template */
  CM_setProfessionTemplate: 1116,

  // --- Quest task location (verified from checkpoint //1200) ---
  /** Cybernetrics open */
  CM_cyberneticsOpen: 1201,
  /** Space mining sale open */
  CM_spaceMiningSaleOpen: 1202,
  /** Cybernetics change request */
  CM_cyberneticsChangeRequest: 1203,
  /** Space mining sell resource */
  CM_spaceMiningSaleSellResource: 1206,
  /** Request activate quest */
  CM_requestActivateQuest: 1207,
  /** Request complete quest */
  CM_requestCompleteQuest: 1208,
  /** Quest task location data */
  CM_questTaskLocationData: 1213,
  /** Force activate quest */
  CM_forceActivateQuest: 1215,

  // --- Intended target (verified from checkpoint //1220) ---
  /** Client sets intended (selected) target */
  CM_clientIntendedTarget: 1221,

  // --- Minigame / saga / rating (verified from checkpoint //1240) ---
  /** Client minigame open */
  CM_clientMinigameOpen: 1241,
  /** Client minigame close */
  CM_clientMinigameClose: 1242,
  /** Client minigame result */
  CM_clientMinigameResult: 1243,
  /** Create saga */
  CM_createSaga: 1244,
  /** Open rating window */
  CM_openRatingWindow: 1245,
  /** Rating finished */
  CM_ratingFinished: 1246,
  /** Abandon player quest */
  CM_abandonPlayerQuest: 1247,
  /** Open recipe */
  CM_openRecipe: 1248,
} as const;

export type GameControllerMessageType =
  (typeof GameControllerMessage)[keyof typeof GameControllerMessage];

// ============================================
// ObjControllerMessage interface
// ============================================

export interface ObjControllerMessage {
  opcode: typeof OBJ_CONTROLLER_MESSAGE_OPCODE;
  flags: number;
  messageType: number;
  networkId: bigint;
  value: number;
  /** Raw payload bytes for the controller command (after the header). */
  payload: Uint8Array;
}

// ============================================
// Serialize
// ============================================

/**
 * Serialize an ObjControllerMessage to wire format.
 *
 * Layout:
 *   u16  operandCount (5)
 *   u32  opcode
 *   u32  flags
 *   i32  messageType
 *   u64  networkId
 *   f32  value
 *   ...  payload
 */
export function serializeObjControllerMessage(
  message: ObjControllerMessage
): Uint8Array {
  // header: 2(opCount) + 4(opcode) + 4(flags) + 4(msg) + 8(netId) + 4(val) = 26
  const writer = new BufferWriter(26 + message.payload.length);
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(OBJ_CONTROLLER_MESSAGE_OPCODE);
  writer.writeUInt32LE(message.flags);
  writer.writeInt32LE(message.messageType);
  writer.writeUInt64LE(message.networkId);
  writer.writeFloatLE(message.value);
  if (message.payload.length > 0) {
    writer.writeBytes(message.payload);
  }
  return writer.toBuffer();
}

// ============================================
// Deserialize
// ============================================

/**
 * Deserialize an ObjControllerMessage from wire data.
 * Expects the full GameNetworkMessage starting with operandCount.
 */
export function deserializeObjControllerMessage(
  data: Uint8Array
): ObjControllerMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== OBJ_CONTROLLER_MESSAGE_OPCODE) {
    throw new Error(
      `Invalid opcode for ObjControllerMessage: 0x${opcode.toString(16)}`
    );
  }
  const flags = reader.readUInt32LE();
  const messageType = reader.readInt32LE();
  const networkId = reader.readUInt64LE();
  const value = reader.readFloatLE();
  const payload = reader.readRemaining();

  return {
    opcode: OBJ_CONTROLLER_MESSAGE_OPCODE,
    flags,
    messageType,
    networkId,
    value,
    payload,
  };
}

// ============================================
// Factory
// ============================================

/**
 * Create an ObjControllerMessage.
 *
 * @param messageType - GameControllerMessage enum value
 * @param networkId   - Target object NetworkId
 * @param payload     - Serialized controller-command payload bytes
 * @param flags       - Header flags (default 0)
 * @param value       - Generic float parameter (default 0)
 */
export function createObjControllerMessage(
  messageType: number,
  networkId: bigint,
  payload: Uint8Array = new Uint8Array(0),
  flags: number = 0,
  value: number = 0
): ObjControllerMessage {
  return {
    opcode: OBJ_CONTROLLER_MESSAGE_OPCODE,
    flags,
    messageType,
    networkId,
    value,
    payload,
  };
}

// ============================================
// Command Registry / Dispatch
// ============================================

/**
 * Handler function signature for a controller command payload.
 * Receives the parsed ObjControllerMessage header plus raw payload bytes.
 */
export type ControllerCommandHandler = (
  header: ObjControllerMessage
) => void;

/** Internal registry: messageType -> handler */
const commandHandlers = new Map<number, ControllerCommandHandler>();

/**
 * Register a handler for a specific controller message type.
 * Handlers are invoked by `dispatchControllerCommand`.
 */
export function registerControllerCommand(
  messageType: number,
  handler: ControllerCommandHandler
): void {
  commandHandlers.set(messageType, handler);
}

/**
 * Unregister a previously registered handler.
 */
export function unregisterControllerCommand(messageType: number): void {
  commandHandlers.delete(messageType);
}

/**
 * Dispatch a deserialized ObjControllerMessage to the registered handler.
 * Returns `true` if a handler was found and invoked, `false` otherwise.
 */
export function dispatchControllerCommand(
  message: ObjControllerMessage
): boolean {
  const handler = commandHandlers.get(message.messageType);
  if (handler) {
    handler(message);
    return true;
  }
  return false;
}

/**
 * Check whether a handler is registered for the given message type.
 */
export function hasControllerCommandHandler(messageType: number): boolean {
  return commandHandlers.has(messageType);
}
