/**
 * @swg/objects
 * Game object implementations for the SWG server
 *
 * This package provides the core object classes that represent
 * entities in the game world, including:
 * - SceneObject: Base class for all world objects
 * - TangibleObject: Physical items and objects
 * - PvP status and faction handling
 * - Tangible options (trade, insured, etc.)
 * - Baseline serialization for client synchronization
 * - Delta tracking for incremental updates
 * - Snowflake-style object ID generation
 */

// Core object classes
export { SceneObject, ObjectType } from './scene-object.js';
export { TangibleObject, DamageType } from './tangible-object.js';
export {
  CreatureObject,
  // Re-exported from protocol
  Posture,
  type PostureType,
  // Locomotion
  Locomotion,
  type LocomotionType,
  // Creature state
  CreatureState,
  type CreatureStateType,
  // HAM
  HamAttribute,
  type HamAttributeType,
  HAM_ATTRIBUTE_COUNT,
  type HamPool,
  // Species and gender
  Species,
  type SpeciesType,
  Gender,
  type GenderType,
  // Equipment
  EquipmentSlot,
  type EquipmentSlotType,
  // Buffs and threats
  type CreatureBuff,
  type ThreatEntry,
  // Property indices
  CreoProperty,
} from './creature-object.js';

export {
  PlayerObject,
  // Player flags
  PlayerFlags,
  type PlayerFlagsType,
  // PvP type
  PvpType,
  type PvpTypeValue,
  // Waypoint
  type Waypoint,
  WaypointColor,
  type WaypointColorType,
  // Quest state
  type QuestState,
  // Admin level
  AdminLevel,
  type AdminLevelType,
  // Crafting stage
  CraftingStage,
  type CraftingStageType,
  // Property indices
  PlayProperty,
} from './player-object.js';

// PvP status handling
export {
  PvpStatus,
  hasPvpFlag,
  setPvpFlag,
  clearPvpFlag,
  togglePvpFlag,
  canBeAttacked,
  isHostile,
  isPlayer,
  isOvert,
  getPvpStatusDescription,
} from './pvp-status.js';

// Tangible options bitmask
export {
  TangibleOptions,
  type TangibleOption,
  hasOption,
  setOption,
  clearOption,
  toggleOption,
  isTradeable,
  canBeDestroyed,
  canBeSold,
  getActiveOptions,
} from './tangible-options.js';

// Object ID generation
export {
  ObjectIdGenerator,
  type ObjectIdGeneratorOptions,
  type ParsedObjectId,
  NULL_OBJECT_ID,
  isNullObjectId,
  compareObjectIds,
  objectIdToString,
  stringToObjectId,
  initializeObjectIdGenerator,
  generateObjectId,
  getDefaultGenerator,
} from './object-id.js';

// Core baseline serialization (SceneObject baselines)
export {
  BaselineType,
  type BaselineTypeValue,
  BaselineNumber,
  type BaselineNumberValue,
  writeBaselineHeader,
  baselineTypeToUInt32,
  uint32ToBaselineType,
  createSceneObjectBaseline1,
  createSceneObjectBaseline4,
  createSceneObjectBaseline7,
  createSceneObjectBaselines,
  writeAsciiString,
  writeUnicodeString,
  writeListHeader,
  writePosition,
  writeOrientation,
  type BaselineCreator,
  registerBaselineCreator,
  getBaselineCreator,
  createBaseline,
} from './baselines.js';

// Delta change tracking
export {
  DeltaType,
  type TrackedChange,
  type ListDelta,
  DeltaTracker,
  createDelta,
  createScalarDelta,
  createListDelta,
} from './deltas.js';

// TANO-specific baseline serialization
export {
  TANO_TYPE_CRC,
  DeltaOperation,
  serializeTanoBaseline3,
  serializeTanoBaseline6,
  generateTanoBaseline3Delta,
  generateTanoBaseline6Delta,
  generateEffectsListDelta,
  generateDefendersListDelta,
  deserializeTanoBaseline3,
  deserializeTanoBaseline6,
  createBaselinePacket,
  createDeltaPacket,
} from './baselines/tano-baselines.js';

// CREO-specific baseline serialization
export {
  CREO_TYPE_CRC,
  serializeCreoBaseline1,
  serializeCreoBaseline3,
  serializeCreoBaseline4,
  serializeCreoBaseline6,
  generateCreoBaseline1Delta,
  generateCreoBaseline3Delta,
  generateCreoBaseline4Delta,
  generateCreoBaseline6Delta,
  generateHamCurrentDelta,
  generateSkillsDelta,
  generateDefendersDelta,
  deserializeCreoBaseline1,
  deserializeCreoBaseline3,
  deserializeCreoBaseline4,
  deserializeCreoBaseline6,
  createCreoBaselines,
} from './baselines/creo-baselines.js';

// PLAY-specific baseline serialization
export {
  PLAY_TYPE_CRC,
  serializePlayBaseline3,
  serializePlayBaseline6,
  serializePlayBaseline8,
  serializePlayBaseline9,
  generatePlayBaseline3Delta,
  generatePlayBaseline6Delta,
  generatePlayBaseline8Delta,
  generatePlayBaseline9Delta,
  generateExperienceDelta,
  generateWaypointsDelta,
  generateFriendsDelta,
  generateIgnoreDelta,
  deserializePlayBaseline3,
  deserializePlayBaseline6,
  deserializePlayBaseline8,
  deserializePlayBaseline9,
  createPlayBaselines,
} from './baselines/play-baselines.js';
