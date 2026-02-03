/**
 * Survey Tool Template Loader
 * Provides access to survey tool template data for creating survey tool objects
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { SurveyTool, SurveyToolType, SurveyToolQuality } from '../../survey-tool.js';

// Import survey tool templates - Mineral
import basicMineralData from './basic-mineral-survey.json' with { type: 'json' };
import advancedMineralData from './advanced-mineral-survey.json' with { type: 'json' };
import masterMineralData from './master-mineral-survey.json' with { type: 'json' };

// Import survey tool templates - Chemical
import basicChemicalData from './basic-chemical-survey.json' with { type: 'json' };
import advancedChemicalData from './advanced-chemical-survey.json' with { type: 'json' };
import masterChemicalData from './master-chemical-survey.json' with { type: 'json' };

// Import survey tool templates - Flora
import basicFloraData from './basic-flora-survey.json' with { type: 'json' };
import advancedFloraData from './advanced-flora-survey.json' with { type: 'json' };
import masterFloraData from './master-flora-survey.json' with { type: 'json' };

// Import survey tool templates - Gas
import basicGasData from './basic-gas-survey.json' with { type: 'json' };
import advancedGasData from './advanced-gas-survey.json' with { type: 'json' };
import masterGasData from './master-gas-survey.json' with { type: 'json' };

// Import survey tool templates - Water
import basicWaterData from './basic-water-survey.json' with { type: 'json' };
import advancedWaterData from './advanced-water-survey.json' with { type: 'json' };
import masterWaterData from './master-water-survey.json' with { type: 'json' };

// Import survey tool templates - Organic
import basicOrganicData from './basic-organic-survey.json' with { type: 'json' };
import advancedOrganicData from './advanced-organic-survey.json' with { type: 'json' };
import masterOrganicData from './master-organic-survey.json' with { type: 'json' };

/**
 * Survey tool template data structure
 */
export interface SurveyToolTemplateData {
  name: string;
  description: string;
  templateId: string;
  surveyToolType: number;
  surveyRange: number;
  surveyAccuracy: number;
  sampleSize: number;
  cooldown: number;
  quality: number;
  requiredSkill: string;
  requiredSkillLevel: number;
  maxCondition: number;
  complexity: number;
  volume: number;
  stfFile: string;
  stfName: string;
}

/**
 * Registry of all survey tool templates
 */
export const SurveyToolTemplates: Record<string, SurveyToolTemplateData> = {
  // Mineral tools
  'basic_mineral_survey': basicMineralData as SurveyToolTemplateData,
  'advanced_mineral_survey': advancedMineralData as SurveyToolTemplateData,
  'master_mineral_survey': masterMineralData as SurveyToolTemplateData,

  // Chemical tools
  'basic_chemical_survey': basicChemicalData as SurveyToolTemplateData,
  'advanced_chemical_survey': advancedChemicalData as SurveyToolTemplateData,
  'master_chemical_survey': masterChemicalData as SurveyToolTemplateData,

  // Flora tools
  'basic_flora_survey': basicFloraData as SurveyToolTemplateData,
  'advanced_flora_survey': advancedFloraData as SurveyToolTemplateData,
  'master_flora_survey': masterFloraData as SurveyToolTemplateData,

  // Gas tools
  'basic_gas_survey': basicGasData as SurveyToolTemplateData,
  'advanced_gas_survey': advancedGasData as SurveyToolTemplateData,
  'master_gas_survey': masterGasData as SurveyToolTemplateData,

  // Water tools
  'basic_water_survey': basicWaterData as SurveyToolTemplateData,
  'advanced_water_survey': advancedWaterData as SurveyToolTemplateData,
  'master_water_survey': masterWaterData as SurveyToolTemplateData,

  // Organic tools
  'basic_organic_survey': basicOrganicData as SurveyToolTemplateData,
  'advanced_organic_survey': advancedOrganicData as SurveyToolTemplateData,
  'master_organic_survey': masterOrganicData as SurveyToolTemplateData,
};

/**
 * Map of template IDs to template keys
 */
const templateIdToKey: Map<string, string> = new Map([
  // Mineral tools
  ['object/tangible/survey_tool/survey_tool_mineral_basic.iff', 'basic_mineral_survey'],
  ['object/tangible/survey_tool/survey_tool_mineral_advanced.iff', 'advanced_mineral_survey'],
  ['object/tangible/survey_tool/survey_tool_mineral_master.iff', 'master_mineral_survey'],

  // Chemical tools
  ['object/tangible/survey_tool/survey_tool_chemical_basic.iff', 'basic_chemical_survey'],
  ['object/tangible/survey_tool/survey_tool_chemical_advanced.iff', 'advanced_chemical_survey'],
  ['object/tangible/survey_tool/survey_tool_chemical_master.iff', 'master_chemical_survey'],

  // Flora tools
  ['object/tangible/survey_tool/survey_tool_flora_basic.iff', 'basic_flora_survey'],
  ['object/tangible/survey_tool/survey_tool_flora_advanced.iff', 'advanced_flora_survey'],
  ['object/tangible/survey_tool/survey_tool_flora_master.iff', 'master_flora_survey'],

  // Gas tools
  ['object/tangible/survey_tool/survey_tool_gas_basic.iff', 'basic_gas_survey'],
  ['object/tangible/survey_tool/survey_tool_gas_advanced.iff', 'advanced_gas_survey'],
  ['object/tangible/survey_tool/survey_tool_gas_master.iff', 'master_gas_survey'],

  // Water tools
  ['object/tangible/survey_tool/survey_tool_water_basic.iff', 'basic_water_survey'],
  ['object/tangible/survey_tool/survey_tool_water_advanced.iff', 'advanced_water_survey'],
  ['object/tangible/survey_tool/survey_tool_water_master.iff', 'master_water_survey'],

  // Organic tools
  ['object/tangible/survey_tool/survey_tool_organic_basic.iff', 'basic_organic_survey'],
  ['object/tangible/survey_tool/survey_tool_organic_advanced.iff', 'advanced_organic_survey'],
  ['object/tangible/survey_tool/survey_tool_organic_master.iff', 'master_organic_survey'],
]);

/**
 * Get a survey tool template by key
 * @param key - Template key (e.g., 'basic_mineral_survey')
 */
export function getSurveyToolTemplate(key: string): SurveyToolTemplateData | undefined {
  return SurveyToolTemplates[key];
}

/**
 * Get a survey tool template by template ID path
 * @param templateId - Full template path (e.g., 'object/tangible/survey_tool/survey_tool_mineral_basic.iff')
 */
export function getSurveyToolTemplateByPath(templateId: string): SurveyToolTemplateData | undefined {
  const key = templateIdToKey.get(templateId);
  if (!key) return undefined;
  return SurveyToolTemplates[key];
}

/**
 * Get all available survey tool template keys
 */
export function getSurveyToolTemplateKeys(): string[] {
  return Object.keys(SurveyToolTemplates);
}

/**
 * Get all survey tool templates of a specific type
 * @param surveyToolType - The survey tool type to filter by
 */
export function getSurveyToolTemplatesByType(surveyToolType: SurveyToolType): SurveyToolTemplateData[] {
  return Object.values(SurveyToolTemplates).filter(
    (template) => template.surveyToolType === surveyToolType
  );
}

/**
 * Get all survey tool templates of a specific quality
 * @param quality - The quality level to filter by
 */
export function getSurveyToolTemplatesByQuality(quality: SurveyToolQuality): SurveyToolTemplateData[] {
  return Object.values(SurveyToolTemplates).filter(
    (template) => template.quality === quality
  );
}

/**
 * Create a SurveyTool from template data
 * @param objectId - Unique object ID for the new survey tool
 * @param template - Template data to use
 * @param templateCrc - Optional CRC value (defaults to 0)
 */
export function createSurveyToolFromTemplate(
  objectId: ObjectId,
  template: SurveyToolTemplateData,
  templateCrc: CrcValue = 0
): SurveyTool {
  const tool = new SurveyTool(objectId, templateCrc);

  // Set survey properties
  tool.setSurveyToolType(template.surveyToolType as SurveyToolType);
  tool.setSurveyRange(template.surveyRange);
  tool.setSurveyAccuracy(template.surveyAccuracy);
  tool.setSampleSize(template.sampleSize);
  tool.setCooldown(template.cooldown);
  tool.setQuality(template.quality as SurveyToolQuality);

  // Set skill requirements
  if (template.requiredSkill) {
    tool.setRequiredSkill(template.requiredSkill, template.requiredSkillLevel);
  }

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
 * Create a SurveyTool from a template key
 * @param objectId - Unique object ID for the new survey tool
 * @param templateKey - Template key (e.g., 'basic_mineral_survey')
 * @param templateCrc - Optional CRC value
 */
export function createSurveyToolByKey(
  objectId: ObjectId,
  templateKey: string,
  templateCrc: CrcValue = 0
): SurveyTool | undefined {
  const template = getSurveyToolTemplate(templateKey);
  if (!template) return undefined;
  return createSurveyToolFromTemplate(objectId, template, templateCrc);
}

/**
 * Get basic survey tool templates (all types)
 */
export function getBasicSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByQuality(SurveyToolQuality.Basic);
}

/**
 * Get advanced survey tool templates (all types)
 */
export function getAdvancedSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByQuality(SurveyToolQuality.Advanced);
}

/**
 * Get master survey tool templates (all types)
 */
export function getMasterSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByQuality(SurveyToolQuality.Master);
}

/**
 * Get mineral survey tool templates
 */
export function getMineralSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByType(SurveyToolType.Mineral);
}

/**
 * Get chemical survey tool templates
 */
export function getChemicalSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByType(SurveyToolType.Chemical);
}

/**
 * Get flora survey tool templates
 */
export function getFloraSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByType(SurveyToolType.Flora);
}

/**
 * Get gas survey tool templates
 */
export function getGasSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByType(SurveyToolType.Gas);
}

/**
 * Get water survey tool templates
 */
export function getWaterSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByType(SurveyToolType.Water);
}

/**
 * Get organic survey tool templates
 */
export function getOrganicSurveyToolTemplates(): SurveyToolTemplateData[] {
  return getSurveyToolTemplatesByType(SurveyToolType.Organic);
}
