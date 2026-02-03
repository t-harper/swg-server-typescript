/**
 * Navigation Computer
 * Handles route calculation and navigation data for hyperspace travel
 *
 * The nav computer in SWG:
 * - Calculates optimal routes between zones
 * - Tracks required nav points (must be discovered/purchased)
 * - Provides travel time estimates
 * - Manages route status and readiness
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { SpaceZoneId, HyperspaceRoute } from '@swg/world/src/space/space-types.js';
import { NavComputerStatus } from './hyperspace-types.js';

// ============================================
// Nav Point Types
// ============================================

/**
 * Represents a navigation point that must be discovered
 */
export interface NavPoint {
  /** Unique identifier for the nav point */
  id: string;
  /** Display name */
  name: string;
  /** Zone this nav point is in */
  zoneId: SpaceZoneId;
  /** Position coordinates */
  position: Vector3;
  /** Whether this is a starter nav point (given to all pilots) */
  isStarter: boolean;
  /** Whether this is a hidden nav point (requires discovery) */
  isHidden: boolean;
  /** Description of the location */
  description: string;
}

/**
 * Player navigation data - tracks which nav points they have unlocked
 */
export interface PlayerNavData {
  /** Player object ID */
  playerId: ObjectId;
  /** Set of unlocked nav point IDs */
  unlockedNavPoints: Set<string>;
  /** Last time nav data was updated */
  lastUpdated: number;
}

/**
 * Calculated route information
 */
export interface CalculatedRoute {
  /** Whether route calculation succeeded */
  valid: boolean;
  /** Origin zone */
  origin: SpaceZoneId;
  /** Destination zone */
  destination: SpaceZoneId;
  /** The hyperspace route to use */
  route: HyperspaceRoute | null;
  /** Estimated travel time in milliseconds */
  estimatedTravelTime: number;
  /** Required nav points for this route */
  requiredNavPoints: string[];
  /** Missing nav points (if any) */
  missingNavPoints: string[];
  /** Error message if invalid */
  errorMessage: string;
}

/**
 * Nav computer configuration
 */
export interface NavComputerConfig {
  /** Base calculation time in milliseconds */
  baseCalculationTime: number;
  /** Minimum calculation time */
  minCalculationTime: number;
  /** Whether to require nav points for travel */
  requireNavPoints: boolean;
}

/**
 * Default nav computer configuration
 */
export const DEFAULT_NAV_COMPUTER_CONFIG: NavComputerConfig = {
  baseCalculationTime: 3000, // 3 seconds
  minCalculationTime: 1000, // 1 second
  requireNavPoints: true,
};

// ============================================
// Nav Computer Class
// ============================================

/**
 * Navigation Computer
 * Manages route calculation and navigation data for a ship
 */
export class NavComputer {
  /** Ship this nav computer belongs to */
  private readonly shipId: ObjectId;

  /** Current status of the nav computer */
  private status: NavComputerStatus;

  /** Currently set destination */
  private destination: SpaceZoneId | null;

  /** Current calculated route */
  private calculatedRoute: CalculatedRoute | null;

  /** Available routes from current zone (set by external source) */
  private availableRoutes: HyperspaceRoute[];

  /** Current zone (set by external source) */
  private currentZone: SpaceZoneId | null;

  /** Calculation start time */
  private calculationStartTime: number;

  /** Calculation duration */
  private calculationDuration: number;

  /** Configuration */
  private config: NavComputerConfig;

  /**
   * Create a new NavComputer
   * @param shipId - Ship this nav computer belongs to
   * @param config - Optional configuration overrides
   */
  constructor(shipId: ObjectId, config: Partial<NavComputerConfig> = {}) {
    this.shipId = shipId;
    this.status = NavComputerStatus.OFFLINE;
    this.destination = null;
    this.calculatedRoute = null;
    this.availableRoutes = [];
    this.currentZone = null;
    this.calculationStartTime = 0;
    this.calculationDuration = 0;
    this.config = { ...DEFAULT_NAV_COMPUTER_CONFIG, ...config };
  }

  // ============================================
  // Status Management
  // ============================================

  /**
   * Get current nav computer status
   */
  getStatus(): NavComputerStatus {
    return this.status;
  }

  /**
   * Get the route status including calculation progress
   */
  getRouteStatus(): {
    status: NavComputerStatus;
    destination: SpaceZoneId | null;
    calculationProgress: number;
    route: CalculatedRoute | null;
  } {
    let calculationProgress = 0;

    if (this.status === NavComputerStatus.CALCULATING) {
      const elapsed = Date.now() - this.calculationStartTime;
      calculationProgress = Math.min(1, elapsed / this.calculationDuration);
    } else if (this.status === NavComputerStatus.READY) {
      calculationProgress = 1;
    }

    return {
      status: this.status,
      destination: this.destination,
      calculationProgress,
      route: this.calculatedRoute,
    };
  }

  /**
   * Bring nav computer online
   */
  bringOnline(): void {
    if (this.status === NavComputerStatus.DISABLED) {
      return; // Cannot bring online if disabled by ion damage
    }
    this.status = NavComputerStatus.OFFLINE;
  }

  /**
   * Take nav computer offline
   */
  takeOffline(): void {
    this.status = NavComputerStatus.OFFLINE;
    this.clearDestination();
  }

  /**
   * Disable nav computer (e.g., from ion damage)
   */
  disable(): void {
    this.status = NavComputerStatus.DISABLED;
    this.clearDestination();
  }

  /**
   * Repair disabled nav computer
   */
  repair(): void {
    if (this.status === NavComputerStatus.DISABLED) {
      this.status = NavComputerStatus.OFFLINE;
    }
  }

  /**
   * Check if nav computer is operational
   */
  isOperational(): boolean {
    return (
      this.status !== NavComputerStatus.OFFLINE &&
      this.status !== NavComputerStatus.DISABLED
    );
  }

  // ============================================
  // Zone and Route Management
  // ============================================

  /**
   * Set the current zone and available routes
   * Called when ship enters a zone or zone data changes
   */
  setCurrentZone(zoneId: SpaceZoneId, availableRoutes: HyperspaceRoute[]): void {
    this.currentZone = zoneId;
    this.availableRoutes = [...availableRoutes];

    // Clear existing route if destination changed
    if (this.calculatedRoute && this.calculatedRoute.origin !== zoneId) {
      this.clearDestination();
    }

    // Re-enable nav computer if it was just offline
    if (this.status === NavComputerStatus.OFFLINE) {
      this.status = NavComputerStatus.READY;
    }
  }

  /**
   * Get available routes from current zone
   */
  getAvailableRoutes(): HyperspaceRoute[] {
    return [...this.availableRoutes];
  }

  /**
   * Get available routes filtered by pilot level
   */
  getAvailableRoutesForPilot(pilotLevel: number): HyperspaceRoute[] {
    return this.availableRoutes.filter(
      (route) => route.minPilotLevel <= pilotLevel
    );
  }

  // ============================================
  // Destination Management
  // ============================================

  /**
   * Set destination and begin route calculation
   * @param destinationZoneId - Target zone ID
   * @param playerNavData - Player's navigation data
   * @param pilotLevel - Pilot certification level
   * @returns Whether calculation started successfully
   */
  setDestination(
    destinationZoneId: SpaceZoneId,
    playerNavData: PlayerNavData | null,
    pilotLevel: number
  ): boolean {
    if (
      this.status === NavComputerStatus.OFFLINE ||
      this.status === NavComputerStatus.DISABLED
    ) {
      return false;
    }

    if (!this.currentZone) {
      return false;
    }

    // Clear any existing route
    this.calculatedRoute = null;
    this.destination = destinationZoneId;
    this.status = NavComputerStatus.CALCULATING;
    this.calculationStartTime = Date.now();
    this.calculationDuration = this.config.baseCalculationTime;

    // Calculate the route immediately, but don't finalize until calculation time passes
    this.preCalculateRoute(destinationZoneId, playerNavData, pilotLevel);

    return true;
  }

  /**
   * Pre-calculate route (result stored but not available until calculation completes)
   */
  private preCalculateRoute(
    destinationZoneId: SpaceZoneId,
    playerNavData: PlayerNavData | null,
    pilotLevel: number
  ): void {
    // Find route to destination
    const route = this.availableRoutes.find(
      (r) => r.destination === destinationZoneId
    );

    if (!route) {
      this.calculatedRoute = {
        valid: false,
        origin: this.currentZone!,
        destination: destinationZoneId,
        route: null,
        estimatedTravelTime: 0,
        requiredNavPoints: [],
        missingNavPoints: [],
        errorMessage: 'No route available to destination.',
      };
      return;
    }

    // Check pilot level
    if (route.minPilotLevel > pilotLevel) {
      this.calculatedRoute = {
        valid: false,
        origin: this.currentZone!,
        destination: destinationZoneId,
        route: null,
        estimatedTravelTime: 0,
        requiredNavPoints: [],
        missingNavPoints: [],
        errorMessage: `Requires pilot level ${route.minPilotLevel}.`,
      };
      return;
    }

    // Check nav points if required
    const requiredNavPoints = this.getRequiredNavPointsForRoute(route);
    let missingNavPoints: string[] = [];

    if (this.config.requireNavPoints && playerNavData) {
      missingNavPoints = requiredNavPoints.filter(
        (np) => !playerNavData.unlockedNavPoints.has(np)
      );

      if (missingNavPoints.length > 0) {
        this.calculatedRoute = {
          valid: false,
          origin: this.currentZone!,
          destination: destinationZoneId,
          route: route,
          estimatedTravelTime: route.travelTime * 1000,
          requiredNavPoints,
          missingNavPoints,
          errorMessage: 'Missing required navigation data.',
        };
        return;
      }
    }

    // Route is valid
    this.calculatedRoute = {
      valid: true,
      origin: this.currentZone!,
      destination: destinationZoneId,
      route: route,
      estimatedTravelTime: route.travelTime * 1000,
      requiredNavPoints,
      missingNavPoints: [],
      errorMessage: '',
    };
  }

  /**
   * Get required nav points for a route
   * In SWG, routes required nav points at both ends
   */
  private getRequiredNavPointsForRoute(route: HyperspaceRoute): string[] {
    const navPoints: string[] = [];

    // Add nav point IDs based on route - typically origin and destination
    navPoints.push(`nav_${route.origin}`);
    navPoints.push(`nav_${route.destination}`);

    return navPoints;
  }

  /**
   * Calculate the best route between zones
   * @param currentZone - Current zone ID
   * @param destinationZone - Destination zone ID
   * @returns The best route or null if no route exists
   */
  calculateRoute(
    currentZone: SpaceZoneId,
    destinationZone: SpaceZoneId
  ): HyperspaceRoute | null {
    // Find direct route
    const directRoute = this.availableRoutes.find(
      (r) => r.origin === currentZone && r.destination === destinationZone
    );

    if (directRoute) {
      return directRoute;
    }

    // No route found
    return null;
  }

  /**
   * Clear current destination and route
   */
  clearDestination(): void {
    this.destination = null;
    this.calculatedRoute = null;
    this.calculationStartTime = 0;

    if (
      this.status === NavComputerStatus.CALCULATING ||
      this.status === NavComputerStatus.READY
    ) {
      if (this.currentZone) {
        this.status = NavComputerStatus.READY;
      } else {
        this.status = NavComputerStatus.OFFLINE;
      }
    }
  }

  // ============================================
  // Nav Point Management
  // ============================================

  /**
   * Get required nav points for current destination
   */
  getNavPoints(): string[] {
    if (!this.calculatedRoute) {
      return [];
    }
    return [...this.calculatedRoute.requiredNavPoints];
  }

  /**
   * Check if player has required nav points for current route
   */
  hasRequiredNavPoints(playerNavData: PlayerNavData | null): boolean {
    if (!this.config.requireNavPoints) {
      return true;
    }

    if (!this.calculatedRoute) {
      return false;
    }

    if (!playerNavData) {
      return false;
    }

    return this.calculatedRoute.requiredNavPoints.every((np) =>
      playerNavData.unlockedNavPoints.has(np)
    );
  }

  /**
   * Get missing nav points for current route
   */
  getMissingNavPoints(playerNavData: PlayerNavData | null): string[] {
    if (!this.config.requireNavPoints || !this.calculatedRoute || !playerNavData) {
      return [];
    }

    return this.calculatedRoute.requiredNavPoints.filter(
      (np) => !playerNavData.unlockedNavPoints.has(np)
    );
  }

  // ============================================
  // Travel Time Estimation
  // ============================================

  /**
   * Get estimated travel time for current route
   * @returns Travel time in milliseconds, or 0 if no valid route
   */
  estimateTravelTime(): number {
    if (!this.calculatedRoute || !this.calculatedRoute.valid) {
      return 0;
    }
    return this.calculatedRoute.estimatedTravelTime;
  }

  /**
   * Calculate travel time for a route with ship speed modifier
   * @param route - The route to calculate for
   * @param shipSpeedModifier - Ship's hyperspace speed modifier (1.0 = normal)
   * @returns Travel time in milliseconds
   */
  calculateTravelTime(route: HyperspaceRoute, shipSpeedModifier: number = 1.0): number {
    // Base travel time from route (in seconds, convert to ms)
    const baseTravelTime = route.travelTime * 1000;

    // Apply ship speed modifier (higher = faster = less time)
    const modifiedTime = baseTravelTime / Math.max(0.1, shipSpeedModifier);

    return Math.floor(modifiedTime);
  }

  // ============================================
  // Update Processing
  // ============================================

  /**
   * Process nav computer update tick
   * Called periodically to update calculation status
   * @returns true if calculation just completed
   */
  update(): boolean {
    if (this.status !== NavComputerStatus.CALCULATING) {
      return false;
    }

    const elapsed = Date.now() - this.calculationStartTime;

    if (elapsed >= this.calculationDuration) {
      // Calculation complete
      this.status = NavComputerStatus.READY;
      return true;
    }

    return false;
  }

  /**
   * Get calculation time remaining in milliseconds
   */
  getCalculationTimeRemaining(): number {
    if (this.status !== NavComputerStatus.CALCULATING) {
      return 0;
    }

    const elapsed = Date.now() - this.calculationStartTime;
    return Math.max(0, this.calculationDuration - elapsed);
  }

  // ============================================
  // Route Access
  // ============================================

  /**
   * Get the current calculated route
   * Only returns route if calculation is complete
   */
  getCalculatedRoute(): CalculatedRoute | null {
    if (this.status !== NavComputerStatus.READY) {
      return null;
    }
    return this.calculatedRoute;
  }

  /**
   * Get current destination zone
   */
  getDestination(): SpaceZoneId | null {
    return this.destination;
  }

  /**
   * Check if route is ready for jump
   */
  isRouteReady(): boolean {
    return (
      this.status === NavComputerStatus.READY &&
      this.calculatedRoute !== null &&
      this.calculatedRoute.valid
    );
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  toJSON(): Record<string, unknown> {
    return {
      shipId: this.shipId.toString(),
      status: this.status,
      destination: this.destination,
      currentZone: this.currentZone,
      calculatedRoute: this.calculatedRoute
        ? {
            valid: this.calculatedRoute.valid,
            origin: this.calculatedRoute.origin,
            destination: this.calculatedRoute.destination,
            estimatedTravelTime: this.calculatedRoute.estimatedTravelTime,
            requiredNavPoints: this.calculatedRoute.requiredNavPoints,
            missingNavPoints: this.calculatedRoute.missingNavPoints,
            errorMessage: this.calculatedRoute.errorMessage,
          }
        : null,
      availableRouteCount: this.availableRoutes.length,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new NavComputer instance
 * @param shipId - Ship this nav computer belongs to
 * @param config - Optional configuration overrides
 * @returns New NavComputer instance
 */
export function createNavComputer(
  shipId: ObjectId,
  config?: Partial<NavComputerConfig>
): NavComputer {
  return new NavComputer(shipId, config);
}

// ============================================
// Player Nav Data Helpers
// ============================================

/**
 * Create new player nav data
 */
export function createPlayerNavData(playerId: ObjectId): PlayerNavData {
  return {
    playerId,
    unlockedNavPoints: new Set<string>(),
    lastUpdated: Date.now(),
  };
}

/**
 * Add a nav point to player's unlocked set
 */
export function unlockNavPoint(navData: PlayerNavData, navPointId: string): boolean {
  if (navData.unlockedNavPoints.has(navPointId)) {
    return false;
  }
  navData.unlockedNavPoints.add(navPointId);
  navData.lastUpdated = Date.now();
  return true;
}

/**
 * Check if player has a nav point
 */
export function hasNavPoint(navData: PlayerNavData, navPointId: string): boolean {
  return navData.unlockedNavPoints.has(navPointId);
}

/**
 * Get all starter nav points that should be given to new pilots
 */
export function getStarterNavPoints(): string[] {
  // These would be loaded from data files in a real implementation
  return [
    'nav_space_tatooine',
    'nav_space_naboo',
    'nav_space_corellia',
  ];
}
