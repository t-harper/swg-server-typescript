/**
 * Quest Manager Service
 * Manages quest assignment, progress tracking, completion, and rewards
 *
 * Responsibilities:
 * - Quest assignment to players
 * - Objective progress tracking
 * - Quest completion handling
 * - Reward distribution (XP, credits, items, faction)
 * - Theme park chain progression
 * - Quest sharing between group members
 * - Daily/repeatable quest cooldowns
 */

import type { ObjectId } from '@swg/shared-types';
import {
  type Quest,
  type QuestReward,
  type QuestObjective,
  type ThemeParkQuest,
  type ThemeParkChain,
  QuestStatus,
  QuestRewardType,
  QuestPrerequisiteType,
  ObjectiveType,
  QuestResultCode,
  isThemeParkQuest,
} from '@swg/game-logic/quests/quest-types.js';
import {
  type QuestLoader,
  getQuestLoader,
} from '@swg/game-logic/quests/quest-loader.js';
import {
  type QuestJournal,
  type ActiveQuest,
  type ObjectiveProgress,
  type PlayerPrerequisites,
  createQuestJournal,
} from '@swg/game-logic/quests/quest-journal.js';
import {
  type RewardData,
  type ActiveQuestData,
  type ObjectiveProgressData,
  RewardType,
  QuestResultCode as MessageResultCode,
} from './quest-messages.js';

/**
 * Player data interface for quest operations
 */
export interface QuestPlayerData {
  playerId: ObjectId;
  playerName: string;
  level: number;
  species: string;
  profession: string;
  skills: Set<string>;
  factionStandings: Map<string, number>;
  groupId?: bigint;
  groupMembers?: ObjectId[];
}

/**
 * Credits manager interface
 */
export interface QuestCreditsManager {
  addCredits(playerId: ObjectId, amount: number): Promise<boolean>;
  getCredits(playerId: ObjectId): Promise<number>;
}

/**
 * Experience manager interface
 */
export interface QuestExperienceManager {
  grantExperience(playerId: ObjectId, xpType: string, amount: number): Promise<boolean>;
}

/**
 * Faction manager interface
 */
export interface QuestFactionManager {
  adjustFactionStanding(
    playerId: ObjectId,
    factionName: string,
    amount: number
  ): Promise<boolean>;
  getFactionStanding(playerId: ObjectId, factionName: string): Promise<number>;
}

/**
 * Inventory manager interface
 */
export interface QuestInventoryManager {
  grantItem(
    playerId: ObjectId,
    itemTemplate: string,
    quantity: number
  ): Promise<boolean>;
  hasInventorySpace(playerId: ObjectId): Promise<boolean>;
}

/**
 * Skill manager interface
 */
export interface QuestSkillManager {
  grantSkill(playerId: ObjectId, skillName: string): Promise<boolean>;
  hasSkill(playerId: ObjectId, skillName: string): Promise<boolean>;
}

/**
 * Notification callback for quest events
 */
export type QuestNotificationCallback = (
  playerId: ObjectId,
  data: Uint8Array
) => void;

/**
 * Quest event types
 */
export type QuestEventType =
  | 'quest_assigned'
  | 'quest_abandoned'
  | 'quest_completed'
  | 'quest_failed'
  | 'objective_updated'
  | 'reward_granted';

/**
 * Quest event data
 */
export interface QuestEvent {
  type: QuestEventType;
  playerId: ObjectId;
  questId: string;
  data?: unknown;
}

/**
 * Quest event callback
 */
export type QuestEventCallback = (event: QuestEvent) => void;

/**
 * Quest cooldown record
 */
export interface QuestCooldown {
  questId: string;
  playerId: ObjectId;
  completedAt: number;
  cooldownEndsAt: number;
}

/**
 * Quest manager options
 */
export interface QuestManagerOptions {
  /** Quest loader instance */
  questLoader?: QuestLoader;
  /** Credits manager */
  creditsManager?: QuestCreditsManager;
  /** Experience manager */
  experienceManager?: QuestExperienceManager;
  /** Faction manager */
  factionManager?: QuestFactionManager;
  /** Inventory manager */
  inventoryManager?: QuestInventoryManager;
  /** Skill manager */
  skillManager?: QuestSkillManager;
  /** Default cooldown for repeatable quests (in seconds) */
  defaultRepeatableCooldown?: number;
  /** Maximum active quests per player */
  maxActiveQuests?: number;
}

/**
 * Quest operation result
 */
export interface QuestOperationResult {
  success: boolean;
  resultCode: number;
  message?: string | undefined;
  data?: unknown;
}

/**
 * Quest Manager Service
 */
export class QuestManager {
  /** Quest loader instance */
  private readonly questLoader: QuestLoader;

  /** Player quest journals */
  private readonly playerJournals: Map<string, QuestJournal> = new Map();

  /** Quest cooldowns */
  private readonly questCooldowns: Map<string, QuestCooldown[]> = new Map();

  /** Pending quest shares */
  private readonly pendingShares: Map<
    string,
    { questId: string; sharerId: ObjectId; expiresAt: number }
  > = new Map();

  /** Configuration */
  private readonly options: Required<
    Omit<
      QuestManagerOptions,
      | 'questLoader'
      | 'creditsManager'
      | 'experienceManager'
      | 'factionManager'
      | 'inventoryManager'
      | 'skillManager'
    >
  >;

  /** External managers */
  private creditsManager?: QuestCreditsManager | undefined;
  private experienceManager?: QuestExperienceManager | undefined;
  private factionManager?: QuestFactionManager | undefined;
  private inventoryManager?: QuestInventoryManager | undefined;
  private skillManager?: QuestSkillManager | undefined;

  /** Event listeners */
  private readonly eventListeners: Set<QuestEventCallback> = new Set();

  /** Notification callback */
  private notificationCallback?: QuestNotificationCallback;

  /** Initialization flag */
  private initialized: boolean = false;

  constructor(options: QuestManagerOptions = {}) {
    this.questLoader = options.questLoader ?? getQuestLoader();
    this.creditsManager = options.creditsManager;
    this.experienceManager = options.experienceManager;
    this.factionManager = options.factionManager;
    this.inventoryManager = options.inventoryManager;
    this.skillManager = options.skillManager;

    this.options = {
      defaultRepeatableCooldown: options.defaultRepeatableCooldown ?? 86400, // 24 hours
      maxActiveQuests: options.maxActiveQuests ?? 25,
    };
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the quest manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[QuestManager] Initializing...');

    // Ensure quest loader is ready
    if (!this.questLoader.isLoaded()) {
      console.warn('[QuestManager] Quest loader has no quests loaded');
    }

    this.initialized = true;
    console.log('[QuestManager] Initialized');
  }

  /**
   * Shutdown the quest manager
   */
  async shutdown(): Promise<void> {
    console.log('[QuestManager] Shutting down...');

    this.playerJournals.clear();
    this.questCooldowns.clear();
    this.pendingShares.clear();
    this.eventListeners.clear();
    this.initialized = false;

    console.log('[QuestManager] Shutdown complete');
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Set the credits manager
   */
  setCreditsManager(manager: QuestCreditsManager): void {
    this.creditsManager = manager;
  }

  /**
   * Set the experience manager
   */
  setExperienceManager(manager: QuestExperienceManager): void {
    this.experienceManager = manager;
  }

  /**
   * Set the faction manager
   */
  setFactionManager(manager: QuestFactionManager): void {
    this.factionManager = manager;
  }

  /**
   * Set the inventory manager
   */
  setInventoryManager(manager: QuestInventoryManager): void {
    this.inventoryManager = manager;
  }

  /**
   * Set the skill manager
   */
  setSkillManager(manager: QuestSkillManager): void {
    this.skillManager = manager;
  }

  /**
   * Set the notification callback
   */
  setNotificationCallback(callback: QuestNotificationCallback): void {
    this.notificationCallback = callback;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: QuestEventCallback): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: QuestEventCallback): void {
    this.eventListeners.delete(listener);
  }

  // ============================================
  // Quest Assignment
  // ============================================

  /**
   * Assign a quest to a player
   */
  async assignQuest(
    playerId: ObjectId,
    questId: string,
    playerData?: QuestPlayerData
  ): Promise<QuestOperationResult> {
    // Get or create player journal
    const journal = this.getOrCreateJournal(playerId);

    // Check if prerequisites are met
    if (playerData) {
      const prereqCheck = await this.checkPrerequisites(playerId, questId, playerData);
      if (!prereqCheck.success) {
        return prereqCheck;
      }
    }

    // Check cooldown for repeatable quests
    const cooldownCheck = this.checkCooldown(playerId, questId);
    if (!cooldownCheck.success) {
      return cooldownCheck;
    }

    // Accept the quest in the journal
    const result = journal.acceptQuest(questId);
    if (!result.success) {
      return {
        success: false,
        resultCode: result.code,
        message: result.message,
      };
    }

    // Emit event
    this.emitEvent({
      type: 'quest_assigned',
      playerId,
      questId,
    });

    const quest = this.questLoader.getQuest(questId);

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
      message: `Quest "${quest?.name}" accepted`,
      data: this.getActiveQuestData(playerId, questId),
    };
  }

  /**
   * Check if a player can accept a quest
   */
  async checkPrerequisites(
    playerId: ObjectId,
    questId: string,
    playerData: QuestPlayerData
  ): Promise<QuestOperationResult> {
    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_FOUND,
        message: 'Quest not found',
      };
    }

    const journal = this.getOrCreateJournal(playerId);

    // Build prerequisites object
    const prereqs: PlayerPrerequisites = {
      level: playerData.level,
      factionStandings: playerData.factionStandings,
      skills: playerData.skills,
      species: playerData.species,
      profession: playerData.profession,
    };

    // Check prerequisites
    if (!journal.checkPrerequisites(questId, prereqs)) {
      return {
        success: false,
        resultCode: QuestResultCode.PREREQUISITES_NOT_MET,
        message: 'Prerequisites not met',
      };
    }

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
    };
  }

  // ============================================
  // Objective Progress
  // ============================================

  /**
   * Update objective progress for a player
   */
  updateObjective(
    playerId: ObjectId,
    questId: string,
    objectiveId: string,
    incrementBy: number = 1
  ): QuestOperationResult {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_ACTIVE,
        message: 'No quest journal found',
      };
    }

    const result = journal.updateProgress(questId, objectiveId, incrementBy);
    if (!result.success) {
      return {
        success: false,
        resultCode: result.code,
        message: result.message,
      };
    }

    // Get updated progress
    const activeQuest = journal.getActiveQuest(questId);
    const progress = activeQuest?.objectives.get(objectiveId);

    // Emit event
    this.emitEvent({
      type: 'objective_updated',
      playerId,
      questId,
      data: { objectiveId, progress },
    });

    // Check if quest is now completable (auto-complete for simple quests)
    const quest = this.questLoader.getQuest(questId);
    if (quest && this.isQuestCompletable(playerId, questId)) {
      // Don't auto-complete - let the player turn it in
    }

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
      data: progress,
    };
  }

  /**
   * Set absolute progress on an objective
   */
  setObjectiveProgress(
    playerId: ObjectId,
    questId: string,
    objectiveId: string,
    count: number
  ): QuestOperationResult {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_ACTIVE,
        message: 'No quest journal found',
      };
    }

    const result = journal.setProgress(questId, objectiveId, count);
    if (!result.success) {
      return {
        success: false,
        resultCode: result.code,
        message: result.message,
      };
    }

    const activeQuest = journal.getActiveQuest(questId);
    const progress = activeQuest?.objectives.get(objectiveId);

    this.emitEvent({
      type: 'objective_updated',
      playerId,
      questId,
      data: { objectiveId, progress },
    });

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
      data: progress,
    };
  }

  /**
   * Check if a quest is completable (all required objectives done)
   */
  isQuestCompletable(playerId: ObjectId, questId: string): boolean {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return false;
    }

    const activeQuest = journal.getActiveQuest(questId);
    if (!activeQuest) {
      return false;
    }

    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return false;
    }

    // Check all required objectives are complete
    for (const objective of quest.objectives) {
      if (!objective.optional) {
        const progress = activeQuest.objectives.get(objective.id);
        if (!progress || !progress.complete) {
          return false;
        }
      }
    }

    return true;
  }

  // ============================================
  // Quest Completion
  // ============================================

  /**
   * Complete a quest and grant rewards
   */
  async completeQuest(playerId: ObjectId, questId: string): Promise<QuestOperationResult> {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_ACTIVE,
        message: 'No quest journal found',
      };
    }

    // Check if completable
    if (!this.isQuestCompletable(playerId, questId)) {
      return {
        success: false,
        resultCode: QuestResultCode.PREREQUISITES_NOT_MET,
        message: 'Quest objectives not complete',
      };
    }

    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_FOUND,
        message: 'Quest not found',
      };
    }

    // Complete in journal
    const result = journal.completeQuest(questId);
    if (!result.success) {
      return {
        success: false,
        resultCode: result.code,
        message: result.message,
      };
    }

    // Grant rewards
    const rewards = await this.grantRewards(playerId, quest.rewards);

    // Set cooldown for repeatable quests
    if (quest.repeatable) {
      this.setCooldown(playerId, questId, this.options.defaultRepeatableCooldown);
    }

    // Emit event
    this.emitEvent({
      type: 'quest_completed',
      playerId,
      questId,
      data: { rewards },
    });

    // Check for chain progression
    if (isThemeParkQuest(quest)) {
      await this.handleChainProgression(playerId, quest);
    }

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
      message: `Quest "${quest.name}" completed!`,
      data: { rewards },
    };
  }

  /**
   * Grant rewards to a player
   */
  private async grantRewards(
    playerId: ObjectId,
    rewards: QuestReward[]
  ): Promise<RewardData[]> {
    const grantedRewards: RewardData[] = [];

    for (const reward of rewards) {
      try {
        switch (reward.type) {
          case QuestRewardType.CREDITS:
            if (this.creditsManager) {
              await this.creditsManager.addCredits(playerId, reward.value);
              grantedRewards.push({
                type: RewardType.Credits,
                value: reward.value,
              });
            }
            break;

          case QuestRewardType.XP:
            if (this.experienceManager) {
              const xpType = reward.xpType ?? 'general';
              await this.experienceManager.grantExperience(
                playerId,
                xpType,
                reward.value
              );
              grantedRewards.push({
                type: RewardType.Experience,
                value: reward.value,
                xpType,
              });
            }
            break;

          case QuestRewardType.ITEM:
            if (this.inventoryManager && reward.itemTemplate) {
              const quantity = reward.itemQuantity ?? 1;
              await this.inventoryManager.grantItem(
                playerId,
                reward.itemTemplate,
                quantity
              );
              grantedRewards.push({
                type: RewardType.Item,
                value: quantity,
                itemTemplate: reward.itemTemplate,
                itemQuantity: quantity,
              });
            }
            break;

          case QuestRewardType.FACTION:
            if (this.factionManager && reward.factionType) {
              await this.factionManager.adjustFactionStanding(
                playerId,
                reward.factionType,
                reward.value
              );
              grantedRewards.push({
                type: RewardType.Faction,
                value: reward.value,
                factionName: reward.factionType,
              });
            }
            break;

          case QuestRewardType.SKILL:
            if (this.skillManager && reward.skillName) {
              await this.skillManager.grantSkill(playerId, reward.skillName);
              grantedRewards.push({
                type: RewardType.Skill,
                value: 1,
              });
            }
            break;
        }
      } catch (error) {
        console.error(`[QuestManager] Failed to grant reward:`, error);
      }
    }

    // Emit reward event
    if (grantedRewards.length > 0) {
      this.emitEvent({
        type: 'reward_granted',
        playerId,
        questId: '',
        data: { rewards: grantedRewards },
      });
    }

    return grantedRewards;
  }

  // ============================================
  // Quest Abandonment
  // ============================================

  /**
   * Abandon a quest
   */
  abandonQuest(playerId: ObjectId, questId: string): QuestOperationResult {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_ACTIVE,
        message: 'No quest journal found',
      };
    }

    const result = journal.abandonQuest(questId);
    if (!result.success) {
      return {
        success: false,
        resultCode: result.code,
        message: result.message,
      };
    }

    this.emitEvent({
      type: 'quest_abandoned',
      playerId,
      questId,
    });

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
    };
  }

  /**
   * Fail a quest
   */
  failQuest(playerId: ObjectId, questId: string, reason?: string): QuestOperationResult {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return {
        success: false,
        resultCode: QuestResultCode.NOT_ACTIVE,
        message: 'No quest journal found',
      };
    }

    const result = journal.failQuest(questId, reason);
    if (!result.success) {
      return {
        success: false,
        resultCode: result.code,
        message: result.message,
      };
    }

    this.emitEvent({
      type: 'quest_failed',
      playerId,
      questId,
      data: { reason },
    });

    return {
      success: true,
      resultCode: QuestResultCode.SUCCESS,
    };
  }

  // ============================================
  // Quest Sharing
  // ============================================

  /**
   * Share a quest with a group member
   */
  async shareQuest(
    playerId: ObjectId,
    questId: string,
    targetPlayerId: ObjectId,
    playerData: QuestPlayerData
  ): Promise<QuestOperationResult> {
    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return {
        success: false,
        resultCode: MessageResultCode.NotFound,
        message: 'Quest not found',
      };
    }

    // Check if quest is shareable
    if (!quest.shareable) {
      return {
        success: false,
        resultCode: MessageResultCode.NotShareable,
        message: 'This quest cannot be shared',
      };
    }

    // Check if sharer has the quest
    const sharerJournal = this.playerJournals.get(playerId.toString());
    if (!sharerJournal || !sharerJournal.isQuestActive(questId)) {
      return {
        success: false,
        resultCode: MessageResultCode.NotActive,
        message: 'You do not have this quest',
      };
    }

    // Check if target is in the same group
    if (
      !playerData.groupMembers ||
      !playerData.groupMembers.some((m) => m === targetPlayerId)
    ) {
      return {
        success: false,
        resultCode: MessageResultCode.TargetNotInGroup,
        message: 'Target player is not in your group',
      };
    }

    // Check if target already has the quest
    const targetJournal = this.playerJournals.get(targetPlayerId.toString());
    if (targetJournal && targetJournal.isQuestActive(questId)) {
      return {
        success: false,
        resultCode: MessageResultCode.TargetHasQuest,
        message: 'Target player already has this quest',
      };
    }

    // Create pending share
    const shareKey = `${targetPlayerId}-${questId}`;
    this.pendingShares.set(shareKey, {
      questId,
      sharerId: playerId,
      expiresAt: Date.now() + 60000, // 1 minute to accept
    });

    return {
      success: true,
      resultCode: MessageResultCode.Success,
      message: 'Quest share offer sent',
      data: { questId, questName: quest.name },
    };
  }

  /**
   * Accept a shared quest offer
   */
  async acceptSharedQuest(
    playerId: ObjectId,
    questId: string,
    playerData?: QuestPlayerData
  ): Promise<QuestOperationResult> {
    const shareKey = `${playerId}-${questId}`;
    const share = this.pendingShares.get(shareKey);

    if (!share || share.expiresAt < Date.now()) {
      this.pendingShares.delete(shareKey);
      return {
        success: false,
        resultCode: MessageResultCode.NotFound,
        message: 'No pending share offer found',
      };
    }

    // Remove the pending share
    this.pendingShares.delete(shareKey);

    // Assign the quest
    return this.assignQuest(playerId, questId, playerData);
  }

  /**
   * Decline a shared quest offer
   */
  declineSharedQuest(playerId: ObjectId, questId: string): void {
    const shareKey = `${playerId}-${questId}`;
    this.pendingShares.delete(shareKey);
  }

  // ============================================
  // Theme Park Progression
  // ============================================

  /**
   * Handle theme park chain progression after quest completion
   */
  private async handleChainProgression(
    playerId: ObjectId,
    quest: ThemeParkQuest
  ): Promise<void> {
    // Check if this completes the chain
    if (quest.isFinale) {
      const chain = this.questLoader.getChain(quest.questChain);
      if (chain && chain.chainRewards) {
        // Grant chain completion rewards
        await this.grantRewards(playerId, chain.chainRewards);
        console.log(
          `[QuestManager] Player ${playerId} completed chain "${chain.name}"`
        );
      }
    }

    // The next quests in the chain are now available
    // They will be offered when the player talks to the relevant NPC
  }

  /**
   * Get available quests in a theme park chain
   */
  getNextChainQuests(
    playerId: ObjectId,
    chainName: string,
    playerData: QuestPlayerData
  ): ThemeParkQuest[] {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return [];
    }

    const prereqs: PlayerPrerequisites = {
      level: playerData.level,
      factionStandings: playerData.factionStandings,
      skills: playerData.skills,
      species: playerData.species,
      profession: playerData.profession,
    };

    return journal.getNextChainQuests(chainName, prereqs);
  }

  // ============================================
  // Cooldown Management
  // ============================================

  /**
   * Check if a quest is on cooldown
   */
  private checkCooldown(playerId: ObjectId, questId: string): QuestOperationResult {
    const playerCooldowns = this.questCooldowns.get(playerId.toString());
    if (!playerCooldowns) {
      return { success: true, resultCode: QuestResultCode.SUCCESS };
    }

    const cooldown = playerCooldowns.find((c) => c.questId === questId);
    if (cooldown && cooldown.cooldownEndsAt > Date.now()) {
      const remainingSeconds = Math.ceil(
        (cooldown.cooldownEndsAt - Date.now()) / 1000
      );
      return {
        success: false,
        resultCode: MessageResultCode.CooldownActive,
        message: `Quest on cooldown. ${remainingSeconds} seconds remaining.`,
      };
    }

    return { success: true, resultCode: QuestResultCode.SUCCESS };
  }

  /**
   * Set a cooldown for a quest
   */
  private setCooldown(
    playerId: ObjectId,
    questId: string,
    durationSeconds: number
  ): void {
    const playerKey = playerId.toString();
    let playerCooldowns = this.questCooldowns.get(playerKey);
    if (!playerCooldowns) {
      playerCooldowns = [];
      this.questCooldowns.set(playerKey, playerCooldowns);
    }

    // Remove existing cooldown for this quest
    const index = playerCooldowns.findIndex((c) => c.questId === questId);
    if (index !== -1) {
      playerCooldowns.splice(index, 1);
    }

    // Add new cooldown
    playerCooldowns.push({
      questId,
      playerId,
      completedAt: Date.now(),
      cooldownEndsAt: Date.now() + durationSeconds * 1000,
    });
  }

  /**
   * Clear expired cooldowns
   */
  clearExpiredCooldowns(): void {
    const now = Date.now();
    for (const [playerKey, cooldowns] of this.questCooldowns) {
      const active = cooldowns.filter((c) => c.cooldownEndsAt > now);
      if (active.length === 0) {
        this.questCooldowns.delete(playerKey);
      } else {
        this.questCooldowns.set(playerKey, active);
      }
    }
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get available quests for a player
   */
  getAvailableQuests(
    playerId: ObjectId,
    playerData: QuestPlayerData
  ): Quest[] {
    const journal = this.getOrCreateJournal(playerId);

    const prereqs: PlayerPrerequisites = {
      level: playerData.level,
      factionStandings: playerData.factionStandings,
      skills: playerData.skills,
      species: playerData.species,
      profession: playerData.profession,
    };

    // Get available quests and filter by cooldown
    const available = journal.getAvailableQuests(prereqs);
    return available.filter((quest: Quest) => {
      const cooldownCheck = this.checkCooldown(playerId, quest.id);
      return cooldownCheck.success;
    });
  }

  /**
   * Get active quests for a player
   */
  getActiveQuests(playerId: ObjectId): ActiveQuest[] {
    const journal = this.playerJournals.get(playerId.toString());
    return journal ? journal.getActiveQuests() : [];
  }

  /**
   * Get active quest data formatted for messages
   */
  getActiveQuestData(playerId: ObjectId, questId: string): ActiveQuestData | undefined {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return undefined;
    }

    const activeQuest = journal.getActiveQuest(questId);
    if (!activeQuest) {
      return undefined;
    }

    const quest = this.questLoader.getQuest(questId);
    if (!quest) {
      return undefined;
    }

    const objectives: ObjectiveProgressData[] = [];
    for (const obj of quest.objectives) {
      const progress = activeQuest.objectives.get(obj.id);
      objectives.push({
        objectiveId: obj.id,
        description: obj.description ?? '',
        currentCount: progress?.currentCount ?? 0,
        requiredCount: progress?.requiredCount ?? obj.count,
        complete: progress?.complete ?? false,
      });
    }

    return {
      questId: activeQuest.questId,
      name: quest.name,
      acceptedAt: BigInt(activeQuest.acceptedAt),
      expiresAt: BigInt(activeQuest.expiresAt ?? 0),
      objectives,
    };
  }

  /**
   * Get a player's quest journal
   */
  getPlayerJournal(playerId: ObjectId): QuestJournal | undefined {
    return this.playerJournals.get(playerId.toString());
  }

  /**
   * Check if a player has completed a quest
   */
  hasCompletedQuest(playerId: ObjectId, questId: string): boolean {
    const journal = this.playerJournals.get(playerId.toString());
    return journal ? journal.isQuestCompleted(questId) : false;
  }

  /**
   * Check if a player has an active quest
   */
  hasActiveQuest(playerId: ObjectId, questId: string): boolean {
    const journal = this.playerJournals.get(playerId.toString());
    return journal ? journal.isQuestActive(questId) : false;
  }

  // ============================================
  // Journal Management
  // ============================================

  /**
   * Get or create a journal for a player
   */
  private getOrCreateJournal(playerId: ObjectId): QuestJournal {
    const playerKey = playerId.toString();
    let journal = this.playerJournals.get(playerKey);
    if (!journal) {
      journal = createQuestJournal(playerKey, this.questLoader);
      this.playerJournals.set(playerKey, journal);
    }
    return journal;
  }

  /**
   * Load a player's journal from persistence
   */
  loadPlayerJournal(playerId: ObjectId, journal: QuestJournal): void {
    this.playerJournals.set(playerId.toString(), journal);
  }

  /**
   * Remove a player's journal (on logout)
   */
  removePlayerJournal(playerId: ObjectId): QuestJournal | undefined {
    const playerKey = playerId.toString();
    const journal = this.playerJournals.get(playerKey);
    this.playerJournals.delete(playerKey);
    return journal;
  }

  // ============================================
  // Event Handling
  // ============================================

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: QuestEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[QuestManager] Error in event listener:', error);
      }
    }
  }

  // ============================================
  // Objective Triggers
  // ============================================

  /**
   * Handle creature kill for quest objectives
   */
  handleCreatureKill(
    playerId: ObjectId,
    creatureTemplate: string,
    creatureId?: ObjectId
  ): void {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return;
    }

    for (const activeQuest of journal.getActiveQuests()) {
      const quest = this.questLoader.getQuest(activeQuest.questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (
          objective.type === ObjectiveType.KILL_CREATURE &&
          objective.target === creatureTemplate
        ) {
          this.updateObjective(playerId, activeQuest.questId, objective.id, 1);
        }
        if (
          objective.type === ObjectiveType.KILL_NPC &&
          creatureId &&
          objective.target === creatureId.toString()
        ) {
          this.updateObjective(playerId, activeQuest.questId, objective.id, 1);
        }
      }
    }
  }

  /**
   * Handle item collection for quest objectives
   */
  handleItemCollected(playerId: ObjectId, itemTemplate: string, count: number = 1): void {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return;
    }

    for (const activeQuest of journal.getActiveQuests()) {
      const quest = this.questLoader.getQuest(activeQuest.questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (
          objective.type === ObjectiveType.COLLECT_ITEM &&
          objective.target === itemTemplate
        ) {
          this.updateObjective(playerId, activeQuest.questId, objective.id, count);
        }
      }
    }
  }

  /**
   * Handle NPC conversation for quest objectives
   */
  handleNpcConversation(playerId: ObjectId, npcTemplate: string): void {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return;
    }

    for (const activeQuest of journal.getActiveQuests()) {
      const quest = this.questLoader.getQuest(activeQuest.questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (
          objective.type === ObjectiveType.TALK_TO_NPC &&
          objective.target === npcTemplate
        ) {
          this.updateObjective(playerId, activeQuest.questId, objective.id, 1);
        }
      }
    }
  }

  /**
   * Handle location visit for quest objectives
   */
  handleLocationVisit(
    playerId: ObjectId,
    planet: string,
    x: number,
    y: number
  ): void {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return;
    }

    for (const activeQuest of journal.getActiveQuests()) {
      const quest = this.questLoader.getQuest(activeQuest.questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (objective.type === ObjectiveType.VISIT_LOCATION && objective.location) {
          if (objective.location.planet === planet) {
            const dx = x - objective.location.x;
            const dy = y - objective.location.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = objective.location.radius ?? 10;

            if (distance <= radius) {
              this.updateObjective(playerId, activeQuest.questId, objective.id, 1);
            }
          }
        }
      }
    }
  }

  /**
   * Handle item craft for quest objectives
   */
  handleItemCrafted(playerId: ObjectId, itemTemplate: string, count: number = 1): void {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return;
    }

    for (const activeQuest of journal.getActiveQuests()) {
      const quest = this.questLoader.getQuest(activeQuest.questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (
          objective.type === ObjectiveType.CRAFT_ITEM &&
          objective.target === itemTemplate
        ) {
          this.updateObjective(playerId, activeQuest.questId, objective.id, count);
        }
      }
    }
  }

  /**
   * Handle item delivery for quest objectives
   */
  handleItemDelivery(
    playerId: ObjectId,
    itemTemplate: string,
    targetNpc: string
  ): void {
    const journal = this.playerJournals.get(playerId.toString());
    if (!journal) {
      return;
    }

    for (const activeQuest of journal.getActiveQuests()) {
      const quest = this.questLoader.getQuest(activeQuest.questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (objective.type === ObjectiveType.DELIVER_ITEM) {
          // Target format: "itemTemplate:npcTemplate"
          const [reqItem, reqNpc] = objective.target.split(':');
          if (reqItem === itemTemplate && reqNpc === targetNpc) {
            this.updateObjective(playerId, activeQuest.questId, objective.id, 1);
          }
        }
      }
    }
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get quest manager statistics
   */
  getStats(): {
    totalPlayers: number;
    totalActiveQuests: number;
    totalCooldowns: number;
    pendingShares: number;
  } {
    let totalActiveQuests = 0;
    let totalCooldowns = 0;

    for (const journal of this.playerJournals.values()) {
      totalActiveQuests += journal.getActiveQuestCount();
    }

    for (const cooldowns of this.questCooldowns.values()) {
      totalCooldowns += cooldowns.length;
    }

    return {
      totalPlayers: this.playerJournals.size,
      totalActiveQuests,
      totalCooldowns,
      pendingShares: this.pendingShares.size,
    };
  }
}

/**
 * Create a new QuestManager instance
 */
export function createQuestManager(options?: QuestManagerOptions): QuestManager {
  return new QuestManager(options);
}

/**
 * Singleton instance for global access
 */
let globalQuestManager: QuestManager | null = null;

/**
 * Get or create the global quest manager instance
 */
export function getQuestManager(options?: QuestManagerOptions): QuestManager {
  if (!globalQuestManager) {
    globalQuestManager = new QuestManager(options);
  }
  return globalQuestManager;
}
