/**
 * Starting Locations
 * Defines starting locations for character creation
 */

/**
 * 3D position coordinates
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Orientation quaternion
 */
export interface Orientation {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Starting location definition
 */
export interface StartingLocation {
  /** Location identifier (used in character creation) */
  id: string;
  /** Display name */
  name: string;
  /** Planet/zone identifier */
  planet: string;
  /** Scene ID for the zone */
  sceneId: string;
  /** Spawn position */
  position: Position;
  /** Spawn orientation (facing direction) */
  orientation: Orientation;
  /** Cell ID if inside a building (0 for outdoor) */
  cellId: bigint;
  /** Description shown in character creation */
  description: string;
  /** Whether this is the tutorial location */
  isTutorial: boolean;
  /** Whether new characters can choose this location */
  enabled: boolean;
  /** Recommended for new players */
  newPlayerRecommended: boolean;
}

/**
 * Planet definitions for starting locations
 */
export const Planet = {
  TATOOINE: 'tatooine',
  NABOO: 'naboo',
  CORELLIA: 'corellia',
  TALUS: 'talus',
  RORI: 'rori',
  DANTOOINE: 'dantooine',
  LOK: 'lok',
  DATHOMIR: 'dathomir',
  YAVIN4: 'yavin4',
  ENDOR: 'endor',
  TUTORIAL: 'tutorial',
} as const;

export type PlanetType = (typeof Planet)[keyof typeof Planet];

/**
 * Starting locations available for character creation
 */
export const StartingLocations: Record<string, StartingLocation> = {
  // Tutorial (highly recommended for new players)
  TUTORIAL: {
    id: 'tutorial',
    name: 'Tutorial',
    planet: Planet.TUTORIAL,
    sceneId: 'tutorial',
    position: { x: 0.0, y: 0.0, z: 0.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'Begin your journey with the Imperial Pilot Training Program.',
    isTutorial: true,
    enabled: true,
    newPlayerRecommended: true,
  },

  // Tatooine Locations
  MOS_EISLEY: {
    id: 'mos_eisley',
    name: 'Mos Eisley',
    planet: Planet.TATOOINE,
    sceneId: 'tatooine',
    position: { x: 3528.0, y: 5.0, z: -4804.0 },
    orientation: { x: 0, y: 0.7071, z: 0, w: 0.7071 },
    cellId: 0n,
    description: 'A wretched hive of scum and villainy on Tatooine.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  MOS_ENTHA: {
    id: 'mos_entha',
    name: 'Mos Entha',
    planet: Planet.TATOOINE,
    sceneId: 'tatooine',
    position: { x: 1291.0, y: 10.0, z: 3138.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A smaller spaceport town on Tatooine.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  MOS_ESPA: {
    id: 'mos_espa',
    name: 'Mos Espa',
    planet: Planet.TATOOINE,
    sceneId: 'tatooine',
    position: { x: -2902.0, y: 5.0, z: 2130.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'Home of the famous Boonta Eve Classic Podrace.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  BESTINE: {
    id: 'bestine',
    name: 'Bestine',
    planet: Planet.TATOOINE,
    sceneId: 'tatooine',
    position: { x: -1290.0, y: 12.0, z: -3590.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'The Imperial capital city on Tatooine.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  // Naboo Locations
  THEED: {
    id: 'theed',
    name: 'Theed',
    planet: Planet.NABOO,
    sceneId: 'naboo',
    position: { x: -4856.0, y: 6.0, z: 4162.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'The beautiful capital city of Naboo.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: true,
  },

  MOENIA: {
    id: 'moenia',
    name: 'Moenia',
    planet: Planet.NABOO,
    sceneId: 'naboo',
    position: { x: 4800.0, y: 4.0, z: -4700.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A small artist colony on Naboo.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  KAADARA: {
    id: 'kaadara',
    name: 'Kaadara',
    planet: Planet.NABOO,
    sceneId: 'naboo',
    position: { x: 5209.0, y: -192.0, z: 6677.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A seaside resort town on Naboo.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  KEREN: {
    id: 'keren',
    name: 'Keren',
    planet: Planet.NABOO,
    sceneId: 'naboo',
    position: { x: 1441.0, y: 12.0, z: 2771.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'An industrial city on Naboo.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  // Corellia Locations
  CORONET: {
    id: 'coronet',
    name: 'Coronet',
    planet: Planet.CORELLIA,
    sceneId: 'corellia',
    position: { x: -137.0, y: 28.0, z: -4723.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'The capital city of Corellia.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: true,
  },

  TYRENA: {
    id: 'tyrena',
    name: 'Tyrena',
    planet: Planet.CORELLIA,
    sceneId: 'corellia',
    position: { x: -5045.0, y: 21.0, z: -2294.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A coastal city on Corellia.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  AAAA_BELA_VISTAL: {
    id: 'bela_vistal',
    name: 'Bela Vistal',
    planet: Planet.CORELLIA,
    sceneId: 'corellia',
    position: { x: 6767.0, y: 330.0, z: -5765.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A mountain resort city on Corellia.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  AAAA_DOABA_GUERFEL: {
    id: 'doaba_guerfel',
    name: 'Doaba Guerfel',
    planet: Planet.CORELLIA,
    sceneId: 'corellia',
    position: { x: 3336.0, y: 308.0, z: 5525.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A mining town in the Corellian mountains.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  // Talus Locations
  DEARIC: {
    id: 'dearic',
    name: 'Dearic',
    planet: Planet.TALUS,
    sceneId: 'talus',
    position: { x: 335.0, y: 6.0, z: -2931.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'The capital city of Talus.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  NASHAL: {
    id: 'nashal',
    name: 'Nashal',
    planet: Planet.TALUS,
    sceneId: 'talus',
    position: { x: 4371.0, y: 2.0, z: 5765.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A port city on Talus.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  // Rori Locations
  NARMLE: {
    id: 'narmle',
    name: 'Narmle',
    planet: Planet.RORI,
    sceneId: 'rori',
    position: { x: -5310.0, y: 80.0, z: -2221.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A swamp city on Rori.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  RESTUSS: {
    id: 'restuss',
    name: 'Restuss',
    planet: Planet.RORI,
    sceneId: 'rori',
    position: { x: 5362.0, y: 80.0, z: 5765.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A contested city on Rori.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  // Dantooine Locations
  DANTOOINE_MINING_OUTPOST: {
    id: 'dantooine_mining_outpost',
    name: 'Mining Outpost',
    planet: Planet.DANTOOINE,
    sceneId: 'dantooine',
    position: { x: -635.0, y: 3.0, z: 2500.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: 'A remote mining outpost on Dantooine.',
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },

  // Lok Locations
  NYM_STRONGHOLD: {
    id: 'nym_stronghold',
    name: "Nym's Stronghold",
    planet: Planet.LOK,
    sceneId: 'lok',
    position: { x: 476.0, y: 8.0, z: 5106.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    cellId: 0n,
    description: "The pirate Nym's fortress on Lok.",
    isTutorial: false,
    enabled: true,
    newPlayerRecommended: false,
  },
} as const;

/**
 * Get a starting location by ID
 */
export function getStartingLocationById(id: string): StartingLocation | undefined {
  const upperKey = id.toUpperCase().replace(/ /g, '_');
  return StartingLocations[upperKey] ?? Object.values(StartingLocations).find(
    (loc) => loc.id.toLowerCase() === id.toLowerCase()
  );
}

/**
 * Get all enabled starting locations
 */
export function getEnabledStartingLocations(): StartingLocation[] {
  return Object.values(StartingLocations).filter((loc) => loc.enabled);
}

/**
 * Get all starting locations for a planet
 */
export function getStartingLocationsByPlanet(planet: PlanetType): StartingLocation[] {
  return Object.values(StartingLocations).filter(
    (loc) => loc.planet === planet && loc.enabled
  );
}

/**
 * Get the tutorial starting location
 */
export function getTutorialLocation(): StartingLocation {
  return StartingLocations['TUTORIAL']!;
}

/**
 * Get recommended starting locations for new players
 */
export function getNewPlayerRecommendedLocations(): StartingLocation[] {
  return Object.values(StartingLocations).filter(
    (loc) => loc.newPlayerRecommended && loc.enabled
  );
}

/**
 * Validate if a location ID is valid for character creation
 */
export function isValidStartingLocation(locationId: string): boolean {
  const location = getStartingLocationById(locationId);
  return location !== undefined && location.enabled;
}

/**
 * Get the default starting location (tutorial)
 */
export function getDefaultStartingLocation(): StartingLocation {
  return StartingLocations['TUTORIAL']!;
}

/**
 * Get location by scene ID and approximate position
 * Useful for determining which city a character is near
 */
export function getNearestStartingLocation(
  sceneId: string,
  x: number,
  z: number,
  maxDistance: number = 500
): StartingLocation | undefined {
  let nearest: StartingLocation | undefined;
  let nearestDistance = maxDistance;

  for (const location of Object.values(StartingLocations)) {
    if (location.sceneId !== sceneId) continue;

    const dx = location.position.x - x;
    const dz = location.position.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = location;
    }
  }

  return nearest;
}
