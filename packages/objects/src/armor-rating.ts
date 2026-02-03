/**
 * Armor Rating System
 * Defines armor protection levels and equipment layers for SWG armor system
 *
 * SWG armor provides protection against damage types with varying effectiveness
 * based on the armor's rating (None, Light, Medium, Heavy) and the specific
 * resistances of each piece.
 */

/**
 * Armor rating enumeration
 * Determines base protection level and armor class
 */
export enum ArmorRating {
  /** No armor protection (clothing) */
  None = 0,
  /** Light armor (Composite, Ubese, Scout) - good mobility, lower protection */
  Light = 1,
  /** Medium armor (Padded, Bone, Ithorian Defender) - balanced */
  Medium = 2,
  /** Heavy armor (Battle Armor, Mandalorian, Stormtrooper) - high protection, reduced mobility */
  Heavy = 3,
}

export type ArmorRatingType = (typeof ArmorRating)[keyof typeof ArmorRating];

/**
 * Armor layer enumeration
 * Defines which body part the armor piece covers
 */
export enum ArmorLayer {
  /** Chest/torso armor */
  Chest = 0,
  /** Back armor (backpack slot) */
  Back = 1,
  /** Helmet/head armor */
  Helmet = 2,
  /** Left arm bracer/armor */
  LeftArm = 3,
  /** Right arm bracer/armor */
  RightArm = 4,
  /** Gloves/hand armor */
  Gloves = 5,
  /** Left leg armor */
  LeftLeg = 6,
  /** Right leg armor */
  RightLeg = 7,
  /** Boots/foot armor */
  Boots = 8,
  /** Belt armor */
  Belt = 9,
  /** Left bicep armor */
  LeftBicep = 10,
  /** Right bicep armor */
  RightBicep = 11,
}

export type ArmorLayerType = (typeof ArmorLayer)[keyof typeof ArmorLayer];

/**
 * Hit location enumeration
 * Used to determine which armor piece protects against an attack
 */
export enum HitLocation {
  /** Head hit */
  Head = 0,
  /** Chest/torso hit */
  Chest = 1,
  /** Back hit */
  Back = 2,
  /** Left arm hit */
  LeftArm = 3,
  /** Right arm hit */
  RightArm = 4,
  /** Left leg hit */
  LeftLeg = 5,
  /** Right leg hit */
  RightLeg = 6,
  /** Hands hit */
  Hands = 7,
  /** Feet hit */
  Feet = 8,
}

export type HitLocationType = (typeof HitLocation)[keyof typeof HitLocation];

/**
 * Armor piercing level enumeration
 * Determines how well an attack penetrates armor
 */
export enum ArmorPiercing {
  /** No armor piercing (standard attack) */
  None = 0,
  /** Light armor piercing */
  Light = 1,
  /** Medium armor piercing */
  Medium = 2,
  /** Heavy armor piercing */
  Heavy = 3,
}

export type ArmorPiercingType = (typeof ArmorPiercing)[keyof typeof ArmorPiercing];

/**
 * Map hit locations to the armor layers that protect them
 */
export const HIT_LOCATION_TO_ARMOR_LAYERS: Record<HitLocation, ArmorLayer[]> = {
  [HitLocation.Head]: [ArmorLayer.Helmet],
  [HitLocation.Chest]: [ArmorLayer.Chest],
  [HitLocation.Back]: [ArmorLayer.Back, ArmorLayer.Chest],
  [HitLocation.LeftArm]: [ArmorLayer.LeftArm, ArmorLayer.LeftBicep],
  [HitLocation.RightArm]: [ArmorLayer.RightArm, ArmorLayer.RightBicep],
  [HitLocation.LeftLeg]: [ArmorLayer.LeftLeg],
  [HitLocation.RightLeg]: [ArmorLayer.RightLeg],
  [HitLocation.Hands]: [ArmorLayer.Gloves],
  [HitLocation.Feet]: [ArmorLayer.Boots],
};

/**
 * Get the display name for an armor rating
 */
export function getArmorRatingName(rating: ArmorRating): string {
  switch (rating) {
    case ArmorRating.None:
      return 'None';
    case ArmorRating.Light:
      return 'Light';
    case ArmorRating.Medium:
      return 'Medium';
    case ArmorRating.Heavy:
      return 'Heavy';
    default:
      return 'Unknown';
  }
}

/**
 * Get the display name for an armor layer
 */
export function getArmorLayerName(layer: ArmorLayer): string {
  switch (layer) {
    case ArmorLayer.Chest:
      return 'Chest';
    case ArmorLayer.Back:
      return 'Back';
    case ArmorLayer.Helmet:
      return 'Helmet';
    case ArmorLayer.LeftArm:
      return 'Left Arm';
    case ArmorLayer.RightArm:
      return 'Right Arm';
    case ArmorLayer.Gloves:
      return 'Gloves';
    case ArmorLayer.LeftLeg:
      return 'Left Leg';
    case ArmorLayer.RightLeg:
      return 'Right Leg';
    case ArmorLayer.Boots:
      return 'Boots';
    case ArmorLayer.Belt:
      return 'Belt';
    case ArmorLayer.LeftBicep:
      return 'Left Bicep';
    case ArmorLayer.RightBicep:
      return 'Right Bicep';
    default:
      return 'Unknown';
  }
}

/**
 * Check if armor piercing level defeats an armor rating
 * Higher armor piercing reduces the effectiveness of lower-rated armor
 *
 * @param armorRating - The armor's rating
 * @param armorPiercing - The attack's armor piercing level
 * @returns The effectiveness multiplier (0.0 to 1.0)
 */
export function getArmorPiercingEffectiveness(
  armorRating: ArmorRating,
  armorPiercing: ArmorPiercing
): number {
  // If armor piercing >= armor rating, armor is less effective
  const difference = armorRating - armorPiercing;

  if (difference <= -2) {
    // AP greatly exceeds armor: 25% effectiveness
    return 0.25;
  } else if (difference <= -1) {
    // AP exceeds armor: 50% effectiveness
    return 0.5;
  } else if (difference === 0) {
    // AP equals armor: 75% effectiveness
    return 0.75;
  } else {
    // Armor exceeds AP: full effectiveness
    return 1.0;
  }
}
