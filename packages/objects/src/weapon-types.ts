/**
 * Weapon Types and Related Enumerations
 * Defines weapon classifications, damage types, and armor piercing levels
 * for the SWG combat system.
 */

/**
 * Weapon type classification
 * Determines attack animations, range behavior, and skill requirements
 */
export enum WeaponType {
  // ============================================
  // Ranged Weapons
  // ============================================

  /** Standard rifle - long range, moderate damage */
  Rifle = 0,
  /** Pistol - short range, fast attacks */
  Pistol = 1,
  /** Carbine - medium range, balanced */
  Carbine = 2,
  /** Heavy weapons - high damage, slow, AOE capable */
  Heavy = 3,

  // ============================================
  // Melee Weapons
  // ============================================

  /** One-handed sword */
  OneHandSword = 4,
  /** Two-handed sword - slower but higher damage */
  TwoHandSword = 5,
  /** Polearm - reach advantage */
  Polearm = 6,
  /** Unarmed combat */
  Unarmed = 7,
  /** One-handed melee (knives, clubs) */
  OneHandMelee = 8,
  /** Two-handed melee (staves, axes) */
  TwoHandMelee = 9,

  // ============================================
  // Special Weapons
  // ============================================

  /** Lightsaber - Jedi weapon */
  Lightsaber = 10,
  /** Flamethrower - cone AOE, heat damage */
  FlameThrower = 11,
  /** Launcher - projectile weapons (rockets, grenades) */
  Launcher = 12,
  /** Thrown weapons */
  Thrown = 13,
}

/**
 * Armor piercing level
 * Determines how much armor effectiveness is bypassed
 */
export enum ArmorPiercing {
  /** No armor penetration */
  None = 0,
  /** Light armor penetration - bypasses 25% armor */
  Light = 1,
  /** Medium armor penetration - bypasses 50% armor */
  Medium = 2,
  /** Heavy armor penetration - bypasses 75% armor */
  Heavy = 3,
}

/**
 * Elemental damage type
 * Secondary damage type that can be applied in addition to base damage
 */
export enum ElementalType {
  /** No elemental damage */
  None = 0,
  /** Heat/Fire damage - effective against cold-resistant targets */
  Heat = 1,
  /** Cold/Ice damage - can slow targets */
  Cold = 2,
  /** Acid damage - can reduce armor effectiveness */
  Acid = 3,
  /** Electrical damage - effective against droids */
  Electricity = 4,
}

/**
 * Get the display name for a weapon type
 */
export function getWeaponTypeName(type: WeaponType): string {
  switch (type) {
    case WeaponType.Rifle:
      return 'Rifle';
    case WeaponType.Pistol:
      return 'Pistol';
    case WeaponType.Carbine:
      return 'Carbine';
    case WeaponType.Heavy:
      return 'Heavy Weapon';
    case WeaponType.OneHandSword:
      return 'One-Handed Sword';
    case WeaponType.TwoHandSword:
      return 'Two-Handed Sword';
    case WeaponType.Polearm:
      return 'Polearm';
    case WeaponType.Unarmed:
      return 'Unarmed';
    case WeaponType.OneHandMelee:
      return 'One-Handed Melee';
    case WeaponType.TwoHandMelee:
      return 'Two-Handed Melee';
    case WeaponType.Lightsaber:
      return 'Lightsaber';
    case WeaponType.FlameThrower:
      return 'Flamethrower';
    case WeaponType.Launcher:
      return 'Launcher';
    case WeaponType.Thrown:
      return 'Thrown';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for an armor piercing level
 */
export function getArmorPiercingName(level: ArmorPiercing): string {
  switch (level) {
    case ArmorPiercing.None:
      return 'None';
    case ArmorPiercing.Light:
      return 'Light';
    case ArmorPiercing.Medium:
      return 'Medium';
    case ArmorPiercing.Heavy:
      return 'Heavy';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for an elemental type
 */
export function getElementalTypeName(type: ElementalType): string {
  switch (type) {
    case ElementalType.None:
      return 'None';
    case ElementalType.Heat:
      return 'Heat';
    case ElementalType.Cold:
      return 'Cold';
    case ElementalType.Acid:
      return 'Acid';
    case ElementalType.Electricity:
      return 'Electricity';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a weapon type is ranged
 */
export function isRangedWeapon(type: WeaponType): boolean {
  return (
    type === WeaponType.Rifle ||
    type === WeaponType.Pistol ||
    type === WeaponType.Carbine ||
    type === WeaponType.Heavy ||
    type === WeaponType.FlameThrower ||
    type === WeaponType.Launcher ||
    type === WeaponType.Thrown
  );
}

/**
 * Check if a weapon type is melee
 */
export function isMeleeWeapon(type: WeaponType): boolean {
  return (
    type === WeaponType.OneHandSword ||
    type === WeaponType.TwoHandSword ||
    type === WeaponType.Polearm ||
    type === WeaponType.Unarmed ||
    type === WeaponType.OneHandMelee ||
    type === WeaponType.TwoHandMelee ||
    type === WeaponType.Lightsaber
  );
}

/**
 * Check if a weapon type is a lightsaber
 */
export function isLightsaber(type: WeaponType): boolean {
  return type === WeaponType.Lightsaber;
}

/**
 * Check if a weapon type uses the heavy weapons skill tree
 */
export function isHeavyWeapon(type: WeaponType): boolean {
  return (
    type === WeaponType.Heavy ||
    type === WeaponType.FlameThrower ||
    type === WeaponType.Launcher
  );
}

/**
 * Get the armor bypass percentage for an armor piercing level
 * @returns Percentage of armor bypassed (0.0 - 1.0)
 */
export function getArmorBypassPercent(level: ArmorPiercing): number {
  switch (level) {
    case ArmorPiercing.None:
      return 0.0;
    case ArmorPiercing.Light:
      return 0.25;
    case ArmorPiercing.Medium:
      return 0.5;
    case ArmorPiercing.Heavy:
      return 0.75;
    default:
      return 0.0;
  }
}

/**
 * Get the default attack range for a weapon type
 * @returns Default range in meters
 */
export function getDefaultWeaponRange(type: WeaponType): { min: number; max: number; ideal: number } {
  switch (type) {
    case WeaponType.Rifle:
      return { min: 0, max: 64, ideal: 45 };
    case WeaponType.Pistol:
      return { min: 0, max: 35, ideal: 20 };
    case WeaponType.Carbine:
      return { min: 0, max: 50, ideal: 35 };
    case WeaponType.Heavy:
      return { min: 0, max: 64, ideal: 40 };
    case WeaponType.FlameThrower:
      return { min: 0, max: 15, ideal: 10 };
    case WeaponType.Launcher:
      return { min: 10, max: 64, ideal: 45 };
    case WeaponType.Thrown:
      return { min: 0, max: 25, ideal: 15 };
    // Melee weapons
    case WeaponType.OneHandSword:
    case WeaponType.OneHandMelee:
      return { min: 0, max: 5, ideal: 0 };
    case WeaponType.TwoHandSword:
    case WeaponType.TwoHandMelee:
      return { min: 0, max: 5, ideal: 0 };
    case WeaponType.Polearm:
      return { min: 0, max: 7, ideal: 0 };
    case WeaponType.Unarmed:
      return { min: 0, max: 5, ideal: 0 };
    case WeaponType.Lightsaber:
      return { min: 0, max: 5, ideal: 0 };
    default:
      return { min: 0, max: 5, ideal: 0 };
  }
}

/**
 * Get the certification skill required for a weapon type
 */
export function getDefaultCertification(type: WeaponType): string {
  switch (type) {
    case WeaponType.Rifle:
      return 'cert_rifle';
    case WeaponType.Pistol:
      return 'cert_pistol';
    case WeaponType.Carbine:
      return 'cert_carbine';
    case WeaponType.Heavy:
      return 'cert_heavy_weapons';
    case WeaponType.OneHandSword:
      return 'cert_onehandsword';
    case WeaponType.TwoHandSword:
      return 'cert_twohandsword';
    case WeaponType.Polearm:
      return 'cert_polearm';
    case WeaponType.Unarmed:
      return 'cert_unarmed';
    case WeaponType.OneHandMelee:
      return 'cert_onehandmelee';
    case WeaponType.TwoHandMelee:
      return 'cert_twohandmelee';
    case WeaponType.Lightsaber:
      return 'cert_lightsaber';
    case WeaponType.FlameThrower:
      return 'cert_heavy_weapons';
    case WeaponType.Launcher:
      return 'cert_heavy_weapons';
    case WeaponType.Thrown:
      return '';
    default:
      return '';
  }
}
