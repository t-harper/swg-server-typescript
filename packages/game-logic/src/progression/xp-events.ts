/**
 * XP Events - Event types and emitter for XP-related events
 *
 * Provides a type-safe event system for XP changes,
 * skill availability notifications, and level ups.
 */

import type { ObjectId } from '@swg/shared-types';
import type { XpTypeValue } from './xp-types.js';

/**
 * Event emitted when XP is awarded to a player
 */
export interface XpAwardedEvent {
  /** The player's object ID */
  playerId: ObjectId;
  /** The type of XP awarded */
  xpType: XpTypeValue | string;
  /** Amount of XP awarded (after cap) */
  amount: number;
  /** Amount of XP lost to cap (if any) */
  cappedAmount: number;
  /** New total XP for this type */
  newTotal: number;
  /** Source of the XP (e.g., 'combat_kill', 'crafting_item', 'mission_complete') */
  source: string;
  /** Timestamp of the award */
  timestamp: number;
}

/**
 * Event emitted when a skill becomes affordable
 */
export interface SkillAffordableEvent {
  /** The player's object ID */
  playerId: ObjectId;
  /** Name of the skill that is now affordable */
  skillName: string;
  /** XP requirements that were met */
  xpRequirements: Map<string, number>;
  /** Timestamp when skill became affordable */
  timestamp: number;
}

/**
 * Event emitted when XP is spent on a skill
 */
export interface XpSpentEvent {
  /** The player's object ID */
  playerId: ObjectId;
  /** Name of the skill learned */
  skillName: string;
  /** XP amounts spent by type */
  xpSpent: Map<string, number>;
  /** Timestamp of the purchase */
  timestamp: number;
}

/**
 * Event emitted when an XP cap changes
 */
export interface XpCapChangedEvent {
  /** The player's object ID */
  playerId: ObjectId;
  /** The type of XP affected */
  xpType: XpTypeValue | string;
  /** Previous cap value */
  oldCap: number;
  /** New cap value */
  newCap: number;
  /** Reason for the change (e.g., 'skill_learned', 'skill_dropped') */
  reason: string;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Event emitted when XP cap is reached
 */
export interface XpCapReachedEvent {
  /** The player's object ID */
  playerId: ObjectId;
  /** The type of XP that hit the cap */
  xpType: XpTypeValue | string;
  /** Current cap value */
  cap: number;
  /** Amount of XP lost to cap in this award */
  wastedAmount: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Event emitted when group XP is distributed
 */
export interface GroupXpDistributedEvent {
  /** The group ID */
  groupId: ObjectId;
  /** Original XP amount before distribution */
  originalAmount: number;
  /** XP type being distributed */
  xpType: XpTypeValue | string;
  /** Source of the XP */
  source: string;
  /** Distribution details per member */
  memberShares: Array<{
    playerId: ObjectId;
    amount: number;
    modifier: number;
  }>;
  /** Whether group bonus was applied */
  groupBonusApplied: boolean;
  /** Group bonus percentage (if applied) */
  groupBonusPercent: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * All XP event types
 */
export type XpEvent =
  | XpAwardedEvent
  | SkillAffordableEvent
  | XpSpentEvent
  | XpCapChangedEvent
  | XpCapReachedEvent
  | GroupXpDistributedEvent;

/**
 * Event type discriminators
 */
export const XpEventType = {
  XP_AWARDED: 'xp_awarded',
  SKILL_AFFORDABLE: 'skill_affordable',
  XP_SPENT: 'xp_spent',
  XP_CAP_CHANGED: 'xp_cap_changed',
  XP_CAP_REACHED: 'xp_cap_reached',
  GROUP_XP_DISTRIBUTED: 'group_xp_distributed',
} as const;

export type XpEventTypeValue = (typeof XpEventType)[keyof typeof XpEventType];

/**
 * Event handler type
 */
export type XpEventHandler<T extends XpEvent = XpEvent> = (event: T) => void;

/**
 * XP Event Emitter class
 * Provides typed event emission and subscription for XP-related events
 */
export class XpEventEmitter {
  private handlers: Map<XpEventTypeValue, Set<XpEventHandler<any>>> = new Map();

  /**
   * Subscribe to XP awarded events
   */
  onXpAwarded(handler: XpEventHandler<XpAwardedEvent>): () => void {
    return this.on(XpEventType.XP_AWARDED, handler);
  }

  /**
   * Subscribe to skill affordable events
   */
  onSkillAffordable(handler: XpEventHandler<SkillAffordableEvent>): () => void {
    return this.on(XpEventType.SKILL_AFFORDABLE, handler);
  }

  /**
   * Subscribe to XP spent events
   */
  onXpSpent(handler: XpEventHandler<XpSpentEvent>): () => void {
    return this.on(XpEventType.XP_SPENT, handler);
  }

  /**
   * Subscribe to XP cap changed events
   */
  onXpCapChanged(handler: XpEventHandler<XpCapChangedEvent>): () => void {
    return this.on(XpEventType.XP_CAP_CHANGED, handler);
  }

  /**
   * Subscribe to XP cap reached events
   */
  onXpCapReached(handler: XpEventHandler<XpCapReachedEvent>): () => void {
    return this.on(XpEventType.XP_CAP_REACHED, handler);
  }

  /**
   * Subscribe to group XP distributed events
   */
  onGroupXpDistributed(handler: XpEventHandler<GroupXpDistributedEvent>): () => void {
    return this.on(XpEventType.GROUP_XP_DISTRIBUTED, handler);
  }

  /**
   * Emit an XP awarded event
   */
  emitXpAwarded(event: XpAwardedEvent): void {
    this.emit(XpEventType.XP_AWARDED, event);
  }

  /**
   * Emit a skill affordable event
   */
  emitSkillAffordable(event: SkillAffordableEvent): void {
    this.emit(XpEventType.SKILL_AFFORDABLE, event);
  }

  /**
   * Emit an XP spent event
   */
  emitXpSpent(event: XpSpentEvent): void {
    this.emit(XpEventType.XP_SPENT, event);
  }

  /**
   * Emit an XP cap changed event
   */
  emitXpCapChanged(event: XpCapChangedEvent): void {
    this.emit(XpEventType.XP_CAP_CHANGED, event);
  }

  /**
   * Emit an XP cap reached event
   */
  emitXpCapReached(event: XpCapReachedEvent): void {
    this.emit(XpEventType.XP_CAP_REACHED, event);
  }

  /**
   * Emit a group XP distributed event
   */
  emitGroupXpDistributed(event: GroupXpDistributedEvent): void {
    this.emit(XpEventType.GROUP_XP_DISTRIBUTED, event);
  }

  /**
   * Generic event subscription
   */
  private on<T extends XpEvent>(
    eventType: XpEventTypeValue,
    handler: XpEventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Generic event emission
   */
  private emit<T extends XpEvent>(eventType: XpEventTypeValue, event: T): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in XP event handler for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllHandlers(eventType?: XpEventTypeValue): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the number of handlers for an event type
   */
  handlerCount(eventType: XpEventTypeValue): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }
}

/**
 * Global XP event emitter singleton
 */
let globalXpEventEmitter: XpEventEmitter | null = null;

/**
 * Get the global XP event emitter
 */
export function getXpEventEmitter(): XpEventEmitter {
  if (!globalXpEventEmitter) {
    globalXpEventEmitter = new XpEventEmitter();
  }
  return globalXpEventEmitter;
}

/**
 * Create a new XP event emitter (for testing or isolated systems)
 */
export function createXpEventEmitter(): XpEventEmitter {
  return new XpEventEmitter();
}
