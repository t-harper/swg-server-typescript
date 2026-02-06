/**
 * LootContainer - Temporary container for corpse/chest loot
 * Handles temporary loot with permission restrictions (killer/group)
 * and automatic cleanup after expiration.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { Container, ContProperty } from './container.js';
import {
  ContainerType,
  ContainerPermission,
  type TransferResult,
  TransferResultCode,
  createFailureResult,
} from './container-types.js';
import { DeltaType } from '../deltas.js';

/**
 * Loot permission mode
 */
export enum LootPermissionMode {
  /** Only the killer can loot */
  KillerOnly = 0,
  /** Killer and their group can loot */
  Group = 1,
  /** Anyone can loot (free-for-all) */
  FreeForAll = 2,
  /** Only specific player IDs can loot */
  Whitelist = 3,
}

/**
 * Loot property indices for delta tracking
 */
export const LootProperty = {
  // LOOT3 (shared)
  CORPSE_ID: 0,
  KILLER_ID: 1,
  GROUP_ID: 2,
  PERMISSION_MODE: 3,
  CREATED_AT: 4,
  EXPIRES_AT: 5,
  LOOTED: 6,
  // LOOT6 (server)
  WHITELIST: 0,
  TOTAL_CREDITS: 1,
  REMAINING_CREDITS: 2,
} as const;

/**
 * Default loot container capacity
 */
export const DEFAULT_LOOT_CAPACITY = 50;

/**
 * Default loot container volume
 */
export const DEFAULT_LOOT_VOLUME = 10000;

/**
 * Default loot duration (5 minutes)
 */
export const DEFAULT_LOOT_DURATION_MS = 5 * 60 * 1000;

/**
 * Extended duration for group loot (10 minutes)
 */
export const EXTENDED_LOOT_DURATION_MS = 10 * 60 * 1000;

/**
 * LootContainer - Temporary loot container for corpses and treasure chests
 */
export class LootContainer extends Container {
  // ============================================
  // Loot Properties
  // ============================================

  /** ID of the corpse/object this loot came from */
  protected _corpseId: ObjectId;

  /** ID of the player who killed the creature */
  protected _killerId: ObjectId;

  /** ID of the killer's group (if any) */
  protected _groupId: ObjectId;

  /** Permission mode for looting */
  protected _permissionMode: LootPermissionMode;

  /** Timestamp when the loot expires */
  protected _expiresAt: number;

  /** Whether any items have been looted */
  protected _looted: boolean;

  /** Whitelist of player IDs allowed to loot */
  protected _whitelist: Set<ObjectId>;

  /** Total credits available in the loot */
  protected _totalCredits: number;

  /** Remaining credits not yet looted */
  protected _remainingCredits: number;

  /** Callback for when the container is cleaned up */
  protected _onCleanup: ((container: LootContainer) => void) | undefined;

  /** Cleanup timer ID */
  protected _cleanupTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Create a new LootContainer
   * @param objectId - Unique 64-bit identifier
   * @param corpseId - ID of the corpse/object this loot came from
   * @param killerId - ID of the player who killed the creature
   * @param containerType - Type of loot container (Corpse or TreasureChest)
   */
  constructor(
    objectId: ObjectId,
    corpseId: ObjectId,
    killerId: ObjectId,
    containerType: ContainerType = ContainerType.Corpse
  ) {
    super(objectId, 0, containerType);

    this._corpseId = corpseId;
    this._killerId = killerId;
    this._groupId = 0n;
    this._permissionMode = LootPermissionMode.KillerOnly;

    const now = Date.now();
    this.createdAt = now;
    this._expiresAt = now + DEFAULT_LOOT_DURATION_MS;

    this._looted = false;
    this._whitelist = new Set();

    this._totalCredits = 0;
    this._remainingCredits = 0;

    // Set default capacity
    this.setMaxCapacity(DEFAULT_LOOT_CAPACITY);
    this.setMaxVolume(DEFAULT_LOOT_VOLUME);

    // Set owner to killer
    this.setContainerOwner(killerId);
    this.setPermissions(ContainerPermission.Owner);
  }

  /**
   * Get baseline type for loot objects
   */
  override getBaselineType(): string {
    return 'LOOT';
  }

  // ============================================
  // Getters
  // ============================================

  /** Get corpse ID */
  get corpseId(): ObjectId {
    return this._corpseId;
  }

  /** Get killer ID */
  get killerId(): ObjectId {
    return this._killerId;
  }

  /** Get group ID */
  get groupId(): ObjectId {
    return this._groupId;
  }

  /** Get permission mode */
  get permissionMode(): LootPermissionMode {
    return this._permissionMode;
  }

  /** Get expiration timestamp */
  get expiresAt(): number {
    return this._expiresAt;
  }

  /** Get looted flag */
  get looted(): boolean {
    return this._looted;
  }

  /** Get whitelist */
  get whitelist(): ReadonlySet<ObjectId> {
    return this._whitelist;
  }

  /** Get total credits */
  get totalCredits(): number {
    return this._totalCredits;
  }

  /** Get remaining credits */
  get remainingCredits(): number {
    return this._remainingCredits;
  }

  // ============================================
  // Permission Management
  // ============================================

  /**
   * Set the group ID for group looting
   */
  setGroupId(groupId: ObjectId): void {
    if (this._groupId !== groupId) {
      this._groupId = groupId;
      this.deltaTrackerCont3.trackChange(LootProperty.GROUP_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the permission mode
   */
  setPermissionMode(mode: LootPermissionMode): void {
    if (this._permissionMode !== mode) {
      this._permissionMode = mode;
      this.deltaTrackerCont3.trackChange(LootProperty.PERMISSION_MODE, DeltaType.Change);

      // Update base container permissions
      switch (mode) {
        case LootPermissionMode.KillerOnly:
          this.setPermissions(ContainerPermission.Owner);
          break;
        case LootPermissionMode.Group:
          this.setPermissions(ContainerPermission.Group);
          break;
        case LootPermissionMode.FreeForAll:
          this.setPermissions(ContainerPermission.Public);
          break;
        case LootPermissionMode.Whitelist:
          this.setPermissions(ContainerPermission.Owner);
          break;
      }

      this.markModified();
    }
  }

  /**
   * Add a player to the whitelist
   */
  addToWhitelist(playerId: ObjectId): void {
    if (!this._whitelist.has(playerId)) {
      this._whitelist.add(playerId);
      this.deltaTrackerCont6.trackListAdd(
        LootProperty.WHITELIST,
        this._whitelist.size - 1,
        playerId
      );
      this.markModified();
    }
  }

  /**
   * Remove a player from the whitelist
   */
  removeFromWhitelist(playerId: ObjectId): void {
    if (this._whitelist.has(playerId)) {
      this._whitelist.delete(playerId);
      this.deltaTrackerCont6.trackListRemove(LootProperty.WHITELIST, 0, playerId);
      this.markModified();
    }
  }

  /**
   * Clear the whitelist
   */
  clearWhitelist(): void {
    if (this._whitelist.size > 0) {
      this._whitelist.clear();
      this.deltaTrackerCont6.trackListClear(LootProperty.WHITELIST);
      this.markModified();
    }
  }

  /**
   * Check if a player can loot this container
   */
  canLoot(playerId: ObjectId, playerGroupId?: ObjectId): boolean {
    // Check if expired
    if (this.isExpired()) {
      return false;
    }

    switch (this._permissionMode) {
      case LootPermissionMode.KillerOnly:
        return playerId === this._killerId;

      case LootPermissionMode.Group:
        if (playerId === this._killerId) return true;
        if (this._groupId !== 0n && playerGroupId === this._groupId) return true;
        return false;

      case LootPermissionMode.FreeForAll:
        return true;

      case LootPermissionMode.Whitelist:
        return this._whitelist.has(playerId);

      default:
        return playerId === this._killerId;
    }
  }

  /**
   * Override permission check to use loot-specific logic
   */
  override hasPermission(
    actorId: ObjectId,
    actorGroupId?: ObjectId,
    _actorGuildId?: ObjectId
  ): boolean {
    return this.canLoot(actorId, actorGroupId);
  }

  // ============================================
  // Duration Management
  // ============================================

  /**
   * Set the expiration time
   */
  setExpiresAt(timestamp: number): void {
    if (this._expiresAt !== timestamp) {
      this._expiresAt = timestamp;
      this.deltaTrackerCont3.trackChange(LootProperty.EXPIRES_AT, DeltaType.Change);
      this.markModified();

      // Reset cleanup timer
      this.scheduleCleanup();
    }
  }

  /**
   * Set the duration in milliseconds
   */
  setDuration(durationMs: number): void {
    this.setExpiresAt(Date.now() + durationMs);
  }

  /**
   * Extend the duration
   */
  extendDuration(additionalMs: number): void {
    this.setExpiresAt(this._expiresAt + additionalMs);
  }

  /**
   * Get remaining time until expiration
   */
  getRemainingTime(): number {
    return Math.max(0, this._expiresAt - Date.now());
  }

  /**
   * Check if the loot has expired
   */
  isExpired(): boolean {
    return Date.now() >= this._expiresAt;
  }

  // ============================================
  // Credit Management
  // ============================================

  /**
   * Set the total credits in the loot
   */
  setTotalCredits(amount: number): void {
    const clamped = Math.max(0, amount);
    this._totalCredits = clamped;
    this._remainingCredits = clamped;
    this.deltaTrackerCont6.trackChange(LootProperty.TOTAL_CREDITS, DeltaType.Change);
    this.deltaTrackerCont6.trackChange(LootProperty.REMAINING_CREDITS, DeltaType.Change);
    this.markModified();
  }

  /**
   * Loot credits from the container
   * @returns Amount of credits looted
   */
  lootCredits(amount?: number): number {
    const toLoot = amount !== undefined ? Math.min(amount, this._remainingCredits) : this._remainingCredits;

    if (toLoot > 0) {
      this._remainingCredits -= toLoot;
      this.deltaTrackerCont6.trackChange(LootProperty.REMAINING_CREDITS, DeltaType.Change);
      this.markLooted();
    }

    return toLoot;
  }

  /**
   * Check if there are credits remaining
   */
  hasCredits(): boolean {
    return this._remainingCredits > 0;
  }

  // ============================================
  // Loot Tracking
  // ============================================

  /**
   * Mark the container as having been looted
   */
  protected markLooted(): void {
    if (!this._looted) {
      this._looted = true;
      this.deltaTrackerCont3.trackChange(LootProperty.LOOTED, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Override removeItem to track looting
   */
  override removeItem(itemId: ObjectId): TransferResult {
    const result = super.removeItem(itemId);
    if (result.success) {
      this.markLooted();
    }
    return result;
  }

  /**
   * Check if the container has any loot remaining
   */
  hasLootRemaining(): boolean {
    return this.getCurrentCount() > 0 || this._remainingCredits > 0;
  }

  /**
   * Check if the container is empty (fully looted)
   */
  isFullyLooted(): boolean {
    return !this.hasLootRemaining();
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Set the cleanup callback
   */
  setOnCleanup(callback: (container: LootContainer) => void): void {
    this._onCleanup = callback;
  }

  /**
   * Schedule automatic cleanup
   */
  scheduleCleanup(): void {
    // Clear existing timer
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer);
      this._cleanupTimer = undefined;
    }

    const remainingTime = this.getRemainingTime();
    if (remainingTime > 0) {
      this._cleanupTimer = setTimeout(() => {
        this.performCleanup();
      }, remainingTime);
    }
  }

  /**
   * Perform cleanup (called when expired)
   */
  performCleanup(): void {
    // Clear timer reference
    this._cleanupTimer = undefined;

    // Notify callback
    if (this._onCleanup) {
      this._onCleanup(this);
    }
  }

  /**
   * Cancel scheduled cleanup
   */
  cancelCleanup(): void {
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer);
      this._cleanupTimer = undefined;
    }
  }

  /**
   * Destroy the container and cleanup resources
   */
  destroy(): void {
    this.cancelCleanup();
    this._contents.clear();
    this._whitelist.clear();
    this._onCleanup = undefined;
  }

  // ============================================
  // Static Factory Methods
  // ============================================

  /**
   * Create a loot container for a creature corpse
   */
  static createCorpseLoot(
    objectId: ObjectId,
    corpseId: ObjectId,
    killerId: ObjectId,
    groupId?: ObjectId
  ): LootContainer {
    const container = new LootContainer(
      objectId,
      corpseId,
      killerId,
      ContainerType.Corpse
    );

    if (groupId && groupId !== 0n) {
      container.setGroupId(groupId);
      container.setPermissionMode(LootPermissionMode.Group);
      container.setDuration(EXTENDED_LOOT_DURATION_MS);
    } else {
      container.setPermissionMode(LootPermissionMode.KillerOnly);
      container.setDuration(DEFAULT_LOOT_DURATION_MS);
    }

    return container;
  }

  /**
   * Create a loot container for a treasure chest
   */
  static createTreasureChest(
    objectId: ObjectId,
    chestId: ObjectId,
    discoverId: ObjectId,
    durationMs: number = DEFAULT_LOOT_DURATION_MS
  ): LootContainer {
    const container = new LootContainer(
      objectId,
      chestId,
      discoverId,
      ContainerType.TreasureChest
    );

    // Treasure chests are typically free-for-all after being discovered
    container.setPermissionMode(LootPermissionMode.FreeForAll);
    container.setDuration(durationMs);

    return container;
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
      corpseId: this._corpseId.toString(),
      killerId: this._killerId.toString(),
      groupId: this._groupId.toString(),
      permissionMode: this._permissionMode,
      createdAt: this.createdAt,
      expiresAt: this._expiresAt,
      remainingTime: this.getRemainingTime(),
      looted: this._looted,
      isExpired: this.isExpired(),
      whitelist: Array.from(this._whitelist).map((id) => id.toString()),
      totalCredits: this._totalCredits,
      remainingCredits: this._remainingCredits,
      hasLootRemaining: this.hasLootRemaining(),
    };
  }
}
