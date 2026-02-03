/**
 * Tangible Object Options Bitmask Constants
 * These flags control various behaviors and states of tangible objects
 */

/**
 * Bitmask constants for tangible object options
 * Used in the optionsBitmask field of TangibleObject
 */
export const TangibleOptions = {
  /** No options set */
  NONE: 0,
  /** Item is insured against destruction */
  INSURED: 1 << 0,
  /** Item has magic/force properties */
  MAGIC: 1 << 1,
  /** Item cannot be damaged */
  INVULNERABLE: 1 << 2,
  /** Item is disabled/non-functional */
  DISABLED: 1 << 3,
  /** Item cannot be traded */
  NO_TRADE: 1 << 4,
  /** Item cannot be dropped */
  NO_DROP: 1 << 5,
  /** Item cannot be sold to vendors */
  NO_SELL: 1 << 6,
  /** Item cannot be destroyed */
  NO_DESTROY: 1 << 7,
  /** Item is bio-linked to owner */
  BIO_LINK: 1 << 8,
  /** Item is a quest item */
  QUEST_ITEM: 1 << 9,
  /** Item is a crafted item */
  CRAFTED: 1 << 10,
  /** Item is a looted item */
  LOOTED: 1 << 11,
  /** Item has been equipped */
  EQUIPPED: 1 << 12,
  /** Item is hidden from view */
  HIDDEN: 1 << 13,
  /** Item cannot be moved */
  IMMOVABLE: 1 << 14,
  /** Item is temporary (will be deleted) */
  TEMPORARY: 1 << 15,
  /** Item requires faction standing */
  FACTION_REQUIRED: 1 << 16,
  /** Item is a GM/admin item */
  GM_ITEM: 1 << 17,
  /** Item is a unique artifact */
  UNIQUE: 1 << 18,
  /** Item is a stackable resource */
  STACKABLE: 1 << 19,
  /** Item is a container */
  CONTAINER: 1 << 20,
  /** Item cannot be examined */
  NO_EXAMINE: 1 << 21,
  /** Item is being used */
  IN_USE: 1 << 22,
  /** Item is on a timer */
  TIMED: 1 << 23,
} as const;

/**
 * Type for tangible options values
 */
export type TangibleOption = (typeof TangibleOptions)[keyof typeof TangibleOptions];

/**
 * Check if an options bitmask has a specific option set
 */
export function hasOption(bitmask: number, option: TangibleOption): boolean {
  return (bitmask & option) !== 0;
}

/**
 * Set an option in a bitmask
 */
export function setOption(bitmask: number, option: TangibleOption): number {
  return bitmask | option;
}

/**
 * Clear an option from a bitmask
 */
export function clearOption(bitmask: number, option: TangibleOption): number {
  return bitmask & ~option;
}

/**
 * Toggle an option in a bitmask
 */
export function toggleOption(bitmask: number, option: TangibleOption): number {
  return bitmask ^ option;
}

/**
 * Check if item is tradeable
 */
export function isTradeable(bitmask: number): boolean {
  return !hasOption(bitmask, TangibleOptions.NO_TRADE) && !hasOption(bitmask, TangibleOptions.BIO_LINK);
}

/**
 * Check if item can be destroyed
 */
export function canBeDestroyed(bitmask: number): boolean {
  return (
    !hasOption(bitmask, TangibleOptions.NO_DESTROY) &&
    !hasOption(bitmask, TangibleOptions.INVULNERABLE) &&
    !hasOption(bitmask, TangibleOptions.QUEST_ITEM)
  );
}

/**
 * Check if item can be sold
 */
export function canBeSold(bitmask: number): boolean {
  return !hasOption(bitmask, TangibleOptions.NO_SELL) && !hasOption(bitmask, TangibleOptions.BIO_LINK);
}

/**
 * Get a list of active options as strings
 */
export function getActiveOptions(bitmask: number): string[] {
  const options: string[] = [];

  if (bitmask === TangibleOptions.NONE) {
    return ['NONE'];
  }

  for (const [name, value] of Object.entries(TangibleOptions)) {
    if (value !== 0 && hasOption(bitmask, value)) {
      options.push(name);
    }
  }

  return options;
}
