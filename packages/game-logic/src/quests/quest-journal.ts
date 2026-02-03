/**
 * @file quest-journal.ts
 * Per-player quest journal managing active, completed, and available quests
 */

import {
  Quest,
  QuestStatus,
  QuestObjective,
  QuestPrerequisiteType,
  QuestResultCode,
  ThemeParkQuest,
  isThemeParkQuest,
} from './quest-types.js';
import { QuestLoader, getQuestLoader } from './quest-loader.js';

/**
 * Tracks progress on a single quest objective
 */
export interface ObjectiveProgress {
  /** Objective ID */
  objectiveId: string;
  /** Current count toward completion */
  currentCount: number;
  /** Required count for completion */
  requiredCount: number;
  /** Whether this objective is complete */
  complete: boolean;
  /** Timestamp when objective was completed (if complete) */
  completedAt?: number;
}

/**
 * Tracks an active quest with progress
 */
export interface ActiveQuest {
  /** Quest ID */
  questId: string;
  /** Current status */
  status: QuestStatus;
  /** Progress on each objective */
  objectives: Map<string, ObjectiveProgress>;
  /** Timestamp when quest was accepted */
  acceptedAt: number;
  /** Timestamp when quest will expire (if time-limited) */
  expiresAt?: number;
  /** Number of times this quest has been completed (for repeatable quests) */
  completionCount: number;
}

/**
 * Record of a completed quest
 */
export interface CompletedQuestRecord {
  /** Quest ID */
  questId: string;
  /** Timestamp when quest was completed */
  completedAt: number;
  /** Number of times completed */
  completionCount: number;
  /** Final status (COMPLETED or FAILED) */
  finalStatus: QuestStatus;
}

/**
 * Serialized quest journal data for persistence
 */
export interface QuestJournalData {
  /** Player ID this journal belongs to */
  playerId: string;
  /** Active quests with progress */
  activeQuests: Array<{
    questId: string;
    status: QuestStatus;
    objectives: Array<{
      objectiveId: string;
      currentCount: number;
      requiredCount: number;
      complete: boolean;
      completedAt?: number;
    }>;
    acceptedAt: number;
    expiresAt?: number;
    completionCount: number;
  }>;
  /** Completed quests history */
  completedQuests: Array<{
    questId: string;
    completedAt: number;
    completionCount: number;
    finalStatus: QuestStatus;
  }>;
  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Result of a quest journal operation
 */
export interface JournalOperationResult {
  success: boolean;
  code: QuestResultCode;
  message?: string;
}

/**
 * Player prerequisites for quest availability checks
 */
export interface PlayerPrerequisites {
  /** Player level */
  level: number;
  /** Faction standings (faction name -> standing value) */
  factionStandings: Map<string, number>;
  /** Completed skills */
  skills: Set<string>;
  /** Player species */
  species: string;
  /** Player profession */
  profession: string;
}

/**
 * Event types for quest journal updates
 */
export type QuestJournalEvent =
  | { type: 'quest_accepted'; questId: string }
  | { type: 'quest_abandoned'; questId: string }
  | { type: 'quest_completed'; questId: string }
  | { type: 'quest_failed'; questId: string }
  | { type: 'objective_updated'; questId: string; objectiveId: string; progress: ObjectiveProgress }
  | { type: 'objective_completed'; questId: string; objectiveId: string };

/**
 * Listener function for quest journal events
 */
export type QuestJournalEventListener = (event: QuestJournalEvent) => void;

/**
 * Maximum number of active quests allowed
 */
const MAX_ACTIVE_QUESTS = 25;

/**
 * Maximum number of completed quest records to retain
 */
const MAX_COMPLETED_RECORDS = 500;

/**
 * Per-player quest journal
 */
export class QuestJournal {
  /** Player ID this journal belongs to */
  private readonly playerId: string;

  /** Currently active quests */
  private activeQuests: Map<string, ActiveQuest> = new Map();

  /** Completed quest history */
  private completedQuests: Map<string, CompletedQuestRecord> = new Map();

  /** Quest loader reference */
  private questLoader: QuestLoader;

  /** Event listeners */
  private eventListeners: Set<QuestJournalEventListener> = new Set();

  constructor(playerId: string, questLoader?: QuestLoader) {
    this.playerId = playerId;
    this.questLoader = questLoader ?? getQuestLoader();
  }

  /**
   * Gets the player ID this journal belongs to
   */
  getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Adds an event listener
   */
  addEventListener(listener: QuestJournalEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(listener: QuestJournalEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Emits an event to all listeners
   */
  private emitEvent(event: QuestJournalEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in quest journal event listener:', error);
      }
    }
  }

  /**
   * Accepts a quest
   */
  acceptQuest(questId: string): JournalOperationResult {
    // Check if quest exists
    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        code: QuestResultCode.NOT_FOUND,
        message: `Quest '${questId}' not found`,
      };
    }

    // Check if already active
    if (this.activeQuests.has(questId)) {
      return {
        success: false,
        code: QuestResultCode.ALREADY_ACTIVE,
        message: `Quest '${questId}' is already active`,
      };
    }

    // Check if max quests reached
    if (this.activeQuests.size >= MAX_ACTIVE_QUESTS) {
      return {
        success: false,
        code: QuestResultCode.QUEST_FULL,
        message: `Cannot accept more than ${MAX_ACTIVE_QUESTS} quests`,
      };
    }

    // Check if non-repeatable quest was already completed
    const completedRecord = this.completedQuests.get(questId);
    if (completedRecord && !quest.repeatable) {
      return {
        success: false,
        code: QuestResultCode.ALREADY_COMPLETED,
        message: `Quest '${questId}' has already been completed and is not repeatable`,
      };
    }

    // Create active quest entry
    const now = Date.now();
    const activeQuest: ActiveQuest = {
      questId,
      status: QuestStatus.ACTIVE,
      objectives: new Map(),
      acceptedAt: now,
      expiresAt: quest.timeLimit ? now + quest.timeLimit * 1000 : undefined,
      completionCount: completedRecord?.completionCount ?? 0,
    };

    // Initialize objective progress
    for (const objective of quest.objectives) {
      activeQuest.objectives.set(objective.id, {
        objectiveId: objective.id,
        currentCount: 0,
        requiredCount: objective.count,
        complete: false,
      });
    }

    this.activeQuests.set(questId, activeQuest);

    this.emitEvent({ type: 'quest_accepted', questId });

    return {
      success: true,
      code: QuestResultCode.SUCCESS,
    };
  }

  /**
   * Abandons an active quest
   */
  abandonQuest(questId: string): JournalOperationResult {
    const activeQuest = this.activeQuests.get(questId);
    if (!activeQuest) {
      return {
        success: false,
        code: QuestResultCode.NOT_ACTIVE,
        message: `Quest '${questId}' is not active`,
      };
    }

    // Update status and remove
    activeQuest.status = QuestStatus.ABANDONED;
    this.activeQuests.delete(questId);

    this.emitEvent({ type: 'quest_abandoned', questId });

    return {
      success: true,
      code: QuestResultCode.SUCCESS,
    };
  }

  /**
   * Updates progress on a quest objective
   */
  updateProgress(
    questId: string,
    objectiveId: string,
    incrementBy: number = 1
  ): JournalOperationResult {
    const activeQuest = this.activeQuests.get(questId);
    if (!activeQuest) {
      return {
        success: false,
        code: QuestResultCode.NOT_ACTIVE,
        message: `Quest '${questId}' is not active`,
      };
    }

    const progress = activeQuest.objectives.get(objectiveId);
    if (!progress) {
      return {
        success: false,
        code: QuestResultCode.NOT_FOUND,
        message: `Objective '${objectiveId}' not found in quest '${questId}'`,
      };
    }

    // Don't update if already complete
    if (progress.complete) {
      return {
        success: true,
        code: QuestResultCode.SUCCESS,
        message: 'Objective already complete',
      };
    }

    // Update count
    progress.currentCount = Math.min(
      progress.currentCount + incrementBy,
      progress.requiredCount
    );

    // Check if objective is now complete
    if (progress.currentCount >= progress.requiredCount) {
      progress.complete = true;
      progress.completedAt = Date.now();

      this.emitEvent({ type: 'objective_completed', questId, objectiveId });
    }

    this.emitEvent({ type: 'objective_updated', questId, objectiveId, progress });

    return {
      success: true,
      code: QuestResultCode.SUCCESS,
    };
  }

  /**
   * Sets absolute progress on a quest objective
   */
  setProgress(questId: string, objectiveId: string, count: number): JournalOperationResult {
    const activeQuest = this.activeQuests.get(questId);
    if (!activeQuest) {
      return {
        success: false,
        code: QuestResultCode.NOT_ACTIVE,
        message: `Quest '${questId}' is not active`,
      };
    }

    const progress = activeQuest.objectives.get(objectiveId);
    if (!progress) {
      return {
        success: false,
        code: QuestResultCode.NOT_FOUND,
        message: `Objective '${objectiveId}' not found in quest '${questId}'`,
      };
    }

    progress.currentCount = Math.min(Math.max(0, count), progress.requiredCount);

    // Check if objective is now complete
    if (progress.currentCount >= progress.requiredCount && !progress.complete) {
      progress.complete = true;
      progress.completedAt = Date.now();
      this.emitEvent({ type: 'objective_completed', questId, objectiveId });
    } else if (progress.currentCount < progress.requiredCount && progress.complete) {
      // Un-complete if count was reduced
      progress.complete = false;
      progress.completedAt = undefined;
    }

    this.emitEvent({ type: 'objective_updated', questId, objectiveId, progress });

    return {
      success: true,
      code: QuestResultCode.SUCCESS,
    };
  }

  /**
   * Completes a quest, granting rewards
   */
  completeQuest(questId: string): JournalOperationResult {
    const activeQuest = this.activeQuests.get(questId);
    if (!activeQuest) {
      return {
        success: false,
        code: QuestResultCode.NOT_ACTIVE,
        message: `Quest '${questId}' is not active`,
      };
    }

    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        code: QuestResultCode.NOT_FOUND,
        message: `Quest definition '${questId}' not found`,
      };
    }

    // Check if all required objectives are complete
    for (const objective of quest.objectives) {
      if (!objective.optional) {
        const progress = activeQuest.objectives.get(objective.id);
        if (!progress || !progress.complete) {
          return {
            success: false,
            code: QuestResultCode.PREREQUISITES_NOT_MET,
            message: `Required objective '${objective.id}' is not complete`,
          };
        }
      }
    }

    // Move to completed
    const now = Date.now();
    const completedRecord: CompletedQuestRecord = {
      questId,
      completedAt: now,
      completionCount: activeQuest.completionCount + 1,
      finalStatus: QuestStatus.COMPLETED,
    };

    this.completedQuests.set(questId, completedRecord);
    this.activeQuests.delete(questId);

    // Trim completed records if too many
    this.trimCompletedRecords();

    this.emitEvent({ type: 'quest_completed', questId });

    return {
      success: true,
      code: QuestResultCode.SUCCESS,
    };
  }

  /**
   * Marks a quest as failed
   */
  failQuest(questId: string, reason?: string): JournalOperationResult {
    const activeQuest = this.activeQuests.get(questId);
    if (!activeQuest) {
      return {
        success: false,
        code: QuestResultCode.NOT_ACTIVE,
        message: `Quest '${questId}' is not active`,
      };
    }

    // Move to completed with failed status
    const now = Date.now();
    const completedRecord: CompletedQuestRecord = {
      questId,
      completedAt: now,
      completionCount: activeQuest.completionCount,
      finalStatus: QuestStatus.FAILED,
    };

    this.completedQuests.set(questId, completedRecord);
    this.activeQuests.delete(questId);

    this.emitEvent({ type: 'quest_failed', questId });

    return {
      success: true,
      code: QuestResultCode.SUCCESS,
      message: reason,
    };
  }

  /**
   * Checks if a quest's prerequisites are met
   */
  checkPrerequisites(questId: string, playerPrereqs: PlayerPrerequisites): boolean {
    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return false;
    }

    for (const prereq of quest.prerequisites) {
      switch (prereq.type) {
        case QuestPrerequisiteType.LEVEL:
          if (playerPrereqs.level < (prereq.minAmount ?? Number(prereq.value))) {
            return false;
          }
          break;

        case QuestPrerequisiteType.FACTION: {
          const factionName = String(prereq.value);
          const playerStanding = playerPrereqs.factionStandings.get(factionName) ?? 0;
          if (playerStanding < (prereq.minAmount ?? 0)) {
            return false;
          }
          break;
        }

        case QuestPrerequisiteType.QUEST: {
          const requiredQuestId = String(prereq.value);
          const completedRecord = this.completedQuests.get(requiredQuestId);
          if (!completedRecord || completedRecord.finalStatus !== QuestStatus.COMPLETED) {
            return false;
          }
          break;
        }

        case QuestPrerequisiteType.SKILL: {
          const skillName = String(prereq.value);
          if (!playerPrereqs.skills.has(skillName)) {
            return false;
          }
          break;
        }

        case QuestPrerequisiteType.SPECIES:
          if (playerPrereqs.species !== String(prereq.value)) {
            return false;
          }
          break;

        case QuestPrerequisiteType.PROFESSION:
          if (playerPrereqs.profession !== String(prereq.value)) {
            return false;
          }
          break;
      }
    }

    // Check theme park chain prerequisites
    if (isThemeParkQuest(quest)) {
      const themeParkQuest = quest as ThemeParkQuest;
      if (themeParkQuest.position > 0) {
        // Must have completed previous quest in chain
        const chainQuests = this.questLoader.getQuestChain(themeParkQuest.questChain);
        const previousQuest = chainQuests.find(
          (q) => q.nextQuests.includes(questId)
        );
        if (previousQuest) {
          const completedRecord = this.completedQuests.get(previousQuest.id);
          if (!completedRecord || completedRecord.finalStatus !== QuestStatus.COMPLETED) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Gets all available quests for the player
   */
  getAvailableQuests(playerPrereqs: PlayerPrerequisites): Quest[] {
    const available: Quest[] = [];

    for (const quest of this.questLoader.getAllQuests()) {
      // Skip if already active
      if (this.activeQuests.has(quest.id)) {
        continue;
      }

      // Skip if non-repeatable and already completed
      const completedRecord = this.completedQuests.get(quest.id);
      if (completedRecord && !quest.repeatable) {
        continue;
      }

      // Check prerequisites
      if (this.checkPrerequisites(quest.id, playerPrereqs)) {
        available.push(quest);
      }
    }

    return available;
  }

  /**
   * Gets the next available quests in a theme park chain
   */
  getNextChainQuests(chainName: string, playerPrereqs: PlayerPrerequisites): ThemeParkQuest[] {
    const chainQuests = this.questLoader.getQuestChain(chainName);
    const available: ThemeParkQuest[] = [];

    for (const quest of chainQuests) {
      // Skip if already active or completed
      if (this.activeQuests.has(quest.id)) {
        continue;
      }
      const completedRecord = this.completedQuests.get(quest.id);
      if (completedRecord && !quest.repeatable) {
        continue;
      }

      // Check if prerequisites are met
      if (this.checkPrerequisites(quest.id, playerPrereqs)) {
        available.push(quest);
      }
    }

    return available;
  }

  /**
   * Gets an active quest
   */
  getActiveQuest(questId: string): ActiveQuest | undefined {
    return this.activeQuests.get(questId);
  }

  /**
   * Gets all active quests
   */
  getActiveQuests(): ActiveQuest[] {
    return Array.from(this.activeQuests.values());
  }

  /**
   * Gets the number of active quests
   */
  getActiveQuestCount(): number {
    return this.activeQuests.size;
  }

  /**
   * Checks if a quest is active
   */
  isQuestActive(questId: string): boolean {
    return this.activeQuests.has(questId);
  }

  /**
   * Checks if a quest has been completed
   */
  isQuestCompleted(questId: string): boolean {
    const record = this.completedQuests.get(questId);
    return record !== undefined && record.finalStatus === QuestStatus.COMPLETED;
  }

  /**
   * Gets a completed quest record
   */
  getCompletedRecord(questId: string): CompletedQuestRecord | undefined {
    return this.completedQuests.get(questId);
  }

  /**
   * Gets all completed quest records
   */
  getCompletedQuests(): CompletedQuestRecord[] {
    return Array.from(this.completedQuests.values());
  }

  /**
   * Gets the completion count for a quest
   */
  getCompletionCount(questId: string): number {
    return this.completedQuests.get(questId)?.completionCount ?? 0;
  }

  /**
   * Checks and handles expired quests
   */
  checkExpiredQuests(): string[] {
    const now = Date.now();
    const expired: string[] = [];

    for (const [questId, activeQuest] of this.activeQuests) {
      if (activeQuest.expiresAt && now >= activeQuest.expiresAt) {
        this.failQuest(questId, 'Quest expired');
        expired.push(questId);
      }
    }

    return expired;
  }

  /**
   * Trims completed records to maximum size
   */
  private trimCompletedRecords(): void {
    if (this.completedQuests.size <= MAX_COMPLETED_RECORDS) {
      return;
    }

    // Sort by completion time and keep most recent
    const records = Array.from(this.completedQuests.entries())
      .sort((a, b) => b[1].completedAt - a[1].completedAt);

    this.completedQuests.clear();
    for (let i = 0; i < MAX_COMPLETED_RECORDS && i < records.length; i++) {
      this.completedQuests.set(records[i][0], records[i][1]);
    }
  }

  /**
   * Serializes the journal for persistence
   */
  serialize(): QuestJournalData {
    const activeQuests = Array.from(this.activeQuests.values()).map((aq) => ({
      questId: aq.questId,
      status: aq.status,
      objectives: Array.from(aq.objectives.values()).map((obj) => ({
        objectiveId: obj.objectiveId,
        currentCount: obj.currentCount,
        requiredCount: obj.requiredCount,
        complete: obj.complete,
        completedAt: obj.completedAt,
      })),
      acceptedAt: aq.acceptedAt,
      expiresAt: aq.expiresAt,
      completionCount: aq.completionCount,
    }));

    const completedQuests = Array.from(this.completedQuests.values()).map((cq) => ({
      questId: cq.questId,
      completedAt: cq.completedAt,
      completionCount: cq.completionCount,
      finalStatus: cq.finalStatus,
    }));

    return {
      playerId: this.playerId,
      activeQuests,
      completedQuests,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Deserializes journal data from persistence
   */
  static deserialize(data: QuestJournalData, questLoader?: QuestLoader): QuestJournal {
    const journal = new QuestJournal(data.playerId, questLoader);

    // Restore active quests
    for (const aqData of data.activeQuests) {
      const objectives = new Map<string, ObjectiveProgress>();
      for (const objData of aqData.objectives) {
        objectives.set(objData.objectiveId, {
          objectiveId: objData.objectiveId,
          currentCount: objData.currentCount,
          requiredCount: objData.requiredCount,
          complete: objData.complete,
          completedAt: objData.completedAt,
        });
      }

      journal.activeQuests.set(aqData.questId, {
        questId: aqData.questId,
        status: aqData.status,
        objectives,
        acceptedAt: aqData.acceptedAt,
        expiresAt: aqData.expiresAt,
        completionCount: aqData.completionCount,
      });
    }

    // Restore completed quests
    for (const cqData of data.completedQuests) {
      journal.completedQuests.set(cqData.questId, {
        questId: cqData.questId,
        completedAt: cqData.completedAt,
        completionCount: cqData.completionCount,
        finalStatus: cqData.finalStatus,
      });
    }

    return journal;
  }

  /**
   * Creates an empty journal for a new player
   */
  static createForPlayer(playerId: string, questLoader?: QuestLoader): QuestJournal {
    return new QuestJournal(playerId, questLoader);
  }
}

/**
 * Factory function to create a new quest journal
 */
export function createQuestJournal(playerId: string, questLoader?: QuestLoader): QuestJournal {
  return QuestJournal.createForPlayer(playerId, questLoader);
}

/**
 * Factory function to restore a quest journal from serialized data
 */
export function restoreQuestJournal(
  data: QuestJournalData,
  questLoader?: QuestLoader
): QuestJournal {
  return QuestJournal.deserialize(data, questLoader);
}
