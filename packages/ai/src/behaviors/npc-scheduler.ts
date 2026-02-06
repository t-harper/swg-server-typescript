/**
 * NPC Scheduler
 * Daily schedules and time-based behaviors for NPCs including
 * location changes, sleep cycles, shop hours, and events.
 */

import type { Vector3, ObjectId } from '@swg/shared-types';
import type { AIContext } from '../ai-context.js';
import {
  getBlackboardValue,
  setBlackboardValue,
  BlackboardKeys,
} from '../ai-context.js';
import { LeafNode, NodeStatus, BehaviorNode } from '../nodes/base.js';
import { Sequence, Selector, PrioritySelector } from '../nodes/composites.js';
import { BehaviorTree } from '../behavior-tree.js';

/**
 * Blackboard keys for NPC scheduler
 */
export const SchedulerBlackboardKeys = {
  /** Current schedule activity */
  CURRENT_ACTIVITY: 'scheduler_current_activity',
  /** Activity start time */
  ACTIVITY_START_TIME: 'scheduler_activity_start_time',
  /** Target location for activity */
  ACTIVITY_LOCATION: 'scheduler_activity_location',
  /** Whether NPC is asleep */
  IS_SLEEPING: 'scheduler_is_sleeping',
  /** Whether shop is open */
  SHOP_IS_OPEN: 'scheduler_shop_is_open',
  /** Next schedule check time */
  NEXT_SCHEDULE_CHECK: 'scheduler_next_check',
  /** Pending event */
  PENDING_EVENT: 'scheduler_pending_event',
  /** Event trigger time */
  EVENT_TRIGGER_TIME: 'scheduler_event_trigger_time',
  /** Current day phase (morning, afternoon, evening, night) */
  DAY_PHASE: 'scheduler_day_phase',
  /** Override schedule (for events) */
  SCHEDULE_OVERRIDE: 'scheduler_override',
} as const;

/**
 * Day phases
 */
export enum DayPhase {
  /** 6:00 - 12:00 */
  Morning = 'morning',
  /** 12:00 - 18:00 */
  Afternoon = 'afternoon',
  /** 18:00 - 22:00 */
  Evening = 'evening',
  /** 22:00 - 6:00 */
  Night = 'night',
}

/**
 * Schedule activity definition
 */
export interface ScheduleActivity {
  /** Activity ID */
  id: string;
  /** Display name */
  name: string;
  /** Start hour (0-23) */
  startHour: number;
  /** End hour (0-23) */
  endHour: number;
  /** Days of week (0=Sunday, 6=Saturday), empty = all days */
  daysOfWeek?: number[];
  /** Location for this activity */
  location?: Vector3;
  /** Location name/ID */
  locationId?: string;
  /** Animation/pose during activity */
  animation?: string;
  /** Whether NPC is interactable during this activity */
  interactable?: boolean;
  /** Whether NPC is visible during this activity */
  visible?: boolean;
  /** Priority (higher = more important) */
  priority: number;
  /** Callback when activity starts */
  onStart?: (context: AIContext) => void;
  /** Callback when activity ends */
  onEnd?: (context: AIContext) => void;
  /** Custom tick behavior */
  onTick?: (context: AIContext) => void;
}

/**
 * Shop hours definition
 */
export interface ShopHours {
  /** Opening hour (0-23) */
  openHour: number;
  /** Closing hour (0-23) */
  closeHour: number;
  /** Days open (0=Sunday, 6=Saturday), empty = all days */
  daysOpen?: number[];
  /** Location when shop is open */
  openLocation?: Vector3;
  /** Location when shop is closed */
  closedLocation?: Vector3;
  /** Whether NPC goes to closed location or disappears */
  hideWhenClosed?: boolean;
  /** Callback when shop opens */
  onOpen?: (context: AIContext) => void;
  /** Callback when shop closes */
  onClose?: (context: AIContext) => void;
}

/**
 * Sleep schedule definition
 */
export interface SleepSchedule {
  /** Bedtime hour (0-23) */
  sleepHour: number;
  /** Wake hour (0-23) */
  wakeHour: number;
  /** Sleep location */
  sleepLocation?: Vector3;
  /** Whether NPC is hidden while sleeping */
  hideWhileSleeping?: boolean;
  /** Sleep animation */
  sleepAnimation?: string;
  /** Callback when going to sleep */
  onSleep?: (context: AIContext) => void;
  /** Callback when waking up */
  onWake?: (context: AIContext) => void;
}

/**
 * Scheduled event definition
 */
export interface ScheduledEvent {
  /** Event ID */
  id: string;
  /** Event name */
  name: string;
  /** Trigger time (Date or relative time) */
  triggerTime: Date | number;
  /** Whether time is relative to now */
  isRelative?: boolean;
  /** Event duration in seconds */
  duration?: number;
  /** Event location */
  location?: Vector3;
  /** Priority (overrides schedule if higher) */
  priority: number;
  /** Whether event repeats */
  repeating?: boolean;
  /** Repeat interval in seconds (if repeating) */
  repeatInterval?: number;
  /** Callback when event triggers */
  onTrigger: (context: AIContext) => void;
  /** Callback when event ends */
  onEnd?: (context: AIContext) => void;
}

/**
 * Time provider interface
 */
export interface TimeProvider {
  /** Get current game hour (0-23) */
  getHour(): number;
  /** Get current game minute (0-59) */
  getMinute(): number;
  /** Get current day of week (0=Sunday, 6=Saturday) */
  getDayOfWeek(): number;
  /** Get current date */
  getDate(): Date;
  /** Get timestamp */
  getTimestamp(): number;
}

/**
 * Default time provider using real time
 */
export const defaultTimeProvider: TimeProvider = {
  getHour: () => new Date().getHours(),
  getMinute: () => new Date().getMinutes(),
  getDayOfWeek: () => new Date().getDay(),
  getDate: () => new Date(),
  getTimestamp: () => Date.now(),
};

/**
 * ScheduleController Action
 *
 * Controls NPC daily schedule:
 * - Determines current activity based on time
 * - Handles activity transitions
 * - Manages locations
 */
export class ScheduleController extends LeafNode {
  /** Schedule activities */
  activities: ScheduleActivity[];

  /** Time provider */
  timeProvider: TimeProvider;

  /** Schedule check interval (seconds) */
  checkInterval: number;

  /** Currently active activity */
  private currentActivityId: string | null = null;

  constructor(
    options: {
      activities?: ScheduleActivity[] | undefined;
      timeProvider?: TimeProvider | undefined;
      checkInterval?: number | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'ScheduleController');
    this.activities = options.activities ?? [];
    this.timeProvider = options.timeProvider ?? defaultTimeProvider;
    this.checkInterval = options.checkInterval ?? 60;
  }

  tick(context: AIContext): NodeStatus {
    const now = this.timeProvider.getTimestamp();

    // Check if we need to update
    const nextCheck = getBlackboardValue<number>(context, SchedulerBlackboardKeys.NEXT_SCHEDULE_CHECK);
    if (nextCheck && now < nextCheck) {
      // Run current activity tick if any
      const currentActivity = this.getCurrentActivity();
      if (currentActivity?.onTick) {
        currentActivity.onTick(context);
      }
      return NodeStatus.Running;
    }

    // Update next check time
    setBlackboardValue(context, SchedulerBlackboardKeys.NEXT_SCHEDULE_CHECK, now + this.checkInterval * 1000);

    // Check for schedule override
    const override = getBlackboardValue<ScheduleActivity>(context, SchedulerBlackboardKeys.SCHEDULE_OVERRIDE);
    if (override) {
      this.setActivity(context, override);
      return NodeStatus.Running;
    }

    // Find current activity
    const currentHour = this.timeProvider.getHour();
    const currentDay = this.timeProvider.getDayOfWeek();

    const activeActivity = this.findActiveActivity(currentHour, currentDay);

    if (activeActivity) {
      if (this.currentActivityId !== activeActivity.id) {
        this.setActivity(context, activeActivity);
      }
    } else if (this.currentActivityId) {
      // End current activity
      this.endActivity(context);
    }

    // Update day phase
    const phase = this.calculateDayPhase(currentHour);
    setBlackboardValue(context, SchedulerBlackboardKeys.DAY_PHASE, phase);

    return NodeStatus.Running;
  }

  private findActiveActivity(hour: number, day: number): ScheduleActivity | null {
    const validActivities = this.activities.filter(activity => {
      // Check day
      if (activity.daysOfWeek && activity.daysOfWeek.length > 0) {
        if (!activity.daysOfWeek.includes(day)) {
          return false;
        }
      }

      // Check time (handles overnight spans)
      if (activity.startHour <= activity.endHour) {
        return hour >= activity.startHour && hour < activity.endHour;
      } else {
        // Overnight (e.g., 22:00 - 06:00)
        return hour >= activity.startHour || hour < activity.endHour;
      }
    });

    if (validActivities.length === 0) {
      return null;
    }

    // Return highest priority
    return validActivities.sort((a, b) => b.priority - a.priority)[0]!;
  }

  private setActivity(context: AIContext, activity: ScheduleActivity): void {
    // End previous activity
    if (this.currentActivityId) {
      this.endActivity(context);
    }

    // Start new activity
    this.currentActivityId = activity.id;
    setBlackboardValue(context, SchedulerBlackboardKeys.CURRENT_ACTIVITY, activity.id);
    setBlackboardValue(context, SchedulerBlackboardKeys.ACTIVITY_START_TIME, this.timeProvider.getTimestamp());

    if (activity.location) {
      setBlackboardValue(context, SchedulerBlackboardKeys.ACTIVITY_LOCATION, activity.location);
    }

    if (activity.onStart) {
      activity.onStart(context);
    }
  }

  private endActivity(context: AIContext): void {
    const activity = this.getCurrentActivity();
    if (activity?.onEnd) {
      activity.onEnd(context);
    }

    this.currentActivityId = null;
    context.blackboard.delete(SchedulerBlackboardKeys.CURRENT_ACTIVITY);
    context.blackboard.delete(SchedulerBlackboardKeys.ACTIVITY_START_TIME);
    context.blackboard.delete(SchedulerBlackboardKeys.ACTIVITY_LOCATION);
  }

  private getCurrentActivity(): ScheduleActivity | null {
    if (!this.currentActivityId) return null;
    return this.activities.find(a => a.id === this.currentActivityId) ?? null;
  }

  private calculateDayPhase(hour: number): DayPhase {
    if (hour >= 6 && hour < 12) return DayPhase.Morning;
    if (hour >= 12 && hour < 18) return DayPhase.Afternoon;
    if (hour >= 18 && hour < 22) return DayPhase.Evening;
    return DayPhase.Night;
  }
}

/**
 * ShopSchedule Action
 *
 * Manages shop opening/closing hours:
 * - Opens and closes at set times
 * - Moves NPC to appropriate locations
 * - Handles customer interactions
 */
export class ShopSchedule extends LeafNode {
  /** Shop hours configuration */
  shopHours: ShopHours;

  /** Time provider */
  timeProvider: TimeProvider;

  /** Whether shop was open last check */
  private wasOpen: boolean = false;

  constructor(
    options: {
      shopHours?: ShopHours | undefined;
      timeProvider?: TimeProvider | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'ShopSchedule');
    this.shopHours = options.shopHours ?? {
      openHour: 8,
      closeHour: 20,
    };
    this.timeProvider = options.timeProvider ?? defaultTimeProvider;
  }

  tick(context: AIContext): NodeStatus {
    const currentHour = this.timeProvider.getHour();
    const currentDay = this.timeProvider.getDayOfWeek();

    // Check if shop should be open
    let isOpen = this.isShopOpen(currentHour, currentDay);

    // Handle state change
    if (isOpen !== this.wasOpen) {
      if (isOpen) {
        // Shop opening
        setBlackboardValue(context, SchedulerBlackboardKeys.SHOP_IS_OPEN, true);
        if (this.shopHours.openLocation) {
          setBlackboardValue(context, SchedulerBlackboardKeys.ACTIVITY_LOCATION, this.shopHours.openLocation);
        }
        if (this.shopHours.onOpen) {
          this.shopHours.onOpen(context);
        }
      } else {
        // Shop closing
        setBlackboardValue(context, SchedulerBlackboardKeys.SHOP_IS_OPEN, false);
        if (this.shopHours.closedLocation) {
          setBlackboardValue(context, SchedulerBlackboardKeys.ACTIVITY_LOCATION, this.shopHours.closedLocation);
        }
        if (this.shopHours.onClose) {
          this.shopHours.onClose(context);
        }
      }
      this.wasOpen = isOpen;
    }

    return NodeStatus.Success;
  }

  private isShopOpen(hour: number, day: number): boolean {
    // Check day
    if (this.shopHours.daysOpen && this.shopHours.daysOpen.length > 0) {
      if (!this.shopHours.daysOpen.includes(day)) {
        return false;
      }
    }

    // Check time
    const { openHour, closeHour } = this.shopHours;
    if (openHour <= closeHour) {
      return hour >= openHour && hour < closeHour;
    } else {
      // Overnight hours
      return hour >= openHour || hour < closeHour;
    }
  }
}

/**
 * SleepCycle Action
 *
 * Manages NPC sleep/wake cycles:
 * - Goes to sleep at bedtime
 * - Wakes at wake time
 * - Handles sleep location
 */
export class SleepCycle extends LeafNode {
  /** Sleep schedule */
  sleepSchedule: SleepSchedule;

  /** Time provider */
  timeProvider: TimeProvider;

  /** Whether NPC was sleeping last check */
  private wasSleeping: boolean = false;

  constructor(
    options: {
      sleepSchedule?: SleepSchedule | undefined;
      timeProvider?: TimeProvider | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'SleepCycle');
    this.sleepSchedule = options.sleepSchedule ?? {
      sleepHour: 22,
      wakeHour: 6,
    };
    this.timeProvider = options.timeProvider ?? defaultTimeProvider;
  }

  tick(context: AIContext): NodeStatus {
    const currentHour = this.timeProvider.getHour();

    const shouldSleep = this.shouldBeSleeping(currentHour);

    if (shouldSleep !== this.wasSleeping) {
      if (shouldSleep) {
        // Go to sleep
        setBlackboardValue(context, SchedulerBlackboardKeys.IS_SLEEPING, true);
        if (this.sleepSchedule.sleepLocation) {
          setBlackboardValue(context, SchedulerBlackboardKeys.ACTIVITY_LOCATION, this.sleepSchedule.sleepLocation);
        }
        if (this.sleepSchedule.onSleep) {
          this.sleepSchedule.onSleep(context);
        }
      } else {
        // Wake up
        setBlackboardValue(context, SchedulerBlackboardKeys.IS_SLEEPING, false);
        if (this.sleepSchedule.onWake) {
          this.sleepSchedule.onWake(context);
        }
      }
      this.wasSleeping = shouldSleep;
    }

    return NodeStatus.Success;
  }

  private shouldBeSleeping(hour: number): boolean {
    const { sleepHour, wakeHour } = this.sleepSchedule;
    if (sleepHour <= wakeHour) {
      return hour >= sleepHour && hour < wakeHour;
    } else {
      // Overnight sleep (e.g., 22:00 - 06:00)
      return hour >= sleepHour || hour < wakeHour;
    }
  }
}

/**
 * EventScheduler Action
 *
 * Manages scheduled events:
 * - Triggers events at specified times
 * - Handles event durations
 * - Supports repeating events
 */
export class EventScheduler extends LeafNode {
  /** Scheduled events */
  events: ScheduledEvent[];

  /** Time provider */
  timeProvider: TimeProvider;

  /** Triggered event tracking */
  private triggeredEvents: Map<string, { lastTrigger: number; active: boolean }> = new Map();

  constructor(
    options: {
      events?: ScheduledEvent[] | undefined;
      timeProvider?: TimeProvider | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'EventScheduler');
    this.events = options.events ?? [];
    this.timeProvider = options.timeProvider ?? defaultTimeProvider;
  }

  tick(context: AIContext): NodeStatus {
    const now = this.timeProvider.getTimestamp();

    for (const event of this.events) {
      let tracking = this.triggeredEvents.get(event.id);
      if (!tracking) {
        tracking = { lastTrigger: 0, active: false };
        this.triggeredEvents.set(event.id, tracking);
      }

      // Calculate trigger time
      let triggerTime: number;
      if (event.isRelative) {
        triggerTime = tracking.lastTrigger === 0
          ? now + (event.triggerTime as number) * 1000
          : tracking.lastTrigger + (event.repeatInterval ?? event.triggerTime as number) * 1000;
      } else {
        triggerTime = (event.triggerTime as Date).getTime();
      }

      // Check if event should trigger
      if (!tracking.active && now >= triggerTime) {
        // Check if already triggered (for non-repeating)
        if (!event.repeating && tracking.lastTrigger > 0) {
          continue;
        }

        // Trigger event
        tracking.lastTrigger = now;
        tracking.active = true;

        setBlackboardValue(context, SchedulerBlackboardKeys.PENDING_EVENT, event.id);
        setBlackboardValue(context, SchedulerBlackboardKeys.EVENT_TRIGGER_TIME, now);

        if (event.location) {
          setBlackboardValue(context, SchedulerBlackboardKeys.ACTIVITY_LOCATION, event.location);
        }

        event.onTrigger(context);
      }

      // Check if active event should end
      if (tracking.active && event.duration) {
        const elapsed = (now - tracking.lastTrigger) / 1000;
        if (elapsed >= event.duration) {
          tracking.active = false;

          if (event.onEnd) {
            event.onEnd(context);
          }

          context.blackboard.delete(SchedulerBlackboardKeys.PENDING_EVENT);
          context.blackboard.delete(SchedulerBlackboardKeys.EVENT_TRIGGER_TIME);
        }
      }
    }

    return NodeStatus.Success;
  }

  /**
   * Add a new event
   */
  addEvent(event: ScheduledEvent): void {
    this.events.push(event);
  }

  /**
   * Remove an event
   */
  removeEvent(eventId: string): void {
    const index = this.events.findIndex(e => e.id === eventId);
    if (index !== -1) {
      this.events.splice(index, 1);
      this.triggeredEvents.delete(eventId);
    }
  }

  /**
   * Cancel an active event
   */
  cancelEvent(context: AIContext, eventId: string): void {
    const tracking = this.triggeredEvents.get(eventId);
    if (tracking?.active) {
      const event = this.events.find(e => e.id === eventId);
      tracking.active = false;

      if (event?.onEnd) {
        event.onEnd(context);
      }

      const currentEvent = getBlackboardValue<string>(context, SchedulerBlackboardKeys.PENDING_EVENT);
      if (currentEvent === eventId) {
        context.blackboard.delete(SchedulerBlackboardKeys.PENDING_EVENT);
        context.blackboard.delete(SchedulerBlackboardKeys.EVENT_TRIGGER_TIME);
      }
    }
  }
}

/**
 * MoveToActivityLocation Action
 *
 * Moves NPC to their scheduled activity location
 */
export class MoveToActivityLocation extends LeafNode {
  /** Stop distance from location */
  stopDistance: number;

  constructor(
    options: {
      stopDistance?: number | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'MoveToActivityLocation');
    this.stopDistance = options.stopDistance ?? 1;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    const targetLocation = getBlackboardValue<Vector3>(context, SchedulerBlackboardKeys.ACTIVITY_LOCATION);
    if (!targetLocation) {
      return NodeStatus.Success;
    }

    const dx = targetLocation.x - creature.position.x;
    const dz = targetLocation.z - creature.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= this.stopDistance) {
      return NodeStatus.Success;
    }

    // Move toward location
    const speed = creature.walkSpeed;
    const moveDistance = speed * deltaTime;

    if (distance > 0) {
      const dirX = dx / distance;
      const dirZ = dz / distance;

      const newX = creature.position.x + dirX * Math.min(moveDistance, distance);
      const newZ = creature.position.z + dirZ * Math.min(moveDistance, distance);

      creature.setPosition(newX, creature.position.y, newZ);

      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }
}

/**
 * CheckDayPhase Condition
 *
 * Checks if current day phase matches expected
 */
export class CheckDayPhase extends LeafNode {
  /** Expected phases */
  expectedPhases: DayPhase[];

  /** Time provider */
  timeProvider: TimeProvider;

  constructor(
    phases: DayPhase | DayPhase[],
    timeProvider?: TimeProvider,
    name?: string
  ) {
    super(name ?? 'CheckDayPhase');
    this.expectedPhases = Array.isArray(phases) ? phases : [phases];
    this.timeProvider = timeProvider ?? defaultTimeProvider;
  }

  tick(context: AIContext): NodeStatus {
    const hour = this.timeProvider.getHour();
    let currentPhase: DayPhase;

    if (hour >= 6 && hour < 12) currentPhase = DayPhase.Morning;
    else if (hour >= 12 && hour < 18) currentPhase = DayPhase.Afternoon;
    else if (hour >= 18 && hour < 22) currentPhase = DayPhase.Evening;
    else currentPhase = DayPhase.Night;

    return this.expectedPhases.includes(currentPhase) ? NodeStatus.Success : NodeStatus.Failure;
  }
}

/**
 * CheckScheduleActivity Condition
 *
 * Checks if NPC is in a specific activity
 */
export class CheckScheduleActivity extends LeafNode {
  /** Expected activity IDs */
  expectedActivities: string[];

  constructor(activities: string | string[], name?: string) {
    super(name ?? 'CheckScheduleActivity');
    this.expectedActivities = Array.isArray(activities) ? activities : [activities];
  }

  tick(context: AIContext): NodeStatus {
    const currentActivity = getBlackboardValue<string>(context, SchedulerBlackboardKeys.CURRENT_ACTIVITY);
    if (!currentActivity) {
      return NodeStatus.Failure;
    }
    return this.expectedActivities.includes(currentActivity) ? NodeStatus.Success : NodeStatus.Failure;
  }
}

/**
 * Options for creating NPC scheduler behavior
 */
export interface NPCSchedulerOptions {
  /** Schedule activities */
  activities?: ScheduleActivity[] | undefined;
  /** Shop hours (if applicable) */
  shopHours?: ShopHours | undefined;
  /** Sleep schedule (if applicable) */
  sleepSchedule?: SleepSchedule | undefined;
  /** Scheduled events */
  events?: ScheduledEvent[] | undefined;
  /** Time provider */
  timeProvider?: TimeProvider | undefined;
  /** Schedule check interval (seconds) */
  checkInterval?: number | undefined;
}

/**
 * Creates an NPC scheduler behavior tree
 */
export function createNPCSchedulerBehavior(options: NPCSchedulerOptions): BehaviorTree {
  const {
    activities = [],
    shopHours,
    sleepSchedule,
    events = [],
    timeProvider,
    checkInterval,
  } = options;

  const nodes: BehaviorNode[] = [];

  // Schedule controller
  if (activities.length > 0) {
    nodes.push(new ScheduleController({
      activities,
      timeProvider,
      checkInterval,
    }));
  }

  // Shop schedule
  if (shopHours) {
    nodes.push(new ShopSchedule({
      shopHours,
      timeProvider,
    }));
  }

  // Sleep cycle
  if (sleepSchedule) {
    nodes.push(new SleepCycle({
      sleepSchedule,
      timeProvider,
    }));
  }

  // Event scheduler
  if (events.length > 0) {
    nodes.push(new EventScheduler({
      events,
      timeProvider,
    }));
  }

  // Move to activity location
  nodes.push(new MoveToActivityLocation());

  const root = new Sequence(nodes, 'NPCSchedulerRoot');
  return new BehaviorTree(root, 'NPCScheduler');
}

/**
 * Creates a simple shopkeeper schedule
 */
export function createShopkeeperSchedule(
  shopHours: ShopHours,
  options?: {
    sleepSchedule?: SleepSchedule | undefined;
    timeProvider?: TimeProvider | undefined;
  }
): BehaviorTree {
  return createNPCSchedulerBehavior({
    shopHours,
    sleepSchedule: options?.sleepSchedule,
    timeProvider: options?.timeProvider,
  });
}

/**
 * Creates a daily routine schedule
 */
export function createDailyRoutineSchedule(
  activities: ScheduleActivity[],
  sleepSchedule?: SleepSchedule,
  options?: {
    timeProvider?: TimeProvider | undefined;
    checkInterval?: number | undefined;
  }
): BehaviorTree {
  return createNPCSchedulerBehavior({
    activities,
    sleepSchedule,
    timeProvider: options?.timeProvider,
    checkInterval: options?.checkInterval,
  });
}

/**
 * Creates common activity presets
 */
export const ActivityPresets = {
  /** Working at a location */
  work: (location: Vector3, startHour: number = 8, endHour: number = 17): ScheduleActivity => ({
    id: 'work',
    name: 'Working',
    startHour,
    endHour,
    location,
    interactable: true,
    visible: true,
    priority: 50,
  }),

  /** Eating at a location */
  meal: (location: Vector3, startHour: number, endHour: number): ScheduleActivity => ({
    id: `meal_${startHour}`,
    name: 'Eating',
    startHour,
    endHour,
    location,
    interactable: false,
    visible: true,
    priority: 60,
  }),

  /** Relaxing/leisure time */
  leisure: (location: Vector3, startHour: number, endHour: number): ScheduleActivity => ({
    id: `leisure_${startHour}`,
    name: 'Leisure',
    startHour,
    endHour,
    location,
    interactable: true,
    visible: true,
    priority: 30,
  }),

  /** Sleeping */
  sleep: (location: Vector3, sleepHour: number = 22, wakeHour: number = 6): ScheduleActivity => ({
    id: 'sleep',
    name: 'Sleeping',
    startHour: sleepHour,
    endHour: wakeHour,
    location,
    interactable: false,
    visible: false,
    priority: 100,
  }),
};
