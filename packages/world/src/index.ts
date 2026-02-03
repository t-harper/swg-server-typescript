/**
 * @swg/world
 * World management for the SWG server
 *
 * This package provides:
 * - QuadTree spatial indexing for efficient range queries
 * - Zone management for planets and space regions
 * - Bounding box utilities for collision detection
 */

// Spatial indexing
export {
  // Bounding Box
  type BoundingBox,
  createBoundingBox,
  fromCenterRadius,
  merge,
  intersects,
  contains,
  containsPoint,
  expand,
  getWidth,
  getHeight,
  getCenter,
  getArea,
  intersectsCircle,
  subdivide,
} from './spatial/bounding-box.js';

export {
  // QuadTree
  type Spatial,
  type QuadTreeNode,
  QuadTree,
} from './spatial/quad-tree.js';

// Zone management
export {
  // Zone
  type SceneObject,
  type ZoneMessage,
  type MessageHandler,
  Zone,
} from './zone/zone.js';

export {
  // Zone Configuration
  type TerrainInfo,
  type ZoneConfig,
  type ZoneProperties,
  ZONE_CONFIGS,
  getEnabledZoneIds,
  getGroundZoneIds,
  getSpaceZoneIds,
  getZoneConfig,
} from './zone/zone-config.js';

export {
  // Zone Manager
  type TransferResult,
  type ZoneLoadStatus,
  type ZoneEventHandler,
  ZoneManager,
} from './zone/zone-manager.js';
