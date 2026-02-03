/**
 * PvP Status Enum and Helper Functions
 * Defines the PvP states for tangible objects in the game
 */

/**
 * PvP status flags for tangible objects
 * These determine how the object interacts with PvP combat
 */
export enum PvpStatus {
  /** No PvP status - neutral/non-combatant */
  None = 0,
  /** Can be attacked by players */
  Attackable = 1 << 0,
  /** Will attack players on sight */
  Aggressive = 1 << 1,
  /** Marked as an enemy */
  Enemy = 1 << 2,
  /** Is a player (has special PvP rules) */
  Player = 1 << 3,
  /** Is overt (declared for faction) */
  Overt = 1 << 4,
  /** Is on leave from faction */
  OnLeave = 1 << 5,
  /** Can be attacked (TEF flag) */
  CanAttack = 1 << 6,
  /** Was attacked recently (TEF flag) */
  WasAttacked = 1 << 7,
  /** In a duel */
  Duel = 1 << 8,
}

/**
 * Check if a PvP status has a specific flag set
 */
export function hasPvpFlag(status: number, flag: PvpStatus): boolean {
  return (status & flag) !== 0;
}

/**
 * Set a PvP flag on a status
 */
export function setPvpFlag(status: number, flag: PvpStatus): number {
  return status | flag;
}

/**
 * Clear a PvP flag from a status
 */
export function clearPvpFlag(status: number, flag: PvpStatus): number {
  return status & ~flag;
}

/**
 * Toggle a PvP flag on a status
 */
export function togglePvpFlag(status: number, flag: PvpStatus): number {
  return status ^ flag;
}

/**
 * Check if an object can be attacked based on PvP status
 */
export function canBeAttacked(status: number): boolean {
  return hasPvpFlag(status, PvpStatus.Attackable) || hasPvpFlag(status, PvpStatus.CanAttack);
}

/**
 * Check if an object is hostile (aggressive or enemy)
 */
export function isHostile(status: number): boolean {
  return hasPvpFlag(status, PvpStatus.Aggressive) || hasPvpFlag(status, PvpStatus.Enemy);
}

/**
 * Check if an object is a player
 */
export function isPlayer(status: number): boolean {
  return hasPvpFlag(status, PvpStatus.Player);
}

/**
 * Check if an object is overt (declared for faction warfare)
 */
export function isOvert(status: number): boolean {
  return hasPvpFlag(status, PvpStatus.Overt);
}

/**
 * Get a human-readable description of PvP status
 */
export function getPvpStatusDescription(status: number): string[] {
  const flags: string[] = [];

  if (status === PvpStatus.None) {
    return ['None'];
  }

  if (hasPvpFlag(status, PvpStatus.Attackable)) flags.push('Attackable');
  if (hasPvpFlag(status, PvpStatus.Aggressive)) flags.push('Aggressive');
  if (hasPvpFlag(status, PvpStatus.Enemy)) flags.push('Enemy');
  if (hasPvpFlag(status, PvpStatus.Player)) flags.push('Player');
  if (hasPvpFlag(status, PvpStatus.Overt)) flags.push('Overt');
  if (hasPvpFlag(status, PvpStatus.OnLeave)) flags.push('OnLeave');
  if (hasPvpFlag(status, PvpStatus.CanAttack)) flags.push('CanAttack');
  if (hasPvpFlag(status, PvpStatus.WasAttacked)) flags.push('WasAttacked');
  if (hasPvpFlag(status, PvpStatus.Duel)) flags.push('Duel');

  return flags;
}
