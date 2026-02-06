/**
 * Market Schema
 * Database schema for bazaar/auction system, vendor inventory, and sales history
 */

import {
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { characters } from './characters.js';
import { objects } from './objects.js';

/**
 * Market auctions table schema
 * Stores active auction listings in the bazaar/commodity market
 */
export const marketAuctions = mysqlTable(
  'market_auctions',
  {
    /** Unique auction listing ID */
    auctionId: bigint('auction_id', { mode: 'bigint' }).primaryKey(),
    /** Seller character ID */
    sellerId: bigint('seller_id', { mode: 'bigint' }).notNull(),
    /** Seller character name (snapshot at listing time) */
    sellerName: varchar('seller_name', { length: 64 }).notNull(),

    // Item info (snapshot at listing time)
    /** Item object ID */
    itemId: bigint('item_id', { mode: 'bigint' }).notNull(),
    /** Item name (snapshot at listing time) */
    itemName: varchar('item_name', { length: 128 }).notNull(),
    /** CRC32 hash of item template */
    itemTemplateCrc: int('item_template_crc').notNull(),
    /** Item category for filtering */
    itemCategory: int('item_category').notNull(),
    /** Serialized item attributes as JSON */
    itemAttributes: json('item_attributes'),

    // Pricing
    /** List price or starting bid */
    price: int('price').notNull(),
    /** Whether this is an auction (true) or instant sale (false) */
    isAuction: boolean('is_auction').default(false),
    /** Buy now price for auctions */
    instantSalePrice: int('instant_sale_price'),

    // Location
    /** Vendor object ID (null = bazaar terminal) */
    vendorId: bigint('vendor_id', { mode: 'bigint' }),
    /** Planet/zone identifier */
    planetId: varchar('planet_id', { length: 32 }).notNull(),
    /** Regional identifier for filtering */
    regionId: varchar('region_id', { length: 64 }),

    // Timing
    /** When the listing was created */
    listedAt: timestamp('listed_at').defaultNow(),
    /** When the listing expires */
    expiresAt: timestamp('expires_at').notNull(),

    // Status
    /** Listing status: active, sold, expired, cancelled */
    status: varchar('status', { length: 16 }).default('active'),
  },
  (table) => ({
    // Seller lookups - find all listings by a seller
    sellerIdIdx: index('idx_market_auctions_seller_id').on(table.sellerId),
    // Category searches - filter by item type
    categoryIdx: index('idx_market_auctions_category').on(table.itemCategory),
    // Planet/region searches - location filtering
    planetIdIdx: index('idx_market_auctions_planet_id').on(table.planetId),
    planetRegionIdx: index('idx_market_auctions_planet_region').on(table.planetId, table.regionId),
    // Expiration processing - batch expire old listings
    expiresAtIdx: index('idx_market_auctions_expires_at').on(table.expiresAt),
    statusExpiresIdx: index('idx_market_auctions_status_expires').on(table.status, table.expiresAt),
    // Price range queries
    priceIdx: index('idx_market_auctions_price').on(table.price),
    // Combined search: category + planet + price (common bazaar search)
    categoryPlanetPriceIdx: index('idx_market_auctions_category_planet_price').on(
      table.itemCategory,
      table.planetId,
      table.price
    ),
    // Vendor listings lookup
    vendorIdIdx: index('idx_market_auctions_vendor_id').on(table.vendorId),
    // Item template lookup for price history
    templateCrcIdx: index('idx_market_auctions_template_crc').on(table.itemTemplateCrc),
  })
);

/**
 * Market bids table schema
 * Stores bids on auction listings
 */
export const marketBids = mysqlTable(
  'market_bids',
  {
    /** Unique bid ID */
    bidId: bigint('bid_id', { mode: 'bigint' }).primaryKey(),
    /** Auction this bid is for */
    auctionId: bigint('auction_id', { mode: 'bigint' }).notNull(),
    /** Bidder character ID */
    bidderId: bigint('bidder_id', { mode: 'bigint' }).notNull(),
    /** Bidder character name */
    bidderName: varchar('bidder_name', { length: 64 }).notNull(),
    /** Bid amount in credits */
    amount: int('amount').notNull(),
    /** When the bid was placed */
    bidAt: timestamp('bid_at').defaultNow(),
    /** Whether this is currently the winning bid */
    isWinning: boolean('is_winning').default(false),
  },
  (table) => ({
    // Find all bids for an auction
    auctionIdIdx: index('idx_market_bids_auction_id').on(table.auctionId),
    // Find all bids by a bidder
    bidderIdIdx: index('idx_market_bids_bidder_id').on(table.bidderId),
    // Find winning bids
    auctionWinningIdx: index('idx_market_bids_auction_winning').on(table.auctionId, table.isWinning),
    // Bid amount ordering
    auctionAmountIdx: index('idx_market_bids_auction_amount').on(table.auctionId, table.amount),
  })
);

/**
 * Market sale history table schema
 * Stores completed sales for analytics and price history
 */
export const marketSaleHistory = mysqlTable(
  'market_sale_history',
  {
    /** Unique sale ID */
    saleId: bigint('sale_id', { mode: 'bigint' }).primaryKey(),
    /** Seller character ID */
    sellerId: bigint('seller_id', { mode: 'bigint' }).notNull(),
    /** Buyer character ID */
    buyerId: bigint('buyer_id', { mode: 'bigint' }).notNull(),
    /** CRC32 hash of item template */
    itemTemplateCrc: int('item_template_crc').notNull(),
    /** Item category for filtering */
    itemCategory: int('item_category').notNull(),
    /** Final sale price */
    salePrice: int('sale_price').notNull(),
    /** Planet where the sale occurred */
    planetId: varchar('planet_id', { length: 32 }),
    /** When the sale completed */
    soldAt: timestamp('sold_at').defaultNow(),
  },
  (table) => ({
    // Find sales by seller
    sellerIdIdx: index('idx_market_sale_history_seller_id').on(table.sellerId),
    // Find sales by buyer
    buyerIdIdx: index('idx_market_sale_history_buyer_id').on(table.buyerId),
    // Price history by item template
    templateCrcIdx: index('idx_market_sale_history_template_crc').on(table.itemTemplateCrc),
    // Category analytics
    categoryIdx: index('idx_market_sale_history_category').on(table.itemCategory),
    // Time-based queries for analytics
    soldAtIdx: index('idx_market_sale_history_sold_at').on(table.soldAt),
    // Combined template + time for price trends
    templateSoldIdx: index('idx_market_sale_history_template_sold').on(
      table.itemTemplateCrc,
      table.soldAt
    ),
  })
);

/**
 * Vendor inventory table schema
 * Stores items listed on player vendors
 */
export const vendorInventory = mysqlTable(
  'vendor_inventory',
  {
    /** Vendor object ID */
    vendorId: bigint('vendor_id', { mode: 'bigint' }).notNull(),
    /** Item object ID */
    itemId: bigint('item_id', { mode: 'bigint' }).notNull(),
    /** Item price in credits */
    price: int('price').notNull(),
    /** Optional item description */
    description: varchar('description', { length: 256 }),
    /** When the item was added to vendor */
    addedAt: timestamp('added_at').defaultNow(),
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.vendorId, table.itemId] }),
    // Find all items on a vendor
    vendorIdIdx: index('idx_vendor_inventory_vendor_id').on(table.vendorId),
    // Find which vendor has an item
    itemIdIdx: index('idx_vendor_inventory_item_id').on(table.itemId),
    // Price ordering for vendor display
    vendorPriceIdx: index('idx_vendor_inventory_vendor_price').on(table.vendorId, table.price),
  })
);

/**
 * Market auctions relations
 */
export const marketAuctionsRelations = relations(marketAuctions, ({ one, many }) => ({
  seller: one(characters, {
    fields: [marketAuctions.sellerId],
    references: [characters.characterId],
  }),
  item: one(objects, {
    fields: [marketAuctions.itemId],
    references: [objects.objectId],
  }),
  vendor: one(objects, {
    fields: [marketAuctions.vendorId],
    references: [objects.objectId],
  }),
  bids: many(marketBids),
}));

/**
 * Market bids relations
 */
export const marketBidsRelations = relations(marketBids, ({ one }) => ({
  auction: one(marketAuctions, {
    fields: [marketBids.auctionId],
    references: [marketAuctions.auctionId],
  }),
  bidder: one(characters, {
    fields: [marketBids.bidderId],
    references: [characters.characterId],
  }),
}));

/**
 * Market sale history relations
 */
export const marketSaleHistoryRelations = relations(marketSaleHistory, ({ one }) => ({
  seller: one(characters, {
    fields: [marketSaleHistory.sellerId],
    references: [characters.characterId],
    relationName: 'seller',
  }),
  buyer: one(characters, {
    fields: [marketSaleHistory.buyerId],
    references: [characters.characterId],
    relationName: 'buyer',
  }),
}));

/**
 * Vendor inventory relations
 */
export const vendorInventoryRelations = relations(vendorInventory, ({ one }) => ({
  vendor: one(objects, {
    fields: [vendorInventory.vendorId],
    references: [objects.objectId],
  }),
  item: one(objects, {
    fields: [vendorInventory.itemId],
    references: [objects.objectId],
  }),
}));

/**
 * Market auction insert type
 */
export type NewMarketAuction = typeof marketAuctions.$inferInsert;

/**
 * Market auction select type
 */
export type MarketAuction = typeof marketAuctions.$inferSelect;

/**
 * Market bid insert type
 */
export type NewMarketBid = typeof marketBids.$inferInsert;

/**
 * Market bid select type
 */
export type MarketBid = typeof marketBids.$inferSelect;

/**
 * Market sale history insert type
 */
export type NewMarketSaleHistory = typeof marketSaleHistory.$inferInsert;

/**
 * Market sale history select type
 */
export type MarketSaleHistory = typeof marketSaleHistory.$inferSelect;

/**
 * Vendor inventory insert type
 */
export type NewVendorInventory = typeof vendorInventory.$inferInsert;

/**
 * Vendor inventory select type
 */
export type VendorInventory = typeof vendorInventory.$inferSelect;

/**
 * Auction status enum type
 */
export type AuctionStatus = 'active' | 'sold' | 'expired' | 'cancelled';
