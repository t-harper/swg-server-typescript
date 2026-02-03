/**
 * Faction System
 * Galactic Civil War faction management for SWG server
 *
 * Exports:
 * - Faction types and enums
 * - FactionManager for player faction status
 * - GCWManager for regional control
 * - FactionRewardManager for point rewards
 * - Network message types
 */

// Types and enums
export {
  // Enums
  Faction,
  FactionStatus,
  GCWRegionStatus,
  FactionRankType,
  FactionPerkEffectType,
  GCWContributionSource,
  // Constants
  FACTION_LEAVE_COOLDOWN_MS,
  STATUS_CHANGE_COOLDOWN_MS,
  SF_LEAVE_COOLDOWN_MS,
  MAX_FACTION_POINTS,
  MIN_FACTION_POINTS,
  POINTS_LOST_ON_DEATH,
  WEEKLY_CONTROL_DECAY_PERCENT,
  DEFAULT_NPC_KILL_POINTS,
  DEFAULT_PLAYER_KILL_POINTS,
  // Rank data
  IMPERIAL_RANKS,
  REBEL_RANKS,
  // Interfaces
  type FactionRank,
  type FactionStanding,
  type GCWRegion,
  type FactionPerk,
  type FactionBase,
  type FactionNPCTemplate,
  type PlayerFactionData,
  type GCWContribution,
  // Type helpers
  type ImperialRankIndex,
  type RebelRankIndex,
  // Helper functions
  isGCWFaction,
  getOpposingFaction,
  getRanksForFaction,
  getRankByPoints,
  getFactionName,
  getStatusName,
  canAttack,
  calculateControlPercentage,
  createDefaultFactionData,
  createDefaultStanding,
} from './faction-types.js';

// Faction Manager
export {
  FactionManager,
  createFactionManager,
  DEFAULT_FACTION_CONFIG,
  type FactionManagerConfig,
  type FactionOperationResult,
  type EnlistResult,
  type StatusChangeResult,
  type PointChangeResult,
  type PerkPurchaseResult,
  type FactionStatusChangedEvent,
  type FactionRankChangedEvent,
  type FactionPointsChangedEvent,
  type FactionEnlistedEvent,
  type FactionResignedEvent,
  type FactionStatusChangedHandler,
  type FactionRankChangedHandler,
  type FactionPointsChangedHandler,
  type FactionEnlistedHandler,
  type FactionResignedHandler,
  type FactionRepository,
} from './faction-manager.js';

// GCW Manager
export {
  GCWManager,
  createGCWManager,
  DEFAULT_GCW_CONFIG,
  CONTROL_THRESHOLD_PERCENT,
  CONTESTED_FLIP_THRESHOLD,
  BASE_PASSIVE_CONTRIBUTION,
  BASE_DESTRUCTION_POINTS,
  BASE_DEFENSE_POINTS,
  BASE_VULNERABILITY_HOURS,
  PASSIVE_TICK_INTERVAL_MS,
  MAX_BASES_PER_REGION,
  type GCWManagerConfig,
  type GCWOperationResult,
  type ContributionResult,
  type BasePlacementResult,
  type BaseDestructionResult,
  type RegionalBonus,
  type RegionControlChangedEvent,
  type BasePlacedEvent,
  type BaseDestroyedEvent,
  type GCWPointsContributedEvent,
  type RegionControlChangedHandler,
  type BasePlacedHandler,
  type BaseDestroyedHandler,
  type GCWPointsContributedHandler,
  type GCWRepository,
} from './gcw-manager.js';

// Faction Rewards
export {
  FactionRewardManager,
  createFactionRewardManager,
  DEFAULT_REWARD_CONFIG,
  MISSION_BASE_POINTS,
  MISSION_DIFFICULTY_BONUS,
  OBJECTIVE_CAPTURE_POINTS,
  KILL_STREAK_MULTIPLIER,
  MAX_KILL_STREAK_BONUS,
  SAME_PLAYER_KILL_COOLDOWN_MS,
  MAX_SAME_PLAYER_KILLS_PER_HOUR,
  FactionItemCategory,
  type FactionRewardConfig,
  type RewardResult,
  type RewardModifier,
  type FactionItem,
  type FactionVendorInventory,
  type RewardGrantedEvent,
  type FactionItemPurchasedEvent,
  type RewardGrantedHandler,
  type FactionItemPurchasedHandler,
  type FactionRewardRepository,
} from './faction-rewards.js';

// Network Messages
export {
  FactionMessageOpcode,
  type FactionMessageOpcodeType,
  // Status messages
  type FactionStatusUpdateMessage,
  type FactionPointGainMessage,
  type FactionPointLossMessage,
  type FactionRankChangeMessage,
  // GCW messages
  type GCWRegionStatusMessage,
  type GCWRegionControlChangeMessage,
  // Base messages
  type FactionBaseStatusMessage,
  type FactionBasePlacedMessage,
  type FactionBaseDestroyedMessage,
  type FactionBaseUnderAttackMessage,
  // Request messages
  type EnlistRequestMessage,
  type ResignRequestMessage,
  type StatusChangeRequestMessage,
  type FactionStandingRequestMessage,
  type GCWRegionInfoRequestMessage,
  type FactionPerksRequestMessage,
  type PerkPurchaseRequestMessage,
  type FactionItemsRequestMessage,
  type ItemPurchaseRequestMessage,
  // Response messages
  type EnlistResponseMessage,
  type ResignResponseMessage,
  type StatusChangeResponseMessage,
  type FactionStandingResponseMessage,
  type GCWRegionInfoResponseMessage,
  type FactionPerksResponseMessage,
  type PerkPurchaseResponseMessage,
  type FactionItemsResponseMessage,
  type ItemPurchaseResponseMessage,
  // Data types
  type FactionStandingData,
  type FactionPerkData,
  type FactionItemData,
  // Union types
  type FactionClientMessage,
  type FactionServerMessage,
  type FactionMessage,
  // Helper functions
  isFactionMessageOpcode,
  createFactionStatusUpdate,
  createFactionPointGain,
  createFactionPointLoss,
  createFactionRankChange,
  createGCWRegionStatus,
  createGCWRegionControlChange,
  createFactionBaseStatus,
  createFactionBasePlaced,
  createFactionBaseDestroyed,
  createFactionBaseUnderAttack,
  createEnlistResponse,
  createResignResponse,
  createStatusChangeResponse,
  getRegionStatusName,
} from './faction-messages.js';

// GCW Mechanics
export {
  GCWMechanics,
  createGCWMechanics,
  DEFAULT_MECHANICS_CONFIG,
  // Constants
  MIN_DISTANCE_FROM_CITY,
  MIN_DISTANCE_BETWEEN_BASES,
  MIN_DISTANCE_FROM_ENEMY_BASE,
  DEFAULT_BASE_HEALTH,
  DEFENSE_RATING_DAMAGE_REDUCTION,
  MAX_DEFENSE_RATING,
  INVASION_TRIGGER_THRESHOLD,
  INVASION_CONTROL_CHANGE_THRESHOLD,
  WEEKLY_POINT_DECAY_PERCENT,
  TOP_CONTRIBUTOR_BONUS,
  WEEKLY_CYCLE_MS,
  ZONE_BONUS_TIERS,
  // Types
  type GCWMechanicsConfig,
  type BasePlacementValidation,
  type BaseDefenses,
  type ZoneBonuses,
  type WeeklyCycleRewards,
  type CityLocation,
  // Events
  type InvasionStartedEvent,
  type WeeklyCycleResetEvent,
  type BaseVulnerabilityChangedEvent,
  type InvasionStartedHandler,
  type WeeklyCycleResetHandler,
  type BaseVulnerabilityChangedHandler,
} from './gcw-mechanics.js';

// Invasion Events
export {
  InvasionEvent,
  createInvasionEvent,
  DEFAULT_INVASION_CONFIG,
  // Enums
  InvasionPhase,
  InvasionObjectiveType,
  ObjectiveStatus,
  // Constants
  MUSTERING_DURATION_MS,
  ASSAULT_DURATION_MS,
  DEFENSE_DURATION_MS,
  RESOLUTION_DURATION_MS,
  MIN_PARTICIPANTS,
  OBJECTIVE_CAPTURE_POINTS,
  OBJECTIVE_DEFEND_POINTS,
  PLAYER_KILL_POINTS,
  NPC_KILL_POINTS,
  VICTORY_BONUS_POINTS,
  BASE_REWARD_MULTIPLIER,
  MAX_REWARD_MULTIPLIER,
  // Types
  type InvasionConfig,
  type InvasionObjective,
  type InvasionParticipant,
  type InvasionResult,
  type ParticipantReward,
  // Handlers
  type PhaseChangeHandler,
  type ObjectiveUpdateHandler,
  type ParticipantJoinHandler,
  type ParticipantLeaveHandler,
  type ScoreUpdateHandler,
  type CompleteHandler,
} from './invasion-event.js';

// Faction NPC Spawner
export {
  FactionNPCSpawner,
  createFactionNPCSpawner,
  DEFAULT_SPAWNER_CONFIG,
  // Enums
  NPCSpawnTier,
  NPCRole,
  NPCBehavior,
  // Constants
  TIER_BASE_SPAWN_COUNT,
  TIER_CONTROL_THRESHOLD,
  REINFORCEMENT_DELAY_MS,
  MAX_REINFORCEMENT_WAVES,
  NPC_RESPAWN_DELAY_MS,
  PATROL_UPDATE_INTERVAL_MS,
  MAX_PATROL_WAYPOINTS,
  MAX_NPCS_PER_REGION,
  // Templates
  IMPERIAL_TEMPLATES,
  REBEL_TEMPLATES,
  // Types
  type NPCSpawnerConfig,
  type PatrolWaypoint,
  type PatrolRoute,
  type SpawnedNPC,
  type SpawnPoint,
  type ReinforcementRequest,
  // Events
  type NPCSpawnedEvent,
  type NPCDespawnedEvent,
  type ReinforcementsCalledEvent,
  type NPCSpawnedHandler,
  type NPCDespawnedHandler,
  type ReinforcementsCalledHandler,
} from './faction-npc-spawner.js';

// GCW Messages (advanced)
export {
  GCWMessageOpcode,
  type GCWMessageOpcodeType,
  // Invasion messages
  type InvasionStartMessage,
  type InvasionPhaseChangeMessage,
  type InvasionObjectiveMessage,
  type InvasionResultMessage,
  type InvasionParticipantUpdateMessage,
  type InvasionScoreUpdateMessage,
  type InvasionJoinRequestMessage,
  type InvasionJoinResponseMessage,
  type InvasionLeaveRequestMessage,
  type InvasionRewardsMessage,
  // Base vulnerability messages
  type BaseVulnerabilityMessage,
  type BaseDamageMessage,
  type BaseDefensesMessage,
  type SetVulnerabilityRequestMessage,
  type SetVulnerabilityResponseMessage,
  // Weekly cycle messages
  type WeeklyCycleResetMessage,
  type WeeklyCycleRewardsMessage,
  type WeeklyDecayAppliedMessage,
  // Zone bonus messages
  type ZoneBonusesMessage,
  type ZoneBonusesRequestMessage,
  // NPC messages
  type FactionNPCsSpawnedMessage,
  type ReinforcementsArrivingMessage,
  // Data types
  type InvasionObjectiveData,
  type InvasionParticipantData,
  type SpawnedNPCData,
  // Union types
  type GCWClientMessage,
  type GCWServerMessage,
  type GCWMessage,
  // Helper functions
  isGCWMessageOpcode,
  objectiveToData,
  participantToData,
  spawnedNPCToData,
  createInvasionStartMessage,
  createInvasionPhaseChangeMessage,
  createInvasionObjectiveMessage,
  createInvasionResultMessage,
  createBaseVulnerabilityMessage,
  createWeeklyCycleResetMessage,
  createZoneBonusesMessage,
  createFactionNPCsSpawnedMessage,
  createReinforcementsArrivingMessage,
} from './gcw-messages.js';
