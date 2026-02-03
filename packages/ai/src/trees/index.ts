/**
 * Pre-built Behavior Trees
 * Ready-to-use behavior trees for common AI patterns.
 */

// Passive creature (prey/wildlife)
export {
  createPassiveCreatureTree,
  createPassiveCreatureTreeWithBuilder,
  type PassiveCreatureOptions,
} from './passive-creature.js';

// Aggressive creature (predator/hostile)
export {
  createAggressiveCreatureTree,
  createStalkerCreatureTree,
  type AggressiveCreatureOptions,
} from './aggressive-creature.js';

// Pack creature (social/coordinated)
export {
  createPackCreatureTree,
  createPackAlphaTree,
  type PackCreatureOptions,
} from './pack-creature.js';

// Guard NPC (patrol/defend)
export {
  createGuardTree,
  createStationaryGuardTree,
  createEliteGuardTree,
  type GuardOptions,
} from './guard.js';
