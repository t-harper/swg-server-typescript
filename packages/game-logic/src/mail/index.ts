/**
 * Mail Module
 * In-game mail system for sending messages, items, and credits between players
 */

// Mail types and constants
export {
  // Constants
  MAX_SUBJECT_LENGTH,
  MAX_BODY_LENGTH,
  MAX_ATTACHMENTS,
  MAIL_EXPIRY_DAYS,
  MAX_MAIL_CREDITS,
  // Enums
  MailStatus,
  MailResultCode,
  // Interfaces
  type Mail,
  type MailHeader,
  type MailAttachment,
  type MailSendRequest,
  type MailSendResult,
  type MailClaimResult,
  type MailRecord,
  type MailAttachmentRecord,
  type MailRepository,
  type MailInventoryService,
  type MailCreditService,
} from './mail-types.js';

// Mail manager
export {
  type MailManagerConfig,
  DEFAULT_MAIL_CONFIG,
  MailManager,
  createMailManager,
} from './mail-manager.js';

// Network messages
export {
  // Opcodes
  MailMessageOpcode,
  type MailMessageOpcodeType,
  // Client messages
  type SendMailMessage,
  type RequestMailMessage,
  type ReadMailMessage,
  type DeleteMailMessage,
  type ClaimAttachmentsMessage,
  type RequestUnreadCountMessage,
  // Server messages
  type SendMailResponseMessage,
  type MailListResponseMessage,
  type MailContentResponseMessage,
  type DeleteMailResponseMessage,
  type ClaimAttachmentsResponseMessage,
  type NewMailNotificationMessage,
  type UnreadCountResponseMessage,
  // Data types
  type MailHeaderData,
  type MailAttachmentData,
  // Union types
  type MailClientMessage,
  type MailServerMessage,
  type MailMessage,
  // Helper functions
  isMailMessageOpcode,
  createSendMailResponse,
  createMailListResponse,
  createMailNotFoundResponse,
  createMailContentResponse,
  createDeleteMailResponse,
  createClaimAttachmentsResponse,
  createNewMailNotification,
  createUnreadCountResponse,
  getMailResultMessage,
} from './mail-messages.js';
