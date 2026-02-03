/**
 * Ship Component Types and Related Enumerations
 * Defines component classifications, quality tiers, and stat interfaces
 * for the Jump to Lightspeed (JTL) space combat system.
 *
 * Ship components are modular parts that can be installed in ships to
 * enhance their capabilities. Each component type has unique stats that
 * affect ship performance in different ways.
 */

/**
 * Ship component type classification
 * Determines which slot the component can be installed in and what stats it provides
 */
export enum ShipComponentType {
  /** Power reactor - generates energy for all ship systems */
  REACTOR = 0,
  /** Engine - provides propulsion and maneuverability */
  ENGINE = 1,
  /** Shield generator - provides protective shields */
  SHIELD_GENERATOR = 2,
  /** Armor plating - provides hull protection */
  ARMOR = 3,
  /** Capacitor - stores energy for weapons */
  CAPACITOR = 4,
  /** Booster - provides temporary speed boost */
  BOOSTER = 5,
  /** Droid interface - allows astromech droid to assist */
  DROID_INTERFACE = 6,
  /** Blaster weapon - primary energy weapon */
  WEAPON_BLASTER = 7,
  /** Missile launcher - secondary projectile weapon */
  WEAPON_MISSILE = 8,
  /** Countermeasure launcher - defensive decoys */
  WEAPON_COUNTERMEASURE = 9,
}

/**
 * Component quality tier
 * Higher quality components have better stats and are rarer
 */
export enum ComponentQuality {
  /** Basic components - lowest tier, commonly found */
  BASIC = 0,
  /** Standard components - average stats */
  STANDARD = 1,
  /** Advanced components - above average, requires certification */
  ADVANCED = 2,
  /** Elite components - high performance, rare drops */
  ELITE = 3,
  /** Legendary components - best stats, very rare */
  LEGENDARY = 4,
}

/**
 * Weapon fire mode for ship weapons
 * Determines how the weapon fires
 */
export enum WeaponFireMode {
  /** Single shot - one projectile per trigger pull */
  SINGLE = 0,
  /** Burst fire - multiple rapid shots */
  BURST = 1,
  /** Linked fire - fires with another weapon simultaneously */
  LINKED = 2,
}

/**
 * Reactor component stats
 * Reactors generate energy to power all ship systems
 */
export interface ReactorStats {
  /** Energy generated per second */
  energyGeneration: number;
  /** Energy required to maintain reactor operation */
  energyMaintenance: number;
}

/**
 * Engine component stats
 * Engines provide propulsion and maneuverability
 */
export interface EngineStats {
  /** Maximum speed in meters per second */
  topSpeed: number;
  /** Acceleration rate in m/s^2 */
  acceleration: number;
  /** Yaw rotation rate in degrees per second */
  yawRate: number;
  /** Pitch rotation rate in degrees per second */
  pitchRate: number;
  /** Roll rotation rate in degrees per second */
  rollRate: number;
}

/**
 * Shield generator component stats
 * Shields provide regenerating protection
 */
export interface ShieldStats {
  /** Front shield hitpoints */
  frontHitpoints: number;
  /** Rear shield hitpoints */
  rearHitpoints: number;
  /** Shield recharge rate per second */
  rechargeRate: number;
}

/**
 * Armor component stats
 * Armor provides static hull protection
 */
export interface ArmorStats {
  /** Total armor hitpoints */
  armorValue: number;
  /** Percentage of damage reduced (0.0 - 1.0) */
  damageReduction: number;
}

/**
 * Capacitor component stats
 * Capacitors store energy for weapons
 */
export interface CapacitorStats {
  /** Maximum energy storage capacity */
  energyStorage: number;
  /** Energy recharge rate per second */
  rechargeRate: number;
}

/**
 * Booster component stats
 * Boosters provide temporary speed increase
 */
export interface BoosterStats {
  /** Maximum booster energy */
  boosterEnergy: number;
  /** Energy consumption rate per second while active */
  consumptionRate: number;
  /** Energy recharge rate per second when inactive */
  rechargeRate: number;
  /** Speed multiplier when active (1.0 = 100% bonus) */
  speedMultiplier: number;
}

/**
 * Droid interface component stats
 * Allows astromech droid to assist with ship systems
 */
export interface DroidInterfaceStats {
  /** Command speed modifier (lower is faster) */
  commandSpeed: number;
  /** Maximum number of concurrent droid commands */
  maxCommands: number;
}

/**
 * Weapon component stats
 * Stats for all weapon types (blaster, missile, countermeasure)
 */
export interface WeaponStats {
  /** Minimum damage per hit */
  minDamage: number;
  /** Maximum damage per hit */
  maxDamage: number;
  /** Time between shots in seconds */
  refireRate: number;
  /** Energy consumed per shot */
  energyPerShot: number;
  /** Projectile travel speed in m/s */
  projectileSpeed: number;
  /** Maximum effective range in meters */
  effectiveRange: number;
  /** Fire mode (single, burst, linked) */
  fireMode: WeaponFireMode;
  /** Ammunition count (-1 for unlimited energy weapons) */
  ammoCount: number;
  /** Maximum ammunition capacity */
  maxAmmo: number;
}

/**
 * Component certification requirements
 * Determines what skills/levels are needed to use a component
 */
export interface ComponentCertification {
  /** Required pilot skill name */
  requiredSkill: string;
  /** Minimum skill level required (1-4 typically) */
  requiredLevel: number;
}

/**
 * Reverse engineering result
 * What is obtained when reverse engineering a component
 */
export interface ReverseEngineeringResult {
  /** Whether RE was successful */
  success: boolean;
  /** Credits obtained from RE */
  creditsObtained: number;
  /** Components/parts obtained */
  partsObtained: ReverseEngineeringPart[];
  /** Experience gained from RE */
  experienceGained: number;
  /** Chance for a rare schematic (0.0 - 1.0) */
  schematicChance: number;
  /** Schematic obtained (if any) */
  schematicObtained?: string;
}

/**
 * Parts obtained from reverse engineering
 */
export interface ReverseEngineeringPart {
  /** Part template name */
  partTemplate: string;
  /** Quantity obtained */
  quantity: number;
  /** Quality of the parts */
  quality: ComponentQuality;
}

/**
 * Loot tier information for components
 * Used for determining drop rates and quality
 */
export interface ComponentLootTier {
  /** Minimum loot level to drop this tier */
  minLevel: number;
  /** Maximum loot level for this tier */
  maxLevel: number;
  /** Drop weight (higher = more common) */
  dropWeight: number;
  /** Quality of components in this tier */
  quality: ComponentQuality;
}

/**
 * Get the display name for a ship component type
 */
export function getShipComponentTypeName(type: ShipComponentType): string {
  switch (type) {
    case ShipComponentType.REACTOR:
      return 'Reactor';
    case ShipComponentType.ENGINE:
      return 'Engine';
    case ShipComponentType.SHIELD_GENERATOR:
      return 'Shield Generator';
    case ShipComponentType.ARMOR:
      return 'Armor';
    case ShipComponentType.CAPACITOR:
      return 'Capacitor';
    case ShipComponentType.BOOSTER:
      return 'Booster';
    case ShipComponentType.DROID_INTERFACE:
      return 'Droid Interface';
    case ShipComponentType.WEAPON_BLASTER:
      return 'Blaster';
    case ShipComponentType.WEAPON_MISSILE:
      return 'Missile Launcher';
    case ShipComponentType.WEAPON_COUNTERMEASURE:
      return 'Countermeasure Launcher';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for a component quality
 */
export function getComponentQualityName(quality: ComponentQuality): string {
  switch (quality) {
    case ComponentQuality.BASIC:
      return 'Basic';
    case ComponentQuality.STANDARD:
      return 'Standard';
    case ComponentQuality.ADVANCED:
      return 'Advanced';
    case ComponentQuality.ELITE:
      return 'Elite';
    case ComponentQuality.LEGENDARY:
      return 'Legendary';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for a weapon fire mode
 */
export function getWeaponFireModeName(mode: WeaponFireMode): string {
  switch (mode) {
    case WeaponFireMode.SINGLE:
      return 'Single';
    case WeaponFireMode.BURST:
      return 'Burst';
    case WeaponFireMode.LINKED:
      return 'Linked';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a component type is a weapon
 */
export function isWeaponComponent(type: ShipComponentType): boolean {
  return (
    type === ShipComponentType.WEAPON_BLASTER ||
    type === ShipComponentType.WEAPON_MISSILE ||
    type === ShipComponentType.WEAPON_COUNTERMEASURE
  );
}

/**
 * Get the quality multiplier for stat calculations
 * Used to scale base stats based on quality tier
 */
export function getQualityMultiplier(quality: ComponentQuality): number {
  switch (quality) {
    case ComponentQuality.BASIC:
      return 0.7;
    case ComponentQuality.STANDARD:
      return 1.0;
    case ComponentQuality.ADVANCED:
      return 1.3;
    case ComponentQuality.ELITE:
      return 1.6;
    case ComponentQuality.LEGENDARY:
      return 2.0;
    default:
      return 1.0;
  }
}

/**
 * Get the default certification for a component type
 */
export function getDefaultComponentCertification(
  type: ShipComponentType
): ComponentCertification {
  // Most components require basic piloting
  const baseCert: ComponentCertification = {
    requiredSkill: 'pilot_novice',
    requiredLevel: 1,
  };

  switch (type) {
    case ShipComponentType.REACTOR:
      return { requiredSkill: 'pilot_engineering', requiredLevel: 1 };
    case ShipComponentType.ENGINE:
      return { requiredSkill: 'pilot_starships', requiredLevel: 1 };
    case ShipComponentType.SHIELD_GENERATOR:
      return { requiredSkill: 'pilot_engineering', requiredLevel: 1 };
    case ShipComponentType.WEAPON_BLASTER:
    case ShipComponentType.WEAPON_MISSILE:
      return { requiredSkill: 'pilot_weapons', requiredLevel: 1 };
    case ShipComponentType.WEAPON_COUNTERMEASURE:
      return { requiredSkill: 'pilot_weapons', requiredLevel: 2 };
    default:
      return baseCert;
  }
}

/**
 * Default loot tiers for space components
 */
export const COMPONENT_LOOT_TIERS: ComponentLootTier[] = [
  { minLevel: 1, maxLevel: 10, dropWeight: 100, quality: ComponentQuality.BASIC },
  { minLevel: 5, maxLevel: 20, dropWeight: 50, quality: ComponentQuality.STANDARD },
  { minLevel: 15, maxLevel: 35, dropWeight: 20, quality: ComponentQuality.ADVANCED },
  { minLevel: 30, maxLevel: 50, dropWeight: 5, quality: ComponentQuality.ELITE },
  { minLevel: 45, maxLevel: 60, dropWeight: 1, quality: ComponentQuality.LEGENDARY },
];

/**
 * Get loot tier for a given level
 */
export function getLootTierForLevel(level: number): ComponentLootTier | undefined {
  // Find all applicable tiers and randomly select based on weight
  const applicableTiers = COMPONENT_LOOT_TIERS.filter(
    (tier) => level >= tier.minLevel && level <= tier.maxLevel
  );

  if (applicableTiers.length === 0) {
    return undefined;
  }

  // Calculate total weight
  const totalWeight = applicableTiers.reduce((sum, tier) => sum + tier.dropWeight, 0);

  // Random selection based on weight
  let roll = Math.random() * totalWeight;
  for (const tier of applicableTiers) {
    roll -= tier.dropWeight;
    if (roll <= 0) {
      return tier;
    }
  }

  return applicableTiers[applicableTiers.length - 1];
}
