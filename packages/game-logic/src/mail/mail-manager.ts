/**
 * Mail Manager
 * Core service for in-game mail system operations
 *
 * Handles:
 * - Sending mail with optional attachments and credits
 * - Retrieving mail and mail headers
 * - Reading and deleting mail
 * - Claiming attachments and credits
 * - Cleanup of expired mail
 */

import type { ObjectId } from '@swg/shared-types';
import {
  MAX_SUBJECT_LENGTH,
  MAX_BODY_LENGTH,
  MAX_ATTACHMENTS,
  MAIL_EXPIRY_DAYS,
  MAX_MAIL_CREDITS,
  MailStatus,
  MailResultCode,
  type Mail,
  type MailHeader,
  type MailSendResult,
  type MailClaimResult,
  type MailRepository,
  type MailInventoryService,
  type MailCreditService,
  type MailAttachment,
} from './mail-types.js';

// ============================================
// Configuration
// ============================================

/**
 * Mail manager configuration
 */
export interface MailManagerConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Maximum mail per inbox (0 = unlimited) */
  maxInboxSize: number;
  /** ID generator function */
  generateId: () => bigint;
}

/**
 * Default mail manager configuration
 */
export const DEFAULT_MAIL_CONFIG: MailManagerConfig = {
  enableLogging: false,
  maxInboxSize: 100,
  generateId: () => BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000)),
};

// ============================================
// Mail Manager Class
// ============================================

/**
 * Mail Manager
 * Central service for all mail operations in the game
 */
export class MailManager {
  private repository: MailRepository;
  private inventoryService: MailInventoryService;
  private creditService: MailCreditService;
  private config: MailManagerConfig;

  /**
   * Create a new Mail Manager
   * @param repository - Mail repository for database operations
   * @param inventoryService - Service for inventory operations
   * @param creditService - Service for credit operations
   * @param config - Optional configuration overrides
   */
  constructor(
    repository: MailRepository,
    inventoryService: MailInventoryService,
    creditService: MailCreditService,
    config: Partial<MailManagerConfig> = {}
  ) {
    this.repository = repository;
    this.inventoryService = inventoryService;
    this.creditService = creditService;
    this.config = { ...DEFAULT_MAIL_CONFIG, ...config };
  }

  // ============================================
  // Send Mail
  // ============================================

  /**
   * Send mail to a recipient with optional attachments and credits
   * @param senderId - Character ID of the sender
   * @param recipientId - Character ID of the recipient
   * @param subject - Mail subject line
   * @param body - Mail body content
   * @param attachments - Optional array of item IDs to attach
   * @param credits - Optional credits to include
   * @returns Send result with success status and mail ID or error
   */
  async sendMail(
    senderId: ObjectId,
    recipientId: ObjectId,
    subject: string,
    body: string,
    attachments?: ObjectId[],
    credits?: bigint
  ): Promise<MailSendResult> {
    // Validate sender and recipient exist
    const senderExists = await this.repository.playerExists(senderId);
    if (!senderExists) {
      return {
        success: false,
        resultCode: MailResultCode.ServerError,
        errorMessage: 'Sender not found',
      };
    }

    const recipientExists = await this.repository.playerExists(recipientId);
    if (!recipientExists) {
      return {
        success: false,
        resultCode: MailResultCode.RecipientNotFound,
        errorMessage: 'Recipient not found',
      };
    }

    // Cannot mail self
    if (senderId === recipientId) {
      return {
        success: false,
        resultCode: MailResultCode.CannotMailSelf,
        errorMessage: 'You cannot send mail to yourself',
      };
    }

    // Validate subject length
    if (subject.length > MAX_SUBJECT_LENGTH) {
      return {
        success: false,
        resultCode: MailResultCode.SubjectTooLong,
        errorMessage: `Subject must be ${MAX_SUBJECT_LENGTH} characters or less`,
      };
    }

    // Validate body length
    if (body.length > MAX_BODY_LENGTH) {
      return {
        success: false,
        resultCode: MailResultCode.BodyTooLong,
        errorMessage: `Body must be ${MAX_BODY_LENGTH} characters or less`,
      };
    }

    // Validate attachments count
    const attachmentList = attachments ?? [];
    if (attachmentList.length > MAX_ATTACHMENTS) {
      return {
        success: false,
        resultCode: MailResultCode.TooManyAttachments,
        errorMessage: `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
      };
    }

    // Validate credits
    const creditsToSend = credits ?? 0n;
    if (creditsToSend < 0n) {
      return {
        success: false,
        resultCode: MailResultCode.InsufficientCredits,
        errorMessage: 'Credits cannot be negative',
      };
    }
    if (creditsToSend > MAX_MAIL_CREDITS) {
      return {
        success: false,
        resultCode: MailResultCode.InsufficientCredits,
        errorMessage: `Maximum ${MAX_MAIL_CREDITS} credits per mail`,
      };
    }

    // Check recipient inbox size
    if (this.config.maxInboxSize > 0) {
      const headers = await this.repository.getMailHeaders(recipientId);
      if (headers.length >= this.config.maxInboxSize) {
        return {
          success: false,
          resultCode: MailResultCode.InboxFull,
          errorMessage: 'Recipient inbox is full',
        };
      }
    }

    // Validate sender has credits
    if (creditsToSend > 0n) {
      const hasCredits = await this.creditService.hasCredits(senderId, creditsToSend);
      if (!hasCredits) {
        return {
          success: false,
          resultCode: MailResultCode.InsufficientCredits,
          errorMessage: 'Insufficient credits',
        };
      }
    }

    // Validate sender owns all attachments
    for (const itemId of attachmentList) {
      const ownsItem = await this.inventoryService.playerOwnsItem(senderId, itemId);
      if (!ownsItem) {
        return {
          success: false,
          resultCode: MailResultCode.InvalidAttachment,
          errorMessage: `You do not own item ${itemId}`,
        };
      }
    }

    // Get player names
    const senderName = await this.repository.getPlayerName(senderId) ?? 'Unknown';
    const recipientName = await this.repository.getPlayerName(recipientId) ?? 'Unknown';

    // Generate mail ID
    const mailId = this.config.generateId();

    try {
      // Deduct credits from sender
      if (creditsToSend > 0n) {
        const deducted = await this.creditService.deductCredits(senderId, creditsToSend);
        if (!deducted) {
          return {
            success: false,
            resultCode: MailResultCode.InsufficientCredits,
            errorMessage: 'Failed to deduct credits',
          };
        }
      }

      // Transfer attachments to mail storage
      const attachmentDetails: Array<{
        objectId: bigint;
        templateCrc: number;
        itemName: string;
        stackCount: number;
      }> = [];

      for (const itemId of attachmentList) {
        const details = await this.inventoryService.getItemDetails(itemId);
        if (!details) {
          // Rollback credits if attachment fails
          if (creditsToSend > 0n) {
            await this.creditService.addCredits(senderId, creditsToSend);
          }
          return {
            success: false,
            resultCode: MailResultCode.InvalidAttachment,
            errorMessage: `Could not get details for item ${itemId}`,
          };
        }

        const transferred = await this.inventoryService.transferToMailStorage(itemId, mailId);
        if (!transferred) {
          // Rollback credits if transfer fails
          if (creditsToSend > 0n) {
            await this.creditService.addCredits(senderId, creditsToSend);
          }
          return {
            success: false,
            resultCode: MailResultCode.InvalidAttachment,
            errorMessage: `Failed to transfer item ${itemId}`,
          };
        }

        attachmentDetails.push({
          objectId: itemId,
          templateCrc: details.templateCrc,
          itemName: details.name,
          stackCount: details.stackCount,
        });
      }

      // Create mail record
      await this.repository.createMail({
        mailId,
        senderId,
        senderName,
        recipientId,
        recipientName,
        subject,
        body,
        credits: creditsToSend,
        sentAt: new Date(),
        status: MailStatus.Unread,
      });

      // Add attachment records
      if (attachmentDetails.length > 0) {
        await this.repository.addAttachments(mailId, attachmentDetails);
      }

      if (this.config.enableLogging) {
        console.log(
          `[MailManager] Mail sent: ${mailId} from ${senderName} to ${recipientName}`
        );
      }

      return {
        success: true,
        resultCode: MailResultCode.Success,
        mailId,
      };
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[MailManager] Error sending mail:`, error);
      }
      return {
        success: false,
        resultCode: MailResultCode.ServerError,
        errorMessage: 'An error occurred while sending mail',
      };
    }
  }

  // ============================================
  // Get Mail
  // ============================================

  /**
   * Get all mail for a player
   * @param recipientId - Character ID of the recipient
   * @param includeDeleted - Whether to include deleted mail (default: false)
   * @returns Array of full mail objects
   */
  async getMail(recipientId: ObjectId, includeDeleted: boolean = false): Promise<Mail[]> {
    const records = await this.repository.getMailForRecipient(recipientId, includeDeleted);

    const mailList: Mail[] = [];
    for (const record of records) {
      const attachmentRecords = await this.repository.getAttachments(record.mailId);
      const attachmentIds = attachmentRecords
        .filter((a) => !a.claimed)
        .map((a) => a.objectId as ObjectId);

      mailList.push({
        mailId: record.mailId,
        senderId: record.senderId as ObjectId,
        senderName: record.senderName,
        recipientId: record.recipientId as ObjectId,
        recipientName: record.recipientName,
        subject: record.subject,
        body: record.body,
        attachments: attachmentIds,
        credits: record.credits,
        sentAt: record.sentAt,
        readAt: record.readAt,
        status: record.status,
      });
    }

    return mailList;
  }

  /**
   * Get mail headers for a player (lightweight for list views)
   * @param recipientId - Character ID of the recipient
   * @returns Array of mail headers
   */
  async getMailHeaders(recipientId: ObjectId): Promise<MailHeader[]> {
    return this.repository.getMailHeaders(recipientId);
  }

  // ============================================
  // Read Mail
  // ============================================

  /**
   * Read a mail message (marks as read and returns full content)
   * @param mailId - ID of the mail to read
   * @param playerId - ID of the player reading (for authorization)
   * @returns Full mail object or null if not found/authorized
   */
  async readMail(mailId: bigint, playerId: ObjectId): Promise<Mail | null> {
    const record = await this.repository.getMailById(mailId);

    if (!record) {
      return null;
    }

    // Check authorization
    if (record.recipientId !== playerId) {
      return null;
    }

    // Mark as read if unread
    if (record.status === MailStatus.Unread) {
      await this.repository.markAsRead(mailId);
      record.readAt = new Date();
      record.status = MailStatus.Read;
    }

    // Get attachments
    const attachmentRecords = await this.repository.getAttachments(mailId);
    const attachmentIds = attachmentRecords
      .filter((a) => !a.claimed)
      .map((a) => a.objectId as ObjectId);

    if (this.config.enableLogging) {
      console.log(`[MailManager] Mail read: ${mailId} by ${playerId}`);
    }

    return {
      mailId: record.mailId,
      senderId: record.senderId as ObjectId,
      senderName: record.senderName,
      recipientId: record.recipientId as ObjectId,
      recipientName: record.recipientName,
      subject: record.subject,
      body: record.body,
      attachments: attachmentIds,
      credits: record.credits,
      sentAt: record.sentAt,
      readAt: record.readAt,
      status: record.status,
    };
  }

  // ============================================
  // Delete Mail
  // ============================================

  /**
   * Soft delete a mail message
   * @param mailId - ID of the mail to delete
   * @param playerId - ID of the player deleting (for authorization)
   * @returns True if deleted, false if not found/authorized
   */
  async deleteMail(mailId: bigint, playerId: ObjectId): Promise<boolean> {
    const record = await this.repository.getMailById(mailId);

    if (!record) {
      return false;
    }

    // Check authorization
    if (record.recipientId !== playerId) {
      return false;
    }

    // Check for unclaimed attachments or credits
    const attachmentRecords = await this.repository.getAttachments(mailId);
    const hasUnclaimedAttachments = attachmentRecords.some((a) => !a.claimed);

    if (hasUnclaimedAttachments || record.credits > 0n) {
      // Cannot delete mail with unclaimed items/credits
      // Could auto-claim here or return error based on game design
      if (this.config.enableLogging) {
        console.log(
          `[MailManager] Cannot delete mail ${mailId}: has unclaimed attachments or credits`
        );
      }
      return false;
    }

    const deleted = await this.repository.markAsDeleted(mailId);

    if (deleted && this.config.enableLogging) {
      console.log(`[MailManager] Mail deleted: ${mailId} by ${playerId}`);
    }

    return deleted;
  }

  // ============================================
  // Claim Attachments
  // ============================================

  /**
   * Claim attachments and credits from a mail
   * @param mailId - ID of the mail
   * @param playerId - ID of the player claiming
   * @returns Claim result with items and credits claimed
   */
  async claimAttachments(mailId: bigint, playerId: ObjectId): Promise<MailClaimResult> {
    const record = await this.repository.getMailById(mailId);

    if (!record) {
      return {
        success: false,
        resultCode: MailResultCode.MailNotFound,
        errorMessage: 'Mail not found',
      };
    }

    // Check authorization
    if (record.recipientId !== playerId) {
      return {
        success: false,
        resultCode: MailResultCode.NotAuthorized,
        errorMessage: 'Not authorized to claim this mail',
      };
    }

    // Get unclaimed attachments
    const attachmentRecords = await this.repository.getAttachments(mailId);
    const unclaimedAttachments = attachmentRecords.filter((a) => !a.claimed);

    if (unclaimedAttachments.length === 0 && record.credits === 0n) {
      return {
        success: false,
        resultCode: MailResultCode.AttachmentsAlreadyClaimed,
        errorMessage: 'No attachments or credits to claim',
      };
    }

    try {
      const claimedItems: ObjectId[] = [];

      // Transfer items to player inventory
      for (const attachment of unclaimedAttachments) {
        const transferred = await this.inventoryService.transferFromMailStorage(
          attachment.objectId as ObjectId,
          playerId
        );
        if (transferred) {
          claimedItems.push(attachment.objectId as ObjectId);
        }
      }

      // Add credits to player
      let claimedCredits = 0n;
      if (record.credits > 0n) {
        const added = await this.creditService.addCredits(playerId, record.credits);
        if (added) {
          claimedCredits = record.credits;
        }
      }

      // Mark attachments as claimed in database
      if (claimedItems.length > 0 || claimedCredits > 0n) {
        await this.repository.markAttachmentsClaimed(mailId);
      }

      if (this.config.enableLogging) {
        console.log(
          `[MailManager] Attachments claimed from mail ${mailId}: ${claimedItems.length} items, ${claimedCredits} credits`
        );
      }

      return {
        success: true,
        resultCode: MailResultCode.Success,
        claimedItems,
        claimedCredits,
      };
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[MailManager] Error claiming attachments:`, error);
      }
      return {
        success: false,
        resultCode: MailResultCode.ServerError,
        errorMessage: 'An error occurred while claiming attachments',
      };
    }
  }

  // ============================================
  // Unread Count
  // ============================================

  /**
   * Get unread mail count for a player
   * @param playerId - Character ID of the player
   * @returns Number of unread mail messages
   */
  async getUnreadCount(playerId: ObjectId): Promise<number> {
    return this.repository.getUnreadCount(playerId);
  }

  // ============================================
  // Get Mail with Attachments
  // ============================================

  /**
   * Get mail attachment details
   * @param mailId - ID of the mail
   * @param playerId - ID of the player (for authorization)
   * @returns Array of attachment details or null if not authorized
   */
  async getMailAttachments(
    mailId: bigint,
    playerId: ObjectId
  ): Promise<MailAttachment[] | null> {
    const record = await this.repository.getMailById(mailId);

    if (!record || record.recipientId !== playerId) {
      return null;
    }

    const attachmentRecords = await this.repository.getAttachments(mailId);

    return attachmentRecords
      .filter((a) => !a.claimed)
      .map((a) => ({
        objectId: a.objectId as ObjectId,
        templateCrc: a.templateCrc,
        itemName: a.itemName,
        stackCount: a.stackCount,
      }));
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Purge expired deleted mail
   * Should be called periodically (e.g., daily) to clean up old mail
   * @param expiryDays - Number of days before deleted mail is purged (default: MAIL_EXPIRY_DAYS)
   * @returns Number of mail messages purged
   */
  async purgeExpiredMail(expiryDays: number = MAIL_EXPIRY_DAYS): Promise<number> {
    const purged = await this.repository.purgeExpiredMail(expiryDays);

    if (this.config.enableLogging && purged > 0) {
      console.log(`[MailManager] Purged ${purged} expired mail messages`);
    }

    return purged;
  }

  // ============================================
  // System Mail
  // ============================================

  /**
   * Send a system mail (from the game server)
   * Used for automated notifications, rewards, etc.
   * @param recipientId - Character ID of the recipient
   * @param subject - Mail subject line
   * @param body - Mail body content
   * @param attachments - Optional array of item IDs to attach
   * @param credits - Optional credits to include
   * @param senderName - Display name for sender (default: "System")
   * @returns Send result
   */
  async sendSystemMail(
    recipientId: ObjectId,
    subject: string,
    body: string,
    attachments?: ObjectId[],
    credits?: bigint,
    senderName: string = 'System'
  ): Promise<MailSendResult> {
    const recipientExists = await this.repository.playerExists(recipientId);
    if (!recipientExists) {
      return {
        success: false,
        resultCode: MailResultCode.RecipientNotFound,
        errorMessage: 'Recipient not found',
      };
    }

    const recipientName = await this.repository.getPlayerName(recipientId) ?? 'Unknown';
    const mailId = this.config.generateId();

    // System mail uses 0 as sender ID
    const systemSenderId = 0n as ObjectId;

    try {
      // Create mail record
      await this.repository.createMail({
        mailId,
        senderId: systemSenderId,
        senderName,
        recipientId,
        recipientName,
        subject,
        body,
        credits: credits ?? 0n,
        sentAt: new Date(),
        status: MailStatus.Unread,
      });

      // Add attachments if provided (they should already be in mail storage)
      if (attachments && attachments.length > 0) {
        const attachmentDetails: Array<{
          objectId: bigint;
          templateCrc: number;
          itemName: string;
          stackCount: number;
        }> = [];

        for (const itemId of attachments) {
          const details = await this.inventoryService.getItemDetails(itemId);
          if (details) {
            attachmentDetails.push({
              objectId: itemId,
              templateCrc: details.templateCrc,
              itemName: details.name,
              stackCount: details.stackCount,
            });
          }
        }

        if (attachmentDetails.length > 0) {
          await this.repository.addAttachments(mailId, attachmentDetails);
        }
      }

      if (this.config.enableLogging) {
        console.log(
          `[MailManager] System mail sent: ${mailId} to ${recipientName}`
        );
      }

      return {
        success: true,
        resultCode: MailResultCode.Success,
        mailId,
      };
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[MailManager] Error sending system mail:`, error);
      }
      return {
        success: false,
        resultCode: MailResultCode.ServerError,
        errorMessage: 'An error occurred while sending system mail',
      };
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Mail Manager instance
 * @param repository - Mail repository for database operations
 * @param inventoryService - Service for inventory operations
 * @param creditService - Service for credit operations
 * @param config - Optional configuration overrides
 * @returns New Mail Manager instance
 */
export function createMailManager(
  repository: MailRepository,
  inventoryService: MailInventoryService,
  creditService: MailCreditService,
  config?: Partial<MailManagerConfig>
): MailManager {
  return new MailManager(repository, inventoryService, creditService, config);
}
