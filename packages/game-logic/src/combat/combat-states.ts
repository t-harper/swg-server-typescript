/**
 * Combat States
 * Defines various combat states that can be applied to creatures
 */

/**
 * Combat states that can be applied to creatures
 * These affect the target's ability to perform actions
 */
export enum CombatState {
  /** No special state */
  None = 0,
  /** Cannot perform any actions */
  Stunned = 1,
  /** On the ground, must stand up */
  KnockedDown = 2,
  /** Reduced accuracy */
  Blinded = 3,
  /** Reduced defense, chance to fail actions */
  Dizzy = 4,
  /** Reduced damage output */
  Intimidated = 5,
  /** Cannot move but can attack */
  Rooted = 6,
  /** Reduced movement speed */
  Snared = 7,
  /** Damage over time (health) */
  Poisoned = 8,
  /** Damage over time (health) + reduced healing */
  Diseased = 9,
  /** Damage over time (action) */
  Bleeding = 10,
  /** Cannot use action-based abilities */
  Winded = 11,
  /** Increased damage taken */
  Vulnerable = 12,
  /** Cannot attack but can move */
  Pacified = 13,
}

/**
 * State effect configuration
 */
export interface CombatStateEffect {
  /** The state type */
  state: CombatState;
  /** Duration in milliseconds */
  duration: number;
  /** Potency/strength of the effect (0-100) */
  potency: number;
  /** Time when the effect was applied */
  appliedAt: number;
  /** Source of the effect (for stacking rules) */
  sourceId: bigint;
}

/**
 * State immunity after recovering
 */
export interface StateImmunity {
  /** The state type */
  state: CombatState;
  /** Time until immunity expires */
  expiresAt: number;
}

/**
 * Combat state modifiers - how each state affects gameplay
 */
export const CombatStateModifiers: Record<CombatState, {
  accuracyModifier: number;
  defenseModifier: number;
  damageModifier: number;
  speedModifier: number;
  canMove: boolean;
  canAttack: boolean;
  canUseAbilities: boolean;
}> = {
  [CombatState.None]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: 0,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Stunned]: {
    accuracyModifier: 0,
    defenseModifier: -50,
    damageModifier: 0,
    speedModifier: -100,
    canMove: false,
    canAttack: false,
    canUseAbilities: false,
  },
  [CombatState.KnockedDown]: {
    accuracyModifier: -100,
    defenseModifier: -75,
    damageModifier: 0,
    speedModifier: -100,
    canMove: false,
    canAttack: false,
    canUseAbilities: false,
  },
  [CombatState.Blinded]: {
    accuracyModifier: -50,
    defenseModifier: -25,
    damageModifier: 0,
    speedModifier: -25,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Dizzy]: {
    accuracyModifier: -25,
    defenseModifier: -25,
    damageModifier: 0,
    speedModifier: -10,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Intimidated]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: -25,
    speedModifier: 0,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Rooted]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: -100,
    canMove: false,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Snared]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: -50,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Poisoned]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: 0,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Diseased]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: -10,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Bleeding]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: 0,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Winded]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: 0,
    speedModifier: -25,
    canMove: true,
    canAttack: true,
    canUseAbilities: false,
  },
  [CombatState.Vulnerable]: {
    accuracyModifier: 0,
    defenseModifier: -50,
    damageModifier: 0,
    speedModifier: 0,
    canMove: true,
    canAttack: true,
    canUseAbilities: true,
  },
  [CombatState.Pacified]: {
    accuracyModifier: 0,
    defenseModifier: 0,
    damageModifier: -100,
    speedModifier: 0,
    canMove: true,
    canAttack: false,
    canUseAbilities: false,
  },
};

/**
 * Default immunity duration after a state expires (in ms)
 */
export const StateImmunityDurations: Partial<Record<CombatState, number>> = {
  [CombatState.Stunned]: 10000, // 10 seconds
  [CombatState.KnockedDown]: 15000, // 15 seconds
  [CombatState.Blinded]: 8000, // 8 seconds
  [CombatState.Dizzy]: 5000, // 5 seconds
  [CombatState.Rooted]: 8000, // 8 seconds
};

/**
 * Check if a creature can perform an action given their current states
 */
export function canPerformAction(
  activeStates: CombatState[],
  actionType: 'move' | 'attack' | 'ability'
): boolean {
  for (const state of activeStates) {
    const modifiers = CombatStateModifiers[state];
    if (!modifiers) continue;

    switch (actionType) {
      case 'move':
        if (!modifiers.canMove) return false;
        break;
      case 'attack':
        if (!modifiers.canAttack) return false;
        break;
      case 'ability':
        if (!modifiers.canUseAbilities) return false;
        break;
    }
  }
  return true;
}

/**
 * Calculate combined modifiers from all active states
 */
export function calculateCombinedModifiers(activeStates: CombatState[]): {
  accuracyModifier: number;
  defenseModifier: number;
  damageModifier: number;
  speedModifier: number;
} {
  let accuracy = 0;
  let defense = 0;
  let damage = 0;
  let speed = 0;

  for (const state of activeStates) {
    const modifiers = CombatStateModifiers[state];
    if (!modifiers) continue;

    accuracy += modifiers.accuracyModifier;
    defense += modifiers.defenseModifier;
    damage += modifiers.damageModifier;
    speed += modifiers.speedModifier;
  }

  // Cap modifiers at reasonable limits
  return {
    accuracyModifier: Math.max(-100, Math.min(100, accuracy)),
    defenseModifier: Math.max(-100, Math.min(100, defense)),
    damageModifier: Math.max(-100, Math.min(100, damage)),
    speedModifier: Math.max(-100, Math.min(100, speed)),
  };
}

/**
 * Get the display name for a combat state
 */
export function getCombatStateName(state: CombatState): string {
  return CombatState[state] ?? 'Unknown';
}
