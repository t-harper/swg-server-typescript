/**
 * Bounty Module
 * Bounty hunter system for tracking and hunting Jedi and criminal players
 *
 * This module provides:
 * - Bounty mission generation and management
 * - Investigation clue system
 * - Seeker and probe droid tracking
 * - Network messages for client-server communication
 */

// Bounty types and constants
export {
  // Constants
  MAX_CONCURRENT_BOUNTIES,
  DEFAULT_MISSION_EXPIRY_MS,
  MIN_JEDI_VISIBILITY_FOR_BOUNTY,
  JEDI_REWARD_MULTIPLIER,
  SEEKER_DROID_MAX_RANGE,
  SEEKER_DROID_COOLDOWN_MS,
  CLUE_ACCURACY_DECAY_RATE,
  MIN_CLUE_ACCURACY,
  INFO_BROKER_BASE_COST,
  // Enums
  BountyTargetType,
  BountyStatus,
  BountyMissionType,
  InvestigationClueType,
  BountyFaction,
  BountyDroidType,
  DroidState,
  BountyResultCode,
  // Interfaces
  type BountyMission,
  type InvestigationClue,
  type ClueData,
  type LocationClueData,
  type AliasClueData,
  type ActivityClueData,
  type AssociateClueData,
  type BountyTarget,
  type BountyTerminal,
  type BountyHunter,
  type InformationBroker,
  type BountySystemConfig,
  type BountyOperationResult,
  type DroidTrackingResult,
  type AreaScanResult,
  type DetectedTarget,
} from './bounty-types.js';

// Bounty manager
export {
  DEFAULT_BOUNTY_CONFIG,
  type BountyRepository,
  type VisibilityService,
  type BountyCreditService,
  BountyManager,
  createBountyManager,
} from './bounty-manager.js';

// Investigation system
export {
  DEFAULT_INVESTIGATION_CONFIG,
  type InvestigationConfig,
  type TargetInfoService,
  InvestigationSystem,
  createInvestigationSystem,
} from './investigation-system.js';

// Bounty hunter droids
export {
  DEFAULT_DROID_CONFIG,
  type BountyDroidConfig,
  type BountyDroid,
  type DroidUpdateResult,
  type DroidTargetService,
  BountyHunterDroidManager,
  createBountyHunterDroidManager,
} from './bounty-hunter-droid.js';

// Network messages
export {
  // Opcodes
  BountyMessageOpcode,
  type BountyMessageOpcodeType,
  // Client messages
  type RequestBountyListMessage,
  type BountyAcceptMessage,
  type AbandonBountyMessage,
  type RequestClueMessage,
  type DeploySeekerMessage,
  type DeployProbeMessage,
  type RecallDroidMessage,
  type ProgressToHuntMessage,
  type RequestMissionDetailsMessage,
  // Server messages
  type BountyListResponseMessage,
  type BountyAcceptResponseMessage,
  type AbandonBountyResponseMessage,
  type BountyClueMessage,
  type ClueResponseMessage,
  type DeploySeekerResponseMessage,
  type SeekerDroidUpdateMessage,
  type ProbeScanResultsMessage,
  type BountyTargetLocationMessage,
  type BountyCompletedMessage,
  type BountyFailedMessage,
  type ProgressToHuntResponseMessage,
  type MissionDetailsResponseMessage,
  // Data types
  type BountyListEntry,
  type ClueData as NetworkClueData,
  type LocationClueNetworkData,
  type AliasClueNetworkData,
  type ActivityClueNetworkData,
  type AssociateClueNetworkData,
  type DetectedTargetData,
  type MissionData,
  // Union types
  type BountyClientMessage,
  type BountyServerMessage,
  type BountyMessage,
  // Helper functions
  isBountyMessageOpcode,
  createBountyListResponse,
  createBountyAcceptResponse,
  createBountyClueMessage,
  createSeekerDroidUpdate,
  createProbeScanResults,
  createTargetLocationUpdate,
  createBountyCompleted,
  createBountyFailed,
  getBountyResultMessage,
} from './bounty-messages.js';
