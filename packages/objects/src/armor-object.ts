/**
 * ArmorObject - Armor pieces that provide protection against damage
 * Extends TangibleObject with armor-specific properties like damage resistance,
 * encumbrance, and socket slots for modifications.
 *
 * SWG armor provides protection against specific damage types with effectiveness
 * ratings. Multiple armor pieces can be worn simultaneously, with each piece
 * protecting specific body locations.
 *
 * Baseline Types:
 * - ARMO3: Effectiveness values, encumbrance
 * - ARMO6: Sockets, condition, special protection
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject, DamageType } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { EquipmentSlot, type EquipmentSlotType } from './creature-object.js';
import {
  ArmorRating,
  ArmorLayer,
  type ArmorRatingType,
  type ArmorLayerType,
} from './armor-rating.js';
import { DeltaTracker, DeltaType } from './deltas.js';

// Re-export armor types for convenience
export { ArmorRating, ArmorLayer } from './armor-rating.js';
export type { ArmorRatingType, ArmorLayerType } from './armor-rating.js';

/**
 * ARMO property indices for delta tracking
 * These match the variable indices in ARMO baselines
 */
export const ArmoProperty = {
  // ARMO3
  ARMOR_RATING: 0,
  KINETIC_EFFECTIVENESS: 1,
  ENERGY_EFFECTIVENESS: 2,
  BLAST_EFFECTIVENESS: 3,
  STUN_EFFECTIVENESS: 4,
  HEAT_EFFECTIVENESS: 5,
  COLD_EFFECTIVENESS: 6,
  ACID_EFFECTIVENESS: 7,
  ELECTRICITY_EFFECTIVENESS: 8,
  LIGHTSABER_RESIST: 9,
  HEALTH_ENCUMBRANCE: 10,
  ACTION_ENCUMBRANCE: 11,
  MIND_ENCUMBRANCE: 12,
  ARMOR_LAYER: 13,
  COVERAGE_SLOTS: 14,
  // ARMO6
  SOCKET_SLOTS: 0,
  ATTACHED_MODS: 1,
  SPECIAL_PROTECTION: 2,
  PROTECTION_TYPE: 3,
  REQUIRED_CERTIFICATION: 4,
} as const;

/**
 * Default effectiveness values for armor creation
 */
export const DEFAULT_EFFECTIVENESS = {
  /** No protection */
  NONE: 0,
  /** Low protection */
  LOW: 0.15,
  /** Medium protection */
  MEDIUM: 0.35,
  /** High protection */
  HIGH: 0.55,
  /** Maximum protection */
  MAX: 0.80,
} as const;

/**
 * ArmorObject - Base class for armor pieces
 * Extends TangibleObject with armor-specific properties
 */
export class ArmorObject extends TangibleObject {
  // ============================================
  // Armor Rating and Protection
  // ============================================

  /** Armor rating (base protection class) */
  override armorRating: ArmorRatingType;

  // ============================================
  // Damage Type Effectiveness (0-1)
  // ============================================

  /** Kinetic damage effectiveness (bullets, melee) */
  kineticEffectiveness: number;

  /** Energy damage effectiveness (blasters, lasers) */
  energyEffectiveness: number;

  /** Blast/explosion damage effectiveness */
  blastEffectiveness: number;

  /** Stun damage effectiveness */
  stunEffectiveness: number;

  /** Heat/fire damage effectiveness */
  heatEffectiveness: number;

  /** Cold/ice damage effectiveness */
  coldEffectiveness: number;

  /** Acid damage effectiveness */
  acidEffectiveness: number;

  /** Electricity damage effectiveness */
  electricityEffectiveness: number;

  // ============================================
  // Special Resistances
  // ============================================

  /** Lightsaber resistance (0-1) */
  lightsaberResist: number;

  // ============================================
  // Encumbrance
  // ============================================

  /** Health encumbrance (reduces health pool) */
  healthEncumbrance: number;

  /** Action encumbrance (reduces action pool and speed) */
  actionEncumbrance: number;

  /** Mind encumbrance (reduces mind pool) */
  mindEncumbrance: number;

  // ============================================
  // Layer and Coverage
  // ============================================

  /** Armor layer (body part covered) */
  armorLayer: ArmorLayerType;

  /** Equipment slots this armor occupies */
  coverageSlots: EquipmentSlotType[];

  // ============================================
  // Special Properties
  // ============================================

  /** Special protection bonus vs specific attack types */
  specialProtection: number;

  /** Protection type identifier ("Jedi", "BH", etc.) */
  protectionType: string;

  // ============================================
  // Socket System
  // ============================================

  /** Number of socket slots for armor attachments */
  socketSlots: number;

  /** Object IDs of attached modifications */
  attachedMods: ObjectId[];

  // ============================================
  // Requirements
  // ============================================

  /** Required certification to wear this armor */
  requiredCertification: string;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for ARMO3 */
  private deltaTrackerArmo3: DeltaTracker;

  /** Delta tracker for ARMO6 */
  private deltaTrackerArmo6: DeltaTracker;

  /** Update counters for list properties */
  private listUpdateCounters: Map<string, number>;

  /**
   * Create a new ArmorObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Armor;

    // Initialize armor rating
    this.armorRating = ArmorRating.None;

    // Initialize effectiveness values (0 = no protection)
    this.kineticEffectiveness = 0;
    this.energyEffectiveness = 0;
    this.blastEffectiveness = 0;
    this.stunEffectiveness = 0;
    this.heatEffectiveness = 0;
    this.coldEffectiveness = 0;
    this.acidEffectiveness = 0;
    this.electricityEffectiveness = 0;

    // Initialize special resistances
    this.lightsaberResist = 0;

    // Initialize encumbrance
    this.healthEncumbrance = 0;
    this.actionEncumbrance = 0;
    this.mindEncumbrance = 0;

    // Initialize layer and coverage
    this.armorLayer = ArmorLayer.Chest;
    this.coverageSlots = [];

    // Initialize special properties
    this.specialProtection = 0;
    this.protectionType = '';

    // Initialize socket system
    this.socketSlots = 0;
    this.attachedMods = [];

    // Initialize requirements
    this.requiredCertification = '';

    // Initialize delta trackers
    this.deltaTrackerArmo3 = new DeltaTracker();
    this.deltaTrackerArmo6 = new DeltaTracker();
    this.listUpdateCounters = new Map();
  }

  /**
   * Get baseline type for ARMO objects
   */
  override getBaselineType(): string {
    return 'ARMO';
  }

  // ============================================
  // Armor Rating Management
  // ============================================

  /**
   * Set the armor rating
   */
  setArmorRating(rating: ArmorRatingType): void {
    if (this.armorRating !== rating) {
      this.armorRating = rating;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.ARMOR_RATING, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Effectiveness Management
  // ============================================

  /**
   * Set kinetic effectiveness
   */
  setKineticEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.kineticEffectiveness !== clamped) {
      this.kineticEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.KINETIC_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set energy effectiveness
   */
  setEnergyEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.energyEffectiveness !== clamped) {
      this.energyEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.ENERGY_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set blast effectiveness
   */
  setBlastEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.blastEffectiveness !== clamped) {
      this.blastEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.BLAST_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set stun effectiveness
   */
  setStunEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.stunEffectiveness !== clamped) {
      this.stunEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.STUN_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set heat effectiveness
   */
  setHeatEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.heatEffectiveness !== clamped) {
      this.heatEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.HEAT_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set cold effectiveness
   */
  setColdEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.coldEffectiveness !== clamped) {
      this.coldEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.COLD_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set acid effectiveness
   */
  setAcidEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.acidEffectiveness !== clamped) {
      this.acidEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.ACID_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set electricity effectiveness
   */
  setElectricityEffectiveness(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.electricityEffectiveness !== clamped) {
      this.electricityEffectiveness = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.ELECTRICITY_EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set all effectiveness values at once
   */
  setAllEffectiveness(
    kinetic: number,
    energy: number,
    blast: number,
    stun: number,
    heat: number,
    cold: number,
    acid: number,
    electricity: number
  ): void {
    this.setKineticEffectiveness(kinetic);
    this.setEnergyEffectiveness(energy);
    this.setBlastEffectiveness(blast);
    this.setStunEffectiveness(stun);
    this.setHeatEffectiveness(heat);
    this.setColdEffectiveness(cold);
    this.setAcidEffectiveness(acid);
    this.setElectricityEffectiveness(electricity);
  }

  /**
   * Get effectiveness against a specific damage type
   */
  getEffectiveness(damageType: DamageType): number {
    switch (damageType) {
      case DamageType.Kinetic:
        return this.kineticEffectiveness;
      case DamageType.Energy:
        return this.energyEffectiveness;
      case DamageType.Blast:
        return this.blastEffectiveness;
      case DamageType.Stun:
        return this.stunEffectiveness;
      case DamageType.ElementalHeat:
        return this.heatEffectiveness;
      case DamageType.ElementalCold:
        return this.coldEffectiveness;
      case DamageType.ElementalAcid:
        return this.acidEffectiveness;
      case DamageType.ElementalElectrical:
        return this.electricityEffectiveness;
      default:
        return 0;
    }
  }

  /**
   * Clamp effectiveness value to valid range
   */
  private clampEffectiveness(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  // ============================================
  // Special Resistance Management
  // ============================================

  /**
   * Set lightsaber resistance
   */
  setLightsaberResist(value: number): void {
    const clamped = this.clampEffectiveness(value);
    if (this.lightsaberResist !== clamped) {
      this.lightsaberResist = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.LIGHTSABER_RESIST, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Encumbrance Management
  // ============================================

  /**
   * Set health encumbrance
   */
  setHealthEncumbrance(value: number): void {
    const clamped = Math.max(0, value);
    if (this.healthEncumbrance !== clamped) {
      this.healthEncumbrance = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.HEALTH_ENCUMBRANCE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set action encumbrance
   */
  setActionEncumbrance(value: number): void {
    const clamped = Math.max(0, value);
    if (this.actionEncumbrance !== clamped) {
      this.actionEncumbrance = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.ACTION_ENCUMBRANCE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set mind encumbrance
   */
  setMindEncumbrance(value: number): void {
    const clamped = Math.max(0, value);
    if (this.mindEncumbrance !== clamped) {
      this.mindEncumbrance = clamped;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.MIND_ENCUMBRANCE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set all encumbrance values at once
   */
  setAllEncumbrance(health: number, action: number, mind: number): void {
    this.setHealthEncumbrance(health);
    this.setActionEncumbrance(action);
    this.setMindEncumbrance(mind);
  }

  /**
   * Get total encumbrance (sum of all encumbrance values)
   */
  getTotalEncumbrance(): number {
    return this.healthEncumbrance + this.actionEncumbrance + this.mindEncumbrance;
  }

  // ============================================
  // Layer and Coverage Management
  // ============================================

  /**
   * Set the armor layer
   */
  setArmorLayer(layer: ArmorLayerType): void {
    if (this.armorLayer !== layer) {
      this.armorLayer = layer;
      this.deltaTrackerArmo3.trackChange(ArmoProperty.ARMOR_LAYER, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the coverage slots
   */
  setCoverageSlots(slots: EquipmentSlotType[]): void {
    this.coverageSlots = [...slots];
    this.incrementListUpdateCounter('coverageSlots');
    this.deltaTrackerArmo3.trackChange(ArmoProperty.COVERAGE_SLOTS, DeltaType.Change);
    this.markModified();
  }

  /**
   * Add a coverage slot
   */
  addCoverageSlot(slot: EquipmentSlotType): void {
    if (!this.coverageSlots.includes(slot)) {
      this.coverageSlots.push(slot);
      this.incrementListUpdateCounter('coverageSlots');
      this.deltaTrackerArmo3.trackListAdd(
        ArmoProperty.COVERAGE_SLOTS,
        this.coverageSlots.length - 1,
        slot
      );
      this.markModified();
    }
  }

  /**
   * Check if this armor covers a specific slot
   */
  coversSlot(slot: EquipmentSlotType): boolean {
    return this.coverageSlots.includes(slot);
  }

  // ============================================
  // Special Protection Management
  // ============================================

  /**
   * Set special protection value
   */
  setSpecialProtection(value: number): void {
    if (this.specialProtection !== value) {
      this.specialProtection = value;
      this.deltaTrackerArmo6.trackChange(ArmoProperty.SPECIAL_PROTECTION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set protection type
   */
  setProtectionType(type: string): void {
    if (this.protectionType !== type) {
      this.protectionType = type;
      this.deltaTrackerArmo6.trackChange(ArmoProperty.PROTECTION_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Socket System Management
  // ============================================

  /**
   * Set the number of socket slots
   */
  setSocketSlots(slots: number): void {
    const clamped = Math.max(0, slots);
    if (this.socketSlots !== clamped) {
      this.socketSlots = clamped;
      this.deltaTrackerArmo6.trackChange(ArmoProperty.SOCKET_SLOTS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the number of available (unused) socket slots
   */
  getAvailableSocketSlots(): number {
    return Math.max(0, this.socketSlots - this.attachedMods.length);
  }

  /**
   * Check if a mod can be attached
   */
  canAttachMod(): boolean {
    return this.attachedMods.length < this.socketSlots;
  }

  /**
   * Attach a modification
   * @returns true if the mod was attached, false if no slots available
   */
  attachMod(modId: ObjectId): boolean {
    if (!this.canAttachMod()) {
      return false;
    }

    if (this.attachedMods.includes(modId)) {
      return false;
    }

    this.attachedMods.push(modId);
    this.incrementListUpdateCounter('attachedMods');
    this.deltaTrackerArmo6.trackListAdd(
      ArmoProperty.ATTACHED_MODS,
      this.attachedMods.length - 1,
      modId
    );
    this.markModified();
    return true;
  }

  /**
   * Remove a modification
   * @returns true if the mod was removed
   */
  removeMod(modId: ObjectId): boolean {
    const index = this.attachedMods.indexOf(modId);
    if (index === -1) {
      return false;
    }

    this.attachedMods.splice(index, 1);
    this.incrementListUpdateCounter('attachedMods');
    this.deltaTrackerArmo6.trackListRemove(ArmoProperty.ATTACHED_MODS, index, modId);
    this.markModified();
    return true;
  }

  /**
   * Check if a specific mod is attached
   */
  hasModAttached(modId: ObjectId): boolean {
    return this.attachedMods.includes(modId);
  }

  /**
   * Get all attached mod IDs
   */
  getAttachedMods(): readonly ObjectId[] {
    return this.attachedMods;
  }

  // ============================================
  // Requirements Management
  // ============================================

  /**
   * Set the required certification
   */
  setRequiredCertification(certification: string): void {
    if (this.requiredCertification !== certification) {
      this.requiredCertification = certification;
      this.deltaTrackerArmo6.trackChange(ArmoProperty.REQUIRED_CERTIFICATION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a creature has the required certification
   * @param creatureCertifications - Set of certifications the creature has
   */
  meetsRequirements(creatureCertifications: Set<string>): boolean {
    if (!this.requiredCertification) {
      return true;
    }
    return creatureCertifications.has(this.requiredCertification);
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Increment update counter for a list property
   */
  private incrementListUpdateCounter(listName: string): void {
    const current = this.listUpdateCounters.get(listName) ?? 0;
    this.listUpdateCounters.set(listName, current + 1);
  }

  /**
   * Get update counter for a list property
   */
  getListUpdateCounter(listName: string): number {
    return this.listUpdateCounters.get(listName) ?? 0;
  }

  /**
   * Check if ARMO3 has changes
   */
  hasArmo3Changes(): boolean {
    return this.deltaTrackerArmo3.hasChanges();
  }

  /**
   * Check if ARMO6 has changes
   */
  hasArmo6Changes(): boolean {
    return this.deltaTrackerArmo6.hasChanges();
  }

  /**
   * Get ARMO3 delta tracker
   */
  getArmo3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerArmo3;
  }

  /**
   * Get ARMO6 delta tracker
   */
  getArmo6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerArmo6;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.deltaTrackerArmo3.clear();
    this.deltaTrackerArmo6.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Get effectiveness values as an array
   * Order: kinetic, energy, blast, stun, heat, cold, acid, electricity
   */
  getEffectivenessArray(): number[] {
    return [
      this.kineticEffectiveness,
      this.energyEffectiveness,
      this.blastEffectiveness,
      this.stunEffectiveness,
      this.heatEffectiveness,
      this.coldEffectiveness,
      this.acidEffectiveness,
      this.electricityEffectiveness,
    ];
  }

  /**
   * Get encumbrance values as an array
   * Order: health, action, mind
   */
  getEncumbranceArray(): number[] {
    return [this.healthEncumbrance, this.actionEncumbrance, this.mindEncumbrance];
  }

  /**
   * Clone armor properties to another ArmorObject
   */
  copyArmorPropertiesTo(target: ArmorObject): void {
    // Copy TangibleObject properties
    this.copyPropertiesTo(target);

    // Copy armor-specific properties
    target.armorRating = this.armorRating;
    target.kineticEffectiveness = this.kineticEffectiveness;
    target.energyEffectiveness = this.energyEffectiveness;
    target.blastEffectiveness = this.blastEffectiveness;
    target.stunEffectiveness = this.stunEffectiveness;
    target.heatEffectiveness = this.heatEffectiveness;
    target.coldEffectiveness = this.coldEffectiveness;
    target.acidEffectiveness = this.acidEffectiveness;
    target.electricityEffectiveness = this.electricityEffectiveness;
    target.lightsaberResist = this.lightsaberResist;
    target.healthEncumbrance = this.healthEncumbrance;
    target.actionEncumbrance = this.actionEncumbrance;
    target.mindEncumbrance = this.mindEncumbrance;
    target.armorLayer = this.armorLayer;
    target.coverageSlots = [...this.coverageSlots];
    target.specialProtection = this.specialProtection;
    target.protectionType = this.protectionType;
    target.socketSlots = this.socketSlots;
    target.attachedMods = [...this.attachedMods];
    target.requiredCertification = this.requiredCertification;
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      armorRating: this.armorRating,
      effectiveness: {
        kinetic: this.kineticEffectiveness,
        energy: this.energyEffectiveness,
        blast: this.blastEffectiveness,
        stun: this.stunEffectiveness,
        heat: this.heatEffectiveness,
        cold: this.coldEffectiveness,
        acid: this.acidEffectiveness,
        electricity: this.electricityEffectiveness,
      },
      lightsaberResist: this.lightsaberResist,
      encumbrance: {
        health: this.healthEncumbrance,
        action: this.actionEncumbrance,
        mind: this.mindEncumbrance,
      },
      armorLayer: this.armorLayer,
      coverageSlots: this.coverageSlots,
      specialProtection: this.specialProtection,
      protectionType: this.protectionType,
      socketSlots: this.socketSlots,
      attachedMods: this.attachedMods.map((id) => id.toString()),
      requiredCertification: this.requiredCertification,
    };
  }
}
