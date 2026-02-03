/**
 * Cooldown Manager
 * Tracks cooldowns per command per player
 */

import type { ObjectId } from '@swg/shared-types';

/**
 * Cooldown entry
 */
interface CooldownEntry {
  /** Command CRC */
  commandCrc: number;
  /** When the cooldown expires (Date.now() timestamp) */
  expiresAt: number;
  /** Original cooldown duration in ms */
  duration: number;
}

/**
 * Player cooldown state
 */
interface PlayerCooldowns {
  /** Per-command cooldowns */
  commands: Map<number, CooldownEntry>;
  /** Global cooldown expiration time */
  gcdExpiresAt: number;
  /** Base global cooldown duration */
  baseGcd: number;
  /** Cooldown reduction modifier (0-1, where 0.1 = 10% reduction) */
  cooldownReduction: number;
}

/**
 * Cooldown group - commands that share a cooldown
 */
interface CooldownGroup {
  /** Group name */
  name: string;
  /** Command CRCs in this group */
  commands: Set<number>;
  /** Shared cooldown duration in ms */
  sharedCooldown: number;
}

/**
 * Cooldown Manager
 * Handles all cooldown tracking for combat abilities
 */
export class CooldownManager {
  /** Player cooldown states */
  private playerCooldowns: Map<bigint, PlayerCooldowns> = new Map();

  /** Cooldown groups (commands that share cooldowns) */
  private cooldownGroups: Map<string, CooldownGroup> = new Map();

  /** Command to group mapping */
  private commandToGroup: Map<number, string> = new Map();

  /** Default global cooldown duration in ms */
  private readonly defaultGcd: number;

  /** Maximum cooldown reduction allowed (0-1) */
  private readonly maxCooldownReduction: number;

  constructor(options: {
    defaultGcd?: number;
    maxCooldownReduction?: number;
  } = {}) {
    this.defaultGcd = options.defaultGcd ?? 1000; // 1 second default GCD
    this.maxCooldownReduction = options.maxCooldownReduction ?? 0.5; // Max 50% reduction
  }

  /**
   * Initialize cooldowns for a player
   */
  public initializePlayer(playerId: ObjectId): void {
    if (!this.playerCooldowns.has(playerId)) {
      this.playerCooldowns.set(playerId, {
        commands: new Map(),
        gcdExpiresAt: 0,
        baseGcd: this.defaultGcd,
        cooldownReduction: 0,
      });
    }
  }

  /**
   * Remove a player's cooldown data
   */
  public removePlayer(playerId: ObjectId): void {
    this.playerCooldowns.delete(playerId);
  }

  /**
   * Start a cooldown for a command
   */
  public startCooldown(
    playerId: ObjectId,
    commandCrc: number,
    duration: number
  ): void {
    const state = this.getOrCreatePlayerState(playerId);
    const now = Date.now();

    // Apply cooldown reduction
    const effectiveDuration = this.applyReduction(duration, state.cooldownReduction);

    // Set command cooldown
    state.commands.set(commandCrc, {
      commandCrc,
      expiresAt: now + effectiveDuration,
      duration: effectiveDuration,
    });

    // Check for shared cooldown group
    const groupName = this.commandToGroup.get(commandCrc);
    if (groupName) {
      const group = this.cooldownGroups.get(groupName);
      if (group) {
        const groupDuration = this.applyReduction(
          group.sharedCooldown,
          state.cooldownReduction
        );
        const groupExpiresAt = now + groupDuration;

        // Apply shared cooldown to all commands in group
        for (const groupCommandCrc of group.commands) {
          const existing = state.commands.get(groupCommandCrc);
          // Only update if new cooldown is longer
          if (!existing || existing.expiresAt < groupExpiresAt) {
            state.commands.set(groupCommandCrc, {
              commandCrc: groupCommandCrc,
              expiresAt: groupExpiresAt,
              duration: groupDuration,
            });
          }
        }
      }
    }
  }

  /**
   * Start the global cooldown
   */
  public startGlobalCooldown(playerId: ObjectId, duration?: number): void {
    const state = this.getOrCreatePlayerState(playerId);
    const now = Date.now();

    const baseDuration = duration ?? state.baseGcd;
    const effectiveDuration = this.applyReduction(baseDuration, state.cooldownReduction);

    state.gcdExpiresAt = now + effectiveDuration;
  }

  /**
   * Get remaining cooldown for a command
   * @returns Remaining time in ms, or 0 if not on cooldown
   */
  public getCooldownRemaining(playerId: ObjectId, commandCrc: number): number {
    const state = this.playerCooldowns.get(playerId);
    if (!state) return 0;

    const entry = state.commands.get(commandCrc);
    if (!entry) return 0;

    const remaining = entry.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get remaining global cooldown
   * @returns Remaining time in ms, or 0 if not on GCD
   */
  public getGcdRemaining(playerId: ObjectId): number {
    const state = this.playerCooldowns.get(playerId);
    if (!state) return 0;

    const remaining = state.gcdExpiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if a command is on cooldown
   */
  public isOnCooldown(playerId: ObjectId, commandCrc: number): boolean {
    return this.getCooldownRemaining(playerId, commandCrc) > 0;
  }

  /**
   * Check if global cooldown is active
   */
  public isGcdActive(playerId: ObjectId): boolean {
    return this.getGcdRemaining(playerId) > 0;
  }

  /**
   * Clear a specific cooldown
   */
  public clearCooldown(playerId: ObjectId, commandCrc: number): void {
    const state = this.playerCooldowns.get(playerId);
    if (state) {
      state.commands.delete(commandCrc);
    }
  }

  /**
   * Clear the global cooldown
   */
  public clearGcd(playerId: ObjectId): void {
    const state = this.playerCooldowns.get(playerId);
    if (state) {
      state.gcdExpiresAt = 0;
    }
  }

  /**
   * Clear all cooldowns for a player
   */
  public clearAllCooldowns(playerId: ObjectId): void {
    const state = this.playerCooldowns.get(playerId);
    if (state) {
      state.commands.clear();
      state.gcdExpiresAt = 0;
    }
  }

  /**
   * Set cooldown reduction modifier for a player
   */
  public setCooldownReduction(playerId: ObjectId, reduction: number): void {
    const state = this.getOrCreatePlayerState(playerId);
    state.cooldownReduction = Math.min(reduction, this.maxCooldownReduction);
  }

  /**
   * Get cooldown reduction modifier for a player
   */
  public getCooldownReduction(playerId: ObjectId): number {
    const state = this.playerCooldowns.get(playerId);
    return state?.cooldownReduction ?? 0;
  }

  /**
   * Set base GCD for a player
   */
  public setBaseGcd(playerId: ObjectId, gcd: number): void {
    const state = this.getOrCreatePlayerState(playerId);
    state.baseGcd = gcd;
  }

  /**
   * Register a cooldown group
   */
  public registerCooldownGroup(
    name: string,
    commandCrcs: number[],
    sharedCooldown: number
  ): void {
    const group: CooldownGroup = {
      name,
      commands: new Set(commandCrcs),
      sharedCooldown,
    };

    this.cooldownGroups.set(name, group);

    // Map commands to group
    for (const crc of commandCrcs) {
      this.commandToGroup.set(crc, name);
    }
  }

  /**
   * Get all active cooldowns for a player
   */
  public getActiveCooldowns(playerId: ObjectId): Array<{
    commandCrc: number;
    remaining: number;
    duration: number;
  }> {
    const state = this.playerCooldowns.get(playerId);
    if (!state) return [];

    const now = Date.now();
    const active: Array<{
      commandCrc: number;
      remaining: number;
      duration: number;
    }> = [];

    for (const [, entry] of state.commands) {
      const remaining = entry.expiresAt - now;
      if (remaining > 0) {
        active.push({
          commandCrc: entry.commandCrc,
          remaining,
          duration: entry.duration,
        });
      }
    }

    return active;
  }

  /**
   * Reduce an active cooldown by a duration
   */
  public reduceCooldown(
    playerId: ObjectId,
    commandCrc: number,
    reduction: number
  ): void {
    const state = this.playerCooldowns.get(playerId);
    if (!state) return;

    const entry = state.commands.get(commandCrc);
    if (entry) {
      entry.expiresAt -= reduction;
      // If cooldown is now finished, remove it
      if (entry.expiresAt <= Date.now()) {
        state.commands.delete(commandCrc);
      }
    }
  }

  /**
   * Clean up expired cooldowns (memory optimization)
   */
  public cleanupExpired(): void {
    const now = Date.now();

    for (const [, state] of this.playerCooldowns) {
      for (const [crc, entry] of state.commands) {
        if (entry.expiresAt <= now) {
          state.commands.delete(crc);
        }
      }
    }
  }

  /**
   * Apply cooldown reduction to a duration
   */
  private applyReduction(duration: number, reduction: number): number {
    return Math.floor(duration * (1 - reduction));
  }

  /**
   * Get or create player cooldown state
   */
  private getOrCreatePlayerState(playerId: ObjectId): PlayerCooldowns {
    let state = this.playerCooldowns.get(playerId);
    if (!state) {
      state = {
        commands: new Map(),
        gcdExpiresAt: 0,
        baseGcd: this.defaultGcd,
        cooldownReduction: 0,
      };
      this.playerCooldowns.set(playerId, state);
    }
    return state;
  }

  /**
   * Get player count for monitoring
   */
  public get playerCount(): number {
    return this.playerCooldowns.size;
  }

  /**
   * Get total cooldown entry count for monitoring
   */
  public get totalCooldownCount(): number {
    let count = 0;
    for (const [, state] of this.playerCooldowns) {
      count += state.commands.size;
    }
    return count;
  }
}

/**
 * Create a cooldown manager instance
 */
export function createCooldownManager(options?: {
  defaultGcd?: number;
  maxCooldownReduction?: number;
}): CooldownManager {
  return new CooldownManager(options);
}
