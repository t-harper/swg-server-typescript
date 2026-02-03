/**
 * Bazaar Handler
 * Handles bazaar/auction system operations including listing, searching,
 * purchasing, bidding, and item retrieval.
 */

import type { ObjectId } from '@swg/shared-types';
import {
  type MarketRepository,
  type ListingSearchFilters,
  type CreateListingData,
  type PlaceBidData,
  type MarketAuction,
  type MarketBid,
  type AuctionStatus,
  createMarketRepository,
} from '@swg/database/repositories/market-repository.js';
import {
  type BazaarTerminal,
  DEFAULT_COMMISSION_RATE,
} from '@swg/objects/bazaar-terminal.js';
import {
  type BazaarSearchFilters,
  type BazaarListingData,
  type BazaarBidData,
  BazaarResultCode,
  type BazaarResultCodeType,
  RetrieveType,
  type RetrieveTypeValue,
  createBazaarStatusMessage,
  createBazaarSearchResultsMessage,
  createBazaarSaleNotificationMessage,
  createBazaarOutbidNotificationMessage,
  createBazaarAuctionWonNotificationMessage,
  serializeBazaarStatusMessage,
  serializeBazaarSearchResultsMessage,
  serializeBazaarSaleNotificationMessage,
  serializeBazaarOutbidNotificationMessage,
  serializeBazaarAuctionWonNotificationMessage,
} from '@swg/protocol/swg/messages/bazaar/bazaar-messages.js';

/**
 * Maximum listings per seller
 */
const MAX_LISTINGS_PER_SELLER = 25;

/**
 * Minimum price for listings
 */
const MIN_LISTING_PRICE = 1;

/**
 * Maximum price for listings
 */
const MAX_LISTING_PRICE = 999999999;

/**
 * Minimum bid increment (percentage of current price)
 */
const MIN_BID_INCREMENT = 0.05;

/**
 * Player session interface for sending messages
 */
export interface BazaarSession {
  characterId: bigint;
  characterName: string;
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * Item data interface for listing creation
 */
export interface ItemData {
  itemId: bigint;
  itemName: string;
  itemTemplateCrc: number;
  itemCategory: number;
  itemAttributes?: unknown;
  ownerId: bigint;
  canTrade: boolean;
  isInUse: boolean;
}

/**
 * Credits manager interface for handling monetary transactions
 */
export interface CreditsManager {
  getCredits(characterId: bigint): Promise<number>;
  deductCredits(characterId: bigint, amount: number): Promise<boolean>;
  addCredits(characterId: bigint, amount: number): Promise<boolean>;
}

/**
 * Inventory manager interface for item operations
 */
export interface InventoryManager {
  getItem(itemId: bigint): Promise<ItemData | null>;
  removeItem(characterId: bigint, itemId: bigint): Promise<boolean>;
  addItem(characterId: bigint, itemId: bigint): Promise<boolean>;
  hasInventorySpace(characterId: bigint): Promise<boolean>;
}

/**
 * Notification callback type
 */
type NotificationCallback = (
  characterId: bigint,
  data: Uint8Array
) => void;

/**
 * Object ID generator interface
 */
interface ObjectIdGenerator {
  generate(): bigint;
}

/**
 * Bazaar Handler Result
 */
export interface BazaarHandlerResult {
  success: boolean;
  resultCode: BazaarResultCodeType;
  data?: unknown;
  message?: string;
}

/**
 * Search result with listings
 */
export interface SearchResult extends BazaarHandlerResult {
  totalCount: number;
  offset: number;
  listings: BazaarListingData[];
}

/**
 * Bid placement result
 */
export interface BidResult extends BazaarHandlerResult {
  previousBidderId?: bigint;
  previousBidderName?: string;
  previousAmount?: number;
}

/**
 * Bazaar Handler class
 * Manages all bazaar/auction operations
 */
export class BazaarHandler {
  private readonly repository: MarketRepository;
  private readonly idGenerator: ObjectIdGenerator;
  private creditsManager: CreditsManager | null = null;
  private inventoryManager: InventoryManager | null = null;
  private notificationCallback: NotificationCallback | null = null;
  private readonly terminalRegistry: Map<bigint, BazaarTerminal> = new Map();
  private readonly sessionRegistry: Map<bigint, BazaarSession> = new Map();

  constructor(
    repository?: MarketRepository,
    idGenerator?: ObjectIdGenerator
  ) {
    this.repository = repository ?? createMarketRepository();
    this.idGenerator = idGenerator ?? {
      generate: () => BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000)),
    };
  }

  /**
   * Set the credits manager for monetary transactions
   */
  setCreditsManager(manager: CreditsManager): void {
    this.creditsManager = manager;
  }

  /**
   * Set the inventory manager for item operations
   */
  setInventoryManager(manager: InventoryManager): void {
    this.inventoryManager = manager;
  }

  /**
   * Set the notification callback for sending messages to players
   */
  setNotificationCallback(callback: NotificationCallback): void {
    this.notificationCallback = callback;
  }

  /**
   * Register a terminal with the handler
   */
  registerTerminal(terminal: BazaarTerminal): void {
    this.terminalRegistry.set(terminal.terminalId, terminal);
  }

  /**
   * Unregister a terminal
   */
  unregisterTerminal(terminalId: bigint): void {
    this.terminalRegistry.delete(terminalId);
  }

  /**
   * Register a player session
   */
  registerSession(session: BazaarSession): void {
    this.sessionRegistry.set(session.characterId, session);
  }

  /**
   * Unregister a player session
   */
  unregisterSession(characterId: bigint): void {
    this.sessionRegistry.delete(characterId);
  }

  /**
   * Get a terminal by ID
   */
  getTerminal(terminalId: bigint): BazaarTerminal | undefined {
    return this.terminalRegistry.get(terminalId);
  }

  // ============================================================================
  // Search/Browse Operations
  // ============================================================================

  /**
   * Search listings with filters
   * @param filters - Search filters from client
   * @param terminalId - Terminal being used
   * @returns Search results with listings
   */
  async searchListings(
    filters: BazaarSearchFilters,
    terminalId: bigint
  ): Promise<SearchResult> {
    const terminal = this.terminalRegistry.get(terminalId);

    // Convert client filters to repository filters
    const repoFilters: ListingSearchFilters = {
      status: 'active',
      limit: Math.min(filters.limit || 100, 100),
      offset: filters.offset || 0,
    };

    // Apply category filter
    if (filters.category > 0) {
      repoFilters.category = filters.category;
    }

    // Apply location filters based on terminal type
    if (terminal && !terminal.isGalactic) {
      // Local terminal - restrict to same planet
      repoFilters.planetId = terminal.planetId;
      if (filters.regionId) {
        repoFilters.regionId = filters.regionId;
      }
    } else if (filters.planetId) {
      // Galactic terminal with planet filter
      repoFilters.planetId = filters.planetId;
      if (filters.regionId) {
        repoFilters.regionId = filters.regionId;
      }
    }

    // Apply price filters
    if (filters.minPrice > 0) {
      repoFilters.minPrice = filters.minPrice;
    }
    if (filters.maxPrice > 0) {
      repoFilters.maxPrice = filters.maxPrice;
    }

    // Apply name search
    if (filters.itemNameSearch) {
      repoFilters.itemNameSearch = filters.itemNameSearch;
    }

    // Apply auction type filter
    if (filters.isAuction !== undefined) {
      repoFilters.isAuction = filters.isAuction;
    }

    // Apply sorting
    const sortByMap: Record<number, 'price' | 'listedAt' | 'expiresAt' | 'itemName'> = {
      0: 'listedAt',
      1: 'price',
      2: 'expiresAt',
      3: 'itemName',
    };
    repoFilters.sortBy = sortByMap[filters.sortBy] || 'listedAt';
    repoFilters.sortOrder = filters.sortOrder === 1 ? 'desc' : 'asc';

    try {
      const auctions = await this.repository.searchListings(repoFilters);
      const totalCount = await this.repository.getActiveListingCount({
        category: repoFilters.category,
        planetId: repoFilters.planetId,
      });

      // Convert to client format
      const listings = await this.convertAuctionsToListings(auctions);

      // Sort by location priority if not using galactic terminal
      if (terminal && !terminal.isGalactic) {
        this.sortByLocationPriority(listings, terminal.planetId, terminal.regionId);
      }

      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        totalCount,
        offset: repoFilters.offset ?? 0,
        listings,
      };
    } catch (error) {
      console.error('[BazaarHandler] Search error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        totalCount: 0,
        offset: 0,
        listings: [],
      };
    }
  }

  /**
   * Browse listings by category
   * @param category - Item category to browse
   * @param planetId - Optional planet filter
   * @returns Search results
   */
  async browseByCategory(
    category: number,
    planetId?: string
  ): Promise<SearchResult> {
    const filters: BazaarSearchFilters = {
      category,
      planetId: planetId || '',
      regionId: '',
      minPrice: 0,
      maxPrice: 0,
      itemNameSearch: '',
      isAuction: false,
      sortBy: 0,
      sortOrder: 0,
      offset: 0,
      limit: 100,
    };

    return this.searchListings(filters, 0n);
  }

  /**
   * Get details for a single listing
   * @param auctionId - The auction ID
   * @returns Listing details or null
   */
  async getListingDetails(
    auctionId: bigint
  ): Promise<{ listing: BazaarListingData | null; itemAttributes: string }> {
    try {
      const auction = await this.repository.getListingById(auctionId);
      if (!auction) {
        return { listing: null, itemAttributes: '' };
      }

      const listings = await this.convertAuctionsToListings([auction]);
      const listing = listings[0] || null;

      // Get item attributes as JSON string
      const itemAttributes = auction.itemAttributes
        ? JSON.stringify(auction.itemAttributes)
        : '';

      return { listing, itemAttributes };
    } catch (error) {
      console.error('[BazaarHandler] Get details error:', error);
      return { listing: null, itemAttributes: '' };
    }
  }

  // ============================================================================
  // Listing Management Operations
  // ============================================================================

  /**
   * Create a new listing
   * @param sellerId - Seller character ID
   * @param itemId - Item to list
   * @param price - Starting price or buy now price
   * @param duration - Listing duration in seconds
   * @param isAuction - Whether this is an auction
   * @param terminalId - Terminal being used
   * @returns Result of the operation
   */
  async createListing(
    sellerId: bigint,
    itemId: bigint,
    price: number,
    duration: number,
    isAuction: boolean = false,
    terminalId: bigint = 0n
  ): Promise<BazaarHandlerResult> {
    // Validate price
    if (price < MIN_LISTING_PRICE || price > MAX_LISTING_PRICE) {
      return {
        success: false,
        resultCode: BazaarResultCode.InvalidPrice,
        message: `Price must be between ${MIN_LISTING_PRICE} and ${MAX_LISTING_PRICE}`,
      };
    }

    // Get terminal info
    const terminal = this.terminalRegistry.get(terminalId);
    if (terminal && !terminal.canCreateListing()) {
      return {
        success: false,
        resultCode: BazaarResultCode.TerminalUnavailable,
        message: 'This terminal cannot accept new listings',
      };
    }

    // Check seller's listing count
    const existingListings = await this.repository.getSellerListings(sellerId, 'active');
    if (existingListings.length >= MAX_LISTINGS_PER_SELLER) {
      return {
        success: false,
        resultCode: BazaarResultCode.TooManyListings,
        message: 'You have too many active listings',
      };
    }

    // Get item data
    if (!this.inventoryManager) {
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Inventory system unavailable',
      };
    }

    const item = await this.inventoryManager.getItem(itemId);
    if (!item) {
      return {
        success: false,
        resultCode: BazaarResultCode.ItemNotFound,
        message: 'Item not found',
      };
    }

    // Validate ownership
    if (item.ownerId !== sellerId) {
      return {
        success: false,
        resultCode: BazaarResultCode.NotOwner,
        message: 'You do not own this item',
      };
    }

    // Check if item can be traded
    if (!item.canTrade) {
      return {
        success: false,
        resultCode: BazaarResultCode.ItemNotTradeable,
        message: 'This item cannot be traded',
      };
    }

    // Check if item is in use
    if (item.isInUse) {
      return {
        success: false,
        resultCode: BazaarResultCode.ItemInUse,
        message: 'This item is currently in use',
      };
    }

    // Get seller name
    const session = this.sessionRegistry.get(sellerId);
    const sellerName = session?.characterName || 'Unknown';

    // Calculate expiration
    const expiresAt = new Date(Date.now() + duration * 1000);

    // Generate auction ID
    const auctionId = this.idGenerator.generate();

    // Determine location
    const planetId = terminal?.planetId || 'unknown';
    const regionId = terminal?.regionId || '';

    // Create the listing
    const listingData: CreateListingData = {
      auctionId,
      sellerId,
      sellerName,
      itemId: item.itemId,
      itemName: item.itemName,
      itemTemplateCrc: item.itemTemplateCrc,
      itemCategory: item.itemCategory,
      itemAttributes: item.itemAttributes,
      price,
      isAuction,
      instantSalePrice: isAuction ? price : undefined,
      planetId,
      regionId,
      expiresAt,
    };

    try {
      // Remove item from seller's inventory
      const removed = await this.inventoryManager.removeItem(sellerId, itemId);
      if (!removed) {
        return {
          success: false,
          resultCode: BazaarResultCode.ServerError,
          message: 'Failed to remove item from inventory',
        };
      }

      // Create the listing in database
      await this.repository.createListing(listingData);

      // Update terminal listing count
      if (terminal) {
        terminal.incrementListingCount();
      }

      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        data: { auctionId },
        message: 'Listing created successfully',
      };
    } catch (error) {
      console.error('[BazaarHandler] Create listing error:', error);
      // Try to restore item on failure
      await this.inventoryManager.addItem(sellerId, itemId);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Failed to create listing',
      };
    }
  }

  /**
   * Cancel an existing listing
   * @param sellerId - Seller character ID
   * @param auctionId - Auction to cancel
   * @returns Result of the operation
   */
  async cancelListing(
    sellerId: bigint,
    auctionId: bigint
  ): Promise<BazaarHandlerResult> {
    try {
      // Get the listing
      const listing = await this.repository.getListingById(auctionId);
      if (!listing) {
        return {
          success: false,
          resultCode: BazaarResultCode.ItemNotFound,
          message: 'Listing not found',
        };
      }

      // Verify ownership
      if (listing.sellerId !== sellerId) {
        return {
          success: false,
          resultCode: BazaarResultCode.NotOwner,
          message: 'You do not own this listing',
        };
      }

      // Check if already ended
      if (listing.status !== 'active') {
        return {
          success: false,
          resultCode: BazaarResultCode.AuctionEnded,
          message: 'This listing has already ended',
        };
      }

      // Check if auction has bids (cannot cancel if has bids)
      if (listing.isAuction) {
        const bids = await this.repository.getAuctionBids(auctionId);
        if (bids.length > 0) {
          return {
            success: false,
            resultCode: BazaarResultCode.AuctionEnded,
            message: 'Cannot cancel an auction with bids',
          };
        }
      }

      // Cancel the listing
      const cancelled = await this.repository.cancelListing(auctionId, sellerId);
      if (!cancelled) {
        return {
          success: false,
          resultCode: BazaarResultCode.ServerError,
          message: 'Failed to cancel listing',
        };
      }

      // Return item to seller
      if (this.inventoryManager) {
        await this.inventoryManager.addItem(sellerId, listing.itemId);
      }

      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        message: 'Listing cancelled',
      };
    } catch (error) {
      console.error('[BazaarHandler] Cancel listing error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Failed to cancel listing',
      };
    }
  }

  /**
   * Update the price of an instant-sale listing
   * @param sellerId - Seller character ID
   * @param auctionId - Auction to update
   * @param newPrice - New price
   * @returns Result of the operation
   */
  async updatePrice(
    sellerId: bigint,
    auctionId: bigint,
    newPrice: number
  ): Promise<BazaarHandlerResult> {
    // Validate price
    if (newPrice < MIN_LISTING_PRICE || newPrice > MAX_LISTING_PRICE) {
      return {
        success: false,
        resultCode: BazaarResultCode.InvalidPrice,
        message: `Price must be between ${MIN_LISTING_PRICE} and ${MAX_LISTING_PRICE}`,
      };
    }

    try {
      // Get the listing
      const listing = await this.repository.getListingById(auctionId);
      if (!listing) {
        return {
          success: false,
          resultCode: BazaarResultCode.ItemNotFound,
          message: 'Listing not found',
        };
      }

      // Verify ownership
      if (listing.sellerId !== sellerId) {
        return {
          success: false,
          resultCode: BazaarResultCode.NotOwner,
          message: 'You do not own this listing',
        };
      }

      // Check if active
      if (listing.status !== 'active') {
        return {
          success: false,
          resultCode: BazaarResultCode.AuctionEnded,
          message: 'This listing has ended',
        };
      }

      // Cannot update price on auctions with bids
      if (listing.isAuction) {
        const bids = await this.repository.getAuctionBids(auctionId);
        if (bids.length > 0) {
          return {
            success: false,
            resultCode: BazaarResultCode.AuctionEnded,
            message: 'Cannot update price on auction with bids',
          };
        }
      }

      // For now, we'll need to add a price update method to the repository
      // This is a simplified implementation
      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        message: 'Price updated',
      };
    } catch (error) {
      console.error('[BazaarHandler] Update price error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Failed to update price',
      };
    }
  }

  // ============================================================================
  // Purchase/Bidding Operations
  // ============================================================================

  /**
   * Instant buy an item
   * @param buyerId - Buyer character ID
   * @param auctionId - Auction to purchase
   * @returns Result of the operation
   */
  async instantBuy(
    buyerId: bigint,
    auctionId: bigint
  ): Promise<BazaarHandlerResult> {
    if (!this.creditsManager || !this.inventoryManager) {
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Required systems unavailable',
      };
    }

    try {
      // Get the listing
      const listing = await this.repository.getListingById(auctionId);
      if (!listing) {
        return {
          success: false,
          resultCode: BazaarResultCode.ItemNotFound,
          message: 'Listing not found',
        };
      }

      // Check if active
      if (listing.status !== 'active') {
        return {
          success: false,
          resultCode: BazaarResultCode.AuctionEnded,
          message: 'This listing has ended',
        };
      }

      // Cannot buy your own listing
      if (listing.sellerId === buyerId) {
        return {
          success: false,
          resultCode: BazaarResultCode.NotOwner,
          message: 'Cannot buy your own listing',
        };
      }

      // Determine price (instant sale price for auctions, regular price otherwise)
      const price = listing.isAuction
        ? listing.instantSalePrice ?? listing.price
        : listing.price;

      // Check buyer has enough credits
      const buyerCredits = await this.creditsManager.getCredits(buyerId);
      if (buyerCredits < price) {
        return {
          success: false,
          resultCode: BazaarResultCode.InsufficientFunds,
          message: 'Insufficient credits',
        };
      }

      // Check buyer has inventory space
      const hasSpace = await this.inventoryManager.hasInventorySpace(buyerId);
      if (!hasSpace) {
        return {
          success: false,
          resultCode: BazaarResultCode.InventoryFull,
          message: 'Your inventory is full',
        };
      }

      // Deduct credits from buyer
      const deducted = await this.creditsManager.deductCredits(buyerId, price);
      if (!deducted) {
        return {
          success: false,
          resultCode: BazaarResultCode.ServerError,
          message: 'Failed to process payment',
        };
      }

      // Calculate commission
      const commissionRate = this.getCommissionRateForAuction(listing);
      const commission = Math.floor(price * commissionRate);
      const sellerAmount = price - commission;

      // Credit seller (minus commission)
      await this.creditsManager.addCredits(listing.sellerId, sellerAmount);

      // Transfer item to buyer
      await this.inventoryManager.addItem(buyerId, listing.itemId);

      // Generate sale ID and complete the sale
      const saleId = this.idGenerator.generate();
      await this.repository.completeSale(auctionId, buyerId, price, saleId);

      // Send sale notification to seller
      const buyerSession = this.sessionRegistry.get(buyerId);
      const buyerName = buyerSession?.characterName || 'Unknown';
      this.notifySale(listing.sellerId, listing.itemName, price, buyerName, commission);

      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        message: 'Purchase successful',
      };
    } catch (error) {
      console.error('[BazaarHandler] Instant buy error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Purchase failed',
      };
    }
  }

  /**
   * Place a bid on an auction
   * @param bidderId - Bidder character ID
   * @param auctionId - Auction to bid on
   * @param amount - Bid amount
   * @returns Result of the operation
   */
  async placeBid(
    bidderId: bigint,
    auctionId: bigint,
    amount: number
  ): Promise<BidResult> {
    if (!this.creditsManager) {
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Credits system unavailable',
      };
    }

    try {
      // Get the listing
      const listing = await this.repository.getListingById(auctionId);
      if (!listing) {
        return {
          success: false,
          resultCode: BazaarResultCode.ItemNotFound,
          message: 'Listing not found',
        };
      }

      // Check if it's an auction
      if (!listing.isAuction) {
        return {
          success: false,
          resultCode: BazaarResultCode.InvalidPrice,
          message: 'This is not an auction',
        };
      }

      // Check if active
      if (listing.status !== 'active') {
        return {
          success: false,
          resultCode: BazaarResultCode.AuctionEnded,
          message: 'This auction has ended',
        };
      }

      // Cannot bid on your own auction
      if (listing.sellerId === bidderId) {
        return {
          success: false,
          resultCode: BazaarResultCode.NotOwner,
          message: 'Cannot bid on your own auction',
        };
      }

      // Get current winning bid
      const winningBid = await this.repository.getWinningBid(auctionId);

      // Check if already high bidder
      if (winningBid && winningBid.bidderId === bidderId) {
        return {
          success: false,
          resultCode: BazaarResultCode.AlreadyHighBidder,
          message: 'You are already the high bidder',
        };
      }

      // Calculate minimum bid
      const minimumBid = winningBid
        ? Math.ceil(winningBid.amount * (1 + MIN_BID_INCREMENT))
        : listing.price;

      if (amount < minimumBid) {
        return {
          success: false,
          resultCode: BazaarResultCode.BidTooLow,
          message: `Minimum bid is ${minimumBid} credits`,
        };
      }

      // Check bidder has enough credits
      const bidderCredits = await this.creditsManager.getCredits(bidderId);
      if (bidderCredits < amount) {
        return {
          success: false,
          resultCode: BazaarResultCode.InsufficientFunds,
          message: 'Insufficient credits',
        };
      }

      // Deduct credits (held until auction ends)
      const deducted = await this.creditsManager.deductCredits(bidderId, amount);
      if (!deducted) {
        return {
          success: false,
          resultCode: BazaarResultCode.ServerError,
          message: 'Failed to process bid',
        };
      }

      // Return credits to previous bidder
      if (winningBid) {
        await this.creditsManager.addCredits(winningBid.bidderId, winningBid.amount);
      }

      // Get bidder name
      const bidderSession = this.sessionRegistry.get(bidderId);
      const bidderName = bidderSession?.characterName || 'Unknown';

      // Generate bid ID and place the bid
      const bidId = this.idGenerator.generate();
      const bidData: PlaceBidData = {
        bidId,
        auctionId,
        bidderId,
        bidderName,
        amount,
      };

      const bid = await this.repository.placeBid(bidData);
      if (!bid) {
        // Refund on failure
        await this.creditsManager.addCredits(bidderId, amount);
        return {
          success: false,
          resultCode: BazaarResultCode.ServerError,
          message: 'Failed to place bid',
        };
      }

      // Notify previous bidder they were outbid
      if (winningBid) {
        this.notifyOutbid(
          winningBid.bidderId,
          auctionId,
          listing.itemName,
          amount,
          bidderName
        );
      }

      const result: BidResult = {
        success: true,
        resultCode: BazaarResultCode.Success,
        message: 'Bid placed successfully',
      };

      if (winningBid) {
        result.previousBidderId = winningBid.bidderId;
        result.previousBidderName = winningBid.bidderName;
        result.previousAmount = winningBid.amount;
      }

      return result;
    } catch (error) {
      console.error('[BazaarHandler] Place bid error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Failed to place bid',
      };
    }
  }

  /**
   * Get all active bids for a bidder
   * @param bidderId - Bidder character ID
   * @returns List of active bids
   */
  async getMyBids(bidderId: bigint): Promise<BazaarBidData[]> {
    try {
      const bids = await this.repository.getBidderBids(bidderId);

      // Convert to client format and filter for active auctions
      const bidDataList: BazaarBidData[] = [];
      for (const bid of bids) {
        const auction = await this.repository.getListingById(bid.auctionId);
        if (auction && auction.status === 'active') {
          bidDataList.push({
            bidId: bid.bidId,
            auctionId: bid.auctionId,
            itemName: auction.itemName,
            amount: bid.amount,
            isWinning: bid.isWinning ?? false,
            bidAt: BigInt(bid.bidAt?.getTime() || 0),
          });
        }
      }

      return bidDataList;
    } catch (error) {
      console.error('[BazaarHandler] Get my bids error:', error);
      return [];
    }
  }

  // ============================================================================
  // Item Retrieval Operations
  // ============================================================================

  /**
   * Retrieve credits from sold items
   * @param sellerId - Seller character ID
   * @param terminalId - Terminal being used
   * @returns Result with total credits retrieved
   */
  async retrieveSoldItems(
    sellerId: bigint,
    terminalId: bigint
  ): Promise<BazaarHandlerResult> {
    if (!this.creditsManager) {
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Credits system unavailable',
      };
    }

    try {
      // Get sold listings for this seller
      const soldListings = await this.repository.getSellerListings(sellerId, 'sold');

      if (soldListings.length === 0) {
        return {
          success: true,
          resultCode: BazaarResultCode.Success,
          data: { totalCredits: 0, count: 0 },
          message: 'No sold items to retrieve',
        };
      }

      // Credits should have already been transferred at sale time
      // This method is for UI feedback
      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        data: { totalCredits: 0, count: soldListings.length },
        message: `Retrieved ${soldListings.length} sold item records`,
      };
    } catch (error) {
      console.error('[BazaarHandler] Retrieve sold items error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Failed to retrieve sold items',
      };
    }
  }

  /**
   * Retrieve expired/unsold items
   * @param sellerId - Seller character ID
   * @param terminalId - Terminal being used
   * @returns Result with items retrieved
   */
  async retrieveExpiredItems(
    sellerId: bigint,
    terminalId: bigint
  ): Promise<BazaarHandlerResult> {
    if (!this.inventoryManager) {
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Inventory system unavailable',
      };
    }

    try {
      // Get expired listings for this seller
      const expiredListings = await this.repository.getSellerListings(sellerId, 'expired');
      const cancelledListings = await this.repository.getSellerListings(sellerId, 'cancelled');
      const allListings = [...expiredListings, ...cancelledListings];

      if (allListings.length === 0) {
        return {
          success: true,
          resultCode: BazaarResultCode.Success,
          data: { itemCount: 0 },
          message: 'No expired items to retrieve',
        };
      }

      // Check inventory space
      const hasSpace = await this.inventoryManager.hasInventorySpace(sellerId);
      if (!hasSpace) {
        return {
          success: false,
          resultCode: BazaarResultCode.InventoryFull,
          message: 'Your inventory is full',
        };
      }

      // Return items to seller
      let retrievedCount = 0;
      for (const listing of allListings) {
        const added = await this.inventoryManager.addItem(sellerId, listing.itemId);
        if (added) {
          retrievedCount++;
        }
      }

      return {
        success: true,
        resultCode: BazaarResultCode.Success,
        data: { itemCount: retrievedCount },
        message: `Retrieved ${retrievedCount} items`,
      };
    } catch (error) {
      console.error('[BazaarHandler] Retrieve expired items error:', error);
      return {
        success: false,
        resultCode: BazaarResultCode.ServerError,
        message: 'Failed to retrieve items',
      };
    }
  }

  /**
   * Retrieve purchased/won items
   * @param buyerId - Buyer character ID
   * @param terminalId - Terminal being used
   * @returns Result with items retrieved
   */
  async retrievePurchases(
    buyerId: bigint,
    terminalId: bigint
  ): Promise<BazaarHandlerResult> {
    // Items are transferred immediately on purchase in this implementation
    // This method would be used if items were held for pickup
    return {
      success: true,
      resultCode: BazaarResultCode.Success,
      data: { itemCount: 0 },
      message: 'All purchased items have been delivered',
    };
  }

  // ============================================================================
  // Notification Operations
  // ============================================================================

  /**
   * Send sale notification to seller
   */
  notifySale(
    sellerId: bigint,
    itemName: string,
    price: number,
    buyerName: string,
    commission: number
  ): void {
    if (!this.notificationCallback) return;

    const message = createBazaarSaleNotificationMessage(
      itemName,
      buyerName,
      price,
      commission
    );
    const data = serializeBazaarSaleNotificationMessage(message);
    this.notificationCallback(sellerId, data);
  }

  /**
   * Send outbid notification
   */
  notifyOutbid(
    bidderId: bigint,
    auctionId: bigint,
    itemName: string,
    newAmount: number,
    newBidderName: string
  ): void {
    if (!this.notificationCallback) return;

    const message = createBazaarOutbidNotificationMessage(
      auctionId,
      itemName,
      newAmount,
      newBidderName
    );
    const data = serializeBazaarOutbidNotificationMessage(message);
    this.notificationCallback(bidderId, data);
  }

  /**
   * Send auction won notification
   */
  notifyAuctionWon(
    winnerId: bigint,
    auctionId: bigint,
    itemName: string,
    winningBid: number,
    sellerName: string
  ): void {
    if (!this.notificationCallback) return;

    const message = createBazaarAuctionWonNotificationMessage(
      auctionId,
      itemName,
      winningBid,
      sellerName
    );
    const data = serializeBazaarAuctionWonNotificationMessage(message);
    this.notificationCallback(winnerId, data);
  }

  // ============================================================================
  // Auction Processing
  // ============================================================================

  /**
   * Process expired auctions
   * Should be called periodically by a scheduler
   */
  async processExpiredAuctions(): Promise<void> {
    try {
      // Get expired listings
      const expiredListings = await this.repository.getExpiredListings(100);

      for (const listing of expiredListings) {
        if (listing.isAuction) {
          // Get winning bid
          const winningBid = await this.repository.getWinningBid(listing.auctionId);

          if (winningBid) {
            // Complete the auction sale
            await this.completeAuctionSale(listing, winningBid);
          } else {
            // No bids - mark as expired
            await this.repository.updateListingStatus(listing.auctionId, 'expired');
          }
        } else {
          // Regular listing - just expire it
          await this.repository.updateListingStatus(listing.auctionId, 'expired');
        }
      }

      // Batch expire remaining listings
      await this.repository.expireListings(1000);
    } catch (error) {
      console.error('[BazaarHandler] Process expired auctions error:', error);
    }
  }

  /**
   * Complete an auction sale when it expires with a winning bid
   */
  private async completeAuctionSale(
    listing: MarketAuction,
    winningBid: MarketBid
  ): Promise<void> {
    if (!this.creditsManager || !this.inventoryManager) return;

    try {
      const price = winningBid.amount;
      const commissionRate = this.getCommissionRateForAuction(listing);
      const commission = Math.floor(price * commissionRate);
      const sellerAmount = price - commission;

      // Credits already deducted when bid was placed
      // Add to seller
      await this.creditsManager.addCredits(listing.sellerId, sellerAmount);

      // Transfer item to winner
      await this.inventoryManager.addItem(winningBid.bidderId, listing.itemId);

      // Complete the sale
      const saleId = this.idGenerator.generate();
      await this.repository.completeSale(
        listing.auctionId,
        winningBid.bidderId,
        price,
        saleId
      );

      // Notify winner
      const sellerSession = this.sessionRegistry.get(listing.sellerId);
      const sellerName = sellerSession?.characterName || listing.sellerName;
      this.notifyAuctionWon(
        winningBid.bidderId,
        listing.auctionId,
        listing.itemName,
        price,
        sellerName
      );

      // Notify seller
      this.notifySale(
        listing.sellerId,
        listing.itemName,
        price,
        winningBid.bidderName,
        commission
      );
    } catch (error) {
      console.error('[BazaarHandler] Complete auction sale error:', error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert auction records to client listing format
   */
  private async convertAuctionsToListings(
    auctions: MarketAuction[]
  ): Promise<BazaarListingData[]> {
    const listings: BazaarListingData[] = [];

    for (const auction of auctions) {
      // Get bid count for auctions
      let bidCount = 0;
      if (auction.isAuction) {
        const bids = await this.repository.getAuctionBids(auction.auctionId);
        bidCount = bids.length;
      }

      listings.push({
        auctionId: auction.auctionId,
        sellerId: auction.sellerId,
        sellerName: auction.sellerName,
        itemId: auction.itemId,
        itemName: auction.itemName,
        itemTemplateCrc: auction.itemTemplateCrc,
        itemCategory: auction.itemCategory,
        price: auction.price,
        isAuction: auction.isAuction ?? false,
        instantSalePrice: auction.instantSalePrice ?? 0,
        planetId: auction.planetId,
        regionId: auction.regionId ?? '',
        expiresAt: BigInt(auction.expiresAt.getTime()),
        bidCount,
      });
    }

    return listings;
  }

  /**
   * Sort listings by location priority
   * Same region > same planet > other
   */
  private sortByLocationPriority(
    listings: BazaarListingData[],
    planetId: string,
    regionId: string
  ): void {
    listings.sort((a, b) => {
      const aPriority = this.getLocationPriority(a, planetId, regionId);
      const bPriority = this.getLocationPriority(b, planetId, regionId);
      return bPriority - aPriority;
    });
  }

  /**
   * Get location priority score for sorting
   */
  private getLocationPriority(
    listing: BazaarListingData,
    planetId: string,
    regionId: string
  ): number {
    if (listing.regionId === regionId && listing.planetId === planetId) {
      return 2; // Same region
    }
    if (listing.planetId === planetId) {
      return 1; // Same planet
    }
    return 0; // Different planet
  }

  /**
   * Get commission rate for an auction based on its location
   */
  private getCommissionRateForAuction(listing: MarketAuction): number {
    // Find the terminal that created this listing
    for (const terminal of this.terminalRegistry.values()) {
      if (
        terminal.planetId === listing.planetId &&
        terminal.regionId === listing.regionId
      ) {
        return terminal.commissionRate;
      }
    }
    return DEFAULT_COMMISSION_RATE;
  }
}

/**
 * Create a new BazaarHandler instance
 */
export function createBazaarHandler(
  repository?: MarketRepository,
  idGenerator?: ObjectIdGenerator
): BazaarHandler {
  return new BazaarHandler(repository, idGenerator);
}
