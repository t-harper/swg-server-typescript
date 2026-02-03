/**
 * Harvester Types and Enumerations
 * Defines harvester types, sizes, and configuration constants for SWG resource extraction
 *
 * In SWG, harvesters are player-placed installations that automatically extract resources
 * from the ground. Different harvester types extract different resource categories:
 * - Mineral harvesters: Metals, ores, gemstones
 * - Chemical harvesters: Petrochemicals, polymers
 * - Flora harvesters: Wood, plant fibers
 * - Gas harvesters: Reactive and inert gases
 * - Water harvesters: Various water types (moisture vaporators)
 */

/**
 * Harvester type enumeration - determines which resources can be extracted
 */
export enum HarvesterType {
  /** Extracts mineral resources: metals, ores, gemstones */
  Mineral = 0,
  /** Extracts chemical resources: petrochemicals, polymers */
  Chemical = 1,
  /** Extracts flora resources: wood, plant fibers, food components */
  Flora = 2,
  /** Extracts gas resources: reactive and inert gases */
  Gas = 3,
  /** Extracts water resources: moisture vaporators */
  Water = 4,
  /** Extracts creature resources (rare, typically not player-placeable) */
  Organic = 5,
}

/**
 * Harvester size classification - affects hopper capacity and extraction rate
 */
export enum HarvesterSize {
  /** Small personal harvester */
  Small = 0,
  /** Medium harvester */
  Medium = 1,
  /** Large industrial harvester */
  Large = 2,
  /** Heavy harvester (rare, high-end) */
  Heavy = 3,
}

/**
 * Base Extraction Rate (BER) tiers
 * Higher BER means faster extraction
 */
export enum BerTier {
  /** Basic extraction rate (1x modifier) */
  Basic = 1,
  /** Standard extraction rate (2x modifier) */
  Standard = 2,
  /** Advanced extraction rate (3x modifier) */
  Advanced = 3,
  /** Elite extraction rate (4x modifier) */
  Elite = 4,
}

/**
 * Harvester operation result codes
 */
export const HarvesterResultCode = {
  /** Operation succeeded */
  Success: 0,
  /** Harvester has no power */
  NoPower: 1,
  /** Harvester needs maintenance */
  NoMaintenance: 2,
  /** Hopper is full */
  HopperFull: 3,
  /** No resource selected */
  NoResourceSelected: 4,
  /** Resource not found at location */
  ResourceNotFound: 5,
  /** Invalid resource type for this harvester */
  InvalidResourceType: 6,
  /** Insufficient permissions */
  NotOwner: 7,
  /** Harvester already active */
  AlreadyActive: 8,
  /** Harvester already inactive */
  AlreadyInactive: 9,
  /** General error */
  Error: 99,
} as const;

export type HarvesterResultCodeType =
  (typeof HarvesterResultCode)[keyof typeof HarvesterResultCode];

/**
 * Hopper capacities by harvester size
 */
export const HOPPER_CAPACITIES: Record<HarvesterSize, number> = {
  [HarvesterSize.Small]: 5000,
  [HarvesterSize.Medium]: 15000,
  [HarvesterSize.Large]: 30000,
  [HarvesterSize.Heavy]: 50000,
};

/**
 * Base extraction rates by harvester size (units per tick at 100% concentration)
 * Actual rate = base * BER * concentration * efficiency
 */
export const BASE_EXTRACTION_RATES: Record<HarvesterSize, number> = {
  [HarvesterSize.Small]: 2,
  [HarvesterSize.Medium]: 4,
  [HarvesterSize.Large]: 6,
  [HarvesterSize.Heavy]: 8,
};

/**
 * Power costs per extraction cycle by harvester size
 */
export const POWER_COSTS: Record<HarvesterSize, number> = {
  [HarvesterSize.Small]: 10,
  [HarvesterSize.Medium]: 20,
  [HarvesterSize.Large]: 35,
  [HarvesterSize.Heavy]: 50,
};

/**
 * Maintenance costs per cycle by harvester size (in credits)
 */
export const MAINTENANCE_COSTS: Record<HarvesterSize, number> = {
  [HarvesterSize.Small]: 15,
  [HarvesterSize.Medium]: 30,
  [HarvesterSize.Large]: 50,
  [HarvesterSize.Heavy]: 75,
};

/**
 * Default power pool sizes by harvester size
 */
export const DEFAULT_POWER_POOLS: Record<HarvesterSize, number> = {
  [HarvesterSize.Small]: 1000,
  [HarvesterSize.Medium]: 2500,
  [HarvesterSize.Large]: 5000,
  [HarvesterSize.Heavy]: 10000,
};

/**
 * Default maintenance pool sizes by harvester size
 */
export const DEFAULT_MAINTENANCE_POOLS: Record<HarvesterSize, number> = {
  [HarvesterSize.Small]: 5000,
  [HarvesterSize.Medium]: 10000,
  [HarvesterSize.Large]: 20000,
  [HarvesterSize.Heavy]: 40000,
};

/**
 * Extraction tick interval in milliseconds (how often harvesters process)
 */
export const EXTRACTION_TICK_INTERVAL = 60000; // 1 minute

/**
 * Maintenance deduction interval in milliseconds
 */
export const MAINTENANCE_TICK_INTERVAL = 3600000; // 1 hour

/**
 * Resource classes that each harvester type can extract
 */
export const HARVESTER_RESOURCE_CLASSES: Record<HarvesterType, string[]> = {
  [HarvesterType.Mineral]: [
    'mineral',
    'metal',
    'ore',
    'gemstone',
    'radioactive',
    'aluminum',
    'copper',
    'iron',
    'steel',
  ],
  [HarvesterType.Chemical]: [
    'chemical',
    'petrochemical',
    'polymer',
    'lubricant',
    'fuel_petrochem',
  ],
  [HarvesterType.Flora]: [
    'flora',
    'wood',
    'plant_fiber',
    'fruit',
    'vegetable',
    'grain',
    'seeds',
    'cereal',
  ],
  [HarvesterType.Gas]: [
    'gas',
    'inert_gas',
    'reactive_gas',
    'known_gas',
  ],
  [HarvesterType.Water]: [
    'water',
    'moisture',
  ],
  [HarvesterType.Organic]: [
    'organic',
    'creature_resources',
    'bone',
    'hide',
    'meat',
  ],
};

/**
 * Get the display name for a harvester type
 */
export function getHarvesterTypeName(type: HarvesterType): string {
  switch (type) {
    case HarvesterType.Mineral:
      return 'Mineral Harvester';
    case HarvesterType.Chemical:
      return 'Chemical Harvester';
    case HarvesterType.Flora:
      return 'Flora Harvester';
    case HarvesterType.Gas:
      return 'Gas Harvester';
    case HarvesterType.Water:
      return 'Moisture Vaporator';
    case HarvesterType.Organic:
      return 'Organic Harvester';
    default:
      return 'Unknown Harvester';
  }
}

/**
 * Get the display name for a harvester size
 */
export function getHarvesterSizeName(size: HarvesterSize): string {
  switch (size) {
    case HarvesterSize.Small:
      return 'Personal';
    case HarvesterSize.Medium:
      return 'Medium';
    case HarvesterSize.Large:
      return 'Heavy';
    case HarvesterSize.Heavy:
      return 'Elite';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a harvester type can extract a specific resource class
 */
export function canHarvestResourceClass(
  harvesterType: HarvesterType,
  resourceClass: string
): boolean {
  const classes = HARVESTER_RESOURCE_CLASSES[harvesterType];
  if (!classes) return false;

  const normalizedClass = resourceClass.toLowerCase();
  return classes.some((c) => normalizedClass.includes(c) || c.includes(normalizedClass));
}

/**
 * Get the harvester type that can extract a specific resource class
 */
export function getHarvesterTypeForResourceClass(resourceClass: string): HarvesterType | null {
  const normalizedClass = resourceClass.toLowerCase();

  for (const [type, classes] of Object.entries(HARVESTER_RESOURCE_CLASSES)) {
    if (classes.some((c) => normalizedClass.includes(c) || c.includes(normalizedClass))) {
      return Number(type) as HarvesterType;
    }
  }

  return null;
}

/**
 * Calculate effective extraction rate based on various factors
 */
export function calculateEffectiveExtractionRate(
  baseRate: number,
  ber: number,
  concentration: number,
  efficiency: number = 1.0
): number {
  // Concentration is 0-100, convert to multiplier
  const concentrationMultiplier = concentration / 100;

  // BER is a direct multiplier
  const berMultiplier = ber;

  // Calculate final rate
  return Math.floor(baseRate * berMultiplier * concentrationMultiplier * efficiency);
}

/**
 * Estimate time to fill hopper at current extraction rate
 */
export function estimateTimeToFillHopper(
  currentAmount: number,
  hopperCapacity: number,
  extractionRatePerTick: number
): number {
  if (extractionRatePerTick <= 0) return Infinity;

  const remaining = hopperCapacity - currentAmount;
  const ticksNeeded = Math.ceil(remaining / extractionRatePerTick);

  return ticksNeeded * EXTRACTION_TICK_INTERVAL;
}

/**
 * Calculate maintenance depletion time
 */
export function estimateMaintenanceDepletion(
  currentMaintenance: number,
  maintenanceCostPerTick: number
): number {
  if (maintenanceCostPerTick <= 0) return Infinity;

  const ticksRemaining = Math.floor(currentMaintenance / maintenanceCostPerTick);
  return ticksRemaining * MAINTENANCE_TICK_INTERVAL;
}

/**
 * Calculate power depletion time
 */
export function estimatePowerDepletion(
  currentPower: number,
  powerCostPerTick: number
): number {
  if (powerCostPerTick <= 0) return Infinity;

  const ticksRemaining = Math.floor(currentPower / powerCostPerTick);
  return ticksRemaining * EXTRACTION_TICK_INTERVAL;
}
