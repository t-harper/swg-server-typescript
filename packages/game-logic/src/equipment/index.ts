/**
 * Equipment System
 * Manages character equipment slots, requirements, and appearance
 */

// Equipment slots and arrangement
export {
  EquipmentSlot,
  type EquipmentSlotType,
  type SlotCapacity,
  type SlotArrangement,
  type EquippedItem,
  DEFAULT_SLOT_CAPACITIES,
  SLOT_ARRANGEMENTS,
  getSlotCapacity,
  getSlotArrangement,
  getSlotDisplayName,
  isWeaponSlot,
  isArmorSlot,
  isJewelrySlot,
  isSpecialSlot,
  getVisibleSlots,
  getPairedSlot,
} from './equipment-slots.js';

// Slot requirements
export {
  type SlotRequirement,
  type RequirementCheckResult,
  type ItemEquipmentRequirement,
  EquipmentFailureReason,
  type EquipmentFailureReasonType,
  DEFAULT_SLOT_REQUIREMENTS,
  getSlotRequirements,
  isObjectTypeAllowed,
  isSpeciesAllowed,
  isGenderAllowed,
  hasCertificationForSlot,
  isSlotUnlocked,
  validateSlotRequirements,
  validateItemRequirements,
  getFailureMessage,
} from './slot-requirements.js';

// Equipment manager
export {
  EquipmentManager,
  type EquipmentResult,
  type PlayerEquipmentContext,
  type ItemEquipmentContext,
  createEquipmentManager,
} from './equipment-manager.js';

// Encumbrance calculator
export {
  type EncumbranceResult,
  type EncumbranceModifier,
  type ItemEncumbrance,
  type EncumbranceConfig,
  DEFAULT_ENCUMBRANCE_CONFIG,
  calculateTotalEncumbrance,
  calculateItemEncumbrance,
  applyEncumbranceModifiers,
  applyEncumbrance,
  getEncumbranceModifiers,
  calculateEffectiveMaximums,
  getEncumbrancePenalties,
  isOverEncumbered,
  getArmorEncumbrance,
  compareEncumbrance,
  createEmptyEncumbrance,
} from './encumbrance-calculator.js';

// Appearance manager
export {
  type CharacterAppearance,
  type WeaponAppearance,
  type AppearanceUpdateMessage,
  AppearanceUpdateType,
  type AppearanceUpdateTypeValue,
  getAppearanceData,
  getWornItems,
  updateAppearance,
  createEquipmentDelta,
  createEquipmentAddDelta,
  createEquipmentRemoveDelta,
  getSlotRenderPriority,
  sortByRenderPriority,
} from './appearance-manager.js';

// Equipment events
export {
  EquipmentEventType,
  type EquipmentEventTypeValue,
  type BaseEquipmentEvent,
  type ItemEquippedEvent,
  type ItemUnequippedEvent,
  type WeaponChangedEvent,
  type EncumbranceChangedEvent,
  type AppearanceChangedEvent,
  type SlotUnlockedEvent,
  type EquipmentEvent,
  type EquipmentEventHandler,
  type EquipmentEventEmitter,
  createItemEquippedEvent,
  createItemUnequippedEvent,
  createWeaponChangedEvent,
  createEncumbranceChangedEvent,
  createAppearanceChangedEvent,
  createSlotUnlockedEvent,
  SimpleEquipmentEventEmitter,
  createEquipmentEventEmitter,
} from './equipment-events.js';
