/**
 * Crafting Tool Types and Related Enumerations
 * Defines crafting tool classifications, station types, effectiveness ranges,
 * and mappings between tools and schematic types for the SWG crafting system.
 */

/**
 * Crafting tool type classification
 * Determines which profession schematics can be crafted with this tool
 */
export enum CraftingToolType {
  /** Generic crafting tool - basic schematics only */
  Generic = 0,
  /** Food and chemical crafting - chef and doctor schematics */
  FoodChemical = 1,
  /** Clothing and armor crafting - tailor schematics */
  Clothing = 2,
  /** Weapon crafting - weaponsmith schematics */
  Weapon = 3,
  /** Armor crafting - armorsmith schematics */
  Armor = 4,
  /** Structure crafting - architect schematics */
  Structure = 5,
  /** Droid crafting - droid engineer schematics */
  Droid = 6,
  /** Ship component crafting - shipwright schematics */
  Ship = 7,
  /** Lightsaber crafting - Jedi schematics */
  Lightsaber = 8,
  /** Survey/sampling tool - bio-engineer schematics */
  BioEngineer = 9,
  /** Slicing tool - smuggler/slicing operations */
  Slicing = 10,
}

/**
 * Crafting station type classification
 * Placed stations that provide enhanced crafting capabilities
 */
export enum StationType {
  /** Generic crafting station */
  Generic = 0,
  /** Food preparation station - chef crafting */
  Food = 1,
  /** Chemistry station - doctor/medic crafting */
  Chemistry = 2,
  /** Clothing station - tailor crafting */
  Clothing = 3,
  /** Weapon crafting station - weaponsmith */
  Weapon = 4,
  /** Armor crafting station - armorsmith */
  Armor = 5,
  /** Structure crafting station - architect */
  Structure = 6,
  /** Droid assembly station - droid engineer */
  Droid = 7,
  /** Ship component station - shipwright */
  Ship = 8,
  /** Lightsaber crafting station - Jedi */
  Lightsaber = 9,
  /** Incubator station - bio-engineer */
  Incubator = 10,
}

/**
 * Tool quality tiers
 * Determines base effectiveness ranges
 */
export enum ToolQuality {
  /** Basic/starter tools - lowest effectiveness */
  Basic = 0,
  /** Standard quality tools */
  Standard = 1,
  /** Advanced quality tools */
  Advanced = 2,
  /** Superior quality tools */
  Superior = 3,
  /** Exceptional quality tools - highest effectiveness */
  Exceptional = 4,
}

/**
 * Tool effectiveness range by quality tier
 */
export interface ToolEffectivenessRange {
  /** Minimum effectiveness bonus (0-100) */
  min: number;
  /** Maximum effectiveness bonus (0-100) */
  max: number;
  /** Default effectiveness for this tier */
  default: number;
}

/**
 * Effectiveness ranges by tool quality
 */
export const TOOL_EFFECTIVENESS_BY_QUALITY: Record<ToolQuality, ToolEffectivenessRange> = {
  [ToolQuality.Basic]: { min: 0, max: 10, default: 5 },
  [ToolQuality.Standard]: { min: 10, max: 25, default: 15 },
  [ToolQuality.Advanced]: { min: 25, max: 50, default: 35 },
  [ToolQuality.Superior]: { min: 50, max: 75, default: 60 },
  [ToolQuality.Exceptional]: { min: 75, max: 100, default: 85 },
};

/**
 * Complexity limits by tool quality
 * Higher complexity allows crafting more advanced schematics
 */
export const TOOL_COMPLEXITY_BY_QUALITY: Record<ToolQuality, number> = {
  [ToolQuality.Basic]: 15,
  [ToolQuality.Standard]: 25,
  [ToolQuality.Advanced]: 35,
  [ToolQuality.Superior]: 45,
  [ToolQuality.Exceptional]: 55,
};

/**
 * Schematic type enumeration for tool compatibility
 */
export enum SchematicType {
  /** Basic/generic schematics */
  Generic = 0,
  /** Food preparation schematics */
  Food = 1,
  /** Chemical/medicine schematics */
  Chemical = 2,
  /** Clothing/textile schematics */
  Clothing = 3,
  /** Ranged weapon schematics */
  RangedWeapon = 4,
  /** Melee weapon schematics */
  MeleeWeapon = 5,
  /** Armor schematics */
  Armor = 6,
  /** Structure/furniture schematics */
  Structure = 7,
  /** Droid component schematics */
  Droid = 8,
  /** Ship component schematics */
  Ship = 9,
  /** Lightsaber schematics */
  Lightsaber = 10,
  /** Bio-engineered creature schematics */
  BioEngineered = 11,
  /** Sliced item schematics */
  Sliced = 12,
}

/**
 * Mapping of crafting tool types to compatible schematic types
 * Each tool type can craft one or more schematic categories
 */
export const TOOL_SCHEMATIC_TYPES: Record<CraftingToolType, SchematicType[]> = {
  [CraftingToolType.Generic]: [SchematicType.Generic],
  [CraftingToolType.FoodChemical]: [SchematicType.Food, SchematicType.Chemical],
  [CraftingToolType.Clothing]: [SchematicType.Clothing],
  [CraftingToolType.Weapon]: [SchematicType.RangedWeapon, SchematicType.MeleeWeapon],
  [CraftingToolType.Armor]: [SchematicType.Armor],
  [CraftingToolType.Structure]: [SchematicType.Structure],
  [CraftingToolType.Droid]: [SchematicType.Droid],
  [CraftingToolType.Ship]: [SchematicType.Ship],
  [CraftingToolType.Lightsaber]: [SchematicType.Lightsaber],
  [CraftingToolType.BioEngineer]: [SchematicType.BioEngineered],
  [CraftingToolType.Slicing]: [SchematicType.Sliced],
};

/**
 * Station type to crafting tool type mapping
 */
export const STATION_TO_TOOL_TYPE: Record<StationType, CraftingToolType> = {
  [StationType.Generic]: CraftingToolType.Generic,
  [StationType.Food]: CraftingToolType.FoodChemical,
  [StationType.Chemistry]: CraftingToolType.FoodChemical,
  [StationType.Clothing]: CraftingToolType.Clothing,
  [StationType.Weapon]: CraftingToolType.Weapon,
  [StationType.Armor]: CraftingToolType.Armor,
  [StationType.Structure]: CraftingToolType.Structure,
  [StationType.Droid]: CraftingToolType.Droid,
  [StationType.Ship]: CraftingToolType.Ship,
  [StationType.Lightsaber]: CraftingToolType.Lightsaber,
  [StationType.Incubator]: CraftingToolType.BioEngineer,
};

/**
 * Required skill for using each tool type
 * Player must have this skill to use the tool
 */
export const TOOL_SKILL_REQUIREMENTS: Record<CraftingToolType, string> = {
  [CraftingToolType.Generic]: '',
  [CraftingToolType.FoodChemical]: 'crafting_food_general',
  [CraftingToolType.Clothing]: 'crafting_clothing_general',
  [CraftingToolType.Weapon]: 'crafting_weapon_general',
  [CraftingToolType.Armor]: 'crafting_armor_general',
  [CraftingToolType.Structure]: 'crafting_structure_general',
  [CraftingToolType.Droid]: 'crafting_droid_general',
  [CraftingToolType.Ship]: 'crafting_ship_general',
  [CraftingToolType.Lightsaber]: 'jedi_saber_crafting',
  [CraftingToolType.BioEngineer]: 'crafting_bio_engineer_general',
  [CraftingToolType.Slicing]: 'combat_smuggler_slicing',
};

/**
 * Station effectiveness bonus over handheld tools
 * Stations provide a flat bonus to effectiveness
 */
export const STATION_EFFECTIVENESS_BONUS = 15;

/**
 * Station experimentation bonus over handheld tools
 */
export const STATION_EXPERIMENTATION_BONUS = 10;

/**
 * Get the display name for a crafting tool type
 */
export function getCraftingToolTypeName(type: CraftingToolType): string {
  switch (type) {
    case CraftingToolType.Generic:
      return 'Generic Crafting Tool';
    case CraftingToolType.FoodChemical:
      return 'Food & Chemical Crafting Tool';
    case CraftingToolType.Clothing:
      return 'Clothing Crafting Tool';
    case CraftingToolType.Weapon:
      return 'Weapon Crafting Tool';
    case CraftingToolType.Armor:
      return 'Armor Crafting Tool';
    case CraftingToolType.Structure:
      return 'Structure Crafting Tool';
    case CraftingToolType.Droid:
      return 'Droid Crafting Tool';
    case CraftingToolType.Ship:
      return 'Ship Component Crafting Tool';
    case CraftingToolType.Lightsaber:
      return 'Lightsaber Crafting Tool';
    case CraftingToolType.BioEngineer:
      return 'Bio-Engineer Sampling Tool';
    case CraftingToolType.Slicing:
      return 'Slicing Tool';
    default:
      return 'Unknown Tool';
  }
}

/**
 * Get the display name for a station type
 */
export function getStationTypeName(type: StationType): string {
  switch (type) {
    case StationType.Generic:
      return 'Generic Crafting Station';
    case StationType.Food:
      return 'Food Preparation Station';
    case StationType.Chemistry:
      return 'Chemistry Crafting Station';
    case StationType.Clothing:
      return 'Clothing Crafting Station';
    case StationType.Weapon:
      return 'Weapon Crafting Station';
    case StationType.Armor:
      return 'Armor Crafting Station';
    case StationType.Structure:
      return 'Structure Crafting Station';
    case StationType.Droid:
      return 'Droid Assembly Station';
    case StationType.Ship:
      return 'Ship Component Station';
    case StationType.Lightsaber:
      return 'Lightsaber Crafting Station';
    case StationType.Incubator:
      return 'Creature Incubator';
    default:
      return 'Unknown Station';
  }
}

/**
 * Get the display name for a schematic type
 */
export function getSchematicTypeName(type: SchematicType): string {
  switch (type) {
    case SchematicType.Generic:
      return 'Generic';
    case SchematicType.Food:
      return 'Food';
    case SchematicType.Chemical:
      return 'Chemical';
    case SchematicType.Clothing:
      return 'Clothing';
    case SchematicType.RangedWeapon:
      return 'Ranged Weapon';
    case SchematicType.MeleeWeapon:
      return 'Melee Weapon';
    case SchematicType.Armor:
      return 'Armor';
    case SchematicType.Structure:
      return 'Structure';
    case SchematicType.Droid:
      return 'Droid';
    case SchematicType.Ship:
      return 'Ship Component';
    case SchematicType.Lightsaber:
      return 'Lightsaber';
    case SchematicType.BioEngineered:
      return 'Bio-Engineered';
    case SchematicType.Sliced:
      return 'Sliced';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for a tool quality
 */
export function getToolQualityName(quality: ToolQuality): string {
  switch (quality) {
    case ToolQuality.Basic:
      return 'Basic';
    case ToolQuality.Standard:
      return 'Standard';
    case ToolQuality.Advanced:
      return 'Advanced';
    case ToolQuality.Superior:
      return 'Superior';
    case ToolQuality.Exceptional:
      return 'Exceptional';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a tool type can craft a specific schematic type
 */
export function canToolCraftSchematicType(
  toolType: CraftingToolType,
  schematicType: SchematicType
): boolean {
  const compatibleTypes = TOOL_SCHEMATIC_TYPES[toolType];
  return compatibleTypes?.includes(schematicType) ?? false;
}

/**
 * Get the crafting tool type for a station type
 */
export function getToolTypeForStation(stationType: StationType): CraftingToolType {
  return STATION_TO_TOOL_TYPE[stationType] ?? CraftingToolType.Generic;
}

/**
 * Get the required skill for a tool type
 */
export function getToolSkillRequirement(toolType: CraftingToolType): string {
  return TOOL_SKILL_REQUIREMENTS[toolType] ?? '';
}

/**
 * Calculate effectiveness based on quality and random variance
 */
export function calculateEffectiveness(quality: ToolQuality, variance: number = 0.5): number {
  const range = TOOL_EFFECTIVENESS_BY_QUALITY[quality];
  if (!range) return 0;

  const spread = range.max - range.min;
  return Math.round(range.min + spread * Math.max(0, Math.min(1, variance)));
}

/**
 * Get the complexity limit for a tool quality
 */
export function getComplexityLimit(quality: ToolQuality): number {
  return TOOL_COMPLEXITY_BY_QUALITY[quality] ?? 15;
}
