/**
 * Slot Requirements System
 * Defines restrictions and requirements for equipping items in each slot
 */

import { ObjectType, Species, Gender, type SpeciesType, type GenderType } from '@swg/objects';
import {
  EquipmentSlot,
  type EquipmentSlotType,
} from './equipment-slots.js';

/**
 * Requirement for equipping an item in a slot
 */
export interface SlotRequirement {
  /** Object types allowed in this slot */
  allowedObjectTypes: ObjectType[];
  /** Skill certification required to use this slot (optional) */
  requiredCertification?: string | undefined;
  /** Species that cannot use this slot (optional) */
  speciesRestrictions?: SpeciesType[] | undefined;
  /** Genders that cannot use this slot (optional) */
  genderRestrictions?: GenderType[] | undefined;
  /** Minimum level required (optional) */
  minLevel?: number | undefined;
  /** Maximum items that can be equipped (default 1) */
  maxItems?: number | undefined;
  /** Whether the slot is always available or requires unlocking */
  requiresUnlock?: boolean | undefined;
  /** Skill that unlocks this slot */
  unlockSkill?: string | undefined;
}

/**
 * Extended requirement check result
 */
export interface RequirementCheckResult {
  /** Whether the requirement is met */
  allowed: boolean;
  /** Reason code if not allowed */
  reason?: EquipmentFailureReasonType | undefined;
  /** Human-readable message */
  message?: string | undefined;
}

/**
 * Failure reasons for equipment operations
 */
export const EquipmentFailureReason = {
  /** No specific reason */
  NONE: 0,
  /** Wrong object type for slot */
  INVALID_OBJECT_TYPE: 1,
  /** Missing required certification */
  MISSING_CERTIFICATION: 2,
  /** Species cannot use this slot */
  SPECIES_RESTRICTED: 3,
  /** Gender cannot use this slot */
  GENDER_RESTRICTED: 4,
  /** Level too low */
  LEVEL_TOO_LOW: 5,
  /** Slot is full */
  SLOT_FULL: 6,
  /** Slot requires unlocking */
  SLOT_LOCKED: 7,
  /** Item is bio-linked to another player */
  BIO_LINKED: 8,
  /** Item is no-trade */
  NO_TRADE: 9,
  /** Item condition too low */
  CONDITION_TOO_LOW: 10,
  /** Conflicting equipment */
  EQUIPMENT_CONFLICT: 11,
  /** Item already equipped */
  ALREADY_EQUIPPED: 12,
  /** Player is in combat */
  IN_COMBAT: 13,
  /** Player is incapacitated */
  INCAPACITATED: 14,
  /** Player is dead */
  DEAD: 15,
} as const;

export type EquipmentFailureReasonType =
  (typeof EquipmentFailureReason)[keyof typeof EquipmentFailureReason];

/**
 * Default slot requirements for all equipment slots
 */
export const DEFAULT_SLOT_REQUIREMENTS: Map<EquipmentSlotType, SlotRequirement> = new Map([
  // Head slot - helmets, hats, goggles
  [
    EquipmentSlot.HEAD,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
      speciesRestrictions: [], // Wookiees may have restrictions on certain helmets
    },
  ],

  // Chest slot - shirts, chest armor
  [
    EquipmentSlot.CHEST,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
    },
  ],

  // Legs slot - pants, leg armor
  [
    EquipmentSlot.LEGS,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
    },
  ],

  // Feet slot - boots
  [
    EquipmentSlot.FEET,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
    },
  ],

  // Hands slot - gloves
  [
    EquipmentSlot.HANDS,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
    },
  ],

  // Back slot - backpacks
  [
    EquipmentSlot.BACK,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Right hand - primary weapon
  [
    EquipmentSlot.RIGHT_HAND,
    {
      allowedObjectTypes: [ObjectType.Weapon, ObjectType.Tangible],
    },
  ],

  // Left hand - secondary weapon (dual wield)
  [
    EquipmentSlot.LEFT_HAND,
    {
      allowedObjectTypes: [ObjectType.Weapon, ObjectType.Tangible],
      requiredCertification: 'cert_dual_wield', // Requires dual wield skill
      requiresUnlock: true,
      unlockSkill: 'combat_brawler_novice', // Example skill requirement
    },
  ],

  // Necklace - jewelry
  [
    EquipmentSlot.NECKLACE,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Left ring - jewelry
  [
    EquipmentSlot.RING_LEFT,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Right ring - jewelry
  [
    EquipmentSlot.RING_RIGHT,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Left earring - jewelry
  [
    EquipmentSlot.EARRING_LEFT,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Right earring - jewelry
  [
    EquipmentSlot.EARRING_RIGHT,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Left bracelet - bracers
  [
    EquipmentSlot.BRACELET_LEFT,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
    },
  ],

  // Right bracelet - bracers
  [
    EquipmentSlot.BRACELET_RIGHT,
    {
      allowedObjectTypes: [ObjectType.Armor, ObjectType.Tangible],
    },
  ],

  // Left bicep - bicep armor
  [
    EquipmentSlot.BICEP_LEFT,
    {
      allowedObjectTypes: [ObjectType.Armor],
    },
  ],

  // Right bicep - bicep armor
  [
    EquipmentSlot.BICEP_RIGHT,
    {
      allowedObjectTypes: [ObjectType.Armor],
    },
  ],

  // Belt
  [
    EquipmentSlot.BELT,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Cloak
  [
    EquipmentSlot.CLOAK,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Utility belt
  [
    EquipmentSlot.UTILITY_BELT,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Bank container
  [
    EquipmentSlot.BANK,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Datapad
  [
    EquipmentSlot.DATAPAD,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],

  // Mission bag
  [
    EquipmentSlot.MISSION_BAG,
    {
      allowedObjectTypes: [ObjectType.Tangible],
    },
  ],
]);

/**
 * Get requirements for a specific slot
 */
export function getSlotRequirements(slot: EquipmentSlotType): SlotRequirement | undefined {
  return DEFAULT_SLOT_REQUIREMENTS.get(slot);
}

/**
 * Check if an object type is allowed in a slot
 */
export function isObjectTypeAllowed(slot: EquipmentSlotType, objectType: ObjectType): boolean {
  const requirements = DEFAULT_SLOT_REQUIREMENTS.get(slot);
  if (!requirements) {
    return false;
  }
  return requirements.allowedObjectTypes.includes(objectType);
}

/**
 * Check if a species can use a slot
 */
export function isSpeciesAllowed(slot: EquipmentSlotType, species: SpeciesType): boolean {
  const requirements = DEFAULT_SLOT_REQUIREMENTS.get(slot);
  if (!requirements || !requirements.speciesRestrictions) {
    return true;
  }
  return !requirements.speciesRestrictions.includes(species);
}

/**
 * Check if a gender can use a slot
 */
export function isGenderAllowed(slot: EquipmentSlotType, gender: GenderType): boolean {
  const requirements = DEFAULT_SLOT_REQUIREMENTS.get(slot);
  if (!requirements || !requirements.genderRestrictions) {
    return true;
  }
  return !requirements.genderRestrictions.includes(gender);
}

/**
 * Check if a player has the required certification for a slot
 */
export function hasCertificationForSlot(
  slot: EquipmentSlotType,
  playerSkills: Set<string>
): boolean {
  const requirements = DEFAULT_SLOT_REQUIREMENTS.get(slot);
  if (!requirements || !requirements.requiredCertification) {
    return true;
  }
  return playerSkills.has(requirements.requiredCertification);
}

/**
 * Check if a slot is unlocked for a player
 */
export function isSlotUnlocked(slot: EquipmentSlotType, playerSkills: Set<string>): boolean {
  const requirements = DEFAULT_SLOT_REQUIREMENTS.get(slot);
  if (!requirements || !requirements.requiresUnlock) {
    return true;
  }
  if (!requirements.unlockSkill) {
    return true;
  }
  return playerSkills.has(requirements.unlockSkill);
}

/**
 * Validate all requirements for equipping an item in a slot
 */
export function validateSlotRequirements(
  slot: EquipmentSlotType,
  objectType: ObjectType,
  species: SpeciesType,
  gender: GenderType,
  level: number,
  playerSkills: Set<string>
): RequirementCheckResult {
  const requirements = DEFAULT_SLOT_REQUIREMENTS.get(slot);

  if (!requirements) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.INVALID_OBJECT_TYPE,
      message: 'Unknown equipment slot',
    };
  }

  // Check object type
  if (!requirements.allowedObjectTypes.includes(objectType)) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.INVALID_OBJECT_TYPE,
      message: 'This item cannot be equipped in this slot',
    };
  }

  // Check species restrictions
  if (requirements.speciesRestrictions && requirements.speciesRestrictions.includes(species)) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.SPECIES_RESTRICTED,
      message: 'Your species cannot equip items in this slot',
    };
  }

  // Check gender restrictions
  if (requirements.genderRestrictions && requirements.genderRestrictions.includes(gender)) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.GENDER_RESTRICTED,
      message: 'Your gender cannot equip items in this slot',
    };
  }

  // Check level requirement
  if (requirements.minLevel && level < requirements.minLevel) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.LEVEL_TOO_LOW,
      message: `You must be level ${requirements.minLevel} to use this slot`,
    };
  }

  // Check certification requirement
  if (requirements.requiredCertification && !playerSkills.has(requirements.requiredCertification)) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.MISSING_CERTIFICATION,
      message: `You need the ${requirements.requiredCertification} skill to use this slot`,
    };
  }

  // Check if slot requires unlocking
  if (requirements.requiresUnlock && requirements.unlockSkill) {
    if (!playerSkills.has(requirements.unlockSkill)) {
      return {
        allowed: false,
        reason: EquipmentFailureReason.SLOT_LOCKED,
        message: `You need the ${requirements.unlockSkill} skill to unlock this slot`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Item-specific equipment requirements
 * These are checked against the item itself, not the slot
 */
export interface ItemEquipmentRequirement {
  /** Required skill certification */
  requiredCertification?: string | undefined;
  /** Required species */
  requiredSpecies?: SpeciesType[] | undefined;
  /** Required gender */
  requiredGender?: GenderType | undefined;
  /** Required minimum level */
  minLevel?: number | undefined;
  /** Required faction */
  requiredFaction?: number | undefined;
  /** Bio-link owner (if bio-linked) */
  bioLinkOwner?: bigint | undefined;
}

/**
 * Check if a player meets item-specific requirements
 */
export function validateItemRequirements(
  requirements: ItemEquipmentRequirement,
  playerId: bigint,
  playerSpecies: SpeciesType,
  playerGender: GenderType,
  playerLevel: number,
  playerFaction: number,
  playerSkills: Set<string>
): RequirementCheckResult {
  // Check certification
  if (requirements.requiredCertification && !playerSkills.has(requirements.requiredCertification)) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.MISSING_CERTIFICATION,
      message: `You need the ${requirements.requiredCertification} skill to use this item`,
    };
  }

  // Check species
  if (
    requirements.requiredSpecies &&
    requirements.requiredSpecies.length > 0 &&
    !requirements.requiredSpecies.includes(playerSpecies)
  ) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.SPECIES_RESTRICTED,
      message: 'Your species cannot use this item',
    };
  }

  // Check gender
  if (requirements.requiredGender !== undefined && requirements.requiredGender !== playerGender) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.GENDER_RESTRICTED,
      message: 'Your gender cannot use this item',
    };
  }

  // Check level
  if (requirements.minLevel && playerLevel < requirements.minLevel) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.LEVEL_TOO_LOW,
      message: `You must be level ${requirements.minLevel} to use this item`,
    };
  }

  // Check faction
  if (requirements.requiredFaction && requirements.requiredFaction !== playerFaction) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.MISSING_CERTIFICATION,
      message: 'You are not a member of the required faction',
    };
  }

  // Check bio-link
  if (requirements.bioLinkOwner && requirements.bioLinkOwner !== playerId) {
    return {
      allowed: false,
      reason: EquipmentFailureReason.BIO_LINKED,
      message: 'This item is bio-linked to another player',
    };
  }

  return { allowed: true };
}

/**
 * Get the failure reason message for display
 */
export function getFailureMessage(reason: EquipmentFailureReasonType): string {
  switch (reason) {
    case EquipmentFailureReason.INVALID_OBJECT_TYPE:
      return 'This item cannot be equipped in this slot.';
    case EquipmentFailureReason.MISSING_CERTIFICATION:
      return 'You do not have the required skill.';
    case EquipmentFailureReason.SPECIES_RESTRICTED:
      return 'Your species cannot use this equipment.';
    case EquipmentFailureReason.GENDER_RESTRICTED:
      return 'Your gender cannot use this equipment.';
    case EquipmentFailureReason.LEVEL_TOO_LOW:
      return 'Your level is too low.';
    case EquipmentFailureReason.SLOT_FULL:
      return 'This slot is already occupied.';
    case EquipmentFailureReason.SLOT_LOCKED:
      return 'This slot is locked.';
    case EquipmentFailureReason.BIO_LINKED:
      return 'This item is bio-linked to another player.';
    case EquipmentFailureReason.NO_TRADE:
      return 'This item cannot be transferred.';
    case EquipmentFailureReason.CONDITION_TOO_LOW:
      return 'This item is too damaged to equip.';
    case EquipmentFailureReason.EQUIPMENT_CONFLICT:
      return 'This item conflicts with currently equipped items.';
    case EquipmentFailureReason.ALREADY_EQUIPPED:
      return 'This item is already equipped.';
    case EquipmentFailureReason.IN_COMBAT:
      return 'You cannot change equipment while in combat.';
    case EquipmentFailureReason.INCAPACITATED:
      return 'You cannot change equipment while incapacitated.';
    case EquipmentFailureReason.DEAD:
      return 'You cannot change equipment while dead.';
    default:
      return 'Unable to equip item.';
  }
}
