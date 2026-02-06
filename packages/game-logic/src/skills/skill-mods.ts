/**
 * Skill Mod Definitions
 * All skill modifier names used in SWG skill system
 */

/**
 * Combat skill mods - Ranged
 */
export const RangedCombatMods = {
  /** General ranged accuracy bonus */
  RANGED_ACCURACY: 'ranged_accuracy',
  /** Rifle-specific accuracy */
  RIFLE_ACCURACY: 'rifle_accuracy',
  /** Pistol-specific accuracy */
  PISTOL_ACCURACY: 'pistol_accuracy',
  /** Carbine-specific accuracy */
  CARBINE_ACCURACY: 'carbine_accuracy',
  /** Heavy weapon accuracy */
  HEAVY_WEAPON_ACCURACY: 'heavy_weapon_accuracy',
  /** Ranged speed modifier */
  RANGED_SPEED: 'ranged_speed',
  /** Rifle speed modifier */
  RIFLE_SPEED: 'rifle_speed',
  /** Pistol speed modifier */
  PISTOL_SPEED: 'pistol_speed',
  /** Carbine speed modifier */
  CARBINE_SPEED: 'carbine_speed',
  /** Heavy weapon speed modifier */
  HEAVY_WEAPON_SPEED: 'heavy_weapon_speed',
  /** General ranged defense */
  RANGED_DEFENSE: 'ranged_defense',
} as const;

/**
 * Combat skill mods - Melee
 */
export const MeleeCombatMods = {
  /** General melee accuracy */
  MELEE_ACCURACY: 'melee_accuracy',
  /** Unarmed accuracy */
  UNARMED_ACCURACY: 'unarmed_accuracy',
  /** One-handed weapon accuracy */
  ONEHAND_ACCURACY: 'onehand_accuracy',
  /** Two-handed weapon accuracy */
  TWOHAND_ACCURACY: 'twohand_accuracy',
  /** Polearm accuracy */
  POLEARM_ACCURACY: 'polearm_accuracy',
  /** General melee defense */
  MELEE_DEFENSE: 'melee_defense',
  /** Unarmed defense */
  UNARMED_DEFENSE: 'unarmed_defense',
  /** Melee speed modifier */
  MELEE_SPEED: 'melee_speed',
  /** Unarmed speed modifier */
  UNARMED_SPEED: 'unarmed_speed',
  /** One-handed speed modifier */
  ONEHAND_SPEED: 'onehand_speed',
  /** Two-handed speed modifier */
  TWOHAND_SPEED: 'twohand_speed',
  /** Polearm speed modifier */
  POLEARM_SPEED: 'polearm_speed',
} as const;

/**
 * Combat skill mods - General
 */
export const GeneralCombatMods = {
  /** Bonus damage */
  DAMAGE_BONUS: 'damage_bonus',
  /** Critical hit chance */
  CRITICAL_CHANCE: 'critical_chance',
  /** Critical damage multiplier */
  CRITICAL_DAMAGE: 'critical_damage',
  /** Armor penetration */
  ARMOR_PIERCE: 'armor_pierce',
  /** Knockdown recovery */
  KNOCKDOWN_RECOVERY: 'knockdown_recovery',
  /** Stun resistance */
  STUN_RESISTANCE: 'stun_resistance',
  /** Blind defense */
  BLIND_DEFENSE: 'blind_defense',
  /** Dizzy defense */
  DIZZY_DEFENSE: 'dizzy_defense',
  /** Intimidate defense */
  INTIMIDATE_DEFENSE: 'intimidate_defense',
  /** Posture change down defense */
  POSTURE_CHANGE_DOWN_DEFENSE: 'posture_change_down_defense',
  /** Posture change up defense */
  POSTURE_CHANGE_UP_DEFENSE: 'posture_change_up_defense',
  /** Combat equilibrium */
  COMBAT_EQUILIBRIUM: 'combat_equilibrium',
} as const;

/**
 * Medical skill mods
 */
export const MedicalMods = {
  /** Healing ability modifier */
  HEALING_ABILITY: 'healing_ability',
  /** Healing range */
  HEALING_RANGE: 'healing_range',
  /** Healing speed */
  HEALING_SPEED: 'healing_speed',
  /** Wound healing ability */
  HEALING_WOUND: 'healing_wound',
  /** Injury treatment speed */
  INJURY_TREATMENT_SPEED: 'injury_treatment_speed',
  /** Medical use speed */
  MEDICAL_USE_SPEED: 'medical_use_speed',
  /** Buff health pool */
  BUFF_HEALTH: 'buff_health',
  /** Buff action pool */
  BUFF_ACTION: 'buff_action',
  /** Buff mind pool */
  BUFF_MIND: 'buff_mind',
  /** Medicine crafting */
  MEDICINE_ASSEMBLY: 'medicine_assembly',
  /** Medicine experimentation */
  MEDICINE_EXPERIMENTATION: 'medicine_experimentation',
} as const;

/**
 * Crafting skill mods - General
 */
export const CraftingMods = {
  /** General assembly bonus */
  ASSEMBLY: 'assembly',
  /** General experimentation bonus */
  EXPERIMENTATION: 'experimentation',
  /** Reverse engineering */
  REVERSE_ENGINEERING: 'reverse_engineering',
  /** Survey range */
  SURVEY: 'survey',
  /** Resource sampling */
  SAMPLING: 'sampling',
} as const;

/**
 * Crafting skill mods - Specialized
 */
export const SpecializedCraftingMods = {
  /** Weapon assembly */
  WEAPON_ASSEMBLY: 'weapon_assembly',
  /** Weapon experimentation */
  WEAPON_EXPERIMENTATION: 'weapon_experimentation',
  /** Armor assembly */
  ARMOR_ASSEMBLY: 'armor_assembly',
  /** Armor experimentation */
  ARMOR_EXPERIMENTATION: 'armor_experimentation',
  /** Clothing assembly */
  CLOTHING_ASSEMBLY: 'clothing_assembly',
  /** Clothing experimentation */
  CLOTHING_EXPERIMENTATION: 'clothing_experimentation',
  /** Droid assembly */
  DROID_ASSEMBLY: 'droid_assembly',
  /** Droid experimentation */
  DROID_EXPERIMENTATION: 'droid_experimentation',
  /** Food assembly */
  FOOD_ASSEMBLY: 'food_assembly',
  /** Food experimentation */
  FOOD_EXPERIMENTATION: 'food_experimentation',
  /** Structure assembly */
  STRUCTURE_ASSEMBLY: 'structure_assembly',
  /** Structure experimentation */
  STRUCTURE_EXPERIMENTATION: 'structure_experimentation',
  /** Ship component assembly */
  SHIP_ASSEMBLY: 'ship_assembly',
  /** Ship component experimentation */
  SHIP_EXPERIMENTATION: 'ship_experimentation',
} as const;

/**
 * Entertainer skill mods
 */
export const EntertainerMods = {
  /** Dancing skill */
  DANCING: 'dancing',
  /** Music skill */
  MUSIC: 'music',
  /** Wound healing from entertainment */
  ENTERTAINMENT_WOUND_HEALING: 'entertainment_wound_healing',
  /** Battle fatigue healing */
  ENTERTAINMENT_FATIGUE_HEALING: 'entertainment_fatigue_healing',
  /** Buff effectiveness */
  ENTERTAINMENT_BUFF: 'entertainment_buff',
  /** Image designer skill */
  IMAGE_DESIGN: 'image_design',
  /** Color customization */
  COLOR_CUSTOMIZATION: 'color_customization',
  /** Hair styling */
  HAIR_STYLING: 'hair_styling',
  /** Body customization */
  BODY_CUSTOMIZATION: 'body_customization',
  /** Face customization */
  FACE_CUSTOMIZATION: 'face_customization',
} as const;

/**
 * Scout/Survival skill mods
 */
export const ScoutMods = {
  /** Camping ability */
  CAMP: 'camp',
  /** Foraging ability */
  FORAGING: 'foraging',
  /** Mask scent */
  MASK_SCENT: 'mask_scent',
  /** Trapping ability */
  TRAPPING: 'trapping',
  /** Creature harvesting */
  CREATURE_HARVESTING: 'creature_harvesting',
  /** Creature taming */
  CREATURE_TAMING: 'creature_taming',
  /** Pet command */
  CREATURE_COMMAND: 'creature_command',
  /** Terrain negotiation */
  TERRAIN_NEGOTIATION: 'terrain_negotiation',
  /** Burst run efficiency */
  BURST_RUN: 'burst_run',
} as const;

/**
 * HAM (Health/Action/Mind) pool mods
 */
export const HamMods = {
  /** Health pool modifier */
  HEALTH: 'health',
  /** Strength pool modifier */
  STRENGTH: 'strength',
  /** Constitution pool modifier */
  CONSTITUTION: 'constitution',
  /** Action pool modifier */
  ACTION: 'action',
  /** Quickness pool modifier */
  QUICKNESS: 'quickness',
  /** Stamina pool modifier */
  STAMINA: 'stamina',
  /** Mind pool modifier */
  MIND: 'mind',
  /** Focus pool modifier */
  FOCUS: 'focus',
  /** Willpower pool modifier */
  WILLPOWER: 'willpower',
} as const;

/**
 * Force skill mods (Jedi)
 */
export const ForceMods = {
  /** Force power */
  FORCE_POWER: 'force_power',
  /** Force control */
  FORCE_CONTROL: 'force_control',
  /** Lightsaber accuracy */
  LIGHTSABER_ACCURACY: 'lightsaber_accuracy',
  /** Lightsaber defense */
  LIGHTSABER_DEFENSE: 'lightsaber_defense',
  /** Force healing */
  FORCE_HEALING: 'force_healing',
  /** Force defense */
  FORCE_DEFENSE: 'force_defense',
  /** Force run speed */
  FORCE_RUN_SPEED: 'force_run_speed',
} as const;

/**
 * Slicing skill mods
 */
export const SlicingMods = {
  /** Terminal slicing */
  TERMINAL_SLICING: 'terminal_slicing',
  /** Weapon slicing */
  WEAPON_SLICING: 'weapon_slicing',
  /** Armor slicing */
  ARMOR_SLICING: 'armor_slicing',
  /** Droid slicing */
  DROID_SLICING: 'droid_slicing',
} as const;

/**
 * All skill mods combined
 */
export const SkillMods = {
  ...RangedCombatMods,
  ...MeleeCombatMods,
  ...GeneralCombatMods,
  ...MedicalMods,
  ...CraftingMods,
  ...SpecializedCraftingMods,
  ...EntertainerMods,
  ...ScoutMods,
  ...HamMods,
  ...ForceMods,
  ...SlicingMods,
} as const;

export type SkillModName = (typeof SkillMods)[keyof typeof SkillMods];

/**
 * Skill mod category for organization
 */
export type SkillModCategory =
  | 'ranged_combat'
  | 'melee_combat'
  | 'general_combat'
  | 'medical'
  | 'crafting'
  | 'specialized_crafting'
  | 'entertainer'
  | 'scout'
  | 'ham'
  | 'force'
  | 'slicing';

/**
 * Get the category of a skill mod
 */
export function getSkillModCategory(modName: string): SkillModCategory | null {
  if ((Object.values(RangedCombatMods) as string[]).includes(modName)) {
    return 'ranged_combat';
  }
  if ((Object.values(MeleeCombatMods) as string[]).includes(modName)) {
    return 'melee_combat';
  }
  if ((Object.values(GeneralCombatMods) as string[]).includes(modName)) {
    return 'general_combat';
  }
  if ((Object.values(MedicalMods) as string[]).includes(modName)) {
    return 'medical';
  }
  if ((Object.values(CraftingMods) as string[]).includes(modName)) {
    return 'crafting';
  }
  if ((Object.values(SpecializedCraftingMods) as string[]).includes(modName)) {
    return 'specialized_crafting';
  }
  if ((Object.values(EntertainerMods) as string[]).includes(modName)) {
    return 'entertainer';
  }
  if ((Object.values(ScoutMods) as string[]).includes(modName)) {
    return 'scout';
  }
  if ((Object.values(HamMods) as string[]).includes(modName)) {
    return 'ham';
  }
  if ((Object.values(ForceMods) as string[]).includes(modName)) {
    return 'force';
  }
  if ((Object.values(SlicingMods) as string[]).includes(modName)) {
    return 'slicing';
  }
  return null;
}

/**
 * Check if a string is a valid skill mod name
 */
export function isValidSkillMod(modName: string): modName is SkillModName {
  return Object.values(SkillMods).includes(modName as SkillModName);
}

/**
 * Get all skill mods in a category
 */
export function getSkillModsByCategory(category: SkillModCategory): string[] {
  switch (category) {
    case 'ranged_combat':
      return Object.values(RangedCombatMods);
    case 'melee_combat':
      return Object.values(MeleeCombatMods);
    case 'general_combat':
      return Object.values(GeneralCombatMods);
    case 'medical':
      return Object.values(MedicalMods);
    case 'crafting':
      return Object.values(CraftingMods);
    case 'specialized_crafting':
      return Object.values(SpecializedCraftingMods);
    case 'entertainer':
      return Object.values(EntertainerMods);
    case 'scout':
      return Object.values(ScoutMods);
    case 'ham':
      return Object.values(HamMods);
    case 'force':
      return Object.values(ForceMods);
    case 'slicing':
      return Object.values(SlicingMods);
  }
}
