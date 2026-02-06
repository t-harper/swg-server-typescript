/**
 * SWG Bazaar Messages
 * Protocol messages for bazaar/auction system client-server communication
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

/**
 * Bazaar message opcodes
 */
export const BazaarMessageOpcode = {
  /** Client search request */
  BazaarSearch: 0xd1e04b0a,
  /** Server search results response */
  BazaarSearchResults: 0xe2f15c1b,
  /** Client list item request */
  BazaarListItem: 0xf3026d2c,
  /** Client buy item request */
  BazaarBuyItem: 0x04137e3d,
  /** Client bid request */
  BazaarBid: 0x15248f4e,
  /** Client retrieve items request */
  BazaarRetrieve: 0x2635a05f,
  /** Server status/result notification */
  BazaarStatus: 0x3746b160,
  /** Get listing details */
  BazaarGetDetails: 0x4857c271,
  /** Listing details response */
  BazaarDetailsResponse: 0x5968d382,
  /** Cancel listing request */
  BazaarCancelListing: 0x6a79e493,
  /** Update price request */
  BazaarUpdatePrice: 0x7b8af5a4,
  /** Get my bids request */
  BazaarGetMyBids: 0x8c9b06b5,
  /** My bids response */
  BazaarMyBidsResponse: 0x9dac17c6,
  /** Sale notification */
  BazaarSaleNotification: 0xaebd28d7,
  /** Outbid notification */
  BazaarOutbidNotification: 0xbfce39e8,
  /** Auction won notification */
  BazaarAuctionWonNotification: 0xc0df4af9,
} as const;

export type BazaarMessageOpcodeType =
  (typeof BazaarMessageOpcode)[keyof typeof BazaarMessageOpcode];

/**
 * Bazaar result codes
 */
export const BazaarResultCode = {
  Success: 0,
  ItemNotFound: 1,
  InsufficientFunds: 2,
  InventoryFull: 3,
  NotOwner: 4,
  AuctionEnded: 5,
  BidTooLow: 6,
  AlreadyHighBidder: 7,
  TerminalUnavailable: 8,
  InvalidPrice: 9,
  TooManyListings: 10,
  ItemNotTradeable: 11,
  ItemInUse: 12,
  ServerError: 99,
} as const;

export type BazaarResultCodeType =
  (typeof BazaarResultCode)[keyof typeof BazaarResultCode];

/**
 * Listing duration options (in seconds)
 */
export const ListingDuration = {
  /** 1 day */
  OneDay: 86400,
  /** 3 days */
  ThreeDays: 259200,
  /** 7 days */
  SevenDays: 604800,
  /** 14 days */
  FourteenDays: 1209600,
  /** 30 days */
  ThirtyDays: 2592000,
} as const;

export type ListingDurationType =
  (typeof ListingDuration)[keyof typeof ListingDuration];

/**
 * Retrieve type for item retrieval operations
 */
export const RetrieveType = {
  /** Retrieve credits from sold items */
  SoldCredits: 0,
  /** Retrieve expired/unsold items */
  ExpiredItems: 1,
  /** Retrieve purchased/won items */
  Purchases: 2,
} as const;

export type RetrieveTypeValue = (typeof RetrieveType)[keyof typeof RetrieveType];

// ============================================
// Listing Data Structures
// ============================================

/**
 * Single listing data for search results
 */
export interface BazaarListingData {
  auctionId: bigint;
  sellerId: bigint;
  sellerName: string;
  itemId: bigint;
  itemName: string;
  itemTemplateCrc: number;
  itemCategory: number;
  price: number;
  isAuction: boolean;
  instantSalePrice: number;
  planetId: string;
  regionId: string;
  expiresAt: bigint;
  bidCount: number;
}

/**
 * Search filter data from client
 */
export interface BazaarSearchFilters {
  category: number;
  planetId: string;
  regionId: string;
  minPrice: number;
  maxPrice: number;
  itemNameSearch: string;
  isAuction: boolean;
  sortBy: number;
  sortOrder: number;
  offset: number;
  limit: number;
}

/**
 * Bid data for my bids response
 */
export interface BazaarBidData {
  bidId: bigint;
  auctionId: bigint;
  itemName: string;
  amount: number;
  isWinning: boolean;
  bidAt: bigint;
}

// ============================================
// BazaarSearchMessage (0xD1E04B0A)
// ============================================

/**
 * BazaarSearchMessage - Client search request
 */
export interface BazaarSearchMessage {
  opcode: typeof BazaarMessageOpcode.BazaarSearch;
  terminalId: bigint;
  filters: BazaarSearchFilters;
}

/**
 * Serialize BazaarSearchMessage
 */
export function serializeBazaarSearchMessage(message: BazaarSearchMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);

  // Write filters
  writer.writeInt32LE(message.filters.category);
  writer.writeStringWithLength16LE(message.filters.planetId);
  writer.writeStringWithLength16LE(message.filters.regionId);
  writer.writeInt32LE(message.filters.minPrice);
  writer.writeInt32LE(message.filters.maxPrice);
  writer.writeUnicodeStringWithLength(message.filters.itemNameSearch);
  writer.writeUInt8(message.filters.isAuction ? 1 : 0);
  writer.writeUInt8(message.filters.sortBy);
  writer.writeUInt8(message.filters.sortOrder);
  writer.writeUInt32LE(message.filters.offset);
  writer.writeUInt32LE(message.filters.limit);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarSearchMessage
 */
export function deserializeBazaarSearchMessage(data: Uint8Array): BazaarSearchMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarSearch) {
    throw new Error(`Invalid opcode for BazaarSearchMessage: 0x${opcode.toString(16)}`);
  }

  const terminalId = reader.readUInt64LE();
  const category = reader.readInt32LE();
  const planetId = reader.readStringWithLength16LE();
  const regionId = reader.readStringWithLength16LE();
  const minPrice = reader.readInt32LE();
  const maxPrice = reader.readInt32LE();
  const itemNameSearch = reader.readUnicodeStringWithLength();
  const isAuction = reader.readUInt8() !== 0;
  const sortBy = reader.readUInt8();
  const sortOrder = reader.readUInt8();
  const offset = reader.readUInt32LE();
  const limit = reader.readUInt32LE();

  return {
    opcode: BazaarMessageOpcode.BazaarSearch,
    terminalId,
    filters: {
      category,
      planetId,
      regionId,
      minPrice,
      maxPrice,
      itemNameSearch,
      isAuction,
      sortBy,
      sortOrder,
      offset,
      limit,
    },
  };
}

// ============================================
// BazaarSearchResultsMessage (0xE2F15C1B)
// ============================================

/**
 * BazaarSearchResultsMessage - Server search results response
 */
export interface BazaarSearchResultsMessage {
  opcode: typeof BazaarMessageOpcode.BazaarSearchResults;
  totalCount: number;
  offset: number;
  listings: BazaarListingData[];
}

/**
 * Serialize BazaarSearchResultsMessage
 */
export function serializeBazaarSearchResultsMessage(
  message: BazaarSearchResultsMessage
): Uint8Array {
  const writer = new BufferWriter(2048);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.totalCount);
  writer.writeUInt32LE(message.offset);
  writer.writeUInt32LE(message.listings.length);

  for (const listing of message.listings) {
    writer.writeUInt64LE(listing.auctionId);
    writer.writeUInt64LE(listing.sellerId);
    writer.writeUnicodeStringWithLength(listing.sellerName);
    writer.writeUInt64LE(listing.itemId);
    writer.writeUnicodeStringWithLength(listing.itemName);
    writer.writeUInt32LE(listing.itemTemplateCrc);
    writer.writeInt32LE(listing.itemCategory);
    writer.writeInt32LE(listing.price);
    writer.writeUInt8(listing.isAuction ? 1 : 0);
    writer.writeInt32LE(listing.instantSalePrice);
    writer.writeStringWithLength16LE(listing.planetId);
    writer.writeStringWithLength16LE(listing.regionId);
    writer.writeUInt64LE(listing.expiresAt);
    writer.writeUInt32LE(listing.bidCount);
  }

  return writer.toBuffer();
}

/**
 * Deserialize BazaarSearchResultsMessage
 */
export function deserializeBazaarSearchResultsMessage(
  data: Uint8Array
): BazaarSearchResultsMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarSearchResults) {
    throw new Error(
      `Invalid opcode for BazaarSearchResultsMessage: 0x${opcode.toString(16)}`
    );
  }

  const totalCount = reader.readUInt32LE();
  const offset = reader.readUInt32LE();
  const listingCount = reader.readUInt32LE();
  const listings: BazaarListingData[] = [];

  for (let i = 0; i < listingCount; i++) {
    listings.push({
      auctionId: reader.readUInt64LE(),
      sellerId: reader.readUInt64LE(),
      sellerName: reader.readUnicodeStringWithLength(),
      itemId: reader.readUInt64LE(),
      itemName: reader.readUnicodeStringWithLength(),
      itemTemplateCrc: reader.readUInt32LE(),
      itemCategory: reader.readInt32LE(),
      price: reader.readInt32LE(),
      isAuction: reader.readUInt8() !== 0,
      instantSalePrice: reader.readInt32LE(),
      planetId: reader.readStringWithLength16LE(),
      regionId: reader.readStringWithLength16LE(),
      expiresAt: reader.readUInt64LE(),
      bidCount: reader.readUInt32LE(),
    });
  }

  return {
    opcode: BazaarMessageOpcode.BazaarSearchResults,
    totalCount,
    offset,
    listings,
  };
}

// ============================================
// BazaarListItemMessage (0xF3026D2C)
// ============================================

/**
 * BazaarListItemMessage - Create listing request
 */
export interface BazaarListItemMessage {
  opcode: typeof BazaarMessageOpcode.BazaarListItem;
  terminalId: bigint;
  itemId: bigint;
  price: number;
  duration: ListingDurationType;
  isAuction: boolean;
  instantSalePrice: number;
  description: string;
}

/**
 * Serialize BazaarListItemMessage
 */
export function serializeBazaarListItemMessage(
  message: BazaarListItemMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt64LE(message.itemId);
  writer.writeInt32LE(message.price);
  writer.writeInt32LE(message.duration);
  writer.writeUInt8(message.isAuction ? 1 : 0);
  writer.writeInt32LE(message.instantSalePrice);
  writer.writeUnicodeStringWithLength(message.description);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarListItemMessage
 */
export function deserializeBazaarListItemMessage(
  data: Uint8Array
): BazaarListItemMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarListItem) {
    throw new Error(
      `Invalid opcode for BazaarListItemMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarListItem,
    terminalId: reader.readUInt64LE(),
    itemId: reader.readUInt64LE(),
    price: reader.readInt32LE(),
    duration: reader.readInt32LE() as ListingDurationType,
    isAuction: reader.readUInt8() !== 0,
    instantSalePrice: reader.readInt32LE(),
    description: reader.readUnicodeStringWithLength(),
  };
}

// ============================================
// BazaarBuyItemMessage (0x04137E3D)
// ============================================

/**
 * BazaarBuyItemMessage - Purchase request
 */
export interface BazaarBuyItemMessage {
  opcode: typeof BazaarMessageOpcode.BazaarBuyItem;
  terminalId: bigint;
  auctionId: bigint;
  expectedPrice: number;
}

/**
 * Serialize BazaarBuyItemMessage
 */
export function serializeBazaarBuyItemMessage(
  message: BazaarBuyItemMessage
): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt64LE(message.auctionId);
  writer.writeInt32LE(message.expectedPrice);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarBuyItemMessage
 */
export function deserializeBazaarBuyItemMessage(
  data: Uint8Array
): BazaarBuyItemMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarBuyItem) {
    throw new Error(
      `Invalid opcode for BazaarBuyItemMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarBuyItem,
    terminalId: reader.readUInt64LE(),
    auctionId: reader.readUInt64LE(),
    expectedPrice: reader.readInt32LE(),
  };
}

// ============================================
// BazaarBidMessage (0x15248F4E)
// ============================================

/**
 * BazaarBidMessage - Bid request
 */
export interface BazaarBidMessage {
  opcode: typeof BazaarMessageOpcode.BazaarBid;
  terminalId: bigint;
  auctionId: bigint;
  amount: number;
}

/**
 * Serialize BazaarBidMessage
 */
export function serializeBazaarBidMessage(message: BazaarBidMessage): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt64LE(message.auctionId);
  writer.writeInt32LE(message.amount);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarBidMessage
 */
export function deserializeBazaarBidMessage(data: Uint8Array): BazaarBidMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarBid) {
    throw new Error(`Invalid opcode for BazaarBidMessage: 0x${opcode.toString(16)}`);
  }

  return {
    opcode: BazaarMessageOpcode.BazaarBid,
    terminalId: reader.readUInt64LE(),
    auctionId: reader.readUInt64LE(),
    amount: reader.readInt32LE(),
  };
}

// ============================================
// BazaarRetrieveMessage (0x2635A05F)
// ============================================

/**
 * BazaarRetrieveMessage - Retrieve items request
 */
export interface BazaarRetrieveMessage {
  opcode: typeof BazaarMessageOpcode.BazaarRetrieve;
  terminalId: bigint;
  retrieveType: RetrieveTypeValue;
}

/**
 * Serialize BazaarRetrieveMessage
 */
export function serializeBazaarRetrieveMessage(
  message: BazaarRetrieveMessage
): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt8(message.retrieveType);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarRetrieveMessage
 */
export function deserializeBazaarRetrieveMessage(
  data: Uint8Array
): BazaarRetrieveMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarRetrieve) {
    throw new Error(
      `Invalid opcode for BazaarRetrieveMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarRetrieve,
    terminalId: reader.readUInt64LE(),
    retrieveType: reader.readUInt8() as RetrieveTypeValue,
  };
}

// ============================================
// BazaarStatusMessage (0x3746B160)
// ============================================

/**
 * BazaarStatusMessage - Result notification
 */
export interface BazaarStatusMessage {
  opcode: typeof BazaarMessageOpcode.BazaarStatus;
  resultCode: BazaarResultCodeType;
  auctionId: bigint;
  message: string;
}

/**
 * Serialize BazaarStatusMessage
 */
export function serializeBazaarStatusMessage(
  message: BazaarStatusMessage
): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.resultCode);
  writer.writeUInt64LE(message.auctionId);
  writer.writeUnicodeStringWithLength(message.message);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarStatusMessage
 */
export function deserializeBazaarStatusMessage(
  data: Uint8Array
): BazaarStatusMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarStatus) {
    throw new Error(
      `Invalid opcode for BazaarStatusMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarStatus,
    resultCode: reader.readUInt32LE() as BazaarResultCodeType,
    auctionId: reader.readUInt64LE(),
    message: reader.readUnicodeStringWithLength(),
  };
}

// ============================================
// BazaarGetDetailsMessage (0x4857C271)
// ============================================

/**
 * BazaarGetDetailsMessage - Get listing details request
 */
export interface BazaarGetDetailsMessage {
  opcode: typeof BazaarMessageOpcode.BazaarGetDetails;
  auctionId: bigint;
}

/**
 * Serialize BazaarGetDetailsMessage
 */
export function serializeBazaarGetDetailsMessage(
  message: BazaarGetDetailsMessage
): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.auctionId);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarGetDetailsMessage
 */
export function deserializeBazaarGetDetailsMessage(
  data: Uint8Array
): BazaarGetDetailsMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarGetDetails) {
    throw new Error(
      `Invalid opcode for BazaarGetDetailsMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarGetDetails,
    auctionId: reader.readUInt64LE(),
  };
}

// ============================================
// BazaarDetailsResponseMessage (0x5968D382)
// ============================================

/**
 * BazaarDetailsResponseMessage - Listing details response
 */
export interface BazaarDetailsResponseMessage {
  opcode: typeof BazaarMessageOpcode.BazaarDetailsResponse;
  listing: BazaarListingData | null;
  itemAttributes: string;
}

/**
 * Serialize BazaarDetailsResponseMessage
 */
export function serializeBazaarDetailsResponseMessage(
  message: BazaarDetailsResponseMessage
): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt8(message.listing !== null ? 1 : 0);

  if (message.listing !== null) {
    writer.writeUInt64LE(message.listing.auctionId);
    writer.writeUInt64LE(message.listing.sellerId);
    writer.writeUnicodeStringWithLength(message.listing.sellerName);
    writer.writeUInt64LE(message.listing.itemId);
    writer.writeUnicodeStringWithLength(message.listing.itemName);
    writer.writeUInt32LE(message.listing.itemTemplateCrc);
    writer.writeInt32LE(message.listing.itemCategory);
    writer.writeInt32LE(message.listing.price);
    writer.writeUInt8(message.listing.isAuction ? 1 : 0);
    writer.writeInt32LE(message.listing.instantSalePrice);
    writer.writeStringWithLength16LE(message.listing.planetId);
    writer.writeStringWithLength16LE(message.listing.regionId);
    writer.writeUInt64LE(message.listing.expiresAt);
    writer.writeUInt32LE(message.listing.bidCount);
  }

  writer.writeUnicodeStringWithLength(message.itemAttributes);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarDetailsResponseMessage
 */
export function deserializeBazaarDetailsResponseMessage(
  data: Uint8Array
): BazaarDetailsResponseMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarDetailsResponse) {
    throw new Error(
      `Invalid opcode for BazaarDetailsResponseMessage: 0x${opcode.toString(16)}`
    );
  }

  const hasListing = reader.readUInt8() !== 0;
  let listing: BazaarListingData | null = null;

  if (hasListing) {
    listing = {
      auctionId: reader.readUInt64LE(),
      sellerId: reader.readUInt64LE(),
      sellerName: reader.readUnicodeStringWithLength(),
      itemId: reader.readUInt64LE(),
      itemName: reader.readUnicodeStringWithLength(),
      itemTemplateCrc: reader.readUInt32LE(),
      itemCategory: reader.readInt32LE(),
      price: reader.readInt32LE(),
      isAuction: reader.readUInt8() !== 0,
      instantSalePrice: reader.readInt32LE(),
      planetId: reader.readStringWithLength16LE(),
      regionId: reader.readStringWithLength16LE(),
      expiresAt: reader.readUInt64LE(),
      bidCount: reader.readUInt32LE(),
    };
  }

  const itemAttributes = reader.readUnicodeStringWithLength();

  return {
    opcode: BazaarMessageOpcode.BazaarDetailsResponse,
    listing,
    itemAttributes,
  };
}

// ============================================
// BazaarCancelListingMessage (0x6A79E493)
// ============================================

/**
 * BazaarCancelListingMessage - Cancel listing request
 */
export interface BazaarCancelListingMessage {
  opcode: typeof BazaarMessageOpcode.BazaarCancelListing;
  terminalId: bigint;
  auctionId: bigint;
}

/**
 * Serialize BazaarCancelListingMessage
 */
export function serializeBazaarCancelListingMessage(
  message: BazaarCancelListingMessage
): Uint8Array {
  const writer = new BufferWriter(24);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt64LE(message.auctionId);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarCancelListingMessage
 */
export function deserializeBazaarCancelListingMessage(
  data: Uint8Array
): BazaarCancelListingMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarCancelListing) {
    throw new Error(
      `Invalid opcode for BazaarCancelListingMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarCancelListing,
    terminalId: reader.readUInt64LE(),
    auctionId: reader.readUInt64LE(),
  };
}

// ============================================
// BazaarUpdatePriceMessage (0x7B8AF5A4)
// ============================================

/**
 * BazaarUpdatePriceMessage - Update price request
 */
export interface BazaarUpdatePriceMessage {
  opcode: typeof BazaarMessageOpcode.BazaarUpdatePrice;
  terminalId: bigint;
  auctionId: bigint;
  newPrice: number;
}

/**
 * Serialize BazaarUpdatePriceMessage
 */
export function serializeBazaarUpdatePriceMessage(
  message: BazaarUpdatePriceMessage
): Uint8Array {
  const writer = new BufferWriter(28);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt64LE(message.auctionId);
  writer.writeInt32LE(message.newPrice);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarUpdatePriceMessage
 */
export function deserializeBazaarUpdatePriceMessage(
  data: Uint8Array
): BazaarUpdatePriceMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarUpdatePrice) {
    throw new Error(
      `Invalid opcode for BazaarUpdatePriceMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarUpdatePrice,
    terminalId: reader.readUInt64LE(),
    auctionId: reader.readUInt64LE(),
    newPrice: reader.readInt32LE(),
  };
}

// ============================================
// BazaarGetMyBidsMessage (0x8C9B06B5)
// ============================================

/**
 * BazaarGetMyBidsMessage - Get my bids request
 */
export interface BazaarGetMyBidsMessage {
  opcode: typeof BazaarMessageOpcode.BazaarGetMyBids;
  terminalId: bigint;
}

/**
 * Serialize BazaarGetMyBidsMessage
 */
export function serializeBazaarGetMyBidsMessage(
  message: BazaarGetMyBidsMessage
): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarGetMyBidsMessage
 */
export function deserializeBazaarGetMyBidsMessage(
  data: Uint8Array
): BazaarGetMyBidsMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarGetMyBids) {
    throw new Error(
      `Invalid opcode for BazaarGetMyBidsMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarGetMyBids,
    terminalId: reader.readUInt64LE(),
  };
}

// ============================================
// BazaarMyBidsResponseMessage (0x9DAC17C6)
// ============================================

/**
 * BazaarMyBidsResponseMessage - My bids response
 */
export interface BazaarMyBidsResponseMessage {
  opcode: typeof BazaarMessageOpcode.BazaarMyBidsResponse;
  bids: BazaarBidData[];
}

/**
 * Serialize BazaarMyBidsResponseMessage
 */
export function serializeBazaarMyBidsResponseMessage(
  message: BazaarMyBidsResponseMessage
): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.bids.length);

  for (const bid of message.bids) {
    writer.writeUInt64LE(bid.bidId);
    writer.writeUInt64LE(bid.auctionId);
    writer.writeUnicodeStringWithLength(bid.itemName);
    writer.writeInt32LE(bid.amount);
    writer.writeUInt8(bid.isWinning ? 1 : 0);
    writer.writeUInt64LE(bid.bidAt);
  }

  return writer.toBuffer();
}

/**
 * Deserialize BazaarMyBidsResponseMessage
 */
export function deserializeBazaarMyBidsResponseMessage(
  data: Uint8Array
): BazaarMyBidsResponseMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarMyBidsResponse) {
    throw new Error(
      `Invalid opcode for BazaarMyBidsResponseMessage: 0x${opcode.toString(16)}`
    );
  }

  const bidCount = reader.readUInt32LE();
  const bids: BazaarBidData[] = [];

  for (let i = 0; i < bidCount; i++) {
    bids.push({
      bidId: reader.readUInt64LE(),
      auctionId: reader.readUInt64LE(),
      itemName: reader.readUnicodeStringWithLength(),
      amount: reader.readInt32LE(),
      isWinning: reader.readUInt8() !== 0,
      bidAt: reader.readUInt64LE(),
    });
  }

  return {
    opcode: BazaarMessageOpcode.BazaarMyBidsResponse,
    bids,
  };
}

// ============================================
// Notification Messages
// ============================================

/**
 * BazaarSaleNotificationMessage - Sale notification
 */
export interface BazaarSaleNotificationMessage {
  opcode: typeof BazaarMessageOpcode.BazaarSaleNotification;
  itemName: string;
  buyerName: string;
  salePrice: number;
  commissionPaid: number;
}

/**
 * Serialize BazaarSaleNotificationMessage
 */
export function serializeBazaarSaleNotificationMessage(
  message: BazaarSaleNotificationMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.itemName);
  writer.writeUnicodeStringWithLength(message.buyerName);
  writer.writeInt32LE(message.salePrice);
  writer.writeInt32LE(message.commissionPaid);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarSaleNotificationMessage
 */
export function deserializeBazaarSaleNotificationMessage(
  data: Uint8Array
): BazaarSaleNotificationMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarSaleNotification) {
    throw new Error(
      `Invalid opcode for BazaarSaleNotificationMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarSaleNotification,
    itemName: reader.readUnicodeStringWithLength(),
    buyerName: reader.readUnicodeStringWithLength(),
    salePrice: reader.readInt32LE(),
    commissionPaid: reader.readInt32LE(),
  };
}

/**
 * BazaarOutbidNotificationMessage - Outbid notification
 */
export interface BazaarOutbidNotificationMessage {
  opcode: typeof BazaarMessageOpcode.BazaarOutbidNotification;
  auctionId: bigint;
  itemName: string;
  newHighBid: number;
  newHighBidderName: string;
}

/**
 * Serialize BazaarOutbidNotificationMessage
 */
export function serializeBazaarOutbidNotificationMessage(
  message: BazaarOutbidNotificationMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.auctionId);
  writer.writeUnicodeStringWithLength(message.itemName);
  writer.writeInt32LE(message.newHighBid);
  writer.writeUnicodeStringWithLength(message.newHighBidderName);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarOutbidNotificationMessage
 */
export function deserializeBazaarOutbidNotificationMessage(
  data: Uint8Array
): BazaarOutbidNotificationMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarOutbidNotification) {
    throw new Error(
      `Invalid opcode for BazaarOutbidNotificationMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarOutbidNotification,
    auctionId: reader.readUInt64LE(),
    itemName: reader.readUnicodeStringWithLength(),
    newHighBid: reader.readInt32LE(),
    newHighBidderName: reader.readUnicodeStringWithLength(),
  };
}

/**
 * BazaarAuctionWonNotificationMessage - Auction won notification
 */
export interface BazaarAuctionWonNotificationMessage {
  opcode: typeof BazaarMessageOpcode.BazaarAuctionWonNotification;
  auctionId: bigint;
  itemName: string;
  winningBid: number;
  sellerName: string;
}

/**
 * Serialize BazaarAuctionWonNotificationMessage
 */
export function serializeBazaarAuctionWonNotificationMessage(
  message: BazaarAuctionWonNotificationMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.auctionId);
  writer.writeUnicodeStringWithLength(message.itemName);
  writer.writeInt32LE(message.winningBid);
  writer.writeUnicodeStringWithLength(message.sellerName);

  return writer.toBuffer();
}

/**
 * Deserialize BazaarAuctionWonNotificationMessage
 */
export function deserializeBazaarAuctionWonNotificationMessage(
  data: Uint8Array
): BazaarAuctionWonNotificationMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BazaarMessageOpcode.BazaarAuctionWonNotification) {
    throw new Error(
      `Invalid opcode for BazaarAuctionWonNotificationMessage: 0x${opcode.toString(16)}`
    );
  }

  return {
    opcode: BazaarMessageOpcode.BazaarAuctionWonNotification,
    auctionId: reader.readUInt64LE(),
    itemName: reader.readUnicodeStringWithLength(),
    winningBid: reader.readInt32LE(),
    sellerName: reader.readUnicodeStringWithLength(),
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all bazaar messages
 */
export type BazaarMessage =
  | BazaarSearchMessage
  | BazaarSearchResultsMessage
  | BazaarListItemMessage
  | BazaarBuyItemMessage
  | BazaarBidMessage
  | BazaarRetrieveMessage
  | BazaarStatusMessage
  | BazaarGetDetailsMessage
  | BazaarDetailsResponseMessage
  | BazaarCancelListingMessage
  | BazaarUpdatePriceMessage
  | BazaarGetMyBidsMessage
  | BazaarMyBidsResponseMessage
  | BazaarSaleNotificationMessage
  | BazaarOutbidNotificationMessage
  | BazaarAuctionWonNotificationMessage;

/**
 * Get the opcode from raw bazaar message data
 */
export function getBazaarMessageOpcode(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid bazaar message opcode
 */
export function isBazaarMessageOpcode(
  opcode: number
): opcode is BazaarMessageOpcodeType {
  return Object.values(BazaarMessageOpcode).includes(
    opcode as BazaarMessageOpcodeType
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a BazaarStatusMessage
 */
export function createBazaarStatusMessage(
  resultCode: BazaarResultCodeType,
  auctionId: bigint = 0n,
  message: string = ''
): BazaarStatusMessage {
  return {
    opcode: BazaarMessageOpcode.BazaarStatus,
    resultCode,
    auctionId,
    message,
  };
}

/**
 * Create a BazaarSearchResultsMessage
 */
export function createBazaarSearchResultsMessage(
  totalCount: number,
  offset: number,
  listings: BazaarListingData[]
): BazaarSearchResultsMessage {
  return {
    opcode: BazaarMessageOpcode.BazaarSearchResults,
    totalCount,
    offset,
    listings,
  };
}

/**
 * Create a BazaarSaleNotificationMessage
 */
export function createBazaarSaleNotificationMessage(
  itemName: string,
  buyerName: string,
  salePrice: number,
  commissionPaid: number
): BazaarSaleNotificationMessage {
  return {
    opcode: BazaarMessageOpcode.BazaarSaleNotification,
    itemName,
    buyerName,
    salePrice,
    commissionPaid,
  };
}

/**
 * Create a BazaarOutbidNotificationMessage
 */
export function createBazaarOutbidNotificationMessage(
  auctionId: bigint,
  itemName: string,
  newHighBid: number,
  newHighBidderName: string
): BazaarOutbidNotificationMessage {
  return {
    opcode: BazaarMessageOpcode.BazaarOutbidNotification,
    auctionId,
    itemName,
    newHighBid,
    newHighBidderName,
  };
}

/**
 * Create a BazaarAuctionWonNotificationMessage
 */
export function createBazaarAuctionWonNotificationMessage(
  auctionId: bigint,
  itemName: string,
  winningBid: number,
  sellerName: string
): BazaarAuctionWonNotificationMessage {
  return {
    opcode: BazaarMessageOpcode.BazaarAuctionWonNotification,
    auctionId,
    itemName,
    winningBid,
    sellerName,
  };
}

/**
 * Get result code message for display
 */
export function getBazaarResultMessage(resultCode: BazaarResultCodeType): string {
  switch (resultCode) {
    case BazaarResultCode.Success:
      return 'Transaction completed successfully.';
    case BazaarResultCode.ItemNotFound:
      return 'The item could not be found.';
    case BazaarResultCode.InsufficientFunds:
      return 'You do not have enough credits.';
    case BazaarResultCode.InventoryFull:
      return 'Your inventory is full.';
    case BazaarResultCode.NotOwner:
      return 'You do not own this listing.';
    case BazaarResultCode.AuctionEnded:
      return 'This auction has already ended.';
    case BazaarResultCode.BidTooLow:
      return 'Your bid is too low.';
    case BazaarResultCode.AlreadyHighBidder:
      return 'You are already the high bidder.';
    case BazaarResultCode.TerminalUnavailable:
      return 'This terminal is currently unavailable.';
    case BazaarResultCode.InvalidPrice:
      return 'The specified price is invalid.';
    case BazaarResultCode.TooManyListings:
      return 'You have too many active listings.';
    case BazaarResultCode.ItemNotTradeable:
      return 'This item cannot be traded.';
    case BazaarResultCode.ItemInUse:
      return 'This item is currently in use.';
    case BazaarResultCode.ServerError:
    default:
      return 'A server error occurred. Please try again.';
  }
}
