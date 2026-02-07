import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================================================
// Enums
// ============================================================================

export enum AuctionResult {
  ar_OK = 0,
  ar_INVALID_AUCTIONER = 1,
  ar_INVALID_ITEM_ID = 2,
  ar_INVALID_CONTAINER_ID = 3,
  ar_INVALID_MINIMUM_BID = 4,
  ar_INVALID_AUCTION_LENGTH = 5,
  ar_ITEM_ALREADY_AUCTIONED = 6,
  ar_ITEM_NOT_IN_CONTAINER = 7,
  ar_NOT_ITEM_OWNER = 8,
  ar_NOT_ENOUGH_MONEY = 9,
  ar_INVALID_BID = 10,
  ar_BID_REJECTED = 11,
  ar_INVENTORY_FULL = 12,
  ar_TOO_MANY_AUCTIONS = 13,
  ar_BID_TOO_HIGH = 14,
  ar_AUCTION_ALREADY_COMPLETED = 15,
  ar_VENDOR_DEACTIVATED = 16,
  ar_ITEM_NOLONGER_EXISTS = 17,
  ar_INVALID_ITEM_REIMBURSAL = 18,
  ar_IN_TRADE = 19,
  ar_IN_CRATE = 20,
  ar_NOT_ALLOWED = 21,
  ar_NOT_EMPTY = 22,
  ar_BID_OUTBID = 23,
  ar_TOO_MANY_VENDORS = 24,
  ar_TOO_MANY_VENDOR_ITEMS = 25,
  ar_IS_BIOLINKED = 26,
  ar_ITEM_EQUIPPED = 27,
  ar_ITEM_RESTRICTED = 28,
  ar_PRICE_TOO_HIGH = 29,
}

export enum VendorOwnerResult {
  vor_IsOwner = 0,
  vor_IsNotOwner = 1,
  vor_HasNoOwner = 2,
}

export enum SearchConditionComparison {
  SCC_int = 0,
  SCC_float = 1,
  SCC_string_equal = 2,
  SCC_string_not_equal = 3,
  SCC_string_contain = 4,
  SCC_string_not_contain = 5,
}

// ============================================================================
// Opcodes
// ============================================================================

export const AuctionOpcodes = {
  CreateAuctionMessage: 0x50a80ba6,
  CreateAuctionResponseMessage: 0xe61cc73a,
  CreateImmediateAuctionMessage: 0x1e9a6c46,
  BidAuctionMessage: 0x9164e40b,
  BidAuctionResponseMessage: 0xc58a446a,
  CancelLiveAuctionMessage: 0x5e34ac52,
  CancelLiveAuctionResponseMessage: 0x7da2e64c,
  RetrieveAuctionItemMessage: 0x340ab5e2,
  RetrieveAuctionItemResponseMessage: 0x9499e5b8,
  GetAuctionDetails: 0xd36effc0,
  GetAuctionDetailsResponse: 0xfe0e644b,
  IsVendorOwnerMessage: 0x21b55a3b,
  IsVendorOwnerResponseMessage: 0x0a4c01a7,
  AcceptAuctionMessage: 0x5846eeb5,
  AuctionQueryHeadersMessage: 0x679e0d00,
  AuctionQueryHeadersResponseMessage: 0x05c7723e,
} as const;

// ============================================================================
// Interfaces
// ============================================================================

export interface AuctionItemDataHeader {
  itemId: bigint;
  itemName: string;
  minBid: number;
  highBid: number;
  timer: number;
  buyNowPrice: number;
  location: string;
  ownerId: bigint;
  ownerName: string;
  highBidderId: bigint;
  highBidderName: string;
  maxProxyBid: number;
  myBid: number;
  itemType: number;
  resourceContainerClassCrc: number;
  flags: number;
  entranceCharge: number;
}

export interface PalettizedItemDataHeader {
  itemId: bigint;
  itemNameKey: number;
  highBid: number;
  timer: number;
  buyNowPrice: number;
  locationKey: number;
  ownerId: bigint;
  ownerNameKey: number;
  highBidderId: bigint;
  highBidderNameKey: number;
  maxProxyBid: number;
  myBid: number;
  itemType: number;
  resourceContainerClassCrc: number;
  flags: number;
  entranceCharge: number;
}

export interface AuctionItemDataDetails {
  itemId: bigint;
  userDescription: string;
  propertyList: Array<{ key: string; value: string }>;
  templateName: string;
  appearanceString: string;
}

export interface SearchCondition {
  attributeNameCrc: number;
  requiredAttribute: boolean;
  comparison: SearchConditionComparison;
  intMin?: number;
  intMax?: number;
  floatMin?: number;
  floatMax?: number;
  stringValue?: string;
}

// ============================================================================
// Message Interfaces
// ============================================================================

export interface CreateAuctionMessage {
  itemId: bigint;
  itemLocalizedName: string;
  containerId: bigint;
  minimumBid: number;
  auctionLength: number;
  userDescription: string;
  premium: boolean;
}

export interface CreateAuctionResponseMessage {
  itemId: bigint;
  result: number;
  itemRestrictedRejectionMessage: string;
}

export interface CreateImmediateAuctionMessage {
  itemId: bigint;
  itemLocalizedName: string;
  containerId: bigint;
  price: number;
  auctionLength: number;
  userDescription: string;
  premium: boolean;
  vendorTransfer: boolean;
}

export interface BidAuctionMessage {
  itemId: bigint;
  bid: number;
  maxProxyBid: number;
}

export interface BidAuctionResponseMessage {
  itemId: bigint;
  result: number;
}

export interface CancelLiveAuctionMessage {
  itemId: bigint;
}

export interface CancelLiveAuctionResponseMessage {
  itemId: bigint;
  result: number;
  vendorRefusal: boolean;
}

export interface RetrieveAuctionItemMessage {
  itemId: bigint;
  containerId: bigint;
}

export interface RetrieveAuctionItemResponseMessage {
  itemId: bigint;
  result: number;
}

export interface GetAuctionDetails {
  itemId: bigint;
}

export interface GetAuctionDetailsResponse {
  details: AuctionItemDataDetails;
}

export interface IsVendorOwnerMessage {
  containerId: bigint;
}

export interface IsVendorOwnerResponseMessage {
  ownerResult: number;
  result: number;
  containerId: bigint;
  marketName: string;
  maxPageSize: number;
}

export interface AcceptAuctionMessage {
  itemId: bigint;
}

export interface AuctionQueryHeadersMessage {
  locationSearchType: number;
  requestId: number;
  searchType: number;
  itemType: number;
  itemTypeExactMatch: boolean;
  itemTemplateId: number;
  textFilterAll: string;
  textFilterAny: string;
  priceFilterMin: number;
  priceFilterMax: number;
  priceFilterIncludesFee: boolean;
  advancedSearch: SearchCondition[];
  advancedSearchMatchAllAny: number;
  container: bigint;
  myVendorsOnly: boolean;
  queryOffset: number;
}

export interface AuctionQueryHeadersResponseMessage {
  requestId: number;
  typeFlag: number;
  stringPalette: string[];
  wideStringPalette: string[];
  palettizedAuctionData: PalettizedItemDataHeader[];
  queryOffset: number;
  hasMorePages: boolean;
}

// ============================================================================
// Serialization/Deserialization Functions
// ============================================================================

// Helper to read f64 (double) - reads 8 bytes as a little-endian float64
function readFloat64LE(reader: BufferReader): number {
  // Read 8 raw bytes
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = reader.readUInt8();
  }
  return new DataView(bytes.buffer).getFloat64(0, true);
}

// Helper to write f64 (double) - writes 8 bytes as a little-endian float64
function writeFloat64LE(writer: BufferWriter, value: number): void {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, true);
  writer.writeBytes(bytes);
}

// SearchCondition serialization
function serializeSearchCondition(writer: BufferWriter, condition: SearchCondition): void {
  writer.writeUInt32LE(condition.attributeNameCrc);
  writer.writeUInt8(condition.requiredAttribute ? 1 : 0);
  writer.writeInt8(condition.comparison);

  if (condition.comparison === SearchConditionComparison.SCC_int) {
    writer.writeInt32LE(condition.intMin ?? 0);
    writer.writeInt32LE(condition.intMax ?? 0);
  } else if (condition.comparison === SearchConditionComparison.SCC_float) {
    writeFloat64LE(writer, condition.floatMin ?? 0);
    writeFloat64LE(writer, condition.floatMax ?? 0);
  } else if (condition.comparison >= SearchConditionComparison.SCC_string_equal) {
    writer.writeStringWithLength16LE(condition.stringValue ?? '');
  }
}

function deserializeSearchCondition(reader: BufferReader): SearchCondition {
  const attributeNameCrc = reader.readUInt32LE();
  const requiredAttribute = reader.readUInt8() !== 0;
  const comparison = reader.readInt8() as SearchConditionComparison;

  const condition: SearchCondition = {
    attributeNameCrc,
    requiredAttribute,
    comparison,
  };

  if (comparison === SearchConditionComparison.SCC_int) {
    condition.intMin = reader.readInt32LE();
    condition.intMax = reader.readInt32LE();
  } else if (comparison === SearchConditionComparison.SCC_float) {
    condition.floatMin = readFloat64LE(reader);
    condition.floatMax = readFloat64LE(reader);
  } else if (comparison >= SearchConditionComparison.SCC_string_equal) {
    condition.stringValue = reader.readStringWithLength16LE();
  }

  return condition;
}

// PalettizedItemDataHeader serialization
function serializePalettizedItemDataHeader(writer: BufferWriter, header: PalettizedItemDataHeader): void {
  writer.writeUInt64LE(header.itemId);
  writer.writeUInt8(header.itemNameKey);
  writer.writeInt32LE(header.highBid);
  writer.writeInt32LE(header.timer);
  writer.writeInt32LE(header.buyNowPrice);
  writer.writeUInt16LE(header.locationKey);
  writer.writeUInt64LE(header.ownerId);
  writer.writeUInt16LE(header.ownerNameKey);
  writer.writeUInt64LE(header.highBidderId);
  writer.writeUInt16LE(header.highBidderNameKey);
  writer.writeInt32LE(header.maxProxyBid);
  writer.writeInt32LE(header.myBid);
  writer.writeInt32LE(header.itemType);
  writer.writeInt32LE(header.resourceContainerClassCrc);
  writer.writeInt32LE(header.flags);
  writer.writeInt32LE(header.entranceCharge);
}

function deserializePalettizedItemDataHeader(reader: BufferReader): PalettizedItemDataHeader {
  return {
    itemId: reader.readUInt64LE(),
    itemNameKey: reader.readUInt8(),
    highBid: reader.readInt32LE(),
    timer: reader.readInt32LE(),
    buyNowPrice: reader.readInt32LE(),
    locationKey: reader.readUInt16LE(),
    ownerId: reader.readUInt64LE(),
    ownerNameKey: reader.readUInt16LE(),
    highBidderId: reader.readUInt64LE(),
    highBidderNameKey: reader.readUInt16LE(),
    maxProxyBid: reader.readInt32LE(),
    myBid: reader.readInt32LE(),
    itemType: reader.readInt32LE(),
    resourceContainerClassCrc: reader.readInt32LE(),
    flags: reader.readInt32LE(),
    entranceCharge: reader.readInt32LE(),
  };
}

// AuctionItemDataDetails serialization
function serializeAuctionItemDataDetails(writer: BufferWriter, details: AuctionItemDataDetails): void {
  writer.writeUInt64LE(details.itemId);
  writer.writeUnicodeStringWithLength(details.userDescription);

  // propertyList: AutoArray<pair<string, Unicode>>
  writer.writeUInt32LE(details.propertyList.length);
  for (const prop of details.propertyList) {
    writer.writeStringWithLength16LE(prop.key);
    writer.writeUnicodeStringWithLength(prop.value);
  }

  writer.writeStringWithLength16LE(details.templateName);
  writer.writeStringWithLength16LE(details.appearanceString);
}

function deserializeAuctionItemDataDetails(reader: BufferReader): AuctionItemDataDetails {
  const itemId = reader.readUInt64LE();
  const userDescription = reader.readUnicodeStringWithLength();

  const propertyListCount = reader.readUInt32LE();
  const propertyList: Array<{ key: string; value: string }> = [];
  for (let i = 0; i < propertyListCount; i++) {
    const key = reader.readStringWithLength16LE();
    const value = reader.readUnicodeStringWithLength();
    propertyList.push({ key, value });
  }

  const templateName = reader.readStringWithLength16LE();
  const appearanceString = reader.readStringWithLength16LE();

  return {
    itemId,
    userDescription,
    propertyList,
    templateName,
    appearanceString,
  };
}

// ============================================================================
// 1. CreateAuctionMessage
// ============================================================================

export function serializeCreateAuctionMessage(msg: CreateAuctionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(7); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.CreateAuctionMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeUnicodeStringWithLength(msg.itemLocalizedName);
  writer.writeUInt64LE(msg.containerId);
  writer.writeInt32LE(msg.minimumBid);
  writer.writeInt32LE(msg.auctionLength);
  writer.writeUnicodeStringWithLength(msg.userDescription);
  writer.writeUInt8(msg.premium ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeCreateAuctionMessage(data: Uint8Array): CreateAuctionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    itemLocalizedName: reader.readUnicodeStringWithLength(),
    containerId: reader.readUInt64LE(),
    minimumBid: reader.readInt32LE(),
    auctionLength: reader.readInt32LE(),
    userDescription: reader.readUnicodeStringWithLength(),
    premium: reader.readUInt8() !== 0,
  };
}

export function createCreateAuctionMessage(
  itemId: bigint,
  itemLocalizedName: string,
  containerId: bigint,
  minimumBid: number,
  auctionLength: number,
  userDescription: string,
  premium: boolean
): CreateAuctionMessage {
  return {
    itemId,
    itemLocalizedName,
    containerId,
    minimumBid,
    auctionLength,
    userDescription,
    premium,
  };
}

// ============================================================================
// 2. CreateAuctionResponseMessage
// ============================================================================

export function serializeCreateAuctionResponseMessage(msg: CreateAuctionResponseMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.CreateAuctionResponseMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeInt32LE(msg.result);
  writer.writeStringWithLength16LE(msg.itemRestrictedRejectionMessage);
  return writer.toBuffer();
}

export function deserializeCreateAuctionResponseMessage(data: Uint8Array): CreateAuctionResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    result: reader.readInt32LE(),
    itemRestrictedRejectionMessage: reader.readStringWithLength16LE(),
  };
}

export function createCreateAuctionResponseMessage(
  itemId: bigint,
  result: number,
  itemRestrictedRejectionMessage: string
): CreateAuctionResponseMessage {
  return {
    itemId,
    result,
    itemRestrictedRejectionMessage,
  };
}

// ============================================================================
// 3. CreateImmediateAuctionMessage
// ============================================================================

export function serializeCreateImmediateAuctionMessage(msg: CreateImmediateAuctionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.CreateImmediateAuctionMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeUnicodeStringWithLength(msg.itemLocalizedName);
  writer.writeUInt64LE(msg.containerId);
  writer.writeInt32LE(msg.price);
  writer.writeInt32LE(msg.auctionLength);
  writer.writeUnicodeStringWithLength(msg.userDescription);
  writer.writeUInt8(msg.premium ? 1 : 0);
  writer.writeUInt8(msg.vendorTransfer ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeCreateImmediateAuctionMessage(data: Uint8Array): CreateImmediateAuctionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    itemLocalizedName: reader.readUnicodeStringWithLength(),
    containerId: reader.readUInt64LE(),
    price: reader.readInt32LE(),
    auctionLength: reader.readInt32LE(),
    userDescription: reader.readUnicodeStringWithLength(),
    premium: reader.readUInt8() !== 0,
    vendorTransfer: reader.readUInt8() !== 0,
  };
}

export function createCreateImmediateAuctionMessage(
  itemId: bigint,
  itemLocalizedName: string,
  containerId: bigint,
  price: number,
  auctionLength: number,
  userDescription: string,
  premium: boolean,
  vendorTransfer: boolean
): CreateImmediateAuctionMessage {
  return {
    itemId,
    itemLocalizedName,
    containerId,
    price,
    auctionLength,
    userDescription,
    premium,
    vendorTransfer,
  };
}

// ============================================================================
// 4. BidAuctionMessage
// ============================================================================

export function serializeBidAuctionMessage(msg: BidAuctionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.BidAuctionMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeInt32LE(msg.bid);
  writer.writeInt32LE(msg.maxProxyBid);
  return writer.toBuffer();
}

export function deserializeBidAuctionMessage(data: Uint8Array): BidAuctionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    bid: reader.readInt32LE(),
    maxProxyBid: reader.readInt32LE(),
  };
}

export function createBidAuctionMessage(
  itemId: bigint,
  bid: number,
  maxProxyBid: number
): BidAuctionMessage {
  return {
    itemId,
    bid,
    maxProxyBid,
  };
}

// ============================================================================
// 5. BidAuctionResponseMessage
// ============================================================================

export function serializeBidAuctionResponseMessage(msg: BidAuctionResponseMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.BidAuctionResponseMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeInt32LE(msg.result);
  return writer.toBuffer();
}

export function deserializeBidAuctionResponseMessage(data: Uint8Array): BidAuctionResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    result: reader.readInt32LE(),
  };
}

export function createBidAuctionResponseMessage(
  itemId: bigint,
  result: number
): BidAuctionResponseMessage {
  return {
    itemId,
    result,
  };
}

// ============================================================================
// 6. CancelLiveAuctionMessage
// ============================================================================

export function serializeCancelLiveAuctionMessage(msg: CancelLiveAuctionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.CancelLiveAuctionMessage);
  writer.writeUInt64LE(msg.itemId);
  return writer.toBuffer();
}

export function deserializeCancelLiveAuctionMessage(data: Uint8Array): CancelLiveAuctionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
  };
}

export function createCancelLiveAuctionMessage(itemId: bigint): CancelLiveAuctionMessage {
  return { itemId };
}

// ============================================================================
// 7. CancelLiveAuctionResponseMessage
// ============================================================================

export function serializeCancelLiveAuctionResponseMessage(msg: CancelLiveAuctionResponseMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.CancelLiveAuctionResponseMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeInt32LE(msg.result);
  writer.writeUInt8(msg.vendorRefusal ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeCancelLiveAuctionResponseMessage(data: Uint8Array): CancelLiveAuctionResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    result: reader.readInt32LE(),
    vendorRefusal: reader.readUInt8() !== 0,
  };
}

export function createCancelLiveAuctionResponseMessage(
  itemId: bigint,
  result: number,
  vendorRefusal: boolean
): CancelLiveAuctionResponseMessage {
  return {
    itemId,
    result,
    vendorRefusal,
  };
}

// ============================================================================
// 8. RetrieveAuctionItemMessage
// ============================================================================

export function serializeRetrieveAuctionItemMessage(msg: RetrieveAuctionItemMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.RetrieveAuctionItemMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeUInt64LE(msg.containerId);
  return writer.toBuffer();
}

export function deserializeRetrieveAuctionItemMessage(data: Uint8Array): RetrieveAuctionItemMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    containerId: reader.readUInt64LE(),
  };
}

export function createRetrieveAuctionItemMessage(
  itemId: bigint,
  containerId: bigint
): RetrieveAuctionItemMessage {
  return {
    itemId,
    containerId,
  };
}

// ============================================================================
// 9. RetrieveAuctionItemResponseMessage
// ============================================================================

export function serializeRetrieveAuctionItemResponseMessage(msg: RetrieveAuctionItemResponseMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.RetrieveAuctionItemResponseMessage);
  writer.writeUInt64LE(msg.itemId);
  writer.writeInt32LE(msg.result);
  return writer.toBuffer();
}

export function deserializeRetrieveAuctionItemResponseMessage(data: Uint8Array): RetrieveAuctionItemResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
    result: reader.readInt32LE(),
  };
}

export function createRetrieveAuctionItemResponseMessage(
  itemId: bigint,
  result: number
): RetrieveAuctionItemResponseMessage {
  return {
    itemId,
    result,
  };
}

// ============================================================================
// 10. GetAuctionDetails
// ============================================================================

export function serializeGetAuctionDetails(msg: GetAuctionDetails): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.GetAuctionDetails);
  writer.writeUInt64LE(msg.itemId);
  return writer.toBuffer();
}

export function deserializeGetAuctionDetails(data: Uint8Array): GetAuctionDetails {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
  };
}

export function createGetAuctionDetails(itemId: bigint): GetAuctionDetails {
  return { itemId };
}

// ============================================================================
// 11. GetAuctionDetailsResponse
// ============================================================================

export function serializeGetAuctionDetailsResponse(msg: GetAuctionDetailsResponse): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.GetAuctionDetailsResponse);
  serializeAuctionItemDataDetails(writer, msg.details);
  return writer.toBuffer();
}

export function deserializeGetAuctionDetailsResponse(data: Uint8Array): GetAuctionDetailsResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    details: deserializeAuctionItemDataDetails(reader),
  };
}

export function createGetAuctionDetailsResponse(
  details: AuctionItemDataDetails
): GetAuctionDetailsResponse {
  return { details };
}

// ============================================================================
// 12. IsVendorOwnerMessage
// ============================================================================

export function serializeIsVendorOwnerMessage(msg: IsVendorOwnerMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.IsVendorOwnerMessage);
  writer.writeUInt64LE(msg.containerId);
  return writer.toBuffer();
}

export function deserializeIsVendorOwnerMessage(data: Uint8Array): IsVendorOwnerMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    containerId: reader.readUInt64LE(),
  };
}

export function createIsVendorOwnerMessage(containerId: bigint): IsVendorOwnerMessage {
  return { containerId };
}

// ============================================================================
// 13. IsVendorOwnerResponseMessage
// ============================================================================

export function serializeIsVendorOwnerResponseMessage(msg: IsVendorOwnerResponseMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.IsVendorOwnerResponseMessage);
  writer.writeInt32LE(msg.ownerResult);
  writer.writeInt32LE(msg.result);
  writer.writeUInt64LE(msg.containerId);
  writer.writeStringWithLength16LE(msg.marketName);
  writer.writeUInt16LE(msg.maxPageSize);
  return writer.toBuffer();
}

export function deserializeIsVendorOwnerResponseMessage(data: Uint8Array): IsVendorOwnerResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    ownerResult: reader.readInt32LE(),
    result: reader.readInt32LE(),
    containerId: reader.readUInt64LE(),
    marketName: reader.readStringWithLength16LE(),
    maxPageSize: reader.readUInt16LE(),
  };
}

export function createIsVendorOwnerResponseMessage(
  ownerResult: number,
  result: number,
  containerId: bigint,
  marketName: string,
  maxPageSize: number
): IsVendorOwnerResponseMessage {
  return {
    ownerResult,
    result,
    containerId,
    marketName,
    maxPageSize,
  };
}

// ============================================================================
// 14. AcceptAuctionMessage
// ============================================================================

export function serializeAcceptAuctionMessage(msg: AcceptAuctionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.AcceptAuctionMessage);
  writer.writeUInt64LE(msg.itemId);
  return writer.toBuffer();
}

export function deserializeAcceptAuctionMessage(data: Uint8Array): AcceptAuctionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {
    itemId: reader.readUInt64LE(),
  };
}

export function createAcceptAuctionMessage(itemId: bigint): AcceptAuctionMessage {
  return { itemId };
}

// ============================================================================
// 15. AuctionQueryHeadersMessage
// ============================================================================

export function serializeAuctionQueryHeadersMessage(msg: AuctionQueryHeadersMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(16); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.AuctionQueryHeadersMessage);
  writer.writeInt32LE(msg.locationSearchType);
  writer.writeInt32LE(msg.requestId);
  writer.writeInt32LE(msg.searchType);
  writer.writeInt32LE(msg.itemType);
  writer.writeUInt8(msg.itemTypeExactMatch ? 1 : 0);
  writer.writeInt32LE(msg.itemTemplateId);
  writer.writeUnicodeStringWithLength(msg.textFilterAll);
  writer.writeUnicodeStringWithLength(msg.textFilterAny);
  writer.writeInt32LE(msg.priceFilterMin);
  writer.writeInt32LE(msg.priceFilterMax);
  writer.writeUInt8(msg.priceFilterIncludesFee ? 1 : 0);

  // advancedSearch (AutoArray<SearchCondition>)
  writer.writeUInt32LE(msg.advancedSearch.length);
  for (const condition of msg.advancedSearch) {
    serializeSearchCondition(writer, condition);
  }

  writer.writeInt8(msg.advancedSearchMatchAllAny);
  writer.writeUInt64LE(msg.container);
  writer.writeUInt8(msg.myVendorsOnly ? 1 : 0);
  writer.writeUInt16LE(msg.queryOffset);

  return writer.toBuffer();
}

export function deserializeAuctionQueryHeadersMessage(data: Uint8Array): AuctionQueryHeadersMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode

  const locationSearchType = reader.readInt32LE();
  const requestId = reader.readInt32LE();
  const searchType = reader.readInt32LE();
  const itemType = reader.readInt32LE();
  const itemTypeExactMatch = reader.readUInt8() !== 0;
  const itemTemplateId = reader.readInt32LE();
  const textFilterAll = reader.readUnicodeStringWithLength();
  const textFilterAny = reader.readUnicodeStringWithLength();
  const priceFilterMin = reader.readInt32LE();
  const priceFilterMax = reader.readInt32LE();
  const priceFilterIncludesFee = reader.readUInt8() !== 0;

  // advancedSearch
  const advancedSearchCount = reader.readUInt32LE();
  const advancedSearch: SearchCondition[] = [];
  for (let i = 0; i < advancedSearchCount; i++) {
    advancedSearch.push(deserializeSearchCondition(reader));
  }

  const advancedSearchMatchAllAny = reader.readInt8();
  const container = reader.readUInt64LE();
  const myVendorsOnly = reader.readUInt8() !== 0;
  const queryOffset = reader.readUInt16LE();

  return {
    locationSearchType,
    requestId,
    searchType,
    itemType,
    itemTypeExactMatch,
    itemTemplateId,
    textFilterAll,
    textFilterAny,
    priceFilterMin,
    priceFilterMax,
    priceFilterIncludesFee,
    advancedSearch,
    advancedSearchMatchAllAny,
    container,
    myVendorsOnly,
    queryOffset,
  };
}

export function createAuctionQueryHeadersMessage(
  locationSearchType: number,
  requestId: number,
  searchType: number,
  itemType: number,
  itemTypeExactMatch: boolean,
  itemTemplateId: number,
  textFilterAll: string,
  textFilterAny: string,
  priceFilterMin: number,
  priceFilterMax: number,
  priceFilterIncludesFee: boolean,
  advancedSearch: SearchCondition[],
  advancedSearchMatchAllAny: number,
  container: bigint,
  myVendorsOnly: boolean,
  queryOffset: number
): AuctionQueryHeadersMessage {
  return {
    locationSearchType,
    requestId,
    searchType,
    itemType,
    itemTypeExactMatch,
    itemTemplateId,
    textFilterAll,
    textFilterAny,
    priceFilterMin,
    priceFilterMax,
    priceFilterIncludesFee,
    advancedSearch,
    advancedSearchMatchAllAny,
    container,
    myVendorsOnly,
    queryOffset,
  };
}

// ============================================================================
// 16. AuctionQueryHeadersResponseMessage
// ============================================================================

export function serializeAuctionQueryHeadersResponseMessage(msg: AuctionQueryHeadersResponseMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(7); // operandCount
  writer.writeUInt32LE(AuctionOpcodes.AuctionQueryHeadersResponseMessage);
  writer.writeInt32LE(msg.requestId);
  writer.writeInt32LE(msg.typeFlag);

  // stringPalette (AutoArray<string>)
  writer.writeUInt32LE(msg.stringPalette.length);
  for (const str of msg.stringPalette) {
    writer.writeStringWithLength16LE(str);
  }

  // wideStringPalette (AutoArray<Unicode>)
  writer.writeUInt32LE(msg.wideStringPalette.length);
  for (const str of msg.wideStringPalette) {
    writer.writeUnicodeStringWithLength(str);
  }

  // palettizedAuctionData (AutoArray<PalettizedItemDataHeader>)
  writer.writeUInt32LE(msg.palettizedAuctionData.length);
  for (const header of msg.palettizedAuctionData) {
    serializePalettizedItemDataHeader(writer, header);
  }

  writer.writeUInt16LE(msg.queryOffset);
  writer.writeUInt8(msg.hasMorePages ? 1 : 0);

  return writer.toBuffer();
}

export function deserializeAuctionQueryHeadersResponseMessage(data: Uint8Array): AuctionQueryHeadersResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode

  const requestId = reader.readInt32LE();
  const typeFlag = reader.readInt32LE();

  // stringPalette
  const stringPaletteCount = reader.readUInt32LE();
  const stringPalette: string[] = [];
  for (let i = 0; i < stringPaletteCount; i++) {
    stringPalette.push(reader.readStringWithLength16LE());
  }

  // wideStringPalette
  const wideStringPaletteCount = reader.readUInt32LE();
  const wideStringPalette: string[] = [];
  for (let i = 0; i < wideStringPaletteCount; i++) {
    wideStringPalette.push(reader.readUnicodeStringWithLength());
  }

  // palettizedAuctionData
  const palettizedAuctionDataCount = reader.readUInt32LE();
  const palettizedAuctionData: PalettizedItemDataHeader[] = [];
  for (let i = 0; i < palettizedAuctionDataCount; i++) {
    palettizedAuctionData.push(deserializePalettizedItemDataHeader(reader));
  }

  const queryOffset = reader.readUInt16LE();
  const hasMorePages = reader.readUInt8() !== 0;

  return {
    requestId,
    typeFlag,
    stringPalette,
    wideStringPalette,
    palettizedAuctionData,
    queryOffset,
    hasMorePages,
  };
}

export function createAuctionQueryHeadersResponseMessage(
  requestId: number,
  typeFlag: number,
  stringPalette: string[],
  wideStringPalette: string[],
  palettizedAuctionData: PalettizedItemDataHeader[],
  queryOffset: number,
  hasMorePages: boolean
): AuctionQueryHeadersResponseMessage {
  return {
    requestId,
    typeFlag,
    stringPalette,
    wideStringPalette,
    palettizedAuctionData,
    queryOffset,
    hasMorePages,
  };
}
