/**
 * Resource Type Hierarchy
 * Defines the complete SWG resource class tree from base types to specific resources
 */

/**
 * Resource category - the top-level classification
 */
export const ResourceCategory = {
  /** Living or once-living materials */
  ORGANIC: 'organic',
  /** Non-living materials from the environment */
  INORGANIC: 'inorganic',
} as const;

export type ResourceCategory = (typeof ResourceCategory)[keyof typeof ResourceCategory];

/**
 * Base resource type enumeration
 * Organizes all resource types into a flat enum for easy reference
 */
export const ResourceType = {
  // ===== ORGANIC TYPES =====
  ORGANIC: 'organic',

  // Flora
  FLORA: 'flora',
  FLORA_FOOD: 'flora_food',
  FLORA_FOOD_CEREALS: 'flora_food_cereals',
  FLORA_FOOD_CORN: 'flora_food_corn',
  FLORA_FOOD_RICE: 'flora_food_rice',
  FLORA_FOOD_WHEAT: 'flora_food_wheat',
  FLORA_FOOD_OAT: 'flora_food_oat',
  FLORA_FOOD_FRUITS: 'flora_food_fruits',
  FLORA_FOOD_BERRIES: 'flora_food_berries',
  FLORA_FOOD_FRUITS_NATIVE: 'flora_food_fruits_native',
  FLORA_FOOD_VEGETABLES: 'flora_food_vegetables',
  FLORA_FOOD_VEGETABLES_GREENS: 'flora_food_vegetables_greens',
  FLORA_FOOD_VEGETABLES_BEANS: 'flora_food_vegetables_beans',
  FLORA_FOOD_VEGETABLES_TUBERS: 'flora_food_vegetables_tubers',
  FLORA_FOOD_VEGETABLES_FUNGI: 'flora_food_vegetables_fungi',
  FLORA_STRUCTURAL: 'flora_structural',
  FLORA_STRUCTURAL_WOOD: 'flora_structural_wood',
  FLORA_STRUCTURAL_WOOD_DECIDUOUS: 'flora_structural_wood_deciduous',
  FLORA_STRUCTURAL_WOOD_CONIFER: 'flora_structural_wood_conifer',
  FLORA_STRUCTURAL_WOOD_EVERGREEN: 'flora_structural_wood_evergreen',

  // Creature Resources
  CREATURE_RESOURCES: 'creature_resources',
  CREATURE_FOOD: 'creature_food',
  CREATURE_FOOD_MEAT: 'creature_food_meat',
  CREATURE_FOOD_MEAT_DOMESTICATED: 'creature_food_meat_domesticated',
  CREATURE_FOOD_MEAT_WILD: 'creature_food_meat_wild',
  CREATURE_FOOD_MEAT_HERBIVORE: 'creature_food_meat_herbivore',
  CREATURE_FOOD_MEAT_CARNIVORE: 'creature_food_meat_carnivore',
  CREATURE_FOOD_MEAT_REPTILIAN: 'creature_food_meat_reptilian',
  CREATURE_FOOD_MEAT_AVIAN: 'creature_food_meat_avian',
  CREATURE_FOOD_MEAT_INSECT: 'creature_food_meat_insect',
  CREATURE_FOOD_MEAT_EGG: 'creature_food_meat_egg',
  CREATURE_FOOD_SEAFOOD: 'creature_food_seafood',
  CREATURE_FOOD_SEAFOOD_FISH: 'creature_food_seafood_fish',
  CREATURE_FOOD_SEAFOOD_CRUSTACEAN: 'creature_food_seafood_crustacean',
  CREATURE_FOOD_SEAFOOD_MOLLUSK: 'creature_food_seafood_mollusk',
  CREATURE_FOOD_MILK: 'creature_food_milk',
  CREATURE_FOOD_MILK_DOMESTICATED: 'creature_food_milk_domesticated',
  CREATURE_FOOD_MILK_WILD: 'creature_food_milk_wild',
  CREATURE_STRUCTURAL: 'creature_structural',
  CREATURE_STRUCTURAL_BONE: 'creature_structural_bone',
  CREATURE_STRUCTURAL_BONE_MAMMAL: 'creature_structural_bone_mammal',
  CREATURE_STRUCTURAL_BONE_AVIAN: 'creature_structural_bone_avian',
  CREATURE_STRUCTURAL_BONE_HORN: 'creature_structural_bone_horn',
  CREATURE_STRUCTURAL_HIDE: 'creature_structural_hide',
  CREATURE_STRUCTURAL_HIDE_LEATHERY: 'creature_structural_hide_leathery',
  CREATURE_STRUCTURAL_HIDE_BRISTLEY: 'creature_structural_hide_bristley',
  CREATURE_STRUCTURAL_HIDE_SCALEY: 'creature_structural_hide_scaley',
  CREATURE_STRUCTURAL_HIDE_WOOLY: 'creature_structural_hide_wooly',

  // Chemical (Organic)
  CHEMICAL: 'chemical',
  CHEMICAL_COMPOUND: 'chemical_compound',
  CHEMICAL_COMPOUND_FUEL: 'chemical_compound_fuel',
  CHEMICAL_COMPOUND_POLYMER: 'chemical_compound_polymer',
  CHEMICAL_COMPOUND_LUBRICANT: 'chemical_compound_lubricant',

  // ===== INORGANIC TYPES =====
  INORGANIC: 'inorganic',

  // Mineral
  MINERAL: 'mineral',
  MINERAL_FUEL: 'mineral_fuel',
  MINERAL_FUEL_PETROCHEM_SOLID: 'mineral_fuel_petrochem_solid',
  MINERAL_FUEL_PETROCHEM_LIQUID: 'mineral_fuel_petrochem_liquid',
  MINERAL_FUEL_RADIOACTIVE: 'mineral_fuel_radioactive',
  MINERAL_METAL: 'mineral_metal',
  MINERAL_METAL_FERROUS: 'mineral_metal_ferrous',
  MINERAL_METAL_FERROUS_STEEL: 'mineral_metal_ferrous_steel',
  MINERAL_METAL_FERROUS_IRON: 'mineral_metal_ferrous_iron',
  MINERAL_METAL_NONFERROUS: 'mineral_metal_nonferrous',
  MINERAL_METAL_NONFERROUS_ALUMINUM: 'mineral_metal_nonferrous_aluminum',
  MINERAL_METAL_NONFERROUS_COPPER: 'mineral_metal_nonferrous_copper',
  MINERAL_METAL_NONFERROUS_TITANIUM: 'mineral_metal_nonferrous_titanium',
  MINERAL_GEMSTONE: 'mineral_gemstone',
  MINERAL_GEMSTONE_AMORPHOUS: 'mineral_gemstone_amorphous',
  MINERAL_GEMSTONE_CRYSTALLINE: 'mineral_gemstone_crystalline',
  MINERAL_GEMSTONE_CRYSTALLINE_ARMOPHOUS: 'mineral_gemstone_crystalline_armophous',
  MINERAL_RADIOACTIVE: 'mineral_radioactive',
  MINERAL_RADIOACTIVE_KNOWN: 'mineral_radioactive_known',
  MINERAL_RADIOACTIVE_UNKNOWN: 'mineral_radioactive_unknown',

  // Gas
  GAS: 'gas',
  GAS_REACTIVE: 'gas_reactive',
  GAS_REACTIVE_KNOWN: 'gas_reactive_known',
  GAS_REACTIVE_UNKNOWN: 'gas_reactive_unknown',
  GAS_INERT: 'gas_inert',
  GAS_INERT_KNOWN: 'gas_inert_known',
  GAS_INERT_UNKNOWN: 'gas_inert_unknown',

  // Water
  WATER: 'water',
  WATER_VAPOR: 'water_vapor',
  WATER_VAPOR_WET: 'water_vapor_wet',
  WATER_VAPOR_DRY: 'water_vapor_dry',

  // JTL (Jump to Lightspeed) Resources
  JTL_RESOURCE: 'jtl_resource',
  JTL_RESOURCE_METAL: 'jtl_resource_metal',
  JTL_RESOURCE_GAS: 'jtl_resource_gas',

  // Special/Recycled
  RECYCLED: 'recycled',
  RECYCLED_METAL: 'recycled_metal',
  RECYCLED_ORE: 'recycled_ore',
  RECYCLED_CHEMICAL: 'recycled_chemical',
  RECYCLED_FIBERPLAST: 'recycled_fiberplast',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

/**
 * Resource type hierarchy definition
 * Maps each resource type to its parent and category
 */
export interface ResourceTypeInfo {
  /** The resource type identifier */
  type: ResourceType;
  /** Parent resource type (null for root types) */
  parent: ResourceType | null;
  /** Resource category (organic/inorganic) */
  category: ResourceCategory;
  /** Display name for the resource type */
  displayName: string;
  /** Whether this type can have spawned instances */
  isSpawnable: boolean;
}

/**
 * Complete resource type hierarchy
 * Defines parent-child relationships for all resource types
 */
export const RESOURCE_TYPE_HIERARCHY: Record<ResourceType, ResourceTypeInfo> = {
  // ===== ROOT TYPES =====
  [ResourceType.ORGANIC]: {
    type: ResourceType.ORGANIC,
    parent: null,
    category: ResourceCategory.ORGANIC,
    displayName: 'Organic',
    isSpawnable: false,
  },
  [ResourceType.INORGANIC]: {
    type: ResourceType.INORGANIC,
    parent: null,
    category: ResourceCategory.INORGANIC,
    displayName: 'Inorganic',
    isSpawnable: false,
  },

  // ===== FLORA HIERARCHY =====
  [ResourceType.FLORA]: {
    type: ResourceType.FLORA,
    parent: ResourceType.ORGANIC,
    category: ResourceCategory.ORGANIC,
    displayName: 'Flora',
    isSpawnable: false,
  },
  [ResourceType.FLORA_FOOD]: {
    type: ResourceType.FLORA_FOOD,
    parent: ResourceType.FLORA,
    category: ResourceCategory.ORGANIC,
    displayName: 'Flora Food',
    isSpawnable: false,
  },
  [ResourceType.FLORA_FOOD_CEREALS]: {
    type: ResourceType.FLORA_FOOD_CEREALS,
    parent: ResourceType.FLORA_FOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Cereals',
    isSpawnable: false,
  },
  [ResourceType.FLORA_FOOD_CORN]: {
    type: ResourceType.FLORA_FOOD_CORN,
    parent: ResourceType.FLORA_FOOD_CEREALS,
    category: ResourceCategory.ORGANIC,
    displayName: 'Corn',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_RICE]: {
    type: ResourceType.FLORA_FOOD_RICE,
    parent: ResourceType.FLORA_FOOD_CEREALS,
    category: ResourceCategory.ORGANIC,
    displayName: 'Rice',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_WHEAT]: {
    type: ResourceType.FLORA_FOOD_WHEAT,
    parent: ResourceType.FLORA_FOOD_CEREALS,
    category: ResourceCategory.ORGANIC,
    displayName: 'Wheat',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_OAT]: {
    type: ResourceType.FLORA_FOOD_OAT,
    parent: ResourceType.FLORA_FOOD_CEREALS,
    category: ResourceCategory.ORGANIC,
    displayName: 'Oats',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_FRUITS]: {
    type: ResourceType.FLORA_FOOD_FRUITS,
    parent: ResourceType.FLORA_FOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Fruits',
    isSpawnable: false,
  },
  [ResourceType.FLORA_FOOD_BERRIES]: {
    type: ResourceType.FLORA_FOOD_BERRIES,
    parent: ResourceType.FLORA_FOOD_FRUITS,
    category: ResourceCategory.ORGANIC,
    displayName: 'Berries',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_FRUITS_NATIVE]: {
    type: ResourceType.FLORA_FOOD_FRUITS_NATIVE,
    parent: ResourceType.FLORA_FOOD_FRUITS,
    category: ResourceCategory.ORGANIC,
    displayName: 'Native Fruits',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_VEGETABLES]: {
    type: ResourceType.FLORA_FOOD_VEGETABLES,
    parent: ResourceType.FLORA_FOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Vegetables',
    isSpawnable: false,
  },
  [ResourceType.FLORA_FOOD_VEGETABLES_GREENS]: {
    type: ResourceType.FLORA_FOOD_VEGETABLES_GREENS,
    parent: ResourceType.FLORA_FOOD_VEGETABLES,
    category: ResourceCategory.ORGANIC,
    displayName: 'Greens',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_VEGETABLES_BEANS]: {
    type: ResourceType.FLORA_FOOD_VEGETABLES_BEANS,
    parent: ResourceType.FLORA_FOOD_VEGETABLES,
    category: ResourceCategory.ORGANIC,
    displayName: 'Beans',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_VEGETABLES_TUBERS]: {
    type: ResourceType.FLORA_FOOD_VEGETABLES_TUBERS,
    parent: ResourceType.FLORA_FOOD_VEGETABLES,
    category: ResourceCategory.ORGANIC,
    displayName: 'Tubers',
    isSpawnable: true,
  },
  [ResourceType.FLORA_FOOD_VEGETABLES_FUNGI]: {
    type: ResourceType.FLORA_FOOD_VEGETABLES_FUNGI,
    parent: ResourceType.FLORA_FOOD_VEGETABLES,
    category: ResourceCategory.ORGANIC,
    displayName: 'Fungi',
    isSpawnable: true,
  },
  [ResourceType.FLORA_STRUCTURAL]: {
    type: ResourceType.FLORA_STRUCTURAL,
    parent: ResourceType.FLORA,
    category: ResourceCategory.ORGANIC,
    displayName: 'Structural Flora',
    isSpawnable: false,
  },
  [ResourceType.FLORA_STRUCTURAL_WOOD]: {
    type: ResourceType.FLORA_STRUCTURAL_WOOD,
    parent: ResourceType.FLORA_STRUCTURAL,
    category: ResourceCategory.ORGANIC,
    displayName: 'Wood',
    isSpawnable: false,
  },
  [ResourceType.FLORA_STRUCTURAL_WOOD_DECIDUOUS]: {
    type: ResourceType.FLORA_STRUCTURAL_WOOD_DECIDUOUS,
    parent: ResourceType.FLORA_STRUCTURAL_WOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Deciduous Wood',
    isSpawnable: true,
  },
  [ResourceType.FLORA_STRUCTURAL_WOOD_CONIFER]: {
    type: ResourceType.FLORA_STRUCTURAL_WOOD_CONIFER,
    parent: ResourceType.FLORA_STRUCTURAL_WOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Conifer Wood',
    isSpawnable: true,
  },
  [ResourceType.FLORA_STRUCTURAL_WOOD_EVERGREEN]: {
    type: ResourceType.FLORA_STRUCTURAL_WOOD_EVERGREEN,
    parent: ResourceType.FLORA_STRUCTURAL_WOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Evergreen Wood',
    isSpawnable: true,
  },

  // ===== CREATURE RESOURCES HIERARCHY =====
  [ResourceType.CREATURE_RESOURCES]: {
    type: ResourceType.CREATURE_RESOURCES,
    parent: ResourceType.ORGANIC,
    category: ResourceCategory.ORGANIC,
    displayName: 'Creature Resources',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_FOOD]: {
    type: ResourceType.CREATURE_FOOD,
    parent: ResourceType.CREATURE_RESOURCES,
    category: ResourceCategory.ORGANIC,
    displayName: 'Creature Food',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_FOOD_MEAT]: {
    type: ResourceType.CREATURE_FOOD_MEAT,
    parent: ResourceType.CREATURE_FOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Meat',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_FOOD_MEAT_DOMESTICATED]: {
    type: ResourceType.CREATURE_FOOD_MEAT_DOMESTICATED,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Domesticated Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_WILD]: {
    type: ResourceType.CREATURE_FOOD_MEAT_WILD,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Wild Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_HERBIVORE]: {
    type: ResourceType.CREATURE_FOOD_MEAT_HERBIVORE,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Herbivore Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_CARNIVORE]: {
    type: ResourceType.CREATURE_FOOD_MEAT_CARNIVORE,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Carnivore Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_REPTILIAN]: {
    type: ResourceType.CREATURE_FOOD_MEAT_REPTILIAN,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Reptilian Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_AVIAN]: {
    type: ResourceType.CREATURE_FOOD_MEAT_AVIAN,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Avian Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_INSECT]: {
    type: ResourceType.CREATURE_FOOD_MEAT_INSECT,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Insect Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MEAT_EGG]: {
    type: ResourceType.CREATURE_FOOD_MEAT_EGG,
    parent: ResourceType.CREATURE_FOOD_MEAT,
    category: ResourceCategory.ORGANIC,
    displayName: 'Egg',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_SEAFOOD]: {
    type: ResourceType.CREATURE_FOOD_SEAFOOD,
    parent: ResourceType.CREATURE_FOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Seafood',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_FOOD_SEAFOOD_FISH]: {
    type: ResourceType.CREATURE_FOOD_SEAFOOD_FISH,
    parent: ResourceType.CREATURE_FOOD_SEAFOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Fish Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_SEAFOOD_CRUSTACEAN]: {
    type: ResourceType.CREATURE_FOOD_SEAFOOD_CRUSTACEAN,
    parent: ResourceType.CREATURE_FOOD_SEAFOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Crustacean Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_SEAFOOD_MOLLUSK]: {
    type: ResourceType.CREATURE_FOOD_SEAFOOD_MOLLUSK,
    parent: ResourceType.CREATURE_FOOD_SEAFOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Mollusk Meat',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MILK]: {
    type: ResourceType.CREATURE_FOOD_MILK,
    parent: ResourceType.CREATURE_FOOD,
    category: ResourceCategory.ORGANIC,
    displayName: 'Milk',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_FOOD_MILK_DOMESTICATED]: {
    type: ResourceType.CREATURE_FOOD_MILK_DOMESTICATED,
    parent: ResourceType.CREATURE_FOOD_MILK,
    category: ResourceCategory.ORGANIC,
    displayName: 'Domesticated Milk',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_FOOD_MILK_WILD]: {
    type: ResourceType.CREATURE_FOOD_MILK_WILD,
    parent: ResourceType.CREATURE_FOOD_MILK,
    category: ResourceCategory.ORGANIC,
    displayName: 'Wild Milk',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL]: {
    type: ResourceType.CREATURE_STRUCTURAL,
    parent: ResourceType.CREATURE_RESOURCES,
    category: ResourceCategory.ORGANIC,
    displayName: 'Structural Creature Resources',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_STRUCTURAL_BONE]: {
    type: ResourceType.CREATURE_STRUCTURAL_BONE,
    parent: ResourceType.CREATURE_STRUCTURAL,
    category: ResourceCategory.ORGANIC,
    displayName: 'Bone',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_STRUCTURAL_BONE_MAMMAL]: {
    type: ResourceType.CREATURE_STRUCTURAL_BONE_MAMMAL,
    parent: ResourceType.CREATURE_STRUCTURAL_BONE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Mammal Bone',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL_BONE_AVIAN]: {
    type: ResourceType.CREATURE_STRUCTURAL_BONE_AVIAN,
    parent: ResourceType.CREATURE_STRUCTURAL_BONE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Avian Bone',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL_BONE_HORN]: {
    type: ResourceType.CREATURE_STRUCTURAL_BONE_HORN,
    parent: ResourceType.CREATURE_STRUCTURAL_BONE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Horn',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL_HIDE]: {
    type: ResourceType.CREATURE_STRUCTURAL_HIDE,
    parent: ResourceType.CREATURE_STRUCTURAL,
    category: ResourceCategory.ORGANIC,
    displayName: 'Hide',
    isSpawnable: false,
  },
  [ResourceType.CREATURE_STRUCTURAL_HIDE_LEATHERY]: {
    type: ResourceType.CREATURE_STRUCTURAL_HIDE_LEATHERY,
    parent: ResourceType.CREATURE_STRUCTURAL_HIDE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Leathery Hide',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL_HIDE_BRISTLEY]: {
    type: ResourceType.CREATURE_STRUCTURAL_HIDE_BRISTLEY,
    parent: ResourceType.CREATURE_STRUCTURAL_HIDE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Bristley Hide',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL_HIDE_SCALEY]: {
    type: ResourceType.CREATURE_STRUCTURAL_HIDE_SCALEY,
    parent: ResourceType.CREATURE_STRUCTURAL_HIDE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Scaley Hide',
    isSpawnable: true,
  },
  [ResourceType.CREATURE_STRUCTURAL_HIDE_WOOLY]: {
    type: ResourceType.CREATURE_STRUCTURAL_HIDE_WOOLY,
    parent: ResourceType.CREATURE_STRUCTURAL_HIDE,
    category: ResourceCategory.ORGANIC,
    displayName: 'Wooly Hide',
    isSpawnable: true,
  },

  // ===== CHEMICAL HIERARCHY =====
  [ResourceType.CHEMICAL]: {
    type: ResourceType.CHEMICAL,
    parent: ResourceType.ORGANIC,
    category: ResourceCategory.ORGANIC,
    displayName: 'Chemical',
    isSpawnable: false,
  },
  [ResourceType.CHEMICAL_COMPOUND]: {
    type: ResourceType.CHEMICAL_COMPOUND,
    parent: ResourceType.CHEMICAL,
    category: ResourceCategory.ORGANIC,
    displayName: 'Chemical Compound',
    isSpawnable: false,
  },
  [ResourceType.CHEMICAL_COMPOUND_FUEL]: {
    type: ResourceType.CHEMICAL_COMPOUND_FUEL,
    parent: ResourceType.CHEMICAL_COMPOUND,
    category: ResourceCategory.ORGANIC,
    displayName: 'Fuel',
    isSpawnable: true,
  },
  [ResourceType.CHEMICAL_COMPOUND_POLYMER]: {
    type: ResourceType.CHEMICAL_COMPOUND_POLYMER,
    parent: ResourceType.CHEMICAL_COMPOUND,
    category: ResourceCategory.ORGANIC,
    displayName: 'Polymer',
    isSpawnable: true,
  },
  [ResourceType.CHEMICAL_COMPOUND_LUBRICANT]: {
    type: ResourceType.CHEMICAL_COMPOUND_LUBRICANT,
    parent: ResourceType.CHEMICAL_COMPOUND,
    category: ResourceCategory.ORGANIC,
    displayName: 'Lubricant',
    isSpawnable: true,
  },

  // ===== MINERAL HIERARCHY =====
  [ResourceType.MINERAL]: {
    type: ResourceType.MINERAL,
    parent: ResourceType.INORGANIC,
    category: ResourceCategory.INORGANIC,
    displayName: 'Mineral',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_FUEL]: {
    type: ResourceType.MINERAL_FUEL,
    parent: ResourceType.MINERAL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Mineral Fuel',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_FUEL_PETROCHEM_SOLID]: {
    type: ResourceType.MINERAL_FUEL_PETROCHEM_SOLID,
    parent: ResourceType.MINERAL_FUEL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Solid Petrochemical',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_FUEL_PETROCHEM_LIQUID]: {
    type: ResourceType.MINERAL_FUEL_PETROCHEM_LIQUID,
    parent: ResourceType.MINERAL_FUEL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Liquid Petrochemical',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_FUEL_RADIOACTIVE]: {
    type: ResourceType.MINERAL_FUEL_RADIOACTIVE,
    parent: ResourceType.MINERAL_FUEL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Radioactive Fuel',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_METAL]: {
    type: ResourceType.MINERAL_METAL,
    parent: ResourceType.MINERAL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Metal',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_METAL_FERROUS]: {
    type: ResourceType.MINERAL_METAL_FERROUS,
    parent: ResourceType.MINERAL_METAL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Ferrous Metal',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_METAL_FERROUS_STEEL]: {
    type: ResourceType.MINERAL_METAL_FERROUS_STEEL,
    parent: ResourceType.MINERAL_METAL_FERROUS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Steel',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_METAL_FERROUS_IRON]: {
    type: ResourceType.MINERAL_METAL_FERROUS_IRON,
    parent: ResourceType.MINERAL_METAL_FERROUS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Iron',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_METAL_NONFERROUS]: {
    type: ResourceType.MINERAL_METAL_NONFERROUS,
    parent: ResourceType.MINERAL_METAL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Non-Ferrous Metal',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_METAL_NONFERROUS_ALUMINUM]: {
    type: ResourceType.MINERAL_METAL_NONFERROUS_ALUMINUM,
    parent: ResourceType.MINERAL_METAL_NONFERROUS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Aluminum',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_METAL_NONFERROUS_COPPER]: {
    type: ResourceType.MINERAL_METAL_NONFERROUS_COPPER,
    parent: ResourceType.MINERAL_METAL_NONFERROUS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Copper',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_METAL_NONFERROUS_TITANIUM]: {
    type: ResourceType.MINERAL_METAL_NONFERROUS_TITANIUM,
    parent: ResourceType.MINERAL_METAL_NONFERROUS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Titanium',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_GEMSTONE]: {
    type: ResourceType.MINERAL_GEMSTONE,
    parent: ResourceType.MINERAL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Gemstone',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_GEMSTONE_AMORPHOUS]: {
    type: ResourceType.MINERAL_GEMSTONE_AMORPHOUS,
    parent: ResourceType.MINERAL_GEMSTONE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Amorphous Gemstone',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_GEMSTONE_CRYSTALLINE]: {
    type: ResourceType.MINERAL_GEMSTONE_CRYSTALLINE,
    parent: ResourceType.MINERAL_GEMSTONE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Crystalline Gemstone',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_GEMSTONE_CRYSTALLINE_ARMOPHOUS]: {
    type: ResourceType.MINERAL_GEMSTONE_CRYSTALLINE_ARMOPHOUS,
    parent: ResourceType.MINERAL_GEMSTONE_CRYSTALLINE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Armophous Crystalline Gemstone',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_RADIOACTIVE]: {
    type: ResourceType.MINERAL_RADIOACTIVE,
    parent: ResourceType.MINERAL,
    category: ResourceCategory.INORGANIC,
    displayName: 'Radioactive Mineral',
    isSpawnable: false,
  },
  [ResourceType.MINERAL_RADIOACTIVE_KNOWN]: {
    type: ResourceType.MINERAL_RADIOACTIVE_KNOWN,
    parent: ResourceType.MINERAL_RADIOACTIVE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Known Radioactive',
    isSpawnable: true,
  },
  [ResourceType.MINERAL_RADIOACTIVE_UNKNOWN]: {
    type: ResourceType.MINERAL_RADIOACTIVE_UNKNOWN,
    parent: ResourceType.MINERAL_RADIOACTIVE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Unknown Radioactive',
    isSpawnable: true,
  },

  // ===== GAS HIERARCHY =====
  [ResourceType.GAS]: {
    type: ResourceType.GAS,
    parent: ResourceType.INORGANIC,
    category: ResourceCategory.INORGANIC,
    displayName: 'Gas',
    isSpawnable: false,
  },
  [ResourceType.GAS_REACTIVE]: {
    type: ResourceType.GAS_REACTIVE,
    parent: ResourceType.GAS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Reactive Gas',
    isSpawnable: false,
  },
  [ResourceType.GAS_REACTIVE_KNOWN]: {
    type: ResourceType.GAS_REACTIVE_KNOWN,
    parent: ResourceType.GAS_REACTIVE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Known Reactive Gas',
    isSpawnable: true,
  },
  [ResourceType.GAS_REACTIVE_UNKNOWN]: {
    type: ResourceType.GAS_REACTIVE_UNKNOWN,
    parent: ResourceType.GAS_REACTIVE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Unknown Reactive Gas',
    isSpawnable: true,
  },
  [ResourceType.GAS_INERT]: {
    type: ResourceType.GAS_INERT,
    parent: ResourceType.GAS,
    category: ResourceCategory.INORGANIC,
    displayName: 'Inert Gas',
    isSpawnable: false,
  },
  [ResourceType.GAS_INERT_KNOWN]: {
    type: ResourceType.GAS_INERT_KNOWN,
    parent: ResourceType.GAS_INERT,
    category: ResourceCategory.INORGANIC,
    displayName: 'Known Inert Gas',
    isSpawnable: true,
  },
  [ResourceType.GAS_INERT_UNKNOWN]: {
    type: ResourceType.GAS_INERT_UNKNOWN,
    parent: ResourceType.GAS_INERT,
    category: ResourceCategory.INORGANIC,
    displayName: 'Unknown Inert Gas',
    isSpawnable: true,
  },

  // ===== WATER HIERARCHY =====
  [ResourceType.WATER]: {
    type: ResourceType.WATER,
    parent: ResourceType.INORGANIC,
    category: ResourceCategory.INORGANIC,
    displayName: 'Water',
    isSpawnable: false,
  },
  [ResourceType.WATER_VAPOR]: {
    type: ResourceType.WATER_VAPOR,
    parent: ResourceType.WATER,
    category: ResourceCategory.INORGANIC,
    displayName: 'Water Vapor',
    isSpawnable: false,
  },
  [ResourceType.WATER_VAPOR_WET]: {
    type: ResourceType.WATER_VAPOR_WET,
    parent: ResourceType.WATER_VAPOR,
    category: ResourceCategory.INORGANIC,
    displayName: 'Wet Water Vapor',
    isSpawnable: true,
  },
  [ResourceType.WATER_VAPOR_DRY]: {
    type: ResourceType.WATER_VAPOR_DRY,
    parent: ResourceType.WATER_VAPOR,
    category: ResourceCategory.INORGANIC,
    displayName: 'Dry Water Vapor',
    isSpawnable: true,
  },

  // ===== JTL RESOURCES =====
  [ResourceType.JTL_RESOURCE]: {
    type: ResourceType.JTL_RESOURCE,
    parent: ResourceType.INORGANIC,
    category: ResourceCategory.INORGANIC,
    displayName: 'Space Resource',
    isSpawnable: false,
  },
  [ResourceType.JTL_RESOURCE_METAL]: {
    type: ResourceType.JTL_RESOURCE_METAL,
    parent: ResourceType.JTL_RESOURCE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Space Metal',
    isSpawnable: true,
  },
  [ResourceType.JTL_RESOURCE_GAS]: {
    type: ResourceType.JTL_RESOURCE_GAS,
    parent: ResourceType.JTL_RESOURCE,
    category: ResourceCategory.INORGANIC,
    displayName: 'Space Gas',
    isSpawnable: true,
  },

  // ===== RECYCLED RESOURCES =====
  [ResourceType.RECYCLED]: {
    type: ResourceType.RECYCLED,
    parent: ResourceType.INORGANIC,
    category: ResourceCategory.INORGANIC,
    displayName: 'Recycled',
    isSpawnable: false,
  },
  [ResourceType.RECYCLED_METAL]: {
    type: ResourceType.RECYCLED_METAL,
    parent: ResourceType.RECYCLED,
    category: ResourceCategory.INORGANIC,
    displayName: 'Recycled Metal',
    isSpawnable: false,
  },
  [ResourceType.RECYCLED_ORE]: {
    type: ResourceType.RECYCLED_ORE,
    parent: ResourceType.RECYCLED,
    category: ResourceCategory.INORGANIC,
    displayName: 'Recycled Ore',
    isSpawnable: false,
  },
  [ResourceType.RECYCLED_CHEMICAL]: {
    type: ResourceType.RECYCLED_CHEMICAL,
    parent: ResourceType.RECYCLED,
    category: ResourceCategory.INORGANIC,
    displayName: 'Recycled Chemical',
    isSpawnable: false,
  },
  [ResourceType.RECYCLED_FIBERPLAST]: {
    type: ResourceType.RECYCLED_FIBERPLAST,
    parent: ResourceType.RECYCLED,
    category: ResourceCategory.INORGANIC,
    displayName: 'Recycled Fiberplast',
    isSpawnable: false,
  },
};

/**
 * Get the parent resource type for a given type
 * @param type - The resource type to get parent for
 * @returns The parent type or null if root
 */
export function getParentResourceType(type: ResourceType): ResourceType | null {
  return RESOURCE_TYPE_HIERARCHY[type]?.parent ?? null;
}

/**
 * Get all ancestor types for a resource type (including itself)
 * @param type - The resource type
 * @returns Array of types from most specific to root
 */
export function getResourceTypeAncestors(type: ResourceType): ResourceType[] {
  const ancestors: ResourceType[] = [];
  let current: ResourceType | null = type;

  while (current !== null) {
    ancestors.push(current);
    current = getParentResourceType(current);
  }

  return ancestors;
}

/**
 * Check if a resource type is a subtype of another
 * @param type - The type to check
 * @param ancestorType - The potential ancestor type
 * @returns True if type is a subtype of ancestorType
 */
export function isSubtypeOf(type: ResourceType, ancestorType: ResourceType): boolean {
  const ancestors = getResourceTypeAncestors(type);
  return ancestors.includes(ancestorType);
}

/**
 * Get all child types for a resource type
 * @param type - The parent type
 * @returns Array of direct child types
 */
export function getChildResourceTypes(type: ResourceType): ResourceType[] {
  return Object.values(RESOURCE_TYPE_HIERARCHY)
    .filter((info) => info.parent === type)
    .map((info) => info.type);
}

/**
 * Get all descendant types for a resource type (recursive)
 * @param type - The ancestor type
 * @returns Array of all descendant types
 */
export function getAllDescendantTypes(type: ResourceType): ResourceType[] {
  const descendants: ResourceType[] = [];
  const children = getChildResourceTypes(type);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getAllDescendantTypes(child));
  }

  return descendants;
}

/**
 * Get all spawnable types that are descendants of a type
 * @param type - The ancestor type
 * @returns Array of spawnable descendant types
 */
export function getSpawnableDescendants(type: ResourceType): ResourceType[] {
  const descendants = getAllDescendantTypes(type);
  return descendants.filter((t) => RESOURCE_TYPE_HIERARCHY[t].isSpawnable);
}

/**
 * Get the category for a resource type
 * @param type - The resource type
 * @returns The resource category
 */
export function getResourceCategory(type: ResourceType): ResourceCategory {
  return RESOURCE_TYPE_HIERARCHY[type]?.category ?? ResourceCategory.INORGANIC;
}

/**
 * Get display name for a resource type
 * @param type - The resource type
 * @returns Human-readable display name
 */
export function getResourceTypeDisplayName(type: ResourceType): string {
  return RESOURCE_TYPE_HIERARCHY[type]?.displayName ?? type;
}
