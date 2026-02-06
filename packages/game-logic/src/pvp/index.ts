/**
 * PvP Battlefield System
 * Exports all battlefield-related types, managers, and utilities
 */

// Types
export {
  // Enums
  BattlefieldType,
  BattlefieldPhase,
  ObjectiveType,
  BattlefieldRewardType,
  QueueStatus,
  TeamDesignation,
  // Constants
  MIN_PLAYERS_PER_TEAM,
  MAX_PLAYERS_PER_TEAM,
  QUEUE_TIMEOUT_MS,
  MATCH_START_COUNTDOWN_MS,
  DEFAULT_MATCH_DURATION_MS,
  END_PHASE_DURATION_MS,
  POINTS_PER_KILL,
  POINTS_PER_CAPTURE,
  POINTS_PER_STRUCTURE_DESTROY,
  POINTS_PER_HOLD_TICK,
  DEFAULT_RESPAWN_DELAY_MS,
  // Interfaces
  type Position3D,
  type Battlefield,
  type BattlefieldTeam,
  type BattlefieldObjective,
  type BattlefieldParticipant,
  type BattlefieldConfig,
  type BattlefieldObjectiveConfig,
  type VictoryCondition,
  type BattlefieldReward,
  type QueueEntry,
  type BattlefieldMatchResult,
  type ParticipantRewardInfo,
  // Helper functions
  getBattlefieldTypeName,
  getBattlefieldPhaseName,
  getObjectiveTypeName,
  getTeamFromFaction,
  getFactionFromTeam,
  getOpposingTeam,
  createDefaultParticipant,
  createDefaultTeam,
  createObjectiveFromConfig,
  calculateKDRatio,
  calculateParticipantScore,
} from './battlefield-types.js';

// Manager
export {
  BattlefieldManager,
  createBattlefieldManager,
  DEFAULT_BATTLEFIELD_CONFIG,
  // Config
  type BattlefieldManagerConfig,
  // Repository
  type BattlefieldRepository,
  type PlayerBattlefieldStats,
  // Results
  type BattlefieldOperationResult,
  type QueueResult,
  type MatchmakeResult,
  type StartBattlefieldResult,
  type CaptureResult,
  type KillResult,
  type LeaderboardEntry,
  // Events
  type BattlefieldCreatedEvent,
  type BattlefieldPhaseChangedEvent,
  type PlayerJoinedBattlefieldEvent,
  type PlayerLeftBattlefieldEvent,
  type ObjectiveStatusChangedEvent,
  type BattlefieldKillEvent,
  type ScoreChangedEvent,
  type BattlefieldEndedEvent,
  type MatchFoundEvent,
  // Handlers
  type BattlefieldCreatedHandler,
  type BattlefieldPhaseChangedHandler,
  type PlayerJoinedBattlefieldHandler,
  type PlayerLeftBattlefieldHandler,
  type ObjectiveStatusChangedHandler,
  type BattlefieldKillHandler,
  type ScoreChangedHandler,
  type BattlefieldEndedHandler,
  type MatchFoundHandler,
} from './battlefield-manager.js';

// Rewards
export {
  BattlefieldRewardCalculator,
  createBattlefieldRewardCalculator,
  DEFAULT_REWARD_CONFIG,
  TokenShopCategory,
  // Constants
  BASE_TOKEN_REWARD,
  WINNER_TOKEN_MULTIPLIER,
  MVP_TOKEN_BONUS,
  BASE_FACTION_POINT_REWARD,
  WINNER_FACTION_MULTIPLIER,
  MVP_FACTION_BONUS,
  BASE_GCW_POINT_REWARD,
  WINNER_GCW_MULTIPLIER,
  MVP_GCW_BONUS,
  MIN_PARTICIPATION_TIME_MS,
  EARLY_LEAVER_MULTIPLIER,
  // Config
  type BattlefieldRewardConfig,
  // Repository
  type BattlefieldRewardRepository,
  type TokenShopItem,
  type TokenPurchaseRecord,
  // Results
  type DistributeRewardsResult,
  type RewardBreakdown,
  // Events
  type RewardsDistributedEvent,
  type TokensEarnedEvent,
  // Handlers
  type RewardsDistributedHandler,
  type TokensEarnedHandler,
} from './battlefield-rewards.js';

// Messages
export {
  BattlefieldMessageOpcode,
  type BattlefieldMessageOpcodeType,
  // Queue messages
  type BattlefieldQueueMessage,
  type BattlefieldQueueResponseMessage,
  type LeaveQueueRequestMessage,
  type LeaveQueueResponseMessage,
  type BattlefieldMatchFoundMessage,
  type QueueStatusUpdateMessage,
  // Match messages
  type BattlefieldStartMessage,
  type MatchStateUpdateMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type LeaveMatchRequestMessage,
  type LeaveMatchResponseMessage,
  // Objective messages
  type ObjectiveData,
  type Position3DData,
  type BattlefieldObjectiveMessage,
  type ObjectiveCapturedMessage,
  type ObjectiveDestroyedMessage,
  type ObjectiveInteractMessage,
  type ObjectiveInteractResponseMessage,
  // Score messages
  type BattlefieldScoreMessage,
  type KillNotificationMessage,
  type LeaderboardEntryData,
  type LeaderboardUpdateMessage,
  type LeaderboardRequestMessage,
  // End messages
  type BattlefieldEndingMessage,
  type BattlefieldEndMessage,
  type RewardData,
  type BattlefieldRewardMessage,
  // Respawn messages
  type PlayerDiedMessage,
  type RespawnReadyMessage,
  type RespawnRequestMessage,
  type RespawnResponseMessage,
  // Info messages
  type BattlefieldInfoRequestMessage,
  type BattlefieldInfoResponseMessage,
  type BattlefieldListEntry,
  type AvailableBattlefieldsRequestMessage,
  type AvailableBattlefieldsResponseMessage,
  // Union types
  type BattlefieldClientMessage,
  type BattlefieldServerMessage,
  type BattlefieldMessage,
  // Helper functions
  isBattlefieldMessageOpcode,
  createQueueResponse,
  createMatchFoundMessage,
  createStartMessage,
  createScoreMessage,
  createObjectiveCapturedMessage,
  createKillNotification,
  createEndMessage,
  createRewardMessage,
  createPlayerDiedMessage,
  createRespawnReadyMessage,
  getTeamDisplayName,
  getRewardTypeDisplayName,
} from './battlefield-messages.js';
