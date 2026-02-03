/**
 * AI Behaviors Module
 *
 * Advanced behavior components for NPC AI systems including:
 * - Patrol behaviors (waypoint, random, guard post)
 * - Social behaviors (pack mechanics, herding, territorial)
 * - Combat tactics (target priority, range management, ability rotation)
 * - Threat assessment (aggro table, target switching, leashing)
 * - Boss mechanics (phases, special abilities, add spawning)
 * - NPC scheduling (daily routines, shop hours, events)
 */

// Patrol Behavior
export {
  // Enums
  AlertState,
  PatrolMode,
  // Blackboard keys
  PatrolBlackboardKeys,
  // Action nodes
  WaypointPatrol,
  RandomPatrol,
  GuardPost,
  SetAlertState,
  CheckAlertState,
  UpdateAlertStateTimer,
  PatrolGroupCoordinator,
  // Factory functions
  createPatrolBehavior,
  createPatrolGroupBehavior,
  // Types
  type PatrolBehaviorOptions,
} from './patrol-behavior.js';

// Social Behavior
export {
  // Blackboard keys
  SocialBlackboardKeys,
  // Action nodes
  CallForHelpAdvanced,
  RespondToHelpCall,
  PackFormation,
  FleeAdvanced,
  TerritorialAggression,
  PackLeaderBehavior,
  HerdBehavior,
  // Factory functions
  createPackBehavior,
  createTerritorialBehavior,
  createHerdingBehavior,
  // Types
  type SocialBehaviorOptions,
} from './social-behavior.js';

// Combat Tactics
export {
  // Enums
  CombatRole,
  TargetType,
  // Blackboard keys
  CombatBlackboardKeys,
  // Action nodes
  TargetPriority,
  RangeManagement,
  AbilityRotation,
  DefensiveCooldowns,
  KitingBehavior,
  AoEAvoidance,
  StickyTarget,
  // Factory functions
  createCombatTacticsBehavior,
  createMeleeDPSBehavior,
  createRangedDPSBehavior,
  createTankBehavior,
  // Types
  type AbilityDefinition,
  type AoEZone,
  type CombatTacticsOptions,
} from './combat-tactics.js';

// Threat Assessment
export {
  // Blackboard keys
  ThreatBlackboardKeys,
  // Classes
  ThreatTableManager,
  // Action nodes
  UpdateThreatTable,
  SelectThreatTarget,
  ApplyTaunt,
  CheckDeaggro,
  LeashCheck,
  ThreatDump,
  AssistTarget,
  // Factory functions
  createThreatAssessmentBehavior,
  createThreatManager,
  // Constants
  DEFAULT_THREAT_RULES,
  // Types
  type ThreatEntry,
  type ThreatGenerationRules,
  type ThreatAssessmentOptions,
} from './threat-assessment.js';

// Boss Mechanics
export {
  // Blackboard keys
  BossBlackboardKeys,
  // Action nodes
  PhaseController,
  SpecialAbilityExecutor,
  AddSpawnController,
  EnrageTimer,
  BossMechanicCheck,
  UniqueMechanic,
  // Factory functions
  createBossMechanicsBehavior,
  createSimpleBossBehavior,
  createRaidBossBehavior,
  // Types
  type BossPhase,
  type BossAbility,
  type AddSpawnDefinition,
  type EnrageConfig,
  type BossMechanicsOptions,
} from './boss-mechanics.js';

// NPC Scheduler
export {
  // Enums
  DayPhase,
  // Blackboard keys
  SchedulerBlackboardKeys,
  // Action nodes
  ScheduleController,
  ShopSchedule,
  SleepCycle,
  EventScheduler,
  MoveToActivityLocation,
  CheckDayPhase,
  CheckScheduleActivity,
  // Factory functions
  createNPCSchedulerBehavior,
  createShopkeeperSchedule,
  createDailyRoutineSchedule,
  // Presets
  ActivityPresets,
  // Utilities
  defaultTimeProvider,
  // Types
  type ScheduleActivity,
  type ShopHours,
  type SleepSchedule,
  type ScheduledEvent,
  type TimeProvider,
  type NPCSchedulerOptions,
} from './npc-scheduler.js';
