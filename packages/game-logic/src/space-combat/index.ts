/**
 * Space Combat Module
 * JTL (Jump to Lightspeed) space combat system for SWG server
 *
 * Provides:
 * - Space weapon types and damage calculation
 * - Projectile and missile tracking
 * - Target locking system
 * - Countermeasure deployment
 * - Multi-crew turret management
 * - Combat network messages
 */

// Space combat types and enums
export {
  WeaponType,
  TargetLockState,
  DamageType,
  ShipHitLocation,
  type CombatResult,
  type ComponentDamageResult,
  type ProjectileState,
  type MissileState,
  type CountermeasureState,
  type TargetLockInfo,
  type SpaceWeaponStats,
  type SpaceCombatConfig,
  type ShipCombatStats,
  DEFAULT_SPACE_COMBAT_CONFIG,
  createEmptyCombatResult,
  createProjectileState,
  createMissileState,
  createCountermeasureState,
  createTargetLockInfo,
  createDefaultWeaponStats,
  isMissileState,
  isGuidedWeapon,
  weaponRequiresAmmo,
  getWeaponTypeName,
  getDamageTypeName,
  getTargetLockStateName,
  calculateHitLocation,
  distance3D,
  normalizeVector,
  dotProduct,
} from './space-combat-types.js';

// Space combat manager
export {
  type WeaponFireResult,
  type ShipDestructionEvent,
  type ShipDestructionCallback,
  type ProjectileHitCallback,
  SpaceCombatManager,
  createSpaceCombatManager,
} from './space-combat-manager.js';

// Turret controller
export {
  type TurretArc,
  type TurretConfig,
  type TurretState,
  type TurretFireResult,
  DEFAULT_TURRET_ARCS,
  TurretController,
  createTurretController,
  createTurretConfig,
  createYT1300TurretConfigs,
  createARC170TurretConfigs,
} from './turret-controller.js';

// Network messages
export {
  SpaceCombatMessageOpcode,
  type SpaceCombatMessageOpcodeType,
  ProjectileDespawnReason,
  ShipDestructionReason,
  // Client messages
  type WeaponFireMessage,
  type MissileLaunchMessage,
  type CountermeasureDeployMessage,
  type TargetLockRequestMessage,
  type TurretFireMessage,
  // Server messages
  type WeaponFireResponseMessage,
  type ProjectileSpawnMessage,
  type ProjectileUpdateMessage,
  type ProjectileDespawnMessage,
  type MissileTrackingMessage,
  type MissileLockWarningMessage,
  type CountermeasureDeployResponseMessage,
  type CountermeasureActiveMessage,
  type TargetLockMessage,
  type ShipHitMessage,
  type CriticalHitMessage,
  type ComponentDamageMessage,
  type ShipDestructionMessage,
  type ShipDamageUpdateMessage,
  type TurretStatusMessage,
  // Union types
  type SpaceCombatClientMessage,
  type SpaceCombatServerMessage,
  type SpaceCombatMessage,
  // Helper functions
  isSpaceCombatMessageOpcode,
  createWeaponFireResponse,
  createProjectileSpawnMessage,
  createMissileTrackingMessage,
  createMissileLockWarning,
  createTargetLockMessage,
  createShipHitMessage,
  createCriticalHitMessage,
  createComponentDamageMessage,
  createShipDestructionMessage,
  createShipDamageUpdateMessage,
  createTurretStatusMessage,
  getWeaponTypeDisplayName,
  getHitLocationDisplayName,
  getDestructionReasonDisplayName,
} from './space-combat-messages.js';
