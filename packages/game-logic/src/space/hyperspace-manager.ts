/**
 * Hyperspace Manager
 * Core manager for all hyperspace travel operations in JTL
 *
 * Handles:
 * - Jump request validation and initiation
 * - Hyperdrive charging sequence
 * - Jump execution and travel tracking
 * - Arrival processing and zone transitions
 * - Emergency exit handling
 * - Interdiction field checks
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { SpaceZoneId, HyperspaceRoute } from '@swg/world/src/space/space-types.js';

import {
  HyperspaceState,
  EmergencyExitReason,
  HyperspaceResultCode,
  type HyperspaceJump,
  type HyperspaceStatus,
  type InterdictionField,
  type HyperspaceConfig,
  type JumpRequest,
  DEFAULT_HYPERSPACE_CONFIG,
  createHyperspaceJump,
  createDefaultHyperspaceStatus,
  isInterruptibleState,
} from './hyperspace-types.js';

import {
  NavComputer,
  type PlayerNavData,
  type CalculatedRoute,
} from './nav-computer.js';

// ============================================
// Types
// ============================================

/**
 * Ship data interface required by HyperspaceManager
 */
export interface HyperspaceShipData {
  /** Ship object ID */
  shipId: ObjectId;
  /** Pilot object ID */
  pilotId: ObjectId;
  /** Current position */
  position: Vector3;
  /** Current zone */
  zoneId: SpaceZoneId;
  /** Whether ship has a hyperdrive */
  hasHyperdrive: boolean;
  /** Hyperdrive efficiency (0-1) */
  hyperdriveEfficiency: number;
  /** Current fuel */
  currentFuel: number;
  /** Maximum fuel */
  maxFuel: number;
  /** Whether ship is in combat */
  inCombat: boolean;
  /** Time since last combat (ms) */
  timeSinceCombat: number;
  /** Whether ship is docked */
  isDocked: boolean;
  /** Whether ship is disabled */
  isDisabled: boolean;
  /** Pilot certification level */
  pilotLevel: number;
}

/**
 * Zone manager interface for zone transitions
 */
export interface ZoneManagerInterface {
  /** Get available routes from a zone */
  getAvailableRoutes(zoneId: SpaceZoneId, pilotLevel: number): HyperspaceRoute[];
  /** Get route to specific destination */
  getRouteToZone(originZone: SpaceZoneId, destinationZone: SpaceZoneId): HyperspaceRoute | undefined;
  /** Transfer ship to new zone */
  transferShip(shipId: ObjectId, fromZone: SpaceZoneId, toZone: SpaceZoneId, position: Vector3): boolean;
  /** Get spawn point in zone for hyperspace arrival */
  getHyperspaceArrivalPoint(zoneId: SpaceZoneId): Vector3;
}

/**
 * Result of a jump request
 */
export interface JumpRequestResult {
  /** Whether the request was successful */
  success: boolean;
  /** Result code */
  resultCode: HyperspaceResultCode;
  /** Error message if failed */
  errorMessage: string;
  /** Estimated charge time in ms (if charging started) */
  chargeTime: number;
  /** Estimated travel time in ms */
  travelTime: number;
}

/**
 * Result of a jump completion
 */
export interface JumpCompletionResult {
  /** Whether the jump completed successfully */
  success: boolean;
  /** Ship ID */
  shipId: ObjectId;
  /** Destination zone */
  destinationZone: SpaceZoneId;
  /** Arrival position */
  arrivalPosition: Vector3;
  /** Whether this was an emergency exit */
  emergencyExit: boolean;
  /** Emergency exit reason (if applicable) */
  emergencyReason?: EmergencyExitReason;
}

// ============================================
// Hyperspace Manager Class
// ============================================

/**
 * Hyperspace Manager
 * Central manager for all hyperspace travel operations
 */
export class HyperspaceManager {
  /** Active jumps by ship ID */
  private readonly activeJumps: Map<ObjectId, HyperspaceJump>;

  /** Pending jump requests by ship ID */
  private readonly pendingRequests: Map<ObjectId, JumpRequest>;

  /** Ship hyperspace states */
  private readonly shipStates: Map<ObjectId, HyperspaceState>;

  /** Cooldown timers by ship ID */
  private readonly cooldowns: Map<ObjectId, number>;

  /** Nav computers by ship ID */
  private readonly navComputers: Map<ObjectId, NavComputer>;

  /** Active interdiction fields by zone */
  private readonly interdictionFields: Map<SpaceZoneId, InterdictionField[]>;

  /** Zone manager interface */
  private zoneManager: ZoneManagerInterface | null;

  /** Configuration */
  private config: HyperspaceConfig;

  /**
   * Create a new HyperspaceManager
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<HyperspaceConfig> = {}) {
    this.activeJumps = new Map();
    this.pendingRequests = new Map();
    this.shipStates = new Map();
    this.cooldowns = new Map();
    this.navComputers = new Map();
    this.interdictionFields = new Map();
    this.zoneManager = null;
    this.config = { ...DEFAULT_HYPERSPACE_CONFIG, ...config };
  }

  /**
   * Set the zone manager interface
   */
  setZoneManager(zoneManager: ZoneManagerInterface): void {
    this.zoneManager = zoneManager;
  }

  // ============================================
  // Jump Request and Initiation
  // ============================================

  /**
   * Request a hyperspace jump
   * @param ship - Ship data
   * @param destinationZoneId - Target zone ID
   * @param playerNavData - Player's navigation data
   * @returns Jump request result
   */
  requestJump(
    ship: HyperspaceShipData,
    destinationZoneId: SpaceZoneId,
    playerNavData: PlayerNavData | null
  ): JumpRequestResult {
    // Validate ship can jump
    const validation = this.validateJumpRequest(ship, destinationZoneId);
    if (!validation.success) {
      return validation;
    }

    // Get or create nav computer
    let navComputer = this.navComputers.get(ship.shipId);
    if (!navComputer) {
      navComputer = new NavComputer(ship.shipId);
      this.navComputers.set(ship.shipId, navComputer);
    }

    // Get available routes
    if (!this.zoneManager) {
      return {
        success: false,
        resultCode: HyperspaceResultCode.SERVER_ERROR,
        errorMessage: 'Zone manager not initialized.',
        chargeTime: 0,
        travelTime: 0,
      };
    }

    const availableRoutes = this.zoneManager.getAvailableRoutes(ship.zoneId, ship.pilotLevel);
    navComputer.setCurrentZone(ship.zoneId, availableRoutes);

    // Set destination and start calculation
    if (!navComputer.setDestination(destinationZoneId, playerNavData, ship.pilotLevel)) {
      return {
        success: false,
        resultCode: HyperspaceResultCode.NAV_COMPUTER_OFFLINE,
        errorMessage: 'Navigation computer offline.',
        chargeTime: 0,
        travelTime: 0,
      };
    }

    // Force update to complete calculation for this sync path
    // In real implementation, this would be async
    navComputer.update();

    // Check calculated route
    const route = navComputer.getCalculatedRoute();
    if (!route || !route.valid) {
      return {
        success: false,
        resultCode: HyperspaceResultCode.NO_ROUTE,
        errorMessage: route?.errorMessage || 'No route available.',
        chargeTime: 0,
        travelTime: 0,
      };
    }

    // Check nav points
    if (!navComputer.hasRequiredNavPoints(playerNavData)) {
      return {
        success: false,
        resultCode: HyperspaceResultCode.MISSING_NAV_POINTS,
        errorMessage: 'Missing required navigation data.',
        chargeTime: 0,
        travelTime: 0,
      };
    }

    // Check fuel
    if (route.route && ship.currentFuel < route.route.fuelCost) {
      return {
        success: false,
        resultCode: HyperspaceResultCode.INSUFFICIENT_FUEL,
        errorMessage: `Insufficient fuel. Need ${route.route.fuelCost}, have ${ship.currentFuel}.`,
        chargeTime: 0,
        travelTime: 0,
      };
    }

    // Create jump request
    const request: JumpRequest = {
      shipId: ship.shipId,
      destinationZoneId,
      requestTime: Date.now(),
      pilotId: ship.pilotId,
    };

    this.pendingRequests.set(ship.shipId, request);

    // Calculate charge time based on hyperdrive efficiency
    const chargeTime = this.calculateChargeTime(ship.hyperdriveEfficiency);
    const travelTime = route.estimatedTravelTime;

    // Begin charging
    this.beginCharging(ship.shipId, ship, route);

    if (this.config.enableLogging) {
      console.log(
        `[HyperspaceManager] Jump requested: ${ship.shipId} -> ${destinationZoneId}, ` +
        `charge: ${chargeTime}ms, travel: ${travelTime}ms`
      );
    }

    return {
      success: true,
      resultCode: HyperspaceResultCode.SUCCESS,
      errorMessage: '',
      chargeTime,
      travelTime,
    };
  }

  /**
   * Validate a jump request
   */
  private validateJumpRequest(
    ship: HyperspaceShipData,
    destinationZoneId: SpaceZoneId
  ): JumpRequestResult {
    const failResult = (code: HyperspaceResultCode, message: string): JumpRequestResult => ({
      success: false,
      resultCode: code,
      errorMessage: message,
      chargeTime: 0,
      travelTime: 0,
    });

    // Check hyperdrive
    if (!ship.hasHyperdrive) {
      return failResult(HyperspaceResultCode.NO_HYPERDRIVE, 'No hyperdrive installed.');
    }

    if (ship.hyperdriveEfficiency <= 0) {
      return failResult(HyperspaceResultCode.HYPERDRIVE_DAMAGED, 'Hyperdrive is damaged.');
    }

    // Check ship state
    if (ship.isDisabled) {
      return failResult(HyperspaceResultCode.SHIP_DISABLED, 'Ship is disabled.');
    }

    if (ship.isDocked) {
      return failResult(HyperspaceResultCode.DOCKED, 'Cannot jump while docked.');
    }

    // Check combat state
    if (ship.inCombat || ship.timeSinceCombat < this.config.combatLockout) {
      return failResult(HyperspaceResultCode.IN_COMBAT, 'Cannot jump while in combat.');
    }

    // Check current state
    const currentState = this.shipStates.get(ship.shipId) ?? HyperspaceState.IDLE;
    if (currentState === HyperspaceState.IN_HYPERSPACE) {
      return failResult(HyperspaceResultCode.ALREADY_IN_HYPERSPACE, 'Already in hyperspace.');
    }

    if (currentState === HyperspaceState.CHARGING) {
      return failResult(HyperspaceResultCode.ALREADY_IN_HYPERSPACE, 'Jump already in progress.');
    }

    // Check cooldown
    const cooldownExpiry = this.cooldowns.get(ship.shipId) ?? 0;
    if (Date.now() < cooldownExpiry) {
      return failResult(HyperspaceResultCode.ON_COOLDOWN, 'Hyperdrive cooling down.');
    }

    // Check interdiction
    if (this.checkInterdiction(ship.position, ship.zoneId)) {
      return failResult(HyperspaceResultCode.INTERDICTED, 'Gravity well preventing jump.');
    }

    // Check destination is different
    if (ship.zoneId === destinationZoneId) {
      return failResult(HyperspaceResultCode.INVALID_DESTINATION, 'Already at destination.');
    }

    return {
      success: true,
      resultCode: HyperspaceResultCode.SUCCESS,
      errorMessage: '',
      chargeTime: 0,
      travelTime: 0,
    };
  }

  // ============================================
  // Charging Sequence
  // ============================================

  /**
   * Begin hyperdrive charging sequence
   */
  beginCharging(
    shipId: ObjectId,
    ship: HyperspaceShipData,
    route: CalculatedRoute
  ): void {
    const chargeTime = this.calculateChargeTime(ship.hyperdriveEfficiency);

    // Get arrival point
    const arrivalPosition = this.zoneManager?.getHyperspaceArrivalPoint(route.destination) ?? {
      x: 0,
      y: 0,
      z: 0,
    };

    // Create jump record
    const jump = createHyperspaceJump(
      shipId,
      ship.zoneId,
      route.destination,
      route.route!,
      ship.position,
      arrivalPosition
    );

    jump.state = HyperspaceState.CHARGING;
    jump.chargeStartTime = Date.now();

    this.activeJumps.set(shipId, jump);
    this.shipStates.set(shipId, HyperspaceState.CHARGING);

    if (this.config.enableLogging) {
      console.log(
        `[HyperspaceManager] Charging started: ${shipId}, duration: ${chargeTime}ms`
      );
    }
  }

  /**
   * Calculate charge time based on hyperdrive efficiency
   */
  private calculateChargeTime(efficiency: number): number {
    const baseTime = this.config.baseChargeTime;
    // Higher efficiency = faster charge
    const chargeTime = baseTime / Math.max(0.1, efficiency);
    return Math.max(this.config.minChargeTime, Math.floor(chargeTime));
  }

  // ============================================
  // Jump Execution
  // ============================================

  /**
   * Execute the hyperspace jump (called when charging completes)
   */
  executeJump(shipId: ObjectId): boolean {
    const jump = this.activeJumps.get(shipId);
    if (!jump || jump.state !== HyperspaceState.CHARGING) {
      return false;
    }

    const now = Date.now();

    // Calculate travel time
    const travelTime = this.calculateTravelTime(jump.route, 1.0);

    jump.state = HyperspaceState.IN_HYPERSPACE;
    jump.departureTime = now;
    jump.arrivalTime = now + travelTime;

    this.shipStates.set(shipId, HyperspaceState.IN_HYPERSPACE);

    // Remove ship from origin zone (handled by zone manager)
    // The actual removal would be done via zone manager callback

    if (this.config.enableLogging) {
      console.log(
        `[HyperspaceManager] Jump executed: ${shipId}, travel time: ${travelTime}ms`
      );
    }

    return true;
  }

  /**
   * Calculate travel time for a route
   */
  calculateTravelTime(route: HyperspaceRoute, shipSpeedModifier: number): number {
    const baseTravelTime = route.travelTime * 1000;
    const modifiedTime = baseTravelTime / Math.max(0.1, shipSpeedModifier * this.config.baseTravelSpeed);
    return Math.floor(modifiedTime);
  }

  // ============================================
  // Jump Processing
  // ============================================

  /**
   * Process all active jumps
   * Call this periodically (game tick)
   * @param deltaTime - Time since last update in ms
   * @returns Array of completed jumps
   */
  processJumps(deltaTime: number): JumpCompletionResult[] {
    const now = Date.now();
    const completedJumps: JumpCompletionResult[] = [];

    for (const [shipId, jump] of this.activeJumps) {
      switch (jump.state) {
        case HyperspaceState.CHARGING: {
          const chargeTime = this.calculateChargeTime(1.0); // Would need ship efficiency
          if (now - jump.chargeStartTime >= chargeTime) {
            this.executeJump(shipId);
          }
          break;
        }

        case HyperspaceState.IN_HYPERSPACE: {
          if (now >= jump.arrivalTime) {
            const result = this.completeJump(shipId);
            if (result) {
              completedJumps.push(result);
            }
          }
          break;
        }

        case HyperspaceState.EXITING: {
          // Brief exit state, complete after short delay
          const result = this.completeJump(shipId);
          if (result) {
            completedJumps.push(result);
          }
          break;
        }
      }
    }

    // Process cooldowns
    this.processCooldowns(now);

    return completedJumps;
  }

  /**
   * Process cooldown timers
   */
  private processCooldowns(now: number): void {
    for (const [shipId, expiry] of this.cooldowns) {
      if (now >= expiry) {
        this.cooldowns.delete(shipId);
        const state = this.shipStates.get(shipId);
        if (state === HyperspaceState.COOLDOWN) {
          this.shipStates.set(shipId, HyperspaceState.IDLE);
        }
      }
    }
  }

  // ============================================
  // Jump Completion
  // ============================================

  /**
   * Complete a hyperspace jump
   */
  completeJump(shipId: ObjectId): JumpCompletionResult | null {
    const jump = this.activeJumps.get(shipId);
    if (!jump) {
      return null;
    }

    // Transfer ship to destination zone
    if (this.zoneManager) {
      this.zoneManager.transferShip(
        shipId,
        jump.originZone,
        jump.destinationZone,
        jump.arrivalPosition
      );
    }

    // Set cooldown
    const cooldownDuration = this.config.cooldownTime;
    this.cooldowns.set(shipId, Date.now() + cooldownDuration);
    this.shipStates.set(shipId, HyperspaceState.COOLDOWN);

    // Clean up
    this.activeJumps.delete(shipId);
    this.pendingRequests.delete(shipId);

    // Update nav computer with new zone
    const navComputer = this.navComputers.get(shipId);
    if (navComputer && this.zoneManager) {
      const newRoutes = this.zoneManager.getAvailableRoutes(jump.destinationZone, 0);
      navComputer.setCurrentZone(jump.destinationZone, newRoutes);
    }

    if (this.config.enableLogging) {
      console.log(
        `[HyperspaceManager] Jump completed: ${shipId} arrived at ${jump.destinationZone}`
      );
    }

    return {
      success: true,
      shipId,
      destinationZone: jump.destinationZone,
      arrivalPosition: jump.arrivalPosition,
      emergencyExit: false,
    };
  }

  // ============================================
  // Emergency Exit
  // ============================================

  /**
   * Force an emergency exit from hyperspace
   */
  emergencyExit(shipId: ObjectId, reason: EmergencyExitReason): JumpCompletionResult | null {
    const jump = this.activeJumps.get(shipId);
    if (!jump || jump.state !== HyperspaceState.IN_HYPERSPACE) {
      return null;
    }

    // Calculate exit position based on how far along the journey
    const now = Date.now();
    const totalTravelTime = jump.arrivalTime - jump.departureTime;
    const elapsed = now - jump.departureTime;
    const progress = Math.min(1, elapsed / totalTravelTime);

    // Interpolate position (would be more complex in real implementation)
    // For emergency exit, we stay in the origin zone at a random position
    const exitPosition: Vector3 = {
      x: jump.departurePosition.x + (Math.random() - 0.5) * 10000,
      y: jump.departurePosition.y + (Math.random() - 0.5) * 10000,
      z: jump.departurePosition.z + (Math.random() - 0.5) * 5000,
    };

    // Set extended cooldown for emergency exit
    const cooldownDuration = this.config.cooldownTime * this.config.emergencyExitCooldownMultiplier;
    this.cooldowns.set(shipId, Date.now() + cooldownDuration);
    this.shipStates.set(shipId, HyperspaceState.COOLDOWN);

    // Clean up
    this.activeJumps.delete(shipId);
    this.pendingRequests.delete(shipId);

    if (this.config.enableLogging) {
      console.log(
        `[HyperspaceManager] Emergency exit: ${shipId}, reason: ${reason}, progress: ${(progress * 100).toFixed(1)}%`
      );
    }

    return {
      success: true,
      shipId,
      destinationZone: jump.originZone, // Stay in origin zone
      arrivalPosition: exitPosition,
      emergencyExit: true,
      emergencyReason: reason,
    };
  }

  // ============================================
  // Route Validation
  // ============================================

  /**
   * Validate a route for a specific ship
   */
  validateRoute(
    originZone: SpaceZoneId,
    destinationZone: SpaceZoneId,
    ship: HyperspaceShipData
  ): { valid: boolean; resultCode: HyperspaceResultCode; errorMessage: string } {
    if (!this.zoneManager) {
      return {
        valid: false,
        resultCode: HyperspaceResultCode.SERVER_ERROR,
        errorMessage: 'Zone manager not initialized.',
      };
    }

    const route = this.zoneManager.getRouteToZone(originZone, destinationZone);
    if (!route) {
      return {
        valid: false,
        resultCode: HyperspaceResultCode.NO_ROUTE,
        errorMessage: 'No route available to destination.',
      };
    }

    if (route.minPilotLevel > ship.pilotLevel) {
      return {
        valid: false,
        resultCode: HyperspaceResultCode.INSUFFICIENT_PILOT_LEVEL,
        errorMessage: `Requires pilot level ${route.minPilotLevel}.`,
      };
    }

    if (route.fuelCost > ship.currentFuel) {
      return {
        valid: false,
        resultCode: HyperspaceResultCode.INSUFFICIENT_FUEL,
        errorMessage: `Requires ${route.fuelCost} fuel.`,
      };
    }

    return {
      valid: true,
      resultCode: HyperspaceResultCode.SUCCESS,
      errorMessage: '',
    };
  }

  // ============================================
  // Interdiction System
  // ============================================

  /**
   * Check if a position is within an interdiction field
   */
  checkInterdiction(position: Vector3, zoneId: SpaceZoneId): boolean {
    const fields = this.interdictionFields.get(zoneId);
    if (!fields) {
      return false;
    }

    for (const field of fields) {
      if (!field.active) continue;

      const dx = position.x - field.position.x;
      const dy = position.y - field.position.y;
      const dz = position.z - field.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= field.radius) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add an interdiction field
   */
  addInterdictionField(field: InterdictionField): void {
    let fields = this.interdictionFields.get(field.zoneId);
    if (!fields) {
      fields = [];
      this.interdictionFields.set(field.zoneId, fields);
    }
    fields.push(field);

    if (this.config.enableLogging) {
      console.log(
        `[HyperspaceManager] Interdiction field added in ${field.zoneId} at ` +
        `(${field.position.x}, ${field.position.y}, ${field.position.z}), radius: ${field.radius}`
      );
    }
  }

  /**
   * Remove an interdiction field by source ID
   */
  removeInterdictionField(sourceId: ObjectId, zoneId: SpaceZoneId): boolean {
    const fields = this.interdictionFields.get(zoneId);
    if (!fields) {
      return false;
    }

    const index = fields.findIndex((f) => f.sourceId === sourceId);
    if (index === -1) {
      return false;
    }

    fields.splice(index, 1);
    return true;
  }

  // ============================================
  // Jump Cancellation
  // ============================================

  /**
   * Cancel a pending jump
   */
  cancelJump(shipId: ObjectId): boolean {
    const jump = this.activeJumps.get(shipId);
    if (!jump) {
      return false;
    }

    // Can only cancel during charging
    if (!isInterruptibleState(jump.state)) {
      return false;
    }

    // Clean up
    this.activeJumps.delete(shipId);
    this.pendingRequests.delete(shipId);
    this.shipStates.set(shipId, HyperspaceState.IDLE);

    // Clear nav computer destination
    const navComputer = this.navComputers.get(shipId);
    if (navComputer) {
      navComputer.clearDestination();
    }

    if (this.config.enableLogging) {
      console.log(`[HyperspaceManager] Jump cancelled: ${shipId}`);
    }

    return true;
  }

  // ============================================
  // Status Queries
  // ============================================

  /**
   * Get the current jump status for a ship
   */
  getJumpStatus(shipId: ObjectId): HyperspaceStatus {
    const status = createDefaultHyperspaceStatus();
    const jump = this.activeJumps.get(shipId);
    const state = this.shipStates.get(shipId) ?? HyperspaceState.IDLE;
    const cooldownExpiry = this.cooldowns.get(shipId) ?? 0;
    const now = Date.now();

    status.state = state;
    status.cooldownRemaining = Math.max(0, cooldownExpiry - now);

    if (jump) {
      status.destination = jump.destinationZone;

      if (state === HyperspaceState.CHARGING) {
        const chargeTime = this.calculateChargeTime(1.0);
        const elapsed = now - jump.chargeStartTime;
        status.chargeRemaining = Math.max(0, chargeTime - elapsed);
      }

      if (state === HyperspaceState.IN_HYPERSPACE) {
        status.travelTimeRemaining = Math.max(0, jump.arrivalTime - now);
      }
    }

    return status;
  }

  /**
   * Get the active jump for a ship
   */
  getActiveJump(shipId: ObjectId): HyperspaceJump | undefined {
    return this.activeJumps.get(shipId);
  }

  /**
   * Get the nav computer for a ship
   */
  getNavComputer(shipId: ObjectId): NavComputer | undefined {
    return this.navComputers.get(shipId);
  }

  /**
   * Get current hyperspace state for a ship
   */
  getHyperspaceState(shipId: ObjectId): HyperspaceState {
    return this.shipStates.get(shipId) ?? HyperspaceState.IDLE;
  }

  /**
   * Check if a ship is currently in hyperspace
   */
  isShipInHyperspace(shipId: ObjectId): boolean {
    const state = this.shipStates.get(shipId);
    return state === HyperspaceState.IN_HYPERSPACE || state === HyperspaceState.EXITING;
  }

  /**
   * Check if a ship is charging for a jump
   */
  isShipCharging(shipId: ObjectId): boolean {
    return this.shipStates.get(shipId) === HyperspaceState.CHARGING;
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up resources for a ship (e.g., when ship is destroyed)
   */
  cleanupShip(shipId: ObjectId): void {
    this.activeJumps.delete(shipId);
    this.pendingRequests.delete(shipId);
    this.shipStates.delete(shipId);
    this.cooldowns.delete(shipId);
    this.navComputers.delete(shipId);
  }

  /**
   * Get statistics about the hyperspace manager
   */
  getStats(): {
    activeJumps: number;
    pendingRequests: number;
    shipsInHyperspace: number;
    shipsCharging: number;
    interdictionFieldCount: number;
  } {
    let shipsInHyperspace = 0;
    let shipsCharging = 0;

    for (const state of this.shipStates.values()) {
      if (state === HyperspaceState.IN_HYPERSPACE) {
        shipsInHyperspace++;
      } else if (state === HyperspaceState.CHARGING) {
        shipsCharging++;
      }
    }

    let interdictionFieldCount = 0;
    for (const fields of this.interdictionFields.values()) {
      interdictionFieldCount += fields.length;
    }

    return {
      activeJumps: this.activeJumps.size,
      pendingRequests: this.pendingRequests.size,
      shipsInHyperspace,
      shipsCharging,
      interdictionFieldCount,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new HyperspaceManager instance
 * @param config - Optional configuration overrides
 * @returns New HyperspaceManager instance
 */
export function createHyperspaceManager(
  config?: Partial<HyperspaceConfig>
): HyperspaceManager {
  return new HyperspaceManager(config);
}
