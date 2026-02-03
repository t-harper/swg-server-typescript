/**
 * Ship Types and Enumerations for Jump to Lightspeed (JTL)
 * Defines ship chassis types, component slots, and configuration for space gameplay
 *
 * In SWG JTL, ships are complex vehicles with multiple component slots:
 * - Reactor: Powers all ship systems
 * - Engine: Provides thrust and maneuverability
 * - Shields: Front/back protection that regenerates
 * - Armor: Directional damage absorption
 * - Capacitor: Weapon energy pool
 * - Booster: Temporary speed boost
 * - Droid Interface: Astromech droid slot
 * - Weapons: Up to 8 weapon hardpoints
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';

/**
 * Ship chassis type enumeration
 * Each chassis has different stats, hardpoints, and handling characteristics
 */
export enum ShipChassisType {
  // ============================================
  // Rebel Alliance Ships
  // ============================================

  /** T-65 X-Wing - Balanced multi-role starfighter */
  XWING = 0,
  /** BTL Y-Wing - Heavy assault bomber */
  YWING = 1,
  /** RZ-1 A-Wing - Fast interceptor */
  AWING = 2,
  /** B-Wing - Heavy assault starfighter */
  BWING = 3,
  /** Z-95 Headhunter - Light starfighter */
  Z95 = 4,

  // ============================================
  // Imperial Ships
  // ============================================

  /** TIE/LN Fighter - Standard Imperial starfighter */
  TIE_FIGHTER = 10,
  /** TIE/IN Interceptor - Fast Imperial interceptor */
  TIE_INTERCEPTOR = 11,
  /** TIE/SA Bomber - Imperial bomber */
  TIE_BOMBER = 12,
  /** TIE/D Defender - Advanced multi-role fighter */
  TIE_DEFENDER = 13,
  /** TIE Advanced x1 - Prototype advanced fighter */
  TIE_ADVANCED = 14,
  /** TIE Aggressor - Imperial gunship */
  TIE_AGGRESSOR = 15,
  /** TIE Oppressor - Heavy assault fighter */
  TIE_OPPRESSOR = 16,

  // ============================================
  // Neutral / Civilian Ships
  // ============================================

  /** YT-1300 Light Freighter - Versatile freighter */
  YT1300 = 20,
  /** YT-2400 Light Freighter - Fast cargo hauler */
  YT2400 = 21,
  /** Firespray Patrol Craft - Bounty hunter vessel */
  FIRESPRAY = 22,
  /** VT-49 Decimator - Imperial assault ship */
  DECIMATOR = 23,
  /** KSE Firespray - Kuat Systems variant */
  KSE_FIRESPRAY = 24,
  /** Dunelizard Fighter - Black Sun starfighter */
  DUNELIZARD = 25,
  /** Kimogila Heavy Fighter - Heavy assault craft */
  KIMOGILA = 26,
  /** Scyk Fighter - Light interceptor */
  SCYK = 27,
  /** Vaksai Fighter - Upgraded Scyk variant */
  VAKSAI = 28,
  /** Ixiyen Fighter - Fast patrol craft */
  IXIYEN = 29,
  /** Rihkxyrk Assault Fighter - Heavy gunship */
  RIHKXYRK = 30,

  // ============================================
  // Multi-crew Ships
  // ============================================

  /** YT-1300 (Multi-crew variant) */
  YT1300_POB = 40,
  /** Nova Courier - Multi-crew transport */
  NOVA_COURIER = 41,
  /** Sorosuub Yacht - Luxury transport */
  SOROSUUB_YACHT = 42,
  /** ARC-170 Starfighter - Clone Wars era fighter */
  ARC170 = 43,
}

/**
 * Ship component slot types
 * Each slot type accepts specific component categories
 */
export enum ShipComponentSlot {
  /** Main reactor - powers all systems */
  REACTOR = 0,
  /** Engine - thrust and maneuverability */
  ENGINE = 1,
  /** Shield generator */
  SHIELD = 2,
  /** Front armor plating */
  ARMOR_FRONT = 3,
  /** Rear armor plating */
  ARMOR_BACK = 4,
  /** Left armor plating */
  ARMOR_LEFT = 5,
  /** Right armor plating */
  ARMOR_RIGHT = 6,
  /** Weapon capacitor - energy for weapons */
  CAPACITOR = 7,
  /** Booster - temporary speed increase */
  BOOSTER = 8,
  /** Droid interface - astromech slot */
  DROID_INTERFACE = 9,
  /** Weapon slot 0 */
  WEAPON_0 = 10,
  /** Weapon slot 1 */
  WEAPON_1 = 11,
  /** Weapon slot 2 */
  WEAPON_2 = 12,
  /** Weapon slot 3 */
  WEAPON_3 = 13,
  /** Weapon slot 4 */
  WEAPON_4 = 14,
  /** Weapon slot 5 */
  WEAPON_5 = 15,
  /** Weapon slot 6 */
  WEAPON_6 = 16,
  /** Weapon slot 7 */
  WEAPON_7 = 17,
  /** Cargo hold */
  CARGO_HOLD = 18,
  /** Countermeasure launcher */
  COUNTERMEASURE = 19,
}

/**
 * Ship faction alignment
 */
export enum ShipFaction {
  /** No faction allegiance */
  NEUTRAL = 0,
  /** Rebel Alliance */
  REBEL = 1,
  /** Galactic Empire */
  IMPERIAL = 2,
  /** Black Sun criminal syndicate */
  BLACK_SUN = 3,
  /** Hutt Cartel */
  HUTT = 4,
}

/**
 * Ship condition state enumeration
 */
export enum ShipConditionState {
  /** Ship is fully operational */
  OPERATIONAL = 0,
  /** Ship has taken damage but is functional */
  DAMAGED = 1,
  /** Ship systems are disabled */
  DISABLED = 2,
  /** Ship is destroyed */
  DESTROYED = 3,
}

/**
 * Damage direction for armor calculations
 */
export enum DamageDirection {
  /** Damage from the front */
  FRONT = 0,
  /** Damage from the rear */
  BACK = 1,
  /** Damage from the left */
  LEFT = 2,
  /** Damage from the right */
  RIGHT = 3,
}

/**
 * Component mount interface
 * Represents an installed component in a ship slot
 */
export interface ComponentMount {
  /** The slot this component occupies */
  slotType: ShipComponentSlot;
  /** Object ID of the installed component (0n if empty) */
  componentId: ObjectId;
  /** Current hitpoints of the component */
  hitpoints: number;
  /** Maximum hitpoints of the component */
  maxHitpoints: number;
  /** Efficiency rating (0.0 - 1.0, affected by damage) */
  efficiency: number;
  /** Armor value for this component (damage reduction) */
  armor: number;
  /** Component mass (affects ship handling) */
  mass: number;
  /** Energy drain from reactor */
  energyDrain: number;
  /** CRC of the component template */
  templateCrc: CrcValue;
}

/**
 * Ship stats interface
 * Calculated values based on installed components
 */
export interface ShipStats {
  // ============================================
  // Mass and Handling
  // ============================================

  /** Total ship mass (affects acceleration/deceleration) */
  mass: number;
  /** Maximum speed in m/s */
  maxSpeed: number;
  /** Acceleration rate in m/s^2 */
  acceleration: number;
  /** Deceleration rate in m/s^2 */
  deceleration: number;
  /** Yaw rate (horizontal rotation) in rad/s */
  yawRate: number;
  /** Pitch rate (vertical rotation) in rad/s */
  pitchRate: number;
  /** Roll rate in rad/s */
  rollRate: number;

  // ============================================
  // Power and Energy
  // ============================================

  /** Reactor power output */
  reactorPower: number;
  /** Total energy consumption of all components */
  energyConsumption: number;
  /** Capacitor maximum energy */
  capacitorEnergy: number;
  /** Capacitor recharge rate per second */
  capacitorRechargeRate: number;

  // ============================================
  // Shields
  // ============================================

  /** Front shield maximum hitpoints */
  shieldFrontMax: number;
  /** Rear shield maximum hitpoints */
  shieldBackMax: number;
  /** Shield recharge rate per second */
  shieldRechargeRate: number;

  // ============================================
  // Armor
  // ============================================

  /** Front armor hitpoints */
  armorFront: number;
  /** Rear armor hitpoints */
  armorBack: number;
  /** Left armor hitpoints */
  armorLeft: number;
  /** Right armor hitpoints */
  armorRight: number;

  // ============================================
  // Booster
  // ============================================

  /** Booster maximum energy */
  boosterEnergy: number;
  /** Booster recharge rate per second */
  boosterRechargeRate: number;
  /** Booster consumption rate per second */
  boosterConsumptionRate: number;
  /** Booster speed multiplier */
  boosterSpeedMultiplier: number;
  /** Booster acceleration multiplier */
  boosterAccelerationMultiplier: number;
}

/**
 * Weapon hardpoint configuration
 */
export interface WeaponHardpoint {
  /** Weapon slot index (0-7) */
  slotIndex: number;
  /** Object ID of installed weapon */
  weaponId: ObjectId;
  /** Weapon group assignment (0-3) */
  weaponGroup: number;
  /** Current ammunition count (-1 for energy weapons) */
  ammo: number;
  /** Maximum ammunition (-1 for energy weapons) */
  maxAmmo: number;
  /** Weapon damage per shot */
  damage: number;
  /** Effective range in meters */
  range: number;
  /** Refire rate in shots per second */
  refireRate: number;
  /** Energy cost per shot */
  energyCost: number;
}

/**
 * Ship chassis configuration
 * Defines the base stats and available slots for a chassis type
 */
export interface ShipChassisConfig {
  /** Chassis type identifier */
  chassisType: ShipChassisType;
  /** Display name */
  name: string;
  /** Faction restriction (if any) */
  faction: ShipFaction;
  /** Base mass (before components) */
  baseMass: number;
  /** Base maximum speed */
  baseMaxSpeed: number;
  /** Base acceleration */
  baseAcceleration: number;
  /** Base yaw rate */
  baseYawRate: number;
  /** Base pitch rate */
  basePitchRate: number;
  /** Base roll rate */
  baseRollRate: number;
  /** Available component slots */
  availableSlots: ShipComponentSlot[];
  /** Maximum number of weapon slots */
  maxWeaponSlots: number;
  /** Whether this is a multi-crew ship */
  isMultiCrew: boolean;
  /** Maximum number of passengers (including pilot) */
  maxPassengers: number;
  /** Maximum number of gunner stations */
  maxGunners: number;
  /** Cargo capacity in units */
  cargoCapacity: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the display name for a chassis type
 */
export function getChassisTypeName(type: ShipChassisType): string {
  switch (type) {
    case ShipChassisType.XWING:
      return 'X-Wing';
    case ShipChassisType.YWING:
      return 'Y-Wing';
    case ShipChassisType.AWING:
      return 'A-Wing';
    case ShipChassisType.BWING:
      return 'B-Wing';
    case ShipChassisType.Z95:
      return 'Z-95 Headhunter';
    case ShipChassisType.TIE_FIGHTER:
      return 'TIE Fighter';
    case ShipChassisType.TIE_INTERCEPTOR:
      return 'TIE Interceptor';
    case ShipChassisType.TIE_BOMBER:
      return 'TIE Bomber';
    case ShipChassisType.TIE_DEFENDER:
      return 'TIE Defender';
    case ShipChassisType.TIE_ADVANCED:
      return 'TIE Advanced';
    case ShipChassisType.TIE_AGGRESSOR:
      return 'TIE Aggressor';
    case ShipChassisType.TIE_OPPRESSOR:
      return 'TIE Oppressor';
    case ShipChassisType.YT1300:
      return 'YT-1300';
    case ShipChassisType.YT2400:
      return 'YT-2400';
    case ShipChassisType.FIRESPRAY:
      return 'Firespray';
    case ShipChassisType.DECIMATOR:
      return 'VT-49 Decimator';
    case ShipChassisType.KSE_FIRESPRAY:
      return 'KSE Firespray';
    case ShipChassisType.DUNELIZARD:
      return 'Dunelizard';
    case ShipChassisType.KIMOGILA:
      return 'Kimogila';
    case ShipChassisType.SCYK:
      return 'Scyk';
    case ShipChassisType.VAKSAI:
      return 'Vaksai';
    case ShipChassisType.IXIYEN:
      return 'Ixiyen';
    case ShipChassisType.RIHKXYRK:
      return 'Rihkxyrk';
    case ShipChassisType.YT1300_POB:
      return 'YT-1300 (POB)';
    case ShipChassisType.NOVA_COURIER:
      return 'Nova Courier';
    case ShipChassisType.SOROSUUB_YACHT:
      return 'Sorosuub Yacht';
    case ShipChassisType.ARC170:
      return 'ARC-170';
    default:
      return 'Unknown Ship';
  }
}

/**
 * Get the display name for a component slot
 */
export function getComponentSlotName(slot: ShipComponentSlot): string {
  switch (slot) {
    case ShipComponentSlot.REACTOR:
      return 'Reactor';
    case ShipComponentSlot.ENGINE:
      return 'Engine';
    case ShipComponentSlot.SHIELD:
      return 'Shield Generator';
    case ShipComponentSlot.ARMOR_FRONT:
      return 'Front Armor';
    case ShipComponentSlot.ARMOR_BACK:
      return 'Rear Armor';
    case ShipComponentSlot.ARMOR_LEFT:
      return 'Left Armor';
    case ShipComponentSlot.ARMOR_RIGHT:
      return 'Right Armor';
    case ShipComponentSlot.CAPACITOR:
      return 'Capacitor';
    case ShipComponentSlot.BOOSTER:
      return 'Booster';
    case ShipComponentSlot.DROID_INTERFACE:
      return 'Droid Interface';
    case ShipComponentSlot.WEAPON_0:
      return 'Weapon 1';
    case ShipComponentSlot.WEAPON_1:
      return 'Weapon 2';
    case ShipComponentSlot.WEAPON_2:
      return 'Weapon 3';
    case ShipComponentSlot.WEAPON_3:
      return 'Weapon 4';
    case ShipComponentSlot.WEAPON_4:
      return 'Weapon 5';
    case ShipComponentSlot.WEAPON_5:
      return 'Weapon 6';
    case ShipComponentSlot.WEAPON_6:
      return 'Weapon 7';
    case ShipComponentSlot.WEAPON_7:
      return 'Weapon 8';
    case ShipComponentSlot.CARGO_HOLD:
      return 'Cargo Hold';
    case ShipComponentSlot.COUNTERMEASURE:
      return 'Countermeasure';
    default:
      return 'Unknown Slot';
  }
}

/**
 * Get the display name for a ship faction
 */
export function getShipFactionName(faction: ShipFaction): string {
  switch (faction) {
    case ShipFaction.NEUTRAL:
      return 'Neutral';
    case ShipFaction.REBEL:
      return 'Rebel Alliance';
    case ShipFaction.IMPERIAL:
      return 'Galactic Empire';
    case ShipFaction.BLACK_SUN:
      return 'Black Sun';
    case ShipFaction.HUTT:
      return 'Hutt Cartel';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for a condition state
 */
export function getConditionStateName(state: ShipConditionState): string {
  switch (state) {
    case ShipConditionState.OPERATIONAL:
      return 'Operational';
    case ShipConditionState.DAMAGED:
      return 'Damaged';
    case ShipConditionState.DISABLED:
      return 'Disabled';
    case ShipConditionState.DESTROYED:
      return 'Destroyed';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a slot is a weapon slot
 */
export function isWeaponSlot(slot: ShipComponentSlot): boolean {
  return (
    slot >= ShipComponentSlot.WEAPON_0 && slot <= ShipComponentSlot.WEAPON_7
  );
}

/**
 * Check if a slot is an armor slot
 */
export function isArmorSlot(slot: ShipComponentSlot): boolean {
  return (
    slot >= ShipComponentSlot.ARMOR_FRONT &&
    slot <= ShipComponentSlot.ARMOR_RIGHT
  );
}

/**
 * Get the weapon slot index (0-7) from a component slot
 */
export function getWeaponSlotIndex(slot: ShipComponentSlot): number {
  if (!isWeaponSlot(slot)) {
    return -1;
  }
  return slot - ShipComponentSlot.WEAPON_0;
}

/**
 * Get the component slot for a weapon index (0-7)
 */
export function getWeaponSlot(index: number): ShipComponentSlot {
  if (index < 0 || index > 7) {
    return ShipComponentSlot.WEAPON_0;
  }
  return ShipComponentSlot.WEAPON_0 + index;
}

/**
 * Get the armor slot for a damage direction
 */
export function getArmorSlotForDirection(
  direction: DamageDirection
): ShipComponentSlot {
  switch (direction) {
    case DamageDirection.FRONT:
      return ShipComponentSlot.ARMOR_FRONT;
    case DamageDirection.BACK:
      return ShipComponentSlot.ARMOR_BACK;
    case DamageDirection.LEFT:
      return ShipComponentSlot.ARMOR_LEFT;
    case DamageDirection.RIGHT:
      return ShipComponentSlot.ARMOR_RIGHT;
  }
}

/**
 * Create an empty component mount
 */
export function createEmptyMount(slotType: ShipComponentSlot): ComponentMount {
  return {
    slotType,
    componentId: 0n,
    hitpoints: 0,
    maxHitpoints: 0,
    efficiency: 0,
    armor: 0,
    mass: 0,
    energyDrain: 0,
    templateCrc: 0,
  };
}

/**
 * Create default ship stats
 */
export function createDefaultShipStats(): ShipStats {
  return {
    mass: 0,
    maxSpeed: 0,
    acceleration: 0,
    deceleration: 0,
    yawRate: 0,
    pitchRate: 0,
    rollRate: 0,
    reactorPower: 0,
    energyConsumption: 0,
    capacitorEnergy: 0,
    capacitorRechargeRate: 0,
    shieldFrontMax: 0,
    shieldBackMax: 0,
    shieldRechargeRate: 0,
    armorFront: 0,
    armorBack: 0,
    armorLeft: 0,
    armorRight: 0,
    boosterEnergy: 0,
    boosterRechargeRate: 0,
    boosterConsumptionRate: 0,
    boosterSpeedMultiplier: 1.0,
    boosterAccelerationMultiplier: 1.0,
  };
}

/**
 * Check if a chassis is a Rebel ship
 */
export function isRebelChassis(type: ShipChassisType): boolean {
  return type >= ShipChassisType.XWING && type <= ShipChassisType.Z95;
}

/**
 * Check if a chassis is an Imperial ship
 */
export function isImperialChassis(type: ShipChassisType): boolean {
  return type >= ShipChassisType.TIE_FIGHTER && type <= ShipChassisType.TIE_OPPRESSOR;
}

/**
 * Check if a chassis is a multi-crew ship
 */
export function isMultiCrewChassis(type: ShipChassisType): boolean {
  return type >= ShipChassisType.YT1300_POB && type <= ShipChassisType.ARC170;
}
