/**
 * BazaarTerminal - Bazaar/Auction terminal object for the SWG market system
 * Extends TangibleObject to represent physical terminals where players
 * can list, browse, and purchase items on the galactic marketplace.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';

/**
 * Default bazaar terminal commission rate (5%)
 */
export const DEFAULT_COMMISSION_RATE = 0.05;

/**
 * Default galactic bazaar commission rate (10%)
 */
export const DEFAULT_GALACTIC_COMMISSION_RATE = 0.10;

/**
 * Maximum commission rate allowed (20%)
 */
export const MAX_COMMISSION_RATE = 0.20;

/**
 * Terminal type enumeration for different bazaar terminal variants
 */
export enum BazaarTerminalType {
  /** Standard local bazaar terminal */
  Local = 0,
  /** Galactic bazaar terminal with galaxy-wide access */
  Galactic = 1,
  /** Commodity terminal for bulk resource trading */
  Commodity = 2,
  /** Vendor terminal for player-owned vendors */
  Vendor = 3,
}

/**
 * CRC template values for bazaar terminal types
 */
export const BAZAAR_TERMINAL_CRC = {
  /** Standard bazaar terminal template */
  Standard: 0x6e3b4dc2,
  /** Galactic bazaar terminal template */
  Galactic: 0x7f4c5ed3,
  /** Commodity terminal template */
  Commodity: 0x8d5d6fe4,
} as const;

/**
 * BazaarTerminal - Physical terminal for marketplace interactions
 *
 * Bazaar terminals allow players to:
 * - List items for sale (auction or instant buy)
 * - Browse and search for items
 * - Purchase items from other players
 * - Retrieve sold item credits
 * - Retrieve expired/unsold items
 * - Retrieve purchased/won items
 *
 * Terminals can be local (planet-specific) or galactic (galaxy-wide).
 * Local terminals have lower commission rates but limited visibility.
 * Galactic terminals have higher fees but reach all players.
 */
export class BazaarTerminal extends TangibleObject {
  /**
   * Unique terminal identifier
   * Used to track which terminal was used for listings and retrievals
   */
  terminalId: ObjectId;

  /**
   * Planet/zone where this terminal is located
   * Used for location-based search filtering
   */
  planetId: string;

  /**
   * Regional identifier within the planet
   * Used for more granular location filtering (e.g., "Mos Eisley", "Theed")
   */
  regionId: string;

  /**
   * Display name of the terminal
   * Shown in the bazaar UI (e.g., "Mos Eisley Bazaar", "Coronet Galactic Market")
   */
  terminalName: string;

  /**
   * Whether this terminal provides galactic (galaxy-wide) access
   * Galactic terminals can list items visible across all planets
   * Local terminals only show items from the same planet/region
   */
  isGalactic: boolean;

  /**
   * Commission rate for sales through this terminal
   * Expressed as a decimal (0.05 = 5%)
   * Deducted from the final sale price before crediting the seller
   */
  commissionRate: number;

  /**
   * Terminal type for UI display and filtering
   */
  terminalType: BazaarTerminalType;

  /**
   * Whether this terminal is currently operational
   * Terminals can be disabled for maintenance or by game events
   */
  isOperational: boolean;

  /**
   * Maximum number of active listings allowed through this terminal
   * Prevents market flooding from a single location
   */
  maxListings: number;

  /**
   * Current number of active listings from this terminal
   */
  currentListings: number;

  /**
   * Create a new BazaarTerminal
   * @param objectId - Unique 64-bit identifier for this terminal
   * @param templateCrc - CRC32 of the terminal template (defaults to standard bazaar)
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = BAZAAR_TERMINAL_CRC.Standard) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Terminal;

    // Initialize terminal-specific properties
    this.terminalId = objectId;
    this.planetId = '';
    this.regionId = '';
    this.terminalName = 'Bazaar Terminal';
    this.isGalactic = false;
    this.commissionRate = DEFAULT_COMMISSION_RATE;
    this.terminalType = BazaarTerminalType.Local;
    this.isOperational = true;
    this.maxListings = 1000;
    this.currentListings = 0;

    // Set default terminal object properties
    this.setObjectName('terminal_name', 'bazaar_terminal');
    this.setDetailDescription('terminal_detail', 'bazaar_terminal');
  }

  /**
   * Configure this terminal as a galactic terminal
   * Sets the appropriate commission rate and access level
   */
  configureAsGalactic(): void {
    this.isGalactic = true;
    this.commissionRate = DEFAULT_GALACTIC_COMMISSION_RATE;
    this.terminalType = BazaarTerminalType.Galactic;
    this.templateCrc = BAZAAR_TERMINAL_CRC.Galactic;
    this.markModified();
  }

  /**
   * Configure this terminal as a local terminal
   * Sets the appropriate commission rate and access level
   */
  configureAsLocal(): void {
    this.isGalactic = false;
    this.commissionRate = DEFAULT_COMMISSION_RATE;
    this.terminalType = BazaarTerminalType.Local;
    this.templateCrc = BAZAAR_TERMINAL_CRC.Standard;
    this.markModified();
  }

  /**
   * Configure this terminal as a commodity terminal
   * Used for bulk resource trading
   */
  configureAsCommodity(): void {
    this.isGalactic = true;
    this.commissionRate = DEFAULT_COMMISSION_RATE;
    this.terminalType = BazaarTerminalType.Commodity;
    this.templateCrc = BAZAAR_TERMINAL_CRC.Commodity;
    this.markModified();
  }

  /**
   * Set the terminal location
   * @param planetId - Planet/zone identifier
   * @param regionId - Region within the planet
   * @param terminalName - Display name for the terminal
   */
  setLocation(planetId: string, regionId: string, terminalName: string): void {
    this.planetId = planetId;
    this.regionId = regionId;
    this.terminalName = terminalName;
    this.markModified();
  }

  /**
   * Set the commission rate
   * @param rate - Commission rate as decimal (0.0 - MAX_COMMISSION_RATE)
   * @throws Error if rate is out of valid range
   */
  setCommissionRate(rate: number): void {
    if (rate < 0 || rate > MAX_COMMISSION_RATE) {
      throw new Error(
        `Commission rate must be between 0 and ${MAX_COMMISSION_RATE * 100}%`
      );
    }
    this.commissionRate = rate;
    this.markDirty('commissionRate');
    this.markModified();
  }

  /**
   * Calculate the commission for a given sale price
   * @param salePrice - The sale price in credits
   * @returns The commission amount to deduct
   */
  calculateCommission(salePrice: number): number {
    return Math.floor(salePrice * this.commissionRate);
  }

  /**
   * Calculate the net amount the seller receives after commission
   * @param salePrice - The sale price in credits
   * @returns The net amount credited to the seller
   */
  calculateNetSaleAmount(salePrice: number): number {
    return salePrice - this.calculateCommission(salePrice);
  }

  /**
   * Check if a listing can be created from this terminal
   * @returns true if more listings are allowed
   */
  canCreateListing(): boolean {
    return this.isOperational && this.currentListings < this.maxListings;
  }

  /**
   * Increment the listing count when a new listing is created
   */
  incrementListingCount(): void {
    this.currentListings++;
    this.markDirty('currentListings');
    this.markModified();
  }

  /**
   * Decrement the listing count when a listing is removed
   */
  decrementListingCount(): void {
    if (this.currentListings > 0) {
      this.currentListings--;
      this.markDirty('currentListings');
      this.markModified();
    }
  }

  /**
   * Enable the terminal for use
   */
  enable(): void {
    this.isOperational = true;
    this.markDirty('isOperational');
    this.markModified();
  }

  /**
   * Disable the terminal (for maintenance or events)
   */
  disable(): void {
    this.isOperational = false;
    this.markDirty('isOperational');
    this.markModified();
  }

  /**
   * Get the baseline type for this terminal
   * @returns The baseline type string
   */
  override getBaselineType(): string {
    return 'TANO';
  }

  /**
   * Serialize the terminal to JSON
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      terminalId: this.terminalId.toString(),
      planetId: this.planetId,
      regionId: this.regionId,
      terminalName: this.terminalName,
      isGalactic: this.isGalactic,
      commissionRate: this.commissionRate,
      terminalType: this.terminalType,
      isOperational: this.isOperational,
      maxListings: this.maxListings,
      currentListings: this.currentListings,
    };
  }
}

/**
 * Create a new local bazaar terminal
 * @param objectId - Unique object identifier
 * @param planetId - Planet where the terminal is located
 * @param regionId - Region within the planet
 * @param terminalName - Display name for the terminal
 * @returns Configured BazaarTerminal instance
 */
export function createLocalBazaarTerminal(
  objectId: ObjectId,
  planetId: string,
  regionId: string,
  terminalName: string
): BazaarTerminal {
  const terminal = new BazaarTerminal(objectId);
  terminal.configureAsLocal();
  terminal.setLocation(planetId, regionId, terminalName);
  return terminal;
}

/**
 * Create a new galactic bazaar terminal
 * @param objectId - Unique object identifier
 * @param planetId - Planet where the terminal is located
 * @param regionId - Region within the planet
 * @param terminalName - Display name for the terminal
 * @returns Configured BazaarTerminal instance
 */
export function createGalacticBazaarTerminal(
  objectId: ObjectId,
  planetId: string,
  regionId: string,
  terminalName: string
): BazaarTerminal {
  const terminal = new BazaarTerminal(objectId);
  terminal.configureAsGalactic();
  terminal.setLocation(planetId, regionId, terminalName);
  return terminal;
}

/**
 * Create a new commodity terminal
 * @param objectId - Unique object identifier
 * @param planetId - Planet where the terminal is located
 * @param regionId - Region within the planet
 * @param terminalName - Display name for the terminal
 * @returns Configured BazaarTerminal instance
 */
export function createCommodityTerminal(
  objectId: ObjectId,
  planetId: string,
  regionId: string,
  terminalName: string
): BazaarTerminal {
  const terminal = new BazaarTerminal(objectId);
  terminal.configureAsCommodity();
  terminal.setLocation(planetId, regionId, terminalName);
  return terminal;
}
