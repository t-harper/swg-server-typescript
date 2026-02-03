/**
 * @swg/objects
 * Game object implementations for the SWG server
 *
 * This package provides the core object classes that represent
 * entities in the game world, including:
 * - SceneObject: Base class for all world objects
 * - TangibleObject: Physical items and objects
 * - WeaponObject: Weapons with damage, speed, and range
 * - ArmorObject: Armor with protection and encumbrance
 * - CraftingTool: Handheld crafting tools for professions
 * - CraftingStation: Placeable crafting stations with permissions
 * - Container system: Inventory, loot, and factory crate management
 * - PvP status and faction handling
 * - Tangible options (trade, insured, etc.)
 * - Baseline serialization for client synchronization
 * - Delta tracking for incremental updates
 * - Snowflake-style object ID generation
 */

// Core object classes
export { SceneObject, ObjectType } from './scene-object.js';
export { TangibleObject, DamageType } from './tangible-object.js';

// Lair system
export { LairObject, LairState } from './lair-object.js';

// Weapon system
export {
  WeaponObject,
  WeaponType,
  ArmorPiercing,
  ElementalType,
  WeaoProperty,
  HitType,
  // Damage calculation helpers
  calculateBaseDamage,
  calculateRandomDamage,
  calculateTotalDamage,
  getEffectiveRange,
  calculateWeaponDPS,
  calculateTimeToKill,
  compareWeaponsByDPS,
  getWeaponQualityRating,
} from './weapon-object.js';

// Weapon type utilities
export {
  getWeaponTypeName,
  getArmorPiercingName,
  getElementalTypeName,
  isRangedWeapon,
  isMeleeWeapon,
  isLightsaber,
  isHeavyWeapon,
  getArmorBypassPercent,
  getDefaultWeaponRange,
  getDefaultCertification,
} from './weapon-types.js';
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

// WEAO-specific baseline serialization
export {
  WEAO_TYPE_CRC,
  WeaoDeltaOperation,
  serializeWeaoBaseline3,
  serializeWeaoBaseline6,
  generateWeaoBaseline3Delta,
  generateWeaoBaseline6Delta,
  generatePowerupsListDelta,
  deserializeWeaoBaseline3,
  deserializeWeaoBaseline6,
  createWeaoBaselines,
  createWeaoBaselinePacket,
  createWeaoDeltaPacket,
} from './baselines/weao-baselines.js';

// Weapon templates and data
export {
  type WeaponTemplateData,
  WeaponTemplates,
  getWeaponTemplate,
  getWeaponTemplateByPath,
  getWeaponTemplateKeys,
  getWeaponTemplatesByType,
  createWeaponFromTemplate,
  createWeaponByKey,
  getRangedWeaponTemplates,
  getMeleeWeaponTemplates,
} from './data/weapons/index.js';

// Armor system
export {
  ArmorObject,
  ArmorRating,
  ArmorLayer,
  ArmoProperty,
  DEFAULT_EFFECTIVENESS,
  type ArmorRatingType,
  type ArmorLayerType,
} from './armor-object.js';

// Armor rating utilities
export {
  HitLocation,
  ArmorPiercing as ArmorPiercingLevel,
  HIT_LOCATION_TO_ARMOR_LAYERS,
  getArmorRatingName,
  getArmorLayerName,
  getArmorPiercingEffectiveness,
  type HitLocationType,
  type ArmorPiercingType,
} from './armor-rating.js';

// Armor protection calculator
export {
  calculateProtection,
  calculateTotalEncumbrance,
  isLocationProtected,
  getUnprotectedLocations,
  calculateArmorCoverage,
  getBestEffectiveness,
  getAverageEffectiveness,
  rollHitLocation,
  applyConditionDamage,
  DEFAULT_CALCULATOR_CONFIG,
  type ProtectionResult,
  type ProtectionCalculatorConfig,
} from './armor-calculator.js';

// ARMO-specific baseline serialization
export {
  ARMO_TYPE_CRC,
  ArmoDeltaOperation,
  serializeArmoBaseline3,
  serializeArmoBaseline6,
  generateArmoBaseline3Delta,
  generateArmoBaseline6Delta,
  generateAttachedModsDelta,
  generateCoverageSlotsDelta,
  deserializeArmoBaseline3,
  deserializeArmoBaseline6,
  createArmoBaselines,
  createArmoBaselinePacket,
  createArmoDeltaPacket,
} from './baselines/armo-baselines.js';

// Crafting tool types and enumerations
export {
  CraftingToolType,
  StationType,
  ToolQuality,
  SchematicType,
  TOOL_SCHEMATIC_TYPES,
  STATION_TO_TOOL_TYPE,
  TOOL_SKILL_REQUIREMENTS,
  TOOL_EFFECTIVENESS_BY_QUALITY,
  TOOL_COMPLEXITY_BY_QUALITY,
  STATION_EFFECTIVENESS_BONUS,
  STATION_EXPERIMENTATION_BONUS,
  getCraftingToolTypeName,
  getStationTypeName,
  getSchematicTypeName,
  getToolQualityName,
  canToolCraftSchematicType,
  getToolTypeForStation,
  getToolSkillRequirement,
  calculateEffectiveness,
  getComplexityLimit,
  type ToolEffectivenessRange,
} from './crafting-tool-types.js';

// Crafting tool system
export {
  CraftingTool,
  CrftProperty,
  type CraftingSchematic,
} from './crafting-tool.js';

// Crafting station system
export {
  CraftingStation,
  StnoProperty,
  DEFAULT_PLACEMENT_RULES,
  type PlacementRules,
} from './crafting-station.js';

// Crafting tool templates and data
export {
  type CraftingToolTemplateData,
  CraftingToolTemplates,
  getCraftingToolTemplate,
  getCraftingToolTemplateByPath,
  getCraftingToolTemplateKeys,
  getHandheldToolTemplates,
  getCraftingStationTemplates,
  getCraftingToolTemplatesByType,
  getCraftingStationTemplatesByType,
  createCraftingToolFromTemplate,
  createCraftingStationFromTemplate,
  createCraftingToolByKey,
  createPlacedStation,
} from './data/crafting-tools/index.js';

// CRFT-specific baseline serialization (crafting tools)
export {
  CRFT_TYPE_CRC,
  STNO_TYPE_CRC,
  CrftDeltaOperation,
  serializeCrftBaseline3,
  serializeCrftBaseline6,
  serializeStnoBaseline3,
  serializeStnoBaseline6,
  generateCrftBaseline3Delta,
  generateCrftBaseline6Delta,
  generateAllowedUsersListDelta,
  deserializeCrftBaseline3,
  deserializeCrftBaseline6,
  createCrftBaselines,
  createStnoBaselines,
  createCrftBaselinePacket,
  createCrftDeltaPacket,
} from './baselines/crft-baselines.js';

// Container Management System
export {
  // Container types and enums
  ContainerType,
  ContainerPermission,
  SlotRestriction,
  type SlotDefinition,
  TransferResultCode,
  type TransferResult,
  type ContainedItem,
  ContainerChangeType,
  type ContainerChangeEvent,
  DEFAULT_CONTAINER_CAPACITIES,
  DEFAULT_CONTAINER_VOLUMES,
  createSuccessResult,
  createFailureResult,
  getTransferResultMessage,
  // Base Container class
  Container,
  ContProperty,
  // Container Manager service
  ContainerManager,
  getContainerManager,
  type TransferValidationOptions,
  // Factory Crate
  FactoryCrate,
  FcrtProperty,
  DEFAULT_MAX_STACK_SIZE,
  type FactoryCrateItemAttributes,
  // Inventory Container
  InventoryContainer,
  InvProperty,
  EquipmentSlotNames,
  DEFAULT_INVENTORY_CAPACITY,
  DEFAULT_INVENTORY_VOLUME,
  type OverflowItem,
  // Loot Container
  LootContainer,
  LootPermissionMode,
  LootProperty,
  DEFAULT_LOOT_CAPACITY,
  DEFAULT_LOOT_VOLUME,
  DEFAULT_LOOT_DURATION_MS,
  EXTENDED_LOOT_DURATION_MS,
} from './containers/index.js';

// Survey system types
export {
  SurveyToolType,
  SurveyToolQuality,
  type SurveyResult,
  type SampleResult,
  type ResourceSpawnData,
  type SurveyableResource,
  type SurveyWaypoint,
  SURVEY_TOOL_RESOURCE_CLASSES,
  getSurveyToolTypeName,
  getSurveyToolResourceGroup,
  canSurveyResourceClass,
  DEFAULT_SURVEY_COOLDOWN,
  DEFAULT_SAMPLE_COOLDOWN,
  MAX_SURVEY_RESULTS,
  MIN_REPORTABLE_CONCENTRATION,
  SURVEY_RANGE_TIERS,
  SURVEY_ACCURACY_TIERS,
  SAMPLE_SIZE_TIERS,
} from './survey-types.js';

// Survey tool system
export {
  SurveyTool,
  SurveyToolProperty,
  SURVEY_SKILL_MODS,
  QUALITY_MODIFIERS,
} from './survey-tool.js';

// Survey network messages
export {
  SurveyOperation,
  type SurveyMessage,
  type SurveyResultMessage,
  type ResourceListMessage,
  type SampleRequestMessage,
  type SampleResultMessage,
  type CreateWaypointMessage,
  type WaypointCreatedMessage,
  type SurveyCancelMessage,
  type AnySurveyMessage,
  createSurveyMessage,
  createSurveyResultMessage,
  createResourceListMessage,
  createSampleRequestMessage,
  createSampleResultMessage,
  createWaypointMessage,
  createWaypointCreatedMessage,
  createSurveyCancelMessage,
  isSurveyRequest,
  isResourceListRequest,
  isSampleRequest,
  isSurveyResult,
  SurveyMessageCrc,
} from './survey-messages.js';

// Survey tool templates and data
export {
  type SurveyToolTemplateData,
  SurveyToolTemplates,
  getSurveyToolTemplate,
  getSurveyToolTemplateByPath,
  getSurveyToolTemplateKeys,
  getSurveyToolTemplatesByType,
  getSurveyToolTemplatesByQuality,
  createSurveyToolFromTemplate,
  createSurveyToolByKey,
  getBasicSurveyToolTemplates,
  getAdvancedSurveyToolTemplates,
  getMasterSurveyToolTemplates,
  getMineralSurveyToolTemplates,
  getChemicalSurveyToolTemplates,
  getFloraSurveyToolTemplates,
  getGasSurveyToolTemplates,
  getWaterSurveyToolTemplates,
  getOrganicSurveyToolTemplates,
} from './data/survey-tools/index.js';
