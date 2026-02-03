/**
 * @swg/game-logic - Resources Module
 * Complete SWG resource system including types, attributes, spawning, and concentration maps
 *
 * This module provides:
 * - Resource type hierarchy (Organic/Inorganic with subtypes)
 * - Resource attribute definitions (11 attributes: CR, CD, DR, ER, FL, HR, MA, OQ, PE, SR, UT)
 * - Resource class templates with attribute ranges
 * - Resource instances for spawned resources
 * - Resource containers for inventory/storage
 * - Spawn configuration and tables
 * - Concentration maps for resource distribution
 */

// ===== Resource Type Hierarchy =====
export {
  ResourceCategory,
  ResourceType,
  type ResourceTypeInfo,
  RESOURCE_TYPE_HIERARCHY,
  getParentResourceType,
  getResourceTypeAncestors,
  isSubtypeOf,
  getChildResourceTypes,
  getAllDescendantTypes,
  getSpawnableDescendants,
  getResourceCategory,
  getResourceTypeDisplayName,
} from './resource-types.js';

// ===== Resource Attributes =====
export {
  ResourceAttribute,
  RESOURCE_ATTRIBUTE_CODES,
  RESOURCE_ATTRIBUTE_NAMES,
  ATTRIBUTE_MIN_VALUE,
  ATTRIBUTE_MAX_VALUE,
  ALL_RESOURCE_ATTRIBUTES,
  type AttributeRange,
  DEFAULT_ATTRIBUTE_RANGE,
  RESOURCE_TYPE_ATTRIBUTES,
  getApplicableAttributes,
  isAttributeApplicable,
  isValidAttributeValue,
  clampAttributeValue,
  getAttributeCode,
  getAttributeName,
  parseAttribute,
  attributeToQualityPercent,
} from './resource-attributes.js';

// ===== Resource Class Definitions =====
export {
  Planet,
  ALL_PLANETS,
  CORE_PLANETS,
  PLANET_NAMES,
  PLANET_ADJECTIVES,
  type ResourceAttributeRange,
  type ResourceClass,
  type ResourceClassData,
  resourceClassToData,
  dataToResourceClass,
  createResourceClass,
  getAttributeRange,
  canSpawnOnPlanet,
  getSpawnablePlanets,
  validateResourceClass,
  ResourceClassRegistry,
  globalResourceClassRegistry,
} from './resource-class.js';

// ===== Resource Instances =====
export {
  type ResourceInstance,
  type ResourceInstanceData,
  type AttributeWeight,
  resourceInstanceToData,
  dataToResourceInstance,
  createResourceInstance,
  generateResourceName,
  generateRandomAttributes,
  isResourceActive,
  isResourceExpired,
  getTimeUntilExpiry,
  getResourceAttribute,
  isResourceOfType,
  isResourceOfClass,
  calculateResourceQuality,
  calculateAverageQuality,
  getOverallQuality,
  compareResourceQuality,
  findBestResource,
  getResourceSummary,
  validateResourceInstance,
  cloneResourceInstance,
} from './resource-instance.js';

// ===== Resource Containers =====
export {
  MAX_RESOURCE_STACK_SIZE,
  DEFAULT_MAX_STACK_SIZE,
  type ResourceContainer,
  type ResourceContainerData,
  type TransferResult,
  resourceContainerToData,
  dataToResourceContainer,
  createResourceContainer,
  addToContainer,
  removeFromContainer,
  transferBetweenContainers,
  splitContainer,
  mergeContainers,
  isContainerEmpty,
  isContainerFull,
  getContainerSpace,
  getContainerFillPercent,
  cloneContainer,
  validateContainer,
  ResourceInventory,
} from './resource-container.js';

// ===== Spawn Configuration =====
export {
  type ResourceSpawnConfig,
  type PlanetSpawnConfig,
  type PlanetSpawnConfigJson,
  parsePlanetSpawnConfig,
  serializePlanetSpawnConfig,
  DEFAULT_SPAWN_CONFIG,
  DEFAULT_PLANET_SPAWN_CONFIG,
  SWG_PLANETS,
  type SwgPlanetId,
  validateResourceSpawnConfig,
  validatePlanetSpawnConfig,
} from './spawn-config.js';

// ===== Spawn Tables Loader =====
export {
  SpawnTableLoadError,
  type SpawnProbability,
  type LoadSpawnTablesResult,
  type LoadSpawnTablesOptions,
  loadSpawnTables,
  getSpawnConfigForClass,
  getSpawnableResourcesForPlanet,
  calculateSpawnProbabilities,
  selectRandomResourceClass,
  getPlanetSpawnConfig,
  getAllSpawnConfigs,
  getAllPlanetConfigs,
  areSpawnTablesLoaded,
  clearSpawnTables,
  calculateResourceLifespan,
  calculateSpawnPoolSize,
} from './spawn-tables-loader.js';

// ===== Resource Tree Loader =====
// Note: These types are from the datatable loader and have different structure
// than the core types above. Use ResourceTreeAttributeDef/ResourceTreeNode
// when working with loaded datatable data.
export {
  ResourceTreeLoadError,
  type ResourceTreeAttributeDef,
  type ResourceTreeNode,
  type ResourceTreeNodeJson,
  type LoadResourceTreeResult,
  type LoadResourceTreeOptions,
  loadResourceTree,
  getAllResourceClasses as getAllTreeClasses,
  getResourceClass as getTreeClass,
  getSpawnableClasses as getSpawnableTreeClasses,
  getResourceClassesByCategory as getTreeClassesByCategory,
  getAllChildClasses,
  getClassInheritancePath,
  isDescendantOf,
  getRootClasses,
  isResourceTreeLoaded,
  clearResourceTree,
  getCombinedAttributes,
  searchResourceClasses as searchTreeClasses,
} from './resource-tree-loader.js';

// ===== Concentration Map =====
export {
  type ConcentrationPoint,
  type ConcentrationMapData,
  type GenerationOptions,
  ConcentrationMap,
  generateConcentrationMap,
  mergeConcentrationMaps,
  createEmptyConcentrationMap,
} from './concentration-map.js';

// ===== Convenience Functions =====

import { globalResourceClassRegistry } from './resource-class.js';

/**
 * Get the full class hierarchy for a resource class ID
 * @param classId - The class ID to get hierarchy for
 * @param registry - Optional registry (defaults to global)
 * @returns Array of class IDs from most specific to root
 */
export function getResourceClassHierarchy(
  classId: string,
  registry = globalResourceClassRegistry
): string[] {
  const hierarchy: string[] = [];
  let currentId: string | null = classId;

  while (currentId !== null) {
    hierarchy.push(currentId);
    const resourceClass = registry.get(currentId);
    if (resourceClass) {
      currentId = resourceClass.parentClass;
    } else {
      break;
    }
  }

  return hierarchy;
}
