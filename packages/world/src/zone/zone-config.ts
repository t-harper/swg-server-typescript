/**
 * @swg/world - Zone Configuration
 * Definitions for all SWG planets and space zones
 */

import type { BoundingBox } from '../spatial/bounding-box.js';

/**
 * Terrain information for a zone.
 */
export interface TerrainInfo {
  /** The bounds of the terrain */
  bounds: BoundingBox;
  /** Reference to terrain height data (file path or identifier) */
  heightDataRef: string;
  /** Water table height (sea level) */
  waterTableHeight: number;
  /** Whether this is a space zone */
  isSpace: boolean;
}

/**
 * Configuration for a zone.
 */
export interface ZoneConfig {
  /** Unique scene identifier (e.g., 'tatooine') */
  sceneId: string;
  /** Human-readable display name */
  displayName: string;
  /** Terrain configuration */
  terrain: TerrainInfo;
  /** Whether the zone is enabled */
  enabled: boolean;
  /** Zone-specific properties */
  properties: ZoneProperties;
}

/**
 * Zone-specific properties.
 */
export interface ZoneProperties {
  /** Whether PvP is enabled in this zone */
  pvpEnabled: boolean;
  /** Whether building is allowed */
  buildingAllowed: boolean;
  /** Recommended level range */
  levelRange: { min: number; max: number };
  /** Faction controlling the zone (if any) */
  controllingFaction?: 'imperial' | 'rebel' | 'neutral';
  /** Whether vehicles can be used */
  vehiclesAllowed: boolean;
  /** Weather effects enabled */
  weatherEnabled: boolean;
}

/**
 * Standard SWG planet size: 16km x 16km
 * Coordinates range from -8192 to 8192 meters
 */
const PLANET_SIZE = 16384;
const PLANET_HALF = PLANET_SIZE / 2;

/**
 * Standard planet bounds (-8192 to 8192 on X and Y)
 */
const STANDARD_PLANET_BOUNDS: BoundingBox = {
  minX: -PLANET_HALF,
  minY: -PLANET_HALF,
  maxX: PLANET_HALF,
  maxY: PLANET_HALF,
};

/**
 * Space zone bounds (larger area)
 */
const SPACE_BOUNDS: BoundingBox = {
  minX: -16384,
  minY: -16384,
  maxX: 16384,
  maxY: 16384,
};

/**
 * Default zone properties
 */
const defaultProperties: ZoneProperties = {
  pvpEnabled: true,
  buildingAllowed: true,
  levelRange: { min: 1, max: 80 },
  vehiclesAllowed: true,
  weatherEnabled: true,
};

/**
 * Creates standard terrain info for a planet.
 */
function createPlanetTerrain(sceneId: string, waterTableHeight: number = 0): TerrainInfo {
  return {
    bounds: { ...STANDARD_PLANET_BOUNDS },
    heightDataRef: `terrain/${sceneId}.trn`,
    waterTableHeight,
    isSpace: false,
  };
}

/**
 * Creates terrain info for a space zone.
 */
function createSpaceTerrain(sceneId: string): TerrainInfo {
  return {
    bounds: { ...SPACE_BOUNDS },
    heightDataRef: `space/${sceneId}.tre`,
    waterTableHeight: 0,
    isSpace: true,
  };
}

/**
 * All SWG zone configurations.
 */
export const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  // ============================================
  // GROUND PLANETS
  // ============================================

  tatooine: {
    sceneId: 'tatooine',
    displayName: 'Tatooine',
    terrain: createPlanetTerrain('tatooine', -1000),
    enabled: true,
    properties: {
      ...defaultProperties,
      weatherEnabled: false, // Desert planet
      levelRange: { min: 1, max: 40 },
    },
  },

  naboo: {
    sceneId: 'naboo',
    displayName: 'Naboo',
    terrain: createPlanetTerrain('naboo', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 1, max: 30 },
    },
  },

  corellia: {
    sceneId: 'corellia',
    displayName: 'Corellia',
    terrain: createPlanetTerrain('corellia', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 1, max: 35 },
    },
  },

  dantooine: {
    sceneId: 'dantooine',
    displayName: 'Dantooine',
    terrain: createPlanetTerrain('dantooine', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 1, max: 25 },
      controllingFaction: 'rebel',
    },
  },

  dathomir: {
    sceneId: 'dathomir',
    displayName: 'Dathomir',
    terrain: createPlanetTerrain('dathomir', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 60, max: 80 },
      buildingAllowed: false,
    },
  },

  endor: {
    sceneId: 'endor',
    displayName: 'Endor',
    terrain: createPlanetTerrain('endor', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 30, max: 50 },
      controllingFaction: 'rebel',
    },
  },

  lok: {
    sceneId: 'lok',
    displayName: 'Lok',
    terrain: createPlanetTerrain('lok', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 40, max: 60 },
      controllingFaction: 'neutral',
    },
  },

  rori: {
    sceneId: 'rori',
    displayName: 'Rori',
    terrain: createPlanetTerrain('rori', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 15, max: 35 },
    },
  },

  talus: {
    sceneId: 'talus',
    displayName: 'Talus',
    terrain: createPlanetTerrain('talus', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 20, max: 40 },
    },
  },

  yavin4: {
    sceneId: 'yavin4',
    displayName: 'Yavin IV',
    terrain: createPlanetTerrain('yavin4', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 50, max: 70 },
      controllingFaction: 'rebel',
    },
  },

  // Expansion planets
  kashyyyk_main: {
    sceneId: 'kashyyyk_main',
    displayName: 'Kashyyyk',
    terrain: createPlanetTerrain('kashyyyk_main', 0),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 70, max: 90 },
      buildingAllowed: false,
    },
  },

  mustafar: {
    sceneId: 'mustafar',
    displayName: 'Mustafar',
    terrain: createPlanetTerrain('mustafar', -500),
    enabled: true,
    properties: {
      ...defaultProperties,
      levelRange: { min: 75, max: 90 },
      buildingAllowed: false,
      weatherEnabled: false,
    },
  },

  // Tutorial and special zones
  tutorial: {
    sceneId: 'tutorial',
    displayName: 'Tutorial',
    terrain: {
      bounds: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 },
      heightDataRef: 'terrain/tutorial.trn',
      waterTableHeight: 0,
      isSpace: false,
    },
    enabled: true,
    properties: {
      pvpEnabled: false,
      buildingAllowed: false,
      levelRange: { min: 1, max: 1 },
      vehiclesAllowed: false,
      weatherEnabled: false,
    },
  },

  // ============================================
  // SPACE ZONES
  // ============================================

  space_tatooine: {
    sceneId: 'space_tatooine',
    displayName: 'Tatooine Space',
    terrain: createSpaceTerrain('space_tatooine'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true, // Starships
      weatherEnabled: false,
    },
  },

  space_naboo: {
    sceneId: 'space_naboo',
    displayName: 'Naboo Space',
    terrain: createSpaceTerrain('space_naboo'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_corellia: {
    sceneId: 'space_corellia',
    displayName: 'Corellia Space',
    terrain: createSpaceTerrain('space_corellia'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_dantooine: {
    sceneId: 'space_dantooine',
    displayName: 'Dantooine Space',
    terrain: createSpaceTerrain('space_dantooine'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_dathomir: {
    sceneId: 'space_dathomir',
    displayName: 'Dathomir Space',
    terrain: createSpaceTerrain('space_dathomir'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_endor: {
    sceneId: 'space_endor',
    displayName: 'Endor Space',
    terrain: createSpaceTerrain('space_endor'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_lok: {
    sceneId: 'space_lok',
    displayName: 'Lok Space',
    terrain: createSpaceTerrain('space_lok'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_yavin4: {
    sceneId: 'space_yavin4',
    displayName: 'Yavin IV Space',
    terrain: createSpaceTerrain('space_yavin4'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  space_kashyyyk: {
    sceneId: 'space_kashyyyk',
    displayName: 'Kashyyyk Space',
    terrain: createSpaceTerrain('space_kashyyyk'),
    enabled: true,
    properties: {
      ...defaultProperties,
      buildingAllowed: false,
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },

  // Deep Space (kessel run area)
  space_deep: {
    sceneId: 'space_deep',
    displayName: 'Deep Space',
    terrain: createSpaceTerrain('space_deep'),
    enabled: true,
    properties: {
      pvpEnabled: true,
      buildingAllowed: false,
      levelRange: { min: 80, max: 90 },
      vehiclesAllowed: true,
      weatherEnabled: false,
    },
  },
};

/**
 * Gets all enabled zone IDs.
 */
export function getEnabledZoneIds(): string[] {
  return Object.entries(ZONE_CONFIGS)
    .filter(([, config]) => config.enabled)
    .map(([id]) => id);
}

/**
 * Gets all ground planet zone IDs.
 */
export function getGroundZoneIds(): string[] {
  return Object.entries(ZONE_CONFIGS)
    .filter(([, config]) => !config.terrain.isSpace && config.enabled)
    .map(([id]) => id);
}

/**
 * Gets all space zone IDs.
 */
export function getSpaceZoneIds(): string[] {
  return Object.entries(ZONE_CONFIGS)
    .filter(([, config]) => config.terrain.isSpace && config.enabled)
    .map(([id]) => id);
}

/**
 * Gets a zone configuration by scene ID.
 */
export function getZoneConfig(sceneId: string): ZoneConfig | undefined {
  return ZONE_CONFIGS[sceneId];
}
