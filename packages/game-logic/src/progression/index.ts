/**
 * Progression Module
 * XP and skill progression system for SWG
 */

// XP Types
export {
  XpType,
  type XpTypeValue,
  XpCategory,
  type XpCategoryValue,
  XpTypeCategories,
  DefaultXpCaps,
  isValidXpType,
  getXpCategory,
  getXpTypesInCategory,
  getXpTypeDisplayName,
} from './xp-types.js';

// XP Events
export {
  type XpAwardedEvent,
  type SkillAffordableEvent,
  type XpSpentEvent,
  type XpCapChangedEvent,
  type XpCapReachedEvent,
  type GroupXpDistributedEvent,
  type XpEvent,
  XpEventType,
  type XpEventTypeValue,
  type XpEventHandler,
  XpEventEmitter,
  getXpEventEmitter,
  createXpEventEmitter,
} from './xp-events.js';

// Skill Template
export {
  type SkillTemplate,
  createSkillTemplate,
  SkillRegistry,
  getSkillRegistry,
  createSkillRegistry,
} from './skill-template.js';

// XP Manager
export {
  type XpAwardResult,
  type XpAwardOptions,
  XpManager,
  getXpManager,
  createXpManager,
} from './xp-manager.js';

// Combat XP
export {
  WeaponType,
  type WeaponTypeValue,
  type XpDistribution,
  type CombatXpOptions,
  CombatXpCalculator,
  getCombatXpCalculator,
  createCombatXpCalculator,
  calculateCombatXp,
} from './combat-xp.js';

// Group XP
export {
  type GroupMember,
  type MemberXpShare,
  type GroupXpResult,
  type GroupXpOptions,
  GroupXpManager,
  getGroupXpManager,
  createGroupXpManager,
} from './group-xp.js';
