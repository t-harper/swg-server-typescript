/**
 * Mail Types
 * Type definitions and constants for the in-game mail system
 */

import type { ObjectId } from '@swg/shared-types';

// ============================================
// Constants
// ============================================

/** Maximum length for mail subject line */
export const MAX_SUBJECT_LENGTH = 64;

/** Maximum length for mail body */
export const MAX_BODY_LENGTH = 4000;

/** Maximum number of attachments per mail */
export const MAX_ATTACHMENTS = 10;

/** Number of days before deleted mail is permanently purged */
export const MAIL_EXPIRY_DAYS = 30;

/** Maximum credits that can be sent in a single mail */
export const MAX_MAIL_CREDITS = 100_000_000n;

// ============================================
// Enums
// ============================================

/**
 * Mail status enum
 * Represents the current state of a mail message
 */
export enum MailStatus {
  /** Mail has not been read by recipient */
  Unread = 0,
  /** Mail has been read by recipient */
  Read = 1,
  /** Mail has been soft deleted by recipient */
  Deleted = 2,
}

/**
 * Mail result codes for operation responses
 */
export enum MailResultCode {
  /** Operation completed successfully */
  Success = 0,
  /** Recipient could not be found */
  RecipientNotFound = 1,
  /** Cannot send mail to self */
  CannotMailSelf = 2,
  /** Subject line is too long */
  SubjectTooLong = 3,
  /** Body is too long */
  BodyTooLong = 4,
  /** Too many attachments */
  TooManyAttachments = 5,
  /** Insufficient credits to send */
  InsufficientCredits = 6,
  /** Invalid attachment (item not found or not owned) */
  InvalidAttachment = 7,
  /** Mail not found */
  MailNotFound = 8,
  /** Not authorized to access this mail */
  NotAuthorized = 9,
  /** Attachments already claimed */
  AttachmentsAlreadyClaimed = 10,
  /** Recipient inbox is full */
  InboxFull = 11,
  /** Server error occurred */
  ServerError = 99,
}

// ============================================
// Interfaces
// ============================================

/**
 * Mail attachment interface
 * Represents an item attached to a mail message
 */
export interface MailAttachment {
  /** Object ID of the attached item */
  objectId: ObjectId;
  /** Template CRC of the item (for display) */
  templateCrc: number;
  /** Name of the item (snapshot at attach time) */
  itemName: string;
  /** Stack count (for stackable items) */
  stackCount: number;
}

/**
 * Full mail interface
 * Complete mail message with all data
 */
export interface Mail {
  /** Unique mail ID */
  mailId: bigint;
  /** Character ID of the sender */
  senderId: ObjectId;
  /** Display name of the sender (snapshot at send time) */
  senderName: string;
  /** Character ID of the recipient */
  recipientId: ObjectId;
  /** Display name of the recipient (snapshot at send time) */
  recipientName: string;
  /** Mail subject line */
  subject: string;
  /** Mail body content */
  body: string;
  /** Array of attached item IDs */
  attachments: ObjectId[];
  /** Credits included with the mail */
  credits: bigint;
  /** Timestamp when mail was sent */
  sentAt: Date;
  /** Timestamp when mail was read (null if unread) */
  readAt: Date | null;
  /** Current mail status */
  status: MailStatus;
}

/**
 * Mail header interface
 * Lightweight mail data for list views (inbox display)
 */
export interface MailHeader {
  /** Unique mail ID */
  mailId: bigint;
  /** Display name of the sender */
  senderName: string;
  /** Mail subject line */
  subject: string;
  /** Timestamp when mail was sent */
  sentAt: Date;
  /** Current mail status */
  status: MailStatus;
  /** Whether mail has attachments */
  hasAttachments: boolean;
  /** Whether mail has credits */
  hasCredits: boolean;
}

/**
 * Mail send request data
 * Data required to send a new mail
 */
export interface MailSendRequest {
  /** Character ID of the sender */
  senderId: ObjectId;
  /** Character ID or name of the recipient */
  recipientId: ObjectId;
  /** Mail subject line */
  subject: string;
  /** Mail body content */
  body: string;
  /** Optional array of item IDs to attach */
  attachments?: ObjectId[];
  /** Optional credits to include */
  credits?: bigint;
}

/**
 * Mail send result
 * Result of attempting to send mail
 */
export interface MailSendResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  resultCode: MailResultCode;
  /** Mail ID if successful */
  mailId?: bigint;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Mail claim result
 * Result of claiming mail attachments
 */
export interface MailClaimResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  resultCode: MailResultCode;
  /** Items that were claimed */
  claimedItems?: ObjectId[];
  /** Credits that were claimed */
  claimedCredits?: bigint;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Mail database record
 * Database representation of mail (for repository interface)
 */
export interface MailRecord {
  mailId: bigint;
  senderId: bigint;
  senderName: string;
  recipientId: bigint;
  recipientName: string;
  subject: string;
  body: string;
  credits: bigint;
  sentAt: Date;
  readAt: Date | null;
  status: MailStatus;
  deletedAt: Date | null;
}

/**
 * Mail attachment database record
 */
export interface MailAttachmentRecord {
  mailId: bigint;
  objectId: bigint;
  templateCrc: number;
  itemName: string;
  stackCount: number;
  claimed: boolean;
}

/**
 * Expected interface for mail repository
 * Defines the database operations the MailManager expects
 */
export interface MailRepository {
  /** Create a new mail record */
  createMail(mail: Omit<MailRecord, 'readAt' | 'deletedAt'>): Promise<MailRecord>;

  /** Add attachments to a mail */
  addAttachments(mailId: bigint, attachments: Omit<MailAttachmentRecord, 'mailId' | 'claimed'>[]): Promise<void>;

  /** Get mail by ID */
  getMailById(mailId: bigint): Promise<MailRecord | undefined>;

  /** Get all mail for a recipient */
  getMailForRecipient(recipientId: bigint, includeDeleted?: boolean): Promise<MailRecord[]>;

  /** Get mail headers for a recipient */
  getMailHeaders(recipientId: bigint): Promise<MailHeader[]>;

  /** Get attachments for a mail */
  getAttachments(mailId: bigint): Promise<MailAttachmentRecord[]>;

  /** Mark mail as read */
  markAsRead(mailId: bigint): Promise<boolean>;

  /** Mark mail as deleted */
  markAsDeleted(mailId: bigint): Promise<boolean>;

  /** Mark attachments as claimed */
  markAttachmentsClaimed(mailId: bigint): Promise<boolean>;

  /** Get unread count for a player */
  getUnreadCount(playerId: bigint): Promise<number>;

  /** Purge expired deleted mail */
  purgeExpiredMail(expiryDays: number): Promise<number>;

  /** Check if player exists by ID */
  playerExists(playerId: bigint): Promise<boolean>;

  /** Get player name by ID */
  getPlayerName(playerId: bigint): Promise<string | undefined>;

  /** Find player by name */
  findPlayerByName(name: string): Promise<{ id: bigint; name: string } | undefined>;
}

/**
 * Expected interface for inventory operations
 * Defines the inventory operations the MailManager expects
 */
export interface MailInventoryService {
  /** Check if player owns the item */
  playerOwnsItem(playerId: ObjectId, itemId: ObjectId): Promise<boolean>;

  /** Transfer item to mail storage */
  transferToMailStorage(itemId: ObjectId, mailId: bigint): Promise<boolean>;

  /** Transfer item from mail to player inventory */
  transferFromMailStorage(itemId: ObjectId, playerId: ObjectId): Promise<boolean>;

  /** Get item details for attachment display */
  getItemDetails(itemId: ObjectId): Promise<{
    templateCrc: number;
    name: string;
    stackCount: number;
  } | undefined>;
}

/**
 * Expected interface for credit operations
 */
export interface MailCreditService {
  /** Check if player has sufficient credits */
  hasCredits(playerId: ObjectId, amount: bigint): Promise<boolean>;

  /** Deduct credits from player */
  deductCredits(playerId: ObjectId, amount: bigint): Promise<boolean>;

  /** Add credits to player */
  addCredits(playerId: ObjectId, amount: bigint): Promise<boolean>;
}
