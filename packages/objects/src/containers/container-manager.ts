/**
 * ContainerManager - Service for managing container registration and cross-container operations
 * Provides centralized tracking of containers and validation of transfers.
 */

import type { ObjectId } from '@swg/shared-types';
import { Container } from './container.js';
import {
  type TransferResult,
  TransferResultCode,
  createFailureResult,
  createSuccessResult,
  ContainerPermission,
} from './container-types.js';

/**
 * Transfer validation options
 */
export interface TransferValidationOptions {
  /** Actor performing the transfer */
  actorId?: ObjectId;
  /** Actor's group ID for group permission checks */
  actorGroupId?: ObjectId;
  /** Actor's guild ID for guild permission checks */
  actorGuildId?: ObjectId;
  /** Bypass permission checks (admin operations) */
  bypassPermissions?: boolean;
  /** Allow no-trade items to be transferred */
  allowNoTrade?: boolean;
}

/**
 * Container registration info
 */
interface ContainerRegistration {
  /** The registered container */
  container: Container;
  /** Timestamp when registered */
  registeredAt: number;
  /** Parent container ID (if nested) */
  parentContainerId?: ObjectId;
}

/**
 * Item location info
 */
interface ItemLocation {
  /** Container ID holding the item */
  containerId: ObjectId;
  /** Slot the item is in (if any) */
  slot?: string;
}

/**
 * ContainerManager - Centralized container management service
 */
export class ContainerManager {
  /** Map of container IDs to registrations */
  private containers: Map<ObjectId, ContainerRegistration>;

  /** Map of item IDs to their container locations */
  private itemLocations: Map<ObjectId, ItemLocation>;

  /** Singleton instance */
  private static instance: ContainerManager | null = null;

  /**
   * Create a new ContainerManager
   */
  constructor() {
    this.containers = new Map();
    this.itemLocations = new Map();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ContainerManager {
    if (!ContainerManager.instance) {
      ContainerManager.instance = new ContainerManager();
    }
    return ContainerManager.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    ContainerManager.instance = null;
  }

  // ============================================
  // Container Registration
  // ============================================

  /**
   * Register a container for tracking
   */
  registerContainer(container: Container, parentContainerId?: ObjectId): void {
    const registration: ContainerRegistration = {
      container,
      registeredAt: Date.now(),
      parentContainerId,
    } as void;

    this.containers.set(container.objectId, registration);

    // Track all items currently in the container
    for (const item of container.getContents()) {
      this.itemLocations.set(item.itemId, {
        containerId: container.objectId,
        slot: item.slot,
      });
    }

    // Listen for container changes
    container.addChangeListener((event) => {
      this.handleContainerChange(event);
    });
  }

  /**
   * Unregister a container from tracking
   */
  unregisterContainer(containerId: ObjectId): boolean {
    const registration = this.containers.get(containerId);
    if (!registration) {
      return false;
    }

    // Remove item locations for items in this container
    for (const item of registration.container.getContents()) {
      this.itemLocations.delete(item.itemId);
    }

    this.containers.delete(containerId);
    return true;
  }

  /**
   * Get a registered container
   */
  getContainer(containerId: ObjectId): Container | undefined {
    return this.containers.get(containerId)?.container;
  }

  /**
   * Check if a container is registered
   */
  isContainerRegistered(containerId: ObjectId): boolean {
    return this.containers.has(containerId);
  }

  /**
   * Get all registered containers
   */
  getAllContainers(): Container[] {
    return Array.from(this.containers.values()).map((r) => r.container);
  }

  /**
   * Get container count
   */
  getContainerCount(): number {
    return this.containers.size;
  }

  // ============================================
  // Item Location Tracking
  // ============================================

  /**
   * Get the container holding a specific item
   */
  getContainerForItem(itemId: ObjectId): Container | undefined {
    const location = this.itemLocations.get(itemId);
    if (!location) {
      return undefined;
    }
    return this.getContainer(location.containerId);
  }

  /**
   * Get item location info
   */
  getItemLocation(itemId: ObjectId): ItemLocation | undefined {
    return this.itemLocations.get(itemId);
  }

  /**
   * Check if an item is tracked
   */
  isItemTracked(itemId: ObjectId): boolean {
    return this.itemLocations.has(itemId);
  }

  /**
   * Handle container change events to update item tracking
   */
  private handleContainerChange(event: {
    type: number;
    containerId: ObjectId;
    itemId?: ObjectId;
    slot?: string;
    previousSlot?: string;
  }): void {
    // ContainerChangeType.ItemAdded = 0
    // ContainerChangeType.ItemRemoved = 1
    // ContainerChangeType.ItemMoved = 2

    if (event.itemId === undefined) {
      return;
    }

    switch (event.type) {
      case 0: // ItemAdded
        this.itemLocations.set(event.itemId, {
          containerId: event.containerId,
          slot: event.slot,
        });
        break;
      case 1: // ItemRemoved
        this.itemLocations.delete(event.itemId);
        break;
      case 2: // ItemMoved
        {
          const location = this.itemLocations.get(event.itemId);
          if (location) {
            location.slot = event.slot;
          }
        }
        break;
    }
  }

  // ============================================
  // Transfer Operations
  // ============================================

  /**
   * Transfer an item between containers
   */
  transferItem(
    fromContainerId: ObjectId,
    toContainerId: ObjectId,
    itemId: ObjectId,
    targetSlot?: string,
    options: TransferValidationOptions = {}
  ): TransferResult {
    // Get source container
    const sourceContainer = this.getContainer(fromContainerId);
    if (!sourceContainer) {
      return createFailureResult(
        TransferResultCode.SourceNotFound,
        'Source container not found',
        itemId,
        fromContainerId,
        toContainerId
      );
    }

    // Get target container
    const targetContainer = this.getContainer(toContainerId);
    if (!targetContainer) {
      return createFailureResult(
        TransferResultCode.TargetNotFound,
        'Target container not found',
        itemId,
        fromContainerId,
        toContainerId
      );
    }

    // Validate transfer
    const validation = this.validateTransfer(
      sourceContainer,
      targetContainer,
      itemId,
      targetSlot,
      options
    );
    if (!validation.success) {
      return validation;
    }

    // Perform the transfer
    return sourceContainer.transferTo(targetContainer, itemId, targetSlot);
  }

  /**
   * Validate a transfer between containers
   */
  validateTransfer(
    sourceContainer: Container,
    targetContainer: Container,
    itemId: ObjectId,
    targetSlot?: string,
    options: TransferValidationOptions = {}
  ): TransferResult {
    // Check if item exists in source
    const containedItem = sourceContainer.getItem(itemId);
    if (!containedItem) {
      return createFailureResult(
        TransferResultCode.ItemNotFound,
        'Item not found in source container',
        itemId,
        sourceContainer.objectId,
        targetContainer.objectId
      );
    }

    // Check source permissions
    if (!options.bypassPermissions && options.actorId !== undefined) {
      if (
        !sourceContainer.hasPermission(
          options.actorId,
          options.actorGroupId,
          options.actorGuildId
        )
      ) {
        return createFailureResult(
          TransferResultCode.PermissionDenied,
          'No permission to access source container',
          itemId,
          sourceContainer.objectId,
          targetContainer.objectId
        );
      }
    }

    // Check target permissions
    if (!options.bypassPermissions && options.actorId !== undefined) {
      if (
        !targetContainer.hasPermission(
          options.actorId,
          options.actorGroupId,
          options.actorGuildId
        )
      ) {
        return createFailureResult(
          TransferResultCode.PermissionDenied,
          'No permission to access target container',
          itemId,
          sourceContainer.objectId,
          targetContainer.objectId
        );
      }
    }

    // Check if target can accept the item
    const canAdd = targetContainer.canAddItem(
      itemId,
      containedItem.volume,
      containedItem.templateCrc,
      targetSlot
    );

    return canAdd;
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Transfer multiple items between containers
   */
  transferItems(
    fromContainerId: ObjectId,
    toContainerId: ObjectId,
    itemIds: ObjectId[],
    options: TransferValidationOptions = {}
  ): TransferResult[] {
    const results: TransferResult[] = [];

    for (const itemId of itemIds) {
      const result = this.transferItem(
        fromContainerId,
        toContainerId,
        itemId,
        undefined,
        options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Move all items from one container to another
   */
  transferAllItems(
    fromContainerId: ObjectId,
    toContainerId: ObjectId,
    options: TransferValidationOptions = {}
  ): TransferResult[] {
    const sourceContainer = this.getContainer(fromContainerId);
    if (!sourceContainer) {
      return [
        createFailureResult(
          TransferResultCode.SourceNotFound,
          'Source container not found',
          undefined,
          fromContainerId,
          toContainerId
        ),
      ];
    }

    const itemIds = sourceContainer.getItemIds();
    return this.transferItems(fromContainerId, toContainerId, itemIds, options);
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Find containers owned by a specific player
   */
  findContainersByOwner(ownerId: ObjectId): Container[] {
    const results: Container[] = [];
    for (const registration of this.containers.values()) {
      if (registration.container.containerOwnerId === ownerId) {
        results.push(registration.container);
      }
    }
    return results;
  }

  /**
   * Find containers by type
   */
  findContainersByType(containerType: number): Container[] {
    const results: Container[] = [];
    for (const registration of this.containers.values()) {
      if (registration.container.containerType === containerType) {
        results.push(registration.container);
      }
    }
    return results;
  }

  /**
   * Find all containers that have a specific item template
   */
  findContainersWithItemTemplate(templateCrc: number): Container[] {
    const results: Container[] = [];
    for (const registration of this.containers.values()) {
      const items = registration.container.findItemsByTemplate(templateCrc);
      if (items.length > 0) {
        results.push(registration.container);
      }
    }
    return results;
  }

  /**
   * Count total items across all containers for an owner
   */
  countItemsForOwner(ownerId: ObjectId): number {
    let total = 0;
    for (const registration of this.containers.values()) {
      if (registration.container.containerOwnerId === ownerId) {
        total += registration.container.getCurrentCount();
      }
    }
    return total;
  }

  /**
   * Count items of a specific template across all containers for an owner
   */
  countItemTemplateForOwner(ownerId: ObjectId, templateCrc: number): number {
    let total = 0;
    for (const registration of this.containers.values()) {
      if (registration.container.containerOwnerId === ownerId) {
        total += registration.container.countItemsByTemplate(templateCrc);
      }
    }
    return total;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get containers accessible by an actor
   */
  getAccessibleContainers(
    actorId: ObjectId,
    groupId?: ObjectId,
    guildId?: ObjectId
  ): Container[] {
    const results: Container[] = [];
    for (const registration of this.containers.values()) {
      if (registration.container.hasPermission(actorId, groupId, guildId)) {
        results.push(registration.container);
      }
    }
    return results;
  }

  /**
   * Clear all registered containers (for testing/shutdown)
   */
  clearAll(): void {
    this.containers.clear();
    this.itemLocations.clear();
  }

  /**
   * Get statistics about managed containers
   */
  getStatistics(): {
    containerCount: number;
    itemCount: number;
    containersByType: Record<number, number>;
    totalCapacity: number;
    usedCapacity: number;
  } {
    const stats = {
      containerCount: this.containers.size,
      itemCount: this.itemLocations.size,
      containersByType: {} as Record<number, number>,
      totalCapacity: 0,
      usedCapacity: 0,
    };

    for (const registration of this.containers.values()) {
      const container = registration.container;
      const type = container.containerType;

      stats.containersByType[type] = (stats.containersByType[type] ?? 0) + 1;
      stats.totalCapacity += container.maxCapacity;
      stats.usedCapacity += container.getCurrentCount();
    }

    return stats;
  }
}

/**
 * Get the global container manager instance
 */
export function getContainerManager(): ContainerManager {
  return ContainerManager.getInstance();
}
