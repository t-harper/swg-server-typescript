/**
 * Skill Template Interface
 * Defines the structure for SWG skill data loaded from datatables
 */

/**
 * Graph types for skill organization
 */
export const SkillGraphType = {
  /** Standard profession skills */
  PROFESSION: 'profession',
  /** Force-sensitive expertise */
  EXPERTISE: 'expertise',
  /** Jedi skills */
  JEDI: 'jedi',
  /** Pilot skills */
  PILOT: 'pilot',
  /** Creature handler skills */
  CREATURE_HANDLER: 'creature_handler',
} as const;

export type SkillGraphType = (typeof SkillGraphType)[keyof typeof SkillGraphType];

/**
 * XP types used by skills
 */
export const XpType = {
  // Combat XP types
  COMBAT_RANGED_RIFLE: 'combat_ranged_rifle',
  COMBAT_RANGED_PISTOL: 'combat_ranged_pistol',
  COMBAT_RANGED_CARBINE: 'combat_ranged_carbine',
  COMBAT_RANGED_HEAVY: 'combat_ranged_heavy',
  COMBAT_MELEE_UNARMED: 'combat_melee_unarmed',
  COMBAT_MELEE_ONEHAND: 'combat_melee_onehand',
  COMBAT_MELEE_TWOHAND: 'combat_melee_twohand',
  COMBAT_MELEE_POLEARM: 'combat_melee_polearm',
  COMBAT_GENERAL: 'combat_general',

  // Medical XP types
  MEDICAL: 'medical',
  COMBAT_MEDICINE: 'combat_medicine',

  // Crafting XP types
  CRAFTING: 'crafting',
  CRAFTING_WEAPONSMITH: 'crafting_weaponsmith',
  CRAFTING_ARMORSMITH: 'crafting_armorsmith',
  CRAFTING_TAILOR: 'crafting_tailor',
  CRAFTING_DROID: 'crafting_droid',
  CRAFTING_FOOD: 'crafting_food',
  CRAFTING_MEDICINE: 'crafting_medicine',
  CRAFTING_STRUCTURE: 'crafting_structure',
  CRAFTING_SHIP: 'crafting_ship',

  // Entertainer XP types
  ENTERTAINER: 'entertainer',
  DANCE: 'dance',
  MUSIC: 'music',
  IMAGEDESIGNER: 'imagedesigner',

  // Scout/Ranger XP types
  SCOUT: 'scout',
  TRAPPING: 'trapping',
  CREATURE_HANDLING: 'creature_handling',

  // Other XP types
  BIO_ENGINEER: 'bio_engineer',
  SLICING: 'slicing',
  POLITICIAN: 'politician',
  JEDI: 'jedi',
  FORCE_SENSITIVE: 'force_sensitive',
} as const;

export type XpType = (typeof XpType)[keyof typeof XpType];

/**
 * Playable species in SWG
 */
export const Species = {
  HUMAN: 'human',
  RODIAN: 'rodian',
  TRANDOSHAN: 'trandoshan',
  MON_CALAMARI: 'mon_calamari',
  WOOKIEE: 'wookiee',
  BOTHAN: 'bothan',
  TWILEK: 'twilek',
  ZABRAK: 'zabrak',
  ITHORIAN: 'ithorian',
  SULLUSTAN: 'sullustan',
} as const;

export type Species = (typeof Species)[keyof typeof Species];

/**
 * Raw skill data as loaded from datatable JSON
 */
export interface SkillTemplateData {
  skillName: string;
  parentSkill: string | null;
  graphType: string;
  isTitle: boolean;

  // XP requirements
  xpType: string;
  xpCost: number;
  xpCap: number;

  // Skill points
  skillPointsRequired: number;

  // Prerequisites
  requiredSkills: string[];
  requiredSpecies: string[];

  // Granted abilities
  skillMods: Record<string, number>;
  commands: string[];
  certifications: string[];

  // Profession info
  professionName: string;
  isMaster: boolean;
}

/**
 * Skill template with processed data and Maps
 */
export interface SkillTemplate {
  /** Unique skill identifier, e.g., "combat_marksman_novice" */
  skillName: string;
  /** Parent/prerequisite skill, null for novice skills */
  parentSkill: string | null;
  /** Graph type for skill organization */
  graphType: string;
  /** Whether this skill grants a title */
  isTitle: boolean;

  // XP requirements
  /** Type of XP required to learn this skill */
  xpType: string;
  /** Amount of XP required */
  xpCost: number;
  /** Maximum XP cap in this type after learning */
  xpCap: number;

  // Skill points
  /** Number of skill points required to learn */
  skillPointsRequired: number;

  // Prerequisites
  /** List of required skill names */
  requiredSkills: string[];
  /** Species restrictions (empty means all species) */
  requiredSpecies: string[];

  // Granted abilities
  /** Skill modifiers granted (mod name -> value) */
  skillMods: Map<string, number>;
  /** Commands/abilities granted */
  commands: string[];
  /** Item certifications granted */
  certifications: string[];

  // Profession info
  /** Display name of the profession */
  professionName: string;
  /** Whether this is a master box */
  isMaster: boolean;
}

/**
 * Skill tree node with parent-child relationships
 */
export interface SkillTreeNode extends SkillTemplate {
  /** Child skills that require this skill */
  childSkills: string[];
  /** Depth in the skill tree (0 = novice) */
  treeDepth: number;
}

/**
 * Convert raw skill data to SkillTemplate
 */
export function convertToSkillTemplate(data: SkillTemplateData): SkillTemplate {
  return {
    ...data,
    skillMods: new Map(Object.entries(data.skillMods)),
  };
}

/**
 * Convert SkillTemplate to serializable data
 */
export function convertToSkillTemplateData(template: SkillTemplate): SkillTemplateData {
  return {
    ...template,
    skillMods: Object.fromEntries(template.skillMods),
  };
}

/**
 * Check if a skill is a novice skill (entry point)
 */
export function isNoviceSkill(skill: SkillTemplate): boolean {
  return skill.parentSkill === null && skill.skillName.includes('novice');
}

/**
 * Check if a skill can be learned by a specific species
 */
export function canSpeciesLearnSkill(skill: SkillTemplate, species: string): boolean {
  if (skill.requiredSpecies.length === 0) {
    return true;
  }
  return skill.requiredSpecies.includes(species.toLowerCase());
}

/**
 * Get the total skill mod value from a skill
 */
export function getSkillModValue(skill: SkillTemplate, modName: string): number {
  return skill.skillMods.get(modName) ?? 0;
}

/**
 * Check if a skill grants a specific command
 */
export function skillGrantsCommand(skill: SkillTemplate, command: string): boolean {
  return skill.commands.includes(command.toLowerCase());
}

/**
 * Check if a skill grants a specific certification
 */
export function skillGrantsCertification(skill: SkillTemplate, certification: string): boolean {
  return skill.certifications.includes(certification.toLowerCase());
}
