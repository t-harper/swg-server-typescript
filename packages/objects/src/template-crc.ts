/**
 * CRC32 Lookup System for SWG Object Template Paths
 *
 * SWG uses CRC32 to identify object templates. The client receives a CRC value
 * and looks up the corresponding local template file (e.g. .iff files).
 * The CRC is computed on the lowercase template path string using the standard
 * CRC32 algorithm (IEEE polynomial).
 */

import { calculateCrc32 } from '@swg/protocol';

/**
 * Calculate CRC for a template path string (lowercased before hashing)
 */
export function calculateTemplateCrc(templatePath: string): number {
  const bytes = new TextEncoder().encode(templatePath.toLowerCase());
  return calculateCrc32(bytes, 0);
}

/**
 * Pre-computed CRCs for essential templates.
 * These are the "shared" template paths that the client uses.
 */
export const TemplateCrc = {
  // Player species templates
  HUMAN_MALE: calculateTemplateCrc('object/creature/player/shared_human_male.iff'),
  HUMAN_FEMALE: calculateTemplateCrc('object/creature/player/shared_human_female.iff'),
  TRANDOSHAN_MALE: calculateTemplateCrc('object/creature/player/shared_trandoshan_male.iff'),
  TRANDOSHAN_FEMALE: calculateTemplateCrc('object/creature/player/shared_trandoshan_female.iff'),
  TWILEK_MALE: calculateTemplateCrc('object/creature/player/shared_twilek_male.iff'),
  TWILEK_FEMALE: calculateTemplateCrc('object/creature/player/shared_twilek_female.iff'),
  BOTHAN_MALE: calculateTemplateCrc('object/creature/player/shared_bothan_male.iff'),
  BOTHAN_FEMALE: calculateTemplateCrc('object/creature/player/shared_bothan_female.iff'),
  ZABRAK_MALE: calculateTemplateCrc('object/creature/player/shared_zabrak_male.iff'),
  ZABRAK_FEMALE: calculateTemplateCrc('object/creature/player/shared_zabrak_female.iff'),
  RODIAN_MALE: calculateTemplateCrc('object/creature/player/shared_rodian_male.iff'),
  RODIAN_FEMALE: calculateTemplateCrc('object/creature/player/shared_rodian_female.iff'),
  MONCAL_MALE: calculateTemplateCrc('object/creature/player/shared_moncal_male.iff'),
  MONCAL_FEMALE: calculateTemplateCrc('object/creature/player/shared_moncal_female.iff'),
  WOOKIEE_MALE: calculateTemplateCrc('object/creature/player/shared_wookiee_male.iff'),
  WOOKIEE_FEMALE: calculateTemplateCrc('object/creature/player/shared_wookiee_female.iff'),
  ITHORIAN_MALE: calculateTemplateCrc('object/creature/player/shared_ithorian_male.iff'),
  ITHORIAN_FEMALE: calculateTemplateCrc('object/creature/player/shared_ithorian_female.iff'),
  SULLUSTAN_MALE: calculateTemplateCrc('object/creature/player/shared_sullustan_male.iff'),
  SULLUSTAN_FEMALE: calculateTemplateCrc('object/creature/player/shared_sullustan_female.iff'),

  // Container templates (needed during zone-in for inventory creation)
  INVENTORY: calculateTemplateCrc('object/tangible/inventory/shared_character_inventory.iff'),
  DATAPAD: calculateTemplateCrc('object/tangible/datapad/shared_character_datapad.iff'),
  BANK: calculateTemplateCrc('object/tangible/bank/shared_character_bank.iff'),
  MISSION_BAG: calculateTemplateCrc('object/tangible/mission_bag/shared_mission_bag.iff'),

  // Player object template
  PLAYER_OBJECT: calculateTemplateCrc('object/player/shared_player.iff'),
} as const;

/**
 * Cache for template path to CRC mappings
 */
const templateCrcCache = new Map<string, number>();

/**
 * Get or compute the CRC for a template path, caching the result
 */
export function getTemplateCrc(templatePath: string): number {
  const cached = templateCrcCache.get(templatePath);
  if (cached !== undefined) return cached;

  const crc = calculateTemplateCrc(templatePath);
  templateCrcCache.set(templatePath, crc);
  return crc;
}

/**
 * Reverse lookup: find a template path from a CRC value.
 * Only searches the cache, so this will only return paths that have been
 * previously computed via getTemplateCrc().
 */
export function getTemplatePathFromCrc(crc: number): string | undefined {
  for (const [path, cachedCrc] of templateCrcCache) {
    if (cachedCrc === crc) return path;
  }
  return undefined;
}

/** Default template CRC for a human male player */
export const DEFAULT_PLAYER_TEMPLATE_CRC = TemplateCrc.HUMAN_MALE;
