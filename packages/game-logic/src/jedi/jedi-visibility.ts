/**
 * Jedi Visibility Manager
 * Handles the Jedi visibility system including tracking, decay, and bounty hunter notifications
 * Part of the pre-NGE Jedi risk/reward system
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  JediVisibilityLevel,
  VisibilityThresholds,
  VisibilityEventType,
  VisibilityEventAmounts,
  VisibilityEvent,
  TefType,
  TefDurations,
  TemporaryEnemyFlag,
  JediPlayerState,
  getVisibilityLevel,
} from './jedi-types.js';

// ============================================
// Constants
// ============================================

/**
 * Visibility decay configuration
 */
export const VisibilityDecayConfig = {
  /** Base decay rate per tick (in visibility points) */
  BASE_DECAY_RATE: 5,
  /** Decay tick interval in milliseconds */
  DECAY_INTERVAL: 60 * 1000, // 1 minute
  /** Bonus decay while in player city */
  CITY_DECAY_BONUS: 2,
  /** Bonus decay while in structure */
  STRUCTURE_DECAY_BONUS: 3,
  /** Minimum time between visibility events of same type */
  EVENT_COOLDOWN: 10 * 1000, // 10 seconds
  /** Maximum visibility history to keep */
  MAX_HISTORY_SIZE: 100,
} as const;

/**
 * Bounty hunter notification thresholds
 */
export const BountyHunterConfig = {
  /** Minimum visibility to appear on bounty terminals */
  TERMINAL_THRESHOLD: VisibilityThresholds[JediVisibilityLevel.MEDIUM],
  /** Visibility level for active bounty hunter missions */
  MISSION_THRESHOLD: VisibilityThresholds[JediVisibilityLevel.HIGH],
  /** Visibility level for priority targets */
  PRIORITY_THRESHOLD: VisibilityThresholds[JediVisibilityLevel.EXPOSED],
  /** Cooldown between bounty hunter spawns in milliseconds */
  SPAWN_COOLDOWN: 15 * 60 * 1000, // 15 minutes
  /** Maximum bounty hunters that can be assigned to one target */
  MAX_ASSIGNED_HUNTERS: 3,
} as const;

// ============================================
// Types
// ============================================

/**
 * Visibility modifier based on location type
 */
export interface LocationModifier {
  /** Zone/planet name */
  zone: string;
  /** Whether player is in a city */
  inCity: boolean;
  /** Whether player is inside a structure */
  inStructure: boolean;
  /** Number of witnesses nearby */
  nearbyWitnesses: number;
}

/**
 * Result of adding a visibility event
 */
export interface AddVisibilityResult {
  /** Whether the event was recorded */
  recorded: boolean;
  /** Amount of visibility added */
  amountAdded: number;
  /** Previous visibility level */
  previousLevel: JediVisibilityLevel;
  /** New visibility level */
  newLevel: JediVisibilityLevel;
  /** Whether bounty hunters were notified */
  bountyHuntersNotified: boolean;
  /** Whether a TEF was applied */
  tefApplied: boolean;
}

/**
 * Bounty hunter notification event
 */
export interface BountyHunterNotification {
  /** Target Jedi player ID */
  targetId: ObjectId;
  /** Last known location */
  lastLocation: Vector3;
  /** Last known zone */
  lastZone: string;
  /** Current visibility level */
  visibilityLevel: JediVisibilityLevel;
  /** Priority level (1-3, 3 being highest) */
  priority: number;
  /** Timestamp of notification */
  timestamp: number;
}

/**
 * Handler for bounty hunter notifications
 */
export type BountyHunterNotificationHandler = (notification: BountyHunterNotification) => void;

/**
 * Handler for TEF events
 */
export type TefEventHandler = (
  playerId: ObjectId,
  tef: TemporaryEnemyFlag,
  applied: boolean
) => void;

// ============================================
// JediVisibilityManager Class
// ============================================

/**
 * Manages Jedi visibility tracking, decay, and bounty hunter integration
 */
export class JediVisibilityManager {
  /** Event handlers for bounty hunter notifications */
  private bountyHandlers: Set<BountyHunterNotificationHandler>;

  /** Event handlers for TEF events */
  private tefHandlers: Set<TefEventHandler>;

  /** Cooldown tracking for visibility events per player */
  private eventCooldowns: Map<ObjectId, Map<VisibilityEventType, number>>;

  /** Last bounty hunter spawn time per player */
  private lastBountySpawn: Map<ObjectId, number>;

  constructor() {
    this.bountyHandlers = new Set();
    this.tefHandlers = new Set();
    this.eventCooldowns = new Map();
    this.lastBountySpawn = new Map();
  }

  // ============================================
  // Event Registration
  // ============================================

  /**
   * Register a handler for bounty hunter notifications
   */
  onBountyHunterNotification(handler: BountyHunterNotificationHandler): void {
    this.bountyHandlers.add(handler);
  }

  /**
   * Remove a bounty hunter notification handler
   */
  offBountyHunterNotification(handler: BountyHunterNotificationHandler): void {
    this.bountyHandlers.delete(handler);
  }

  /**
   * Register a handler for TEF events
   */
  onTefEvent(handler: TefEventHandler): void {
    this.tefHandlers.add(handler);
  }

  /**
   * Remove a TEF event handler
   */
  offTefEvent(handler: TefEventHandler): void {
    this.tefHandlers.delete(handler);
  }

  // ============================================
  // Visibility Tracking
  // ============================================

  /**
   * Add a visibility event for a player
   */
  addVisibilityEvent(
    state: JediPlayerState,
    eventType: VisibilityEventType,
    location: Vector3,
    zone: string,
    locationMods?: LocationModifier
  ): AddVisibilityResult {
    const result: AddVisibilityResult = {
      recorded: false,
      amountAdded: 0,
      previousLevel: getVisibilityLevel(state.visibility),
      newLevel: getVisibilityLevel(state.visibility),
      bountyHuntersNotified: false,
      tefApplied: false,
    };

    // Check cooldown
    if (this.isOnCooldown(state.playerId, eventType)) {
      return result;
    }

    // Calculate visibility amount with modifiers
    let amount = VisibilityEventAmounts[eventType];
    amount = this.applyLocationModifiers(amount, locationMods);

    // Create the event
    const event: VisibilityEvent = {
      type: eventType,
      amount,
      timestamp: Date.now(),
      location,
      zone,
      witnessed: locationMods?.nearbyWitnesses ? locationMods.nearbyWitnesses > 0 : false,
      witnessCount: locationMods?.nearbyWitnesses ?? 0,
    };

    // Add to visibility
    state.visibility += amount;
    result.amountAdded = amount;

    // Add to history (keep limited)
    state.visibilityHistory.push(event);
    if (state.visibilityHistory.length > VisibilityDecayConfig.MAX_HISTORY_SIZE) {
      state.visibilityHistory.shift();
    }

    // Set cooldown
    this.setCooldown(state.playerId, eventType);

    // Update level
    result.newLevel = getVisibilityLevel(state.visibility);
    result.recorded = true;

    // Check for bounty hunter notification
    if (this.shouldNotifyBountyHunters(state)) {
      this.notifyBountyHunters(state, location, zone);
      result.bountyHuntersNotified = true;
    }

    // Check for TEF application
    if (this.shouldApplyTef(eventType)) {
      const tef = this.applyJediTef(state);
      if (tef) {
        result.tefApplied = true;
      }
    }

    return result;
  }

  /**
   * Record force power usage
   */
  recordForcePowerUse(
    state: JediPlayerState,
    location: Vector3,
    zone: string,
    locationMods?: LocationModifier
  ): AddVisibilityResult {
    return this.addVisibilityEvent(
      state,
      VisibilityEventType.FORCE_POWER_USE,
      location,
      zone,
      locationMods
    );
  }

  /**
   * Record lightsaber combat
   */
  recordLightsaberCombat(
    state: JediPlayerState,
    location: Vector3,
    zone: string,
    locationMods?: LocationModifier
  ): AddVisibilityResult {
    return this.addVisibilityEvent(
      state,
      VisibilityEventType.LIGHTSABER_COMBAT,
      location,
      zone,
      locationMods
    );
  }

  /**
   * Record lightsaber drawn
   */
  recordLightsaberDrawn(
    state: JediPlayerState,
    location: Vector3,
    zone: string,
    locationMods?: LocationModifier
  ): AddVisibilityResult {
    return this.addVisibilityEvent(
      state,
      VisibilityEventType.LIGHTSABER_DRAWN,
      location,
      zone,
      locationMods
    );
  }

  /**
   * Record imperial NPC kill
   */
  recordImperialKill(
    state: JediPlayerState,
    location: Vector3,
    zone: string,
    locationMods?: LocationModifier
  ): AddVisibilityResult {
    return this.addVisibilityEvent(
      state,
      VisibilityEventType.IMPERIAL_KILL,
      location,
      zone,
      locationMods
    );
  }

  // ============================================
  // Visibility Decay
  // ============================================

  /**
   * Process visibility decay for a player
   * Should be called periodically (every minute)
   */
  processVisibilityDecay(state: JediPlayerState, locationMods?: LocationModifier): number {
    const now = Date.now();
    const timeSinceLastDecay = now - state.lastVisibilityDecay;

    // Calculate number of decay ticks
    const decayTicks = Math.floor(timeSinceLastDecay / VisibilityDecayConfig.DECAY_INTERVAL);

    if (decayTicks <= 0) {
      return 0;
    }

    // Calculate decay amount
    let decayRate = VisibilityDecayConfig.BASE_DECAY_RATE;

    // Apply location bonuses
    if (locationMods?.inCity) {
      decayRate += VisibilityDecayConfig.CITY_DECAY_BONUS;
    }
    if (locationMods?.inStructure) {
      decayRate += VisibilityDecayConfig.STRUCTURE_DECAY_BONUS;
    }

    const totalDecay = decayRate * decayTicks;
    const previousVisibility = state.visibility;

    // Apply decay (minimum 0)
    state.visibility = Math.max(0, state.visibility - totalDecay);

    // Update last decay time
    state.lastVisibilityDecay = now;

    return previousVisibility - state.visibility;
  }

  /**
   * Get current visibility level
   */
  getVisibilityLevel(state: JediPlayerState): JediVisibilityLevel {
    return getVisibilityLevel(state.visibility);
  }

  /**
   * Get time until visibility drops to a lower level
   */
  getTimeToNextLevel(state: JediPlayerState): number {
    const currentLevel = getVisibilityLevel(state.visibility);

    // Find the threshold for the next lower level
    const levels = Object.values(JediVisibilityLevel);
    const currentIndex = levels.indexOf(currentLevel);

    if (currentIndex <= 0) {
      return 0; // Already at lowest
    }

    const targetLevel = levels[currentIndex - 1] as JediVisibilityLevel;
    const targetThreshold = VisibilityThresholds[targetLevel];
    const amountToDecay = state.visibility - targetThreshold;

    if (amountToDecay <= 0) {
      return 0;
    }

    // Calculate time based on decay rate
    const decaysNeeded = Math.ceil(amountToDecay / VisibilityDecayConfig.BASE_DECAY_RATE);
    return decaysNeeded * VisibilityDecayConfig.DECAY_INTERVAL;
  }

  /**
   * Clear all visibility (admin function or quest reward)
   */
  clearVisibility(state: JediPlayerState): void {
    state.visibility = 0;
    state.visibilityHistory = [];
    state.lastVisibilityDecay = Date.now();
  }

  // ============================================
  // TEF Management
  // ============================================

  /**
   * Apply a Jedi TEF to a player
   */
  applyJediTef(state: JediPlayerState): TemporaryEnemyFlag | null {
    // Check if already has active Jedi TEF
    const existingTef = state.activeTefs.find((t) => t.type === TefType.JEDI);
    const now = Date.now();

    if (existingTef && existingTef.expiresAt > now) {
      // Refresh existing TEF
      existingTef.expiresAt = now + TefDurations[TefType.JEDI];
      this.emitTefEvent(state.playerId, existingTef, false);
      return existingTef;
    }

    // Create new TEF
    const tef: TemporaryEnemyFlag = {
      type: TefType.JEDI,
      appliedAt: now,
      expiresAt: now + TefDurations[TefType.JEDI],
      sourceId: null,
      refreshable: true,
    };

    state.activeTefs.push(tef);
    this.emitTefEvent(state.playerId, tef, true);

    return tef;
  }

  /**
   * Apply a bounty hunter TEF
   */
  applyBountyHunterTef(state: JediPlayerState, hunterId: ObjectId): TemporaryEnemyFlag | null {
    const now = Date.now();

    const tef: TemporaryEnemyFlag = {
      type: TefType.BOUNTY_HUNTER,
      appliedAt: now,
      expiresAt: now + TefDurations[TefType.BOUNTY_HUNTER],
      sourceId: hunterId,
      refreshable: true,
    };

    state.activeTefs.push(tef);
    this.emitTefEvent(state.playerId, tef, true);

    return tef;
  }

  /**
   * Process TEF expiration
   */
  processExpiredTefs(state: JediPlayerState): TemporaryEnemyFlag[] {
    const now = Date.now();
    const expired: TemporaryEnemyFlag[] = [];

    state.activeTefs = state.activeTefs.filter((tef) => {
      if (tef.expiresAt <= now) {
        expired.push(tef);
        this.emitTefEvent(state.playerId, tef, false);
        return false;
      }
      return true;
    });

    return expired;
  }

  /**
   * Check if player has any active TEF
   */
  hasActiveTef(state: JediPlayerState, type?: TefType): boolean {
    const now = Date.now();

    if (type) {
      return state.activeTefs.some((t) => t.type === type && t.expiresAt > now);
    }

    return state.activeTefs.some((t) => t.expiresAt > now);
  }

  /**
   * Get remaining TEF duration
   */
  getTefTimeRemaining(state: JediPlayerState, type: TefType): number {
    const now = Date.now();
    const tef = state.activeTefs.find((t) => t.type === type && t.expiresAt > now);

    if (!tef) {
      return 0;
    }

    return tef.expiresAt - now;
  }

  /**
   * Clear all TEFs (admin or special circumstance)
   */
  clearAllTefs(state: JediPlayerState): void {
    for (const tef of state.activeTefs) {
      this.emitTefEvent(state.playerId, tef, false);
    }
    state.activeTefs = [];
  }

  // ============================================
  // Bounty Hunter Integration
  // ============================================

  /**
   * Check if bounty hunters should be notified
   */
  shouldNotifyBountyHunters(state: JediPlayerState): boolean {
    if (state.visibility < BountyHunterConfig.TERMINAL_THRESHOLD) {
      return false;
    }

    // Check spawn cooldown
    const lastSpawn = this.lastBountySpawn.get(state.playerId) ?? 0;
    const now = Date.now();

    if (now - lastSpawn < BountyHunterConfig.SPAWN_COOLDOWN) {
      return false;
    }

    return true;
  }

  /**
   * Calculate bounty priority level
   */
  getBountyPriority(state: JediPlayerState): number {
    if (state.visibility >= BountyHunterConfig.PRIORITY_THRESHOLD) {
      return 3; // Highest priority
    }
    if (state.visibility >= BountyHunterConfig.MISSION_THRESHOLD) {
      return 2; // Active mission
    }
    if (state.visibility >= BountyHunterConfig.TERMINAL_THRESHOLD) {
      return 1; // Terminal listing
    }
    return 0; // Not visible
  }

  /**
   * Check if player should appear on bounty terminals
   */
  isOnBountyTerminal(state: JediPlayerState): boolean {
    return state.visibility >= BountyHunterConfig.TERMINAL_THRESHOLD;
  }

  /**
   * Check if player qualifies for active bounty missions
   */
  isActiveTarget(state: JediPlayerState): boolean {
    return state.visibility >= BountyHunterConfig.MISSION_THRESHOLD;
  }

  // ============================================
  // Visibility History
  // ============================================

  /**
   * Get recent visibility events
   */
  getRecentEvents(state: JediPlayerState, count: number = 10): VisibilityEvent[] {
    return state.visibilityHistory.slice(-count);
  }

  /**
   * Get total visibility from a time period
   */
  getVisibilityInPeriod(state: JediPlayerState, periodMs: number): number {
    const cutoff = Date.now() - periodMs;

    return state.visibilityHistory
      .filter((e) => e.timestamp >= cutoff)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Get most frequent event type
   */
  getMostFrequentEventType(state: JediPlayerState): VisibilityEventType | null {
    if (state.visibilityHistory.length === 0) {
      return null;
    }

    const counts = new Map<VisibilityEventType, number>();

    for (const event of state.visibilityHistory) {
      const count = counts.get(event.type) ?? 0;
      counts.set(event.type, count + 1);
    }

    let maxType: VisibilityEventType | null = null;
    let maxCount = 0;

    for (const [type, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }

    return maxType;
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Check if an event type is on cooldown for a player
   */
  private isOnCooldown(playerId: ObjectId, eventType: VisibilityEventType): boolean {
    const playerCooldowns = this.eventCooldowns.get(playerId);
    if (!playerCooldowns) {
      return false;
    }

    const cooldownExpires = playerCooldowns.get(eventType);
    if (!cooldownExpires) {
      return false;
    }

    return Date.now() < cooldownExpires;
  }

  /**
   * Set cooldown for an event type
   */
  private setCooldown(playerId: ObjectId, eventType: VisibilityEventType): void {
    let playerCooldowns = this.eventCooldowns.get(playerId);
    if (!playerCooldowns) {
      playerCooldowns = new Map();
      this.eventCooldowns.set(playerId, playerCooldowns);
    }

    playerCooldowns.set(eventType, Date.now() + VisibilityDecayConfig.EVENT_COOLDOWN);
  }

  /**
   * Apply location modifiers to visibility amount
   */
  private applyLocationModifiers(baseAmount: number, locationMods?: LocationModifier): number {
    if (!locationMods) {
      return baseAmount;
    }

    let amount = baseAmount;

    // More witnesses = more visibility
    if (locationMods.nearbyWitnesses > 0) {
      amount *= 1 + locationMods.nearbyWitnesses * 0.1;
    }

    // Less visibility in structures
    if (locationMods.inStructure) {
      amount *= 0.5;
    }

    // Less visibility in player cities
    if (locationMods.inCity) {
      amount *= 0.75;
    }

    return Math.round(amount);
  }

  /**
   * Check if event type should apply a TEF
   */
  private shouldApplyTef(eventType: VisibilityEventType): boolean {
    const tefEvents: VisibilityEventType[] = [
      VisibilityEventType.FORCE_POWER_USE,
      VisibilityEventType.LIGHTSABER_COMBAT,
      VisibilityEventType.IMPERIAL_KILL,
    ];

    return tefEvents.includes(eventType);
  }

  /**
   * Notify bounty hunters of a Jedi sighting
   */
  private notifyBountyHunters(
    state: JediPlayerState,
    location: Vector3,
    zone: string
  ): void {
    const notification: BountyHunterNotification = {
      targetId: state.playerId,
      lastLocation: location,
      lastZone: zone,
      visibilityLevel: getVisibilityLevel(state.visibility),
      priority: this.getBountyPriority(state),
      timestamp: Date.now(),
    };

    // Record spawn time
    this.lastBountySpawn.set(state.playerId, Date.now());

    // Emit to all handlers
    for (const handler of this.bountyHandlers) {
      try {
        handler(notification);
      } catch (error) {
        console.error('Error in bounty hunter notification handler:', error);
      }
    }
  }

  /**
   * Emit TEF event to handlers
   */
  private emitTefEvent(
    playerId: ObjectId,
    tef: TemporaryEnemyFlag,
    applied: boolean
  ): void {
    for (const handler of this.tefHandlers) {
      try {
        handler(playerId, tef, applied);
      } catch (error) {
        console.error('Error in TEF event handler:', error);
      }
    }
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new JediVisibilityManager instance
 */
export function createJediVisibilityManager(): JediVisibilityManager {
  return new JediVisibilityManager();
}

/**
 * Calculate visibility penalty for a death
 * Returns the amount of visibility to add
 */
export function calculateDeathVisibilityPenalty(
  currentVisibility: number,
  wasKilledByBountyHunter: boolean
): number {
  // Death by bounty hunter reduces visibility (you paid the price)
  if (wasKilledByBountyHunter) {
    return -Math.floor(currentVisibility * 0.25);
  }

  // Other deaths add some visibility (people talk about Jedi deaths)
  return 50;
}

/**
 * Get visibility level description for UI
 */
export function getVisibilityLevelDescription(level: JediVisibilityLevel): string {
  switch (level) {
    case JediVisibilityLevel.HIDDEN:
      return 'Your presence in the Force is hidden from Imperial eyes.';
    case JediVisibilityLevel.LOW:
      return 'There are whispers of your activities, but nothing concrete.';
    case JediVisibilityLevel.MEDIUM:
      return 'Imperial Intelligence has taken notice of your actions.';
    case JediVisibilityLevel.HIGH:
      return 'Bounty hunters are actively searching for you.';
    case JediVisibilityLevel.EXPOSED:
      return 'You are a priority target. The Empire knows exactly who you are.';
    default:
      return 'Unknown visibility status.';
  }
}
