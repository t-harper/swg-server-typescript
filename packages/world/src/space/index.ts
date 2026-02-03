/**
 * @swg/world - Space Zone exports
 * Jump to Lightspeed (JTL) space zone system
 */

// Types and enums
export {
  // Enums
  SpaceZoneId,
  SpaceSectorType,
  SpaceFaction,
  NebulaEffectType,
  StationService,
  ShipClass,
  DockingStatus,
  // Interfaces
  type SpaceBounds,
  type AsteroidField,
  type Nebula,
  type SpaceStation,
  type HyperspaceRoute,
  type SpawnPoint,
  type SpaceZoneConfig,
  type SpaceShip,
  type CollisionResult,
  // Utility functions
  createSpaceBounds,
  isWithinSpaceBounds,
  distance3D,
  distanceSquared3D,
} from './space-types.js';

// Space zone class
export {
  SpaceZone,
  createSpaceZone,
  type SpaceZoneMessage,
  type SpaceMessageHandler,
  type DockingState,
} from './space-zone.js';

// Space zone loader
export {
  SpaceZoneLoader,
  createSpaceZoneLoader,
  SPACE_ZONE_CONFIGS,
  findHyperspaceRoute,
} from './space-zone-loader.js';

// Network messages
export {
  // Base types
  type SpaceNetworkMessage,
  type SpaceMessage,
  // Message types
  type EnterSpaceZoneMessage,
  type LeaveSpaceZoneMessage,
  type HyperspaceRequestMessage,
  type HyperspaceResponseMessage,
  type HyperspaceBeginMessage,
  type HyperspaceCompleteMessage,
  type DockingRequestMessage,
  type DockingResponseMessage,
  type DockingGrantedMessage,
  type DockingCompleteMessage,
  type UndockingRequestMessage,
  type UndockingCompleteMessage,
  type ShipUpdateMessage,
  type ShipDamageMessage,
  type ShipDestroyedMessage,
  type NebulaEffectMessage,
  type AsteroidWarningMessage,
  type RadarContactMessage,
  type RadarContact,
  // Enums
  LeaveSpaceReason,
  HyperspaceDenyReason,
  DamageType,
  RadarContactType,
  // Factory functions
  createEnterSpaceZoneMessage,
  createLeaveSpaceZoneMessage,
  createHyperspaceRequestMessage,
  createHyperspaceBeginMessage,
  createDockingRequestMessage,
  createDockingGrantedMessage,
  createShipUpdateMessage,
  createShipDamageMessage,
  createShipDestroyedMessage,
  createRadarContactMessage,
} from './space-messages.js';
