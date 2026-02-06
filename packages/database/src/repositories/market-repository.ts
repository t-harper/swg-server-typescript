/**
 * Market Repository
 * Data access layer for bazaar/auction system operations
 */

import { eq, and, lte, gte, inArray, desc, asc, sql, or, like } from 'drizzle-orm';
import { getDb, type Database } from '../connection.js';
import {
  marketAuctions,
  marketBids,
  marketSaleHistory,
  vendorInventory,
  type MarketAuction,
  type NewMarketAuction,
  type MarketBid,
  type NewMarketBid,
  type MarketSaleHistory,
  type NewMarketSaleHistory,
  type VendorInventory,
  type NewVendorInventory,
  type AuctionStatus,
} from '../schema/market.js';

/**
 * Search filters for market listings
 */
export interface ListingSearchFilters {
  /** Filter by item category */
  category?: number;
  /** Filter by planet */
  planetId?: string;
  /** Filter by region within planet */
  regionId?: string;
  /** Minimum price filter */
  minPrice?: number;
  /** Maximum price filter */
  maxPrice?: number;
  /** Filter by item template CRC */
  itemTemplateCrc?: number;
  /** Search item name (partial match) */
  itemNameSearch?: string;
  /** Filter by vendor ID (null = bazaar only) */
  vendorId?: bigint | null;
  /** Filter by auction type (true = auctions, false = instant buy) */
  isAuction?: boolean;
  /** Listing status filter (default: active) */
  status?: AuctionStatus;
  /** Sort field */
  sortBy?: 'price' | 'listedAt' | 'expiresAt' | 'itemName';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Data for creating a new listing
 */
export interface CreateListingData {
  auctionId: bigint;
  sellerId: bigint;
  sellerName: string;
  itemId: bigint;
  itemName: string;
  itemTemplateCrc: number;
  itemCategory: number;
  itemAttributes?: unknown;
  price: number;
  isAuction?: boolean;
  instantSalePrice?: number;
  vendorId?: bigint;
  planetId: string;
  regionId?: string;
  expiresAt: Date;
}

/**
 * Data for placing a bid
 */
export interface PlaceBidData {
  bidId: bigint;
  auctionId: bigint;
  bidderId: bigint;
  bidderName: string;
  amount: number;
}

/**
 * Result of completing a sale
 */
export interface SaleCompletionResult {
  success: boolean;
  saleId?: bigint;
  error?: string;
}

/**
 * Market statistics for analytics
 */
export interface MarketStats {
  totalActiveListings: number;
  totalSalesToday: number;
  totalVolumeToday: number;
  averagePriceByCategory: Map<number, number>;
}

/**
 * Market Repository
 * Provides data access methods for bazaar/auction system
 */
export class MarketRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  // ============================================================================
  // Listing Operations
  // ============================================================================

  /**
   * Create a new market listing
   * @param data Listing creation data
   * @returns The created listing
   */
  async createListing(data: CreateListingData): Promise<MarketAuction> {
    const newListing: NewMarketAuction = {
      auctionId: data.auctionId,
      sellerId: data.sellerId,
      sellerName: data.sellerName,
      itemId: data.itemId,
      itemName: data.itemName,
      itemTemplateCrc: data.itemTemplateCrc,
      itemCategory: data.itemCategory,
      itemAttributes: data.itemAttributes ?? null,
      price: data.price,
      isAuction: data.isAuction ?? false,
      instantSalePrice: data.instantSalePrice ?? null,
      vendorId: data.vendorId ?? null,
      planetId: data.planetId,
      regionId: data.regionId ?? null,
      expiresAt: data.expiresAt,
      status: 'active',
    };

    await this.db.insert(marketAuctions).values(newListing);

    const created = await this.getListingById(data.auctionId);
    if (created === undefined) {
      throw new Error('Failed to retrieve created listing');
    }

    return created;
  }

  /**
   * Get a listing by ID
   * @param auctionId The auction ID
   * @returns The listing if found, undefined otherwise
   */
  async getListingById(auctionId: bigint): Promise<MarketAuction | undefined> {
    const result = await this.db
      .select()
      .from(marketAuctions)
      .where(eq(marketAuctions.auctionId, auctionId))
      .limit(1);

    return result[0];
  }

  /**
   * Search for listings with various filters
   * @param filters Search filters
   * @returns Array of matching listings
   */
  async searchListings(filters: ListingSearchFilters = {}): Promise<MarketAuction[]> {
    const conditions = [];

    // Default to active listings
    const status = filters.status ?? 'active';
    conditions.push(eq(marketAuctions.status, status));

    // Apply filters
    if (filters.category !== undefined) {
      conditions.push(eq(marketAuctions.itemCategory, filters.category));
    }

    if (filters.planetId !== undefined) {
      conditions.push(eq(marketAuctions.planetId, filters.planetId));
    }

    if (filters.regionId !== undefined) {
      conditions.push(eq(marketAuctions.regionId, filters.regionId));
    }

    if (filters.minPrice !== undefined) {
      conditions.push(gte(marketAuctions.price, filters.minPrice));
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(lte(marketAuctions.price, filters.maxPrice));
    }

    if (filters.itemTemplateCrc !== undefined) {
      conditions.push(eq(marketAuctions.itemTemplateCrc, filters.itemTemplateCrc));
    }

    if (filters.itemNameSearch !== undefined) {
      conditions.push(like(marketAuctions.itemName, `%${filters.itemNameSearch}%`));
    }

    if (filters.vendorId !== undefined) {
      if (filters.vendorId === null) {
        conditions.push(sql`${marketAuctions.vendorId} IS NULL`);
      } else {
        conditions.push(eq(marketAuctions.vendorId, filters.vendorId));
      }
    }

    if (filters.isAuction !== undefined) {
      conditions.push(eq(marketAuctions.isAuction, filters.isAuction));
    }

    // Determine sort column
    const sortOrder = filters.sortOrder ?? 'asc';
    const sortFn = sortOrder === 'asc' ? asc : desc;

    let orderByColumn;
    switch (filters.sortBy) {
      case 'price':
        orderByColumn = sortFn(marketAuctions.price);
        break;
      case 'listedAt':
        orderByColumn = sortFn(marketAuctions.listedAt);
        break;
      case 'expiresAt':
        orderByColumn = sortFn(marketAuctions.expiresAt);
        break;
      case 'itemName':
        orderByColumn = sortFn(marketAuctions.itemName);
        break;
      default:
        orderByColumn = desc(marketAuctions.listedAt);
    }

    // Build the query
    const query = this.db
      .select()
      .from(marketAuctions)
      .where(and(...conditions))
      .orderBy(orderByColumn)
      .limit(filters.limit ?? 1000)
      .offset(filters.offset ?? 0);

    return query;
  }

  /**
   * Get all listings by a seller
   * @param sellerId Seller character ID
   * @param status Optional status filter (default: all statuses)
   * @returns Array of seller's listings
   */
  async getSellerListings(
    sellerId: bigint,
    status?: AuctionStatus
  ): Promise<MarketAuction[]> {
    const conditions = [eq(marketAuctions.sellerId, sellerId)];

    if (status !== undefined) {
      conditions.push(eq(marketAuctions.status, status));
    }

    return this.db
      .select()
      .from(marketAuctions)
      .where(and(...conditions))
      .orderBy(desc(marketAuctions.listedAt));
  }

  /**
   * Update listing status
   * @param auctionId Auction ID
   * @param status New status
   * @returns True if updated, false if not found
   */
  async updateListingStatus(
    auctionId: bigint,
    status: AuctionStatus
  ): Promise<boolean> {
    const result = await this.db
      .update(marketAuctions)
      .set({ status })
      .where(eq(marketAuctions.auctionId, auctionId));

    return result[0].affectedRows > 0;
  }

  /**
   * Cancel a listing
   * @param auctionId Auction ID
   * @param sellerId Seller ID (for verification)
   * @returns True if cancelled, false if not found or not owned by seller
   */
  async cancelListing(auctionId: bigint, sellerId: bigint): Promise<boolean> {
    const result = await this.db
      .update(marketAuctions)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(marketAuctions.auctionId, auctionId),
          eq(marketAuctions.sellerId, sellerId),
          eq(marketAuctions.status, 'active')
        )
      );

    return result[0].affectedRows > 0;
  }

  /**
   * Batch expire old listings
   * @param batchSize Maximum number of listings to expire per call
   * @returns Number of listings expired
   */
  async expireListings(batchSize: number = 1000): Promise<number> {
    const now = new Date();

    const result = await this.db
      .update(marketAuctions)
      .set({ status: 'expired' })
      .where(
        and(
          eq(marketAuctions.status, 'active'),
          lte(marketAuctions.expiresAt, now)
        )
      )
      .limit(batchSize);

    return result[0].affectedRows;
  }

  /**
   * Get expired listings that need processing (e.g., item return)
   * @param limit Maximum number to retrieve
   * @returns Array of expired listings
   */
  async getExpiredListings(limit: number = 100): Promise<MarketAuction[]> {
    const now = new Date();

    return this.db
      .select()
      .from(marketAuctions)
      .where(
        and(
          eq(marketAuctions.status, 'active'),
          lte(marketAuctions.expiresAt, now)
        )
      )
      .limit(limit);
  }

  // ============================================================================
  // Bid Operations
  // ============================================================================

  /**
   * Place a bid on an auction
   * @param data Bid data
   * @returns The placed bid, or null if auction not found or bid too low
   */
  async placeBid(data: PlaceBidData): Promise<MarketBid | null> {
    return this.db.transaction(async (tx) => {
      // Verify auction exists and is active
      const auction = await tx
        .select()
        .from(marketAuctions)
        .where(
          and(
            eq(marketAuctions.auctionId, data.auctionId),
            eq(marketAuctions.status, 'active'),
            eq(marketAuctions.isAuction, true)
          )
        )
        .limit(1);

      if (auction.length === 0) {
        return null;
      }

      // Get current winning bid
      const currentWinning = await tx
        .select()
        .from(marketBids)
        .where(
          and(
            eq(marketBids.auctionId, data.auctionId),
            eq(marketBids.isWinning, true)
          )
        )
        .limit(1);

      // Verify bid is higher than current winning bid or starting price
      const currentWinningBid = currentWinning[0];
      const auctionRow = auction[0];
      if (!auctionRow) return null;

      const minimumBid = currentWinningBid
        ? currentWinningBid.amount + 1
        : auctionRow.price;

      if (data.amount < minimumBid) {
        return null;
      }

      // Mark previous winning bid as not winning
      if (currentWinningBid) {
        await tx
          .update(marketBids)
          .set({ isWinning: false })
          .where(eq(marketBids.bidId, currentWinningBid.bidId));
      }

      // Insert new bid
      const newBid: NewMarketBid = {
        bidId: data.bidId,
        auctionId: data.auctionId,
        bidderId: data.bidderId,
        bidderName: data.bidderName,
        amount: data.amount,
        isWinning: true,
      };

      await tx.insert(marketBids).values(newBid);

      // Update auction price to reflect current high bid
      await tx
        .update(marketAuctions)
        .set({ price: data.amount })
        .where(eq(marketAuctions.auctionId, data.auctionId));

      // Return the created bid
      const result = await tx
        .select()
        .from(marketBids)
        .where(eq(marketBids.bidId, data.bidId))
        .limit(1);

      return result[0] ?? null;
    });
  }

  /**
   * Get all bids for an auction
   * @param auctionId Auction ID
   * @returns Array of bids ordered by amount descending
   */
  async getAuctionBids(auctionId: bigint): Promise<MarketBid[]> {
    return this.db
      .select()
      .from(marketBids)
      .where(eq(marketBids.auctionId, auctionId))
      .orderBy(desc(marketBids.amount));
  }

  /**
   * Get the winning bid for an auction
   * @param auctionId Auction ID
   * @returns The winning bid, or undefined if no bids
   */
  async getWinningBid(auctionId: bigint): Promise<MarketBid | undefined> {
    const result = await this.db
      .select()
      .from(marketBids)
      .where(
        and(
          eq(marketBids.auctionId, auctionId),
          eq(marketBids.isWinning, true)
        )
      )
      .limit(1);

    return result[0];
  }

  /**
   * Get all bids placed by a bidder
   * @param bidderId Bidder character ID
   * @returns Array of bids
   */
  async getBidderBids(bidderId: bigint): Promise<MarketBid[]> {
    return this.db
      .select()
      .from(marketBids)
      .where(eq(marketBids.bidderId, bidderId))
      .orderBy(desc(marketBids.bidAt));
  }

  // ============================================================================
  // Sale Completion
  // ============================================================================

  /**
   * Complete a sale atomically
   * Marks listing as sold, records sale history, and handles bid cleanup
   * @param auctionId Auction ID
   * @param buyerId Buyer character ID
   * @param salePrice Final sale price
   * @param saleId ID for the sale history record
   * @returns Sale completion result
   */
  async completeSale(
    auctionId: bigint,
    buyerId: bigint,
    salePrice: number,
    saleId: bigint
  ): Promise<SaleCompletionResult> {
    return this.db.transaction(async (tx) => {
      // Get and verify the auction
      const auctions = await tx
        .select()
        .from(marketAuctions)
        .where(
          and(
            eq(marketAuctions.auctionId, auctionId),
            eq(marketAuctions.status, 'active')
          )
        )
        .limit(1);

      if (auctions.length === 0) {
        return { success: false, error: 'Auction not found or not active' };
      }

      const auction = auctions[0];
      if (!auction) {
        return { success: false, error: 'Auction not found' };
      }

      // Mark auction as sold
      await tx
        .update(marketAuctions)
        .set({ status: 'sold' })
        .where(eq(marketAuctions.auctionId, auctionId));

      // Record sale history
      const saleRecord: NewMarketSaleHistory = {
        saleId,
        sellerId: auction.sellerId,
        buyerId,
        itemTemplateCrc: auction.itemTemplateCrc,
        itemCategory: auction.itemCategory,
        salePrice,
        planetId: auction.planetId,
      };

      await tx.insert(marketSaleHistory).values(saleRecord);

      return { success: true, saleId };
    });
  }

  /**
   * Complete an auction sale (with winning bidder)
   * @param auctionId Auction ID
   * @param saleId ID for the sale history record
   * @returns Sale completion result
   */
  async completeAuctionSale(
    auctionId: bigint,
    saleId: bigint
  ): Promise<SaleCompletionResult> {
    const winningBid = await this.getWinningBid(auctionId);

    if (winningBid === undefined) {
      return { success: false, error: 'No winning bid found' };
    }

    return this.completeSale(auctionId, winningBid.bidderId, winningBid.amount, saleId);
  }

  // ============================================================================
  // Sale History
  // ============================================================================

  /**
   * Get sale history for a seller
   * @param sellerId Seller character ID
   * @param limit Maximum results
   * @returns Array of sale records
   */
  async getSellerSaleHistory(
    sellerId: bigint,
    limit: number = 100
  ): Promise<MarketSaleHistory[]> {
    return this.db
      .select()
      .from(marketSaleHistory)
      .where(eq(marketSaleHistory.sellerId, sellerId))
      .orderBy(desc(marketSaleHistory.soldAt))
      .limit(limit);
  }

  /**
   * Get sale history for a buyer
   * @param buyerId Buyer character ID
   * @param limit Maximum results
   * @returns Array of sale records
   */
  async getBuyerSaleHistory(
    buyerId: bigint,
    limit: number = 100
  ): Promise<MarketSaleHistory[]> {
    return this.db
      .select()
      .from(marketSaleHistory)
      .where(eq(marketSaleHistory.buyerId, buyerId))
      .orderBy(desc(marketSaleHistory.soldAt))
      .limit(limit);
  }

  /**
   * Get price history for an item template
   * @param itemTemplateCrc Item template CRC
   * @param days Number of days of history
   * @returns Array of sale records
   */
  async getItemPriceHistory(
    itemTemplateCrc: number,
    days: number = 30
  ): Promise<MarketSaleHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.db
      .select()
      .from(marketSaleHistory)
      .where(
        and(
          eq(marketSaleHistory.itemTemplateCrc, itemTemplateCrc),
          gte(marketSaleHistory.soldAt, cutoffDate)
        )
      )
      .orderBy(desc(marketSaleHistory.soldAt));
  }

  /**
   * Get average sale price for an item template
   * @param itemTemplateCrc Item template CRC
   * @param days Number of days to average over
   * @returns Average price or null if no sales
   */
  async getAveragePrice(
    itemTemplateCrc: number,
    days: number = 30
  ): Promise<number | null> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.db
      .select({
        avgPrice: sql<number>`AVG(${marketSaleHistory.salePrice})`,
      })
      .from(marketSaleHistory)
      .where(
        and(
          eq(marketSaleHistory.itemTemplateCrc, itemTemplateCrc),
          gte(marketSaleHistory.soldAt, cutoffDate)
        )
      );

    return result[0]?.avgPrice ?? null;
  }

  // ============================================================================
  // Vendor Inventory
  // ============================================================================

  /**
   * Add an item to a vendor's inventory
   * @param vendorId Vendor object ID
   * @param itemId Item object ID
   * @param price Price in credits
   * @param description Optional description
   * @returns The created inventory entry
   */
  async addToVendor(
    vendorId: bigint,
    itemId: bigint,
    price: number,
    description?: string
  ): Promise<VendorInventory> {
    const newEntry: NewVendorInventory = {
      vendorId,
      itemId,
      price,
      description: description ?? null,
    };

    await this.db.insert(vendorInventory).values(newEntry);

    const result = await this.db
      .select()
      .from(vendorInventory)
      .where(
        and(
          eq(vendorInventory.vendorId, vendorId),
          eq(vendorInventory.itemId, itemId)
        )
      )
      .limit(1);

    if (result[0] === undefined) {
      throw new Error('Failed to retrieve created vendor inventory entry');
    }

    return result[0];
  }

  /**
   * Remove an item from a vendor's inventory
   * @param vendorId Vendor object ID
   * @param itemId Item object ID
   * @returns True if removed, false if not found
   */
  async removeFromVendor(vendorId: bigint, itemId: bigint): Promise<boolean> {
    const result = await this.db
      .delete(vendorInventory)
      .where(
        and(
          eq(vendorInventory.vendorId, vendorId),
          eq(vendorInventory.itemId, itemId)
        )
      );

    return result[0].affectedRows > 0;
  }

  /**
   * Get all items on a vendor
   * @param vendorId Vendor object ID
   * @returns Array of vendor inventory entries
   */
  async getVendorItems(vendorId: bigint): Promise<VendorInventory[]> {
    return this.db
      .select()
      .from(vendorInventory)
      .where(eq(vendorInventory.vendorId, vendorId))
      .orderBy(asc(vendorInventory.price));
  }

  /**
   * Update item price on vendor
   * @param vendorId Vendor object ID
   * @param itemId Item object ID
   * @param price New price
   * @returns True if updated, false if not found
   */
  async updateVendorItemPrice(
    vendorId: bigint,
    itemId: bigint,
    price: number
  ): Promise<boolean> {
    const result = await this.db
      .update(vendorInventory)
      .set({ price })
      .where(
        and(
          eq(vendorInventory.vendorId, vendorId),
          eq(vendorInventory.itemId, itemId)
        )
      );

    return result[0].affectedRows > 0;
  }

  /**
   * Update item description on vendor
   * @param vendorId Vendor object ID
   * @param itemId Item object ID
   * @param description New description
   * @returns True if updated, false if not found
   */
  async updateVendorItemDescription(
    vendorId: bigint,
    itemId: bigint,
    description: string
  ): Promise<boolean> {
    const result = await this.db
      .update(vendorInventory)
      .set({ description })
      .where(
        and(
          eq(vendorInventory.vendorId, vendorId),
          eq(vendorInventory.itemId, itemId)
        )
      );

    return result[0].affectedRows > 0;
  }

  // ============================================================================
  // Analytics & Statistics
  // ============================================================================

  /**
   * Get count of active listings
   * @param filters Optional filters
   * @returns Number of active listings
   */
  async getActiveListingCount(
    filters: Pick<ListingSearchFilters, 'category' | 'planetId'>  = {}
  ): Promise<number> {
    const conditions = [eq(marketAuctions.status, 'active')];

    if (filters.category !== undefined) {
      conditions.push(eq(marketAuctions.itemCategory, filters.category));
    }

    if (filters.planetId !== undefined) {
      conditions.push(eq(marketAuctions.planetId, filters.planetId));
    }

    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(marketAuctions)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  /**
   * Get sales volume for a time period
   * @param days Number of days to sum
   * @returns Total sales volume in credits
   */
  async getSalesVolume(days: number = 1): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.db
      .select({
        volume: sql<number>`COALESCE(SUM(${marketSaleHistory.salePrice}), 0)`,
      })
      .from(marketSaleHistory)
      .where(gte(marketSaleHistory.soldAt, cutoffDate));

    return result[0]?.volume ?? 0;
  }

  /**
   * Get number of sales for a time period
   * @param days Number of days to count
   * @returns Number of sales
   */
  async getSalesCount(days: number = 1): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(marketSaleHistory)
      .where(gte(marketSaleHistory.soldAt, cutoffDate));

    return result[0]?.count ?? 0;
  }
}

/**
 * Create a new MarketRepository instance
 * @param db Optional database instance (uses getDb() if not provided)
 * @returns MarketRepository instance
 */
export function createMarketRepository(db?: Database): MarketRepository {
  return new MarketRepository(db);
}
