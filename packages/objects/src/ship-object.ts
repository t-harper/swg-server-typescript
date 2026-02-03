/**
 * ShipObject - Represents ships in the SWG Jump to Lightspeed (JTL) space gameplay
 * Extends TangibleObject with space combat and flight properties.
 *
 * SWG ships are complex vehicles with:
 * - Multiple component slots (reactor, engine, shields, weapons, etc.)
 * - Pilot and optional gunner/passenger seats
 * - Directional shields and armor
 * - Energy management systems
 * - Flight dynamics (speed, acceleration, rotation rates)
 *
 * Baseline Types:
 * - SHIP3: Ship stats, component data (shared data)
 * - SHIP6: Combat state, damage tracking (server data)
 */

import type { ObjectId, CrcValue, Vector3 } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  ShipChassisType,
  ShipComponentSlot,
  ShipFaction,
  ShipConditionState,
  DamageDirection,
  type ComponentMount,
  type ShipStats,
  type WeaponHardpoint,
  createEmptyMount,
  createDefaultShipStats,
  isWeaponSlot,
  isArmorSlot,
  getArmorSlotForDirection,
  getWeaponSlotIndex,
} from './ship-types.js';

// Re-export ship types for convenience
export {
  ShipChassisType,
  ShipComponentSlot,
  ShipFaction,
  ShipConditionState,
  DamageDirection,
} from './ship-types.js';

/**
 * SHIP property indices for delta tracking
 * These match the variable indices in SHIP baselines
 */
export const ShipProperty = {
  // SHIP3 (Shared)
  CHASSIS_TYPE: 0,
  SHIP_FACTION: 1,
  SHIP_NAME: 2,
  COMPONENT_SLOTS: 3,
  WEAPON_HARDPOINTS: 4,
  CURRENT_SPEED: 5,
  THROTTLE_POSITION: 6,
  SHIELD_FRONT: 7,
  SHIELD_BACK: 8,
  CAPACITOR_CURRENT: 9,
  BOOSTER_CURRENT: 10,
  CONDITION_STATE: 11,

  // SHIP6 (Server)
  PILOT_ID: 0,
  GUNNER_IDS: 1,
  PASSENGER_IDS: 2,
  TARGET_ID: 3,
  IN_COMBAT: 4,
  LAST_DAMAGE_TIME: 5,
  CALCULATED_STATS: 6,
} as const;

/**
 * ShipObject - Represents ships in space combat
 * Extends TangibleObject with JTL-specific properties
 */
export class ShipObject extends TangibleObject {
  // ============================================
  // Chassis and Identity
  // ============================================

  /** Type of ship chassis */
  chassisType: ShipChassisType;

  /** Ship faction alignment */
  shipFaction: ShipFaction;

  /** Ship's custom name (callsign) */
  shipName: string;

  /** Current condition state of the ship */
  conditionState: ShipConditionState;

  // ============================================
  // Component System
  // ============================================

  /** Map of component slots to installed components */
  componentSlots: Map<ShipComponentSlot, ComponentMount>;

  /** Weapon hardpoint configurations */
  weaponHardpoints: WeaponHardpoint[];

  // ============================================
  // Crew
  // ============================================

  /** Object ID of the pilot (0n if no pilot) */
  pilotId: ObjectId;

  /** Object IDs of gunners */
  gunnerIds: ObjectId[];

  /** Object IDs of passengers */
  passengerIds: ObjectId[];

  // ============================================
  // Movement and Flight
  // ============================================

  /** Current speed in m/s */
  currentSpeed: number;

  /** Throttle position (0.0 - 1.0) */
  throttlePosition: number;

  /** Current velocity vector */
  velocity: Vector3;

  /** Angular velocity (rotation rates) */
  angularVelocity: Vector3;

  // ============================================
  // Shields and Energy
  // ============================================

  /** Current front shield hitpoints */
  shieldFrontCurrent: number;

  /** Current rear shield hitpoints */
  shieldBackCurrent: number;

  /** Current capacitor energy */
  capacitorCurrent: number;

  /** Current booster energy */
  boosterCurrent: number;

  /** Whether booster is currently active */
  boosterActive: boolean;

  // ============================================
  // Combat State
  // ============================================

  /** Current target object ID */
  targetId: ObjectId;

  /** Whether ship is in space combat */
  inSpaceCombat: boolean;

  /** Timestamp of last damage received */
  lastDamageTime: number;

  // ============================================
  // Calculated Stats
  // ============================================

  /** Calculated ship stats based on components */
  private calculatedStats: ShipStats;

  /** Flag indicating stats need recalculation */
  private statsNeedRecalculation: boolean;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for SHIP3 */
  private deltaTrackerShip3: DeltaTracker;

  /** Delta tracker for SHIP6 */
  private deltaTrackerShip6: DeltaTracker;

  /**
   * Create a new ShipObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Ship;

    // Initialize chassis properties
    this.chassisType = ShipChassisType.XWING;
    this.shipFaction = ShipFaction.NEUTRAL;
    this.shipName = '';
    this.conditionState = ShipConditionState.OPERATIONAL;

    // Initialize component system
    this.componentSlots = new Map();
    this.weaponHardpoints = [];
    this.initializeDefaultSlots();

    // Initialize crew
    this.pilotId = 0n;
    this.gunnerIds = [];
    this.passengerIds = [];

    // Initialize movement
    this.currentSpeed = 0;
    this.throttlePosition = 0;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };

    // Initialize shields and energy
    this.shieldFrontCurrent = 0;
    this.shieldBackCurrent = 0;
    this.capacitorCurrent = 0;
    this.boosterCurrent = 0;
    this.boosterActive = false;

    // Initialize combat state
    this.targetId = 0n;
    this.inSpaceCombat = false;
    this.lastDamageTime = 0;

    // Initialize calculated stats
    this.calculatedStats = createDefaultShipStats();
    this.statsNeedRecalculation = true;

    // Initialize delta trackers
    this.deltaTrackerShip3 = new DeltaTracker();
    this.deltaTrackerShip6 = new DeltaTracker();
  }

  /**
   * Get baseline type for SHIP objects
   */
  override getBaselineType(): string {
    return 'SHIP';
  }

  /**
   * Initialize default component slots for the ship
   */
  private initializeDefaultSlots(): void {
    // Core components
    this.componentSlots.set(
      ShipComponentSlot.REACTOR,
      createEmptyMount(ShipComponentSlot.REACTOR)
    );
    this.componentSlots.set(
      ShipComponentSlot.ENGINE,
      createEmptyMount(ShipComponentSlot.ENGINE)
    );
    this.componentSlots.set(
      ShipComponentSlot.SHIELD,
      createEmptyMount(ShipComponentSlot.SHIELD)
    );
    this.componentSlots.set(
      ShipComponentSlot.CAPACITOR,
      createEmptyMount(ShipComponentSlot.CAPACITOR)
    );
    this.componentSlots.set(
      ShipComponentSlot.BOOSTER,
      createEmptyMount(ShipComponentSlot.BOOSTER)
    );

    // Armor slots
    this.componentSlots.set(
      ShipComponentSlot.ARMOR_FRONT,
      createEmptyMount(ShipComponentSlot.ARMOR_FRONT)
    );
    this.componentSlots.set(
      ShipComponentSlot.ARMOR_BACK,
      createEmptyMount(ShipComponentSlot.ARMOR_BACK)
    );
    this.componentSlots.set(
      ShipComponentSlot.ARMOR_LEFT,
      createEmptyMount(ShipComponentSlot.ARMOR_LEFT)
    );
    this.componentSlots.set(
      ShipComponentSlot.ARMOR_RIGHT,
      createEmptyMount(ShipComponentSlot.ARMOR_RIGHT)
    );

    // Optional components
    this.componentSlots.set(
      ShipComponentSlot.DROID_INTERFACE,
      createEmptyMount(ShipComponentSlot.DROID_INTERFACE)
    );
    this.componentSlots.set(
      ShipComponentSlot.CARGO_HOLD,
      createEmptyMount(ShipComponentSlot.CARGO_HOLD)
    );
    this.componentSlots.set(
      ShipComponentSlot.COUNTERMEASURE,
      createEmptyMount(ShipComponentSlot.COUNTERMEASURE)
    );
  }

  // ============================================
  // Chassis Management
  // ============================================

  /**
   * Set the ship chassis type
   */
  setChassisType(type: ShipChassisType): void {
    if (this.chassisType !== type) {
      this.chassisType = type;
      this.statsNeedRecalculation = true;
      this.deltaTrackerShip3.trackChange(ShipProperty.CHASSIS_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the ship faction
   */
  setShipFaction(faction: ShipFaction): void {
    if (this.shipFaction !== faction) {
      this.shipFaction = faction;
      this.deltaTrackerShip3.trackChange(ShipProperty.SHIP_FACTION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the ship's custom name
   */
  setShipName(name: string): void {
    if (this.shipName !== name) {
      this.shipName = name;
      this.deltaTrackerShip3.trackChange(ShipProperty.SHIP_NAME, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Component Management
  // ============================================

  /**
   * Install a component in a slot
   * @param slot - The slot to install into
   * @param component - The component mount data
   * @returns true if installed successfully
   */
  installComponent(slot: ShipComponentSlot, component: ComponentMount): boolean {
    // Validate slot exists
    if (!this.componentSlots.has(slot)) {
      return false;
    }

    // Update the mount
    const mount = { ...component, slotType: slot };
    this.componentSlots.set(slot, mount);

    // Track delta
    this.deltaTrackerShip3.trackListChange(
      ShipProperty.COMPONENT_SLOTS,
      slot,
      mount
    );

    // Mark stats for recalculation
    this.statsNeedRecalculation = true;
    this.markModified();

    return true;
  }

  /**
   * Remove a component from a slot
   * @param slot - The slot to clear
   * @returns The removed component mount, or null if slot was empty
   */
  removeComponent(slot: ShipComponentSlot): ComponentMount | null {
    const existing = this.componentSlots.get(slot);
    if (!existing || existing.componentId === 0n) {
      return null;
    }

    // Create empty mount
    const emptyMount = createEmptyMount(slot);
    this.componentSlots.set(slot, emptyMount);

    // Track delta
    this.deltaTrackerShip3.trackListChange(
      ShipProperty.COMPONENT_SLOTS,
      slot,
      emptyMount
    );

    // Mark stats for recalculation
    this.statsNeedRecalculation = true;
    this.markModified();

    return existing;
  }

  /**
   * Get the component in a specific slot
   * @param slot - The slot to query
   * @returns The component mount, or null if slot doesn't exist
   */
  getComponentInSlot(slot: ShipComponentSlot): ComponentMount | null {
    return this.componentSlots.get(slot) ?? null;
  }

  /**
   * Check if a slot has a component installed
   */
  hasComponent(slot: ShipComponentSlot): boolean {
    const mount = this.componentSlots.get(slot);
    return mount !== undefined && mount.componentId !== 0n;
  }

  /**
   * Add a weapon hardpoint
   */
  addWeaponHardpoint(hardpoint: WeaponHardpoint): void {
    // Ensure weapon slot exists
    const weaponSlot = ShipComponentSlot.WEAPON_0 + hardpoint.slotIndex;
    if (!this.componentSlots.has(weaponSlot)) {
      this.componentSlots.set(weaponSlot, createEmptyMount(weaponSlot));
    }

    // Find or add hardpoint
    const existingIndex = this.weaponHardpoints.findIndex(
      (h) => h.slotIndex === hardpoint.slotIndex
    );
    if (existingIndex >= 0) {
      this.weaponHardpoints[existingIndex] = hardpoint;
    } else {
      this.weaponHardpoints.push(hardpoint);
    }

    this.deltaTrackerShip3.trackListChange(
      ShipProperty.WEAPON_HARDPOINTS,
      hardpoint.slotIndex,
      hardpoint
    );
    this.markModified();
  }

  /**
   * Get weapon hardpoint by slot index
   */
  getWeaponHardpoint(slotIndex: number): WeaponHardpoint | null {
    return this.weaponHardpoints.find((h) => h.slotIndex === slotIndex) ?? null;
  }

  // ============================================
  // Stats Calculation
  // ============================================

  /**
   * Calculate ship stats based on installed components
   */
  calculateStats(): ShipStats {
    if (!this.statsNeedRecalculation) {
      return this.calculatedStats;
    }

    const stats = createDefaultShipStats();

    // Calculate mass from all components
    for (const [, mount] of this.componentSlots) {
      if (mount.componentId !== 0n) {
        stats.mass += mount.mass;
        stats.energyConsumption += mount.energyDrain;
      }
    }

    // Get reactor stats
    const reactor = this.componentSlots.get(ShipComponentSlot.REACTOR);
    if (reactor && reactor.componentId !== 0n) {
      // Base reactor power (would come from component data in real implementation)
      stats.reactorPower = 1000 * reactor.efficiency;
    }

    // Get engine stats
    const engine = this.componentSlots.get(ShipComponentSlot.ENGINE);
    if (engine && engine.componentId !== 0n) {
      // Base engine stats (would come from component data in real implementation)
      stats.maxSpeed = 100 * engine.efficiency;
      stats.acceleration = 50 * engine.efficiency;
      stats.deceleration = 50 * engine.efficiency;
      stats.yawRate = 1.5 * engine.efficiency;
      stats.pitchRate = 1.5 * engine.efficiency;
      stats.rollRate = 2.0 * engine.efficiency;
    }

    // Get shield stats
    const shield = this.componentSlots.get(ShipComponentSlot.SHIELD);
    if (shield && shield.componentId !== 0n) {
      stats.shieldFrontMax = shield.maxHitpoints * 0.5;
      stats.shieldBackMax = shield.maxHitpoints * 0.5;
      stats.shieldRechargeRate = 10 * shield.efficiency;
    }

    // Get armor stats
    const armorFront = this.componentSlots.get(ShipComponentSlot.ARMOR_FRONT);
    const armorBack = this.componentSlots.get(ShipComponentSlot.ARMOR_BACK);
    const armorLeft = this.componentSlots.get(ShipComponentSlot.ARMOR_LEFT);
    const armorRight = this.componentSlots.get(ShipComponentSlot.ARMOR_RIGHT);

    if (armorFront && armorFront.componentId !== 0n) {
      stats.armorFront = armorFront.hitpoints;
    }
    if (armorBack && armorBack.componentId !== 0n) {
      stats.armorBack = armorBack.hitpoints;
    }
    if (armorLeft && armorLeft.componentId !== 0n) {
      stats.armorLeft = armorLeft.hitpoints;
    }
    if (armorRight && armorRight.componentId !== 0n) {
      stats.armorRight = armorRight.hitpoints;
    }

    // Get capacitor stats
    const capacitor = this.componentSlots.get(ShipComponentSlot.CAPACITOR);
    if (capacitor && capacitor.componentId !== 0n) {
      stats.capacitorEnergy = capacitor.maxHitpoints;
      stats.capacitorRechargeRate = 20 * capacitor.efficiency;
    }

    // Get booster stats
    const booster = this.componentSlots.get(ShipComponentSlot.BOOSTER);
    if (booster && booster.componentId !== 0n) {
      stats.boosterEnergy = booster.maxHitpoints;
      stats.boosterRechargeRate = 5 * booster.efficiency;
      stats.boosterConsumptionRate = 10;
      stats.boosterSpeedMultiplier = 1.5;
      stats.boosterAccelerationMultiplier = 2.0;
    }

    this.calculatedStats = stats;
    this.statsNeedRecalculation = false;
    this.deltaTrackerShip6.trackChange(ShipProperty.CALCULATED_STATS, DeltaType.Change);

    return stats;
  }

  /**
   * Get calculated ship stats (recalculates if needed)
   */
  getStats(): ShipStats {
    return this.calculateStats();
  }

  /**
   * Force stats recalculation on next access
   */
  invalidateStats(): void {
    this.statsNeedRecalculation = true;
  }

  // ============================================
  // Damage Handling
  // ============================================

  /**
   * Apply damage to the ship from a specific direction
   * @param amount - Raw damage amount
   * @param direction - Direction damage is coming from
   * @returns Actual damage dealt after shields/armor
   */
  applyDamage(amount: number, direction: DamageDirection): number {
    if (amount <= 0) {
      return 0;
    }

    this.lastDamageTime = Date.now();
    this.inSpaceCombat = true;
    let remainingDamage = amount;

    // First, damage shields (front or back based on direction)
    const isFrontHit =
      direction === DamageDirection.FRONT ||
      direction === DamageDirection.LEFT ||
      direction === DamageDirection.RIGHT;

    if (isFrontHit && this.shieldFrontCurrent > 0) {
      const shieldDamage = Math.min(remainingDamage, this.shieldFrontCurrent);
      this.shieldFrontCurrent -= shieldDamage;
      remainingDamage -= shieldDamage;
      this.deltaTrackerShip3.trackChange(ShipProperty.SHIELD_FRONT, DeltaType.Change);
    } else if (!isFrontHit && this.shieldBackCurrent > 0) {
      const shieldDamage = Math.min(remainingDamage, this.shieldBackCurrent);
      this.shieldBackCurrent -= shieldDamage;
      remainingDamage -= shieldDamage;
      this.deltaTrackerShip3.trackChange(ShipProperty.SHIELD_BACK, DeltaType.Change);
    }

    // Then damage armor in the hit direction
    if (remainingDamage > 0) {
      const armorSlot = getArmorSlotForDirection(direction);
      const armorMount = this.componentSlots.get(armorSlot);

      if (armorMount && armorMount.hitpoints > 0) {
        const armorDamage = Math.min(remainingDamage, armorMount.hitpoints);
        armorMount.hitpoints -= armorDamage;

        // Update efficiency based on remaining hitpoints
        if (armorMount.maxHitpoints > 0) {
          armorMount.efficiency = armorMount.hitpoints / armorMount.maxHitpoints;
        }

        remainingDamage -= armorDamage;
        this.deltaTrackerShip3.trackListChange(
          ShipProperty.COMPONENT_SLOTS,
          armorSlot,
          armorMount
        );
      }
    }

    // Remaining damage goes to hull (ship condition)
    if (remainingDamage > 0) {
      this.setCondition(this.condition - remainingDamage);
    }

    // Update condition state based on health
    this.updateConditionState();
    this.markModified();

    return amount - remainingDamage;
  }

  /**
   * Get hitpoints for a specific section
   * @param direction - The section to query
   * @returns Object with shield and armor hitpoints
   */
  getHitpointsBySection(
    direction: DamageDirection
  ): { shield: number; shieldMax: number; armor: number; armorMax: number } {
    const stats = this.getStats();
    const armorSlot = getArmorSlotForDirection(direction);
    const armorMount = this.componentSlots.get(armorSlot);

    const isFront =
      direction === DamageDirection.FRONT ||
      direction === DamageDirection.LEFT ||
      direction === DamageDirection.RIGHT;

    return {
      shield: isFront ? this.shieldFrontCurrent : this.shieldBackCurrent,
      shieldMax: isFront ? stats.shieldFrontMax : stats.shieldBackMax,
      armor: armorMount?.hitpoints ?? 0,
      armorMax: armorMount?.maxHitpoints ?? 0,
    };
  }

  /**
   * Update condition state based on current health
   */
  private updateConditionState(): void {
    const healthPercent = this.getConditionPercent();

    let newState: ShipConditionState;
    if (healthPercent <= 0) {
      newState = ShipConditionState.DESTROYED;
    } else if (healthPercent < 0.25) {
      newState = ShipConditionState.DISABLED;
    } else if (healthPercent < 0.75) {
      newState = ShipConditionState.DAMAGED;
    } else {
      newState = ShipConditionState.OPERATIONAL;
    }

    if (this.conditionState !== newState) {
      this.conditionState = newState;
      this.deltaTrackerShip3.trackChange(ShipProperty.CONDITION_STATE, DeltaType.Change);
    }
  }

  // ============================================
  // Movement Control
  // ============================================

  /**
   * Set the throttle position
   * @param throttle - Throttle value (0.0 - 1.0)
   */
  setThrottle(throttle: number): void {
    const newThrottle = Math.max(0, Math.min(throttle, 1.0));
    if (this.throttlePosition !== newThrottle) {
      this.throttlePosition = newThrottle;
      this.deltaTrackerShip3.trackChange(ShipProperty.THROTTLE_POSITION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the current speed
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Update current speed based on throttle and stats
   * Should be called during physics updates
   */
  updateSpeed(deltaTime: number): void {
    const stats = this.getStats();
    const targetSpeed = stats.maxSpeed * this.throttlePosition;

    // Apply booster if active
    let effectiveMaxSpeed = stats.maxSpeed;
    let effectiveAcceleration = stats.acceleration;

    if (this.boosterActive && this.boosterCurrent > 0) {
      effectiveMaxSpeed *= stats.boosterSpeedMultiplier;
      effectiveAcceleration *= stats.boosterAccelerationMultiplier;

      // Consume booster energy
      this.boosterCurrent = Math.max(
        0,
        this.boosterCurrent - stats.boosterConsumptionRate * deltaTime
      );
      this.deltaTrackerShip3.trackChange(ShipProperty.BOOSTER_CURRENT, DeltaType.Change);

      if (this.boosterCurrent <= 0) {
        this.boosterActive = false;
      }
    }

    const adjustedTarget = Math.min(
      targetSpeed * (this.boosterActive ? stats.boosterSpeedMultiplier : 1),
      effectiveMaxSpeed
    );

    // Accelerate or decelerate toward target
    if (this.currentSpeed < adjustedTarget) {
      this.currentSpeed = Math.min(
        adjustedTarget,
        this.currentSpeed + effectiveAcceleration * deltaTime
      );
    } else if (this.currentSpeed > adjustedTarget) {
      this.currentSpeed = Math.max(
        adjustedTarget,
        this.currentSpeed - stats.deceleration * deltaTime
      );
    }

    this.deltaTrackerShip3.trackChange(ShipProperty.CURRENT_SPEED, DeltaType.Change);
  }

  /**
   * Activate the booster
   * @returns true if booster was activated
   */
  activateBooster(): boolean {
    if (this.boosterCurrent <= 0) {
      return false;
    }
    if (!this.hasComponent(ShipComponentSlot.BOOSTER)) {
      return false;
    }
    this.boosterActive = true;
    return true;
  }

  /**
   * Deactivate the booster
   */
  deactivateBooster(): void {
    this.boosterActive = false;
  }

  // ============================================
  // Crew Management
  // ============================================

  /**
   * Set the pilot
   */
  setPilot(pilotId: ObjectId): void {
    if (this.pilotId !== pilotId) {
      this.pilotId = pilotId;
      this.deltaTrackerShip6.trackChange(ShipProperty.PILOT_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Add a gunner
   */
  addGunner(gunnerId: ObjectId): boolean {
    if (this.gunnerIds.includes(gunnerId)) {
      return false;
    }
    this.gunnerIds.push(gunnerId);
    this.deltaTrackerShip6.trackListAdd(
      ShipProperty.GUNNER_IDS,
      this.gunnerIds.length - 1,
      gunnerId
    );
    this.markModified();
    return true;
  }

  /**
   * Remove a gunner
   */
  removeGunner(gunnerId: ObjectId): boolean {
    const index = this.gunnerIds.indexOf(gunnerId);
    if (index === -1) {
      return false;
    }
    this.gunnerIds.splice(index, 1);
    this.deltaTrackerShip6.trackListRemove(ShipProperty.GUNNER_IDS, index, gunnerId);
    this.markModified();
    return true;
  }

  /**
   * Add a passenger
   */
  addPassenger(passengerId: ObjectId): boolean {
    if (this.passengerIds.includes(passengerId)) {
      return false;
    }
    this.passengerIds.push(passengerId);
    this.deltaTrackerShip6.trackListAdd(
      ShipProperty.PASSENGER_IDS,
      this.passengerIds.length - 1,
      passengerId
    );
    this.markModified();
    return true;
  }

  /**
   * Remove a passenger
   */
  removePassenger(passengerId: ObjectId): boolean {
    const index = this.passengerIds.indexOf(passengerId);
    if (index === -1) {
      return false;
    }
    this.passengerIds.splice(index, 1);
    this.deltaTrackerShip6.trackListRemove(ShipProperty.PASSENGER_IDS, index, passengerId);
    this.markModified();
    return true;
  }

  /**
   * Check if the ship has a pilot
   */
  hasPilot(): boolean {
    return this.pilotId !== 0n;
  }

  /**
   * Get total crew count
   */
  getCrewCount(): number {
    return (this.pilotId !== 0n ? 1 : 0) + this.gunnerIds.length + this.passengerIds.length;
  }

  // ============================================
  // Combat Targeting
  // ============================================

  /**
   * Set the current target
   */
  setTarget(targetId: ObjectId): void {
    if (this.targetId !== targetId) {
      this.targetId = targetId;
      this.deltaTrackerShip6.trackChange(ShipProperty.TARGET_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Clear the current target
   */
  clearTarget(): void {
    this.setTarget(0n);
  }

  /**
   * Check if ship has a target
   */
  hasTarget(): boolean {
    return this.targetId !== 0n;
  }

  // ============================================
  // Energy and Shield Regeneration
  // ============================================

  /**
   * Regenerate shields and capacitor
   * Should be called during game ticks
   */
  regenerate(deltaTime: number): void {
    const stats = this.getStats();

    // Regenerate front shields
    if (this.shieldFrontCurrent < stats.shieldFrontMax) {
      this.shieldFrontCurrent = Math.min(
        stats.shieldFrontMax,
        this.shieldFrontCurrent + stats.shieldRechargeRate * deltaTime
      );
      this.deltaTrackerShip3.trackChange(ShipProperty.SHIELD_FRONT, DeltaType.Change);
    }

    // Regenerate rear shields
    if (this.shieldBackCurrent < stats.shieldBackMax) {
      this.shieldBackCurrent = Math.min(
        stats.shieldBackMax,
        this.shieldBackCurrent + stats.shieldRechargeRate * deltaTime
      );
      this.deltaTrackerShip3.trackChange(ShipProperty.SHIELD_BACK, DeltaType.Change);
    }

    // Regenerate capacitor
    if (this.capacitorCurrent < stats.capacitorEnergy) {
      this.capacitorCurrent = Math.min(
        stats.capacitorEnergy,
        this.capacitorCurrent + stats.capacitorRechargeRate * deltaTime
      );
      this.deltaTrackerShip3.trackChange(ShipProperty.CAPACITOR_CURRENT, DeltaType.Change);
    }

    // Regenerate booster (only when not active)
    if (!this.boosterActive && this.boosterCurrent < stats.boosterEnergy) {
      this.boosterCurrent = Math.min(
        stats.boosterEnergy,
        this.boosterCurrent + stats.boosterRechargeRate * deltaTime
      );
      this.deltaTrackerShip3.trackChange(ShipProperty.BOOSTER_CURRENT, DeltaType.Change);
    }
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if SHIP3 has changes
   */
  hasShip3Changes(): boolean {
    return this.deltaTrackerShip3.hasChanges();
  }

  /**
   * Check if SHIP6 has changes
   */
  hasShip6Changes(): boolean {
    return this.deltaTrackerShip6.hasChanges();
  }

  /**
   * Get SHIP3 delta tracker
   */
  getShip3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerShip3;
  }

  /**
   * Get SHIP6 delta tracker
   */
  getShip6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerShip6;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.deltaTrackerShip3.clear();
    this.deltaTrackerShip6.clear();
    this.clearDirtyFlags();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      chassisType: this.chassisType,
      shipFaction: this.shipFaction,
      shipName: this.shipName,
      conditionState: this.conditionState,
      componentSlots: Array.from(this.componentSlots.entries()).map(
        ([slot, mount]) => ({
          slot,
          mount: {
            ...mount,
            componentId: mount.componentId.toString(),
          },
        })
      ),
      weaponHardpoints: this.weaponHardpoints.map((h) => ({
        ...h,
        weaponId: h.weaponId.toString(),
      })),
      pilotId: this.pilotId.toString(),
      gunnerIds: this.gunnerIds.map((id) => id.toString()),
      passengerIds: this.passengerIds.map((id) => id.toString()),
      currentSpeed: this.currentSpeed,
      throttlePosition: this.throttlePosition,
      velocity: this.velocity,
      angularVelocity: this.angularVelocity,
      shieldFrontCurrent: this.shieldFrontCurrent,
      shieldBackCurrent: this.shieldBackCurrent,
      capacitorCurrent: this.capacitorCurrent,
      boosterCurrent: this.boosterCurrent,
      boosterActive: this.boosterActive,
      targetId: this.targetId.toString(),
      inSpaceCombat: this.inSpaceCombat,
      lastDamageTime: this.lastDamageTime,
      calculatedStats: this.calculatedStats,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new ship object
 * @param objectId - Unique object identifier
 * @param chassisType - Type of ship chassis
 * @param templateCrc - Optional template CRC
 * @returns A new ShipObject instance
 */
export function createShipObject(
  objectId: ObjectId,
  chassisType: ShipChassisType = ShipChassisType.XWING,
  templateCrc: CrcValue = 0
): ShipObject {
  const ship = new ShipObject(objectId, templateCrc);
  ship.setChassisType(chassisType);
  return ship;
}

// ============================================
// Type Guard
// ============================================

/**
 * Type guard to check if an object is a ShipObject
 */
export function isShipObject(obj: unknown): obj is ShipObject {
  return obj instanceof ShipObject;
}
