/**
 * Template Extractor for SWG IFF files
 *
 * Extracts object template data from IFF binary files and converts
 * them into structured TypeScript objects.
 */

import { IffParser, IffDataReader, type IffChunk, IffParseError } from './iff-parser.js';
import {
  type ObjectTemplate,
  type SharedObjectTemplate,
  type SharedTangibleObjectTemplate,
  type SharedCreatureObjectTemplate,
  type SharedWeaponObjectTemplate,
  type StringId,
  type RangeInt,
  type RangeFloat,
  type SkillModEntry,
  ArmorRating,
  ContainerType,
  GameObjectType,
  WeaponType,
  AttackType,
  DamageType,
  Gender,
  Race,
} from './template-types.js';
import { calculateCrc32 } from './crc-table.js';

/**
 * Error thrown during template extraction
 */
export class TemplateExtractError extends Error {
  constructor(
    message: string,
    public readonly templatePath?: string,
    public readonly cause?: Error
  ) {
    super(
      `${message}${templatePath ? ` (template: ${templatePath})` : ''}${cause ? `: ${cause.message}` : ''}`
    );
    this.name = 'TemplateExtractError';
  }
}

/**
 * Template extraction result
 */
export interface ExtractionResult<T extends ObjectTemplate = ObjectTemplate> {
  success: boolean;
  template?: T;
  error?: string;
  warnings: string[];
}

/**
 * Extracts object templates from SWG IFF files
 */
export class TemplateExtractor {
  private parser: IffParser;

  constructor() {
    this.parser = new IffParser();
  }

  /**
   * Extract a template from IFF data, automatically detecting the type
   * @param iffData - Raw IFF file bytes
   * @param templatePath - Path to the template file (for CRC calculation)
   * @returns The extracted template
   */
  extract(iffData: Uint8Array, templatePath: string): ObjectTemplate {
    const root = this.parser.parse(iffData);

    if (!IffParser.isForm(root)) {
      throw new TemplateExtractError('Root chunk is not a FORM', templatePath);
    }

    const formType = root.formType;

    switch (formType) {
      case 'SHOT':
        return this.extractSharedObject(iffData, templatePath);
      case 'STOT':
        return this.extractSharedTangible(iffData, templatePath);
      case 'SCOT':
        return this.extractSharedCreature(iffData, templatePath);
      case 'SWOT':
        return this.extractSharedWeapon(iffData, templatePath);
      default:
        // Generic extraction for unknown types
        return this.extractGeneric(root, templatePath);
    }
  }

  /**
   * Extract a Shared Object Template (SHOT)
   */
  extractSharedObject(iffData: Uint8Array, templatePath: string = ''): SharedObjectTemplate {
    const root = this.parser.parse(iffData);
    const crc = calculateCrc32(templatePath.toLowerCase());

    // Find the versioned FORM (e.g., FORM 0006 for version 6)
    const versionedForm = this.findVersionedForm(root);
    if (!versionedForm) {
      throw new TemplateExtractError('Could not find versioned FORM', templatePath);
    }

    const version = this.parseVersion(versionedForm.formType ?? '');

    // Find the DERV chunk for parent template
    const derivedChunk = IffParser.findChunk(versionedForm, 'DERV');
    const parentTemplate = derivedChunk ? this.readString(derivedChunk) : undefined;

    // Find the PCNT and XXXX chunks for data
    const template: SharedObjectTemplate = {
      templatePath,
      crc,
      type: 'SHOT',
      version,
      parentTemplate,
      properties: {},

      // Default values
      appearanceFilename: '',
      arrangementDescriptorFilename: '',
      clearFloaterOnDestruction: false,
      portalLayoutFilename: '',
      clientDataFile: '',
      containerType: ContainerType.None,
      containerVolumeLimit: 0,
      objectName: { table: '', key: '' },
      detailedDescription: { table: '', key: '' },
      lookAtText: { table: '', key: '' },
      snapToTerrain: true,
      containerTypeFlags: 0,
      gameObjectType: GameObjectType.None,
      sendToClient: true,
      scale: 1.0,
      scaleThresholdBeforeExtentTest: 0.5,
      slotDescriptorFilename: '',
      tintPalette: '',
      volume: 1,
      visibleFlags: 0,
      movementFlags: 0,
      surfaceType: 0,
      collisionMaterialFlags: 0,
      collisionMaterialBlockFlags: 0,
      collisionMaterialPassableFlags: 0,
      collisionActionFlags: 0,
      collisionActionBlockFlags: 0,
      collisionActionPassableFlags: 0,
      clientVisabilityFlag: true,
      niche: 0,
      locationReservationRadius: 0,
      forceNoCollision: false,
    };

    // Extract data from chunks
    this.extractSharedObjectData(versionedForm, template);

    return template;
  }

  /**
   * Extract a Shared Tangible Object Template (STOT)
   */
  extractSharedTangible(iffData: Uint8Array, templatePath: string = ''): SharedTangibleObjectTemplate {
    const root = this.parser.parse(iffData);
    const crc = calculateCrc32(templatePath.toLowerCase());

    const versionedForm = this.findVersionedForm(root);
    if (!versionedForm) {
      throw new TemplateExtractError('Could not find versioned FORM', templatePath);
    }

    const version = this.parseVersion(versionedForm.formType ?? '');

    const derivedChunk = IffParser.findChunk(versionedForm, 'DERV');
    const parentTemplate = derivedChunk ? this.readString(derivedChunk) : undefined;

    const template: SharedTangibleObjectTemplate = {
      templatePath,
      crc,
      type: 'STOT',
      version,
      parentTemplate,
      properties: {},

      // Shared object defaults
      appearanceFilename: '',
      arrangementDescriptorFilename: '',
      clearFloaterOnDestruction: false,
      portalLayoutFilename: '',
      clientDataFile: '',
      containerType: ContainerType.None,
      containerVolumeLimit: 0,
      objectName: { table: '', key: '' },
      detailedDescription: { table: '', key: '' },
      lookAtText: { table: '', key: '' },
      snapToTerrain: true,
      containerTypeFlags: 0,
      gameObjectType: GameObjectType.Tangible,
      sendToClient: true,
      scale: 1.0,
      scaleThresholdBeforeExtentTest: 0.5,
      slotDescriptorFilename: '',
      tintPalette: '',
      volume: 1,
      visibleFlags: 0,
      movementFlags: 0,
      surfaceType: 0,
      collisionMaterialFlags: 0,
      collisionMaterialBlockFlags: 0,
      collisionMaterialPassableFlags: 0,
      collisionActionFlags: 0,
      collisionActionBlockFlags: 0,
      collisionActionPassableFlags: 0,
      clientVisabilityFlag: true,
      niche: 0,
      locationReservationRadius: 0,
      forceNoCollision: false,

      // Tangible defaults
      maxHitPoints: { min: 100, max: 100 },
      visibleOnRadar: true,
      permanentConditionFlags: 0,
      armorRating: ArmorRating.None,
      count: 1,
      condition: 0,
      armorCondition: 0,
      interests: 0,
      complexity: 0,
      customizationVariables: [],
      paletteColorCustomizationVariables: [],
      rangedIntCustomizationVariables: [],
      constStringCustomizationVariables: [],
      socketDestinations: [],
      structureFootprintFileName: '',
      useStructureFootprintOutline: false,
      targetValue: 0,
      combatSkeleton: '',
      optionsCrcScriptTemplate: 0,
      onlyVisibleInFirstPerson: false,
    };

    // Extract base shared object data
    const baseForm = IffParser.findChunk(versionedForm, 'SHOT');
    if (baseForm && IffParser.isForm(baseForm)) {
      const baseVersionedForm = this.findVersionedForm(baseForm);
      if (baseVersionedForm) {
        this.extractSharedObjectData(baseVersionedForm, template);
      }
    }

    // Extract tangible-specific data
    this.extractSharedTangibleData(versionedForm, template);

    return template;
  }

  /**
   * Extract a Shared Creature Object Template (SCOT)
   */
  extractSharedCreature(iffData: Uint8Array, templatePath: string = ''): SharedCreatureObjectTemplate {
    const root = this.parser.parse(iffData);
    const crc = calculateCrc32(templatePath.toLowerCase());

    const versionedForm = this.findVersionedForm(root);
    if (!versionedForm) {
      throw new TemplateExtractError('Could not find versioned FORM', templatePath);
    }

    const version = this.parseVersion(versionedForm.formType ?? '');

    const derivedChunk = IffParser.findChunk(versionedForm, 'DERV');
    const parentTemplate = derivedChunk ? this.readString(derivedChunk) : undefined;

    const template: SharedCreatureObjectTemplate = {
      templatePath,
      crc,
      type: 'SCOT',
      version,
      parentTemplate,
      properties: {},

      // Shared object defaults
      appearanceFilename: '',
      arrangementDescriptorFilename: '',
      clearFloaterOnDestruction: false,
      portalLayoutFilename: '',
      clientDataFile: '',
      containerType: ContainerType.None,
      containerVolumeLimit: 0,
      objectName: { table: '', key: '' },
      detailedDescription: { table: '', key: '' },
      lookAtText: { table: '', key: '' },
      snapToTerrain: true,
      containerTypeFlags: 0,
      gameObjectType: GameObjectType.Creature,
      sendToClient: true,
      scale: 1.0,
      scaleThresholdBeforeExtentTest: 0.5,
      slotDescriptorFilename: '',
      tintPalette: '',
      volume: 1,
      visibleFlags: 0,
      movementFlags: 0,
      surfaceType: 0,
      collisionMaterialFlags: 0,
      collisionMaterialBlockFlags: 0,
      collisionMaterialPassableFlags: 0,
      collisionActionFlags: 0,
      collisionActionBlockFlags: 0,
      collisionActionPassableFlags: 0,
      clientVisabilityFlag: true,
      niche: 0,
      locationReservationRadius: 0,
      forceNoCollision: false,

      // Tangible defaults
      maxHitPoints: { min: 100, max: 100 },
      visibleOnRadar: true,
      permanentConditionFlags: 0,
      armorRating: ArmorRating.None,
      count: 1,
      condition: 0,
      armorCondition: 0,
      interests: 0,
      complexity: 0,
      customizationVariables: [],
      paletteColorCustomizationVariables: [],
      rangedIntCustomizationVariables: [],
      constStringCustomizationVariables: [],
      socketDestinations: [],
      structureFootprintFileName: '',
      useStructureFootprintOutline: false,
      targetValue: 0,
      combatSkeleton: '',
      optionsCrcScriptTemplate: 0,
      onlyVisibleInFirstPerson: false,

      // Creature defaults
      gender: Gender.Male,
      species: Race.Human,
      nicheFlags: 0,
      speed: { min: 1.0, max: 1.0 },
      turnRate: 180,
      acceleration: { min: 1.0, max: 1.0 },
      walkSpeed: 1.0,
      runSpeed: 5.0,
      slopeModAngle: 0,
      slopeModPercent: 1.0,
      waterModPercent: 1.0,
      height: { min: 1.0, max: 1.0 },
      animationMapFilename: '',
      movementDatatable: '',
      postureAlignToTerrain: false,
      swimHeight: 0,
      warpTolerance: 0,
      collisionHeight: 1.0,
      collisionRadius: 0.5,
      collisionOffsetX: 0,
      collisionOffsetZ: 0,
      collisionLength: 0,
      cameraHeight: 1.5,
      stepHeight: 0.5,
      hasWings: false,
      scaleMin: 1.0,
      scaleMax: 1.0,
      skillModEntries: [],
    };

    // Extract base tangible data
    const tangibleForm = IffParser.findChunk(versionedForm, 'STOT');
    if (tangibleForm && IffParser.isForm(tangibleForm)) {
      const tangibleVersionedForm = this.findVersionedForm(tangibleForm);
      if (tangibleVersionedForm) {
        // Extract shared object data from nested SHOT
        const baseForm = IffParser.findChunk(tangibleVersionedForm, 'SHOT');
        if (baseForm && IffParser.isForm(baseForm)) {
          const baseVersionedForm = this.findVersionedForm(baseForm);
          if (baseVersionedForm) {
            this.extractSharedObjectData(baseVersionedForm, template);
          }
        }
        this.extractSharedTangibleData(tangibleVersionedForm, template);
      }
    }

    // Extract creature-specific data
    this.extractSharedCreatureData(versionedForm, template);

    return template;
  }

  /**
   * Extract a Shared Weapon Object Template (SWOT)
   */
  extractSharedWeapon(iffData: Uint8Array, templatePath: string = ''): SharedWeaponObjectTemplate {
    const root = this.parser.parse(iffData);
    const crc = calculateCrc32(templatePath.toLowerCase());

    const versionedForm = this.findVersionedForm(root);
    if (!versionedForm) {
      throw new TemplateExtractError('Could not find versioned FORM', templatePath);
    }

    const version = this.parseVersion(versionedForm.formType ?? '');

    const derivedChunk = IffParser.findChunk(versionedForm, 'DERV');
    const parentTemplate = derivedChunk ? this.readString(derivedChunk) : undefined;

    const template: SharedWeaponObjectTemplate = {
      templatePath,
      crc,
      type: 'SWOT',
      version,
      parentTemplate,
      properties: {},

      // Shared object defaults
      appearanceFilename: '',
      arrangementDescriptorFilename: '',
      clearFloaterOnDestruction: false,
      portalLayoutFilename: '',
      clientDataFile: '',
      containerType: ContainerType.None,
      containerVolumeLimit: 0,
      objectName: { table: '', key: '' },
      detailedDescription: { table: '', key: '' },
      lookAtText: { table: '', key: '' },
      snapToTerrain: true,
      containerTypeFlags: 0,
      gameObjectType: GameObjectType.Weapon,
      sendToClient: true,
      scale: 1.0,
      scaleThresholdBeforeExtentTest: 0.5,
      slotDescriptorFilename: '',
      tintPalette: '',
      volume: 1,
      visibleFlags: 0,
      movementFlags: 0,
      surfaceType: 0,
      collisionMaterialFlags: 0,
      collisionMaterialBlockFlags: 0,
      collisionMaterialPassableFlags: 0,
      collisionActionFlags: 0,
      collisionActionBlockFlags: 0,
      collisionActionPassableFlags: 0,
      clientVisabilityFlag: true,
      niche: 0,
      locationReservationRadius: 0,
      forceNoCollision: false,

      // Tangible defaults
      maxHitPoints: { min: 100, max: 100 },
      visibleOnRadar: true,
      permanentConditionFlags: 0,
      armorRating: ArmorRating.None,
      count: 1,
      condition: 0,
      armorCondition: 0,
      interests: 0,
      complexity: 0,
      customizationVariables: [],
      paletteColorCustomizationVariables: [],
      rangedIntCustomizationVariables: [],
      constStringCustomizationVariables: [],
      socketDestinations: [],
      structureFootprintFileName: '',
      useStructureFootprintOutline: false,
      targetValue: 0,
      combatSkeleton: '',
      optionsCrcScriptTemplate: 0,
      onlyVisibleInFirstPerson: false,

      // Weapon defaults
      weaponType: WeaponType.Rifle,
      attackType: AttackType.Ranged,
      damageType: DamageType.Kinetic,
      elementalType: DamageType.None,
      elementalValue: { min: 0, max: 0 },
      minDamage: { min: 10, max: 10 },
      maxDamage: { min: 50, max: 50 },
      attackSpeed: { min: 1.0, max: 1.0 },
      woundChance: { min: 0, max: 0 },
      accuracy: 0,
      specialAttackCost: 0,
      minRange: { min: 0, max: 0 },
      maxRange: { min: 64, max: 64 },
      damageRadius: { min: 0, max: 0 },
      weaponEffectFilename: '',
      weaponEffectIndex: 0,
    };

    // Extract base tangible data
    const tangibleForm = IffParser.findChunk(versionedForm, 'STOT');
    if (tangibleForm && IffParser.isForm(tangibleForm)) {
      const tangibleVersionedForm = this.findVersionedForm(tangibleForm);
      if (tangibleVersionedForm) {
        const baseForm = IffParser.findChunk(tangibleVersionedForm, 'SHOT');
        if (baseForm && IffParser.isForm(baseForm)) {
          const baseVersionedForm = this.findVersionedForm(baseForm);
          if (baseVersionedForm) {
            this.extractSharedObjectData(baseVersionedForm, template);
          }
        }
        this.extractSharedTangibleData(tangibleVersionedForm, template);
      }
    }

    // Extract weapon-specific data
    this.extractSharedWeaponData(versionedForm, template);

    return template;
  }

  /**
   * Extract a generic template for unknown types
   */
  private extractGeneric(root: IffChunk, templatePath: string): ObjectTemplate {
    const crc = calculateCrc32(templatePath.toLowerCase());
    const formType = root.formType ?? 'UNKN';

    const versionedForm = this.findVersionedForm(root);
    const version = versionedForm ? this.parseVersion(versionedForm.formType ?? '') : undefined;

    let parentTemplate: string | undefined;
    if (versionedForm) {
      const derivedChunk = IffParser.findChunk(versionedForm, 'DERV');
      parentTemplate = derivedChunk ? this.readString(derivedChunk) : undefined;
    }

    return {
      templatePath,
      crc,
      type: formType,
      version,
      parentTemplate,
      properties: {},
    };
  }

  /**
   * Find the versioned FORM (e.g., FORM 0006) within a parent FORM
   */
  private findVersionedForm(chunk: IffChunk): IffChunk | undefined {
    if (!IffParser.isForm(chunk)) {
      return undefined;
    }

    const children = chunk.data as IffChunk[];

    // Look for a FORM with a numeric form type (version)
    for (const child of children) {
      if (child.type === 'FORM' && child.formType) {
        // Check if form type looks like a version number (e.g., '0006')
        if (/^\d{4}$/.test(child.formType)) {
          return child;
        }
      }
    }

    // If no versioned form found, return first child FORM
    for (const child of children) {
      if (child.type === 'FORM') {
        return child;
      }
    }

    return undefined;
  }

  /**
   * Parse a version string (e.g., '0006') to a number
   */
  private parseVersion(versionStr: string): number {
    const parsed = parseInt(versionStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Read a null-terminated string from a chunk
   */
  private readString(chunk: IffChunk): string {
    if (!(chunk.data instanceof Uint8Array)) {
      return '';
    }

    const reader = new IffDataReader(chunk.data);
    return reader.readCString();
  }

  /**
   * Extract shared object data from chunks
   */
  private extractSharedObjectData(
    form: IffChunk,
    template: SharedObjectTemplate
  ): void {
    const children = IffParser.isForm(form) ? (form.data as IffChunk[]) : [];

    for (const chunk of children) {
      if (chunk.data instanceof Uint8Array) {
        const reader = new IffDataReader(chunk.data);

        try {
          switch (chunk.type) {
            case 'APPR':
              template.appearanceFilename = reader.readCString();
              break;
            case 'ARNG':
              template.arrangementDescriptorFilename = reader.readCString();
              break;
            case 'CFOD':
              template.clearFloaterOnDestruction = reader.readBool();
              break;
            case 'PRTL':
              template.portalLayoutFilename = reader.readCString();
              break;
            case 'CLDF':
              template.clientDataFile = reader.readCString();
              break;
            case 'CNTR':
              template.containerType = reader.readInt32BE() as ContainerType;
              break;
            case 'CVOL':
              template.containerVolumeLimit = reader.readInt32BE();
              break;
            case 'OBJN':
              template.objectName = this.readStringId(reader);
              break;
            case 'DTLD':
              template.detailedDescription = this.readStringId(reader);
              break;
            case 'LKAT':
              template.lookAtText = this.readStringId(reader);
              break;
            case 'SNAP':
              template.snapToTerrain = reader.readBool();
              break;
            case 'CTFL':
              template.containerTypeFlags = reader.readInt32BE();
              break;
            case 'GOTY':
              template.gameObjectType = reader.readInt32BE() as GameObjectType;
              break;
            case 'STCL':
              template.sendToClient = reader.readBool();
              break;
            case 'SCLE':
              template.scale = reader.readFloat32BE();
              break;
            case 'SCTH':
              template.scaleThresholdBeforeExtentTest = reader.readFloat32BE();
              break;
            case 'SLOT':
              template.slotDescriptorFilename = reader.readCString();
              break;
            case 'TPLT':
              template.tintPalette = reader.readCString();
              break;
            case 'VLUM':
              template.volume = reader.readInt32BE();
              break;
            case 'VFLG':
              template.visibleFlags = reader.readInt32BE();
              break;
            case 'MVFL':
              template.movementFlags = reader.readInt32BE();
              break;
            case 'SRFT':
              template.surfaceType = reader.readInt32BE();
              break;
            case 'CVIS':
              template.clientVisabilityFlag = reader.readBool();
              break;
            case 'NICH':
              template.niche = reader.readInt32BE();
              break;
            case 'LRRS':
              template.locationReservationRadius = reader.readFloat32BE();
              break;
            case 'FNOC':
              template.forceNoCollision = reader.readBool();
              break;
            default:
              // Store unknown chunks in properties
              template.properties[chunk.type] = Array.from(chunk.data);
              break;
          }
        } catch (e) {
          // Store failed chunks as raw data
          template.properties[`${chunk.type}_raw`] = Array.from(chunk.data);
        }
      }
    }
  }

  /**
   * Extract shared tangible object data
   */
  private extractSharedTangibleData(
    form: IffChunk,
    template: SharedTangibleObjectTemplate
  ): void {
    const children = IffParser.isForm(form) ? (form.data as IffChunk[]) : [];

    for (const chunk of children) {
      if (chunk.data instanceof Uint8Array) {
        const reader = new IffDataReader(chunk.data);

        try {
          switch (chunk.type) {
            case 'MXHP':
              template.maxHitPoints = this.readRangeInt(reader);
              break;
            case 'VRAD':
              template.visibleOnRadar = reader.readBool();
              break;
            case 'PCFL':
              template.permanentConditionFlags = reader.readInt32BE();
              break;
            case 'ARMR':
              template.armorRating = reader.readInt32BE() as ArmorRating;
              break;
            case 'CNTS':
              template.count = reader.readInt32BE();
              break;
            case 'COND':
              template.condition = reader.readInt32BE();
              break;
            case 'ACND':
              template.armorCondition = reader.readInt32BE();
              break;
            case 'INTS':
              template.interests = reader.readInt32BE();
              break;
            case 'CMPL':
              template.complexity = reader.readFloat32BE();
              break;
            case 'SFPF':
              template.structureFootprintFileName = reader.readCString();
              break;
            case 'USFO':
              template.useStructureFootprintOutline = reader.readBool();
              break;
            case 'TVAL':
              template.targetValue = reader.readInt32BE();
              break;
            case 'CBSK':
              template.combatSkeleton = reader.readCString();
              break;
            case 'OCST':
              template.optionsCrcScriptTemplate = reader.readUint32BE();
              break;
            case 'OVFP':
              template.onlyVisibleInFirstPerson = reader.readBool();
              break;
            default:
              if (!chunk.type.match(/^(SHOT|STOT|DERV|PCNT|XXXX)$/)) {
                template.properties[chunk.type] = Array.from(chunk.data);
              }
              break;
          }
        } catch (e) {
          template.properties[`${chunk.type}_raw`] = Array.from(chunk.data);
        }
      }
    }
  }

  /**
   * Extract shared creature object data
   */
  private extractSharedCreatureData(
    form: IffChunk,
    template: SharedCreatureObjectTemplate
  ): void {
    const children = IffParser.isForm(form) ? (form.data as IffChunk[]) : [];

    for (const chunk of children) {
      if (chunk.data instanceof Uint8Array) {
        const reader = new IffDataReader(chunk.data);

        try {
          switch (chunk.type) {
            case 'GNDR':
              template.gender = reader.readInt32BE() as Gender;
              break;
            case 'SPCS':
              template.species = reader.readInt32BE() as Race;
              break;
            case 'NICH':
              template.nicheFlags = reader.readInt32BE();
              break;
            case 'SPED':
              template.speed = this.readRangeFloat(reader);
              break;
            case 'TURN':
              template.turnRate = reader.readFloat32BE();
              break;
            case 'ACCL':
              template.acceleration = this.readRangeFloat(reader);
              break;
            case 'WALK':
              template.walkSpeed = reader.readFloat32BE();
              break;
            case 'RUNS':
              template.runSpeed = reader.readFloat32BE();
              break;
            case 'SLMA':
              template.slopeModAngle = reader.readFloat32BE();
              break;
            case 'SLMP':
              template.slopeModPercent = reader.readFloat32BE();
              break;
            case 'WTMP':
              template.waterModPercent = reader.readFloat32BE();
              break;
            case 'HGHT':
              template.height = this.readRangeFloat(reader);
              break;
            case 'AMAP':
              template.animationMapFilename = reader.readCString();
              break;
            case 'MVDT':
              template.movementDatatable = reader.readCString();
              break;
            case 'PATT':
              template.postureAlignToTerrain = reader.readBool();
              break;
            case 'SWMH':
              template.swimHeight = reader.readFloat32BE();
              break;
            case 'WPTL':
              template.warpTolerance = reader.readFloat32BE();
              break;
            case 'CLHT':
              template.collisionHeight = reader.readFloat32BE();
              break;
            case 'CLRD':
              template.collisionRadius = reader.readFloat32BE();
              break;
            case 'CLOX':
              template.collisionOffsetX = reader.readFloat32BE();
              break;
            case 'CLOZ':
              template.collisionOffsetZ = reader.readFloat32BE();
              break;
            case 'CLLN':
              template.collisionLength = reader.readFloat32BE();
              break;
            case 'CMHT':
              template.cameraHeight = reader.readFloat32BE();
              break;
            case 'STHT':
              template.stepHeight = reader.readFloat32BE();
              break;
            case 'HWNG':
              template.hasWings = reader.readBool();
              break;
            case 'SCLM':
              template.scaleMin = reader.readFloat32BE();
              break;
            case 'SCLX':
              template.scaleMax = reader.readFloat32BE();
              break;
            default:
              if (!chunk.type.match(/^(STOT|SHOT|DERV|PCNT|XXXX)$/)) {
                template.properties[chunk.type] = Array.from(chunk.data);
              }
              break;
          }
        } catch (e) {
          template.properties[`${chunk.type}_raw`] = Array.from(chunk.data);
        }
      }
    }
  }

  /**
   * Extract shared weapon object data
   */
  private extractSharedWeaponData(
    form: IffChunk,
    template: SharedWeaponObjectTemplate
  ): void {
    const children = IffParser.isForm(form) ? (form.data as IffChunk[]) : [];

    for (const chunk of children) {
      if (chunk.data instanceof Uint8Array) {
        const reader = new IffDataReader(chunk.data);

        try {
          switch (chunk.type) {
            case 'WPTY':
              template.weaponType = reader.readInt32BE() as WeaponType;
              break;
            case 'ATTY':
              template.attackType = reader.readInt32BE() as AttackType;
              break;
            case 'DMTY':
              template.damageType = reader.readInt32BE() as DamageType;
              break;
            case 'ELTY':
              template.elementalType = reader.readInt32BE() as DamageType;
              break;
            case 'ELVL':
              template.elementalValue = this.readRangeInt(reader);
              break;
            case 'MNDM':
              template.minDamage = this.readRangeInt(reader);
              break;
            case 'MXDM':
              template.maxDamage = this.readRangeInt(reader);
              break;
            case 'ATSP':
              template.attackSpeed = this.readRangeFloat(reader);
              break;
            case 'WNDC':
              template.woundChance = this.readRangeFloat(reader);
              break;
            case 'ACCY':
              template.accuracy = reader.readInt32BE();
              break;
            case 'SATC':
              template.specialAttackCost = reader.readInt32BE();
              break;
            case 'MNRG':
              template.minRange = this.readRangeFloat(reader);
              break;
            case 'MXRG':
              template.maxRange = this.readRangeFloat(reader);
              break;
            case 'DMRD':
              template.damageRadius = this.readRangeFloat(reader);
              break;
            case 'WEFF':
              template.weaponEffectFilename = reader.readCString();
              break;
            case 'WEFI':
              template.weaponEffectIndex = reader.readInt32BE();
              break;
            default:
              if (!chunk.type.match(/^(STOT|SHOT|DERV|PCNT|XXXX)$/)) {
                template.properties[chunk.type] = Array.from(chunk.data);
              }
              break;
          }
        } catch (e) {
          template.properties[`${chunk.type}_raw`] = Array.from(chunk.data);
        }
      }
    }
  }

  /**
   * Read a StringId from binary data
   */
  private readStringId(reader: IffDataReader): StringId {
    const table = reader.readCString();
    const key = reader.readCString();
    return { table, key };
  }

  /**
   * Read a RangeInt from binary data
   */
  private readRangeInt(reader: IffDataReader): RangeInt {
    const min = reader.readInt32BE();
    const max = reader.readInt32BE();
    return { min, max };
  }

  /**
   * Read a RangeFloat from binary data
   */
  private readRangeFloat(reader: IffDataReader): RangeFloat {
    const min = reader.readFloat32BE();
    const max = reader.readFloat32BE();
    return { min, max };
  }

  /**
   * Batch extract templates from a directory
   */
  async extractDirectory(
    inputDir: string,
    outputDir: string,
    options: {
      recursive?: boolean;
      filePattern?: RegExp;
    } = {}
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ file: string; error: string }>;
  }> {
    const { readdir, readFile, writeFile, mkdir, stat } = await import('node:fs/promises');
    const { join, relative, dirname } = await import('node:path');

    const { recursive = true, filePattern = /\.iff$/i } = options;

    const result = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ file: string; error: string }>,
    };

    async function* walkDir(dir: string): AsyncGenerator<string> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && recursive) {
          yield* walkDir(fullPath);
        } else if (entry.isFile() && filePattern.test(entry.name)) {
          yield fullPath;
        }
      }
    }

    for await (const filePath of walkDir(inputDir)) {
      result.processed++;

      try {
        const relativePath = relative(inputDir, filePath);
        const templatePath = relativePath.replace(/\\/g, '/');

        const iffData = await readFile(filePath);
        const template = this.extract(new Uint8Array(iffData), templatePath);

        // Write JSON output
        const outputPath = join(outputDir, relativePath.replace(/\.iff$/i, '.json'));
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, JSON.stringify(template, null, 2));

        result.successful++;
      } catch (e) {
        result.failed++;
        result.errors.push({
          file: filePath,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return result;
  }
}
