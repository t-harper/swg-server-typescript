/**
 * @file experimentation-skills.ts
 * Maps profession skills to experimentation bonuses in SWG
 *
 * Each crafting profession has specific experimentation skills that
 * affect their ability to improve items during the experimentation phase.
 */

import type { ExperimentationModifiers } from './experimentation-types.js';

/**
 * Crafting profession types for experimentation
 */
export enum CraftingProfession {
  Artisan = 'artisan',
  Weaponsmith = 'weaponsmith',
  Armorsmith = 'armorsmith',
  Chef = 'chef',
  Tailor = 'tailor',
  Architect = 'architect',
  DroidEngineer = 'droid_engineer',
  BioEngineer = 'bio_engineer',
  Shipwright = 'shipwright',
  Merchant = 'merchant',
}

/**
 * Skill mod names used for experimentation
 */
export const ExperimentationSkillMods = {
  /** General experimentation skill */
  experimentationGeneral: 'experimentation',

  /** Weaponsmith experimentation */
  weaponExperimentation: 'weapon_experimentation',

  /** Armorsmith experimentation */
  armorExperimentation: 'armor_experimentation',

  /** Chef experimentation */
  foodExperimentation: 'food_experimentation',

  /** Tailor experimentation */
  clothingExperimentation: 'clothing_experimentation',

  /** Architect experimentation */
  structureExperimentation: 'structure_experimentation',

  /** Droid engineer experimentation */
  droidExperimentation: 'droid_experimentation',

  /** Bio-engineer experimentation */
  bioExperimentation: 'bio_experimentation',

  /** Shipwright experimentation */
  shipExperimentation: 'ship_experimentation',

  /** General assembly (affects base quality) */
  assemblyGeneral: 'assembly',

  /** Tool effectiveness bonus */
  toolEffectiveness: 'crafting_tool_effectiveness',
} as const;

/**
 * Skill box definitions that grant experimentation bonuses
 */
export interface ExperimentationSkillBox {
  /** Skill box name */
  skillName: string;

  /** Profession this skill belongs to */
  profession: CraftingProfession;

  /** General experimentation bonus */
  experimentationBonus: number;

  /** Profession-specific experimentation bonus */
  professionExperimentationBonus: number;

  /** Assembly bonus */
  assemblyBonus: number;

  /** Whether this is a master box */
  isMaster: boolean;
}

/**
 * Map of skill box names to their experimentation bonuses
 */
export const EXPERIMENTATION_SKILL_BOXES: Record<string, ExperimentationSkillBox> = {
  // Artisan skills
  crafting_artisan_novice: {
    skillName: 'crafting_artisan_novice',
    profession: CraftingProfession.Artisan,
    experimentationBonus: 5,
    professionExperimentationBonus: 0,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_artisan_engineering_01: {
    skillName: 'crafting_artisan_engineering_01',
    profession: CraftingProfession.Artisan,
    experimentationBonus: 5,
    professionExperimentationBonus: 0,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_artisan_engineering_02: {
    skillName: 'crafting_artisan_engineering_02',
    profession: CraftingProfession.Artisan,
    experimentationBonus: 5,
    professionExperimentationBonus: 0,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_artisan_engineering_03: {
    skillName: 'crafting_artisan_engineering_03',
    profession: CraftingProfession.Artisan,
    experimentationBonus: 10,
    professionExperimentationBonus: 0,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_artisan_engineering_04: {
    skillName: 'crafting_artisan_engineering_04',
    profession: CraftingProfession.Artisan,
    experimentationBonus: 10,
    professionExperimentationBonus: 0,
    assemblyBonus: 10,
    isMaster: false,
  },

  // Weaponsmith skills
  crafting_weaponsmith_novice: {
    skillName: 'crafting_weaponsmith_novice',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_weaponsmith_melee_01: {
    skillName: 'crafting_weaponsmith_melee_01',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_weaponsmith_melee_02: {
    skillName: 'crafting_weaponsmith_melee_02',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_weaponsmith_melee_03: {
    skillName: 'crafting_weaponsmith_melee_03',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_weaponsmith_melee_04: {
    skillName: 'crafting_weaponsmith_melee_04',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_weaponsmith_ranged_01: {
    skillName: 'crafting_weaponsmith_ranged_01',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_weaponsmith_ranged_02: {
    skillName: 'crafting_weaponsmith_ranged_02',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_weaponsmith_ranged_03: {
    skillName: 'crafting_weaponsmith_ranged_03',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_weaponsmith_ranged_04: {
    skillName: 'crafting_weaponsmith_ranged_04',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_weaponsmith_master: {
    skillName: 'crafting_weaponsmith_master',
    profession: CraftingProfession.Weaponsmith,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },

  // Armorsmith skills
  crafting_armorsmith_novice: {
    skillName: 'crafting_armorsmith_novice',
    profession: CraftingProfession.Armorsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_armorsmith_personal_01: {
    skillName: 'crafting_armorsmith_personal_01',
    profession: CraftingProfession.Armorsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_armorsmith_personal_02: {
    skillName: 'crafting_armorsmith_personal_02',
    profession: CraftingProfession.Armorsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_armorsmith_personal_03: {
    skillName: 'crafting_armorsmith_personal_03',
    profession: CraftingProfession.Armorsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_armorsmith_personal_04: {
    skillName: 'crafting_armorsmith_personal_04',
    profession: CraftingProfession.Armorsmith,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_armorsmith_master: {
    skillName: 'crafting_armorsmith_master',
    profession: CraftingProfession.Armorsmith,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },

  // Chef skills
  crafting_chef_novice: {
    skillName: 'crafting_chef_novice',
    profession: CraftingProfession.Chef,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_chef_desserts_01: {
    skillName: 'crafting_chef_desserts_01',
    profession: CraftingProfession.Chef,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_chef_desserts_02: {
    skillName: 'crafting_chef_desserts_02',
    profession: CraftingProfession.Chef,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_chef_desserts_03: {
    skillName: 'crafting_chef_desserts_03',
    profession: CraftingProfession.Chef,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_chef_desserts_04: {
    skillName: 'crafting_chef_desserts_04',
    profession: CraftingProfession.Chef,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_chef_master: {
    skillName: 'crafting_chef_master',
    profession: CraftingProfession.Chef,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },

  // Tailor skills
  crafting_tailor_novice: {
    skillName: 'crafting_tailor_novice',
    profession: CraftingProfession.Tailor,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_tailor_casual_01: {
    skillName: 'crafting_tailor_casual_01',
    profession: CraftingProfession.Tailor,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_tailor_casual_02: {
    skillName: 'crafting_tailor_casual_02',
    profession: CraftingProfession.Tailor,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_tailor_casual_03: {
    skillName: 'crafting_tailor_casual_03',
    profession: CraftingProfession.Tailor,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_tailor_casual_04: {
    skillName: 'crafting_tailor_casual_04',
    profession: CraftingProfession.Tailor,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_tailor_master: {
    skillName: 'crafting_tailor_master',
    profession: CraftingProfession.Tailor,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },

  // Architect skills
  crafting_architect_novice: {
    skillName: 'crafting_architect_novice',
    profession: CraftingProfession.Architect,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_architect_installations_01: {
    skillName: 'crafting_architect_installations_01',
    profession: CraftingProfession.Architect,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_architect_installations_02: {
    skillName: 'crafting_architect_installations_02',
    profession: CraftingProfession.Architect,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_architect_installations_03: {
    skillName: 'crafting_architect_installations_03',
    profession: CraftingProfession.Architect,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_architect_installations_04: {
    skillName: 'crafting_architect_installations_04',
    profession: CraftingProfession.Architect,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_architect_master: {
    skillName: 'crafting_architect_master',
    profession: CraftingProfession.Architect,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },

  // Droid Engineer skills
  crafting_droid_engineer_novice: {
    skillName: 'crafting_droid_engineer_novice',
    profession: CraftingProfession.DroidEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_droid_engineer_combat_01: {
    skillName: 'crafting_droid_engineer_combat_01',
    profession: CraftingProfession.DroidEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_droid_engineer_combat_02: {
    skillName: 'crafting_droid_engineer_combat_02',
    profession: CraftingProfession.DroidEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_droid_engineer_combat_03: {
    skillName: 'crafting_droid_engineer_combat_03',
    profession: CraftingProfession.DroidEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  crafting_droid_engineer_combat_04: {
    skillName: 'crafting_droid_engineer_combat_04',
    profession: CraftingProfession.DroidEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  crafting_droid_engineer_master: {
    skillName: 'crafting_droid_engineer_master',
    profession: CraftingProfession.DroidEngineer,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },

  // Bio-Engineer skills
  science_bio_engineer_novice: {
    skillName: 'science_bio_engineer_novice',
    profession: CraftingProfession.BioEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 10,
    isMaster: false,
  },
  science_bio_engineer_engineering_01: {
    skillName: 'science_bio_engineer_engineering_01',
    profession: CraftingProfession.BioEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  science_bio_engineer_engineering_02: {
    skillName: 'science_bio_engineer_engineering_02',
    profession: CraftingProfession.BioEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 5,
    assemblyBonus: 5,
    isMaster: false,
  },
  science_bio_engineer_engineering_03: {
    skillName: 'science_bio_engineer_engineering_03',
    profession: CraftingProfession.BioEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 10,
    assemblyBonus: 5,
    isMaster: false,
  },
  science_bio_engineer_engineering_04: {
    skillName: 'science_bio_engineer_engineering_04',
    profession: CraftingProfession.BioEngineer,
    experimentationBonus: 0,
    professionExperimentationBonus: 15,
    assemblyBonus: 10,
    isMaster: false,
  },
  science_bio_engineer_master: {
    skillName: 'science_bio_engineer_master',
    profession: CraftingProfession.BioEngineer,
    experimentationBonus: 10,
    professionExperimentationBonus: 25,
    assemblyBonus: 15,
    isMaster: true,
  },
};

/**
 * Map profession to its experimentation skill mod name
 */
export const PROFESSION_EXPERIMENTATION_MODS: Record<CraftingProfession, string> = {
  [CraftingProfession.Artisan]: ExperimentationSkillMods.experimentationGeneral,
  [CraftingProfession.Weaponsmith]: ExperimentationSkillMods.weaponExperimentation,
  [CraftingProfession.Armorsmith]: ExperimentationSkillMods.armorExperimentation,
  [CraftingProfession.Chef]: ExperimentationSkillMods.foodExperimentation,
  [CraftingProfession.Tailor]: ExperimentationSkillMods.clothingExperimentation,
  [CraftingProfession.Architect]: ExperimentationSkillMods.structureExperimentation,
  [CraftingProfession.DroidEngineer]: ExperimentationSkillMods.droidExperimentation,
  [CraftingProfession.BioEngineer]: ExperimentationSkillMods.bioExperimentation,
  [CraftingProfession.Shipwright]: ExperimentationSkillMods.shipExperimentation,
  [CraftingProfession.Merchant]: ExperimentationSkillMods.experimentationGeneral,
};

/**
 * Map schematic XP type to crafting profession
 */
export const XP_TYPE_TO_PROFESSION: Record<string, CraftingProfession> = {
  crafting_weapons_general: CraftingProfession.Weaponsmith,
  crafting_armor_general: CraftingProfession.Armorsmith,
  crafting_food_general: CraftingProfession.Chef,
  crafting_clothing_general: CraftingProfession.Tailor,
  crafting_structure_general: CraftingProfession.Architect,
  crafting_droid_general: CraftingProfession.DroidEngineer,
  crafting_bio_engineer_creature: CraftingProfession.BioEngineer,
  crafting_space_ship: CraftingProfession.Shipwright,
  crafting_general: CraftingProfession.Artisan,
  crafting_medicine_general: CraftingProfession.Chef, // Medicine uses chef-like skills
};

/**
 * Get the profession for a schematic XP type
 */
export function getProfessionForXpType(xpType: string): CraftingProfession {
  return XP_TYPE_TO_PROFESSION[xpType] ?? CraftingProfession.Artisan;
}

/**
 * Get the experimentation skill mod name for a profession
 */
export function getExperimentationModForProfession(profession: CraftingProfession): string {
  return PROFESSION_EXPERIMENTATION_MODS[profession];
}

/**
 * Player skill data needed for experimentation calculations
 */
export interface PlayerSkillData {
  /** Set of skill box names the player has */
  skills: Set<string>;

  /** Map of skill mod name to value */
  skillMods: Map<string, number>;

  /** Skill tape bonuses (name to value) */
  skillTapeBonuses: Map<string, number>;
}

/**
 * Calculate experimentation modifiers from player skills
 *
 * @param playerSkills - The player's skill data
 * @param profession - The crafting profession being used
 * @param toolBonus - Bonus from the crafting tool
 * @param stationBonus - Bonus from the crafting station
 * @param buffBonus - Bonus from active buffs
 * @returns Complete experimentation modifiers
 */
export function calculateExperimentationModifiers(
  playerSkills: PlayerSkillData,
  profession: CraftingProfession,
  toolBonus: number = 0,
  stationBonus: number = 0,
  buffBonus: number = 0
): ExperimentationModifiers {
  // Get general experimentation skill
  const experimentationGeneral =
    playerSkills.skillMods.get(ExperimentationSkillMods.experimentationGeneral) ?? 0;

  // Get profession-specific experimentation skill
  const professionModName = PROFESSION_EXPERIMENTATION_MODS[profession];
  const experimentationBonus = playerSkills.skillMods.get(professionModName) ?? 0;

  // Calculate base skill from skill boxes
  let baseSkill = 0;
  let professionSkill = 0;

  for (const skillName of playerSkills.skills) {
    const skillBox = EXPERIMENTATION_SKILL_BOXES[skillName];
    if (skillBox) {
      baseSkill += skillBox.experimentationBonus;
      if (skillBox.profession === profession) {
        professionSkill += skillBox.professionExperimentationBonus;
      }
    }
  }

  // Get skill tape bonus
  const skillTapeBonus = playerSkills.skillTapeBonuses.get(professionModName) ?? 0;

  // Calculate effective skill
  // Formula: base + profession + general_mod + profession_mod + tape + tool + station + buff
  const effectiveSkill = Math.min(
    140, // Cap at 140
    baseSkill +
      professionSkill +
      experimentationGeneral +
      experimentationBonus +
      skillTapeBonus +
      toolBonus +
      stationBonus +
      buffBonus
  );

  return {
    baseSkill,
    professionSkill,
    skillTapeBonus,
    toolBonus,
    stationBonus,
    buffBonus,
    experimentationGeneral,
    experimentationBonus,
    effectiveSkill,
  };
}

/**
 * Get the experimentation bonus from a specific skill box
 */
export function getSkillBoxExperimentationBonus(skillName: string): number {
  const skillBox = EXPERIMENTATION_SKILL_BOXES[skillName];
  if (!skillBox) {
    return 0;
  }
  return skillBox.experimentationBonus + skillBox.professionExperimentationBonus;
}

/**
 * Check if a player has master-level experimentation for a profession
 */
export function hasMasterExperimentation(
  playerSkills: PlayerSkillData,
  profession: CraftingProfession
): boolean {
  for (const skillName of playerSkills.skills) {
    const skillBox = EXPERIMENTATION_SKILL_BOXES[skillName];
    if (skillBox && skillBox.profession === profession && skillBox.isMaster) {
      return true;
    }
  }
  return false;
}

/**
 * Get all experimentation-related skill boxes a player has
 */
export function getPlayerExperimentationSkills(
  playerSkills: PlayerSkillData
): ExperimentationSkillBox[] {
  const result: ExperimentationSkillBox[] = [];

  for (const skillName of playerSkills.skills) {
    const skillBox = EXPERIMENTATION_SKILL_BOXES[skillName];
    if (skillBox) {
      result.push(skillBox);
    }
  }

  return result;
}
