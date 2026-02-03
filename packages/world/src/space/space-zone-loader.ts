/**
 * @swg/world - Space Zone Loader
 * Loads and configures JTL space zones with their features
 */

import {
  SpaceZoneId,
  SpaceSectorType,
  SpaceFaction,
  NebulaEffectType,
  StationService,
  ShipClass,
  type SpaceZoneConfig,
  type SpaceBounds,
  type AsteroidField,
  type Nebula,
  type SpaceStation,
  type HyperspaceRoute,
  type SpawnPoint,
  createSpaceBounds,
} from './space-types.js';
import { SpaceZone, createSpaceZone } from './space-zone.js';

/**
 * Default space zone size: 32km x 32km x 16km (height)
 */
const DEFAULT_SPACE_SIZE = 32768;
const DEFAULT_SPACE_HEIGHT = 16384;

/**
 * Creates default space bounds for a zone.
 */
function defaultBounds(): SpaceBounds {
  return createSpaceBounds(DEFAULT_SPACE_SIZE, DEFAULT_SPACE_HEIGHT);
}

/**
 * Creates a standard Imperial station.
 */
function createImperialStation(
  id: string,
  name: string,
  position: { x: number; y: number; z: number },
  groundConnection?: string
): SpaceStation {
  return {
    id,
    name,
    position,
    faction: SpaceFaction.IMPERIAL,
    services: [
      StationService.REPAIR,
      StationService.REFUEL,
      StationService.COMPONENTS,
      StationService.MISSIONS,
      StationService.MEDICAL,
    ],
    dockingPorts: 8,
    safeZoneRadius: 2000,
    playerOwned: false,
    groundZoneConnection: groundConnection,
  };
}

/**
 * Creates a standard Rebel station.
 */
function createRebelStation(
  id: string,
  name: string,
  position: { x: number; y: number; z: number },
  groundConnection?: string
): SpaceStation {
  return {
    id,
    name,
    position,
    faction: SpaceFaction.REBEL,
    services: [
      StationService.REPAIR,
      StationService.REFUEL,
      StationService.COMPONENTS,
      StationService.MISSIONS,
      StationService.MEDICAL,
    ],
    dockingPorts: 6,
    safeZoneRadius: 2000,
    playerOwned: false,
    groundZoneConnection: groundConnection,
  };
}

/**
 * Creates a neutral station.
 */
function createNeutralStation(
  id: string,
  name: string,
  position: { x: number; y: number; z: number },
  services: StationService[] = [
    StationService.REPAIR,
    StationService.REFUEL,
    StationService.BANK,
    StationService.BAZAAR,
  ]
): SpaceStation {
  return {
    id,
    name,
    position,
    faction: SpaceFaction.NEUTRAL,
    services,
    dockingPorts: 12,
    safeZoneRadius: 3000,
    playerOwned: false,
  };
}

/**
 * Creates a pirate spawn point.
 */
function createPirateSpawn(
  id: string,
  position: { x: number; y: number; z: number },
  tier: { min: number; max: number } = { min: 1, max: 3 }
): SpawnPoint {
  return {
    id,
    position,
    spawnRadius: 500,
    factionType: SpaceFaction.PIRATE,
    shipTypes: [ShipClass.LIGHT_FIGHTER, ShipClass.HEAVY_FIGHTER],
    spawnRate: 4,
    maxActive: 6,
    minTier: tier.min,
    maxTier: tier.max,
    active: true,
  };
}

/**
 * Creates an Imperial patrol spawn point.
 */
function createImperialSpawn(
  id: string,
  position: { x: number; y: number; z: number },
  tier: { min: number; max: number } = { min: 1, max: 4 }
): SpawnPoint {
  return {
    id,
    position,
    spawnRadius: 1000,
    factionType: SpaceFaction.IMPERIAL,
    shipTypes: [ShipClass.LIGHT_FIGHTER, ShipClass.HEAVY_FIGHTER, ShipClass.BOMBER],
    spawnRate: 3,
    maxActive: 8,
    minTier: tier.min,
    maxTier: tier.max,
    active: true,
  };
}

/**
 * Creates a Rebel patrol spawn point.
 */
function createRebelSpawn(
  id: string,
  position: { x: number; y: number; z: number },
  tier: { min: number; max: number } = { min: 1, max: 4 }
): SpawnPoint {
  return {
    id,
    position,
    spawnRadius: 1000,
    factionType: SpaceFaction.REBEL,
    shipTypes: [ShipClass.LIGHT_FIGHTER, ShipClass.HEAVY_FIGHTER, ShipClass.BOMBER],
    spawnRate: 3,
    maxActive: 6,
    minTier: tier.min,
    maxTier: tier.max,
    active: true,
  };
}

/**
 * Default space zone configurations for all JTL zones.
 */
export const SPACE_ZONE_CONFIGS: Record<SpaceZoneId, SpaceZoneConfig> = {
  // ============================================
  // TATOOINE SPACE
  // ============================================
  [SpaceZoneId.SPACE_TATOOINE]: {
    zoneId: SpaceZoneId.SPACE_TATOOINE,
    displayName: 'Tatooine System',
    defaultSectorType: SpaceSectorType.CONTESTED,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'tat_asteroid_belt_1',
        position: { x: 8000, y: 0, z: 0 },
        radius: 3000,
        density: 0.3,
        damageOnCollision: 150,
        mineable: true,
        resourceTypes: ['iron', 'copper'],
      },
      {
        id: 'tat_asteroid_field_2',
        position: { x: -6000, y: 4000, z: -1000 },
        radius: 2000,
        density: 0.4,
        damageOnCollision: 200,
        mineable: true,
        resourceTypes: ['iron', 'silicate'],
      },
    ],
    nebulae: [
      {
        id: 'tat_nebula_1',
        position: { x: -4000, y: -6000, z: 500 },
        radius: 2500,
        effectType: NebulaEffectType.SENSOR_JAMMING,
        damagePerSecond: 0,
        sensorReduction: 0.6,
        colorTint: '#4a3728',
      },
    ],
    stations: [
      createNeutralStation(
        'tat_station_central',
        'Tatooine Orbital Station',
        { x: 0, y: 0, z: 0 },
        [
          StationService.REPAIR,
          StationService.REFUEL,
          StationService.COMPONENTS,
          StationService.SHIP_DEALER,
          StationService.MISSIONS,
          StationService.BANK,
          StationService.BAZAAR,
        ]
      ),
      createImperialStation(
        'tat_station_imperial',
        'Imperial Outpost Alpha',
        { x: 5000, y: 3000, z: 500 },
        'tatooine'
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'tat_to_naboo',
        name: 'Tatooine-Naboo Hyperlane',
        origin: SpaceZoneId.SPACE_TATOOINE,
        destination: SpaceZoneId.SPACE_NABOO,
        travelTime: 45,
        navPointsRequired: 2,
        minPilotLevel: 1,
        oneWay: false,
        fuelCost: 100,
      },
      {
        id: 'tat_to_corellia',
        name: 'Tatooine-Corellia Trade Route',
        origin: SpaceZoneId.SPACE_TATOOINE,
        destination: SpaceZoneId.SPACE_CORELLIA,
        travelTime: 60,
        navPointsRequired: 3,
        minPilotLevel: 5,
        oneWay: false,
        fuelCost: 150,
      },
      {
        id: 'tat_to_kessel',
        name: 'Kessel Run Entrance',
        origin: SpaceZoneId.SPACE_TATOOINE,
        destination: SpaceZoneId.KESSEL,
        travelTime: 90,
        navPointsRequired: 5,
        minPilotLevel: 50,
        oneWay: false,
        fuelCost: 500,
      },
    ],
    spawnPoints: [
      createPirateSpawn('tat_pirate_1', { x: 7000, y: -2000, z: 0 }),
      createPirateSpawn('tat_pirate_2', { x: -5000, y: 5000, z: 1000 }),
      createImperialSpawn('tat_imperial_1', { x: 4000, y: 2000, z: 200 }),
    ],
    enabled: true,
  },

  // ============================================
  // NABOO SPACE
  // ============================================
  [SpaceZoneId.SPACE_NABOO]: {
    zoneId: SpaceZoneId.SPACE_NABOO,
    displayName: 'Naboo System',
    defaultSectorType: SpaceSectorType.SAFE,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'nab_asteroid_1',
        position: { x: 10000, y: 5000, z: 0 },
        radius: 2000,
        density: 0.2,
        damageOnCollision: 100,
        mineable: true,
        resourceTypes: ['copper', 'aluminum'],
      },
    ],
    nebulae: [],
    stations: [
      createNeutralStation(
        'nab_station_central',
        'Naboo Royal Space Station',
        { x: 0, y: 0, z: 0 },
        [
          StationService.REPAIR,
          StationService.REFUEL,
          StationService.COMPONENTS,
          StationService.SHIP_DEALER,
          StationService.CHASSIS_DEALER,
          StationService.MISSIONS,
          StationService.BANK,
          StationService.BAZAAR,
          StationService.INSURANCE,
        ]
      ),
      createRebelStation(
        'nab_station_rebel',
        'Rebel Outpost Keren',
        { x: -4000, y: 2000, z: 300 },
        'naboo'
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'nab_to_tatooine',
        name: 'Naboo-Tatooine Hyperlane',
        origin: SpaceZoneId.SPACE_NABOO,
        destination: SpaceZoneId.SPACE_TATOOINE,
        travelTime: 45,
        navPointsRequired: 2,
        minPilotLevel: 1,
        oneWay: false,
        fuelCost: 100,
      },
      {
        id: 'nab_to_dantooine',
        name: 'Naboo-Dantooine Route',
        origin: SpaceZoneId.SPACE_NABOO,
        destination: SpaceZoneId.SPACE_DANTOOINE,
        travelTime: 50,
        navPointsRequired: 2,
        minPilotLevel: 10,
        oneWay: false,
        fuelCost: 120,
      },
    ],
    spawnPoints: [
      createPirateSpawn('nab_pirate_1', { x: 8000, y: 8000, z: 0 }, { min: 1, max: 2 }),
      createRebelSpawn('nab_rebel_1', { x: -3000, y: 1000, z: 0 }, { min: 1, max: 2 }),
    ],
    enabled: true,
  },

  // ============================================
  // CORELLIA SPACE
  // ============================================
  [SpaceZoneId.SPACE_CORELLIA]: {
    zoneId: SpaceZoneId.SPACE_CORELLIA,
    displayName: 'Corellia System',
    defaultSectorType: SpaceSectorType.CONTESTED,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'cor_asteroid_belt',
        position: { x: 0, y: 12000, z: 0 },
        radius: 4000,
        density: 0.35,
        damageOnCollision: 175,
        mineable: true,
        resourceTypes: ['iron', 'titanium', 'chromium'],
      },
    ],
    nebulae: [
      {
        id: 'cor_nebula_1',
        position: { x: -8000, y: -4000, z: 1000 },
        radius: 3000,
        effectType: NebulaEffectType.STATIC_INTERFERENCE,
        damagePerSecond: 0,
        sensorReduction: 0.3,
        colorTint: '#2e4a6e',
      },
    ],
    stations: [
      createNeutralStation(
        'cor_station_central',
        'Coronet Orbital Platform',
        { x: 0, y: 0, z: 0 },
        [
          StationService.REPAIR,
          StationService.REFUEL,
          StationService.COMPONENTS,
          StationService.SHIP_DEALER,
          StationService.CHASSIS_DEALER,
          StationService.MISSIONS,
          StationService.BANK,
          StationService.BAZAAR,
          StationService.MEDICAL,
        ]
      ),
      createImperialStation(
        'cor_station_imperial',
        'Imperial Docking Bay',
        { x: 3000, y: -2000, z: 0 },
        'corellia'
      ),
      createRebelStation(
        'cor_station_rebel',
        'Rebel Hideout',
        { x: -6000, y: 5000, z: 500 }
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'cor_to_tatooine',
        name: 'Corellia-Tatooine Trade Route',
        origin: SpaceZoneId.SPACE_CORELLIA,
        destination: SpaceZoneId.SPACE_TATOOINE,
        travelTime: 60,
        navPointsRequired: 3,
        minPilotLevel: 5,
        oneWay: false,
        fuelCost: 150,
      },
      {
        id: 'cor_to_talus',
        name: 'Corellian Sector Lane',
        origin: SpaceZoneId.SPACE_CORELLIA,
        destination: SpaceZoneId.SPACE_TALUS,
        travelTime: 20,
        navPointsRequired: 1,
        minPilotLevel: 1,
        oneWay: false,
        fuelCost: 50,
      },
      {
        id: 'cor_to_deep',
        name: 'Deep Space Corridor',
        origin: SpaceZoneId.SPACE_CORELLIA,
        destination: SpaceZoneId.DEEP_SPACE,
        travelTime: 120,
        navPointsRequired: 6,
        minPilotLevel: 60,
        oneWay: false,
        fuelCost: 400,
      },
    ],
    spawnPoints: [
      createPirateSpawn('cor_pirate_1', { x: 5000, y: 9000, z: 0 }),
      createImperialSpawn('cor_imperial_1', { x: 2000, y: -1000, z: 0 }),
      createRebelSpawn('cor_rebel_1', { x: -5000, y: 4000, z: 0 }),
    ],
    enabled: true,
  },

  // ============================================
  // DANTOOINE SPACE
  // ============================================
  [SpaceZoneId.SPACE_DANTOOINE]: {
    zoneId: SpaceZoneId.SPACE_DANTOOINE,
    displayName: 'Dantooine System',
    defaultSectorType: SpaceSectorType.CONTESTED,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'dan_asteroid_1',
        position: { x: 6000, y: 6000, z: 500 },
        radius: 2500,
        density: 0.25,
        damageOnCollision: 125,
        mineable: true,
        resourceTypes: ['copper', 'iron'],
      },
    ],
    nebulae: [
      {
        id: 'dan_nebula_1',
        position: { x: -3000, y: -5000, z: 0 },
        radius: 2000,
        effectType: NebulaEffectType.COSMETIC,
        damagePerSecond: 0,
        colorTint: '#3d5a3d',
      },
    ],
    stations: [
      createRebelStation(
        'dan_station_rebel',
        'Dantooine Rebel Base',
        { x: 0, y: 0, z: 0 },
        'dantooine'
      ),
      createNeutralStation(
        'dan_station_mining',
        'Mining Outpost Gamma',
        { x: 5000, y: 5000, z: 0 },
        [StationService.REPAIR, StationService.REFUEL, StationService.COMPONENTS]
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'dan_to_naboo',
        name: 'Dantooine-Naboo Route',
        origin: SpaceZoneId.SPACE_DANTOOINE,
        destination: SpaceZoneId.SPACE_NABOO,
        travelTime: 50,
        navPointsRequired: 2,
        minPilotLevel: 10,
        oneWay: false,
        fuelCost: 120,
      },
      {
        id: 'dan_to_yavin',
        name: 'Rebel Supply Route',
        origin: SpaceZoneId.SPACE_DANTOOINE,
        destination: SpaceZoneId.SPACE_YAVIN,
        travelTime: 70,
        navPointsRequired: 4,
        minPilotLevel: 25,
        oneWay: false,
        fuelCost: 200,
      },
    ],
    spawnPoints: [
      createPirateSpawn('dan_pirate_1', { x: 8000, y: -3000, z: 0 }),
      createRebelSpawn('dan_rebel_1', { x: -1000, y: 1000, z: 0 }),
      createImperialSpawn('dan_imperial_1', { x: 7000, y: 7000, z: 0 }, { min: 2, max: 4 }),
    ],
    enabled: true,
  },

  // ============================================
  // DATHOMIR SPACE
  // ============================================
  [SpaceZoneId.SPACE_DATHOMIR]: {
    zoneId: SpaceZoneId.SPACE_DATHOMIR,
    displayName: 'Dathomir System',
    defaultSectorType: SpaceSectorType.DANGEROUS,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'dath_asteroid_1',
        position: { x: 0, y: 8000, z: 0 },
        radius: 4000,
        density: 0.5,
        damageOnCollision: 250,
        mineable: true,
        resourceTypes: ['titanium', 'radioactive'],
      },
    ],
    nebulae: [
      {
        id: 'dath_nebula_1',
        position: { x: -5000, y: -3000, z: 0 },
        radius: 3500,
        effectType: NebulaEffectType.RADIATION,
        damagePerSecond: 15,
        colorTint: '#6b2d5b',
      },
      {
        id: 'dath_nebula_2',
        position: { x: 4000, y: 4000, z: 1000 },
        radius: 2500,
        effectType: NebulaEffectType.SENSOR_JAMMING,
        damagePerSecond: 0,
        sensorReduction: 0.8,
        colorTint: '#4a1a4a',
      },
    ],
    stations: [
      createNeutralStation(
        'dath_station_outpost',
        'Dathomir Trading Post',
        { x: 0, y: 0, z: 0 },
        [StationService.REPAIR, StationService.REFUEL, StationService.MISSIONS]
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'dath_to_endor',
        name: 'Dathomir-Endor Passage',
        origin: SpaceZoneId.SPACE_DATHOMIR,
        destination: SpaceZoneId.SPACE_ENDOR,
        travelTime: 80,
        navPointsRequired: 4,
        minPilotLevel: 40,
        oneWay: false,
        fuelCost: 250,
      },
    ],
    spawnPoints: [
      createPirateSpawn('dath_pirate_1', { x: 6000, y: -6000, z: 0 }, { min: 3, max: 5 }),
      createPirateSpawn('dath_pirate_2', { x: -7000, y: 2000, z: 500 }, { min: 4, max: 5 }),
      {
        id: 'dath_blacksun_1',
        position: { x: 3000, y: -4000, z: 0 },
        spawnRadius: 800,
        factionType: SpaceFaction.BLACK_SUN,
        shipTypes: [ShipClass.HEAVY_FIGHTER, ShipClass.GUNSHIP],
        spawnRate: 2,
        maxActive: 4,
        minTier: 4,
        maxTier: 5,
        active: true,
      },
    ],
    enabled: true,
  },

  // ============================================
  // ENDOR SPACE
  // ============================================
  [SpaceZoneId.SPACE_ENDOR]: {
    zoneId: SpaceZoneId.SPACE_ENDOR,
    displayName: 'Endor System',
    defaultSectorType: SpaceSectorType.RESTRICTED,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'end_debris_field',
        position: { x: 5000, y: 0, z: 2000 },
        radius: 5000,
        density: 0.4,
        damageOnCollision: 200,
        mineable: false, // Death Star debris, not mineable
      },
    ],
    nebulae: [],
    stations: [
      createImperialStation(
        'end_station_imperial',
        'Imperial Garrison Station',
        { x: -3000, y: -2000, z: 0 },
        'endor'
      ),
      createRebelStation(
        'end_station_rebel',
        'Rebel Forward Base',
        { x: 4000, y: 4000, z: 500 }
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'end_to_dathomir',
        name: 'Endor-Dathomir Passage',
        origin: SpaceZoneId.SPACE_ENDOR,
        destination: SpaceZoneId.SPACE_DATHOMIR,
        travelTime: 80,
        navPointsRequired: 4,
        minPilotLevel: 40,
        oneWay: false,
        fuelCost: 250,
      },
      {
        id: 'end_to_yavin',
        name: 'Endor-Yavin Emergency Route',
        origin: SpaceZoneId.SPACE_ENDOR,
        destination: SpaceZoneId.SPACE_YAVIN,
        travelTime: 100,
        navPointsRequired: 5,
        minPilotLevel: 50,
        oneWay: false,
        fuelCost: 350,
      },
    ],
    spawnPoints: [
      createImperialSpawn('end_imperial_1', { x: -2000, y: -1000, z: 0 }, { min: 3, max: 5 }),
      createImperialSpawn('end_imperial_2', { x: 0, y: -5000, z: 0 }, { min: 4, max: 5 }),
      createRebelSpawn('end_rebel_1', { x: 3000, y: 3000, z: 0 }, { min: 3, max: 5 }),
    ],
    enabled: true,
  },

  // ============================================
  // LOK SPACE
  // ============================================
  [SpaceZoneId.SPACE_LOK]: {
    zoneId: SpaceZoneId.SPACE_LOK,
    displayName: 'Lok System',
    defaultSectorType: SpaceSectorType.DANGEROUS,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'lok_asteroid_1',
        position: { x: -4000, y: 7000, z: 0 },
        radius: 3000,
        density: 0.35,
        damageOnCollision: 175,
        mineable: true,
        resourceTypes: ['iron', 'sulfur'],
      },
    ],
    nebulae: [
      {
        id: 'lok_nebula_1',
        position: { x: 6000, y: -4000, z: 500 },
        radius: 2800,
        effectType: NebulaEffectType.CORROSIVE,
        damagePerSecond: 10,
        colorTint: '#5a4a2e',
      },
    ],
    stations: [
      createNeutralStation(
        'lok_station_pirate',
        'Nym\'s Stronghold',
        { x: 0, y: 0, z: 0 },
        [
          StationService.REPAIR,
          StationService.REFUEL,
          StationService.COMPONENTS,
          StationService.MISSIONS,
          StationService.SHIP_DEALER,
        ]
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'lok_to_tatooine',
        name: 'Smuggler\'s Run',
        origin: SpaceZoneId.SPACE_LOK,
        destination: SpaceZoneId.SPACE_TATOOINE,
        travelTime: 55,
        navPointsRequired: 3,
        minPilotLevel: 20,
        oneWay: false,
        fuelCost: 175,
      },
    ],
    spawnPoints: [
      createPirateSpawn('lok_pirate_1', { x: 5000, y: 5000, z: 0 }, { min: 2, max: 4 }),
      createPirateSpawn('lok_pirate_2', { x: -6000, y: -3000, z: 0 }, { min: 3, max: 5 }),
      {
        id: 'lok_hutt_1',
        position: { x: -2000, y: 4000, z: 0 },
        spawnRadius: 600,
        factionType: SpaceFaction.HUTT,
        shipTypes: [ShipClass.FREIGHTER, ShipClass.GUNSHIP],
        spawnRate: 2,
        maxActive: 3,
        minTier: 2,
        maxTier: 4,
        active: true,
      },
    ],
    enabled: true,
  },

  // ============================================
  // TALUS SPACE
  // ============================================
  [SpaceZoneId.SPACE_TALUS]: {
    zoneId: SpaceZoneId.SPACE_TALUS,
    displayName: 'Talus System',
    defaultSectorType: SpaceSectorType.CONTESTED,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'tal_asteroid_1',
        position: { x: 8000, y: 3000, z: 0 },
        radius: 2000,
        density: 0.25,
        damageOnCollision: 125,
        mineable: true,
        resourceTypes: ['copper', 'iron'],
      },
    ],
    nebulae: [],
    stations: [
      createNeutralStation(
        'tal_station_central',
        'Talus Orbital Hub',
        { x: 0, y: 0, z: 0 },
        [
          StationService.REPAIR,
          StationService.REFUEL,
          StationService.COMPONENTS,
          StationService.MISSIONS,
          StationService.BANK,
        ]
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'tal_to_corellia',
        name: 'Corellian Sector Lane',
        origin: SpaceZoneId.SPACE_TALUS,
        destination: SpaceZoneId.SPACE_CORELLIA,
        travelTime: 20,
        navPointsRequired: 1,
        minPilotLevel: 1,
        oneWay: false,
        fuelCost: 50,
      },
    ],
    spawnPoints: [
      createPirateSpawn('tal_pirate_1', { x: 6000, y: -4000, z: 0 }, { min: 1, max: 3 }),
      createImperialSpawn('tal_imperial_1', { x: -3000, y: 5000, z: 0 }, { min: 1, max: 3 }),
    ],
    enabled: true,
  },

  // ============================================
  // YAVIN SPACE
  // ============================================
  [SpaceZoneId.SPACE_YAVIN]: {
    zoneId: SpaceZoneId.SPACE_YAVIN,
    displayName: 'Yavin System',
    defaultSectorType: SpaceSectorType.CONTESTED,
    boundaries: defaultBounds(),
    asteroidFields: [
      {
        id: 'yav_asteroid_ring',
        position: { x: 0, y: 0, z: 0 },
        radius: 6000,
        density: 0.2,
        damageOnCollision: 100,
        mineable: true,
        resourceTypes: ['aluminum', 'steel'],
      },
    ],
    nebulae: [
      {
        id: 'yav_nebula_1',
        position: { x: -6000, y: 6000, z: 0 },
        radius: 2500,
        effectType: NebulaEffectType.ION_STORM,
        damagePerSecond: 5,
        colorTint: '#3a5a7a',
      },
    ],
    stations: [
      createRebelStation(
        'yav_station_rebel',
        'Yavin Rebel Base',
        { x: -2000, y: -2000, z: 0 },
        'yavin4'
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'yav_to_dantooine',
        name: 'Rebel Supply Route',
        origin: SpaceZoneId.SPACE_YAVIN,
        destination: SpaceZoneId.SPACE_DANTOOINE,
        travelTime: 70,
        navPointsRequired: 4,
        minPilotLevel: 25,
        oneWay: false,
        fuelCost: 200,
      },
      {
        id: 'yav_to_endor',
        name: 'Yavin-Endor Emergency Route',
        origin: SpaceZoneId.SPACE_YAVIN,
        destination: SpaceZoneId.SPACE_ENDOR,
        travelTime: 100,
        navPointsRequired: 5,
        minPilotLevel: 50,
        oneWay: false,
        fuelCost: 350,
      },
    ],
    spawnPoints: [
      createRebelSpawn('yav_rebel_1', { x: -1000, y: -1000, z: 0 }, { min: 2, max: 4 }),
      createImperialSpawn('yav_imperial_1', { x: 5000, y: 5000, z: 0 }, { min: 3, max: 5 }),
      createImperialSpawn('yav_imperial_2', { x: -4000, y: 4000, z: 500 }, { min: 2, max: 4 }),
    ],
    enabled: true,
  },

  // ============================================
  // KESSEL
  // ============================================
  [SpaceZoneId.KESSEL]: {
    zoneId: SpaceZoneId.KESSEL,
    displayName: 'Kessel System',
    defaultSectorType: SpaceSectorType.DANGEROUS,
    boundaries: createSpaceBounds(40000, 20000), // Larger zone
    asteroidFields: [
      {
        id: 'kes_maw_cluster',
        position: { x: 0, y: 0, z: 0 },
        radius: 8000,
        density: 0.6,
        damageOnCollision: 350,
        mineable: true,
        resourceTypes: ['spice', 'radioactive', 'titanium'],
      },
      {
        id: 'kes_outer_belt',
        position: { x: 12000, y: 0, z: 0 },
        radius: 5000,
        density: 0.4,
        damageOnCollision: 250,
        mineable: true,
        resourceTypes: ['iron', 'chromium'],
      },
    ],
    nebulae: [
      {
        id: 'kes_nebula_maw',
        position: { x: -5000, y: -5000, z: 0 },
        radius: 6000,
        effectType: NebulaEffectType.RADIATION,
        damagePerSecond: 25,
        colorTint: '#2a1a4a',
      },
      {
        id: 'kes_nebula_interference',
        position: { x: 8000, y: -8000, z: 1000 },
        radius: 4000,
        effectType: NebulaEffectType.SENSOR_JAMMING,
        damagePerSecond: 0,
        sensorReduction: 0.9,
        colorTint: '#1a2a3a',
      },
    ],
    stations: [
      createNeutralStation(
        'kes_station_spice',
        'Kessel Spice Mines Station',
        { x: 10000, y: 5000, z: 0 },
        [StationService.REPAIR, StationService.REFUEL]
      ),
    ],
    hyperspaceRoutes: [
      {
        id: 'kes_to_tatooine',
        name: 'Kessel Run Exit',
        origin: SpaceZoneId.KESSEL,
        destination: SpaceZoneId.SPACE_TATOOINE,
        travelTime: 90,
        navPointsRequired: 5,
        minPilotLevel: 50,
        oneWay: false,
        fuelCost: 500,
      },
    ],
    spawnPoints: [
      createPirateSpawn('kes_pirate_1', { x: 6000, y: 6000, z: 0 }, { min: 4, max: 5 }),
      createPirateSpawn('kes_pirate_2', { x: -8000, y: 3000, z: 0 }, { min: 5, max: 5 }),
      {
        id: 'kes_blacksun_1',
        position: { x: 0, y: 10000, z: 500 },
        spawnRadius: 1000,
        factionType: SpaceFaction.BLACK_SUN,
        shipTypes: [ShipClass.HEAVY_FIGHTER, ShipClass.GUNSHIP, ShipClass.FREIGHTER],
        spawnRate: 3,
        maxActive: 6,
        minTier: 5,
        maxTier: 5,
        active: true,
      },
    ],
    enabled: true,
  },

  // ============================================
  // DEEP SPACE
  // ============================================
  [SpaceZoneId.DEEP_SPACE]: {
    zoneId: SpaceZoneId.DEEP_SPACE,
    displayName: 'Deep Space',
    defaultSectorType: SpaceSectorType.DANGEROUS,
    boundaries: createSpaceBounds(50000, 25000), // Largest zone
    asteroidFields: [
      {
        id: 'deep_rogue_cluster',
        position: { x: 15000, y: 10000, z: 0 },
        radius: 6000,
        density: 0.45,
        damageOnCollision: 300,
        mineable: true,
        resourceTypes: ['radioactive', 'titanium', 'chromium'],
      },
    ],
    nebulae: [
      {
        id: 'deep_nebula_void',
        position: { x: -10000, y: -10000, z: 0 },
        radius: 8000,
        effectType: NebulaEffectType.SENSOR_JAMMING,
        damagePerSecond: 0,
        sensorReduction: 0.95,
        colorTint: '#0a0a1a',
      },
      {
        id: 'deep_nebula_radiation',
        position: { x: 5000, y: -15000, z: 2000 },
        radius: 5000,
        effectType: NebulaEffectType.RADIATION,
        damagePerSecond: 20,
        colorTint: '#2a0a2a',
      },
    ],
    stations: [],
    hyperspaceRoutes: [
      {
        id: 'deep_to_corellia',
        name: 'Deep Space Corridor',
        origin: SpaceZoneId.DEEP_SPACE,
        destination: SpaceZoneId.SPACE_CORELLIA,
        travelTime: 120,
        navPointsRequired: 6,
        minPilotLevel: 60,
        oneWay: false,
        fuelCost: 400,
      },
    ],
    spawnPoints: [
      createPirateSpawn('deep_pirate_1', { x: 0, y: 0, z: 0 }, { min: 5, max: 5 }),
      createPirateSpawn('deep_pirate_2', { x: 10000, y: -10000, z: 0 }, { min: 5, max: 5 }),
      {
        id: 'deep_blacksun_elite',
        position: { x: -15000, y: 5000, z: 0 },
        spawnRadius: 1500,
        factionType: SpaceFaction.BLACK_SUN,
        shipTypes: [ShipClass.GUNSHIP, ShipClass.CAPITAL],
        spawnRate: 1,
        maxActive: 3,
        minTier: 5,
        maxTier: 5,
        active: true,
      },
    ],
    enabled: true,
  },
};

/**
 * Space zone loader class for managing space zone creation and configuration.
 */
export class SpaceZoneLoader {
  /** Loaded space zones */
  private readonly zones: Map<SpaceZoneId, SpaceZone>;

  /** Loading promises for deduplication */
  private readonly loadingPromises: Map<SpaceZoneId, Promise<SpaceZone>>;

  constructor() {
    this.zones = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Loads a space zone by ID.
   *
   * @param zoneId - The space zone ID to load
   * @returns The loaded SpaceZone
   */
  async loadZone(zoneId: SpaceZoneId): Promise<SpaceZone> {
    // Return existing zone if already loaded
    const existing = this.zones.get(zoneId);
    if (existing) {
      return existing;
    }

    // Return existing loading promise if in progress
    const loading = this.loadingPromises.get(zoneId);
    if (loading) {
      return loading;
    }

    // Start loading
    const loadPromise = this.doLoadZone(zoneId);
    this.loadingPromises.set(zoneId, loadPromise);

    try {
      const zone = await loadPromise;
      return zone;
    } finally {
      this.loadingPromises.delete(zoneId);
    }
  }

  /**
   * Internal zone loading implementation.
   */
  private async doLoadZone(zoneId: SpaceZoneId): Promise<SpaceZone> {
    const config = SPACE_ZONE_CONFIGS[zoneId];
    if (!config) {
      throw new Error(`Space zone configuration not found: ${zoneId}`);
    }

    if (!config.enabled) {
      throw new Error(`Space zone is disabled: ${zoneId}`);
    }

    // Create the zone from config
    const zone = createSpaceZone(config);

    // TODO: Load additional zone data from datatables/database
    // - Custom spawn tables
    // - Event-specific configurations
    // - Player-owned stations

    // Store and activate
    this.zones.set(zoneId, zone);
    zone.activate();

    console.log(`Space zone ${zoneId} loaded`);

    return zone;
  }

  /**
   * Unloads a space zone.
   *
   * @param zoneId - The zone ID to unload
   */
  unloadZone(zoneId: SpaceZoneId): void {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      return;
    }

    zone.deactivate();
    zone.clear();
    this.zones.delete(zoneId);

    console.log(`Space zone ${zoneId} unloaded`);
  }

  /**
   * Unloads all space zones.
   */
  unloadAllZones(): void {
    for (const zoneId of this.zones.keys()) {
      this.unloadZone(zoneId);
    }
  }

  /**
   * Gets a loaded space zone.
   *
   * @param zoneId - The zone ID
   * @returns The zone or undefined if not loaded
   */
  getZone(zoneId: SpaceZoneId): SpaceZone | undefined {
    return this.zones.get(zoneId);
  }

  /**
   * Checks if a zone is loaded.
   *
   * @param zoneId - The zone ID
   */
  isZoneLoaded(zoneId: SpaceZoneId): boolean {
    return this.zones.has(zoneId);
  }

  /**
   * Gets all loaded space zones.
   */
  getAllZones(): SpaceZone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Gets IDs of all loaded zones.
   */
  getLoadedZoneIds(): SpaceZoneId[] {
    return Array.from(this.zones.keys());
  }

  /**
   * Loads all enabled space zones.
   */
  async loadAllZones(): Promise<SpaceZone[]> {
    const enabledZoneIds = Object.entries(SPACE_ZONE_CONFIGS)
      .filter(([, config]) => config.enabled)
      .map(([id]) => id as SpaceZoneId);

    const promises = enabledZoneIds.map((id) => this.loadZone(id));
    return Promise.all(promises);
  }

  /**
   * Gets the configuration for a space zone.
   *
   * @param zoneId - The zone ID
   */
  getZoneConfig(zoneId: SpaceZoneId): SpaceZoneConfig | undefined {
    return SPACE_ZONE_CONFIGS[zoneId];
  }

  /**
   * Gets all space zone configurations.
   */
  getAllConfigs(): SpaceZoneConfig[] {
    return Object.values(SPACE_ZONE_CONFIGS);
  }

  /**
   * Gets enabled space zone IDs.
   */
  getEnabledZoneIds(): SpaceZoneId[] {
    return Object.entries(SPACE_ZONE_CONFIGS)
      .filter(([, config]) => config.enabled)
      .map(([id]) => id as SpaceZoneId);
  }
}

/**
 * Factory function to create a SpaceZoneLoader.
 */
export function createSpaceZoneLoader(): SpaceZoneLoader {
  return new SpaceZoneLoader();
}

/**
 * Gets a hyperspace route between two zones (either direction).
 *
 * @param origin - Origin zone ID
 * @param destination - Destination zone ID
 * @returns The route or undefined if not found
 */
export function findHyperspaceRoute(
  origin: SpaceZoneId,
  destination: SpaceZoneId
): HyperspaceRoute | undefined {
  const originConfig = SPACE_ZONE_CONFIGS[origin];
  if (!originConfig) {
    return undefined;
  }

  // Check routes from origin
  const directRoute = originConfig.hyperspaceRoutes.find(
    (route) => route.destination === destination
  );
  if (directRoute) {
    return directRoute;
  }

  // Check routes from destination (for bidirectional routes)
  const destConfig = SPACE_ZONE_CONFIGS[destination];
  if (!destConfig) {
    return undefined;
  }

  const reverseRoute = destConfig.hyperspaceRoutes.find(
    (route) => route.destination === origin && !route.oneWay
  );
  if (reverseRoute) {
    // Return a reversed copy
    return {
      ...reverseRoute,
      id: `${reverseRoute.id}_reverse`,
      origin: destination,
      destination: origin,
    };
  }

  return undefined;
}
