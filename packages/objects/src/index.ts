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
  serializeCreoBaseline8,
  serializeCreoBaseline9,
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

// Player Vendor System
export {
  PlayerVendor,
  VendorType,
  VndrProperty,
  VENDOR_INVENTORY_SIZES,
  VENDOR_MAINTENANCE_COSTS,
  MAINTENANCE_WARNING_DAYS,
  getVendorTypeName,
  type VendorItem,
  type VendorSaleResult,
  type MaintenanceStatus as VendorMaintenanceStatus,
} from './player-vendor.js';

// Vendor network messages
export {
  VendorOperation,
  VendorMessageCrc,
  // Browse messages
  type VendorBrowseMessage,
  type VendorBrowseResponseMessage,
  createVendorBrowseMessage,
  createVendorBrowseResponse,
  // Buy messages
  type VendorBuyMessage,
  type VendorBuyResponseMessage,
  createVendorBuyMessage,
  createVendorBuyResponse,
  // Add item messages
  type VendorAddItemMessage,
  type VendorAddItemResponseMessage,
  createVendorAddItemMessage,
  createVendorAddItemResponse,
  // Remove item messages
  type VendorRemoveItemMessage,
  type VendorRemoveItemResponseMessage,
  createVendorRemoveItemMessage,
  createVendorRemoveItemResponse,
  // Withdraw messages
  type VendorWithdrawMessage,
  type VendorWithdrawResponseMessage,
  createVendorWithdrawMessage,
  createVendorWithdrawResponse,
  // Status messages
  type VendorStatusMessage,
  type VendorStatusResponseMessage,
  createVendorStatusMessage,
  createVendorStatusResponse,
  // Update price messages
  type VendorUpdatePriceMessage,
  type VendorUpdatePriceResponseMessage,
  createVendorUpdatePriceMessage,
  createVendorUpdatePriceResponse,
  // Maintenance messages
  type VendorAddMaintenanceMessage,
  type VendorAddMaintenanceResponseMessage,
  createVendorAddMaintenanceMessage,
  createVendorAddMaintenanceResponse,
  // Union types and type guards
  type AnyVendorRequestMessage,
  type AnyVendorResponseMessage,
  isVendorBrowseMessage,
  isVendorBuyMessage,
  isVendorAddItemMessage,
  isVendorRemoveItemMessage,
  isVendorWithdrawMessage,
  isVendorStatusMessage,
  requiresOwnerPrivilege,
} from './vendor-messages.js';

// Bazaar Terminal System
export {
  BazaarTerminal,
  BazaarTerminalType,
  BAZAAR_TERMINAL_CRC,
  DEFAULT_COMMISSION_RATE,
  DEFAULT_GALACTIC_COMMISSION_RATE,
  MAX_COMMISSION_RATE,
  createLocalBazaarTerminal,
  createGalacticBazaarTerminal,
  createCommodityTerminal,
} from './bazaar-terminal.js';

// Cell System Types
export {
  MAX_OBJECTS_PER_CELL,
  MAX_CELL_NAME_LENGTH,
  DEFAULT_CELL_LIGHTING,
  DEFAULT_CELL_FLOORPLAN,
  type CellPortal,
  type CellLighting,
  type CellFloorplan,
} from './cell-types.js';

// Cell Object
export { CellObject } from './cell-object.js';

// Cell Network Messages
export {
  CellOperation,
  CellPermissionChangeType,
  CellMessageCrc,
  // Enter/Leave messages
  type CellEnterMessage,
  type CellEnterResponseMessage,
  type CellLeaveMessage,
  type CellLeaveResponseMessage,
  createCellEnterMessage,
  createCellEnterResponse,
  createCellLeaveMessage,
  createCellLeaveResponse,
  // Contents update messages
  type CellUpdateContentsMessage,
  createCellUpdateContentsMessage,
  // Portal state messages
  type CellPortalStateMessage,
  createCellPortalStateMessage,
  // Permission messages
  type CellPermissionMessage,
  type CellPermissionResponseMessage,
  createCellPermissionMessage,
  createCellPermissionResponse,
  // Lighting messages
  type CellLightingMessage,
  createCellLightingMessage,
  // Union types
  type AnyCellRequestMessage,
  type AnyCellResponseMessage,
  type AnyCellMessage,
  // Type guards
  isCellEnterMessage,
  isCellEnterResponse,
  isCellLeaveMessage,
  isCellLeaveResponse,
  isCellUpdateContentsMessage,
  isCellPortalStateMessage,
  isCellPermissionMessage,
  isCellPermissionResponse,
  isCellLightingMessage,
} from './cell-messages.js';

// Group System Types
export {
  // Constants
  MAX_GROUP_SIZE,
  MAX_RAID_SIZE,
  DEFAULT_INVITE_EXPIRATION,
  // Enums
  GroupLootRule,
  GroupPickupRule,
  GroupFormationType,
  // Interfaces
  type GroupMember,
  type GroupInvite,
  // Helper functions
  getLootRuleName,
  getPickupRuleName,
  getFormationName,
} from './group-types.js';

// Group Object
export {
  GroupObject,
  GrpoProperty,
  type GroupOperationResult,
  type MemberStatusUpdate,
} from './group-object.js';

// Group Network Messages
export {
  GroupOperation,
  GroupMessageCrc,
  // Invite messages
  type GroupInviteMessage,
  type GroupInviteResponseMessage,
  createGroupInviteMessage,
  createGroupInviteResponseMessage,
  // Join/Leave messages
  type GroupJoinMessage,
  type GroupLeaveMessage,
  createGroupJoinMessage,
  createGroupLeaveMessage,
  // Disband message
  type GroupDisbandMessage,
  createGroupDisbandMessage,
  // Kick message
  type GroupKickMessage,
  createGroupKickMessage,
  // Make leader message
  type GroupMakeLeaderMessage,
  createGroupMakeLeaderMessage,
  // Loot rule message
  type GroupLootRuleMessage,
  createGroupLootRuleMessage,
  // Member update message
  type GroupMemberUpdateMessage,
  createGroupMemberUpdateMessage,
  // Chat message
  type GroupChatMessage,
  createGroupChatMessage,
  // Set loot master message
  type GroupSetLootMasterMessage,
  createGroupSetLootMasterMessage,
  // Formation message
  type GroupFormationMessage,
  createGroupFormationMessage,
  // Convert to raid message
  type GroupConvertToRaidMessage,
  createGroupConvertToRaidMessage,
  // Union types and type guards
  type AnyGroupMessage,
  isGroupInviteMessage,
  isGroupInviteResponseMessage,
  isGroupJoinMessage,
  isGroupLeaveMessage,
  isGroupDisbandMessage,
  isGroupKickMessage,
  isGroupMakeLeaderMessage,
  isGroupLootRuleMessage,
  isGroupMemberUpdateMessage,
  isGroupChatMessage,
  requiresLeaderPrivilege,
} from './group-messages.js';

// Building System Types
export {
  // Enums
  BuildingType,
  StructureConditionState,
  BuildingPermission,
  // Interfaces
  type PermissionEntry,
  type MaintenanceStatus,
  type PowerStatus,
  // Constants
  MAX_PERMISSION_LIST,
  STRUCTURE_DECAY_RATE,
  DEFAULT_MAINTENANCE_COSTS,
  DEFAULT_LOT_COSTS,
  DEFAULT_POWER_REQUIREMENTS,
  // Helper functions
  getBuildingTypeName,
  getConditionStateName,
  getConditionStateFromPercent,
  hasPermission,
  createPermissionSet,
} from './building-types.js';

// Building Object
export {
  BuildingObject,
  BuioProperty,
  BuioProperty6,
  type BuildingOperationResult,
} from './building-object.js';

// Building Network Messages
export {
  StructureOperation,
  PermissionUpdateAction,
  StructureMessageCrc,
  // Permission entry data
  type PermissionEntryData,
  // Place messages
  type StructurePlaceMessage,
  type StructurePlaceResponseMessage,
  createStructurePlaceMessage,
  createStructurePlaceResponse,
  // Permission list messages
  type StructurePermissionListMessage,
  type StructurePermissionListResponseMessage,
  createStructurePermissionListMessage,
  createStructurePermissionListResponse,
  // Permission update messages
  type StructurePermissionUpdateMessage,
  type StructurePermissionUpdateResponseMessage,
  createStructurePermissionUpdateMessage,
  createStructurePermissionUpdateResponse,
  // Status messages
  type StructureStatusMessage,
  type StructureStatusResponseMessage,
  createStructureStatusMessage,
  createStructureStatusResponse,
  // Pay maintenance messages
  type StructurePayMaintenanceMessage,
  type StructurePayMaintenanceResponseMessage,
  createStructurePayMaintenanceMessage,
  createStructurePayMaintenanceResponse,
  // Pack messages
  type StructurePackMessage,
  type StructurePackResponseMessage,
  createStructurePackMessage,
  createStructurePackResponse,
  // Destroy messages
  type StructureDestroyMessage,
  type StructureDestroyResponseMessage,
  createStructureDestroyMessage,
  createStructureDestroyResponse,
  // Sign messages
  type StructureSignMessage,
  type StructureSignResponseMessage,
  createStructureSignMessage,
  createStructureSignResponse,
  // Transfer messages
  type StructureTransferMessage,
  type StructureTransferResponseMessage,
  createStructureTransferMessage,
  createStructureTransferResponse,
  // Union types
  type AnyStructureRequestMessage,
  type AnyStructureResponseMessage,
  // Type guards
  isStructurePlaceMessage,
  isStructurePermissionListMessage,
  isStructurePermissionUpdateMessage,
  isStructureStatusMessage,
  isStructurePayMaintenanceMessage,
  isStructurePackMessage,
  isStructureDestroyMessage,
  isStructureSignMessage,
  isStructureTransferMessage,
  requiresOwnerPrivilege as structureRequiresOwnerPrivilege,
  requiresAdminPrivilege,
} from './building-messages.js';

// Guild System Types
export {
  // Constants
  MAX_GUILD_SIZE,
  MAX_GUILD_NAME,
  MAX_GUILD_ABBREVIATION,
  MIN_GUILD_ABBREVIATION,
  MAX_MOTD,
  MIN_MEMBERS_TO_FORM,
  MAX_CUSTOM_RANKS,
  MAX_ALLIES,
  MAX_WARS,
  WAR_COOLDOWN_MS,
  WAR_DECLARE_COOLDOWN_MS,
  // Enums
  GuildRank,
  GuildPermission,
  type GuildPermissionType,
  WarStatus,
  ElectionStatus,
  // Interfaces
  type GuildMember,
  type GuildWar,
  type GuildElection,
  type ElectionCandidate,
  type GuildInvitation,
  type GuildLogEntry,
  // Constants and defaults
  DEFAULT_RANK_PERMISSIONS,
  DEFAULT_RANK_NAMES,
  // Helper functions
  getRankName,
  hasGuildPermission,
  getRankPermissions,
  isCustomRank,
  getPermissionName,
  validateGuildName,
  validateGuildAbbreviation,
} from './guild-types.js';

// Guild Object
export {
  GuildObject,
  type GuildOperationResult,
} from './guild-object.js';

// Guild Network Messages
export {
  GuildOperation,
  GuildMessageCrc,
  // Create/Disband messages
  type GuildCreateMessage,
  type GuildCreateResponseMessage,
  type GuildDisbandMessage,
  type GuildDisbandResponseMessage,
  createGuildCreateMessage,
  createGuildCreateResponse,
  createGuildDisbandMessage,
  createGuildDisbandResponse,
  // Invite/Join/Leave messages
  type GuildInviteMessage,
  type GuildInviteResponseMessage,
  type GuildJoinMessage,
  type GuildJoinResponseMessage,
  type GuildLeaveMessage,
  type GuildLeaveResponseMessage,
  createGuildInviteMessage,
  createGuildInviteResponse,
  createGuildJoinMessage,
  createGuildJoinResponse,
  createGuildLeaveMessage,
  createGuildLeaveResponse,
  // Kick/Promote/Demote messages
  type GuildKickMessage,
  type GuildKickResponseMessage,
  type GuildPromoteMessage,
  type GuildPromoteResponseMessage,
  type GuildDemoteMessage,
  type GuildDemoteResponseMessage,
  createGuildKickMessage,
  createGuildKickResponse,
  createGuildPromoteMessage,
  createGuildPromoteResponse,
  createGuildDemoteMessage,
  createGuildDemoteResponse,
  // MOTD messages
  type GuildSetMotdMessage,
  type GuildSetMotdResponseMessage,
  type GuildMotdMessage,
  createGuildSetMotdMessage,
  createGuildSetMotdResponse,
  createGuildMotdMessage,
  // Treasury messages
  type GuildDepositMessage,
  type GuildDepositResponseMessage,
  type GuildWithdrawMessage,
  type GuildWithdrawResponseMessage,
  createGuildDepositMessage,
  createGuildDepositResponse,
  createGuildWithdrawMessage,
  createGuildWithdrawResponse,
  // War messages
  type GuildWarDeclareMessage,
  type GuildWarDeclareResponseMessage,
  type GuildWarAcceptMessage,
  type GuildWarAcceptResponseMessage,
  createGuildWarDeclareMessage,
  createGuildWarDeclareResponse,
  createGuildWarAcceptMessage,
  createGuildWarAcceptResponse,
  // Info/Member list messages
  type GuildMemberListRequestMessage,
  type GuildMemberListMessage,
  type GuildInfoRequestMessage,
  type GuildInfoMessage,
  createGuildMemberListRequest,
  createGuildMemberListResponse,
  createGuildInfoRequest,
  createGuildInfoResponse,
  // Chat messages
  type GuildChatMessage,
  createGuildChatMessage,
  // Union types
  type AnyGuildRequestMessage,
  type AnyGuildResponseMessage,
  // Type guards
  isGuildCreateMessage,
  isGuildInviteMessage,
  isGuildKickMessage,
  requiresGuildMembership,
  requiresOfficerPermission,
  requiresLeaderPermission,
} from './guild-messages.js';

// City System Types
export {
  // Enums
  CityRank,
  CitySpecialization,
  CitizenRank,
  CityStructureType,
  TaxType,
  CitizenRemovalReason,
  // Constants
  CITY_RANK_THRESHOLDS,
  CITY_RANK_RADIUS,
  MAX_CITY_NAME,
  MAX_CITIZENS,
  ELECTION_DURATION_DAYS,
  MAX_TAX_RATE,
  ELECTION_COOLDOWN_DAYS,
  UPKEEP_PERIOD_DAYS,
  UPKEEP_GRACE_PERIOD_DAYS,
  MIN_CITIZENS_FOR_CITY,
  MIN_CITY_DISTANCE,
  SPECIALIZATION_MIN_RANK,
  STRUCTURE_MAINTENANCE_COST,
  STRUCTURE_MIN_RANK,
  // Interfaces
  type CitizenRecord,
  type CityElection,
  type CityTax,
  // Helper functions
  getCityRankName,
  calculateCityRank,
  getSpecializationName,
  getCitizenRankName,
  getStructureTypeName,
  getTaxTypeName,
  createCitizenRecord,
  createElection,
  hasElectionEnded,
  getElectionTimeRemaining,
  createCityTax,
} from './city-types.js';

// City Object
export { CityObject, type CityOperationResult } from './city-object.js';

// City Network Messages
export {
  CityOperation,
  TreasuryOperationType,
  CityMessageCrc,
  // City info messages
  type CityInfoMessage,
  type CityStatusMessage,
  createCityInfoMessage,
  createCityStatusMessage,
  // Join/Leave messages
  type CityJoinMessage,
  type CityJoinResponseMessage,
  type CityLeaveMessage,
  type CityLeaveResponseMessage,
  createCityJoinMessage,
  createCityJoinResponse,
  createCityLeaveMessage,
  createCityLeaveResponse,
  // Vote messages
  type CityVoteMessage,
  type CityVoteResponseMessage,
  createCityVoteMessage,
  createCityVoteResponse,
  // Election status message
  type CityElectionStatusMessage,
  createCityElectionStatusMessage,
  // Tax messages
  type CityTaxMessage,
  type CityTaxResponseMessage,
  createCityTaxMessage,
  createCityTaxResponse,
  // Treasury messages
  type CityTreasuryMessage,
  type CityTreasuryResponseMessage,
  createCityTreasuryMessage,
  createCityTreasuryResponse,
  // Structure messages
  type CityStructurePlaceMessage,
  type CityStructurePlaceResponseMessage,
  type CityStructureRemoveMessage,
  type CityStructureRemoveResponseMessage,
  createCityStructurePlaceMessage,
  createCityStructurePlaceResponse,
  createCityStructureRemoveMessage,
  createCityStructureRemoveResponse,
  // Citizen list messages
  type CityCitizenListMessage,
  type CityCitizenListResponseMessage,
  type CitizenListEntry,
  createCityCitizenListMessage,
  createCityCitizenListResponse,
  // Banner messages
  type CityBannerMessage,
  type CityBannerResponseMessage,
  createCityBannerMessage,
  createCityBannerResponse,
  // Union types
  type AnyCityRequestMessage,
  type AnyCityResponseMessage,
  // Type guards
  isCityInfoMessage,
  isCityJoinMessage,
  isCityLeaveMessage,
  isCityVoteMessage,
  requiresCityPrivilege,
  requiresMayorPrivilege,
} from './city-messages.js';

// Ship Component System Types
export {
  // Enums
  ShipComponentType,
  ComponentQuality,
  WeaponFireMode,
  // Interfaces
  type ReactorStats,
  type EngineStats,
  type ShieldStats,
  type ArmorStats,
  type CapacitorStats,
  type BoosterStats,
  type DroidInterfaceStats,
  type WeaponStats,
  type ComponentCertification,
  type ReverseEngineeringResult,
  type ReverseEngineeringPart,
  type ComponentLootTier,
  // Helper functions
  getShipComponentTypeName,
  getComponentQualityName,
  getWeaponFireModeName,
  isWeaponComponent,
  getQualityMultiplier,
  getDefaultComponentCertification,
  getLootTierForLevel,
  // Constants
  COMPONENT_LOOT_TIERS,
} from './ship-component-types.js';

// Ship Component Object
export {
  ShipComponentObject,
  ScmpProperty,
  // Factory functions
  createShipComponent,
  createReactor,
  createEngine,
  createShieldGenerator,
  createArmor,
  createCapacitor,
  createBooster,
  createBlasterWeapon,
  createMissileLauncher,
  createCountermeasureLauncher,
  createLootComponent,
} from './ship-component.js';

// Ship Component Network Messages
export {
  ShipComponentOperation,
  DamageSourceType,
  ShipComponentErrorCode,
  ShipComponentMessageCrc,
  // Install messages
  type ShipComponentInstallMessage,
  type ShipComponentInstallResponseMessage,
  createShipComponentInstallMessage,
  createShipComponentInstallResponse,
  // Remove messages
  type ShipComponentRemoveMessage,
  type ShipComponentRemoveResponseMessage,
  createShipComponentRemoveMessage,
  createShipComponentRemoveResponse,
  // Status messages
  type ComponentStatusData,
  type ShipComponentStatusMessage,
  type ShipComponentFullStatusMessage,
  createShipComponentStatusMessage,
  createShipComponentFullStatusMessage,
  // Damage messages
  type ShipComponentDamageMessage,
  createShipComponentDamageMessage,
  // Repair messages
  type ShipComponentRepairMessage,
  type ShipComponentRepairResponseMessage,
  createShipComponentRepairMessage,
  createShipComponentRepairResponse,
  // Info messages
  type ShipComponentInfoMessage,
  type ShipComponentInfoResponseMessage,
  createShipComponentInfoMessage,
  createShipComponentInfoResponse,
  // Error handling
  getShipComponentErrorMessage,
  // Union types
  type AnyShipComponentRequestMessage,
  type AnyShipComponentResponseMessage,
  type AnyShipComponentMessage,
  // Type guards
  isShipComponentInstallMessage,
  isShipComponentInstallResponse,
  isShipComponentRemoveMessage,
  isShipComponentRemoveResponse,
  isShipComponentStatusMessage,
  isShipComponentFullStatusMessage,
  isShipComponentDamageMessage,
  isShipComponentRepairMessage,
  isShipComponentRepairResponse,
  isShipComponentInfoMessage,
  isShipComponentInfoResponse,
} from './ship-component-messages.js';

// Ship System Types (JTL)
export {
  // Enums
  ShipChassisType,
  ShipComponentSlot,
  ShipFaction,
  ShipConditionState,
  DamageDirection,
  // Interfaces
  type ComponentMount,
  type ShipStats,
  type WeaponHardpoint,
  type ShipChassisConfig,
  // Helper functions
  getChassisTypeName,
  getComponentSlotName,
  getShipFactionName,
  getConditionStateName as getShipConditionStateName,
  isWeaponSlot,
  isArmorSlot,
  getWeaponSlotIndex,
  getWeaponSlot,
  getArmorSlotForDirection,
  createEmptyMount,
  createDefaultShipStats,
  isRebelChassis,
  isImperialChassis,
  isMultiCrewChassis,
} from './ship-types.js';

// Ship Object (JTL)
export {
  ShipObject,
  ShipProperty,
  // Factory function
  createShipObject,
  // Type guard
  isShipObject,
} from './ship-object.js';

// Ship Network Messages (JTL)
export {
  ShipOperation,
  DockingState,
  ShipMessageCrc,
  // Transform messages
  type ShipUpdateTransformMessage,
  createShipUpdateTransformMessage,
  // Component data messages
  type ShipComponentDataMessage,
  createShipComponentDataMessage,
  createShipComponentUpdateMessage,
  // Damage messages
  type ShipDamageMessage,
  createShipDamageMessage,
  // Destroyed messages
  type ShipDestroyedMessage,
  createShipDestroyedMessage,
  // Docking messages
  type ShipDockingMessage,
  createShipDockingRequestMessage,
  createShipDockingResponseMessage,
  createShipDockingStateMessage,
  // Weapon fire messages
  type ShipWeaponFireMessage,
  createShipWeaponFireMessage,
  // Target update messages
  type ShipTargetUpdateMessage,
  createShipTargetUpdateMessage,
  // Booster messages
  type ShipBoosterMessage,
  createShipBoosterMessage,
  // Shield balance messages
  type ShipShieldBalanceMessage,
  createShipShieldBalanceMessage,
  // Hyperspace messages
  type ShipHyperspaceMessage,
  createShipHyperspaceEntryMessage,
  createShipHyperspaceExitMessage,
  // Launch/Land messages
  type ShipLaunchMessage,
  type ShipLandMessage,
  createShipLaunchMessage,
  createShipLandMessage,
  // Union types
  type AnyShipMessage,
  // Type guards
  isShipUpdateTransformMessage,
  isShipComponentDataMessage,
  isShipDamageMessage,
  isShipDestroyedMessage,
  isShipDockingMessage,
  isShipWeaponFireMessage,
  isShipTargetUpdateMessage,
  isShipBoosterMessage,
  isShipHyperspaceMessage,
  requiresPilotPrivilege,
  requiresGunnerPrivilege,
} from './ship-messages.js';

// Template CRC lookup system
export {
  calculateTemplateCrc,
  TemplateCrc,
  getTemplateCrc,
  getTemplatePathFromCrc,
  DEFAULT_PLAYER_TEMPLATE_CRC,
} from './template-crc.js';
