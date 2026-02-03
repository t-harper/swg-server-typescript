/**
 * Resource Attribute Definitions
 * Defines the 11 resource attributes used in SWG crafting
 */

import { ResourceType, RESOURCE_TYPE_HIERARCHY } from './resource-types.js';

/**
 * Resource attribute enumeration
 * All possible attributes that a resource can have
 */
export const ResourceAttribute = {
  /** Cold Resistance - resistance to cold temperatures */
  CR: 'cold_resistance',
  /** Conductivity - ability to conduct energy */
  CD: 'conductivity',
  /** Decay Resistance - resistance to decay over time */
  DR: 'decay_resistance',
  /** Entangle Resistance - resistance to tangling/binding */
  ER: 'entangle_resistance',
  /** Flavor - taste quality for food/consumables */
  FL: 'flavor',
  /** Heat Resistance - resistance to high temperatures */
  HR: 'heat_resistance',
  /** Malleability - ability to be shaped */
  MA: 'malleability',
  /** Overall Quality - general quality measure */
  OQ: 'overall_quality',
  /** Potential Energy - stored energy capacity */
  PE: 'potential_energy',
  /** Shock Resistance - resistance to impact/shock */
  SR: 'shock_resistance',
  /** Unit Toughness - structural integrity per unit */
  UT: 'unit_toughness',
} as const;

export type ResourceAttribute = (typeof ResourceAttribute)[keyof typeof ResourceAttribute];

/**
 * Short codes for resource attributes (for display)
 */
export const RESOURCE_ATTRIBUTE_CODES: Record<ResourceAttribute, string> = {
  [ResourceAttribute.CR]: 'CR',
  [ResourceAttribute.CD]: 'CD',
  [ResourceAttribute.DR]: 'DR',
  [ResourceAttribute.ER]: 'ER',
  [ResourceAttribute.FL]: 'FL',
  [ResourceAttribute.HR]: 'HR',
  [ResourceAttribute.MA]: 'MA',
  [ResourceAttribute.OQ]: 'OQ',
  [ResourceAttribute.PE]: 'PE',
  [ResourceAttribute.SR]: 'SR',
  [ResourceAttribute.UT]: 'UT',
};

/**
 * Display names for resource attributes
 */
export const RESOURCE_ATTRIBUTE_NAMES: Record<ResourceAttribute, string> = {
  [ResourceAttribute.CR]: 'Cold Resistance',
  [ResourceAttribute.CD]: 'Conductivity',
  [ResourceAttribute.DR]: 'Decay Resistance',
  [ResourceAttribute.ER]: 'Entangle Resistance',
  [ResourceAttribute.FL]: 'Flavor',
  [ResourceAttribute.HR]: 'Heat Resistance',
  [ResourceAttribute.MA]: 'Malleability',
  [ResourceAttribute.OQ]: 'Overall Quality',
  [ResourceAttribute.PE]: 'Potential Energy',
  [ResourceAttribute.SR]: 'Shock Resistance',
  [ResourceAttribute.UT]: 'Unit Toughness',
};

/**
 * Attribute value constraints
 */
export const ATTRIBUTE_MIN_VALUE = 0;
export const ATTRIBUTE_MAX_VALUE = 1000;

/**
 * All resource attributes as an array
 */
export const ALL_RESOURCE_ATTRIBUTES: ResourceAttribute[] = Object.values(ResourceAttribute);

/**
 * Attribute range definition
 */
export interface AttributeRange {
  min: number;
  max: number;
}

/**
 * Default attribute range (0-1000)
 */
export const DEFAULT_ATTRIBUTE_RANGE: AttributeRange = {
  min: ATTRIBUTE_MIN_VALUE,
  max: ATTRIBUTE_MAX_VALUE,
};

/**
 * Resource type to applicable attributes mapping
 * Defines which attributes are relevant for each resource type
 */
export const RESOURCE_TYPE_ATTRIBUTES: Partial<Record<ResourceType, ResourceAttribute[]>> = {
  // ===== ORGANIC RESOURCES =====

  // Flora typically has: DR, FL, OQ, PE
  [ResourceType.FLORA]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_CEREALS]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_CORN]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_RICE]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_WHEAT]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_OAT]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_FRUITS]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_BERRIES]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_FRUITS_NATIVE]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_VEGETABLES]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_VEGETABLES_GREENS]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_VEGETABLES_BEANS]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_VEGETABLES_TUBERS]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.FLORA_FOOD_VEGETABLES_FUNGI]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // Structural flora: DR, MA, OQ, SR, UT
  [ResourceType.FLORA_STRUCTURAL]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.FLORA_STRUCTURAL_WOOD]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.FLORA_STRUCTURAL_WOOD_DECIDUOUS]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.FLORA_STRUCTURAL_WOOD_CONIFER]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.FLORA_STRUCTURAL_WOOD_EVERGREEN]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],

  // Creature food: DR, FL, OQ, PE
  [ResourceType.CREATURE_RESOURCES]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_DOMESTICATED]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_WILD]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_HERBIVORE]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_CARNIVORE]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_REPTILIAN]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_AVIAN]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_INSECT]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MEAT_EGG]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_SEAFOOD]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_SEAFOOD_FISH]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_SEAFOOD_CRUSTACEAN]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_SEAFOOD_MOLLUSK]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MILK]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MILK_DOMESTICATED]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CREATURE_FOOD_MILK_WILD]: [
    ResourceAttribute.DR,
    ResourceAttribute.FL,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // Creature structural: DR, MA, OQ, SR, UT
  [ResourceType.CREATURE_STRUCTURAL]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_BONE]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_BONE_MAMMAL]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_BONE_AVIAN]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_BONE_HORN]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],

  // Hides: DR, ER, MA, OQ, SR, UT
  [ResourceType.CREATURE_STRUCTURAL_HIDE]: [
    ResourceAttribute.DR,
    ResourceAttribute.ER,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_HIDE_LEATHERY]: [
    ResourceAttribute.DR,
    ResourceAttribute.ER,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_HIDE_BRISTLEY]: [
    ResourceAttribute.DR,
    ResourceAttribute.ER,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_HIDE_SCALEY]: [
    ResourceAttribute.DR,
    ResourceAttribute.ER,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.CREATURE_STRUCTURAL_HIDE_WOOLY]: [
    ResourceAttribute.DR,
    ResourceAttribute.ER,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],

  // Chemicals: CD, CR, DR, HR, OQ, PE
  [ResourceType.CHEMICAL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CHEMICAL_COMPOUND]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CHEMICAL_COMPOUND_FUEL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CHEMICAL_COMPOUND_POLYMER]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.CHEMICAL_COMPOUND_LUBRICANT]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // ===== INORGANIC RESOURCES =====

  // Metals: CD, CR, DR, HR, MA, OQ, SR, UT
  [ResourceType.MINERAL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_FERROUS]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_FERROUS_STEEL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_FERROUS_IRON]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_NONFERROUS]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_NONFERROUS_ALUMINUM]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_NONFERROUS_COPPER]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_METAL_NONFERROUS_TITANIUM]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],

  // Mineral fuel: CD, CR, DR, HR, OQ, PE
  [ResourceType.MINERAL_FUEL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.MINERAL_FUEL_PETROCHEM_SOLID]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.MINERAL_FUEL_PETROCHEM_LIQUID]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.MINERAL_FUEL_RADIOACTIVE]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // Gemstones: CD, CR, DR, HR, OQ, SR, UT
  [ResourceType.MINERAL_GEMSTONE]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_GEMSTONE_AMORPHOUS]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_GEMSTONE_CRYSTALLINE]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.MINERAL_GEMSTONE_CRYSTALLINE_ARMOPHOUS]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],

  // Radioactive minerals: CD, CR, DR, HR, OQ, PE
  [ResourceType.MINERAL_RADIOACTIVE]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.MINERAL_RADIOACTIVE_KNOWN]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.MINERAL_RADIOACTIVE_UNKNOWN]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // Gas: CD, CR, DR, HR, OQ, PE
  [ResourceType.GAS]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.GAS_REACTIVE]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.GAS_REACTIVE_KNOWN]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.GAS_REACTIVE_UNKNOWN]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.GAS_INERT]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.GAS_INERT_KNOWN]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.GAS_INERT_UNKNOWN]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // Water: CR, DR, OQ, PE
  [ResourceType.WATER]: [
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.WATER_VAPOR]: [
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.WATER_VAPOR_WET]: [
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.WATER_VAPOR_DRY]: [
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // JTL resources
  [ResourceType.JTL_RESOURCE]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.JTL_RESOURCE_METAL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.JTL_RESOURCE_GAS]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],

  // Recycled - inherit base attributes
  [ResourceType.RECYCLED]: [
    ResourceAttribute.CD,
    ResourceAttribute.DR,
    ResourceAttribute.OQ,
    ResourceAttribute.UT,
  ],
  [ResourceType.RECYCLED_METAL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
  [ResourceType.RECYCLED_ORE]: [
    ResourceAttribute.CD,
    ResourceAttribute.DR,
    ResourceAttribute.OQ,
    ResourceAttribute.UT,
  ],
  [ResourceType.RECYCLED_CHEMICAL]: [
    ResourceAttribute.CD,
    ResourceAttribute.CR,
    ResourceAttribute.DR,
    ResourceAttribute.HR,
    ResourceAttribute.OQ,
    ResourceAttribute.PE,
  ],
  [ResourceType.RECYCLED_FIBERPLAST]: [
    ResourceAttribute.DR,
    ResourceAttribute.MA,
    ResourceAttribute.OQ,
    ResourceAttribute.SR,
    ResourceAttribute.UT,
  ],
};

/**
 * Get applicable attributes for a resource type
 * Falls back to parent types if not explicitly defined
 * @param type - The resource type
 * @returns Array of applicable attributes
 */
export function getApplicableAttributes(type: ResourceType): ResourceAttribute[] {
  // Check if this type has explicit attributes
  if (RESOURCE_TYPE_ATTRIBUTES[type]) {
    return RESOURCE_TYPE_ATTRIBUTES[type]!;
  }

  // Walk up the hierarchy to find applicable attributes
  let currentType: ResourceType | null = type;
  while (currentType !== null) {
    const attrs = RESOURCE_TYPE_ATTRIBUTES[currentType];
    if (attrs) {
      return attrs;
    }
    currentType = RESOURCE_TYPE_HIERARCHY[currentType]?.parent ?? null;
  }

  // Default to OQ only if nothing found
  return [ResourceAttribute.OQ];
}

/**
 * Check if an attribute is applicable to a resource type
 * @param type - The resource type
 * @param attribute - The attribute to check
 * @returns True if the attribute applies
 */
export function isAttributeApplicable(type: ResourceType, attribute: ResourceAttribute): boolean {
  const applicable = getApplicableAttributes(type);
  return applicable.includes(attribute);
}

/**
 * Validate an attribute value is within range
 * @param value - The attribute value
 * @returns True if within valid range (0-1000)
 */
export function isValidAttributeValue(value: number): boolean {
  return (
    Number.isInteger(value) && value >= ATTRIBUTE_MIN_VALUE && value <= ATTRIBUTE_MAX_VALUE
  );
}

/**
 * Clamp an attribute value to valid range
 * @param value - The attribute value
 * @returns Clamped value between 0-1000
 */
export function clampAttributeValue(value: number): number {
  return Math.max(ATTRIBUTE_MIN_VALUE, Math.min(ATTRIBUTE_MAX_VALUE, Math.round(value)));
}

/**
 * Get attribute code from attribute
 * @param attribute - The resource attribute
 * @returns Short code (e.g., "OQ", "CR")
 */
export function getAttributeCode(attribute: ResourceAttribute): string {
  return RESOURCE_ATTRIBUTE_CODES[attribute] ?? attribute;
}

/**
 * Get attribute display name
 * @param attribute - The resource attribute
 * @returns Human-readable name
 */
export function getAttributeName(attribute: ResourceAttribute): string {
  return RESOURCE_ATTRIBUTE_NAMES[attribute] ?? attribute;
}

/**
 * Parse attribute from code or name
 * @param input - The code (e.g., "OQ") or name
 * @returns The ResourceAttribute or null if not found
 */
export function parseAttribute(input: string): ResourceAttribute | null {
  const normalized = input.toLowerCase().trim();

  // Check codes
  for (const [attr, code] of Object.entries(RESOURCE_ATTRIBUTE_CODES)) {
    if (code.toLowerCase() === normalized) {
      return attr as ResourceAttribute;
    }
  }

  // Check full names
  for (const [attr, name] of Object.entries(RESOURCE_ATTRIBUTE_NAMES)) {
    if (name.toLowerCase() === normalized) {
      return attr as ResourceAttribute;
    }
  }

  // Check attribute values directly
  for (const attr of Object.values(ResourceAttribute)) {
    if (attr.toLowerCase() === normalized) {
      return attr;
    }
  }

  return null;
}

/**
 * Calculate quality percentage from attribute value
 * @param value - The attribute value (0-1000)
 * @returns Quality percentage (0-100)
 */
export function attributeToQualityPercent(value: number): number {
  return (clampAttributeValue(value) / ATTRIBUTE_MAX_VALUE) * 100;
}
