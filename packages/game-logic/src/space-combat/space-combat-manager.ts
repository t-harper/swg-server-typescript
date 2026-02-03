/**
 * Space Combat Manager
 * Core combat system for JTL space combat
 *
 * Handles:
 * - Weapon firing and damage calculation
 * - Projectile and missile tracking
 * - Target locking system
 * - Countermeasure deployment
 * - Ship destruction events
 * - Hit chance calculation with range/speed/size factors
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { ShipObject } from '@swg/objects';
import { DamageDirection } from '@swg/objects';

import {
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
  createEmptyCombatResult,
  createProjectileState,
  createMissileState,
  createCountermeasureState,
  createTargetLockInfo,
  isMissileState,
  isGuidedWeapon,
  weaponRequiresAmmo,
  distance3D,
  normalizeVector,
  dotProduct,
  calculateHitLocation,
  DEFAULT_SPACE_COMBAT_CONFIG,
} from './space-combat-types.js';

// ============================================
// Types
// ============================================

/**
 * Weapon fire result
 */
export interface WeaponFireResult {
  /** Whether the weapon fired successfully */
  success: boolean;
  /** Projectile ID if created */
  projectileId: bigint;
  /** Energy consumed */
  energyConsumed: number;
  /** Ammo consumed */
  ammoConsumed: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * Ship destruction event
 */
export interface ShipDestructionEvent {
  /** Destroyed ship ID */
  destroyedShipId: ObjectId;
  /** Ship that dealt the killing blow */
  killerShipId: ObjectId;
  /** Pilot of destroyed ship */
  destroyedPilotId: ObjectId;
  /** Pilot of killer ship */
  killerPilotId: ObjectId;
  /** Position where destruction occurred */
  position: Vector3;
  /** Zone where destruction occurred */
  zoneId: string;
  /** Timestamp of destruction */
  timestamp: number;
}

/**
 * Callback for ship destruction
 */
export type ShipDestructionCallback = (event: ShipDestructionEvent) => void;

/**
 * Callback for projectile hit
 */
export type ProjectileHitCallback = (
  projectile: ProjectileState,
  target: ShipObject,
  result: CombatResult
) => void;

// ============================================
// Space Combat Manager Class
// ============================================

/**
 * Space Combat Manager
 * Central manager for all space combat operations
 */
export class SpaceCombatManager {
  /** Configuration */
  private config: SpaceCombatConfig;

  /** Active projectiles */
  private projectiles: Map<bigint, ProjectileState> = new Map();

  /** Active missiles */
  private missiles: Map<bigint, MissileState> = new Map();

  /** Active countermeasures */
  private countermeasures: Map<bigint, CountermeasureState> = new Map();

  /** Target locks by ship (attackerShipId -> TargetLockInfo) */
  private targetLocks: Map<ObjectId, TargetLockInfo> = new Map();

  /** Ship combat stats cache */
  private shipStats: Map<ObjectId, ShipCombatStats> = new Map();

  /** Next projectile ID */
  private nextProjectileId: bigint = 1n;

  /** Ship destruction callbacks */
  private destructionCallbacks: ShipDestructionCallback[] = [];

  /** Projectile hit callbacks */
  private hitCallbacks: ProjectileHitCallback[] = [];

  /** Ships in combat (shipId -> last combat time) */
  private shipsInCombat: Map<ObjectId, number> = new Map();

  /** Combat timeout in ms */
  private combatTimeout: number = 30000;

  /**
   * Create a new Space Combat Manager
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<SpaceCombatConfig> = {}) {
    this.config = { ...DEFAULT_SPACE_COMBAT_CONFIG, ...config };
  }

  // ============================================
  // Weapon Firing
  // ============================================

  /**
   * Fire a weapon from a ship
   * @param ship - The attacking ship
   * @param weaponSlot - The weapon slot to fire
   * @param targetId - The target ship ID
   * @param weaponStats - The weapon's stats
   * @returns Weapon fire result
   */
  fireWeapon(
    ship: ShipObject,
    weaponSlot: number,
    targetId: ObjectId,
    weaponStats: SpaceWeaponStats
  ): WeaponFireResult {
    const result: WeaponFireResult = {
      success: false,
      projectileId: 0n,
      energyConsumed: 0,
      ammoConsumed: 0,
      errorMessage: '',
    };

    // Check if ship has enough energy
    if (ship.capacitorCurrent < weaponStats.energyCost) {
      result.errorMessage = 'Insufficient capacitor energy';
      return result;
    }

    // Check ammo for ammo-based weapons
    if (weaponRequiresAmmo(weaponStats.type) && weaponStats.ammoCount <= 0) {
      result.errorMessage = 'Out of ammunition';
      return result;
    }

    // Consume energy
    ship.capacitorCurrent -= weaponStats.energyCost;
    result.energyConsumed = weaponStats.energyCost;

    // Consume ammo if needed
    if (weaponRequiresAmmo(weaponStats.type)) {
      result.ammoConsumed = 1;
    }

    // Create projectile
    const projectileId = this.nextProjectileId++;
    const targetPosition = this.getTargetPosition(targetId);

    // Calculate velocity direction toward target
    const direction = targetPosition
      ? normalizeVector({
          x: targetPosition.x - ship.position.x,
          y: targetPosition.y - ship.position.y,
          z: targetPosition.z - ship.position.z,
        })
      : { x: 0, y: 0, z: 1 };

    const velocity: Vector3 = {
      x: direction.x * weaponStats.projectileSpeed,
      y: direction.y * weaponStats.projectileSpeed,
      z: direction.z * weaponStats.projectileSpeed,
    };

    // Calculate damage
    const damage =
      weaponStats.minDamage +
      Math.random() * (weaponStats.maxDamage - weaponStats.minDamage);

    // Calculate max travel time based on range
    const maxTravelTime = (weaponStats.maxRange / weaponStats.projectileSpeed) * 1000;

    // Create projectile or missile based on weapon type
    if (isGuidedWeapon(weaponStats.type)) {
      const missile = createMissileState(
        projectileId,
        ship.objectId,
        weaponSlot,
        { ...ship.position },
        velocity,
        targetId,
        damage,
        weaponStats.trackingStrength
      );
      this.missiles.set(projectileId, missile);
    } else {
      const projectile = createProjectileState(
        projectileId,
        ship.objectId,
        weaponSlot,
        { ...ship.position },
        velocity,
        targetId,
        weaponStats.type,
        damage,
        weaponStats.damageType,
        maxTravelTime
      );
      this.projectiles.set(projectileId, projectile);
    }

    // Mark ships as in combat
    this.enterCombat(ship.objectId);
    this.enterCombat(targetId);

    result.success = true;
    result.projectileId = projectileId;

    return result;
  }

  /**
   * Launch a tracking missile
   * @param ship - The attacking ship
   * @param weaponSlot - The weapon slot to fire
   * @param targetId - The target ship ID
   * @param weaponStats - The weapon's stats
   * @returns Weapon fire result
   */
  launchMissile(
    ship: ShipObject,
    weaponSlot: number,
    targetId: ObjectId,
    weaponStats: SpaceWeaponStats
  ): WeaponFireResult {
    // Check if we have a target lock
    const lock = this.targetLocks.get(ship.objectId);
    if (!lock || lock.targetId !== targetId || lock.state !== TargetLockState.LOCKED) {
      return {
        success: false,
        projectileId: 0n,
        energyConsumed: 0,
        ammoConsumed: 0,
        errorMessage: 'No target lock',
      };
    }

    // Fire using standard weapon fire
    return this.fireWeapon(ship, weaponSlot, targetId, weaponStats);
  }

  /**
   * Deploy a countermeasure
   * @param ship - The ship deploying countermeasures
   * @param ammoCount - Current countermeasure ammo
   * @param effectiveness - Countermeasure effectiveness (0-1)
   * @returns Whether deployment succeeded
   */
  deployCountermeasure(
    ship: ShipObject,
    ammoCount: number,
    effectiveness: number = 0.7
  ): boolean {
    if (ammoCount <= 0) {
      return false;
    }

    const cmId = this.nextProjectileId++;
    const countermeasure = createCountermeasureState(
      cmId,
      ship.objectId,
      { ...ship.position },
      effectiveness
    );

    this.countermeasures.set(cmId, countermeasure);
    return true;
  }

  // ============================================
  // Hit Calculation
  // ============================================

  /**
   * Calculate hit chance for an attack
   * @param attackerStats - Attacker's combat stats
   * @param targetStats - Target's combat stats
   * @param weaponStats - Weapon being used
   * @param distance - Distance to target
   * @returns Hit chance (0-1)
   */
  calculateHitChance(
    attackerStats: ShipCombatStats,
    targetStats: ShipCombatStats,
    weaponStats: SpaceWeaponStats,
    distance: number
  ): number {
    let hitChance = this.config.baseHitChance;

    // Range penalty beyond effective range
    if (distance > weaponStats.effectiveRange) {
      const rangeOverage = distance - weaponStats.effectiveRange;
      const rangePenalty = (rangeOverage / 100) * this.config.rangeHitPenalty;
      hitChance -= rangePenalty;
    }

    // Speed penalty based on target speed
    const speedPenalty = (targetStats.speed / 100) * this.config.speedHitPenalty;
    hitChance -= speedPenalty;

    // Size factor (larger ships are easier to hit)
    hitChance *= targetStats.sizeFactor;

    // Bonus for attacker's relative speed (slower attacker = more accurate)
    const relativeSpeedRatio = 1 - attackerStats.speed / (attackerStats.maxSpeed + 1);
    hitChance += relativeSpeedRatio * 0.1;

    // Clamp to valid range
    return Math.max(0.05, Math.min(0.95, hitChance));
  }

  // ============================================
  // Damage Calculation
  // ============================================

  /**
   * Calculate damage for an attack
   * @param weaponStats - Weapon being used
   * @param targetStats - Target's combat stats
   * @param hitLocation - Where on the ship the attack lands
   * @param isCritical - Whether this is a critical hit
   * @returns Combat result with damage breakdown
   */
  calculateDamage(
    weaponStats: SpaceWeaponStats,
    targetStats: ShipCombatStats,
    hitLocation: ShipHitLocation,
    isCritical: boolean
  ): CombatResult {
    const result = createEmptyCombatResult();
    result.hit = true;
    result.hitLocation = hitLocation;
    result.damageType = weaponStats.damageType;
    result.criticalHit = isCritical;

    // Calculate base damage
    let damage =
      weaponStats.minDamage +
      Math.random() * (weaponStats.maxDamage - weaponStats.minDamage);

    // Apply critical hit multiplier
    if (isCritical) {
      damage *= this.config.criticalDamageMultiplier;
    }

    result.damage = damage;

    // Determine which shield to hit
    const isFrontHit =
      hitLocation === ShipHitLocation.FRONT ||
      hitLocation === ShipHitLocation.LEFT ||
      hitLocation === ShipHitLocation.RIGHT;

    const currentShield = isFrontHit ? targetStats.shieldFront : targetStats.shieldBack;

    // Calculate shield absorption based on damage type
    let shieldAbsorption: number;
    switch (weaponStats.damageType) {
      case DamageType.ENERGY:
        shieldAbsorption = this.config.shieldEnergyAbsorption;
        break;
      case DamageType.KINETIC:
        shieldAbsorption = this.config.shieldKineticAbsorption;
        break;
      case DamageType.ION:
        shieldAbsorption = this.config.ionShieldMultiplier;
        damage *= this.config.ionShieldMultiplier; // Ion does extra to shields
        break;
      default:
        shieldAbsorption = 1.0;
    }

    // Apply damage to shields first
    let remainingDamage = damage;
    if (currentShield > 0) {
      const shieldDamage = Math.min(currentShield, remainingDamage * shieldAbsorption);
      result.shieldDamage = shieldDamage;
      remainingDamage -= shieldDamage / shieldAbsorption;
    }

    // Apply remaining damage to armor
    if (remainingDamage > 0) {
      const armorKey = this.hitLocationToArmorKey(hitLocation);
      const currentArmor = targetStats.armor[armorKey];

      if (currentArmor > 0) {
        const armorDamage = Math.min(currentArmor, remainingDamage);
        result.armorDamage = armorDamage;
        remainingDamage -= armorDamage;
      }
    }

    // Apply remaining damage to hull
    if (remainingDamage > 0) {
      result.hullDamage = remainingDamage;

      // Check for component damage on hull hits
      if (Math.random() < this.config.componentHitChance) {
        const componentDamage: ComponentDamageResult = {
          slot: Math.floor(Math.random() * 8), // Random component slot
          damage: remainingDamage * 0.5,
          destroyed: false,
          newEfficiency: 1.0,
        };
        result.componentDamage.push(componentDamage);
      }

      // Ion damage does extra to components
      if (
        weaponStats.damageType === DamageType.ION &&
        result.componentDamage.length > 0
      ) {
        for (const cd of result.componentDamage) {
          cd.damage *= this.config.ionComponentMultiplier;
        }
      }
    }

    return result;
  }

  // ============================================
  // Projectile Processing
  // ============================================

  /**
   * Process all projectiles for a time step
   * @param deltaTime - Time step in milliseconds
   * @param getShip - Function to get a ship by ID
   * @returns Array of projectiles that hit their targets
   */
  processProjectiles(
    deltaTime: number,
    getShip: (id: ObjectId) => ShipObject | undefined
  ): Array<{ projectile: ProjectileState; target: ShipObject; result: CombatResult }> {
    const hits: Array<{
      projectile: ProjectileState;
      target: ShipObject;
      result: CombatResult;
    }> = [];

    const projectilesToRemove: bigint[] = [];

    for (const [id, projectile] of this.projectiles) {
      // Update position
      const deltaSeconds = deltaTime / 1000;
      projectile.position.x += projectile.velocity.x * deltaSeconds;
      projectile.position.y += projectile.velocity.y * deltaSeconds;
      projectile.position.z += projectile.velocity.z * deltaSeconds;
      projectile.travelTime += deltaTime;

      // Check for expiration
      if (projectile.travelTime >= projectile.maxTravelTime) {
        projectilesToRemove.push(id);
        continue;
      }

      // Check for collision with target
      const target = getShip(projectile.targetId);
      if (target) {
        const distanceToTarget = distance3D(projectile.position, target.position);

        // Simple collision detection (within 50m of target center)
        if (distanceToTarget < 50) {
          const attackerShip = getShip(projectile.sourceShipId);
          const attackerStats = this.getShipCombatStats(attackerShip);
          const targetStats = this.getShipCombatStats(target);

          // Calculate hit chance
          const hitChance = this.calculateHitChance(
            attackerStats,
            targetStats,
            {
              type: projectile.weaponType,
              minDamage: projectile.damage,
              maxDamage: projectile.damage,
              projectileSpeed: Math.sqrt(
                projectile.velocity.x ** 2 +
                  projectile.velocity.y ** 2 +
                  projectile.velocity.z ** 2
              ),
              effectiveRange: 500,
              maxRange: 800,
              refireRate: 1,
              energyCost: 0,
              damageType: projectile.damageType,
              trackingStrength: 0,
              ammoCount: -1,
              maxAmmo: -1,
            },
            distanceToTarget
          );

          if (Math.random() < hitChance) {
            // Hit!
            const hitLocation = calculateHitLocation(
              projectile.position,
              target.position,
              0 // Would need ship heading
            );

            const isCritical = Math.random() < this.config.baseCriticalChance;

            const result = this.calculateDamage(
              {
                type: projectile.weaponType,
                minDamage: projectile.damage,
                maxDamage: projectile.damage,
                projectileSpeed: 0,
                effectiveRange: 0,
                maxRange: 0,
                refireRate: 0,
                energyCost: 0,
                damageType: projectile.damageType,
                trackingStrength: 0,
                ammoCount: -1,
                maxAmmo: -1,
              },
              targetStats,
              hitLocation,
              isCritical
            );

            // Apply damage to ship
            this.applyDamageToShip(target, result);

            hits.push({ projectile, target, result });

            // Notify callbacks
            for (const callback of this.hitCallbacks) {
              callback(projectile, target, result);
            }
          }

          projectilesToRemove.push(id);
        }
      }
    }

    // Remove expired/hit projectiles
    for (const id of projectilesToRemove) {
      this.projectiles.delete(id);
    }

    return hits;
  }

  /**
   * Process missile tracking for a time step
   * @param deltaTime - Time step in milliseconds
   * @param getShip - Function to get a ship by ID
   * @returns Array of missiles that hit their targets
   */
  processMissileTracking(
    deltaTime: number,
    getShip: (id: ObjectId) => ShipObject | undefined
  ): Array<{ missile: MissileState; target: ShipObject; result: CombatResult }> {
    const hits: Array<{
      missile: MissileState;
      target: ShipObject;
      result: CombatResult;
    }> = [];

    const missilesToRemove: bigint[] = [];

    for (const [id, missile] of this.missiles) {
      const deltaSeconds = deltaTime / 1000;

      // Check for countermeasure effects
      const countermeasured = this.checkCountermeasures(missile);
      if (countermeasured) {
        missilesToRemove.push(id);
        continue;
      }

      // Get target ship
      const target = getShip(missile.targetId);

      // Update tracking if target exists and missile has fuel
      if (target && missile.isTracking && missile.fuel > 0) {
        // Calculate direction to target
        const toTarget = {
          x: target.position.x - missile.position.x,
          y: target.position.y - missile.position.y,
          z: target.position.z - missile.position.z,
        };

        const distanceToTarget = Math.sqrt(
          toTarget.x ** 2 + toTarget.y ** 2 + toTarget.z ** 2
        );

        // Normalize direction to target
        const targetDir = normalizeVector(toTarget);

        // Current velocity direction
        const currentDir = normalizeVector(missile.velocity);

        // Calculate turn amount based on tracking strength and turn rate
        const maxTurn = missile.turnRate * deltaSeconds;
        const turnAmount = Math.min(maxTurn, maxTurn * missile.trackingStrength);

        // Interpolate toward target direction
        const newDir = {
          x: currentDir.x + (targetDir.x - currentDir.x) * turnAmount,
          y: currentDir.y + (targetDir.y - currentDir.y) * turnAmount,
          z: currentDir.z + (targetDir.z - currentDir.z) * turnAmount,
        };

        const normalizedNewDir = normalizeVector(newDir);

        // Update velocity
        const speed = Math.sqrt(
          missile.velocity.x ** 2 +
            missile.velocity.y ** 2 +
            missile.velocity.z ** 2
        );

        missile.velocity = {
          x: normalizedNewDir.x * speed,
          y: normalizedNewDir.y * speed,
          z: normalizedNewDir.z * speed,
        };

        // Consume fuel
        missile.fuel -= deltaTime;
        if (missile.fuel <= 0) {
          missile.isTracking = false;
        }
      }

      // Update position
      missile.position.x += missile.velocity.x * deltaSeconds;
      missile.position.y += missile.velocity.y * deltaSeconds;
      missile.position.z += missile.velocity.z * deltaSeconds;
      missile.travelTime += deltaTime;
      missile.distanceTraveled += Math.sqrt(
        (missile.velocity.x * deltaSeconds) ** 2 +
          (missile.velocity.y * deltaSeconds) ** 2 +
          (missile.velocity.z * deltaSeconds) ** 2
      );

      // Check for expiration
      if (missile.travelTime >= missile.maxTravelTime) {
        missilesToRemove.push(id);
        continue;
      }

      // Check for collision with target (only if armed)
      if (target && missile.distanceTraveled >= missile.armingDistance) {
        const distanceToTarget = distance3D(missile.position, target.position);

        // Larger collision radius for missiles
        if (distanceToTarget < 75) {
          const targetStats = this.getShipCombatStats(target);

          const hitLocation = calculateHitLocation(
            missile.position,
            target.position,
            0
          );

          const isCritical = Math.random() < this.config.baseCriticalChance;

          const result = this.calculateDamage(
            {
              type: missile.weaponType,
              minDamage: missile.damage,
              maxDamage: missile.damage,
              projectileSpeed: 0,
              effectiveRange: 0,
              maxRange: 0,
              refireRate: 0,
              energyCost: 0,
              damageType: missile.damageType,
              trackingStrength: 0,
              ammoCount: -1,
              maxAmmo: -1,
            },
            targetStats,
            hitLocation,
            isCritical
          );

          // Apply damage to ship
          this.applyDamageToShip(target, result);

          hits.push({ missile, target, result });

          // Notify callbacks
          for (const callback of this.hitCallbacks) {
            callback(missile, target, result);
          }

          missilesToRemove.push(id);
        }
      }
    }

    // Remove expired/hit missiles
    for (const id of missilesToRemove) {
      this.missiles.delete(id);
    }

    return hits;
  }

  // ============================================
  // Target Locking
  // ============================================

  /**
   * Start acquiring a target lock
   * @param attackerShipId - Ship acquiring the lock
   * @param targetId - Target to lock onto
   */
  startTargetLock(attackerShipId: ObjectId, targetId: ObjectId): void {
    const lockInfo = createTargetLockInfo(targetId, this.config.baseLockTime);
    this.targetLocks.set(attackerShipId, lockInfo);
  }

  /**
   * Update target lock progress
   * @param attackerShipId - Ship with the lock
   * @param deltaTime - Time step in ms
   */
  updateTargetLock(attackerShipId: ObjectId, deltaTime: number): void {
    const lock = this.targetLocks.get(attackerShipId);
    if (!lock) return;

    if (lock.state === TargetLockState.ACQUIRING) {
      lock.progress += deltaTime / lock.acquisitionTime;

      if (lock.progress >= 1.0) {
        lock.progress = 1.0;
        lock.state = TargetLockState.LOCKED;
      }
    } else if (lock.state === TargetLockState.LOCKED) {
      lock.lockHeldTime += deltaTime;
    }
  }

  /**
   * Break a target lock
   * @param attackerShipId - Ship with the lock to break
   */
  breakTargetLock(attackerShipId: ObjectId): void {
    this.targetLocks.delete(attackerShipId);
  }

  /**
   * Get targeting state for a ship
   * @param attackerShipId - Ship to check
   * @param targetId - Optional specific target to check
   * @returns Target lock info or undefined
   */
  getTargetingState(
    attackerShipId: ObjectId,
    targetId?: ObjectId
  ): TargetLockInfo | undefined {
    const lock = this.targetLocks.get(attackerShipId);
    if (!lock) return undefined;
    if (targetId !== undefined && lock.targetId !== targetId) return undefined;
    return lock;
  }

  // ============================================
  // Ship Destruction
  // ============================================

  /**
   * Handle ship destruction
   * @param destroyedShip - The destroyed ship
   * @param killerShipId - ID of the ship that destroyed it
   * @param zoneId - Zone where destruction occurred
   */
  handleShipDestruction(
    destroyedShip: ShipObject,
    killerShipId: ObjectId,
    zoneId: string
  ): void {
    const event: ShipDestructionEvent = {
      destroyedShipId: destroyedShip.objectId,
      killerShipId,
      destroyedPilotId: destroyedShip.pilotId,
      killerPilotId: 0n as ObjectId, // Would need to look up from killer ship
      position: { ...destroyedShip.position },
      zoneId,
      timestamp: Date.now(),
    };

    // Remove from combat
    this.shipsInCombat.delete(destroyedShip.objectId);

    // Clear any target locks involving this ship
    this.targetLocks.delete(destroyedShip.objectId);
    for (const [attackerId, lock] of this.targetLocks) {
      if (lock.targetId === destroyedShip.objectId) {
        this.targetLocks.delete(attackerId);
      }
    }

    // Notify callbacks
    for (const callback of this.destructionCallbacks) {
      callback(event);
    }
  }

  /**
   * Register a ship destruction callback
   * @param callback - Callback to register
   */
  onShipDestruction(callback: ShipDestructionCallback): void {
    this.destructionCallbacks.push(callback);
  }

  /**
   * Register a projectile hit callback
   * @param callback - Callback to register
   */
  onProjectileHit(callback: ProjectileHitCallback): void {
    this.hitCallbacks.push(callback);
  }

  // ============================================
  // Combat State
  // ============================================

  /**
   * Mark a ship as in combat
   * @param shipId - Ship to mark
   */
  enterCombat(shipId: ObjectId): void {
    this.shipsInCombat.set(shipId, Date.now());
  }

  /**
   * Check if a ship is in combat
   * @param shipId - Ship to check
   * @returns Whether the ship is in combat
   */
  isInCombat(shipId: ObjectId): boolean {
    const lastCombatTime = this.shipsInCombat.get(shipId);
    if (!lastCombatTime) return false;

    if (Date.now() - lastCombatTime > this.combatTimeout) {
      this.shipsInCombat.delete(shipId);
      return false;
    }

    return true;
  }

  /**
   * Process combat tick (call periodically)
   */
  tick(): void {
    const now = Date.now();

    // Clean up expired combat states
    for (const [shipId, lastCombatTime] of this.shipsInCombat) {
      if (now - lastCombatTime > this.combatTimeout) {
        this.shipsInCombat.delete(shipId);
      }
    }

    // Clean up expired countermeasures
    for (const [id, cm] of this.countermeasures) {
      cm.remainingDuration -= 100; // Assuming 100ms tick rate
      if (cm.remainingDuration <= 0) {
        this.countermeasures.delete(id);
      }
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get combat stats for a ship
   */
  private getShipCombatStats(ship: ShipObject | undefined): ShipCombatStats {
    if (!ship) {
      return {
        shipId: 0n as ObjectId,
        shieldFront: 0,
        shieldFrontMax: 0,
        shieldBack: 0,
        shieldBackMax: 0,
        armor: { front: 0, back: 0, left: 0, right: 0 },
        armorMax: { front: 0, back: 0, left: 0, right: 0 },
        hull: 0,
        hullMax: 0,
        capacitorEnergy: 0,
        capacitorEnergyMax: 0,
        speed: 0,
        maxSpeed: 0,
        sizeFactor: 1.0,
      };
    }

    const stats = ship.getStats();

    return {
      shipId: ship.objectId,
      shieldFront: ship.shieldFrontCurrent,
      shieldFrontMax: stats.shieldFrontMax,
      shieldBack: ship.shieldBackCurrent,
      shieldBackMax: stats.shieldBackMax,
      armor: {
        front: stats.armorFront,
        back: stats.armorBack,
        left: stats.armorLeft,
        right: stats.armorRight,
      },
      armorMax: {
        front: stats.armorFront,
        back: stats.armorBack,
        left: stats.armorLeft,
        right: stats.armorRight,
      },
      hull: ship.condition,
      hullMax: ship.maxCondition,
      capacitorEnergy: ship.capacitorCurrent,
      capacitorEnergyMax: stats.capacitorEnergy,
      speed: ship.currentSpeed,
      maxSpeed: stats.maxSpeed,
      sizeFactor: 1.0, // Would come from chassis type
    };
  }

  /**
   * Apply damage result to a ship
   */
  private applyDamageToShip(ship: ShipObject, result: CombatResult): void {
    // Convert hit location to damage direction
    const direction = this.hitLocationToDamageDirection(result.hitLocation);

    // Apply the total damage to the ship
    // The ship's applyDamage method handles shield/armor/hull distribution
    ship.applyDamage(result.damage, direction);

    // Check for destruction
    if (ship.condition <= 0) {
      // Ship is destroyed - would trigger destruction handling
    }
  }

  /**
   * Convert hit location to armor key
   */
  private hitLocationToArmorKey(
    location: ShipHitLocation
  ): 'front' | 'back' | 'left' | 'right' {
    switch (location) {
      case ShipHitLocation.FRONT:
        return 'front';
      case ShipHitLocation.BACK:
        return 'back';
      case ShipHitLocation.LEFT:
        return 'left';
      case ShipHitLocation.RIGHT:
        return 'right';
      default:
        return 'front';
    }
  }

  /**
   * Convert hit location to damage direction
   */
  private hitLocationToDamageDirection(location: ShipHitLocation): DamageDirection {
    switch (location) {
      case ShipHitLocation.FRONT:
        return DamageDirection.FRONT;
      case ShipHitLocation.BACK:
        return DamageDirection.BACK;
      case ShipHitLocation.LEFT:
        return DamageDirection.LEFT;
      case ShipHitLocation.RIGHT:
        return DamageDirection.RIGHT;
      default:
        return DamageDirection.FRONT;
    }
  }

  /**
   * Get target position (placeholder - would get from ship manager)
   */
  private getTargetPosition(targetId: ObjectId): Vector3 | undefined {
    // Would look up from ship manager
    return undefined;
  }

  /**
   * Check if a missile is affected by countermeasures
   */
  private checkCountermeasures(missile: MissileState): boolean {
    for (const [, cm] of this.countermeasures) {
      const distance = distance3D(missile.position, cm.position);

      if (distance <= cm.effectRadius) {
        // Check if missile is fooled by countermeasure
        const foolChance = cm.effectiveness * (1 - missile.countermeasureResistance);
        if (Math.random() < foolChance) {
          return true;
        }
      }
    }
    return false;
  }

  // ============================================
  // Getters
  // ============================================

  /**
   * Get all active projectiles
   */
  getProjectiles(): Map<bigint, ProjectileState> {
    return this.projectiles;
  }

  /**
   * Get all active missiles
   */
  getMissiles(): Map<bigint, MissileState> {
    return this.missiles;
  }

  /**
   * Get all active countermeasures
   */
  getCountermeasures(): Map<bigint, CountermeasureState> {
    return this.countermeasures;
  }

  /**
   * Get combat statistics
   */
  getStats(): {
    projectileCount: number;
    missileCount: number;
    countermeasureCount: number;
    shipsInCombat: number;
  } {
    return {
      projectileCount: this.projectiles.size,
      missileCount: this.missiles.size,
      countermeasureCount: this.countermeasures.size,
      shipsInCombat: this.shipsInCombat.size,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Space Combat Manager
 * @param config - Optional configuration overrides
 * @returns New Space Combat Manager instance
 */
export function createSpaceCombatManager(
  config?: Partial<SpaceCombatConfig>
): SpaceCombatManager {
  return new SpaceCombatManager(config);
}
