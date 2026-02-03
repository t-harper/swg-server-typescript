/**
 * Profession Definitions
 * Defines starting professions and profession requirements for SWG
 */

import { Species } from './skill-template.js';

/**
 * Basic profession categories
 */
export const ProfessionCategory = {
  /** Combat-focused professions */
  COMBAT: 'combat',
  /** Crafting and artisan professions */
  CRAFTING: 'crafting',
  /** Entertainment professions */
  ENTERTAINMENT: 'entertainment',
  /** Medical/healing professions */
  MEDICAL: 'medical',
  /** Outdoor/survival professions */
  OUTDOORS: 'outdoors',
  /** Underworld/covert professions */
  COVERT: 'covert',
  /** Force-sensitive professions */
  FORCE: 'force',
} as const;

export type ProfessionCategory = (typeof ProfessionCategory)[keyof typeof ProfessionCategory];

/**
 * Starting profession definition
 */
export interface StartingProfession {
  /** Profession identifier */
  name: string;
  /** Display name */
  displayName: string;
  /** Category of profession */
  category: ProfessionCategory;
  /** Description shown to players */
  description: string;
  /** Novice skill granted at start */
  noviceSkill: string;
  /** Master skill name */
  masterSkill: string;
  /** Recommended species for this profession */
  recommendedSpecies: string[];
  /** Restricted species (cannot start as this profession) */
  restrictedSpecies: string[];
  /** Related advanced professions */
  advancedProfessions: string[];
  /** Starting equipment template */
  startingEquipment: string[];
}

/**
 * Combat professions
 */
export const CombatProfessions: Record<string, StartingProfession> = {
  marksman: {
    name: 'marksman',
    displayName: 'Marksman',
    category: ProfessionCategory.COMBAT,
    description:
      'Marksmen specialize in ranged combat, using blasters and rifles to engage enemies from a distance.',
    noviceSkill: 'combat_marksman_novice',
    masterSkill: 'combat_marksman_master',
    recommendedSpecies: [Species.HUMAN, Species.RODIAN, Species.BOTHAN],
    restrictedSpecies: [],
    advancedProfessions: ['rifleman', 'pistoleer', 'carbineer', 'bounty_hunter', 'commando'],
    startingEquipment: ['cdef_pistol', 'basic_ammo'],
  },
  brawler: {
    name: 'brawler',
    displayName: 'Brawler',
    category: ProfessionCategory.COMBAT,
    description:
      'Brawlers excel in close combat, using fists, vibroblades, and other melee weapons.',
    noviceSkill: 'combat_brawler_novice',
    masterSkill: 'combat_brawler_master',
    recommendedSpecies: [Species.WOOKIEE, Species.TRANDOSHAN, Species.ZABRAK],
    restrictedSpecies: [],
    advancedProfessions: ['pikeman', 'swordsman', 'fencer', 'teras_kasi'],
    startingEquipment: ['basic_vibroblade'],
  },
};

/**
 * Advanced combat professions
 */
export const AdvancedCombatProfessions: Record<string, StartingProfession> = {
  rifleman: {
    name: 'rifleman',
    displayName: 'Rifleman',
    category: ProfessionCategory.COMBAT,
    description: 'Elite long-range specialists skilled with rifles.',
    noviceSkill: 'combat_rifleman_novice',
    masterSkill: 'combat_rifleman_master',
    recommendedSpecies: [Species.HUMAN, Species.RODIAN],
    restrictedSpecies: [],
    advancedProfessions: [],
    startingEquipment: [],
  },
  pistoleer: {
    name: 'pistoleer',
    displayName: 'Pistoleer',
    category: ProfessionCategory.COMBAT,
    description: 'Quick-drawing specialists proficient with pistols.',
    noviceSkill: 'combat_pistoleer_novice',
    masterSkill: 'combat_pistoleer_master',
    recommendedSpecies: [Species.HUMAN, Species.BOTHAN, Species.TWILEK],
    restrictedSpecies: [],
    advancedProfessions: [],
    startingEquipment: [],
  },
  carbineer: {
    name: 'carbineer',
    displayName: 'Carbineer',
    category: ProfessionCategory.COMBAT,
    description: 'Versatile combatants skilled with carbines.',
    noviceSkill: 'combat_carbineer_novice',
    masterSkill: 'combat_carbineer_master',
    recommendedSpecies: [Species.HUMAN, Species.RODIAN, Species.ZABRAK],
    restrictedSpecies: [],
    advancedProfessions: [],
    startingEquipment: [],
  },
};

/**
 * Medical professions
 */
export const MedicalProfessions: Record<string, StartingProfession> = {
  medic: {
    name: 'medic',
    displayName: 'Medic',
    category: ProfessionCategory.MEDICAL,
    description:
      'Medics provide healing and support to wounded allies on the battlefield and in cities.',
    noviceSkill: 'science_medic_novice',
    masterSkill: 'science_medic_master',
    recommendedSpecies: [Species.HUMAN, Species.ITHORIAN, Species.MON_CALAMARI],
    restrictedSpecies: [],
    advancedProfessions: ['doctor', 'combat_medic'],
    startingEquipment: ['basic_medpack', 'stimpak'],
  },
  doctor: {
    name: 'doctor',
    displayName: 'Doctor',
    category: ProfessionCategory.MEDICAL,
    description: 'Advanced medical specialists capable of treating wounds and diseases.',
    noviceSkill: 'science_doctor_novice',
    masterSkill: 'science_doctor_master',
    recommendedSpecies: [Species.HUMAN, Species.ITHORIAN, Species.MON_CALAMARI],
    restrictedSpecies: [],
    advancedProfessions: [],
    startingEquipment: [],
  },
  combat_medic: {
    name: 'combat_medic',
    displayName: 'Combat Medic',
    category: ProfessionCategory.MEDICAL,
    description: 'Battlefield medics combining combat skills with healing abilities.',
    noviceSkill: 'science_combatmedic_novice',
    masterSkill: 'science_combatmedic_master',
    recommendedSpecies: [Species.HUMAN, Species.ZABRAK],
    restrictedSpecies: [],
    advancedProfessions: [],
    startingEquipment: [],
  },
};

/**
 * Crafting professions
 */
export const CraftingProfessions: Record<string, StartingProfession> = {
  artisan: {
    name: 'artisan',
    displayName: 'Artisan',
    category: ProfessionCategory.CRAFTING,
    description:
      'Artisans are skilled crafters who can create a variety of useful items and structures.',
    noviceSkill: 'crafting_artisan_novice',
    masterSkill: 'crafting_artisan_master',
    recommendedSpecies: [Species.HUMAN, Species.SULLUSTAN, Species.MON_CALAMARI],
    restrictedSpecies: [],
    advancedProfessions: ['weaponsmith', 'armorsmith', 'tailor', 'chef', 'droid_engineer', 'architect'],
    startingEquipment: ['generic_crafting_tool', 'survey_tool'],
  },
};

/**
 * Entertainer professions
 */
export const EntertainerProfessions: Record<string, StartingProfession> = {
  entertainer: {
    name: 'entertainer',
    displayName: 'Entertainer',
    category: ProfessionCategory.ENTERTAINMENT,
    description:
      'Entertainers perform music and dance to heal the minds and spirits of weary travelers.',
    noviceSkill: 'social_entertainer_novice',
    masterSkill: 'social_entertainer_master',
    recommendedSpecies: [Species.TWILEK, Species.HUMAN, Species.BOTHAN],
    restrictedSpecies: [],
    advancedProfessions: ['dancer', 'musician', 'image_designer'],
    startingEquipment: ['basic_instrument', 'performer_outfit'],
  },
};

/**
 * Outdoors professions
 */
export const OutdoorProfessions: Record<string, StartingProfession> = {
  scout: {
    name: 'scout',
    displayName: 'Scout',
    category: ProfessionCategory.OUTDOORS,
    description:
      'Scouts are wilderness experts skilled in survival, tracking, and harvesting creatures.',
    noviceSkill: 'outdoors_scout_novice',
    masterSkill: 'outdoors_scout_master',
    recommendedSpecies: [Species.WOOKIEE, Species.TRANDOSHAN, Species.RODIAN],
    restrictedSpecies: [],
    advancedProfessions: ['ranger', 'creature_handler', 'squad_leader'],
    startingEquipment: ['survival_knife', 'camp_kit'],
  },
};

/**
 * All starting professions
 */
export const StartingProfessions: Record<string, StartingProfession> = {
  ...CombatProfessions,
  ...MedicalProfessions,
  ...CraftingProfessions,
  ...EntertainerProfessions,
  ...OutdoorProfessions,
};

/**
 * All professions including advanced
 */
export const AllProfessions: Record<string, StartingProfession> = {
  ...StartingProfessions,
  ...AdvancedCombatProfessions,
  ...MedicalProfessions,
};

/**
 * Get a profession by name
 */
export function getProfession(name: string): StartingProfession | undefined {
  return AllProfessions[name.toLowerCase()];
}

/**
 * Get all professions in a category
 */
export function getProfessionsByCategory(category: ProfessionCategory): StartingProfession[] {
  return Object.values(AllProfessions).filter((p) => p.category === category);
}

/**
 * Get starting professions for a species
 */
export function getAvailableProfessions(species: string): StartingProfession[] {
  return Object.values(StartingProfessions).filter(
    (p) => !p.restrictedSpecies.includes(species.toLowerCase())
  );
}

/**
 * Check if a profession is available for a species
 */
export function isProfessionAvailable(professionName: string, species: string): boolean {
  const profession = getProfession(professionName);
  if (!profession) return false;
  return !profession.restrictedSpecies.includes(species.toLowerCase());
}

/**
 * Get advanced professions for a starting profession
 */
export function getAdvancedProfessions(startingProfession: string): StartingProfession[] {
  const profession = getProfession(startingProfession);
  if (!profession) return [];

  return profession.advancedProfessions
    .map((name) => getProfession(name))
    .filter((p): p is StartingProfession => p !== undefined);
}

/**
 * Get the skill path requirements for mastering a profession
 */
export interface ProfessionSkillPath {
  noviceSkill: string;
  masterSkill: string;
  branchPaths: string[][];
}

/**
 * Common skill tree branch names
 */
export const SkillTreeBranches = {
  // Marksman branches
  MARKSMAN_RIFLES: ['marksman_rifle_01', 'marksman_rifle_02', 'marksman_rifle_03', 'marksman_rifle_04'],
  MARKSMAN_PISTOLS: ['marksman_pistol_01', 'marksman_pistol_02', 'marksman_pistol_03', 'marksman_pistol_04'],
  MARKSMAN_CARBINES: ['marksman_carbine_01', 'marksman_carbine_02', 'marksman_carbine_03', 'marksman_carbine_04'],
  MARKSMAN_RANGED: ['marksman_ranged_01', 'marksman_ranged_02', 'marksman_ranged_03', 'marksman_ranged_04'],

  // Brawler branches
  BRAWLER_UNARMED: ['brawler_unarmed_01', 'brawler_unarmed_02', 'brawler_unarmed_03', 'brawler_unarmed_04'],
  BRAWLER_ONEHAND: ['brawler_onehand_01', 'brawler_onehand_02', 'brawler_onehand_03', 'brawler_onehand_04'],
  BRAWLER_TWOHAND: ['brawler_twohand_01', 'brawler_twohand_02', 'brawler_twohand_03', 'brawler_twohand_04'],
  BRAWLER_POLEARM: ['brawler_polearm_01', 'brawler_polearm_02', 'brawler_polearm_03', 'brawler_polearm_04'],

  // Medic branches
  MEDIC_INJURY: ['medic_injury_01', 'medic_injury_02', 'medic_injury_03', 'medic_injury_04'],
  MEDIC_FIRSTAID: ['medic_firstaid_01', 'medic_firstaid_02', 'medic_firstaid_03', 'medic_firstaid_04'],
  MEDIC_ORGANIC: ['medic_organic_01', 'medic_organic_02', 'medic_organic_03', 'medic_organic_04'],
  MEDIC_PHARMACOLOGY: ['medic_pharmacology_01', 'medic_pharmacology_02', 'medic_pharmacology_03', 'medic_pharmacology_04'],

  // Artisan branches
  ARTISAN_SURVEY: ['artisan_survey_01', 'artisan_survey_02', 'artisan_survey_03', 'artisan_survey_04'],
  ARTISAN_ENGINEERING: ['artisan_engineering_01', 'artisan_engineering_02', 'artisan_engineering_03', 'artisan_engineering_04'],
  ARTISAN_DOMESTIC: ['artisan_domestic_01', 'artisan_domestic_02', 'artisan_domestic_03', 'artisan_domestic_04'],
  ARTISAN_BUSINESS: ['artisan_business_01', 'artisan_business_02', 'artisan_business_03', 'artisan_business_04'],
} as const;

/**
 * Profession master requirements
 * Lists the skills needed to achieve master status
 */
export const MasterRequirements: Record<string, string[]> = {
  marksman: [
    'combat_marksman_novice',
    ...SkillTreeBranches.MARKSMAN_RIFLES,
    ...SkillTreeBranches.MARKSMAN_PISTOLS,
    ...SkillTreeBranches.MARKSMAN_CARBINES,
    ...SkillTreeBranches.MARKSMAN_RANGED,
    'combat_marksman_master',
  ],
  brawler: [
    'combat_brawler_novice',
    ...SkillTreeBranches.BRAWLER_UNARMED,
    ...SkillTreeBranches.BRAWLER_ONEHAND,
    ...SkillTreeBranches.BRAWLER_TWOHAND,
    ...SkillTreeBranches.BRAWLER_POLEARM,
    'combat_brawler_master',
  ],
  medic: [
    'science_medic_novice',
    ...SkillTreeBranches.MEDIC_INJURY,
    ...SkillTreeBranches.MEDIC_FIRSTAID,
    ...SkillTreeBranches.MEDIC_ORGANIC,
    ...SkillTreeBranches.MEDIC_PHARMACOLOGY,
    'science_medic_master',
  ],
  artisan: [
    'crafting_artisan_novice',
    ...SkillTreeBranches.ARTISAN_SURVEY,
    ...SkillTreeBranches.ARTISAN_ENGINEERING,
    ...SkillTreeBranches.ARTISAN_DOMESTIC,
    ...SkillTreeBranches.ARTISAN_BUSINESS,
    'crafting_artisan_master',
  ],
};

/**
 * Check if a player has mastered a profession
 * @param learnedSkills - Set of skills the player has learned
 * @param professionName - Name of the profession to check
 */
export function hasMasteredProfession(
  learnedSkills: Set<string>,
  professionName: string
): boolean {
  const requirements = MasterRequirements[professionName.toLowerCase()];
  if (!requirements) return false;

  return requirements.every((skill) => learnedSkills.has(skill));
}

/**
 * Get the progress towards mastering a profession
 * @param learnedSkills - Set of skills the player has learned
 * @param professionName - Name of the profession
 * @returns Object with completed and total skill counts
 */
export function getMasteryProgress(
  learnedSkills: Set<string>,
  professionName: string
): { completed: number; total: number; percentage: number } {
  const requirements = MasterRequirements[professionName.toLowerCase()];
  if (!requirements) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = requirements.filter((skill) => learnedSkills.has(skill)).length;
  const total = requirements.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}
