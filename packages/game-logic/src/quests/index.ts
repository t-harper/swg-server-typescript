/**
 * @file index.ts
 * Quest system exports for SWG server
 */

// Quest types
export {
  QuestType,
  QuestStatus,
  ObjectiveType,
  QuestRewardType,
  QuestPrerequisiteType,
  QuestResultCode,
  type QuestLocation,
  type QuestObjective,
  type QuestReward,
  type QuestPrerequisite,
  type Quest,
  type ThemeParkQuest,
  type ThemeParkChain,
  type QuestData,
  type QuestObjectiveData,
  type QuestRewardData,
  type QuestPrerequisiteData,
  type ThemeParkChainData,
  isThemeParkQuest,
  isValidQuestType,
  isValidObjectiveType,
  isValidRewardType,
  isValidPrerequisiteType,
} from './quest-types.js';

// Quest loader
export {
  QuestLoader,
  QuestLoadError,
  QuestValidationError,
  type QuestLoadResult,
  type BulkLoadResult,
  getQuestLoader,
  createQuestLoader,
  loadQuests,
  getQuest,
  getQuestsByType,
  getQuestChain,
} from './quest-loader.js';

// Quest journal
export {
  QuestJournal,
  type ObjectiveProgress,
  type ActiveQuest,
  type CompletedQuestRecord,
  type QuestJournalData,
  type JournalOperationResult,
  type PlayerPrerequisites,
  type QuestJournalEvent,
  type QuestJournalEventListener,
  createQuestJournal,
  restoreQuestJournal,
} from './quest-journal.js';

// Mission terminal types
export {
  MissionTerminalType,
  MissionDifficulty,
  GeneratedMissionType,
  type MissionLocation,
  type MissionTarget,
  type DeliveryItem,
  type GeneratedMission,
  type MissionGenerationParams,
  type MissionTerminalConfig,
  type LairSpawnConfig,
  type BountyTargetConfig,
  DEFAULT_TERMINAL_CONFIGS,
  DIFFICULTY_CREDIT_MULTIPLIERS,
  BASE_CREDIT_REWARDS,
  LEVEL_CREDIT_SCALING,
  validateGenerationParams,
  calculateCreditReward,
  determineDifficulty,
  generateMissionId,
  isValidTerminalType,
  isValidDifficulty,
  isValidMissionType,
} from './mission-terminal-types.js';
