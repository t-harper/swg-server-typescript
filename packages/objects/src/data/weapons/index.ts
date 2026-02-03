/**
 * Weapon Template Loader
 * Provides access to weapon template data for creating weapon objects
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { WeaponObject } from '../../weapon-object.js';
import { WeaponType, ArmorPiercing, ElementalType } from '../../weapon-types.js';
import { DamageType } from '../../tangible-object.js';

// Import weapon templates
import cdefPistolData from './cdef-pistol.json' with { type: 'json' };
import cdefRifleData from './cdef-rifle.json' with { type: 'json' };
import cdefCarbineData from './cdef-carbine.json' with { type: 'json' };
import survivalKnifeData from './survival-knife.json' with { type: 'json' };
import metalStaffData from './metal-staff.json' with { type: 'json' };

/**
 * Weapon template data structure
 */
export interface WeaponTemplateData {
  name: string;
  description: string;
  templateId: string;
  weaponType: number;
  damageType: number;
  armorPiercing: number;
  minDamage: number;
  maxDamage: number;
  attackSpeed: number;
  woundChance: number;
  minRange: number;
  maxRange: number;
  idealRange: number;
  elementalType: number;
  elementalDamage: number;
  damageRadius: number;
  attackMods: number;
  defenseMods: number;
  specialAttackCost: number;
  powerupSlots: number;
  requiredCertification: string;
  maxCondition: number;
  complexity: number;
  volume: number;
  stfFile: string;
  stfName: string;
}

/**
 * Registry of all weapon templates
 */
export const WeaponTemplates: Record<string, WeaponTemplateData> = {
  'cdef_pistol': cdefPistolData as WeaponTemplateData,
  'cdef_rifle': cdefRifleData as WeaponTemplateData,
  'cdef_carbine': cdefCarbineData as WeaponTemplateData,
  'survival_knife': survivalKnifeData as WeaponTemplateData,
  'metal_staff': metalStaffData as WeaponTemplateData,
};

/**
 * Map of template IDs to template keys
 */
const templateIdToKey: Map<string, string> = new Map([
  ['object/weapon/ranged/pistol/pistol_cdef.iff', 'cdef_pistol'],
  ['object/weapon/ranged/rifle/rifle_cdef.iff', 'cdef_rifle'],
  ['object/weapon/ranged/carbine/carbine_cdef.iff', 'cdef_carbine'],
  ['object/weapon/melee/knife/knife_survival.iff', 'survival_knife'],
  ['object/weapon/melee/polearm/polearm_staff_metal.iff', 'metal_staff'],
]);

/**
 * Get a weapon template by key
 * @param key - Template key (e.g., 'cdef_pistol')
 */
export function getWeaponTemplate(key: string): WeaponTemplateData | undefined {
  return WeaponTemplates[key];
}

/**
 * Get a weapon template by template ID path
 * @param templateId - Full template path (e.g., 'object/weapon/ranged/pistol/pistol_cdef.iff')
 */
export function getWeaponTemplateByPath(templateId: string): WeaponTemplateData | undefined {
  const key = templateIdToKey.get(templateId);
  if (!key) return undefined;
  return WeaponTemplates[key];
}

/**
 * Get all available weapon template keys
 */
export function getWeaponTemplateKeys(): string[] {
  return Object.keys(WeaponTemplates);
}

/**
 * Get all weapon templates of a specific type
 * @param weaponType - The weapon type to filter by
 */
export function getWeaponTemplatesByType(weaponType: WeaponType): WeaponTemplateData[] {
  return Object.values(WeaponTemplates).filter(
    (template) => template.weaponType === weaponType
  );
}

/**
 * Create a WeaponObject from template data
 * @param objectId - Unique object ID for the new weapon
 * @param template - Template data to use
 * @param templateCrc - Optional CRC value (defaults to 0)
 */
export function createWeaponFromTemplate(
  objectId: ObjectId,
  template: WeaponTemplateData,
  templateCrc: CrcValue = 0
): WeaponObject {
  const weapon = new WeaponObject(objectId, templateCrc);

  // Set damage properties
  weapon.setDamageRange(template.minDamage, template.maxDamage);
  weapon.setDamageType(template.damageType as DamageType);
  weapon.setElementalDamage(template.elementalType as ElementalType, template.elementalDamage);

  // Set speed properties
  weapon.setAttackSpeed(template.attackSpeed);
  weapon.setWoundChance(template.woundChance);

  // Set range properties
  weapon.setRange(template.minRange, template.maxRange, template.idealRange);

  // Set type properties
  weapon.setWeaponType(template.weaponType as WeaponType);
  weapon.setArmorPiercing(template.armorPiercing as ArmorPiercing);

  // Set special properties
  weapon.setDamageRadius(template.damageRadius);
  weapon.setSpecialAttackCost(template.specialAttackCost);

  // Set modifier properties
  weapon.setAttackMods(template.attackMods);
  weapon.setDefenseMods(template.defenseMods);

  // Set powerup slots
  weapon.setPowerupSlots(template.powerupSlots);

  // Set certification
  weapon.setRequiredCertification(template.requiredCertification);

  // Set tangible properties
  weapon.maxCondition = template.maxCondition;
  weapon.condition = template.maxCondition;
  weapon.complexity = template.complexity;
  weapon.volume = template.volume;

  // Set name
  weapon.setObjectName(template.stfFile, template.stfName);

  // Clear dirty flags since this is initial creation
  weapon.clearAllDeltas();

  return weapon;
}

/**
 * Create a WeaponObject from a template key
 * @param objectId - Unique object ID for the new weapon
 * @param templateKey - Template key (e.g., 'cdef_pistol')
 * @param templateCrc - Optional CRC value
 */
export function createWeaponByKey(
  objectId: ObjectId,
  templateKey: string,
  templateCrc: CrcValue = 0
): WeaponObject | undefined {
  const template = getWeaponTemplate(templateKey);
  if (!template) return undefined;
  return createWeaponFromTemplate(objectId, template, templateCrc);
}

/**
 * Get ranged weapon templates
 */
export function getRangedWeaponTemplates(): WeaponTemplateData[] {
  return Object.values(WeaponTemplates).filter((template) => {
    const type = template.weaponType as WeaponType;
    return (
      type === WeaponType.Rifle ||
      type === WeaponType.Pistol ||
      type === WeaponType.Carbine ||
      type === WeaponType.Heavy ||
      type === WeaponType.FlameThrower ||
      type === WeaponType.Launcher
    );
  });
}

/**
 * Get melee weapon templates
 */
export function getMeleeWeaponTemplates(): WeaponTemplateData[] {
  return Object.values(WeaponTemplates).filter((template) => {
    const type = template.weaponType as WeaponType;
    return (
      type === WeaponType.OneHandSword ||
      type === WeaponType.TwoHandSword ||
      type === WeaponType.Polearm ||
      type === WeaponType.Unarmed ||
      type === WeaponType.OneHandMelee ||
      type === WeaponType.TwoHandMelee ||
      type === WeaponType.Lightsaber
    );
  });
}
