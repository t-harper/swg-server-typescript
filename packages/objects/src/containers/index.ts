/**
 * Container Management System
 * Provides container classes and services for inventory operations.
 *
 * This module includes:
 * - Container type definitions and enums
 * - Base Container class for all containers
 * - ContainerManager service for cross-container operations
 * - FactoryCrate for factory-produced item stacks
 * - InventoryContainer for player inventory
 * - LootContainer for corpse/chest loot
 */

// Container type definitions
export {
  ContainerType,
  ContainerPermission,
  SlotRestriction,
  type SlotDefinition,
  TransferResultCode,
  type TransferResult,
  type ContainedItem,
  ContainerChangeType,
  type ContainerChangeEvent,
  DEFAULT_CONTAINER_CAPACITIES,
  DEFAULT_CONTAINER_VOLUMES,
  createSuccessResult,
  createFailureResult,
  getTransferResultMessage,
} from './container-types.js';

// Base Container class
export { Container, ContProperty } from './container.js';

// Container Manager service
export {
  ContainerManager,
  getContainerManager,
  type TransferValidationOptions,
} from './container-manager.js';

// Factory Crate
export {
  FactoryCrate,
  FcrtProperty,
  DEFAULT_MAX_STACK_SIZE,
  type FactoryCrateItemAttributes,
} from './factory-crate.js';

// Inventory Container
export {
  InventoryContainer,
  InvProperty,
  EquipmentSlotNames,
  DEFAULT_INVENTORY_CAPACITY,
  DEFAULT_INVENTORY_VOLUME,
  type OverflowItem,
} from './inventory-container.js';

// Loot Container
export {
  LootContainer,
  LootPermissionMode,
  LootProperty,
  DEFAULT_LOOT_CAPACITY,
  DEFAULT_LOOT_VOLUME,
  DEFAULT_LOOT_DURATION_MS,
  EXTENDED_LOOT_DURATION_MS,
} from './loot-container.js';
