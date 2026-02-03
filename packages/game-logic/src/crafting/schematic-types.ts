/**
 * @file schematic-types.ts
 * Core types for the SWG crafting schematic system
 */

/**
 * Categories of craftable items in SWG
 */
export enum SchematicCategory {
  Weapon = 'weapon',
  Armor = 'armor',
  Food = 'food',
  Clothing = 'clothing',
  Furniture = 'furniture',
  Droid = 'droid',
  Vehicle = 'vehicle',
  Structure = 'structure',
  Tool = 'tool',
  Medicine = 'medicine',
  Chemical = 'chemical',
  Electronics = 'electronics',
  Component = 'component',
  Ship = 'ship',
  ShipComponent = 'ship_component',
  Misc = 'misc',
}

/**
 * Types of ingredients that can be used in crafting slots
 */
export enum IngredientType {
  /** Raw resource from harvesting */
  Resource = 'resource',
  /** A pre-crafted component */
  Component = 'component',
  /** Multiple identical items required */
  Identical = 'identical',
  /** Optional ingredient that enhances output */
  Optional = 'optional',
  /** Looted or special item */
  Item = 'item',
}

/**
 * Crafting complexity levels that affect success rates and assembly quality
 */
export enum CraftingComplexity {
  /** Simple recipes anyone can make */
  Trivial = 1,
  /** Basic crafting, low skill requirement */
  Simple = 2,
  /** Standard difficulty crafting */
  Moderate = 3,
  /** Requires decent skill to succeed */
  Complex = 4,
  /** High-end crafting for skilled artisans */
  Advanced = 5,
  /** Master-level recipes */
  Expert = 6,
  /** Rare recipes requiring exceptional skill */
  Legendary = 7,
}

/**
 * Resource attribute weights for calculating how resource quality
 * affects the output item's attributes.
 *
 * Each weight is a percentage (0-100) indicating how much that
 * resource attribute contributes to the final calculation.
 */
export interface ResourceWeights {
  /** Conductivity weight */
  conductivity?: number;
  /** Cold Resistance weight */
  coldResistance?: number;
  /** Decay Resistance weight */
  decayResistance?: number;
  /** Entangle Resistance weight */
  entangleResistance?: number;
  /** Flavor weight (for food) */
  flavor?: number;
  /** Heat Resistance weight */
  heatResistance?: number;
  /** Malleability weight */
  malleability?: number;
  /** Overall Quality weight */
  overallQuality?: number;
  /** Potential Energy weight */
  potentialEnergy?: number;
  /** Shock Resistance weight */
  shockResistance?: number;
  /** Unit Toughness weight */
  unitToughness?: number;
}

/**
 * Default empty weights for slots that don't contribute to attributes
 */
export const EMPTY_WEIGHTS: Readonly<ResourceWeights> = Object.freeze({});

/**
 * Common weight configurations for different crafting scenarios
 */
export const CommonWeightConfigs = {
  /** Weapons prioritize conductivity and unit toughness */
  weapon: {
    conductivity: 50,
    unitToughness: 50,
  } as ResourceWeights,

  /** Armor prioritizes shock/heat/cold resistance */
  armor: {
    shockResistance: 34,
    heatResistance: 33,
    coldResistance: 33,
  } as ResourceWeights,

  /** Food prioritizes flavor and overall quality */
  food: {
    flavor: 60,
    overallQuality: 40,
  } as ResourceWeights,

  /** Electronics prioritize conductivity and quality */
  electronics: {
    conductivity: 60,
    overallQuality: 40,
  } as ResourceWeights,

  /** Structural items prioritize toughness */
  structural: {
    unitToughness: 70,
    malleability: 30,
  } as ResourceWeights,

  /** Medicine prioritizes quality and decay resistance */
  medicine: {
    overallQuality: 50,
    decayResistance: 50,
  } as ResourceWeights,
};

/**
 * Crafting tool types required for different schematics
 */
export enum CraftingToolType {
  GenericCraftingTool = 'generic_crafting_tool',
  WeaponWorkbench = 'weapon_workbench',
  ArmorWorkbench = 'armor_workbench',
  FoodStation = 'food_station',
  ClothingStation = 'clothing_station',
  StructureStation = 'structure_station',
  DroidEngineeringStation = 'droid_engineering_station',
  ShipwrightStation = 'shipwright_station',
  ChemistryStation = 'chemistry_station',
}

/**
 * Crafting XP types awarded for different schematics
 */
export enum CraftingXpType {
  Weaponsmith = 'crafting_weapons_general',
  Armorsmith = 'crafting_armor_general',
  Chef = 'crafting_food_general',
  Tailor = 'crafting_clothing_general',
  Architect = 'crafting_structure_general',
  DroidEngineer = 'crafting_droid_general',
  Artisan = 'crafting_general',
  BioEngineer = 'crafting_bio_engineer_creature',
  Shipwright = 'crafting_space_ship',
  MedicineXp = 'crafting_medicine_general',
}

/**
 * Result codes for schematic operations
 */
export enum SchematicResultCode {
  Success = 0,
  NotFound = 1,
  InvalidData = 2,
  LoadError = 3,
  DuplicateCrc = 4,
  MissingDependency = 5,
}
