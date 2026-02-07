/**
 * SWG Customer Service Messages
 * Protocol messages for the CS ticket system, knowledge base, and player connections.
 * Matches C++ sharedNetworkMessages/customerService/ wire format exactly.
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

// ============================================
// Data Structures
// ============================================

/**
 * CustomerServiceTicket - A support ticket
 * C++ Archive order: categoryId(u32) + subCategoryId(u32) + characterName(string)
 *   + details(Unicode) + language(string) + ticketId(u32) + modifiedDate(i64) + read(bool) + closed(bool)
 */
export interface CustomerServiceTicket {
  categoryId: number;
  subCategoryId: number;
  characterName: string;
  details: string;
  language: string;
  ticketId: number;
  modifiedDate: bigint;
  read: boolean;
  closed: boolean;
}

/**
 * CustomerServiceComment - A comment on a ticket
 * C++ Archive order: ticketId(u32) + commentId(u32) + fromCsr(bool) + comment(Unicode) + commentorName(string)
 */
export interface CustomerServiceComment {
  ticketId: number;
  commentId: number;
  fromCsr: boolean;
  comment: string;
  commentorName: string;
}

/**
 * CustomerServiceSearchResult - A knowledge base search result
 * C++ Archive order: title(Unicode) + id(string) + matchPercent(i16)
 */
export interface CustomerServiceSearchResult {
  title: string;
  id: string;
  matchPercent: number;
}

/**
 * CustomerServiceCategory - A ticket category with subcategories
 * C++ Archive order: categoryName(Unicode) + categoryId(i32) + subCategories(i32 count + recursive)
 *   + isBugType(bool) + isServiceType(bool)
 */
export interface CustomerServiceCategory {
  categoryName: string;
  categoryId: number;
  subCategories: CustomerServiceCategory[];
  isBugType: boolean;
  isServiceType: boolean;
}

// ============================================
// Data Structure Serialization Helpers
// ============================================

function writeTicket(writer: BufferWriter, ticket: CustomerServiceTicket): void {
  writer.writeUInt32LE(ticket.categoryId);
  writer.writeUInt32LE(ticket.subCategoryId);
  writer.writeStringWithLength16LE(ticket.characterName);
  writer.writeUnicodeStringWithLength(ticket.details);
  writer.writeStringWithLength16LE(ticket.language);
  writer.writeUInt32LE(ticket.ticketId);
  writer.writeUInt64LE(ticket.modifiedDate);
  writer.writeUInt8(ticket.read ? 1 : 0);
  writer.writeUInt8(ticket.closed ? 1 : 0);
}

function readTicket(reader: BufferReader): CustomerServiceTicket {
  const categoryId = reader.readUInt32LE();
  const subCategoryId = reader.readUInt32LE();
  const characterName = reader.readStringWithLength16LE();
  const details = reader.readUnicodeStringWithLength();
  const language = reader.readStringWithLength16LE();
  const ticketId = reader.readUInt32LE();
  const modifiedDate = reader.readUInt64LE();
  const read = reader.readUInt8() !== 0;
  const closed = reader.readUInt8() !== 0;
  return { categoryId, subCategoryId, characterName, details, language, ticketId, modifiedDate, read, closed };
}

function writeComment(writer: BufferWriter, comment: CustomerServiceComment): void {
  writer.writeUInt32LE(comment.ticketId);
  writer.writeUInt32LE(comment.commentId);
  writer.writeUInt8(comment.fromCsr ? 1 : 0);
  writer.writeUnicodeStringWithLength(comment.comment);
  writer.writeStringWithLength16LE(comment.commentorName);
}

function readComment(reader: BufferReader): CustomerServiceComment {
  const ticketId = reader.readUInt32LE();
  const commentId = reader.readUInt32LE();
  const fromCsr = reader.readUInt8() !== 0;
  const comment = reader.readUnicodeStringWithLength();
  const commentorName = reader.readStringWithLength16LE();
  return { ticketId, commentId, fromCsr, comment, commentorName };
}

function writeSearchResult(writer: BufferWriter, result: CustomerServiceSearchResult): void {
  writer.writeUnicodeStringWithLength(result.title);
  writer.writeStringWithLength16LE(result.id);
  writer.writeInt16LE(result.matchPercent);
}

function readSearchResult(reader: BufferReader): CustomerServiceSearchResult {
  const title = reader.readUnicodeStringWithLength();
  const id = reader.readStringWithLength16LE();
  const matchPercent = reader.readInt16LE();
  return { title, id, matchPercent };
}

function writeCategory(writer: BufferWriter, category: CustomerServiceCategory): void {
  writer.writeUnicodeStringWithLength(category.categoryName);
  writer.writeInt32LE(category.categoryId);
  writer.writeInt32LE(category.subCategories.length);
  for (const sub of category.subCategories) {
    writeCategory(writer, sub);
  }
  writer.writeUInt8(category.isBugType ? 1 : 0);
  writer.writeUInt8(category.isServiceType ? 1 : 0);
}

function readCategory(reader: BufferReader): CustomerServiceCategory {
  const categoryName = reader.readUnicodeStringWithLength();
  const categoryId = reader.readInt32LE();
  const subCount = reader.readInt32LE();
  const subCategories: CustomerServiceCategory[] = [];
  for (let i = 0; i < subCount; i++) {
    subCategories.push(readCategory(reader));
  }
  const isBugType = reader.readUInt8() !== 0;
  const isServiceType = reader.readUInt8() !== 0;
  return { categoryName, categoryId, subCategories, isBugType, isServiceType };
}

// ============================================
// Opcodes
// ============================================

export const CustomerServiceMessageOpcode = {
  /** Create a new support ticket */
  CreateTicketMessage: 0x2aad2ce6,
  /** Response to create ticket */
  CreateTicketResponseMessage: 0x6cd958a5,
  /** Cancel an existing ticket */
  CancelTicketMessage: 0x8f6d2702,
  /** Response to cancel ticket */
  CancelTicketResponseMessage: 0xc06b2996,
  /** Append a comment to a ticket */
  AppendCommentMessage: 0xeed962e0,
  /** Response to append comment */
  AppendCommentResponseMessage: 0x32a45eca,
  /** Request a list of tickets */
  GetTicketsMessage: 0xbcc921eb,
  /** Response with ticket list */
  GetTicketsResponseMessage: 0x5b28b348,
  /** Request comments for a ticket */
  GetCommentsMessage: 0xcb18d0c6,
  /** Response with comment list */
  GetCommentsResponseMessage: 0x69c206f7,
  /** Notify of new ticket activity */
  NewTicketActivityMessage: 0x5c1f5370,
  /** Response with new ticket activity status */
  NewTicketActivityResponseMessage: 0xbe86e200,
  /** Search the knowledge base */
  SearchKnowledgeBaseMessage: 0xf8eb7f42,
  /** Response with search results */
  SearchKnowledgeBaseResponseMessage: 0x7ad787b1,
  /** Request ticket categories */
  RequestCategoriesMessage: 0x946de8e1,
  /** Response with categories */
  RequestCategoriesResponseMessage: 0xe05142e5,
  /** Request a knowledge base article */
  GetArticleMessage: 0x8d287fa3,
  /** Response with article content */
  GetArticleResponseMessage: 0x93e3a1eb,
  /** Connect player to CS system */
  ConnectPlayerMessage: 0x3111397e,
  /** Response to connect player */
  ConnectPlayerResponseMessage: 0xdf623115,
  /** Disconnect player from CS system */
  DisconnectPlayerMessage: 0xec6765fd,
  /** Response to disconnect player */
  DisconnectPlayerResponseMessage: 0x4abd65db,
  /** Verify a player name for CS */
  VerifyPlayerNameMessage: 0x9575b1a5,
  /** Response to verify player name */
  VerifyPlayerNameResponseMessage: 0x292e8bd0,
} as const;

export type CustomerServiceMessageOpcodeType =
  (typeof CustomerServiceMessageOpcode)[keyof typeof CustomerServiceMessageOpcode];

// ============================================
// CreateTicketMessage (0x2AAD2CE6)
// ============================================

/**
 * CreateTicketMessage - Client creates a new support ticket
 * C++ addVariable order: characterName(string) + category(u32) + subCategory(u32)
 *   + details(Unicode) + hiddenDetails(Unicode) + harassingPlayerName(Unicode)
 *   + language(string) + stationId(u32) + isBug(bool)
 */
export interface CreateTicketMessage {
  opcode: typeof CustomerServiceMessageOpcode.CreateTicketMessage;
  characterName: string;
  category: number;
  subCategory: number;
  details: string;
  hiddenDetails: string;
  harassingPlayerName: string;
  language: string;
  stationId: number;
  isBug: boolean;
}

export function serializeCreateTicketMessage(message: CreateTicketMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(9); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.characterName);
  writer.writeUInt32LE(message.category);
  writer.writeUInt32LE(message.subCategory);
  writer.writeUnicodeStringWithLength(message.details);
  writer.writeUnicodeStringWithLength(message.hiddenDetails);
  writer.writeUnicodeStringWithLength(message.harassingPlayerName);
  writer.writeStringWithLength16LE(message.language);
  writer.writeUInt32LE(message.stationId);
  writer.writeUInt8(message.isBug ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeCreateTicketMessage(data: Uint8Array): CreateTicketMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.CreateTicketMessage) {
    throw new Error(`Invalid opcode for CreateTicketMessage: 0x${opcode.toString(16)}`);
  }
  const characterName = reader.readStringWithLength16LE();
  const category = reader.readUInt32LE();
  const subCategory = reader.readUInt32LE();
  const details = reader.readUnicodeStringWithLength();
  const hiddenDetails = reader.readUnicodeStringWithLength();
  const harassingPlayerName = reader.readUnicodeStringWithLength();
  const language = reader.readStringWithLength16LE();
  const stationId = reader.readUInt32LE();
  const isBug = reader.readUInt8() !== 0;
  return {
    opcode: CustomerServiceMessageOpcode.CreateTicketMessage,
    characterName, category, subCategory, details, hiddenDetails,
    harassingPlayerName, language, stationId, isBug,
  };
}

export function createCreateTicketMessage(
  characterName: string,
  category: number,
  subCategory: number,
  details: string,
  language: string,
  hiddenDetails: string = '',
  harassingPlayerName: string = '',
  stationId: number = 0,
  isBug: boolean = false,
): CreateTicketMessage {
  return {
    opcode: CustomerServiceMessageOpcode.CreateTicketMessage,
    characterName, category, subCategory, details, hiddenDetails,
    harassingPlayerName, language, stationId, isBug,
  };
}

// ============================================
// CreateTicketResponseMessage (0x6CD958A5)
// ============================================

/**
 * CreateTicketResponseMessage - Server response to ticket creation
 * C++ addVariable order: result(i32) + ticketId(u32)
 */
export interface CreateTicketResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.CreateTicketResponseMessage;
  result: number;
  ticketId: number;
}

export function serializeCreateTicketResponseMessage(message: CreateTicketResponseMessage): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  writer.writeUInt32LE(message.ticketId);
  return writer.toBuffer();
}

export function deserializeCreateTicketResponseMessage(data: Uint8Array): CreateTicketResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.CreateTicketResponseMessage) {
    throw new Error(`Invalid opcode for CreateTicketResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const ticketId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.CreateTicketResponseMessage, result, ticketId };
}

export function createCreateTicketResponseMessage(
  result: number,
  ticketId: number,
): CreateTicketResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.CreateTicketResponseMessage, result, ticketId };
}

// ============================================
// CancelTicketMessage (0x8F6D2702)
// ============================================

/**
 * CancelTicketMessage - Client cancels a ticket
 * C++ addVariable order: ticketId(u32) + comment(Unicode) + stationId(u32)
 */
export interface CancelTicketMessage {
  opcode: typeof CustomerServiceMessageOpcode.CancelTicketMessage;
  ticketId: number;
  comment: string;
  stationId: number;
}

export function serializeCancelTicketMessage(message: CancelTicketMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.ticketId);
  writer.writeUnicodeStringWithLength(message.comment);
  writer.writeUInt32LE(message.stationId);
  return writer.toBuffer();
}

export function deserializeCancelTicketMessage(data: Uint8Array): CancelTicketMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.CancelTicketMessage) {
    throw new Error(`Invalid opcode for CancelTicketMessage: 0x${opcode.toString(16)}`);
  }
  const ticketId = reader.readUInt32LE();
  const comment = reader.readUnicodeStringWithLength();
  const stationId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.CancelTicketMessage, ticketId, comment, stationId };
}

export function createCancelTicketMessage(
  ticketId: number,
  comment: string,
  stationId: number = 0,
): CancelTicketMessage {
  return { opcode: CustomerServiceMessageOpcode.CancelTicketMessage, ticketId, comment, stationId };
}

// ============================================
// CancelTicketResponseMessage (0xC06B2996)
// ============================================

/**
 * CancelTicketResponseMessage - Server response to ticket cancellation
 * C++ addVariable order: result(i32) + ticketId(u32)
 */
export interface CancelTicketResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.CancelTicketResponseMessage;
  result: number;
  ticketId: number;
}

export function serializeCancelTicketResponseMessage(message: CancelTicketResponseMessage): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  writer.writeUInt32LE(message.ticketId);
  return writer.toBuffer();
}

export function deserializeCancelTicketResponseMessage(data: Uint8Array): CancelTicketResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.CancelTicketResponseMessage) {
    throw new Error(`Invalid opcode for CancelTicketResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const ticketId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.CancelTicketResponseMessage, result, ticketId };
}

export function createCancelTicketResponseMessage(
  result: number,
  ticketId: number,
): CancelTicketResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.CancelTicketResponseMessage, result, ticketId };
}

// ============================================
// AppendCommentMessage (0xEED962E0)
// ============================================

/**
 * AppendCommentMessage - Client appends a comment to a ticket
 * C++ addVariable order: ticketId(u32) + characterName(string) + comment(Unicode) + stationId(u32)
 */
export interface AppendCommentMessage {
  opcode: typeof CustomerServiceMessageOpcode.AppendCommentMessage;
  ticketId: number;
  characterName: string;
  comment: string;
  stationId: number;
}

export function serializeAppendCommentMessage(message: AppendCommentMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.ticketId);
  writer.writeStringWithLength16LE(message.characterName);
  writer.writeUnicodeStringWithLength(message.comment);
  writer.writeUInt32LE(message.stationId);
  return writer.toBuffer();
}

export function deserializeAppendCommentMessage(data: Uint8Array): AppendCommentMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.AppendCommentMessage) {
    throw new Error(`Invalid opcode for AppendCommentMessage: 0x${opcode.toString(16)}`);
  }
  const ticketId = reader.readUInt32LE();
  const characterName = reader.readStringWithLength16LE();
  const comment = reader.readUnicodeStringWithLength();
  const stationId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.AppendCommentMessage, ticketId, characterName, comment, stationId };
}

export function createAppendCommentMessage(
  ticketId: number,
  characterName: string,
  comment: string,
  stationId: number = 0,
): AppendCommentMessage {
  return { opcode: CustomerServiceMessageOpcode.AppendCommentMessage, ticketId, characterName, comment, stationId };
}

// ============================================
// AppendCommentResponseMessage (0x32A45ECA)
// ============================================

/**
 * AppendCommentResponseMessage - Server response to append comment
 * C++ addVariable order: result(i32) + ticketId(u32)
 */
export interface AppendCommentResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.AppendCommentResponseMessage;
  result: number;
  ticketId: number;
}

export function serializeAppendCommentResponseMessage(message: AppendCommentResponseMessage): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  writer.writeUInt32LE(message.ticketId);
  return writer.toBuffer();
}

export function deserializeAppendCommentResponseMessage(data: Uint8Array): AppendCommentResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.AppendCommentResponseMessage) {
    throw new Error(`Invalid opcode for AppendCommentResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const ticketId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.AppendCommentResponseMessage, result, ticketId };
}

export function createAppendCommentResponseMessage(
  result: number,
  ticketId: number,
): AppendCommentResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.AppendCommentResponseMessage, result, ticketId };
}

// ============================================
// GetTicketsMessage (0xBCC921EB)
// ============================================

/**
 * GetTicketsMessage - Client requests ticket list
 * C++ addVariable order: start(u32) + count(u32) + stationId(u32)
 */
export interface GetTicketsMessage {
  opcode: typeof CustomerServiceMessageOpcode.GetTicketsMessage;
  start: number;
  count: number;
  stationId: number;
}

export function serializeGetTicketsMessage(message: GetTicketsMessage): Uint8Array {
  const writer = new BufferWriter(18);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.start);
  writer.writeUInt32LE(message.count);
  writer.writeUInt32LE(message.stationId);
  return writer.toBuffer();
}

export function deserializeGetTicketsMessage(data: Uint8Array): GetTicketsMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.GetTicketsMessage) {
    throw new Error(`Invalid opcode for GetTicketsMessage: 0x${opcode.toString(16)}`);
  }
  const start = reader.readUInt32LE();
  const count = reader.readUInt32LE();
  const stationId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.GetTicketsMessage, start, count, stationId };
}

export function createGetTicketsMessage(
  start: number,
  count: number,
  stationId: number = 0,
): GetTicketsMessage {
  return { opcode: CustomerServiceMessageOpcode.GetTicketsMessage, start, count, stationId };
}

// ============================================
// GetTicketsResponseMessage (0x5B28B348)
// ============================================

/**
 * GetTicketsResponseMessage - Server response with ticket list
 * C++ addVariable order: result(i32) + totalNumTickets(u32) + tickets(AutoArray<CustomerServiceTicket>)
 */
export interface GetTicketsResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.GetTicketsResponseMessage;
  result: number;
  totalNumTickets: number;
  tickets: CustomerServiceTicket[];
}

export function serializeGetTicketsResponseMessage(message: GetTicketsResponseMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  writer.writeUInt32LE(message.totalNumTickets);
  // AutoArray: u32 count + elements
  writer.writeUInt32LE(message.tickets.length);
  for (const ticket of message.tickets) {
    writeTicket(writer, ticket);
  }
  return writer.toBuffer();
}

export function deserializeGetTicketsResponseMessage(data: Uint8Array): GetTicketsResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.GetTicketsResponseMessage) {
    throw new Error(`Invalid opcode for GetTicketsResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const totalNumTickets = reader.readUInt32LE();
  const ticketCount = reader.readUInt32LE();
  const tickets: CustomerServiceTicket[] = [];
  for (let i = 0; i < ticketCount; i++) {
    tickets.push(readTicket(reader));
  }
  return { opcode: CustomerServiceMessageOpcode.GetTicketsResponseMessage, result, totalNumTickets, tickets };
}

export function createGetTicketsResponseMessage(
  result: number,
  totalNumTickets: number,
  tickets: CustomerServiceTicket[],
): GetTicketsResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.GetTicketsResponseMessage, result, totalNumTickets, tickets };
}

// ============================================
// GetCommentsMessage (0xCB18D0C6)
// ============================================

/**
 * GetCommentsMessage - Client requests comments for a ticket
 * C++ addVariable order: ticketId(u32)
 */
export interface GetCommentsMessage {
  opcode: typeof CustomerServiceMessageOpcode.GetCommentsMessage;
  ticketId: number;
}

export function serializeGetCommentsMessage(message: GetCommentsMessage): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.ticketId);
  return writer.toBuffer();
}

export function deserializeGetCommentsMessage(data: Uint8Array): GetCommentsMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.GetCommentsMessage) {
    throw new Error(`Invalid opcode for GetCommentsMessage: 0x${opcode.toString(16)}`);
  }
  const ticketId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.GetCommentsMessage, ticketId };
}

export function createGetCommentsMessage(ticketId: number): GetCommentsMessage {
  return { opcode: CustomerServiceMessageOpcode.GetCommentsMessage, ticketId };
}

// ============================================
// GetCommentsResponseMessage (0x69C206F7)
// ============================================

/**
 * GetCommentsResponseMessage - Server response with comments
 * C++ addVariable order: result(i32) + comments(AutoArray<CustomerServiceComment>)
 */
export interface GetCommentsResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.GetCommentsResponseMessage;
  result: number;
  comments: CustomerServiceComment[];
}

export function serializeGetCommentsResponseMessage(message: GetCommentsResponseMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  // AutoArray: u32 count + elements
  writer.writeUInt32LE(message.comments.length);
  for (const comment of message.comments) {
    writeComment(writer, comment);
  }
  return writer.toBuffer();
}

export function deserializeGetCommentsResponseMessage(data: Uint8Array): GetCommentsResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.GetCommentsResponseMessage) {
    throw new Error(`Invalid opcode for GetCommentsResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const commentCount = reader.readUInt32LE();
  const comments: CustomerServiceComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    comments.push(readComment(reader));
  }
  return { opcode: CustomerServiceMessageOpcode.GetCommentsResponseMessage, result, comments };
}

export function createGetCommentsResponseMessage(
  result: number,
  comments: CustomerServiceComment[],
): GetCommentsResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.GetCommentsResponseMessage, result, comments };
}

// ============================================
// NewTicketActivityMessage (0x5C1F5370)
// ============================================

/**
 * NewTicketActivityMessage - Client requests new ticket activity check
 * C++ addVariable order: stationId(u32)
 */
export interface NewTicketActivityMessage {
  opcode: typeof CustomerServiceMessageOpcode.NewTicketActivityMessage;
  stationId: number;
}

export function serializeNewTicketActivityMessage(message: NewTicketActivityMessage): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.stationId);
  return writer.toBuffer();
}

export function deserializeNewTicketActivityMessage(data: Uint8Array): NewTicketActivityMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.NewTicketActivityMessage) {
    throw new Error(`Invalid opcode for NewTicketActivityMessage: 0x${opcode.toString(16)}`);
  }
  const stationId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.NewTicketActivityMessage, stationId };
}

export function createNewTicketActivityMessage(stationId: number = 0): NewTicketActivityMessage {
  return { opcode: CustomerServiceMessageOpcode.NewTicketActivityMessage, stationId };
}

// ============================================
// NewTicketActivityResponseMessage (0xBE86E200)
// ============================================

/**
 * NewTicketActivityResponseMessage - Server response with activity status
 * C++ addVariable order: newActivity(bool) + ticketCount(u32)
 */
export interface NewTicketActivityResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.NewTicketActivityResponseMessage;
  newActivity: boolean;
  ticketCount: number;
}

export function serializeNewTicketActivityResponseMessage(message: NewTicketActivityResponseMessage): Uint8Array {
  const writer = new BufferWriter(11);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt8(message.newActivity ? 1 : 0);
  writer.writeUInt32LE(message.ticketCount);
  return writer.toBuffer();
}

export function deserializeNewTicketActivityResponseMessage(data: Uint8Array): NewTicketActivityResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.NewTicketActivityResponseMessage) {
    throw new Error(`Invalid opcode for NewTicketActivityResponseMessage: 0x${opcode.toString(16)}`);
  }
  const newActivity = reader.readUInt8() !== 0;
  const ticketCount = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.NewTicketActivityResponseMessage, newActivity, ticketCount };
}

export function createNewTicketActivityResponseMessage(
  newActivity: boolean,
  ticketCount: number,
): NewTicketActivityResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.NewTicketActivityResponseMessage, newActivity, ticketCount };
}

// ============================================
// SearchKnowledgeBaseMessage (0xF8EB7F42)
// ============================================

/**
 * SearchKnowledgeBaseMessage - Client searches the knowledge base
 * C++ addVariable order: searchString(Unicode) + language(string)
 */
export interface SearchKnowledgeBaseMessage {
  opcode: typeof CustomerServiceMessageOpcode.SearchKnowledgeBaseMessage;
  searchString: string;
  language: string;
}

export function serializeSearchKnowledgeBaseMessage(message: SearchKnowledgeBaseMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.searchString);
  writer.writeStringWithLength16LE(message.language);
  return writer.toBuffer();
}

export function deserializeSearchKnowledgeBaseMessage(data: Uint8Array): SearchKnowledgeBaseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.SearchKnowledgeBaseMessage) {
    throw new Error(`Invalid opcode for SearchKnowledgeBaseMessage: 0x${opcode.toString(16)}`);
  }
  const searchString = reader.readUnicodeStringWithLength();
  const language = reader.readStringWithLength16LE();
  return { opcode: CustomerServiceMessageOpcode.SearchKnowledgeBaseMessage, searchString, language };
}

export function createSearchKnowledgeBaseMessage(
  searchString: string,
  language: string,
): SearchKnowledgeBaseMessage {
  return { opcode: CustomerServiceMessageOpcode.SearchKnowledgeBaseMessage, searchString, language };
}

// ============================================
// SearchKnowledgeBaseResponseMessage (0x7AD787B1)
// ============================================

/**
 * SearchKnowledgeBaseResponseMessage - Server response with search results
 * C++ addVariable order: result(i32) + searchResults(AutoArray<CustomerServiceSearchResult>)
 */
export interface SearchKnowledgeBaseResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.SearchKnowledgeBaseResponseMessage;
  result: number;
  searchResults: CustomerServiceSearchResult[];
}

export function serializeSearchKnowledgeBaseResponseMessage(message: SearchKnowledgeBaseResponseMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  // AutoArray: u32 count + elements
  writer.writeUInt32LE(message.searchResults.length);
  for (const sr of message.searchResults) {
    writeSearchResult(writer, sr);
  }
  return writer.toBuffer();
}

export function deserializeSearchKnowledgeBaseResponseMessage(data: Uint8Array): SearchKnowledgeBaseResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.SearchKnowledgeBaseResponseMessage) {
    throw new Error(`Invalid opcode for SearchKnowledgeBaseResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const searchResultCount = reader.readUInt32LE();
  const searchResults: CustomerServiceSearchResult[] = [];
  for (let i = 0; i < searchResultCount; i++) {
    searchResults.push(readSearchResult(reader));
  }
  return { opcode: CustomerServiceMessageOpcode.SearchKnowledgeBaseResponseMessage, result, searchResults };
}

export function createSearchKnowledgeBaseResponseMessage(
  result: number,
  searchResults: CustomerServiceSearchResult[],
): SearchKnowledgeBaseResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.SearchKnowledgeBaseResponseMessage, result, searchResults };
}

// ============================================
// RequestCategoriesMessage (0x946DE8E1)
// ============================================

/**
 * RequestCategoriesMessage - Client requests ticket categories
 * C++ addVariable order: language(string)
 */
export interface RequestCategoriesMessage {
  opcode: typeof CustomerServiceMessageOpcode.RequestCategoriesMessage;
  language: string;
}

export function serializeRequestCategoriesMessage(message: RequestCategoriesMessage): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.language);
  return writer.toBuffer();
}

export function deserializeRequestCategoriesMessage(data: Uint8Array): RequestCategoriesMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.RequestCategoriesMessage) {
    throw new Error(`Invalid opcode for RequestCategoriesMessage: 0x${opcode.toString(16)}`);
  }
  const language = reader.readStringWithLength16LE();
  return { opcode: CustomerServiceMessageOpcode.RequestCategoriesMessage, language };
}

export function createRequestCategoriesMessage(language: string): RequestCategoriesMessage {
  return { opcode: CustomerServiceMessageOpcode.RequestCategoriesMessage, language };
}

// ============================================
// RequestCategoriesResponseMessage (0xE05142E5)
// ============================================

/**
 * RequestCategoriesResponseMessage - Server response with categories
 * C++ addVariable order: result(i32) + categories(AutoArray<CustomerServiceCategory>)
 */
export interface RequestCategoriesResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.RequestCategoriesResponseMessage;
  result: number;
  categories: CustomerServiceCategory[];
}

export function serializeRequestCategoriesResponseMessage(message: RequestCategoriesResponseMessage): Uint8Array {
  const writer = new BufferWriter(1024);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  // AutoArray: u32 count + elements
  writer.writeUInt32LE(message.categories.length);
  for (const cat of message.categories) {
    writeCategory(writer, cat);
  }
  return writer.toBuffer();
}

export function deserializeRequestCategoriesResponseMessage(data: Uint8Array): RequestCategoriesResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.RequestCategoriesResponseMessage) {
    throw new Error(`Invalid opcode for RequestCategoriesResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const categoryCount = reader.readUInt32LE();
  const categories: CustomerServiceCategory[] = [];
  for (let i = 0; i < categoryCount; i++) {
    categories.push(readCategory(reader));
  }
  return { opcode: CustomerServiceMessageOpcode.RequestCategoriesResponseMessage, result, categories };
}

export function createRequestCategoriesResponseMessage(
  result: number,
  categories: CustomerServiceCategory[],
): RequestCategoriesResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.RequestCategoriesResponseMessage, result, categories };
}

// ============================================
// GetArticleMessage (0x8D287FA3)
// ============================================

/**
 * GetArticleMessage - Client requests a knowledge base article
 * C++ addVariable order: id(string) + language(string)
 */
export interface GetArticleMessage {
  opcode: typeof CustomerServiceMessageOpcode.GetArticleMessage;
  id: string;
  language: string;
}

export function serializeGetArticleMessage(message: GetArticleMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.id);
  writer.writeStringWithLength16LE(message.language);
  return writer.toBuffer();
}

export function deserializeGetArticleMessage(data: Uint8Array): GetArticleMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.GetArticleMessage) {
    throw new Error(`Invalid opcode for GetArticleMessage: 0x${opcode.toString(16)}`);
  }
  const id = reader.readStringWithLength16LE();
  const language = reader.readStringWithLength16LE();
  return { opcode: CustomerServiceMessageOpcode.GetArticleMessage, id, language };
}

export function createGetArticleMessage(id: string, language: string): GetArticleMessage {
  return { opcode: CustomerServiceMessageOpcode.GetArticleMessage, id, language };
}

// ============================================
// GetArticleResponseMessage (0x93E3A1EB)
// ============================================

/**
 * GetArticleResponseMessage - Server response with article content
 * C++ addVariable order: result(i32) + article(Unicode)
 */
export interface GetArticleResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.GetArticleResponseMessage;
  result: number;
  article: string;
}

export function serializeGetArticleResponseMessage(message: GetArticleResponseMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  writer.writeUnicodeStringWithLength(message.article);
  return writer.toBuffer();
}

export function deserializeGetArticleResponseMessage(data: Uint8Array): GetArticleResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.GetArticleResponseMessage) {
    throw new Error(`Invalid opcode for GetArticleResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  const article = reader.readUnicodeStringWithLength();
  return { opcode: CustomerServiceMessageOpcode.GetArticleResponseMessage, result, article };
}

export function createGetArticleResponseMessage(
  result: number,
  article: string,
): GetArticleResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.GetArticleResponseMessage, result, article };
}

// ============================================
// ConnectPlayerMessage (0x3111397E)
// ============================================

/**
 * ConnectPlayerMessage - Connect player to CS system
 * C++ addVariable order: stationId(u32)
 */
export interface ConnectPlayerMessage {
  opcode: typeof CustomerServiceMessageOpcode.ConnectPlayerMessage;
  stationId: number;
}

export function serializeConnectPlayerMessage(message: ConnectPlayerMessage): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.stationId);
  return writer.toBuffer();
}

export function deserializeConnectPlayerMessage(data: Uint8Array): ConnectPlayerMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.ConnectPlayerMessage) {
    throw new Error(`Invalid opcode for ConnectPlayerMessage: 0x${opcode.toString(16)}`);
  }
  const stationId = reader.readUInt32LE();
  return { opcode: CustomerServiceMessageOpcode.ConnectPlayerMessage, stationId };
}

export function createConnectPlayerMessage(stationId: number = 0): ConnectPlayerMessage {
  return { opcode: CustomerServiceMessageOpcode.ConnectPlayerMessage, stationId };
}

// ============================================
// ConnectPlayerResponseMessage (0xDF623115)
// ============================================

/**
 * ConnectPlayerResponseMessage - Server response to connect player
 * C++ addVariable order: result(i32)
 */
export interface ConnectPlayerResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.ConnectPlayerResponseMessage;
  result: number;
}

export function serializeConnectPlayerResponseMessage(message: ConnectPlayerResponseMessage): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  return writer.toBuffer();
}

export function deserializeConnectPlayerResponseMessage(data: Uint8Array): ConnectPlayerResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.ConnectPlayerResponseMessage) {
    throw new Error(`Invalid opcode for ConnectPlayerResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  return { opcode: CustomerServiceMessageOpcode.ConnectPlayerResponseMessage, result };
}

export function createConnectPlayerResponseMessage(result: number): ConnectPlayerResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.ConnectPlayerResponseMessage, result };
}

// ============================================
// DisconnectPlayerMessage (0xEC6765FD)
// ============================================

/**
 * DisconnectPlayerMessage - Disconnect player from CS system
 * C++ has no addVariable calls - empty payload
 */
export interface DisconnectPlayerMessage {
  opcode: typeof CustomerServiceMessageOpcode.DisconnectPlayerMessage;
}

export function serializeDisconnectPlayerMessage(): Uint8Array {
  const writer = new BufferWriter(6);
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(CustomerServiceMessageOpcode.DisconnectPlayerMessage);
  return writer.toBuffer();
}

export function deserializeDisconnectPlayerMessage(data: Uint8Array): DisconnectPlayerMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.DisconnectPlayerMessage) {
    throw new Error(`Invalid opcode for DisconnectPlayerMessage: 0x${opcode.toString(16)}`);
  }
  return { opcode: CustomerServiceMessageOpcode.DisconnectPlayerMessage };
}

export function createDisconnectPlayerMessage(): DisconnectPlayerMessage {
  return { opcode: CustomerServiceMessageOpcode.DisconnectPlayerMessage };
}

// ============================================
// DisconnectPlayerResponseMessage (0x4ABD65DB)
// ============================================

/**
 * DisconnectPlayerResponseMessage - Server response to disconnect player
 * C++ addVariable order: result(i32)
 */
export interface DisconnectPlayerResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.DisconnectPlayerResponseMessage;
  result: number;
}

export function serializeDisconnectPlayerResponseMessage(message: DisconnectPlayerResponseMessage): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.result);
  return writer.toBuffer();
}

export function deserializeDisconnectPlayerResponseMessage(data: Uint8Array): DisconnectPlayerResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.DisconnectPlayerResponseMessage) {
    throw new Error(`Invalid opcode for DisconnectPlayerResponseMessage: 0x${opcode.toString(16)}`);
  }
  const result = reader.readInt32LE();
  return { opcode: CustomerServiceMessageOpcode.DisconnectPlayerResponseMessage, result };
}

export function createDisconnectPlayerResponseMessage(result: number): DisconnectPlayerResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.DisconnectPlayerResponseMessage, result };
}

// ============================================
// VerifyPlayerNameMessage (0x9575B1A5)
// ============================================

/**
 * VerifyPlayerNameMessage - Verify a player name exists (for CS harassing player lookup)
 * C++ addVariable order: playerName(Unicode) + sourceNetworkId(NetworkId/i64)
 */
export interface VerifyPlayerNameMessage {
  opcode: typeof CustomerServiceMessageOpcode.VerifyPlayerNameMessage;
  playerName: string;
  sourceNetworkId: bigint;
}

export function serializeVerifyPlayerNameMessage(message: VerifyPlayerNameMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.playerName);
  writer.writeUInt64LE(message.sourceNetworkId);
  return writer.toBuffer();
}

export function deserializeVerifyPlayerNameMessage(data: Uint8Array): VerifyPlayerNameMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.VerifyPlayerNameMessage) {
    throw new Error(`Invalid opcode for VerifyPlayerNameMessage: 0x${opcode.toString(16)}`);
  }
  const playerName = reader.readUnicodeStringWithLength();
  const sourceNetworkId = reader.readUInt64LE();
  return { opcode: CustomerServiceMessageOpcode.VerifyPlayerNameMessage, playerName, sourceNetworkId };
}

export function createVerifyPlayerNameMessage(
  playerName: string,
  sourceNetworkId: bigint,
): VerifyPlayerNameMessage {
  return { opcode: CustomerServiceMessageOpcode.VerifyPlayerNameMessage, playerName, sourceNetworkId };
}

// ============================================
// VerifyPlayerNameResponseMessage (0x292E8BD0)
// ============================================

/**
 * VerifyPlayerNameResponseMessage - Server response to player name verification
 * C++ addVariable order: valid(bool) + playerName(Unicode)
 */
export interface VerifyPlayerNameResponseMessage {
  opcode: typeof CustomerServiceMessageOpcode.VerifyPlayerNameResponseMessage;
  valid: boolean;
  playerName: string;
}

export function serializeVerifyPlayerNameResponseMessage(message: VerifyPlayerNameResponseMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt8(message.valid ? 1 : 0);
  writer.writeUnicodeStringWithLength(message.playerName);
  return writer.toBuffer();
}

export function deserializeVerifyPlayerNameResponseMessage(data: Uint8Array): VerifyPlayerNameResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== CustomerServiceMessageOpcode.VerifyPlayerNameResponseMessage) {
    throw new Error(`Invalid opcode for VerifyPlayerNameResponseMessage: 0x${opcode.toString(16)}`);
  }
  const valid = reader.readUInt8() !== 0;
  const playerName = reader.readUnicodeStringWithLength();
  return { opcode: CustomerServiceMessageOpcode.VerifyPlayerNameResponseMessage, valid, playerName };
}

export function createVerifyPlayerNameResponseMessage(
  valid: boolean,
  playerName: string,
): VerifyPlayerNameResponseMessage {
  return { opcode: CustomerServiceMessageOpcode.VerifyPlayerNameResponseMessage, valid, playerName };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all customer service messages
 */
export type CustomerServiceMessage =
  | CreateTicketMessage
  | CreateTicketResponseMessage
  | CancelTicketMessage
  | CancelTicketResponseMessage
  | AppendCommentMessage
  | AppendCommentResponseMessage
  | GetTicketsMessage
  | GetTicketsResponseMessage
  | GetCommentsMessage
  | GetCommentsResponseMessage
  | NewTicketActivityMessage
  | NewTicketActivityResponseMessage
  | SearchKnowledgeBaseMessage
  | SearchKnowledgeBaseResponseMessage
  | RequestCategoriesMessage
  | RequestCategoriesResponseMessage
  | GetArticleMessage
  | GetArticleResponseMessage
  | ConnectPlayerMessage
  | ConnectPlayerResponseMessage
  | DisconnectPlayerMessage
  | DisconnectPlayerResponseMessage
  | VerifyPlayerNameMessage
  | VerifyPlayerNameResponseMessage;

/**
 * Get the opcode from raw customer service message data
 */
export function getCustomerServiceMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid customer service message opcode
 */
export function isCustomerServiceMessageOpcode(
  opcode: number,
): opcode is CustomerServiceMessageOpcodeType {
  return Object.values(CustomerServiceMessageOpcode).includes(
    opcode as CustomerServiceMessageOpcodeType,
  );
}
