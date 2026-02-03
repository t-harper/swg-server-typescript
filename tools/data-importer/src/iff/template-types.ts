/**
 * Template data structures for SWG object templates
 *
 * These types represent the various object templates used in Star Wars Galaxies.
 * Templates define the properties and behaviors of game objects.
 */

/**
 * String ID reference for localized strings
 * Format: @table:key
 */
export interface StringId {
  /** String table file name */
  table: string;
  /** String key within the table */
  key: string;
}

/**
 * 3D Vector
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Range value (min/max)
 */
export interface RangeInt {
  min: number;
  max: number;
}

export interface RangeFloat {
  min: number;
  max: number;
}

/**
 * Armor rating enumeration
 */
export enum ArmorRating {
  None = 0,
  Light = 1,
  Medium = 2,
  Heavy = 3,
}

/**
 * Damage type flags
 */
export enum DamageType {
  None = 0x0000,
  Kinetic = 0x0001,
  Energy = 0x0002,
  Blast = 0x0004,
  Stun = 0x0008,
  Restraint = 0x0010,
  Elemental_Heat = 0x0020,
  Elemental_Cold = 0x0040,
  Elemental_Acid = 0x0080,
  Elemental_Electrical = 0x0100,
}

/**
 * Weapon type enumeration
 */
export enum WeaponType {
  Rifle = 0,
  Carbine = 1,
  Pistol = 2,
  Heavy = 3,
  OneHandMelee = 4,
  TwoHandMelee = 5,
  Unarmed = 6,
  Polearm = 7,
  Thrown = 8,
  OneHandLightsaber = 9,
  TwoHandLightsaber = 10,
  PolearmLightsaber = 11,
}

/**
 * Attack type enumeration
 */
export enum AttackType {
  Melee = 0,
  Ranged = 1,
}

/**
 * Locomotion types for creatures
 */
export enum Locomotion {
  Standing = 0,
  Sneaking = 1,
  Walking = 2,
  Running = 3,
  Kneeling = 4,
  CrouchSneaking = 5,
  CrouchWalking = 6,
  Prone = 7,
  Crawling = 8,
  ClimbingStationary = 9,
  Climbing = 10,
  Hovering = 11,
  Flying = 12,
  LyingDown = 13,
  Sitting = 14,
  SkillAnimating = 15,
  DrivingVehicle = 16,
  RidingCreature = 17,
  KnockedDown = 18,
  Incapacitated = 19,
  Dead = 20,
  Blocking = 21,
}

/**
 * Gender types
 */
export enum Gender {
  Male = 0,
  Female = 1,
}

/**
 * Race types
 */
export enum Race {
  Human = 0,
  Rodian = 1,
  Trandoshan = 2,
  MonCalamari = 3,
  Wookiee = 4,
  Bothan = 5,
  Twilek = 6,
  Zabrak = 7,
  Ithorian = 8,
  Sullustan = 9,
}

/**
 * Container type enumeration
 */
export enum ContainerType {
  None = 0,
  Rideable = 1,
  Slotted = 2,
  Volume = 3,
  SlottedAndVolume = 4,
}

/**
 * Game object type enumeration
 */
export enum GameObjectType {
  None = 0,
  Armor = 0x100,
  Building = 0x200,
  Creature = 0x400,
  Intangible = 0x800,
  Installation = 0x1000,
  Mission = 0x2000,
  Player = 0x4000,
  Static = 0x8000,
  Tangible = 0x10000,
  Vehicle = 0x20000,
  Weapon = 0x40000,
  Waypoint = 0x80000,
}

/**
 * Base object template interface
 * All object templates extend from this
 */
export interface ObjectTemplate {
  /** Path to the template file */
  templatePath: string;
  /** CRC32 hash of the template path */
  crc: number;
  /** Template type identifier (from FORM type) */
  type: string;
  /** Template version number */
  version?: number;
  /** Parent template path (for inheritance) */
  parentTemplate?: string;
  /** Dynamic properties bag */
  properties: Record<string, unknown>;
}

/**
 * Shared Object Template
 * Base template for all game objects visible to clients
 */
export interface SharedObjectTemplate extends ObjectTemplate {
  type: 'SHOT';
  /** Appearance file (.apt) */
  appearanceFilename: string;
  /** Arrangement descriptor file */
  arrangementDescriptorFilename: string;
  /** Clear floater text on destruction */
  clearFloaterOnDestruction: boolean;
  /** Portal layout file (.pob) */
  portalLayoutFilename: string;
  /** Client data file */
  clientDataFile: string;
  /** Container type */
  containerType: ContainerType;
  /** Container volume limit */
  containerVolumeLimit: number;
  /** Object name string ID */
  objectName: StringId;
  /** Detailed description string ID */
  detailedDescription: StringId;
  /** Look-at text string ID */
  lookAtText: StringId;
  /** Is the object snap to terrain */
  snapToTerrain: boolean;
  /** Container type flags */
  containerTypeFlags: number;
  /** Game object type */
  gameObjectType: GameObjectType;
  /** Send to client flag */
  sendToClient: boolean;
  /** Scale factor */
  scale: number;
  /** Scale threshold for level of detail */
  scaleThresholdBeforeExtentTest: number;
  /** Slots available */
  slotDescriptorFilename: string;
  /** Tint palette */
  tintPalette: string;
  /** Volume units this object takes */
  volume: number;
  /** Visible flags */
  visibleFlags: number;
  /** Movement update flags */
  movementFlags: number;
  /** Surface type */
  surfaceType: number;
  /** Collision material */
  collisionMaterialFlags: number;
  /** Collision material block flags */
  collisionMaterialBlockFlags: number;
  /** Collision material passable flags */
  collisionMaterialPassableFlags: number;
  /** Collision action flags */
  collisionActionFlags: number;
  /** Collision action block flags */
  collisionActionBlockFlags: number;
  /** Collision action passable flags */
  collisionActionPassableFlags: number;
  /** Client visibility flag */
  clientVisabilityFlag: boolean;
  /** Niche */
  niche: number;
  /** Location reservation radius */
  locationReservationRadius: number;
  /** Force no collision */
  forceNoCollision: boolean;
}

/**
 * Shared Tangible Object Template
 * Objects that can be interacted with physically
 */
export interface SharedTangibleObjectTemplate extends SharedObjectTemplate {
  type: 'STOT';
  /** Maximum hit points range */
  maxHitPoints: RangeInt;
  /** Is this object visible on radar */
  visibleOnRadar: boolean;
  /** Permanent condition flags */
  permanentConditionFlags: number;
  /** Armor rating */
  armorRating: ArmorRating;
  /** Count (for stackable items) */
  count: number;
  /** Condition */
  condition: number;
  /** Armor condition */
  armorCondition: number;
  /** Interests */
  interests: number;
  /** Complexity */
  complexity: number;
  /** Customization variables */
  customizationVariables: string[];
  /** Palette color customization */
  paletteColorCustomizationVariables: string[];
  /** Ranged int customization */
  rangedIntCustomizationVariables: string[];
  /** Const string customization */
  constStringCustomizationVariables: string[];
  /** Socket destinations */
  socketDestinations: string[];
  /** Structure footprint file */
  structureFootprintFileName: string;
  /** Use structure footprint outline */
  useStructureFootprintOutline: boolean;
  /** Target value */
  targetValue: number;
  /** Combat skeleton */
  combatSkeleton: string;
  /** Options script template CRC */
  optionsCrcScriptTemplate: number;
  /** Only visible in first person */
  onlyVisibleInFirstPerson: boolean;
}

/**
 * Shared Creature Object Template
 * Templates for creatures and NPCs
 */
export interface SharedCreatureObjectTemplate extends SharedTangibleObjectTemplate {
  type: 'SCOT';
  /** Gender */
  gender: Gender;
  /** Species/race */
  species: Race;
  /** Niche flags */
  nicheFlags: number;
  /** Movement speed */
  speed: RangeFloat;
  /** Turn rate in radians */
  turnRate: number;
  /** Acceleration rate */
  acceleration: RangeFloat;
  /** Walk speed */
  walkSpeed: number;
  /** Run speed */
  runSpeed: number;
  /** Slope modifiers */
  slopeModAngle: number;
  slopeModPercent: number;
  /** Water modifier percent */
  waterModPercent: number;
  /** Height range */
  height: RangeFloat;
  /** Animation map file */
  animationMapFilename: string;
  /** Movement datatable */
  movementDatatable: string;
  /** Post update look at target */
  postureAlignToTerrain: boolean;
  /** Swim height */
  swimHeight: number;
  /** Warp tolerance */
  warpTolerance: number;
  /** Collision height */
  collisionHeight: number;
  /** Collision radius */
  collisionRadius: number;
  /** Collision offset X */
  collisionOffsetX: number;
  /** Collision offset Z */
  collisionOffsetZ: number;
  /** Collision length */
  collisionLength: number;
  /** Camera height */
  cameraHeight: number;
  /** Step height */
  stepHeight: number;
  /** Has wings */
  hasWings: boolean;
  /** Scale */
  scaleMin: number;
  scaleMax: number;
  /** Skill mod entries */
  skillModEntries: SkillModEntry[];
}

/**
 * Skill mod entry
 */
export interface SkillModEntry {
  name: string;
  value: number;
}

/**
 * Shared Weapon Object Template
 * Templates for weapons
 */
export interface SharedWeaponObjectTemplate extends SharedTangibleObjectTemplate {
  type: 'SWOT';
  /** Weapon type */
  weaponType: WeaponType;
  /** Attack type (melee/ranged) */
  attackType: AttackType;
  /** Damage type flags */
  damageType: DamageType;
  /** Elemental damage type */
  elementalType: DamageType;
  /** Elemental damage value */
  elementalValue: RangeInt;
  /** Minimum damage */
  minDamage: RangeInt;
  /** Maximum damage */
  maxDamage: RangeInt;
  /** Attack speed */
  attackSpeed: RangeFloat;
  /** Wound chance */
  woundChance: RangeFloat;
  /** Accuracy */
  accuracy: number;
  /** Special attack cost */
  specialAttackCost: number;
  /** Minimum range */
  minRange: RangeFloat;
  /** Maximum range */
  maxRange: RangeFloat;
  /** Damage radius */
  damageRadius: RangeFloat;
  /** Weapon effects file */
  weaponEffectFilename: string;
  /** Weapon effect index */
  weaponEffectIndex: number;
}

/**
 * Shared Static Object Template
 * Templates for static world objects
 */
export interface SharedStaticObjectTemplate extends SharedTangibleObjectTemplate {
  type: 'SBOT';
}

/**
 * Shared Building Object Template
 * Templates for building structures
 */
export interface SharedBuildingObjectTemplate extends SharedTangibleObjectTemplate {
  type: 'SBOT';
  /** Terrain modification file */
  terrainModificationFileName: string;
  /** Interior layout file */
  interiorLayoutFileName: string;
}

/**
 * Shared Installation Object Template
 * Templates for harvester/factory installations
 */
export interface SharedInstallationObjectTemplate extends SharedTangibleObjectTemplate {
  type: 'SIOT';
}

/**
 * Shared Resource Container Object Template
 * Templates for resource containers
 */
export interface SharedResourceContainerObjectTemplate extends SharedTangibleObjectTemplate {
  type: 'RCCT';
  /** Maximum quantity */
  maxQuantity: number;
}

/**
 * Shared Waypoint Object Template
 * Templates for waypoints
 */
export interface SharedWaypointObjectTemplate extends ObjectTemplate {
  type: 'SWPT';
  /** Appearance when active */
  appearanceNameHashActive: number;
  /** Appearance when inactive */
  appearanceNameHashInactive: number;
}

/**
 * Shared Intangible Object Template
 * Templates for intangible objects (data, missions, etc.)
 */
export interface SharedIntangibleObjectTemplate extends ObjectTemplate {
  type: 'SIOT';
  /** Count */
  count: number;
}

/**
 * Shared Mission Object Template
 */
export interface SharedMissionObjectTemplate extends SharedIntangibleObjectTemplate {
  type: 'SMIO';
}

/**
 * Server object templates (with additional server-side data)
 */
export interface ServerObjectTemplate extends ObjectTemplate {
  type: 'SOBJ';
  /** Scripts attached to this object */
  scripts: string[];
  /** Objvar list */
  objvars: ObjVar[];
  /** Volume */
  volume: number;
  /** Visible flags */
  visibleFlags: number;
  /** Delete flags */
  deleteFlags: number;
  /** Move flags */
  moveFlags: number;
}

/**
 * Object variable (objvar)
 */
export interface ObjVar {
  name: string;
  type: ObjVarType;
  value: unknown;
}

/**
 * Object variable types
 */
export enum ObjVarType {
  Int = 0,
  Float = 1,
  String = 2,
  ObjId = 3,
  Location = 4,
  List = 5,
  StringId = 6,
  Transform = 7,
  Vector = 8,
}

/**
 * Server Creature Object Template
 */
export interface ServerCreatureObjectTemplate extends ServerObjectTemplate {
  type: 'CREO';
  /** Default weapon template */
  defaultWeapon: string;
  /** Attributes (HAM) */
  attributes: CreatureAttributes;
  /** Min force */
  minForce: number;
  /** Max force */
  maxForce: number;
  /** Level */
  level: RangeInt;
  /** Conversation file */
  conversationFile: string;
  /** AI file */
  aiFile: string;
}

/**
 * Creature attributes (Health, Action, Mind)
 */
export interface CreatureAttributes {
  health: RangeInt;
  healthWounds: RangeInt;
  action: RangeInt;
  actionWounds: RangeInt;
  mind: RangeInt;
  mindWounds: RangeInt;
}

/**
 * Server Tangible Object Template
 */
export interface ServerTangibleObjectTemplate extends ServerObjectTemplate {
  type: 'TANO';
  /** Crafted complexity */
  craftedServerTemplate: string;
  /** PVP faction */
  pvpFaction: string;
  /** PVP type */
  pvpType: number;
}

/**
 * Server Weapon Object Template
 */
export interface ServerWeaponObjectTemplate extends ServerTangibleObjectTemplate {
  type: 'WEAO';
  /** Certification required */
  certificationRequired: string;
  /** Category */
  weaponCategory: number;
}

/**
 * Type guard for SharedObjectTemplate
 */
export function isSharedObjectTemplate(
  template: ObjectTemplate
): template is SharedObjectTemplate {
  return (
    template.type === 'SHOT' ||
    isSharedTangibleObjectTemplate(template) ||
    template.type === 'SWPT' ||
    template.type === 'SIOT'
  );
}

/**
 * Type guard for SharedTangibleObjectTemplate
 */
export function isSharedTangibleObjectTemplate(
  template: ObjectTemplate
): template is SharedTangibleObjectTemplate {
  return (
    template.type === 'STOT' ||
    isSharedCreatureObjectTemplate(template) ||
    isSharedWeaponObjectTemplate(template) ||
    template.type === 'SBOT' ||
    template.type === 'RCCT'
  );
}

/**
 * Type guard for SharedCreatureObjectTemplate
 */
export function isSharedCreatureObjectTemplate(
  template: ObjectTemplate
): template is SharedCreatureObjectTemplate {
  return template.type === 'SCOT';
}

/**
 * Type guard for SharedWeaponObjectTemplate
 */
export function isSharedWeaponObjectTemplate(
  template: ObjectTemplate
): template is SharedWeaponObjectTemplate {
  return template.type === 'SWOT';
}

/**
 * Type guard for ServerObjectTemplate
 */
export function isServerObjectTemplate(
  template: ObjectTemplate
): template is ServerObjectTemplate {
  return (
    template.type === 'SOBJ' ||
    template.type === 'CREO' ||
    template.type === 'TANO' ||
    template.type === 'WEAO'
  );
}

/**
 * Union type of all template types
 */
export type AnyTemplate =
  | ObjectTemplate
  | SharedObjectTemplate
  | SharedTangibleObjectTemplate
  | SharedCreatureObjectTemplate
  | SharedWeaponObjectTemplate
  | SharedStaticObjectTemplate
  | SharedBuildingObjectTemplate
  | SharedInstallationObjectTemplate
  | SharedResourceContainerObjectTemplate
  | SharedWaypointObjectTemplate
  | SharedIntangibleObjectTemplate
  | SharedMissionObjectTemplate
  | ServerObjectTemplate
  | ServerCreatureObjectTemplate
  | ServerTangibleObjectTemplate
  | ServerWeaponObjectTemplate;
