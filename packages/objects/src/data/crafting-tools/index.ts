/**
 * Crafting Tool Template Loader
 * Provides access to crafting tool and station template data
 */

import type { ObjectId, CrcValue, Vector3 } from '@swg/shared-types';
import { CraftingTool } from '../../crafting-tool.js';
import { CraftingStation, type PlacementRules } from '../../crafting-station.js';
import {
  CraftingToolType,
  StationType,
  ToolQuality,
} from '../../crafting-tool-types.js';

// Import crafting tool templates
import genericCraftingToolData from './generic-crafting-tool.json' with { type: 'json' };
import foodCraftingStationData from './food-crafting-station.json' with { type: 'json' };
import weaponCraftingStationData from './weapon-crafting-station.json' with { type: 'json' };
import clothingCraftingToolData from './clothing-crafting-tool.json' with { type: 'json' };
import armorCraftingStationData from './armor-crafting-station.json' with { type: 'json' };
import structureCraftingToolData from './structure-crafting-tool.json' with { type: 'json' };
import droidCraftingStationData from './droid-crafting-station.json' with { type: 'json' };
import shipCraftingStationData from './ship-crafting-station.json' with { type: 'json' };
import lightsaberCraftingStationData from './lightsaber-crafting-station.json' with { type: 'json' };
import chemistryCraftingStationData from './chemistry-crafting-station.json' with { type: 'json' };

/**
 * Crafting tool template data structure
 */
export interface CraftingToolTemplateData {
  name: string;
  description: string;
  templateId: string;
  craftingToolType: number;
  stationType: number | null;
  isStation: boolean;
  toolQuality: number;
  effectiveness: number;
  complexityLimit: number;
  assemblyBonus: number;
  experimentationBonus: number;
  maxUses: number;
  requiredSkill: string;
  maxCondition: number;
  complexity: number;
  volume: number;
  stfFile: string;
  stfName: string;
  placementRules: PlacementRules | null;
}

/**
 * Registry of all crafting tool templates
 */
export const CraftingToolTemplates: Record<string, CraftingToolTemplateData> = {
  generic_crafting_tool: genericCraftingToolData as CraftingToolTemplateData,
  food_crafting_station: foodCraftingStationData as CraftingToolTemplateData,
  weapon_crafting_station: weaponCraftingStationData as CraftingToolTemplateData,
  clothing_crafting_tool: clothingCraftingToolData as CraftingToolTemplateData,
  armor_crafting_station: armorCraftingStationData as CraftingToolTemplateData,
  structure_crafting_tool: structureCraftingToolData as CraftingToolTemplateData,
  droid_crafting_station: droidCraftingStationData as CraftingToolTemplateData,
  ship_crafting_station: shipCraftingStationData as CraftingToolTemplateData,
  lightsaber_crafting_station: lightsaberCraftingStationData as CraftingToolTemplateData,
  chemistry_crafting_station: chemistryCraftingStationData as CraftingToolTemplateData,
};

/**
 * Map of template IDs to template keys
 */
const templateIdToKey: Map<string, string> = new Map([
  ['object/tangible/crafting/station/generic_tool.iff', 'generic_crafting_tool'],
  ['object/tangible/crafting/station/food_station.iff', 'food_crafting_station'],
  ['object/tangible/crafting/station/weapon_station.iff', 'weapon_crafting_station'],
  ['object/tangible/crafting/station/clothing_tool.iff', 'clothing_crafting_tool'],
  ['object/tangible/crafting/station/armor_station.iff', 'armor_crafting_station'],
  ['object/tangible/crafting/station/structure_tool.iff', 'structure_crafting_tool'],
  ['object/tangible/crafting/station/droid_station.iff', 'droid_crafting_station'],
  ['object/tangible/crafting/station/ship_station.iff', 'ship_crafting_station'],
  ['object/tangible/crafting/station/lightsaber_station.iff', 'lightsaber_crafting_station'],
  ['object/tangible/crafting/station/chemistry_station.iff', 'chemistry_crafting_station'],
]);

/**
 * Get a crafting tool template by key
 * @param key - Template key (e.g., 'generic_crafting_tool')
 */
export function getCraftingToolTemplate(key: string): CraftingToolTemplateData | undefined {
  return CraftingToolTemplates[key];
}

/**
 * Get a crafting tool template by template ID path
 * @param templateId - Full template path (e.g., 'object/tangible/crafting/station/generic_tool.iff')
 */
export function getCraftingToolTemplateByPath(templateId: string): CraftingToolTemplateData | undefined {
  const key = templateIdToKey.get(templateId);
  if (!key) return undefined;
  return CraftingToolTemplates[key];
}

/**
 * Get all available crafting tool template keys
 */
export function getCraftingToolTemplateKeys(): string[] {
  return Object.keys(CraftingToolTemplates);
}

/**
 * Get all crafting tool templates (handheld tools only)
 */
export function getHandheldToolTemplates(): CraftingToolTemplateData[] {
  return Object.values(CraftingToolTemplates).filter(
    (template) => !template.isStation
  );
}

/**
 * Get all crafting station templates
 */
export function getCraftingStationTemplates(): CraftingToolTemplateData[] {
  return Object.values(CraftingToolTemplates).filter(
    (template) => template.isStation
  );
}

/**
 * Get all crafting tool templates of a specific type
 * @param toolType - The tool type to filter by
 */
export function getCraftingToolTemplatesByType(toolType: CraftingToolType): CraftingToolTemplateData[] {
  return Object.values(CraftingToolTemplates).filter(
    (template) => template.craftingToolType === toolType
  );
}

/**
 * Get all crafting station templates of a specific station type
 * @param stationType - The station type to filter by
 */
export function getCraftingStationTemplatesByType(stationType: StationType): CraftingToolTemplateData[] {
  return Object.values(CraftingToolTemplates).filter(
    (template) => template.stationType === stationType
  );
}

/**
 * Create a CraftingTool from template data
 * @param objectId - Unique object ID for the new tool
 * @param template - Template data to use
 * @param templateCrc - Optional CRC value (defaults to 0)
 */
export function createCraftingToolFromTemplate(
  objectId: ObjectId,
  template: CraftingToolTemplateData,
  templateCrc: CrcValue = 0
): CraftingTool {
  const tool = new CraftingTool(objectId, templateCrc);

  // Set crafting tool properties
  tool.setCraftingToolType(template.craftingToolType as CraftingToolType);
  tool.setToolQuality(template.toolQuality as ToolQuality);
  tool.setEffectiveness(template.effectiveness);
  tool.setComplexityLimit(template.complexityLimit);
  tool.setIsStation(template.isStation);
  tool.setAssemblyBonus(template.assemblyBonus);
  tool.setExperimentationBonus(template.experimentationBonus);

  // Set use tracking
  tool.setMaxUses(template.maxUses);
  tool.setUsesRemaining(template.maxUses);

  // Set tangible properties
  tool.maxCondition = template.maxCondition;
  tool.condition = template.maxCondition;
  tool.complexity = template.complexity;
  tool.volume = template.volume;

  // Set name
  tool.setObjectName(template.stfFile, template.stfName);

  // Clear dirty flags since this is initial creation
  tool.clearAllDeltas();

  return tool;
}

/**
 * Create a CraftingStation from template data
 * @param objectId - Unique object ID for the new station
 * @param template - Template data to use
 * @param templateCrc - Optional CRC value (defaults to 0)
 */
export function createCraftingStationFromTemplate(
  objectId: ObjectId,
  template: CraftingToolTemplateData,
  templateCrc: CrcValue = 0
): CraftingStation {
  if (!template.isStation) {
    throw new Error(`Template ${template.name} is not a station template`);
  }

  const station = new CraftingStation(objectId, templateCrc);

  // Set station type
  if (template.stationType !== null) {
    station.setStationType(template.stationType as StationType);
  }

  // Set crafting tool properties (some will be overridden by station type)
  station.setToolQuality(template.toolQuality as ToolQuality);
  station.setEffectiveness(template.effectiveness);
  station.setComplexityLimit(template.complexityLimit);
  station.setAssemblyBonus(template.assemblyBonus);
  station.setExperimentationBonus(template.experimentationBonus);

  // Set use tracking
  station.setMaxUses(template.maxUses);
  station.setUsesRemaining(template.maxUses);

  // Set tangible properties
  station.maxCondition = template.maxCondition;
  station.condition = template.maxCondition;
  station.complexity = template.complexity;
  station.volume = template.volume;

  // Set name
  station.setObjectName(template.stfFile, template.stfName);

  // Set placement rules if provided
  if (template.placementRules) {
    station.setPlacementRules(template.placementRules);
  }

  // Clear dirty flags since this is initial creation
  station.clearAllDeltas();

  return station;
}

/**
 * Create a CraftingTool or CraftingStation from a template key
 * Automatically determines if it should be a tool or station based on template
 * @param objectId - Unique object ID for the new item
 * @param templateKey - Template key (e.g., 'generic_crafting_tool')
 * @param templateCrc - Optional CRC value
 */
export function createCraftingToolByKey(
  objectId: ObjectId,
  templateKey: string,
  templateCrc: CrcValue = 0
): CraftingTool | CraftingStation | undefined {
  const template = getCraftingToolTemplate(templateKey);
  if (!template) return undefined;

  if (template.isStation) {
    return createCraftingStationFromTemplate(objectId, template, templateCrc);
  }

  return createCraftingToolFromTemplate(objectId, template, templateCrc);
}

/**
 * Create a placed CraftingStation from template
 * @param objectId - Unique object ID for the new station
 * @param templateKey - Template key
 * @param position - World position to place the station
 * @param rotation - Rotation in radians
 * @param cellId - Cell ID if placing inside a building (null for outdoors)
 * @param placedBy - ID of the player placing the station
 * @param templateCrc - Optional CRC value
 */
export function createPlacedStation(
  objectId: ObjectId,
  templateKey: string,
  position: Vector3,
  rotation: number,
  cellId: ObjectId | null,
  placedBy: ObjectId,
  templateCrc: CrcValue = 0
): CraftingStation | undefined {
  const template = getCraftingToolTemplate(templateKey);
  if (!template || !template.isStation) return undefined;

  const station = createCraftingStationFromTemplate(objectId, template, templateCrc);
  station.place(position, rotation, cellId, placedBy);

  return station;
}
