/**
 * Quest Handler
 * Network handler for quest system operations including quest acceptance,
 * abandonment, completion, and mission terminal interactions
 */

import type { ObjectId } from '@swg/shared-types';
import {
  type QuestManager,
  type QuestPlayerData,
  type QuestOperationResult,
  getQuestManager,
} from '../services/quest-manager.js';
import {
  type MissionTerminalService,
  getMissionTerminalService,
  TerminalType,
  type TerminalTypeValue,
} from '../services/mission-terminal-service.js';
import {
  QuestMessageOpcode,
  QuestResultCode,
  type QuestResultCodeType,
  type QuestAcceptMessage,
  type QuestAbandonMessage,
  type QuestShareMessage,
  type QuestShareResponseMessage,
  type MissionListRequestMessage,
  type MissionAcceptMessage,
  type QuestAcceptResponseMessage,
  type QuestCompleteMessage,
  type ObjectiveUpdateMessage,
  type QuestRewardMessage,
  type QuestShareOfferMessage,
  type MissionListResponseMessage,
  type MissionAcceptResponseMessage,
  type ActiveQuestData,
  type RewardData,
  createQuestAcceptResponse,
  createQuestCompleteMessage,
  createObjectiveUpdateMessage,
  createQuestRewardMessage,
  createQuestShareOfferMessage,
  createMissionListResponse,
  createMissionAcceptResponse,
  serializeQuestAcceptResponseMessage,
  serializeQuestCompleteMessage,
  serializeObjectiveUpdateMessage,
  serializeQuestRewardMessage,
  serializeQuestShareOfferMessage,
  serializeMissionListResponseMessage,
  serializeMissionAcceptResponseMessage,
  deserializeQuestAcceptMessage,
  deserializeQuestAbandonMessage,
  deserializeQuestShareMessage,
  deserializeQuestShareResponseMessage,
  deserializeMissionListRequestMessage,
  deserializeMissionAcceptMessage,
  getQuestMessageOpcode,
  isQuestMessageOpcode,
} from '../services/quest-messages.js';

/**
 * Player session interface
 */
export interface QuestSession {
  playerId: ObjectId;
  playerName: string;
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * Player data provider interface
 */
export interface PlayerDataProvider {
  getPlayerData(playerId: ObjectId): Promise<QuestPlayerData | undefined>;
  getPlayerName(playerId: ObjectId): Promise<string | undefined>;
  isPlayerInGroup(playerId: ObjectId, targetId: ObjectId): Promise<boolean>;
  getGroupMembers(playerId: ObjectId): Promise<ObjectId[]>;
}

/**
 * Handler result
 */
export interface QuestHandlerResult {
  success: boolean;
  response?: Uint8Array | undefined;
  broadcast?: Array<{ playerId: ObjectId; data: Uint8Array }> | undefined;
  error?: string | undefined;
}

/**
 * Quest Handler class
 */
export class QuestHandler {
  /** Quest manager instance */
  private readonly questManager: QuestManager;

  /** Mission terminal service instance */
  private readonly missionService: MissionTerminalService;

  /** Player data provider */
  private playerDataProvider?: PlayerDataProvider;

  /** Active sessions */
  private readonly sessions: Map<string, QuestSession> = new Map();

  /** Notification callback */
  private notificationCallback?: (playerId: ObjectId, data: Uint8Array) => void;

  constructor(
    questManager?: QuestManager,
    missionService?: MissionTerminalService
  ) {
    this.questManager = questManager ?? getQuestManager();
    this.missionService = missionService ?? getMissionTerminalService();

    // Wire up quest manager events
    this.questManager.addEventListener((event) => {
      this.handleQuestEvent(event);
    });
  }

  /**
   * Set the player data provider
   */
  setPlayerDataProvider(provider: PlayerDataProvider): void {
    this.playerDataProvider = provider;
  }

  /**
   * Set the notification callback
   */
  setNotificationCallback(
    callback: (playerId: ObjectId, data: Uint8Array) => void
  ): void {
    this.notificationCallback = callback;
    this.questManager.setNotificationCallback(callback);
  }

  /**
   * Register a player session
   */
  registerSession(session: QuestSession): void {
    this.sessions.set(session.playerId.toString(), session);
  }

  /**
   * Unregister a player session
   */
  unregisterSession(playerId: ObjectId): void {
    this.sessions.delete(playerId.toString());
  }

  /**
   * Get a session by player ID
   */
  getSession(playerId: ObjectId): QuestSession | undefined {
    return this.sessions.get(playerId.toString());
  }

  // ============================================
  // Message Handling
  // ============================================

  /**
   * Handle an incoming quest message
   */
  async handleMessage(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    try {
      const opcode = getQuestMessageOpcode(data);

      if (!isQuestMessageOpcode(opcode)) {
        return {
          success: false,
          error: `Unknown quest message opcode: 0x${opcode.toString(16)}`,
        };
      }

      switch (opcode) {
        case QuestMessageOpcode.QuestAccept:
          return this.handleQuestAccept(playerId, data);

        case QuestMessageOpcode.QuestAbandon:
          return this.handleQuestAbandon(playerId, data);

        case QuestMessageOpcode.QuestShare:
          return this.handleQuestShare(playerId, data);

        case QuestMessageOpcode.QuestShareResponse:
          return this.handleQuestShareResponse(playerId, data);

        case QuestMessageOpcode.MissionListRequest:
          return this.handleMissionListRequest(playerId, data);

        case QuestMessageOpcode.MissionAccept:
          return this.handleMissionAccept(playerId, data);

        default:
          return {
            success: false,
            error: `Unhandled quest message opcode: 0x${opcode.toString(16)}`,
          };
      }
    } catch (error) {
      console.error('[QuestHandler] Error handling message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // Quest Operations
  // ============================================

  /**
   * Handle quest accept request
   */
  private async handleQuestAccept(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    const message = deserializeQuestAcceptMessage(data);
    const { questId } = message;

    // Get player data if available
    let playerData: QuestPlayerData | undefined;
    if (this.playerDataProvider) {
      playerData = await this.playerDataProvider.getPlayerData(playerId);
    }

    // Attempt to assign the quest
    const result = await this.questManager.assignQuest(playerId, questId, playerData);

    // Build response
    const responseCode = result.success
      ? QuestResultCode.Success
      : this.mapResultCode(result.resultCode);

    const questData = result.success
      ? (result.data as ActiveQuestData | undefined)
      : undefined;

    const response = createQuestAcceptResponse(
      responseCode,
      questId,
      result.message ?? '',
      questData
    );

    return {
      success: result.success,
      response: serializeQuestAcceptResponseMessage(response),
    };
  }

  /**
   * Handle quest abandon request
   */
  private async handleQuestAbandon(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    const message = deserializeQuestAbandonMessage(data);
    const { questId } = message;

    const result = this.questManager.abandonQuest(playerId, questId);

    const responseCode = result.success
      ? QuestResultCode.Success
      : this.mapResultCode(result.resultCode);

    const response = createQuestAcceptResponse(
      responseCode,
      questId,
      result.message ?? ''
    );

    return {
      success: result.success,
      response: serializeQuestAcceptResponseMessage(response),
    };
  }

  /**
   * Handle quest share request
   */
  private async handleQuestShare(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    const message = deserializeQuestShareMessage(data);
    const { questId, targetPlayerId } = message;

    // Get player data
    let playerData: QuestPlayerData | undefined;
    if (this.playerDataProvider) {
      playerData = await this.playerDataProvider.getPlayerData(playerId);

      // Add group members
      if (playerData) {
        playerData.groupMembers = await this.playerDataProvider.getGroupMembers(
          playerId
        );
      }
    }

    if (!playerData) {
      const response = createQuestAcceptResponse(
        QuestResultCode.ServerError,
        questId,
        'Unable to get player data'
      );
      return {
        success: false,
        response: serializeQuestAcceptResponseMessage(response),
      };
    }

    const result = await this.questManager.shareQuest(
      playerId,
      questId,
      targetPlayerId,
      playerData
    );

    // Send share offer to target player
    if (result.success && this.notificationCallback) {
      const sharerName =
        (await this.playerDataProvider?.getPlayerName(playerId)) ?? 'Unknown';
      const data = result.data as { questId: string; questName: string } | undefined;

      if (data) {
        const offer = createQuestShareOfferMessage(
          questId,
          data.questName,
          '', // Description can be fetched client-side
          playerId,
          sharerName
        );
        this.notificationCallback(targetPlayerId, serializeQuestShareOfferMessage(offer));
      }
    }

    const responseCode = result.success
      ? QuestResultCode.Success
      : this.mapResultCode(result.resultCode);

    const response = createQuestAcceptResponse(
      responseCode,
      questId,
      result.message ?? ''
    );

    return {
      success: result.success,
      response: serializeQuestAcceptResponseMessage(response),
    };
  }

  /**
   * Handle quest share response
   */
  private async handleQuestShareResponse(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    const message = deserializeQuestShareResponseMessage(data);
    const { questId, accepted } = message;

    if (!accepted) {
      this.questManager.declineSharedQuest(playerId, questId);
      return { success: true };
    }

    // Get player data
    let playerData: QuestPlayerData | undefined;
    if (this.playerDataProvider) {
      playerData = await this.playerDataProvider.getPlayerData(playerId);
    }

    const result = await this.questManager.acceptSharedQuest(
      playerId,
      questId,
      playerData
    );

    const responseCode = result.success
      ? QuestResultCode.Success
      : this.mapResultCode(result.resultCode);

    const response = createQuestAcceptResponse(
      responseCode,
      questId,
      result.message ?? '',
      result.data as ActiveQuestData | undefined
    );

    return {
      success: result.success,
      response: serializeQuestAcceptResponseMessage(response),
    };
  }

  // ============================================
  // Mission Terminal Operations
  // ============================================

  /**
   * Handle mission list request
   */
  private async handleMissionListRequest(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    const message = deserializeMissionListRequestMessage(data);
    const { terminalId, terminalType } = message;

    // Get player level
    let playerLevel = 1;
    if (this.playerDataProvider) {
      const playerData = await this.playerDataProvider.getPlayerData(playerId);
      if (playerData) {
        playerLevel = playerData.level;
      }
    }

    // Map terminal type string to enum
    const terminalTypeValue =
      (Object.values(TerminalType).find((t) => t === terminalType) as TerminalTypeValue) ??
      TerminalType.General;

    // Generate missions
    const missions = this.missionService.generateMissions(
      terminalId,
      terminalTypeValue,
      playerLevel
    );

    const response = createMissionListResponse(terminalId, missions);

    return {
      success: true,
      response: serializeMissionListResponseMessage(response),
    };
  }

  /**
   * Handle mission accept request
   */
  private async handleMissionAccept(
    playerId: ObjectId,
    data: Uint8Array
  ): Promise<QuestHandlerResult> {
    const message = deserializeMissionAcceptMessage(data);
    const { missionId } = message;

    const result = this.missionService.acceptMission(playerId, missionId);

    const responseCode = result.success
      ? QuestResultCode.Success
      : QuestResultCode.ServerError;

    const response = createMissionAcceptResponse(
      responseCode,
      missionId,
      result.message ?? ''
    );

    return {
      success: result.success,
      response: serializeMissionAcceptResponseMessage(response),
    };
  }

  // ============================================
  // Quest Completion
  // ============================================

  /**
   * Attempt to complete a quest (called when player turns in)
   */
  async completeQuest(playerId: ObjectId, questId: string): Promise<QuestHandlerResult> {
    const result = await this.questManager.completeQuest(playerId, questId);

    if (result.success && this.notificationCallback) {
      // Send completion notification
      const questData = this.questManager.getActiveQuestData(playerId, questId);
      const completeMessage = createQuestCompleteMessage(
        questId,
        questData?.name ?? 'Unknown Quest',
        true
      );
      this.notificationCallback(
        playerId,
        serializeQuestCompleteMessage(completeMessage)
      );

      // Send reward notification
      const rewards = result.data as { rewards: RewardData[] } | undefined;
      if (rewards && rewards.rewards.length > 0) {
        const rewardMessage = createQuestRewardMessage(
          questId,
          questData?.name ?? 'Unknown Quest',
          rewards.rewards
        );
        this.notificationCallback(
          playerId,
          serializeQuestRewardMessage(rewardMessage)
        );
      }
    }

    return {
      success: result.success,
      error: result.message,
    };
  }

  // ============================================
  // Event Handling
  // ============================================

  /**
   * Handle quest manager events
   */
  private handleQuestEvent(event: {
    type: string;
    playerId: ObjectId;
    questId: string;
    data?: unknown;
  }): void {
    if (!this.notificationCallback) {
      return;
    }

    switch (event.type) {
      case 'objective_updated': {
        const data = event.data as {
          objectiveId: string;
          progress?: {
            currentCount: number;
            requiredCount: number;
            complete: boolean;
          };
        };

        if (data.progress) {
          const message = createObjectiveUpdateMessage(
            event.questId,
            data.objectiveId,
            data.progress.currentCount,
            data.progress.requiredCount,
            data.progress.complete,
            '' // Description can be fetched client-side
          );
          this.notificationCallback(
            event.playerId,
            serializeObjectiveUpdateMessage(message)
          );
        }
        break;
      }

      case 'quest_completed': {
        const questData = this.questManager.getActiveQuestData(
          event.playerId,
          event.questId
        );
        const message = createQuestCompleteMessage(
          event.questId,
          questData?.name ?? 'Unknown Quest',
          true
        );
        this.notificationCallback(
          event.playerId,
          serializeQuestCompleteMessage(message)
        );
        break;
      }

      case 'quest_failed': {
        const questData = this.questManager.getActiveQuestData(
          event.playerId,
          event.questId
        );
        const message = createQuestCompleteMessage(
          event.questId,
          questData?.name ?? 'Unknown Quest',
          false
        );
        this.notificationCallback(
          event.playerId,
          serializeQuestCompleteMessage(message)
        );
        break;
      }
    }
  }

  // ============================================
  // Objective Triggers (for game events)
  // ============================================

  /**
   * Process a creature kill for quest objectives
   */
  handleCreatureKill(
    playerId: ObjectId,
    creatureTemplate: string,
    creatureId?: ObjectId
  ): void {
    this.questManager.handleCreatureKill(playerId, creatureTemplate, creatureId);
  }

  /**
   * Process item collection for quest objectives
   */
  handleItemCollected(
    playerId: ObjectId,
    itemTemplate: string,
    count: number = 1
  ): void {
    this.questManager.handleItemCollected(playerId, itemTemplate, count);
  }

  /**
   * Process NPC conversation for quest objectives
   */
  handleNpcConversation(playerId: ObjectId, npcTemplate: string): void {
    this.questManager.handleNpcConversation(playerId, npcTemplate);
  }

  /**
   * Process location visit for quest objectives
   */
  handleLocationVisit(
    playerId: ObjectId,
    planet: string,
    x: number,
    y: number
  ): void {
    this.questManager.handleLocationVisit(playerId, planet, x, y);
  }

  /**
   * Process item craft for quest objectives
   */
  handleItemCrafted(
    playerId: ObjectId,
    itemTemplate: string,
    count: number = 1
  ): void {
    this.questManager.handleItemCrafted(playerId, itemTemplate, count);
  }

  /**
   * Process item delivery for quest objectives
   */
  handleItemDelivery(
    playerId: ObjectId,
    itemTemplate: string,
    targetNpc: string
  ): void {
    this.questManager.handleItemDelivery(playerId, itemTemplate, targetNpc);
  }

  // ============================================
  // Mission Triggers
  // ============================================

  /**
   * Check if a mission destroy target was killed
   */
  handleMissionTargetKill(
    playerId: ObjectId,
    creatureTemplate: string
  ): boolean {
    const missions = this.missionService.getPlayerMissions(playerId);

    for (const accepted of missions) {
      if (
        accepted.mission.type === 0 && // Destroy
        accepted.mission.targetTemplate === creatureTemplate
      ) {
        const result = this.missionService.completeMission(
          playerId,
          accepted.mission.missionId
        );
        if (result.success) {
          // TODO: Grant mission rewards through reward managers
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if player reached mission delivery point
   */
  handleMissionDeliveryPoint(
    playerId: ObjectId,
    planet: string,
    x: number,
    y: number
  ): boolean {
    const missions = this.missionService.getPlayerMissions(playerId);

    for (const accepted of missions) {
      if (accepted.mission.type === 1 && accepted.mission.deliveryLocation) {
        // Delivery
        const loc = accepted.mission.deliveryLocation;
        if (loc.planet === planet) {
          const dx = x - loc.x;
          const dy = y - loc.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= 20) {
            // Within 20m of delivery point
            const result = this.missionService.completeMission(
              playerId,
              accepted.mission.missionId
            );
            if (result.success) {
              // TODO: Grant mission rewards
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Map internal result codes to message result codes
   */
  private mapResultCode(code: number): QuestResultCodeType {
    // The codes largely match, but this provides a mapping point if needed
    return code as QuestResultCodeType;
  }

  /**
   * Send a notification to a player
   */
  private sendNotification(playerId: ObjectId, data: Uint8Array): void {
    const session = this.sessions.get(playerId.toString());
    if (session?.sendCallback) {
      session.sendCallback(data);
    } else if (this.notificationCallback) {
      this.notificationCallback(playerId, data);
    }
  }
}

/**
 * Create a new QuestHandler instance
 */
export function createQuestHandler(
  questManager?: QuestManager,
  missionService?: MissionTerminalService
): QuestHandler {
  return new QuestHandler(questManager, missionService);
}

/**
 * Singleton instance for global access
 */
let globalQuestHandler: QuestHandler | null = null;

/**
 * Get or create the global quest handler instance
 */
export function getQuestHandler(
  questManager?: QuestManager,
  missionService?: MissionTerminalService
): QuestHandler {
  if (!globalQuestHandler) {
    globalQuestHandler = new QuestHandler(questManager, missionService);
  }
  return globalQuestHandler;
}
