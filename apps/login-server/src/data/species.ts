/**
 * Species Definitions
 * Playable species in Star Wars Galaxies with their templates and attributes
 */

/**
 * Gender enumeration
 */
export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
} as const;

export type GenderType = (typeof Gender)[keyof typeof Gender];

/**
 * Species attribute modifiers (HAM: Health, Action, Mind)
 * These modify the base stats for each species
 */
export interface SpeciesAttributes {
  /** Base health points */
  health: number;
  /** Base strength stat */
  strength: number;
  /** Base constitution stat */
  constitution: number;
  /** Base action points */
  action: number;
  /** Base quickness stat */
  quickness: number;
  /** Base stamina stat */
  stamina: number;
  /** Base mind points */
  mind: number;
  /** Base focus stat */
  focus: number;
  /** Base willpower stat */
  willpower: number;
}

/**
 * Species scale range (height variation)
 */
export interface ScaleRange {
  min: number;
  max: number;
}

/**
 * Species definition
 */
export interface SpeciesDefinition {
  /** Species identifier */
  id: string;
  /** Display name */
  name: string;
  /** Template path for male characters */
  maleTemplate: string;
  /** Shared template path for male characters */
  maleSharedTemplate: string;
  /** Template path for female characters */
  femaleTemplate: string;
  /** Shared template path for female characters */
  femaleSharedTemplate: string;
  /** Base attributes for this species */
  attributes: SpeciesAttributes;
  /** Height scale range */
  scale: ScaleRange;
  /** Whether this species can have a last name */
  allowSurname: boolean;
  /** Whether a last name is required for this species */
  requireSurname: boolean;
  /** Species-specific customization limits */
  customizationRanges?: CustomizationRanges;
}

/**
 * Customization ranges for appearance sliders
 */
export interface CustomizationRanges {
  /** Number of skin color options */
  skinColors?: number;
  /** Number of hair styles */
  hairStyles?: number;
  /** Number of hair colors */
  hairColors?: number;
  /** Number of eye colors */
  eyeColors?: number;
  /** Whether the species can have facial hair */
  allowFacialHair?: boolean;
  /** Number of marking/tattoo options */
  markingStyles?: number;
}

/**
 * Playable species definitions
 */
export const Species: Record<string, SpeciesDefinition> = {
  HUMAN: {
    id: 'human',
    name: 'Human',
    maleTemplate: 'object/creature/player/human_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_human_male.iff',
    femaleTemplate: 'object/creature/player/human_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_human_female.iff',
    attributes: {
      health: 400,
      strength: 300,
      constitution: 300,
      action: 400,
      quickness: 300,
      stamina: 300,
      mind: 400,
      focus: 300,
      willpower: 300,
    },
    scale: { min: 0.9, max: 1.1 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 32,
      hairStyles: 35,
      hairColors: 16,
      eyeColors: 12,
      allowFacialHair: true,
      markingStyles: 0,
    },
  },

  RODIAN: {
    id: 'rodian',
    name: 'Rodian',
    maleTemplate: 'object/creature/player/rodian_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_rodian_male.iff',
    femaleTemplate: 'object/creature/player/rodian_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_rodian_female.iff',
    attributes: {
      health: 300,
      strength: 300,
      constitution: 300,
      action: 500,
      quickness: 300,
      stamina: 400,
      mind: 400,
      focus: 300,
      willpower: 200,
    },
    scale: { min: 0.93, max: 1.07 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 16,
      hairStyles: 0,
      hairColors: 0,
      eyeColors: 8,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },

  TRANDOSHAN: {
    id: 'trandoshan',
    name: 'Trandoshan',
    maleTemplate: 'object/creature/player/trandoshan_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_trandoshan_male.iff',
    femaleTemplate: 'object/creature/player/trandoshan_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_trandoshan_female.iff',
    attributes: {
      health: 550,
      strength: 350,
      constitution: 400,
      action: 300,
      quickness: 200,
      stamina: 250,
      mind: 350,
      focus: 300,
      willpower: 300,
    },
    scale: { min: 1.0, max: 1.2 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 24,
      hairStyles: 0,
      hairColors: 0,
      eyeColors: 6,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },

  MON_CALAMARI: {
    id: 'moncal',
    name: 'Mon Calamari',
    maleTemplate: 'object/creature/player/moncal_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_moncal_male.iff',
    femaleTemplate: 'object/creature/player/moncal_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_moncal_female.iff',
    attributes: {
      health: 300,
      strength: 300,
      constitution: 300,
      action: 300,
      quickness: 300,
      stamina: 300,
      mind: 600,
      focus: 300,
      willpower: 300,
    },
    scale: { min: 0.9, max: 1.1 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 20,
      hairStyles: 0,
      hairColors: 0,
      eyeColors: 8,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },

  WOOKIEE: {
    id: 'wookiee',
    name: 'Wookiee',
    maleTemplate: 'object/creature/player/wookiee_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_wookiee_male.iff',
    femaleTemplate: 'object/creature/player/wookiee_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_wookiee_female.iff',
    attributes: {
      health: 650,
      strength: 350,
      constitution: 450,
      action: 500,
      quickness: 200,
      stamina: 400,
      mind: 250,
      focus: 100,
      willpower: 100,
    },
    scale: { min: 1.0, max: 1.2 },
    allowSurname: false,
    requireSurname: false,
    customizationRanges: {
      skinColors: 0,
      hairStyles: 24,
      hairColors: 16,
      eyeColors: 8,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },

  BOTHAN: {
    id: 'bothan',
    name: 'Bothan',
    maleTemplate: 'object/creature/player/bothan_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_bothan_male.iff',
    femaleTemplate: 'object/creature/player/bothan_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_bothan_female.iff',
    attributes: {
      health: 300,
      strength: 300,
      constitution: 300,
      action: 350,
      quickness: 400,
      stamina: 350,
      mind: 400,
      focus: 300,
      willpower: 300,
    },
    scale: { min: 0.85, max: 1.0 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 0,
      hairStyles: 20,
      hairColors: 24,
      eyeColors: 6,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },

  TWILEK: {
    id: 'twilek',
    name: "Twi'lek",
    maleTemplate: 'object/creature/player/twilek_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_twilek_male.iff',
    femaleTemplate: 'object/creature/player/twilek_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_twilek_female.iff',
    attributes: {
      health: 300,
      strength: 300,
      constitution: 400,
      action: 550,
      quickness: 300,
      stamina: 300,
      mind: 400,
      focus: 250,
      willpower: 200,
    },
    scale: { min: 0.9, max: 1.1 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 32,
      hairStyles: 0,
      hairColors: 0,
      eyeColors: 8,
      allowFacialHair: false,
      markingStyles: 16,
    },
  },

  ZABRAK: {
    id: 'zabrak',
    name: 'Zabrak',
    maleTemplate: 'object/creature/player/zabrak_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_zabrak_male.iff',
    femaleTemplate: 'object/creature/player/zabrak_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_zabrak_female.iff',
    attributes: {
      health: 400,
      strength: 300,
      constitution: 300,
      action: 300,
      quickness: 300,
      stamina: 300,
      mind: 500,
      focus: 300,
      willpower: 300,
    },
    scale: { min: 0.9, max: 1.1 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 24,
      hairStyles: 20,
      hairColors: 16,
      eyeColors: 10,
      allowFacialHair: true,
      markingStyles: 24,
    },
  },

  ITHORIAN: {
    id: 'ithorian',
    name: 'Ithorian',
    maleTemplate: 'object/creature/player/ithorian_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_ithorian_male.iff',
    femaleTemplate: 'object/creature/player/ithorian_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_ithorian_female.iff',
    attributes: {
      health: 400,
      strength: 300,
      constitution: 300,
      action: 300,
      quickness: 300,
      stamina: 300,
      mind: 400,
      focus: 400,
      willpower: 300,
    },
    scale: { min: 0.95, max: 1.15 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 16,
      hairStyles: 0,
      hairColors: 0,
      eyeColors: 8,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },

  SULLUSTAN: {
    id: 'sullustan',
    name: 'Sullustan',
    maleTemplate: 'object/creature/player/sullustan_male.iff',
    maleSharedTemplate: 'object/creature/player/shared_sullustan_male.iff',
    femaleTemplate: 'object/creature/player/sullustan_female.iff',
    femaleSharedTemplate: 'object/creature/player/shared_sullustan_female.iff',
    attributes: {
      health: 300,
      strength: 300,
      constitution: 350,
      action: 300,
      quickness: 300,
      stamina: 350,
      mind: 500,
      focus: 300,
      willpower: 300,
    },
    scale: { min: 0.8, max: 0.95 },
    allowSurname: true,
    requireSurname: false,
    customizationRanges: {
      skinColors: 12,
      hairStyles: 0,
      hairColors: 0,
      eyeColors: 6,
      allowFacialHair: false,
      markingStyles: 0,
    },
  },
} as const;

/**
 * Map of template CRC to species definition
 * CRCs are pre-computed for common templates
 */
export const TemplateCrcToSpecies: Map<number, { species: SpeciesDefinition; gender: GenderType }> =
  new Map([
    // Human
    [0x446a2f0e, { species: Species.HUMAN, gender: Gender.MALE }],
    [0x6b54352e, { species: Species.HUMAN, gender: Gender.FEMALE }],
    // Rodian
    [0x90d1bd87, { species: Species.RODIAN, gender: Gender.MALE }],
    [0xce54f7f8, { species: Species.RODIAN, gender: Gender.FEMALE }],
    // Trandoshan
    [0xea98d92e, { species: Species.TRANDOSHAN, gender: Gender.MALE }],
    [0xdec49a14, { species: Species.TRANDOSHAN, gender: Gender.FEMALE }],
    // Mon Calamari
    [0xa9f7b0eb, { species: Species.MON_CALAMARI, gender: Gender.MALE }],
    [0x6c64b681, { species: Species.MON_CALAMARI, gender: Gender.FEMALE }],
    // Wookiee
    [0x5e0b6e4c, { species: Species.WOOKIEE, gender: Gender.MALE }],
    [0x8b29badb, { species: Species.WOOKIEE, gender: Gender.FEMALE }],
    // Bothan
    [0x5bde10ad, { species: Species.BOTHAN, gender: Gender.MALE }],
    [0xaa75ba0c, { species: Species.BOTHAN, gender: Gender.FEMALE }],
    // Twi'lek
    [0x69d96bba, { species: Species.TWILEK, gender: Gender.MALE }],
    [0x205cc767, { species: Species.TWILEK, gender: Gender.FEMALE }],
    // Zabrak
    [0x77f0ad9f, { species: Species.ZABRAK, gender: Gender.MALE }],
    [0x4f93fce9, { species: Species.ZABRAK, gender: Gender.FEMALE }],
    // Ithorian
    [0x4b20d56b, { species: Species.ITHORIAN, gender: Gender.MALE }],
    [0x78ea01f5, { species: Species.ITHORIAN, gender: Gender.FEMALE }],
    // Sullustan
    [0x86c0da0c, { species: Species.SULLUSTAN, gender: Gender.MALE }],
    [0x9d7a1ef1, { species: Species.SULLUSTAN, gender: Gender.FEMALE }],
  ]);

/**
 * Get species definition by ID
 */
export function getSpeciesById(id: string): SpeciesDefinition | undefined {
  const upperId = id.toUpperCase();
  return Species[upperId];
}

/**
 * Get species and gender from template CRC
 */
export function getSpeciesByTemplateCrc(
  crc: number
): { species: SpeciesDefinition; gender: GenderType } | undefined {
  return TemplateCrcToSpecies.get(crc);
}

/**
 * Get species definition by template path
 */
export function getSpeciesByTemplate(template: string): SpeciesDefinition | undefined {
  for (const species of Object.values(Species)) {
    if (
      species.maleTemplate === template ||
      species.femaleTemplate === template ||
      species.maleSharedTemplate === template ||
      species.femaleSharedTemplate === template
    ) {
      return species;
    }
  }
  return undefined;
}

/**
 * Get the template path for a species
 */
export function getSpeciesTemplate(
  species: SpeciesDefinition,
  gender: GenderType,
  shared: boolean = false
): string {
  if (gender === Gender.MALE) {
    return shared ? species.maleSharedTemplate : species.maleTemplate;
  }
  return shared ? species.femaleSharedTemplate : species.femaleTemplate;
}

/**
 * Validate if a template CRC corresponds to a valid playable species
 */
export function isValidSpeciesTemplate(templateCrc: number): boolean {
  return TemplateCrcToSpecies.has(templateCrc);
}

/**
 * Get all playable species
 */
export function getAllSpecies(): SpeciesDefinition[] {
  return Object.values(Species);
}

/**
 * Get base attribute total for a species
 */
export function getSpeciesAttributeTotal(species: SpeciesDefinition): number {
  const attrs = species.attributes;
  return (
    attrs.health +
    attrs.strength +
    attrs.constitution +
    attrs.action +
    attrs.quickness +
    attrs.stamina +
    attrs.mind +
    attrs.focus +
    attrs.willpower
  );
}
