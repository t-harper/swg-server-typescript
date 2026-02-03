/**
 * @file crafting-session-manager.ts
 * Manager service for tracking and managing active crafting sessions
 *
 * The CraftingSessionManager provides a centralized way to create, track,
 * and manage crafting sessions across the server. It ensures that each
 * player can only have one active session at a time and handles session
 * lifecycle events.
 */

import type { ObjectId } from '@swg/shared-types';
import type { DraftSchematic } from './draft-schematic.js';
import {
  CraftingSession,
  CraftingStage,
  type LoadedIngredient,
} from './crafting-session.js';
import {
  type CraftingOperationResult,
  CraftingErrorCode,
  craftingSuccess,
  craftingError,
} from './crafting-result.js';

/**
 * Event types emitted by the session manager
 */
export enum CraftingSessionEvent {
  /** A new session was started */
  SessionStarted = 'session_started',

  /** A session was completed successfully */
  SessionCompleted = 'session_completed',

  /** A session was cancelled or failed */
  SessionEnded = 'session_ended',

  /** Session stage changed */
  StageChanged = 'stage_changed',

  /** Ingredients were modified */
  IngredientsChanged = 'ingredients_changed',

  /** Assembly was completed */
  AssemblyCompleted = 'assembly_completed',

  /** Experimentation was performed */
  ExperimentationPerformed = 'experimentation_performed',
}

/**
 * Event data for session events
 */
export interface CraftingSessionEventData {
  /** The event type */
  event: CraftingSessionEvent;

  /** The crafter's object ID */
  crafterId: ObjectId;

  /** The session ID */
  sessionId: bigint;

  /** The schematic being crafted */
  schematicId?: string;

  /** Additional event-specific data */
  data?: Record<string, unknown>;
}

/**
 * Callback type for session event listeners
 */
export type CraftingSessionEventListener = (eventData: CraftingSessionEventData) => void;

/**
 * Statistics for the session manager
 */
export interface SessionManagerStats {
  /** Number of currently active sessions */
  activeSessions: number;

  /** Total sessions created since manager started */
  totalSessionsCreated: number;

  /** Total sessions completed successfully */
  totalSessionsCompleted: number;

  /** Total sessions that failed or were cancelled */
  totalSessionsFailed: number;
}

/**
 * Options for the session manager
 */
export interface SessionManagerOptions {
  /** Maximum session duration in milliseconds (default: 30 minutes) */
  maxSessionDuration?: number;

  /** Interval for checking expired sessions in milliseconds (default: 1 minute) */
  expirationCheckInterval?: number;

  /** Whether to automatically clean up expired sessions (default: true) */
  autoCleanup?: boolean;
}

/**
 * CraftingSessionManager is a singleton service that manages all active
 * crafting sessions on the server.
 *
 * Key responsibilities:
 * - Track active sessions by crafter ID
 * - Enforce one session per crafter
 * - Handle session timeouts and cleanup
 * - Emit events for session lifecycle changes
 */
export class CraftingSessionManager {
  /** Active sessions indexed by crafter ID */
  private activeSessions: Map<string, CraftingSession>;

  /** Event listeners */
  private eventListeners: Map<CraftingSessionEvent, CraftingSessionEventListener[]>;

  /** Manager options */
  private options: Required<SessionManagerOptions>;

  /** Statistics tracking */
  private stats: SessionManagerStats;

  /** Cleanup timer handle */
  private cleanupTimer?: ReturnType<typeof setInterval>;

  /** Default options */
  private static readonly DEFAULT_OPTIONS: Required<SessionManagerOptions> = {
    maxSessionDuration: 30 * 60 * 1000, // 30 minutes
    expirationCheckInterval: 60 * 1000, // 1 minute
    autoCleanup: true,
  };

  /**
   * Creates a new CraftingSessionManager.
   *
   * @param options - Manager configuration options
   */
  constructor(options: SessionManagerOptions = {}) {
    this.activeSessions = new Map();
    this.eventListeners = new Map();
    this.options = { ...CraftingSessionManager.DEFAULT_OPTIONS, ...options };

    this.stats = {
      activeSessions: 0,
      totalSessionsCreated: 0,
      totalSessionsCompleted: 0,
      totalSessionsFailed: 0,
    };

    // Initialize event listener maps
    for (const event of Object.values(CraftingSessionEvent)) {
      this.eventListeners.set(event, []);
    }

    // Start auto-cleanup if enabled
    if (this.options.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  // ============================================
  // Session Lifecycle
  // ============================================

  /**
   * Starts a new crafting session for a crafter.
   *
   * If the crafter already has an active session, this will fail.
   * Use endSession() first to end the existing session.
   *
   * @param crafterId - Object ID of the player starting the session
   * @param schematic - The schematic to craft
   * @param tool - Object ID of the crafting tool
   * @param station - Optional object ID of a crafting station
   * @returns The new session or an error
   */
  startSession(
    crafterId: ObjectId,
    schematic: DraftSchematic,
    tool: ObjectId,
    station?: ObjectId
  ): CraftingOperationResult<CraftingSession> {
    const crafterKey = crafterId.toString();

    // Check for existing session
    if (this.activeSessions.has(crafterKey)) {
      return craftingError(
        CraftingErrorCode.InvalidSession,
        'You already have an active crafting session'
      );
    }

    // Create new session
    const session = CraftingSession.create(crafterId, schematic, tool, station);

    // Register session
    this.activeSessions.set(crafterKey, session);
    this.stats.activeSessions++;
    this.stats.totalSessionsCreated++;

    // Emit event
    this.emitEvent({
      event: CraftingSessionEvent.SessionStarted,
      crafterId,
      sessionId: session.sessionId,
      schematicId: schematic.schematicId,
    });

    return craftingSuccess(session);
  }

  /**
   * Gets the active session for a crafter.
   *
   * @param crafterId - Object ID of the crafter
   * @returns The active session or undefined
   */
  getSession(crafterId: ObjectId): CraftingSession | undefined {
    return this.activeSessions.get(crafterId.toString());
  }

  /**
   * Checks if a crafter has an active session.
   *
   * @param crafterId - Object ID of the crafter
   * @returns true if the crafter has an active session
   */
  hasActiveSession(crafterId: ObjectId): boolean {
    return this.activeSessions.has(crafterId.toString());
  }

  /**
   * Ends a crafter's session (whether complete, failed, or cancelled).
   *
   * @param crafterId - Object ID of the crafter
   * @returns The ended session's loaded ingredients (for return to player)
   */
  endSession(crafterId: ObjectId): CraftingOperationResult<Map<string, LoadedIngredient> | undefined> {
    const crafterKey = crafterId.toString();
    const session = this.activeSessions.get(crafterKey);

    if (!session) {
      return craftingError(CraftingErrorCode.InvalidSession, 'No active crafting session');
    }

    // Get ingredients to return if session is still active
    let ingredientsToReturn: Map<string, LoadedIngredient> | undefined;

    if (session.isActive()) {
      const cancelResult = session.cancel();
      if (cancelResult.success) {
        ingredientsToReturn = cancelResult.data;
      }
    }

    // Update stats
    this.stats.activeSessions--;
    if (session.stage === CraftingStage.Complete) {
      this.stats.totalSessionsCompleted++;
    } else {
      this.stats.totalSessionsFailed++;
    }

    // Remove from active sessions
    this.activeSessions.delete(crafterKey);

    // Emit event
    this.emitEvent({
      event: CraftingSessionEvent.SessionEnded,
      crafterId,
      sessionId: session.sessionId,
      schematicId: session.schematic.schematicId,
      data: {
        stage: session.stage,
        duration: session.getDuration(),
      },
    });

    return craftingSuccess(ingredientsToReturn);
  }

  /**
   * Completes a session successfully and cleans up.
   *
   * This should be called after finalize() on the session to
   * remove it from the manager and update statistics.
   *
   * @param crafterId - Object ID of the crafter
   */
  completeSession(crafterId: ObjectId): CraftingOperationResult {
    const crafterKey = crafterId.toString();
    const session = this.activeSessions.get(crafterKey);

    if (!session) {
      return craftingError(CraftingErrorCode.InvalidSession, 'No active crafting session');
    }

    if (session.stage !== CraftingStage.Complete) {
      return craftingError(
        CraftingErrorCode.InvalidStage,
        'Session has not been finalized'
      );
    }

    // Update stats
    this.stats.activeSessions--;
    this.stats.totalSessionsCompleted++;

    // Remove from active sessions
    this.activeSessions.delete(crafterKey);

    // Emit event
    this.emitEvent({
      event: CraftingSessionEvent.SessionCompleted,
      crafterId,
      sessionId: session.sessionId,
      schematicId: session.schematic.schematicId,
      data: {
        quality: session.assemblyQuality,
        duration: session.getDuration(),
        outputObjectId: session.outputObjectId?.toString(),
      },
    });

    return craftingSuccess();
  }

  // ============================================
  // Session Queries
  // ============================================

  /**
   * Gets all active sessions.
   *
   * @returns Iterator of all active sessions
   */
  getAllSessions(): IterableIterator<CraftingSession> {
    return this.activeSessions.values();
  }

  /**
   * Gets the number of active sessions.
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Gets sessions by schematic ID.
   *
   * @param schematicId - The schematic ID to search for
   * @returns Array of sessions crafting that schematic
   */
  getSessionsBySchematic(schematicId: string): CraftingSession[] {
    const results: CraftingSession[] = [];
    for (const session of this.activeSessions.values()) {
      if (session.schematic.schematicId === schematicId) {
        results.push(session);
      }
    }
    return results;
  }

  /**
   * Gets sessions in a specific stage.
   *
   * @param stage - The crafting stage to filter by
   * @returns Array of sessions in that stage
   */
  getSessionsByStage(stage: CraftingStage): CraftingSession[] {
    const results: CraftingSession[] = [];
    for (const session of this.activeSessions.values()) {
      if (session.stage === stage) {
        results.push(session);
      }
    }
    return results;
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Gets current manager statistics.
   */
  getStats(): Readonly<SessionManagerStats> {
    return { ...this.stats };
  }

  /**
   * Resets statistics (except active session count).
   */
  resetStats(): void {
    this.stats.totalSessionsCreated = 0;
    this.stats.totalSessionsCompleted = 0;
    this.stats.totalSessionsFailed = 0;
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Adds an event listener.
   *
   * @param event - The event type to listen for
   * @param listener - The callback function
   */
  addEventListener(event: CraftingSessionEvent, listener: CraftingSessionEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.push(listener);
    }
  }

  /**
   * Removes an event listener.
   *
   * @param event - The event type
   * @param listener - The callback to remove
   */
  removeEventListener(event: CraftingSessionEvent, listener: CraftingSessionEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emits an event to all listeners.
   */
  private emitEvent(eventData: CraftingSessionEventData): void {
    const listeners = this.eventListeners.get(eventData.event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(eventData);
        } catch (error) {
          // Log error but don't throw - event handlers shouldn't break the system
          console.error(`Error in crafting session event handler: ${error}`);
        }
      }
    }
  }

  // ============================================
  // Session Cleanup
  // ============================================

  /**
   * Starts the automatic cleanup timer.
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.options.expirationCheckInterval);
  }

  /**
   * Stops the automatic cleanup timer.
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Cleans up sessions that have exceeded the maximum duration.
   *
   * @returns Number of sessions cleaned up
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    const expiredCrafters: ObjectId[] = [];

    for (const session of this.activeSessions.values()) {
      if (session.getDuration() > this.options.maxSessionDuration) {
        expiredCrafters.push(session.crafterId);
      }
    }

    for (const crafterId of expiredCrafters) {
      this.endSession(crafterId);
    }

    return expiredCrafters.length;
  }

  /**
   * Force-ends all active sessions.
   *
   * Used during server shutdown to clean up all sessions.
   *
   * @returns Number of sessions ended
   */
  endAllSessions(): number {
    const crafterIds = Array.from(this.activeSessions.values()).map((s) => s.crafterId);

    for (const crafterId of crafterIds) {
      this.endSession(crafterId);
    }

    return crafterIds.length;
  }

  // ============================================
  // Shutdown
  // ============================================

  /**
   * Shuts down the session manager.
   *
   * Stops the cleanup timer and ends all active sessions.
   */
  shutdown(): void {
    this.stopCleanupTimer();
    this.endAllSessions();

    // Clear all listeners
    for (const listeners of this.eventListeners.values()) {
      listeners.length = 0;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Default singleton instance of the session manager
 */
let defaultManager: CraftingSessionManager | null = null;

/**
 * Gets or creates the default session manager instance.
 *
 * @param options - Options for the manager (only used on first call)
 * @returns The default session manager
 */
export function getCraftingSessionManager(
  options?: SessionManagerOptions
): CraftingSessionManager {
  if (!defaultManager) {
    defaultManager = new CraftingSessionManager(options);
  }
  return defaultManager;
}

/**
 * Resets the default session manager (for testing).
 *
 * This will shut down the existing manager and create a new one.
 */
export function resetCraftingSessionManager(): void {
  if (defaultManager) {
    defaultManager.shutdown();
    defaultManager = null;
  }
}
