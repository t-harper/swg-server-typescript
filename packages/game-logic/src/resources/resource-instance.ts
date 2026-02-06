/**
 * Resource Instance
 * Represents a specific spawned resource with unique attributes
 */

import type { ObjectId } from '@swg/shared-types';
import {
  ResourceAttribute,
  isValidAttributeValue,
  clampAttributeValue,
  getApplicableAttributes,
  ATTRIBUTE_MIN_VALUE,
  ATTRIBUTE_MAX_VALUE,
} from './resource-attributes.js';
import {
  ResourceClass,
  Planet,
  PLANET_ADJECTIVES,
  ResourceClassData,
  resourceClassToData,
  dataToResourceClass,
  getAttributeRange,
} from './resource-class.js';
import {
  ResourceType,
  getResourceTypeAncestors,
  isSubtypeOf,
  getResourceTypeDisplayName,
} from './resource-types.js';

/**
 * Represents a spawned resource instance with specific attributes
 * Each resource spawn has unique attribute values within the class ranges
 */
export interface ResourceInstance {
  /** Unique identifier for this resource instance */
  resourceId: bigint;

  /** The resource class this instance belongs to */
  resourceClass: ResourceClass;

  /** Generated name for this specific resource (e.g., "Tatooinian Steel") */
  resourceName: string;

  /** Actual attribute values for this instance (0-1000) */
  attributes: Map<ResourceAttribute, number>;

  /** When this resource was spawned */
  spawnedAt: Date;

  /** When this resource will despawn (expire) */
  expiresAt: Date;

  /** Planet where this resource is available */
  planetId: Planet;

  /** Whether this resource is currently active/spawned */
  isActive: boolean;

  /** Server ID where this resource was created (for multi-server setups) */
  serverId?: string | undefined;
}

/**
 * Serializable resource instance data (for database/JSON)
 */
export interface ResourceInstanceData {
  resourceId: string; // bigint as string
  resourceClass: ResourceClassData;
  resourceName: string;
  attributes: Record<string, number>;
  spawnedAt: string; // ISO date string
  expiresAt: string; // ISO date string
  planetId: string;
  isActive: boolean;
  serverId?: string | undefined;
}

/**
 * Convert ResourceInstance to serializable data
 */
export function resourceInstanceToData(instance: ResourceInstance): ResourceInstanceData {
  return {
    resourceId: instance.resourceId.toString(),
    resourceClass: resourceClassToData(instance.resourceClass),
    resourceName: instance.resourceName,
    attributes: Object.fromEntries(instance.attributes),
    spawnedAt: instance.spawnedAt.toISOString(),
    expiresAt: instance.expiresAt.toISOString(),
    planetId: instance.planetId,
    isActive: instance.isActive,
    serverId: instance.serverId,
  };
}

/**
 * Convert serializable data to ResourceInstance
 */
export function dataToResourceInstance(data: ResourceInstanceData): ResourceInstance {
  return {
    resourceId: BigInt(data.resourceId),
    resourceClass: dataToResourceClass(data.resourceClass),
    resourceName: data.resourceName,
    attributes: new Map(Object.entries(data.attributes) as [ResourceAttribute, number][]),
    spawnedAt: new Date(data.spawnedAt),
    expiresAt: new Date(data.expiresAt),
    planetId: data.planetId as Planet,
    isActive: data.isActive,
    serverId: data.serverId,
  };
}

/**
 * Name components for resource name generation
 */
const NAME_PREFIXES: string[] = [
  'Aber',
  'Acklay',
  'Bantha',
  'Barab',
  'Colo',
  'Danchaf',
  'Dewback',
  'Dug',
  'Eopie',
  'Ewok',
  'Fambaa',
  'Falumpaset',
  'Gorg',
  'Graul',
  'Gurreck',
  'Hap',
  'Ikopi',
  'Jawa',
  'Kaadu',
  'Kliknik',
  'Krayt',
  'Lob',
  'Malkloc',
  'Mott',
  'Narglatch',
  'Nuna',
  'Orray',
  'Peko',
  'Piket',
  'Quenker',
  'Rancor',
  'Ronto',
  'Shaupaut',
  'Slice',
  'Snorbal',
  'Squill',
  'Swamp',
  'Thune',
  'Veermok',
  'Voritor',
  'Wrix',
  'Xandank',
  'Zucca',
];

const NAME_SUFFIXES: string[] = [
  'ine',
  'ium',
  'ite',
  'ite',
  'ase',
  'ese',
  'ian',
  'oid',
  'ex',
  'ax',
  'ix',
  'ox',
  'ux',
  'ar',
  'er',
  'ir',
  'or',
  'ur',
  'al',
  'el',
  'il',
  'ol',
  'ul',
  'on',
  'an',
  'en',
  'in',
  'un',
];

/**
 * Generate a lore-friendly resource name
 * @param resourceClass - The resource class
 * @param planet - The planet where the resource spawns
 * @param seed - Optional seed for deterministic generation
 * @returns Generated resource name
 */
export function generateResourceName(
  resourceClass: ResourceClass,
  planet: Planet,
  seed?: number
): string {
  // Use seeded random if provided, otherwise use Math.random
  const random = seed !== undefined ? seededRandom(seed) : Math.random;

  const planetAdj = PLANET_ADJECTIVES[planet] ?? planet;

  // Generate unique identifier part
  const prefix = NAME_PREFIXES[Math.floor(random() * NAME_PREFIXES.length)]!;
  const suffix = NAME_SUFFIXES[Math.floor(random() * NAME_SUFFIXES.length)]!;

  // Combine: "Tatooinian Banthanite Steel" or "Corellian Kraytium"
  const uniquePart = prefix + suffix;

  // Sometimes include the class name, sometimes just the unique name
  if (random() > 0.5) {
    return `${planetAdj} ${uniquePart} ${resourceClass.className}`;
  } else {
    return `${planetAdj} ${uniquePart}`;
  }
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate random attribute values within class ranges
 * @param resourceClass - The resource class
 * @param seed - Optional seed for deterministic generation
 * @returns Map of attribute values
 */
export function generateRandomAttributes(
  resourceClass: ResourceClass,
  seed?: number
): Map<ResourceAttribute, number> {
  const random = seed !== undefined ? seededRandom(seed) : Math.random;
  const attributes = new Map<ResourceAttribute, number>();

  for (const attr of resourceClass.applicableAttributes) {
    const range = getAttributeRange(resourceClass, attr);
    if (range) {
      const value = Math.floor(random() * (range.max - range.min + 1)) + range.min;
      attributes.set(attr, clampAttributeValue(value));
    }
  }

  return attributes;
}

/**
 * Create a new resource instance
 */
export function createResourceInstance(
  resourceId: bigint,
  resourceClass: ResourceClass,
  planet: Planet,
  options: Partial<{
    resourceName: string;
    attributes: Map<ResourceAttribute, number>;
    spawnedAt: Date;
    expiresAt: Date;
    isActive: boolean;
    serverId: string;
    seed: number;
  }> = {}
): ResourceInstance {
  const spawnedAt = options.spawnedAt ?? new Date();

  // Default spawn duration: 7-21 days
  const defaultDuration = 7 + Math.floor(Math.random() * 14);
  const expiresAt =
    options.expiresAt ?? new Date(spawnedAt.getTime() + defaultDuration * 24 * 60 * 60 * 1000);

  return {
    resourceId,
    resourceClass,
    resourceName:
      options.resourceName ?? generateResourceName(resourceClass, planet, options.seed),
    attributes: options.attributes ?? generateRandomAttributes(resourceClass, options.seed),
    spawnedAt,
    expiresAt,
    planetId: planet,
    isActive: options.isActive ?? true,
    serverId: options.serverId,
  };
}

/**
 * Check if a resource instance is still active (not expired)
 */
export function isResourceActive(instance: ResourceInstance, currentTime?: Date): boolean {
  const now = currentTime ?? new Date();
  return instance.isActive && now < instance.expiresAt;
}

/**
 * Check if a resource instance has expired
 */
export function isResourceExpired(instance: ResourceInstance, currentTime?: Date): boolean {
  const now = currentTime ?? new Date();
  return now >= instance.expiresAt;
}

/**
 * Get time remaining until resource expires
 */
export function getTimeUntilExpiry(instance: ResourceInstance, currentTime?: Date): number {
  const now = currentTime ?? new Date();
  return Math.max(0, instance.expiresAt.getTime() - now.getTime());
}

/**
 * Get an attribute value from a resource instance
 */
export function getResourceAttribute(
  instance: ResourceInstance,
  attribute: ResourceAttribute
): number | null {
  return instance.attributes.get(attribute) ?? null;
}

/**
 * Check if resource instance is of a specific type (or subtype)
 */
export function isResourceOfType(instance: ResourceInstance, type: ResourceType): boolean {
  return isSubtypeOf(instance.resourceClass.resourceType, type);
}

/**
 * Check if resource instance is of a specific class (or subclass)
 */
export function isResourceOfClass(instance: ResourceInstance, classId: string): boolean {
  // Check exact match
  if (instance.resourceClass.classId === classId) {
    return true;
  }

  // Check parent chain
  let currentParent = instance.resourceClass.parentClass;
  while (currentParent !== null) {
    if (currentParent === classId) {
      return true;
    }
    // Would need registry access to continue, so just check direct parent
    break;
  }

  return false;
}

/**
 * Attribute weight for quality calculation
 */
export interface AttributeWeight {
  attribute: ResourceAttribute;
  weight: number;
}

/**
 * Calculate weighted quality score for a resource
 * @param instance - The resource instance
 * @param weights - Attribute weights (should sum to 1.0)
 * @returns Quality score (0-1000)
 */
export function calculateResourceQuality(
  instance: ResourceInstance,
  weights: AttributeWeight[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { attribute, weight } of weights) {
    const value = instance.attributes.get(attribute);
    if (value !== undefined) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate simple average quality of all attributes
 */
export function calculateAverageQuality(instance: ResourceInstance): number {
  const values = Array.from(instance.attributes.values());
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Get the overall quality (OQ) attribute if present
 */
export function getOverallQuality(instance: ResourceInstance): number | null {
  return instance.attributes.get(ResourceAttribute.OQ) ?? null;
}

/**
 * Compare two resources by quality for a specific weighting
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareResourceQuality(
  a: ResourceInstance,
  b: ResourceInstance,
  weights: AttributeWeight[]
): number {
  const qualityA = calculateResourceQuality(a, weights);
  const qualityB = calculateResourceQuality(b, weights);
  return qualityA - qualityB;
}

/**
 * Find the best resource from a list for given weights
 */
export function findBestResource(
  instances: ResourceInstance[],
  weights: AttributeWeight[]
): ResourceInstance | null {
  if (instances.length === 0) {
    return null;
  }

  return instances.reduce((best, current) => {
    if (compareResourceQuality(current, best, weights) > 0) {
      return current;
    }
    return best;
  });
}

/**
 * Get a summary of resource attributes
 */
export function getResourceSummary(instance: ResourceInstance): string {
  const attrs = Array.from(instance.attributes.entries())
    .map(([attr, value]) => `${attr.split('_').map(w => w[0]!.toUpperCase()).join('')}: ${value}`)
    .join(', ');

  return `${instance.resourceName} (${instance.resourceClass.className}) - ${attrs}`;
}

/**
 * Validate that a resource instance's attributes are within class ranges
 */
export function validateResourceInstance(instance: ResourceInstance): string[] {
  const errors: string[] = [];

  for (const attr of instance.resourceClass.applicableAttributes) {
    const value = instance.attributes.get(attr);

    if (value === undefined) {
      errors.push(`Missing attribute: ${attr}`);
      continue;
    }

    if (!isValidAttributeValue(value)) {
      errors.push(`Invalid attribute value for ${attr}: ${value}`);
      continue;
    }

    const range = getAttributeRange(instance.resourceClass, attr);
    if (range) {
      if (value < range.min || value > range.max) {
        errors.push(
          `Attribute ${attr} value ${value} out of range [${range.min}, ${range.max}]`
        );
      }
    }
  }

  // Check for extra attributes
  for (const attr of instance.attributes.keys()) {
    if (!instance.resourceClass.applicableAttributes.includes(attr)) {
      errors.push(`Unexpected attribute: ${attr}`);
    }
  }

  return errors;
}

/**
 * Clone a resource instance with a new ID
 */
export function cloneResourceInstance(
  instance: ResourceInstance,
  newResourceId: bigint
): ResourceInstance {
  return {
    ...instance,
    resourceId: newResourceId,
    attributes: new Map(instance.attributes),
    spawnedAt: new Date(instance.spawnedAt),
    expiresAt: new Date(instance.expiresAt),
  };
}
