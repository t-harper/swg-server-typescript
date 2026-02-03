/**
 * XP Manager - Core experience points management
 *
 * Handles awarding, spending, and tracking XP for players.
 * Integrates with the skill system for cap management and
 * skill availability notifications.
 */

import type { ObjectId } from '@swg/shared-types';
import { PlayerObject } from '@swg/objects';
import { XpType, DefaultXpCaps, isValidXpType, type XpTypeValue } from './xp-types.js';
import { type SkillTemplate, getSkillRegistry, type SkillRegistry } from './skill-template.js';
import {
  type XpEventEmitter,
  getXpEventEmitter,
  type XpAwardedEvent,
  type SkillAffordableEvent,
  type XpSpentEvent,
  type XpCapChangedEvent,
  type XpCapReachedEvent,
} from './xp-events.js';

/**
 * Result of an XP award operation
 */
export interface XpAwardResult {
  /** Amount actually awarded */
  awarded: number;
  /** Amount lost to cap */
  capped: number;
  /** New total XP for this type */
  newTotal: number;
  /** Skills that are now affordable */
  skillsAvailable: string[];
  /** Whether the cap was reached */
  capReached: boolean;
  /** Current cap for this XP type */
  currentCap: number;
}

/**
 * Options for XP award
 */
export interface XpAwardOptions {
  /** Source of the XP (for logging/events) */
  source?: string;
  /** Whether to check for newly affordable skills */
  checkSkills?: boolean;
  /** Override the normal cap (for admin/special cases) */
  ignoreCap?: boolean;
  /** Multiplier to apply to the XP amount */
  multiplier?: number;
}

/**
 * XP Manager class
 * Handles all XP-related operations for players
 */
export class XpManager {
  private eventEmitter: XpEventEmitter;
  private skillRegistry: SkillRegistry;

  /** XP cap overrides per player (for buffs, special items, etc.) */
  private playerCapModifiers: Map<ObjectId, Map<string, number>> = new Map();

  /**
   * Create a new XP Manager
   * @param eventEmitter - Event emitter for XP events (optional, uses global)
   * @param skillRegistry - Skill registry for cap calculations (optional, uses global)
   */
  constructor(eventEmitter?: XpEventEmitter, skillRegistry?: SkillRegistry) {
    this.eventEmitter = eventEmitter ?? getXpEventEmitter();
    this.skillRegistry = skillRegistry ?? getSkillRegistry();
  }

  /**
   * Award XP to a player
   * @param player - The player to award XP to
   * @param xpType - Type of XP to award
   * @param amount - Base amount of XP to award
   * @param options - Additional options for the award
   * @returns Result of the award operation
   */
  awardXp(
    player: PlayerObject,
    xpType: XpTypeValue | string,
    amount: number,
    options: XpAwardOptions = {}
  ): XpAwardResult {
    const {
      source = 'unknown',
      checkSkills = true,
      ignoreCap = false,
      multiplier = 1.0,
    } = options;

    // Validate XP type
    if (!isValidXpType(xpType) && !this.isCustomXpType(xpType)) {
      console.warn(`[XpManager] Unknown XP type: ${xpType}`);
    }

    // Apply multiplier
    let adjustedAmount = Math.floor(amount * multiplier);

    // Get current XP and cap
    const currentXp = this.getXp(player, xpType);
    const cap = this.getXpCap(player, xpType);

    // Calculate how much can be awarded
    let awarded = adjustedAmount;
    let capped = 0;

    if (!ignoreCap && currentXp + adjustedAmount > cap) {
      awarded = Math.max(0, cap - currentXp);
      capped = adjustedAmount - awarded;
    }

    // Don't award if nothing to give
    if (awarded <= 0) {
      // Emit cap reached event
      if (capped > 0) {
        const capEvent: XpCapReachedEvent = {
          playerId: player.objectId,
          xpType,
          cap,
          wastedAmount: capped,
          timestamp: Date.now(),
        };
        this.eventEmitter.emitXpCapReached(capEvent);
      }

      return {
        awarded: 0,
        capped: adjustedAmount,
        newTotal: currentXp,
        skillsAvailable: [],
        capReached: true,
        currentCap: cap,
      };
    }

    // Award the XP
    const newTotal = player.addExperience(xpType, awarded);

    // Check for newly affordable skills
    let skillsAvailable: string[] = [];
    if (checkSkills) {
      skillsAvailable = this.checkNewAffordableSkills(player);

      // Emit skill affordable events
      for (const skillName of skillsAvailable) {
        const skill = this.skillRegistry.get(skillName);
        if (skill) {
          const event: SkillAffordableEvent = {
            playerId: player.objectId,
            skillName,
            xpRequirements: skill.xpCost,
            timestamp: Date.now(),
          };
          this.eventEmitter.emitSkillAffordable(event);
        }
      }
    }

    // Emit XP awarded event
    const awardEvent: XpAwardedEvent = {
      playerId: player.objectId,
      xpType,
      amount: awarded,
      cappedAmount: capped,
      newTotal,
      source,
      timestamp: Date.now(),
    };
    this.eventEmitter.emitXpAwarded(awardEvent);

    // Check if cap was reached
    const capReached = newTotal >= cap;
    if (capReached && capped > 0) {
      const capEvent: XpCapReachedEvent = {
        playerId: player.objectId,
        xpType,
        cap,
        wastedAmount: capped,
        timestamp: Date.now(),
      };
      this.eventEmitter.emitXpCapReached(capEvent);
    }

    return {
      awarded,
      capped,
      newTotal,
      skillsAvailable,
      capReached,
      currentCap: cap,
    };
  }

  /**
   * Get current XP for a type
   */
  getXp(player: PlayerObject, xpType: XpTypeValue | string): number {
    return player.getExperience(xpType);
  }

  /**
   * Get the XP cap for a player and XP type
   * Cap = default cap + sum of cap increases from skills + modifiers
   */
  getXpCap(player: PlayerObject, xpType: XpTypeValue | string): number {
    // Start with default cap
    let cap = DefaultXpCaps[xpType as XpTypeValue] ?? 0;

    // Add cap increases from learned skills
    for (const skillName of player.skills) {
      const skill = this.skillRegistry.get(skillName);
      if (skill) {
        const capIncrease = skill.xpCapIncrease.get(xpType);
        if (capIncrease) {
          cap += capIncrease;
        }
      }
    }

    // Add player-specific modifiers (buffs, items, etc.)
    const playerMods = this.playerCapModifiers.get(player.objectId);
    if (playerMods) {
      const mod = playerMods.get(xpType);
      if (mod) {
        cap += mod;
      }
    }

    return cap;
  }

  /**
   * Get all XP caps for a player
   */
  getAllXpCaps(player: PlayerObject): Map<string, number> {
    const caps = new Map<string, number>();

    // Get caps for all standard XP types
    for (const xpType of Object.values(XpType)) {
      caps.set(xpType, this.getXpCap(player, xpType));
    }

    return caps;
  }

  /**
   * Check if a player can afford a skill
   */
  canAffordSkill(player: PlayerObject, skill: SkillTemplate): boolean {
    // Check XP requirements
    for (const [xpType, cost] of skill.xpCost) {
      const current = this.getXp(player, xpType);
      if (current < cost) {
        return false;
      }
    }

    // Check credit requirements
    if (skill.creditCost > 0 && player.getTotalCredits() < skill.creditCost) {
      return false;
    }

    // Check parent skill requirement
    if (skill.parentSkill && !player.hasSkill(skill.parentSkill)) {
      return false;
    }

    // Check species restrictions
    if (skill.speciesRestrictions.length > 0) {
      // Would need to check player species here
      // For now, assume no restrictions
    }

    return true;
  }

  /**
   * Spend XP to learn a skill
   * @returns true if successful, false if requirements not met
   */
  spendXp(player: PlayerObject, skill: SkillTemplate): boolean {
    // Check if player can afford the skill
    if (!this.canAffordSkill(player, skill)) {
      return false;
    }

    // Check if player already has the skill
    if (player.hasSkill(skill.name)) {
      return false;
    }

    // Store old caps for event emission
    const oldCaps = new Map<string, number>();
    for (const [xpType, _] of skill.xpCapIncrease) {
      oldCaps.set(xpType, this.getXpCap(player, xpType));
    }

    // Deduct XP costs
    for (const [xpType, cost] of skill.xpCost) {
      const current = player.getExperience(xpType);
      player.setExperience(xpType, current - cost);
    }

    // Deduct credit cost
    if (skill.creditCost > 0) {
      player.removeCashCredits(skill.creditCost);
    }

    // Add the skill
    player.addSkill(skill.name);

    // Apply skill mods
    for (const [modName, value] of skill.skillMods) {
      const current = player.getSkillMod(modName);
      player.setSkillMod(modName, current + value);
    }

    // Award schematics
    for (const schematicCrc of skill.schematics) {
      player.awardSchematic(schematicCrc);
    }

    // Emit XP spent event
    const spentEvent: XpSpentEvent = {
      playerId: player.objectId,
      skillName: skill.name,
      xpSpent: skill.xpCost,
      timestamp: Date.now(),
    };
    this.eventEmitter.emitXpSpent(spentEvent);

    // Emit cap changed events
    for (const [xpType, increase] of skill.xpCapIncrease) {
      const oldCap = oldCaps.get(xpType) ?? 0;
      const newCap = this.getXpCap(player, xpType);
      if (newCap !== oldCap) {
        const capEvent: XpCapChangedEvent = {
          playerId: player.objectId,
          xpType,
          oldCap,
          newCap,
          reason: 'skill_learned',
          timestamp: Date.now(),
        };
        this.eventEmitter.emitXpCapChanged(capEvent);
      }
    }

    return true;
  }

  /**
   * Surrender (drop) a skill
   * Does NOT refund XP in SWG
   */
  surrenderSkill(player: PlayerObject, skill: SkillTemplate): boolean {
    // Check if player has the skill
    if (!player.hasSkill(skill.name)) {
      return false;
    }

    // Check if any child skills are still learned
    const childSkills = this.skillRegistry.getChildSkills(skill.name);
    for (const child of childSkills) {
      if (player.hasSkill(child.name)) {
        // Cannot surrender while child skills are learned
        return false;
      }
    }

    // Store old caps for event emission
    const oldCaps = new Map<string, number>();
    for (const [xpType, _] of skill.xpCapIncrease) {
      oldCaps.set(xpType, this.getXpCap(player, xpType));
    }

    // Remove the skill
    player.removeSkill(skill.name);

    // Remove skill mods
    for (const [modName, value] of skill.skillMods) {
      const current = player.getSkillMod(modName);
      player.setSkillMod(modName, current - value);
    }

    // Remove schematics (only if no other skill grants them)
    for (const schematicCrc of skill.schematics) {
      let stillHasSchematic = false;
      for (const otherSkillName of player.skills) {
        const otherSkill = this.skillRegistry.get(otherSkillName);
        if (otherSkill && otherSkill.schematics.includes(schematicCrc)) {
          stillHasSchematic = true;
          break;
        }
      }
      if (!stillHasSchematic) {
        player.removeSchematic(schematicCrc);
      }
    }

    // Emit cap changed events
    for (const [xpType, _] of skill.xpCapIncrease) {
      const oldCap = oldCaps.get(xpType) ?? 0;
      const newCap = this.getXpCap(player, xpType);
      if (newCap !== oldCap) {
        const capEvent: XpCapChangedEvent = {
          playerId: player.objectId,
          xpType,
          oldCap,
          newCap,
          reason: 'skill_dropped',
          timestamp: Date.now(),
        };
        this.eventEmitter.emitXpCapChanged(capEvent);
      }
    }

    return true;
  }

  /**
   * Get all skills that a player can now afford
   * (but doesn't already have)
   */
  getAffordableSkills(player: PlayerObject): SkillTemplate[] {
    const affordable: SkillTemplate[] = [];

    for (const skillName of this.skillRegistry.getAllSkillNames()) {
      const skill = this.skillRegistry.get(skillName);
      if (skill && !player.hasSkill(skillName) && this.canAffordSkill(player, skill)) {
        affordable.push(skill);
      }
    }

    return affordable;
  }

  /**
   * Check for newly affordable skills and return their names
   * This caches the previous affordable skills and compares
   */
  private checkNewAffordableSkills(player: PlayerObject): string[] {
    const affordable = this.getAffordableSkills(player);
    // For now, just return all affordable skills
    // A more sophisticated implementation would cache and compare
    return affordable.map((s) => s.name);
  }

  /**
   * Add a temporary XP cap modifier for a player
   * (e.g., from buffs or special items)
   */
  addCapModifier(
    player: PlayerObject,
    xpType: XpTypeValue | string,
    amount: number
  ): void {
    if (!this.playerCapModifiers.has(player.objectId)) {
      this.playerCapModifiers.set(player.objectId, new Map());
    }
    const mods = this.playerCapModifiers.get(player.objectId)!;
    const current = mods.get(xpType) ?? 0;
    mods.set(xpType, current + amount);

    // Emit cap changed event
    const event: XpCapChangedEvent = {
      playerId: player.objectId,
      xpType,
      oldCap: this.getXpCap(player, xpType) - amount,
      newCap: this.getXpCap(player, xpType),
      reason: 'modifier_added',
      timestamp: Date.now(),
    };
    this.eventEmitter.emitXpCapChanged(event);
  }

  /**
   * Remove a temporary XP cap modifier
   */
  removeCapModifier(
    player: PlayerObject,
    xpType: XpTypeValue | string,
    amount: number
  ): void {
    const mods = this.playerCapModifiers.get(player.objectId);
    if (!mods) return;

    const current = mods.get(xpType) ?? 0;
    const newValue = current - amount;

    if (newValue <= 0) {
      mods.delete(xpType);
    } else {
      mods.set(xpType, newValue);
    }

    // Emit cap changed event
    const event: XpCapChangedEvent = {
      playerId: player.objectId,
      xpType,
      oldCap: this.getXpCap(player, xpType) + amount,
      newCap: this.getXpCap(player, xpType),
      reason: 'modifier_removed',
      timestamp: Date.now(),
    };
    this.eventEmitter.emitXpCapChanged(event);
  }

  /**
   * Clear all cap modifiers for a player
   */
  clearCapModifiers(player: PlayerObject): void {
    this.playerCapModifiers.delete(player.objectId);
  }

  /**
   * Check if a string is a custom (non-standard) XP type
   */
  private isCustomXpType(type: string): boolean {
    // Allow custom XP types that follow the naming convention
    return /^[a-z][a-z0-9_]*$/.test(type);
  }

  /**
   * Get XP progress towards a specific skill
   */
  getSkillProgress(
    player: PlayerObject,
    skill: SkillTemplate
  ): Map<string, { current: number; required: number; percentage: number }> {
    const progress = new Map<
      string,
      { current: number; required: number; percentage: number }
    >();

    for (const [xpType, required] of skill.xpCost) {
      const current = this.getXp(player, xpType);
      const percentage = Math.min(100, Math.floor((current / required) * 100));
      progress.set(xpType, { current, required, percentage });
    }

    return progress;
  }
}

/**
 * Global XP manager singleton
 */
let globalXpManager: XpManager | null = null;

/**
 * Get the global XP manager
 */
export function getXpManager(): XpManager {
  if (!globalXpManager) {
    globalXpManager = new XpManager();
  }
  return globalXpManager;
}

/**
 * Create a new XP manager (for testing or isolated systems)
 */
export function createXpManager(
  eventEmitter?: XpEventEmitter,
  skillRegistry?: SkillRegistry
): XpManager {
  return new XpManager(eventEmitter, skillRegistry);
}
