/**
 * Mail Network Messages
 * Protocol message types for mail system client-server communication
 *
 * Note: These are game-logic level message types. The actual network
 * serialization/deserialization would be implemented in the protocol package
 * following the pattern of bazaar-messages.ts
 */

import type { ObjectId } from '@swg/shared-types';
import { MailStatus, MailResultCode, type MailHeader, type MailAttachment } from './mail-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Mail message opcodes
 */
export const MailMessageOpcode = {
  /** Client request to send mail */
  SendMail: 0xd2e15b1a,
  /** Server response to send mail request */
  SendMailResponse: 0xe3f26c2b,
  /** Client request to get mail list */
  RequestMail: 0xf4037d3c,
  /** Server response with mail list */
  MailListResponse: 0x05148e4d,
  /** Client request to read a specific mail */
  ReadMail: 0x16259f5e,
  /** Server response with mail content */
  MailContentResponse: 0x2736a06f,
  /** Client request to delete mail */
  DeleteMail: 0x3847b170,
  /** Server response to delete request */
  DeleteMailResponse: 0x4958c281,
  /** Client request to claim attachments */
  ClaimAttachments: 0x5a69d392,
  /** Server response to claim request */
  ClaimAttachmentsResponse: 0x6b7ae4a3,
  /** Server notification of new mail */
  NewMailNotification: 0x7c8bf5b4,
  /** Client request for unread count */
  RequestUnreadCount: 0x8d9c06c5,
  /** Server response with unread count */
  UnreadCountResponse: 0x9ead17d6,
} as const;

export type MailMessageOpcodeType =
  (typeof MailMessageOpcode)[keyof typeof MailMessageOpcode];

// ============================================
// Send Mail Messages
// ============================================

/**
 * SendMailMessage - Client request to send mail
 */
export interface SendMailMessage {
  opcode: typeof MailMessageOpcode.SendMail;
  /** Recipient character name (will be resolved to ID server-side) */
  recipientName: string;
  /** Mail subject line */
  subject: string;
  /** Mail body content */
  body: string;
  /** Array of item IDs to attach */
  attachments: ObjectId[];
  /** Credits to include */
  credits: bigint;
}

/**
 * SendMailResponseMessage - Server response to send mail request
 */
export interface SendMailResponseMessage {
  opcode: typeof MailMessageOpcode.SendMailResponse;
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  resultCode: MailResultCode;
  /** Mail ID if successful */
  mailId: bigint;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Request Mail Messages
// ============================================

/**
 * RequestMailMessage - Client request to get mail list
 */
export interface RequestMailMessage {
  opcode: typeof MailMessageOpcode.RequestMail;
  /** Whether to include deleted mail */
  includeDeleted: boolean;
}

/**
 * Mail header data for network transmission
 */
export interface MailHeaderData {
  mailId: bigint;
  senderName: string;
  subject: string;
  /** Unix timestamp in milliseconds */
  sentAt: bigint;
  status: MailStatus;
  hasAttachments: boolean;
  hasCredits: boolean;
}

/**
 * MailListResponseMessage - Server response with mail list
 */
export interface MailListResponseMessage {
  opcode: typeof MailMessageOpcode.MailListResponse;
  /** Total number of mail messages */
  totalCount: number;
  /** Array of mail headers */
  headers: MailHeaderData[];
}

// ============================================
// Read Mail Messages
// ============================================

/**
 * ReadMailMessage - Client request to read a specific mail
 */
export interface ReadMailMessage {
  opcode: typeof MailMessageOpcode.ReadMail;
  /** ID of the mail to read */
  mailId: bigint;
}

/**
 * Attachment data for network transmission
 */
export interface MailAttachmentData {
  objectId: bigint;
  templateCrc: number;
  itemName: string;
  stackCount: number;
}

/**
 * MailContentResponseMessage - Server response with mail content
 */
export interface MailContentResponseMessage {
  opcode: typeof MailMessageOpcode.MailContentResponse;
  /** Whether the mail was found */
  found: boolean;
  /** Mail ID */
  mailId: bigint;
  /** Sender ID (0 for system mail) */
  senderId: bigint;
  /** Sender display name */
  senderName: string;
  /** Recipient ID */
  recipientId: bigint;
  /** Recipient display name */
  recipientName: string;
  /** Mail subject line */
  subject: string;
  /** Mail body content */
  body: string;
  /** Array of attachment data */
  attachments: MailAttachmentData[];
  /** Credits included */
  credits: bigint;
  /** Unix timestamp in milliseconds when sent */
  sentAt: bigint;
  /** Unix timestamp in milliseconds when read (0 if unread) */
  readAt: bigint;
  /** Current mail status */
  status: MailStatus;
}

// ============================================
// Delete Mail Messages
// ============================================

/**
 * DeleteMailMessage - Client request to delete mail
 */
export interface DeleteMailMessage {
  opcode: typeof MailMessageOpcode.DeleteMail;
  /** ID of the mail to delete */
  mailId: bigint;
}

/**
 * DeleteMailResponseMessage - Server response to delete request
 */
export interface DeleteMailResponseMessage {
  opcode: typeof MailMessageOpcode.DeleteMailResponse;
  /** Whether the delete succeeded */
  success: boolean;
  /** The mail ID that was deleted */
  mailId: bigint;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Claim Attachments Messages
// ============================================

/**
 * ClaimAttachmentsMessage - Client request to claim attachments
 */
export interface ClaimAttachmentsMessage {
  opcode: typeof MailMessageOpcode.ClaimAttachments;
  /** ID of the mail to claim from */
  mailId: bigint;
}

/**
 * ClaimAttachmentsResponseMessage - Server response to claim request
 */
export interface ClaimAttachmentsResponseMessage {
  opcode: typeof MailMessageOpcode.ClaimAttachmentsResponse;
  /** Whether the claim succeeded */
  success: boolean;
  /** Result code */
  resultCode: MailResultCode;
  /** The mail ID */
  mailId: bigint;
  /** Array of item IDs that were claimed */
  claimedItems: bigint[];
  /** Credits that were claimed */
  claimedCredits: bigint;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Notification Messages
// ============================================

/**
 * NewMailNotificationMessage - Server notification of new mail
 * Sent to online players when they receive mail
 */
export interface NewMailNotificationMessage {
  opcode: typeof MailMessageOpcode.NewMailNotification;
  /** Mail ID of the new mail */
  mailId: bigint;
  /** Sender display name */
  senderName: string;
  /** Mail subject line */
  subject: string;
  /** Whether the mail has attachments */
  hasAttachments: boolean;
  /** Whether the mail has credits */
  hasCredits: boolean;
}

// ============================================
// Unread Count Messages
// ============================================

/**
 * RequestUnreadCountMessage - Client request for unread count
 */
export interface RequestUnreadCountMessage {
  opcode: typeof MailMessageOpcode.RequestUnreadCount;
}

/**
 * UnreadCountResponseMessage - Server response with unread count
 */
export interface UnreadCountResponseMessage {
  opcode: typeof MailMessageOpcode.UnreadCountResponse;
  /** Number of unread mail messages */
  unreadCount: number;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all mail client messages (sent from client to server)
 */
export type MailClientMessage =
  | SendMailMessage
  | RequestMailMessage
  | ReadMailMessage
  | DeleteMailMessage
  | ClaimAttachmentsMessage
  | RequestUnreadCountMessage;

/**
 * Union type of all mail server messages (sent from server to client)
 */
export type MailServerMessage =
  | SendMailResponseMessage
  | MailListResponseMessage
  | MailContentResponseMessage
  | DeleteMailResponseMessage
  | ClaimAttachmentsResponseMessage
  | NewMailNotificationMessage
  | UnreadCountResponseMessage;

/**
 * Union type of all mail messages
 */
export type MailMessage = MailClientMessage | MailServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid mail message opcode
 */
export function isMailMessageOpcode(
  opcode: number
): opcode is MailMessageOpcodeType {
  return Object.values(MailMessageOpcode).includes(
    opcode as MailMessageOpcodeType
  );
}

/**
 * Create a SendMailResponseMessage
 */
export function createSendMailResponse(
  success: boolean,
  resultCode: MailResultCode,
  mailId: bigint = 0n,
  errorMessage: string = ''
): SendMailResponseMessage {
  return {
    opcode: MailMessageOpcode.SendMailResponse,
    success,
    resultCode,
    mailId,
    errorMessage,
  };
}

/**
 * Create a MailListResponseMessage from headers
 */
export function createMailListResponse(
  headers: MailHeader[]
): MailListResponseMessage {
  return {
    opcode: MailMessageOpcode.MailListResponse,
    totalCount: headers.length,
    headers: headers.map((h) => ({
      mailId: h.mailId,
      senderName: h.senderName,
      subject: h.subject,
      sentAt: BigInt(h.sentAt.getTime()),
      status: h.status,
      hasAttachments: h.hasAttachments,
      hasCredits: h.hasCredits,
    })),
  };
}

/**
 * Create a MailContentResponseMessage for not found
 */
export function createMailNotFoundResponse(mailId: bigint): MailContentResponseMessage {
  return {
    opcode: MailMessageOpcode.MailContentResponse,
    found: false,
    mailId,
    senderId: 0n,
    senderName: '',
    recipientId: 0n,
    recipientName: '',
    subject: '',
    body: '',
    attachments: [],
    credits: 0n,
    sentAt: 0n,
    readAt: 0n,
    status: MailStatus.Unread,
  };
}

/**
 * Create a MailContentResponseMessage from mail data
 */
export function createMailContentResponse(
  mail: {
    mailId: bigint;
    senderId: ObjectId;
    senderName: string;
    recipientId: ObjectId;
    recipientName: string;
    subject: string;
    body: string;
    credits: bigint;
    sentAt: Date;
    readAt: Date | null;
    status: MailStatus;
  },
  attachments: MailAttachment[]
): MailContentResponseMessage {
  return {
    opcode: MailMessageOpcode.MailContentResponse,
    found: true,
    mailId: mail.mailId,
    senderId: mail.senderId,
    senderName: mail.senderName,
    recipientId: mail.recipientId,
    recipientName: mail.recipientName,
    subject: mail.subject,
    body: mail.body,
    attachments: attachments.map((a) => ({
      objectId: a.objectId,
      templateCrc: a.templateCrc,
      itemName: a.itemName,
      stackCount: a.stackCount,
    })),
    credits: mail.credits,
    sentAt: BigInt(mail.sentAt.getTime()),
    readAt: mail.readAt ? BigInt(mail.readAt.getTime()) : 0n,
    status: mail.status,
  };
}

/**
 * Create a DeleteMailResponseMessage
 */
export function createDeleteMailResponse(
  success: boolean,
  mailId: bigint,
  errorMessage: string = ''
): DeleteMailResponseMessage {
  return {
    opcode: MailMessageOpcode.DeleteMailResponse,
    success,
    mailId,
    errorMessage,
  };
}

/**
 * Create a ClaimAttachmentsResponseMessage
 */
export function createClaimAttachmentsResponse(
  success: boolean,
  resultCode: MailResultCode,
  mailId: bigint,
  claimedItems: ObjectId[] = [],
  claimedCredits: bigint = 0n,
  errorMessage: string = ''
): ClaimAttachmentsResponseMessage {
  return {
    opcode: MailMessageOpcode.ClaimAttachmentsResponse,
    success,
    resultCode,
    mailId,
    claimedItems: claimedItems.map((id) => id as bigint),
    claimedCredits,
    errorMessage,
  };
}

/**
 * Create a NewMailNotificationMessage
 */
export function createNewMailNotification(
  mailId: bigint,
  senderName: string,
  subject: string,
  hasAttachments: boolean,
  hasCredits: boolean
): NewMailNotificationMessage {
  return {
    opcode: MailMessageOpcode.NewMailNotification,
    mailId,
    senderName,
    subject,
    hasAttachments,
    hasCredits,
  };
}

/**
 * Create an UnreadCountResponseMessage
 */
export function createUnreadCountResponse(
  unreadCount: number
): UnreadCountResponseMessage {
  return {
    opcode: MailMessageOpcode.UnreadCountResponse,
    unreadCount,
  };
}

/**
 * Get result code message for display
 */
export function getMailResultMessage(resultCode: MailResultCode): string {
  switch (resultCode) {
    case MailResultCode.Success:
      return 'Mail operation completed successfully.';
    case MailResultCode.RecipientNotFound:
      return 'The recipient could not be found.';
    case MailResultCode.CannotMailSelf:
      return 'You cannot send mail to yourself.';
    case MailResultCode.SubjectTooLong:
      return 'The subject line is too long.';
    case MailResultCode.BodyTooLong:
      return 'The message body is too long.';
    case MailResultCode.TooManyAttachments:
      return 'Too many attachments.';
    case MailResultCode.InsufficientCredits:
      return 'Insufficient credits.';
    case MailResultCode.InvalidAttachment:
      return 'One or more attachments are invalid.';
    case MailResultCode.MailNotFound:
      return 'The mail could not be found.';
    case MailResultCode.NotAuthorized:
      return 'You are not authorized to access this mail.';
    case MailResultCode.AttachmentsAlreadyClaimed:
      return 'Attachments have already been claimed.';
    case MailResultCode.InboxFull:
      return 'The recipient\'s inbox is full.';
    case MailResultCode.ServerError:
    default:
      return 'A server error occurred. Please try again.';
  }
}
