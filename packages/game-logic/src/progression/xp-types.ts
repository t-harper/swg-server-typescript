/**
 * XP Types - Experience point type definitions for SWG
 *
 * SWG uses a type-based XP system where players earn different types
 * of experience based on their activities. Each type has its own
 * cap based on the skills the player has learned.
 */

/**
 * All available XP types in the game
 */
export const XpType = {
  // Combat XP Types
  /** General combat experience from any combat action */
  COMBAT_GENERAL: 'combat_general',
  /** Melee weapon combat experience */
  COMBAT_MELEE: 'combat_melee',
  /** Rifle ranged weapon experience */
  COMBAT_RANGED_RIFLE: 'combat_ranged_rifle',
  /** Pistol ranged weapon experience */
  COMBAT_RANGED_PISTOL: 'combat_ranged_pistol',
  /** Carbine ranged weapon experience */
  COMBAT_RANGED_CARBINE: 'combat_ranged_carbine',
  /** Heavy weapon experience (rocket launchers, etc.) */
  COMBAT_RANGED_HEAVY: 'combat_ranged_heavy',

  // Crafting XP Types
  /** General crafting experience */
  CRAFTING_GENERAL: 'crafting_general',
  /** Weapons crafting experience (weaponsmith) */
  CRAFTING_WEAPONS: 'crafting_weapons',
  /** Armor crafting experience (armorsmith) */
  CRAFTING_ARMOR: 'crafting_armor',
  /** Food and drink crafting experience (chef) */
  CRAFTING_FOOD: 'crafting_food',
  /** Clothing and fashion crafting experience (tailor) */
  CRAFTING_CLOTHING: 'crafting_clothing',
  /** Structure and furniture crafting experience (architect) */
  CRAFTING_STRUCTURE: 'crafting_structure',
  /** Droid crafting experience (droid engineer) */
  CRAFTING_DROID: 'crafting_droid',

  // Entertainer XP Types
  /** Dancing entertainment experience */
  ENTERTAINER_DANCE: 'entertainer_dance',
  /** Music entertainment experience */
  ENTERTAINER_MUSIC: 'entertainer_music',
  /** Entertainment healing experience (healing mind wounds) */
  ENTERTAINER_HEALING: 'entertainer_healing',

  // Medical XP Types
  /** Medical healing experience (doctor/medic) */
  MEDICAL: 'medical',

  // Scouting/Exploration XP Types
  /** Scout exploration experience */
  SCOUT: 'scout',
  /** Creature trapping experience */
  TRAPPING: 'trapping',

  // Special XP Types
  /** Jedi force-sensitive experience */
  JEDI_GENERAL: 'jedi_general',
  /** Political/faction experience */
  POLITICAL: 'political',
  /** Bio-engineering experience */
  BIO_ENGINEER: 'bio_engineer',

  // Space Combat XP Types (JTL)
  /** Starship piloting experience */
  SPACE_GENERAL: 'space_general',
  /** Starship combat experience */
  SPACE_COMBAT: 'space_combat',

  // Resource Gathering XP Types
  /** Surveying for resources experience */
  SURVEYING: 'surveying',

  // Slicing XP Types
  /** Slicing (hacking) experience */
  SLICING: 'slicing',

  // Creature Handler XP Types
  /** Creature handling experience */
  CREATURE_HANDLER: 'creature_handler',

  // Bounty Hunter XP Types
  /** Bounty hunting experience */
  BOUNTY_HUNTER: 'bounty_hunter',

  // Squad Leader XP Types
  /** Squad leadership experience */
  SQUAD_LEADER: 'squad_leader',

  // Smuggler XP Types
  /** Smuggling experience */
  SMUGGLER: 'smuggler',

  // Commando XP Types
  /** Commando heavy weapons experience */
  COMMANDO: 'commando',

  // Image Designer XP Types
  /** Image design experience */
  IMAGE_DESIGN: 'image_design',
} as const;

/**
 * Type for XP type string values
 */
export type XpTypeValue = (typeof XpType)[keyof typeof XpType];

/**
 * XP type to category mapping for UI grouping
 */
export const XpCategory = {
  COMBAT: 'combat',
  CRAFTING: 'crafting',
  ENTERTAINER: 'entertainer',
  MEDICAL: 'medical',
  EXPLORATION: 'exploration',
  SPECIAL: 'special',
  SPACE: 'space',
} as const;

export type XpCategoryValue = (typeof XpCategory)[keyof typeof XpCategory];

/**
 * Maps XP types to their categories
 */
export const XpTypeCategories: Record<XpTypeValue, XpCategoryValue> = {
  // Combat
  [XpType.COMBAT_GENERAL]: XpCategory.COMBAT,
  [XpType.COMBAT_MELEE]: XpCategory.COMBAT,
  [XpType.COMBAT_RANGED_RIFLE]: XpCategory.COMBAT,
  [XpType.COMBAT_RANGED_PISTOL]: XpCategory.COMBAT,
  [XpType.COMBAT_RANGED_CARBINE]: XpCategory.COMBAT,
  [XpType.COMBAT_RANGED_HEAVY]: XpCategory.COMBAT,
  [XpType.BOUNTY_HUNTER]: XpCategory.COMBAT,
  [XpType.SQUAD_LEADER]: XpCategory.COMBAT,
  [XpType.COMMANDO]: XpCategory.COMBAT,

  // Crafting
  [XpType.CRAFTING_GENERAL]: XpCategory.CRAFTING,
  [XpType.CRAFTING_WEAPONS]: XpCategory.CRAFTING,
  [XpType.CRAFTING_ARMOR]: XpCategory.CRAFTING,
  [XpType.CRAFTING_FOOD]: XpCategory.CRAFTING,
  [XpType.CRAFTING_CLOTHING]: XpCategory.CRAFTING,
  [XpType.CRAFTING_STRUCTURE]: XpCategory.CRAFTING,
  [XpType.CRAFTING_DROID]: XpCategory.CRAFTING,
  [XpType.BIO_ENGINEER]: XpCategory.CRAFTING,

  // Entertainer
  [XpType.ENTERTAINER_DANCE]: XpCategory.ENTERTAINER,
  [XpType.ENTERTAINER_MUSIC]: XpCategory.ENTERTAINER,
  [XpType.ENTERTAINER_HEALING]: XpCategory.ENTERTAINER,
  [XpType.IMAGE_DESIGN]: XpCategory.ENTERTAINER,

  // Medical
  [XpType.MEDICAL]: XpCategory.MEDICAL,

  // Exploration
  [XpType.SCOUT]: XpCategory.EXPLORATION,
  [XpType.TRAPPING]: XpCategory.EXPLORATION,
  [XpType.SURVEYING]: XpCategory.EXPLORATION,
  [XpType.CREATURE_HANDLER]: XpCategory.EXPLORATION,

  // Special
  [XpType.JEDI_GENERAL]: XpCategory.SPECIAL,
  [XpType.POLITICAL]: XpCategory.SPECIAL,
  [XpType.SLICING]: XpCategory.SPECIAL,
  [XpType.SMUGGLER]: XpCategory.SPECIAL,

  // Space
  [XpType.SPACE_GENERAL]: XpCategory.SPACE,
  [XpType.SPACE_COMBAT]: XpCategory.SPACE,
};

/**
 * Default XP caps for each type (before skill bonuses)
 * These are the base caps that can be increased by learning skills
 */
export const DefaultXpCaps: Record<XpTypeValue, number> = {
  // Combat - start with low caps, increase with combat skills
  [XpType.COMBAT_GENERAL]: 2000,
  [XpType.COMBAT_MELEE]: 2000,
  [XpType.COMBAT_RANGED_RIFLE]: 2000,
  [XpType.COMBAT_RANGED_PISTOL]: 2000,
  [XpType.COMBAT_RANGED_CARBINE]: 2000,
  [XpType.COMBAT_RANGED_HEAVY]: 2000,
  [XpType.BOUNTY_HUNTER]: 2000,
  [XpType.SQUAD_LEADER]: 2000,
  [XpType.COMMANDO]: 2000,

  // Crafting
  [XpType.CRAFTING_GENERAL]: 2000,
  [XpType.CRAFTING_WEAPONS]: 2000,
  [XpType.CRAFTING_ARMOR]: 2000,
  [XpType.CRAFTING_FOOD]: 2000,
  [XpType.CRAFTING_CLOTHING]: 2000,
  [XpType.CRAFTING_STRUCTURE]: 2000,
  [XpType.CRAFTING_DROID]: 2000,
  [XpType.BIO_ENGINEER]: 2000,

  // Entertainer
  [XpType.ENTERTAINER_DANCE]: 2000,
  [XpType.ENTERTAINER_MUSIC]: 2000,
  [XpType.ENTERTAINER_HEALING]: 2000,
  [XpType.IMAGE_DESIGN]: 2000,

  // Medical
  [XpType.MEDICAL]: 2000,

  // Exploration
  [XpType.SCOUT]: 2000,
  [XpType.TRAPPING]: 2000,
  [XpType.SURVEYING]: 2000,
  [XpType.CREATURE_HANDLER]: 2000,

  // Special
  [XpType.JEDI_GENERAL]: 0, // No default cap - requires special unlocks
  [XpType.POLITICAL]: 2000,
  [XpType.SLICING]: 2000,
  [XpType.SMUGGLER]: 2000,

  // Space
  [XpType.SPACE_GENERAL]: 2000,
  [XpType.SPACE_COMBAT]: 2000,
};

/**
 * Check if a string is a valid XP type
 */
export function isValidXpType(type: string): type is XpTypeValue {
  return Object.values(XpType).includes(type as XpTypeValue);
}

/**
 * Get the category for an XP type
 */
export function getXpCategory(type: XpTypeValue): XpCategoryValue {
  return XpTypeCategories[type];
}

/**
 * Get all XP types in a category
 */
export function getXpTypesInCategory(category: XpCategoryValue): XpTypeValue[] {
  return Object.entries(XpTypeCategories)
    .filter(([_, cat]) => cat === category)
    .map(([type, _]) => type as XpTypeValue);
}

/**
 * Get the display name for an XP type
 */
export function getXpTypeDisplayName(type: XpTypeValue): string {
  // Convert snake_case to Title Case
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
