/**
 * Resource Container
 * Represents a stack of resources stored in inventory, harvester, or storage
 */

import type { ObjectId } from '@swg/shared-types';
import { ResourceAttribute } from './resource-attributes.js';
import {
  ResourceInstance,
  ResourceInstanceData,
  resourceInstanceToData,
  dataToResourceInstance,
} from './resource-instance.js';

/**
 * Maximum stack size for resource containers
 */
export const MAX_RESOURCE_STACK_SIZE = 1_000_000;

/**
 * Default stack size for new containers
 */
export const DEFAULT_MAX_STACK_SIZE = 100_000;

/**
 * Represents a container holding a quantity of a specific resource
 */
export interface ResourceContainer {
  /** Unique container identifier */
  containerId: bigint;

  /** The resource instance ID this container holds */
  resourceId: bigint;

  /** Reference to the resource instance (for quick access) */
  resourceInstance: ResourceInstance;

  /** Quantity of resources in this container */
  quantity: number;

  /** Maximum quantity this container can hold */
  maxQuantity: number;

  /** Owner object ID (player, structure, etc.) */
  ownerId: ObjectId;

  /** Parent container ID (inventory, storage, etc.) */
  parentContainerId?: bigint | undefined;

  /** Last modified timestamp */
  lastModified: Date;
}

/**
 * Serializable resource container data
 */
export interface ResourceContainerData {
  containerId: string;
  resourceId: string;
  resourceInstance: ResourceInstanceData;
  quantity: number;
  maxQuantity: number;
  ownerId: string;
  parentContainerId?: string | undefined;
  lastModified: string;
}

/**
 * Convert ResourceContainer to serializable data
 */
export function resourceContainerToData(container: ResourceContainer): ResourceContainerData {
  return {
    containerId: container.containerId.toString(),
    resourceId: container.resourceId.toString(),
    resourceInstance: resourceInstanceToData(container.resourceInstance),
    quantity: container.quantity,
    maxQuantity: container.maxQuantity,
    ownerId: container.ownerId.toString(),
    parentContainerId: container.parentContainerId?.toString(),
    lastModified: container.lastModified.toISOString(),
  };
}

/**
 * Convert serializable data to ResourceContainer
 */
export function dataToResourceContainer(data: ResourceContainerData): ResourceContainer {
  return {
    containerId: BigInt(data.containerId),
    resourceId: BigInt(data.resourceId),
    resourceInstance: dataToResourceInstance(data.resourceInstance),
    quantity: data.quantity,
    maxQuantity: data.maxQuantity,
    ownerId: BigInt(data.ownerId),
    parentContainerId: data.parentContainerId ? BigInt(data.parentContainerId) : undefined,
    lastModified: new Date(data.lastModified),
  };
}

/**
 * Create a new resource container
 */
export function createResourceContainer(
  containerId: bigint,
  resourceInstance: ResourceInstance,
  ownerId: ObjectId,
  options: Partial<{
    quantity: number;
    maxQuantity: number;
    parentContainerId: bigint;
    lastModified: Date;
  }> = {}
): ResourceContainer {
  return {
    containerId,
    resourceId: resourceInstance.resourceId,
    resourceInstance,
    quantity: Math.min(options.quantity ?? 0, options.maxQuantity ?? DEFAULT_MAX_STACK_SIZE),
    maxQuantity: Math.min(options.maxQuantity ?? DEFAULT_MAX_STACK_SIZE, MAX_RESOURCE_STACK_SIZE),
    ownerId,
    parentContainerId: options.parentContainerId,
    lastModified: options.lastModified ?? new Date(),
  };
}

/**
 * Result of a resource transfer operation
 */
export interface TransferResult {
  /** Whether the transfer was successful */
  success: boolean;
  /** Amount actually transferred */
  amountTransferred: number;
  /** Amount that couldn't be transferred (overflow) */
  overflow: number;
  /** Error message if transfer failed */
  error?: string;
}

/**
 * Add resources to a container
 * @param container - The container to add to
 * @param amount - Amount to add
 * @returns Transfer result
 */
export function addToContainer(
  container: ResourceContainer,
  amount: number
): TransferResult {
  if (amount < 0) {
    return {
      success: false,
      amountTransferred: 0,
      overflow: 0,
      error: 'Cannot add negative amount',
    };
  }

  if (amount === 0) {
    return {
      success: true,
      amountTransferred: 0,
      overflow: 0,
    };
  }

  const availableSpace = container.maxQuantity - container.quantity;
  const actualAmount = Math.min(amount, availableSpace);
  const overflow = amount - actualAmount;

  container.quantity += actualAmount;
  container.lastModified = new Date();

  return {
    success: true,
    amountTransferred: actualAmount,
    overflow,
  };
}

/**
 * Remove resources from a container
 * @param container - The container to remove from
 * @param amount - Amount to remove
 * @returns Transfer result
 */
export function removeFromContainer(
  container: ResourceContainer,
  amount: number
): TransferResult {
  if (amount < 0) {
    return {
      success: false,
      amountTransferred: 0,
      overflow: 0,
      error: 'Cannot remove negative amount',
    };
  }

  if (amount === 0) {
    return {
      success: true,
      amountTransferred: 0,
      overflow: 0,
    };
  }

  if (amount > container.quantity) {
    return {
      success: false,
      amountTransferred: 0,
      overflow: amount - container.quantity,
      error: 'Insufficient resources',
    };
  }

  container.quantity -= amount;
  container.lastModified = new Date();

  return {
    success: true,
    amountTransferred: amount,
    overflow: 0,
  };
}

/**
 * Transfer resources between containers (must be same resource ID)
 * @param source - Source container
 * @param target - Target container
 * @param amount - Amount to transfer
 * @returns Transfer result
 */
export function transferBetweenContainers(
  source: ResourceContainer,
  target: ResourceContainer,
  amount: number
): TransferResult {
  // Validate same resource
  if (source.resourceId !== target.resourceId) {
    return {
      success: false,
      amountTransferred: 0,
      overflow: 0,
      error: 'Cannot transfer between different resource types',
    };
  }

  if (amount < 0) {
    return {
      success: false,
      amountTransferred: 0,
      overflow: 0,
      error: 'Cannot transfer negative amount',
    };
  }

  if (amount === 0) {
    return {
      success: true,
      amountTransferred: 0,
      overflow: 0,
    };
  }

  // Calculate actual transfer amount
  const availableInSource = source.quantity;
  const availableSpaceInTarget = target.maxQuantity - target.quantity;
  const actualAmount = Math.min(amount, availableInSource, availableSpaceInTarget);

  if (actualAmount === 0) {
    if (availableInSource === 0) {
      return {
        success: false,
        amountTransferred: 0,
        overflow: amount,
        error: 'Source container is empty',
      };
    }
    return {
      success: false,
      amountTransferred: 0,
      overflow: amount,
      error: 'Target container is full',
    };
  }

  source.quantity -= actualAmount;
  target.quantity += actualAmount;

  const now = new Date();
  source.lastModified = now;
  target.lastModified = now;

  return {
    success: true,
    amountTransferred: actualAmount,
    overflow: amount - actualAmount,
  };
}

/**
 * Split a container into two containers
 * @param source - Source container
 * @param newContainerId - ID for the new container
 * @param splitAmount - Amount to put in the new container
 * @returns New container or null if split failed
 */
export function splitContainer(
  source: ResourceContainer,
  newContainerId: bigint,
  splitAmount: number
): ResourceContainer | null {
  if (splitAmount <= 0 || splitAmount >= source.quantity) {
    return null;
  }

  const newContainer = createResourceContainer(
    newContainerId,
    source.resourceInstance,
    source.ownerId,
    {
      quantity: splitAmount,
      maxQuantity: source.maxQuantity,
      ...(source.parentContainerId !== undefined ? { parentContainerId: source.parentContainerId } : {}),
    }
  );

  source.quantity -= splitAmount;
  source.lastModified = new Date();

  return newContainer;
}

/**
 * Merge two containers of the same resource
 * @param target - Container to merge into
 * @param source - Container to merge from (will be emptied)
 * @returns Amount that couldn't be merged (overflow)
 */
export function mergeContainers(
  target: ResourceContainer,
  source: ResourceContainer
): number {
  if (source.resourceId !== target.resourceId) {
    return source.quantity;
  }

  const result = transferBetweenContainers(source, target, source.quantity);
  return result.overflow;
}

/**
 * Check if container is empty
 */
export function isContainerEmpty(container: ResourceContainer): boolean {
  return container.quantity <= 0;
}

/**
 * Check if container is full
 */
export function isContainerFull(container: ResourceContainer): boolean {
  return container.quantity >= container.maxQuantity;
}

/**
 * Get available space in container
 */
export function getContainerSpace(container: ResourceContainer): number {
  return container.maxQuantity - container.quantity;
}

/**
 * Get fill percentage of container
 */
export function getContainerFillPercent(container: ResourceContainer): number {
  if (container.maxQuantity === 0) {
    return 100;
  }
  return (container.quantity / container.maxQuantity) * 100;
}

/**
 * Clone a container with a new ID
 */
export function cloneContainer(
  container: ResourceContainer,
  newContainerId: bigint
): ResourceContainer {
  return {
    ...container,
    containerId: newContainerId,
    lastModified: new Date(),
  };
}

/**
 * Validate container state
 */
export function validateContainer(container: ResourceContainer): string[] {
  const errors: string[] = [];

  if (container.quantity < 0) {
    errors.push('Quantity cannot be negative');
  }

  if (container.quantity > container.maxQuantity) {
    errors.push('Quantity exceeds max quantity');
  }

  if (container.maxQuantity > MAX_RESOURCE_STACK_SIZE) {
    errors.push(`Max quantity exceeds limit of ${MAX_RESOURCE_STACK_SIZE}`);
  }

  if (container.resourceId !== container.resourceInstance.resourceId) {
    errors.push('Resource ID mismatch with resource instance');
  }

  return errors;
}

/**
 * Resource container collection manager
 */
export class ResourceInventory {
  private containers: Map<bigint, ResourceContainer> = new Map();
  private resourceIndex: Map<bigint, bigint[]> = new Map(); // resourceId -> containerIds

  /**
   * Add a container to the inventory
   */
  addContainer(container: ResourceContainer): void {
    this.containers.set(container.containerId, container);

    // Update resource index
    const containerIds = this.resourceIndex.get(container.resourceId) ?? [];
    if (!containerIds.includes(container.containerId)) {
      containerIds.push(container.containerId);
      this.resourceIndex.set(container.resourceId, containerIds);
    }
  }

  /**
   * Remove a container from the inventory
   */
  removeContainer(containerId: bigint): ResourceContainer | undefined {
    const container = this.containers.get(containerId);
    if (container) {
      this.containers.delete(containerId);

      // Update resource index
      const containerIds = this.resourceIndex.get(container.resourceId);
      if (containerIds) {
        const index = containerIds.indexOf(containerId);
        if (index !== -1) {
          containerIds.splice(index, 1);
        }
        if (containerIds.length === 0) {
          this.resourceIndex.delete(container.resourceId);
        }
      }
    }
    return container;
  }

  /**
   * Get a container by ID
   */
  getContainer(containerId: bigint): ResourceContainer | undefined {
    return this.containers.get(containerId);
  }

  /**
   * Get all containers for a specific resource
   */
  getContainersForResource(resourceId: bigint): ResourceContainer[] {
    const containerIds = this.resourceIndex.get(resourceId) ?? [];
    return containerIds
      .map((id) => this.containers.get(id))
      .filter((c): c is ResourceContainer => c !== undefined);
  }

  /**
   * Get total quantity of a specific resource
   */
  getTotalQuantity(resourceId: bigint): number {
    return this.getContainersForResource(resourceId).reduce(
      (total, container) => total + container.quantity,
      0
    );
  }

  /**
   * Get all containers
   */
  getAllContainers(): ResourceContainer[] {
    return Array.from(this.containers.values());
  }

  /**
   * Get all unique resource IDs
   */
  getResourceIds(): bigint[] {
    return Array.from(this.resourceIndex.keys());
  }

  /**
   * Find containers with available space for a resource
   */
  findContainersWithSpace(resourceId: bigint): ResourceContainer[] {
    return this.getContainersForResource(resourceId).filter((c) => !isContainerFull(c));
  }

  /**
   * Get total number of containers
   */
  get size(): number {
    return this.containers.size;
  }

  /**
   * Get number of unique resources
   */
  get uniqueResourceCount(): number {
    return this.resourceIndex.size;
  }

  /**
   * Clear all containers
   */
  clear(): void {
    this.containers.clear();
    this.resourceIndex.clear();
  }

  /**
   * Export all containers to serializable data
   */
  exportAll(): ResourceContainerData[] {
    return Array.from(this.containers.values()).map(resourceContainerToData);
  }

  /**
   * Import containers from serializable data
   */
  importAll(data: ResourceContainerData[]): void {
    for (const containerData of data) {
      this.addContainer(dataToResourceContainer(containerData));
    }
  }
}
