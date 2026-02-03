/**
 * City Service
 * Manages player city lifecycle, citizen management, elections, civic structures,
 * and economy for player-run cities in Star Wars Galaxies.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  CityObject,
  CityRank,
  CitySpecialization,
  CitizenRank,
  CityStructureType,
  TaxType,
  CitizenRemovalReason,
  type CityOperationResult,
  type CitizenRecord,
  type CityElection,
  MIN_CITY_DISTANCE,
  MIN_CITIZENS_FOR_CITY,
  STRUCTURE_MIN_RANK,
  STRUCTURE_MAINTENANCE_COST,
  UPKEEP_PERIOD_DAYS,
  hasElectionEnded,
} from '@swg/objects';
import { generateObjectId } from '@swg/objects';

/**
 * City service options
 */
export interface CityServiceOptions {
  /** Enable automatic upkeep processing */
  enableAutoUpkeep?: boolean;
  /** Upkeep processing interval in milliseconds (default: 1 hour) */
  upkeepCheckInterval?: number;
  /** Enable election status checking */
  enableElectionProcessing?: boolean;
  /** Election check interval in milliseconds (default: 1 hour) */
  electionCheckInterval?: number;
}

/**
 * City persistence provider interface
 */
export interface CityPersistenceProvider {
  /** Load city data from database */
  loadCity(cityId: bigint): Promise<CityObject | null>;
  /** Save city data to database */
  saveCity(city: CityObject): Promise<boolean>;
  /** Load all cities for a planet */
  loadCitiesForPlanet(planetId: string): Promise<CityObject[]>;
  /** Delete city from database */
  deleteCity(cityId: bigint): Promise<boolean>;
}

/**
 * City founded event data
 */
export interface CityFoundedEvent {
  cityId: bigint;
  cityName: string;
  founderId: ObjectId;
  founderName: string;
  planetId: string;
  position: { x: number; z: number };
  timestamp: number;
}

/**
 * City disbanded event data
 */
export interface CityDisbandedEvent {
  cityId: bigint;
  cityName: string;
  reason: string;
  timestamp: number;
}

/**
 * Election result event data
 */
export interface ElectionResultEvent {
  cityId: bigint;
  cityName: string;
  winnerId: ObjectId;
  winnerName: string;
  voteCount: number;
  timestamp: number;
}

/**
 * Tax collection event data
 */
export interface TaxCollectionEvent {
  cityId: bigint;
  cityName: string;
  amount: bigint;
  taxType: TaxType;
  timestamp: number;
}

/**
 * Callbacks for city events
 */
export type CityFoundedCallback = (event: CityFoundedEvent) => void;
export type CityDisbandedCallback = (event: CityDisbandedEvent) => void;
export type ElectionResultCallback = (event: ElectionResultEvent) => void;
export type TaxCollectionCallback = (event: TaxCollectionEvent) => void;

/**
 * City Service
 * Central service for managing all player cities
 */
export class CityService {
  // ============================================
  // City Storage and Indexes
  // ============================================

  /** Active cities in memory */
  readonly cities: Map<bigint, CityObject>;

  /** Index of cities by planet */
  readonly citiesByPlanet: Map<string, Set<bigint>>;

  /** Index of cities by mayor */
  readonly citiesByMayor: Map<ObjectId, bigint>;

  /** Index of cities by citizen (player -> cityId) */
  private readonly citiesByCitizen: Map<ObjectId, bigint>;

  // ============================================
  // Configuration
  // ============================================

  /** Configuration options */
  private readonly options: Required<CityServiceOptions>;

  /** Persistence provider */
  private persistenceProvider?: CityPersistenceProvider;

  // ============================================
  // Timers and State
  // ============================================

  /** Upkeep processing timer */
  private upkeepTimer?: ReturnType<typeof setInterval>;

  /** Election processing timer */
  private electionTimer?: ReturnType<typeof setInterval>;

  /** Initialization flag */
  private initialized: boolean = false;

  // ============================================
  // Event Callbacks
  // ============================================

  /** City founded callbacks */
  private readonly foundedCallbacks: Set<CityFoundedCallback>;

  /** City disbanded callbacks */
  private readonly disbandedCallbacks: Set<CityDisbandedCallback>;

  /** Election result callbacks */
  private readonly electionCallbacks: Set<ElectionResultCallback>;

  /** Tax collection callbacks */
  private readonly taxCallbacks: Set<TaxCollectionCallback>;

  constructor(options: CityServiceOptions = {}) {
    this.cities = new Map();
    this.citiesByPlanet = new Map();
    this.citiesByMayor = new Map();
    this.citiesByCitizen = new Map();

    this.foundedCallbacks = new Set();
    this.disbandedCallbacks = new Set();
    this.electionCallbacks = new Set();
    this.taxCallbacks = new Set();

    this.options = {
      enableAutoUpkeep: options.enableAutoUpkeep ?? true,
      upkeepCheckInterval: options.upkeepCheckInterval ?? 60 * 60 * 1000, // 1 hour
      enableElectionProcessing: options.enableElectionProcessing ?? true,
      electionCheckInterval: options.electionCheckInterval ?? 60 * 60 * 1000, // 1 hour
    };
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the city service
   */
  async initialize(persistenceProvider?: CityPersistenceProvider): Promise<void> {
    if (this.initialized) {
      console.warn('[CityService] Already initialized');
      return;
    }

    console.log('[CityService] Initializing...');

    this.persistenceProvider = persistenceProvider;

    // Start upkeep processing if enabled
    if (this.options.enableAutoUpkeep) {
      this.startUpkeepProcessing();
    }

    // Start election processing if enabled
    if (this.options.enableElectionProcessing) {
      this.startElectionProcessing();
    }

    this.initialized = true;
    console.log('[CityService] Initialized');
  }

  /**
   * Shutdown the city service
   */
  async shutdown(): Promise<void> {
    console.log('[CityService] Shutting down...');

    // Stop timers
    this.stopUpkeepProcessing();
    this.stopElectionProcessing();

    // Save all modified cities
    if (this.persistenceProvider) {
      for (const city of this.cities.values()) {
        if (city.isModified()) {
          await this.saveCity(city.cityId);
        }
      }
    }

    // Clear all data
    this.cities.clear();
    this.citiesByPlanet.clear();
    this.citiesByMayor.clear();
    this.citiesByCitizen.clear();
    this.foundedCallbacks.clear();
    this.disbandedCallbacks.clear();
    this.electionCallbacks.clear();
    this.taxCallbacks.clear();
    this.initialized = false;

    console.log('[CityService] Shutdown complete');
  }

  /**
   * Set the persistence provider
   */
  setPersistenceProvider(provider: CityPersistenceProvider): void {
    this.persistenceProvider = provider;
  }

  // ============================================
  // City Lifecycle
  // ============================================

  /**
   * Found a new city
   * @param founderId - Character ID of the city founder
   * @param founderName - Name of the founding character
   * @param name - City name
   * @param position - City center position
   * @param planetId - Planet the city is on
   * @returns Operation result with city ID
   */
  foundCity(
    founderId: ObjectId,
    founderName: string,
    name: string,
    position: { x: number; z: number },
    planetId: string
  ): CityOperationResult & { cityId?: bigint } {
    // Validate city name
    if (!name || name.length < 3 || name.length > 40) {
      return {
        success: false,
        message: 'City name must be between 3 and 40 characters',
        code: 'INVALID_NAME',
      };
    }

    // Check if player is already a citizen of another city
    if (this.citiesByCitizen.has(founderId)) {
      return {
        success: false,
        message: 'You must leave your current city before founding a new one',
        code: 'ALREADY_CITIZEN',
      };
    }

    // Check if player is already a mayor
    if (this.citiesByMayor.has(founderId)) {
      return {
        success: false,
        message: 'You are already the mayor of a city',
        code: 'ALREADY_MAYOR',
      };
    }

    // Check distance from other cities
    const nearbyCity = this.getCityAtPosition(position, planetId);
    if (nearbyCity) {
      return {
        success: false,
        message: `Too close to existing city: ${nearbyCity.name}`,
        code: 'TOO_CLOSE',
      };
    }

    // Generate city ID and create city
    const cityId = generateObjectId();
    const city = new CityObject(
      cityId,
      name,
      planetId,
      position.x,
      position.z,
      founderId,
      founderName
    );

    // Register city in indexes
    this.registerCity(city);

    console.log(
      `[CityService] City founded: ${name} (${cityId}) by ${founderName} on ${planetId}`
    );

    // Emit founded event
    this.emitCityFounded({
      cityId,
      cityName: name,
      founderId,
      founderName,
      planetId,
      position,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `City ${name} has been founded!`,
      cityId,
    };
  }

  /**
   * Disband a city
   * @param cityId - City to disband
   * @param actorId - Character performing the action
   * @returns Operation result
   */
  disbandCity(cityId: bigint, actorId: ObjectId): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Only mayor can disband
    if (city.mayorId !== actorId) {
      return {
        success: false,
        message: 'Only the mayor can disband the city',
        code: 'NOT_MAYOR',
      };
    }

    const cityName = city.name;

    // Remove all citizens from indexes
    for (const citizen of city.citizens.values()) {
      this.citiesByCitizen.delete(citizen.characterId);
    }

    // Unregister city
    this.unregisterCity(cityId);

    // Delete from persistence
    if (this.persistenceProvider) {
      this.persistenceProvider.deleteCity(cityId).catch((error) => {
        console.error(`[CityService] Failed to delete city ${cityId}:`, error);
      });
    }

    console.log(`[CityService] City disbanded: ${cityName} (${cityId})`);

    // Emit disbanded event
    this.emitCityDisbanded({
      cityId,
      cityName,
      reason: 'Disbanded by mayor',
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `City ${cityName} has been disbanded`,
    };
  }

  /**
   * Load a city from the database
   */
  async loadCity(cityId: bigint): Promise<CityObject | null> {
    // Check if already loaded
    const existing = this.cities.get(cityId);
    if (existing) {
      return existing;
    }

    if (!this.persistenceProvider) {
      console.warn('[CityService] No persistence provider configured');
      return null;
    }

    try {
      const city = await this.persistenceProvider.loadCity(cityId);
      if (city) {
        this.registerCity(city);
        city.clearModified();
        console.log(`[CityService] Loaded city: ${city.name} (${cityId})`);
      }
      return city;
    } catch (error) {
      console.error(`[CityService] Failed to load city ${cityId}:`, error);
      return null;
    }
  }

  /**
   * Save a city to the database
   */
  async saveCity(cityId: bigint): Promise<boolean> {
    const city = this.cities.get(cityId);
    if (!city) {
      console.warn(`[CityService] Cannot save: City ${cityId} not found`);
      return false;
    }

    if (!this.persistenceProvider) {
      console.warn('[CityService] No persistence provider configured');
      return false;
    }

    try {
      const success = await this.persistenceProvider.saveCity(city);
      if (success) {
        city.clearModified();
      }
      return success;
    } catch (error) {
      console.error(`[CityService] Failed to save city ${cityId}:`, error);
      return false;
    }
  }

  /**
   * Get city at or near a position
   * @param position - World position to check
   * @param planetId - Planet to check on
   * @returns City if found within MIN_CITY_DISTANCE, undefined otherwise
   */
  getCityAtPosition(
    position: { x: number; z: number },
    planetId: string
  ): CityObject | undefined {
    const cityIds = this.citiesByPlanet.get(planetId);
    if (!cityIds) {
      return undefined;
    }

    for (const cityId of cityIds) {
      const city = this.cities.get(cityId);
      if (city) {
        const distance = city.getDistanceFromCenter(position.x, position.z);
        if (distance < MIN_CITY_DISTANCE) {
          return city;
        }
      }
    }

    return undefined;
  }

  /**
   * Get all cities on a planet
   */
  getCitiesOnPlanet(planetId: string): CityObject[] {
    const cityIds = this.citiesByPlanet.get(planetId);
    if (!cityIds) {
      return [];
    }

    const cities: CityObject[] = [];
    for (const cityId of cityIds) {
      const city = this.cities.get(cityId);
      if (city) {
        cities.push(city);
      }
    }
    return cities;
  }

  /**
   * Get a city by ID
   */
  getCity(cityId: bigint): CityObject | undefined {
    return this.cities.get(cityId);
  }

  /**
   * Get a player's current city
   */
  getPlayerCity(playerId: ObjectId): CityObject | undefined {
    const cityId = this.citiesByCitizen.get(playerId);
    if (cityId === undefined) {
      return undefined;
    }
    return this.cities.get(cityId);
  }

  // ============================================
  // Citizen Management
  // ============================================

  /**
   * Player joins a city
   * @param cityId - City to join
   * @param playerId - Player joining
   * @param playerName - Player's name
   */
  joinCity(
    cityId: bigint,
    playerId: ObjectId,
    playerName: string
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Check if player is already a citizen of another city
    const currentCityId = this.citiesByCitizen.get(playerId);
    if (currentCityId !== undefined && currentCityId !== cityId) {
      return {
        success: false,
        message: 'You must leave your current city first',
        code: 'ALREADY_CITIZEN',
      };
    }

    // Add citizen to city
    const result = city.addCitizen(playerId, playerName);
    if (result.success) {
      this.citiesByCitizen.set(playerId, cityId);
    }

    return result;
  }

  /**
   * Player leaves a city
   * @param cityId - City to leave
   * @param playerId - Player leaving
   */
  leaveCity(cityId: bigint, playerId: ObjectId): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    const result = city.removeCitizen(playerId, CitizenRemovalReason.Left);
    if (result.success) {
      this.citiesByCitizen.delete(playerId);

      // Check if city should be disbanded (below minimum citizens)
      if (city.getCitizenCount() < MIN_CITIZENS_FOR_CITY) {
        this.checkCityViability(city);
      }
    }

    return result;
  }

  /**
   * Ban a player from a city
   * @param cityId - City to ban from
   * @param targetId - Player to ban
   * @param actorId - Player performing the ban
   */
  banFromCity(
    cityId: bigint,
    targetId: ObjectId,
    actorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Only mayor can ban
    if (city.mayorId !== actorId) {
      return {
        success: false,
        message: 'Only the mayor can ban citizens',
        code: 'NOT_MAYOR',
      };
    }

    // Cannot ban yourself
    if (targetId === actorId) {
      return {
        success: false,
        message: 'Cannot ban yourself',
        code: 'CANNOT_BAN_SELF',
      };
    }

    const result = city.removeCitizen(targetId, CitizenRemovalReason.Banished);
    if (result.success) {
      this.citiesByCitizen.delete(targetId);
    }

    return result;
  }

  /**
   * Promote a citizen to a new rank
   * @param cityId - City ID
   * @param targetId - Citizen to promote
   * @param newRank - New rank to assign
   * @param actorId - Player performing the promotion
   */
  promoteCitizen(
    cityId: bigint,
    targetId: ObjectId,
    newRank: CitizenRank,
    actorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.promoteCitizen(targetId, newRank, actorId);
  }

  // ============================================
  // Election System
  // ============================================

  /**
   * Start a mayoral election
   */
  startElection(cityId: bigint): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.startElection();
  }

  /**
   * Register as a candidate in an election
   */
  registerCandidate(cityId: bigint, playerId: ObjectId): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.registerAsCandidate(playerId);
  }

  /**
   * Cast a vote in an election
   */
  castVote(
    cityId: bigint,
    voterId: ObjectId,
    candidateId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.castVote(voterId, candidateId);
  }

  /**
   * Process election results for a city
   */
  processElection(cityId: bigint): CityOperationResult & { winnerId?: ObjectId; winnerName?: string } {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    if (!city.currentElection) {
      return {
        success: false,
        message: 'No active election',
        code: 'NO_ELECTION',
      };
    }

    if (!hasElectionEnded(city.currentElection)) {
      return {
        success: false,
        message: 'Election has not ended yet',
        code: 'ELECTION_ACTIVE',
      };
    }

    const oldMayorId = city.mayorId;
    const result = city.endElection();

    if (result.success && result.winnerId !== undefined) {
      // Update mayor index if changed
      if (result.winnerId !== oldMayorId) {
        this.citiesByMayor.delete(oldMayorId);
        this.citiesByMayor.set(result.winnerId, cityId);
      }

      // Emit election result event
      const winner = city.citizens.get(result.winnerId);
      this.emitElectionResult({
        cityId,
        cityName: city.name,
        winnerId: result.winnerId,
        winnerName: winner?.name ?? 'Unknown',
        voteCount: 0, // Could track this if needed
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * Check if a city has an active election
   */
  checkElectionStatus(cityId: bigint): { active: boolean; election?: CityElection } {
    const city = this.cities.get(cityId);
    if (!city || !city.currentElection) {
      return { active: false };
    }

    const ended = hasElectionEnded(city.currentElection);
    return {
      active: !ended,
      election: city.currentElection,
    };
  }

  // ============================================
  // Civic Structures
  // ============================================

  /**
   * Place a civic structure in a city
   * @param cityId - City ID
   * @param structureType - Type of civic structure
   * @param structureId - Object ID of the structure
   * @param position - Structure position
   * @param actorId - Player placing the structure
   */
  placeCivicStructure(
    cityId: bigint,
    structureType: CityStructureType,
    structureId: ObjectId,
    position: { x: number; z: number },
    actorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Only mayor can place structures
    if (city.mayorId !== actorId) {
      return {
        success: false,
        message: 'Only the mayor can place civic structures',
        code: 'NOT_MAYOR',
      };
    }

    // Check if position is within city bounds
    if (!city.isInCityBounds(position.x, position.z)) {
      return {
        success: false,
        message: 'Structure must be placed within city boundaries',
        code: 'OUT_OF_BOUNDS',
      };
    }

    // Check structure requirements
    const reqCheck = this.checkStructureRequirements(cityId, structureType);
    if (!reqCheck.success) {
      return reqCheck;
    }

    return city.addStructure(structureId, structureType);
  }

  /**
   * Remove a civic structure from a city
   */
  removeCivicStructure(
    cityId: bigint,
    structureId: ObjectId,
    actorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Only mayor can remove structures
    if (city.mayorId !== actorId) {
      return {
        success: false,
        message: 'Only the mayor can remove civic structures',
        code: 'NOT_MAYOR',
      };
    }

    return city.removeStructure(structureId);
  }

  /**
   * Get all civic structures in a city
   */
  getCivicStructures(cityId: bigint): Map<ObjectId, CityStructureType> | undefined {
    const city = this.cities.get(cityId);
    return city?.structures;
  }

  /**
   * Check if a city meets the requirements for a structure type
   */
  checkStructureRequirements(
    cityId: bigint,
    structureType: CityStructureType
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Check rank requirement
    const minRank = STRUCTURE_MIN_RANK[structureType];
    if (city.rank < minRank) {
      return {
        success: false,
        message: `City must be rank ${CityRank[minRank]} or higher for this structure`,
        code: 'RANK_TOO_LOW',
      };
    }

    // Check if city can afford the maintenance
    const maintenanceCost = STRUCTURE_MAINTENANCE_COST[structureType];
    const totalUpkeep = city.calculateUpkeepCost() + BigInt(maintenanceCost);
    if (totalUpkeep > city.treasury) {
      return {
        success: false,
        message: 'Insufficient treasury for structure maintenance',
        code: 'INSUFFICIENT_FUNDS',
      };
    }

    return {
      success: true,
      message: 'Requirements met',
    };
  }

  // ============================================
  // Economy
  // ============================================

  /**
   * Set a tax rate for a city
   */
  setTaxRate(
    cityId: bigint,
    taxType: TaxType,
    rate: number,
    actorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.setTaxRate(taxType, rate, actorId);
  }

  /**
   * Collect taxes for a city
   * In a full implementation, this would query vendors, property, etc.
   */
  collectTaxes(cityId: bigint): CityOperationResult & { amount?: bigint } {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    const amount = city.collectTaxes();

    if (amount > 0n) {
      for (const tax of city.taxes) {
        this.emitTaxCollection({
          cityId,
          cityName: city.name,
          amount,
          taxType: tax.taxType,
          timestamp: Date.now(),
        });
      }
    }

    return {
      success: true,
      message: `Collected ${amount} credits in taxes`,
      amount,
    };
  }

  /**
   * Deposit credits to city treasury
   */
  depositToTreasury(
    cityId: bigint,
    amount: bigint,
    depositorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    // Only citizens can deposit
    if (!city.isCitizen(depositorId)) {
      return {
        success: false,
        message: 'Only citizens can deposit to the treasury',
        code: 'NOT_CITIZEN',
      };
    }

    return city.depositCredits(amount, depositorId);
  }

  /**
   * Withdraw credits from city treasury
   */
  withdrawFromTreasury(
    cityId: bigint,
    amount: bigint,
    actorId: ObjectId
  ): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.withdrawCredits(amount, actorId);
  }

  /**
   * Pay upkeep for a single city
   */
  payUpkeep(cityId: bigint): CityOperationResult {
    const city = this.cities.get(cityId);
    if (!city) {
      return {
        success: false,
        message: 'City not found',
        code: 'NOT_FOUND',
      };
    }

    return city.payUpkeep();
  }

  /**
   * Process upkeep for all cities
   */
  processUpkeepCycle(): {
    processed: number;
    failed: number;
    citiesWithWarnings: bigint[];
  } {
    let processed = 0;
    let failed = 0;
    const citiesWithWarnings: bigint[] = [];

    const now = Date.now();
    const upkeepPeriodMs = UPKEEP_PERIOD_DAYS * 24 * 60 * 60 * 1000;

    for (const city of this.cities.values()) {
      const timeSinceUpkeep = now - city.upkeepPaid.getTime();

      if (timeSinceUpkeep >= upkeepPeriodMs) {
        const result = city.payUpkeep();
        if (result.success) {
          processed++;
        } else {
          failed++;
          citiesWithWarnings.push(city.cityId);
          console.warn(
            `[CityService] City ${city.name} (${city.cityId}) failed upkeep: ${result.message}`
          );
        }
      }
    }

    if (processed > 0 || failed > 0) {
      console.log(
        `[CityService] Upkeep cycle: ${processed} processed, ${failed} failed`
      );
    }

    return { processed, failed, citiesWithWarnings };
  }

  // ============================================
  // Internal Registration Methods
  // ============================================

  /**
   * Register a city in all indexes
   */
  private registerCity(city: CityObject): void {
    // Add to main map
    this.cities.set(city.cityId, city);

    // Add to planet index
    if (!this.citiesByPlanet.has(city.planetId)) {
      this.citiesByPlanet.set(city.planetId, new Set());
    }
    this.citiesByPlanet.get(city.planetId)!.add(city.cityId);

    // Add to mayor index
    this.citiesByMayor.set(city.mayorId, city.cityId);

    // Add all citizens to citizen index
    for (const citizen of city.citizens.values()) {
      this.citiesByCitizen.set(citizen.characterId, city.cityId);
    }
  }

  /**
   * Unregister a city from all indexes
   */
  private unregisterCity(cityId: bigint): void {
    const city = this.cities.get(cityId);
    if (!city) {
      return;
    }

    // Remove from planet index
    const planetCities = this.citiesByPlanet.get(city.planetId);
    if (planetCities) {
      planetCities.delete(cityId);
      if (planetCities.size === 0) {
        this.citiesByPlanet.delete(city.planetId);
      }
    }

    // Remove from mayor index
    this.citiesByMayor.delete(city.mayorId);

    // Remove from main map
    this.cities.delete(cityId);
  }

  /**
   * Check if a city is still viable (has enough citizens)
   */
  private checkCityViability(city: CityObject): void {
    if (city.getCitizenCount() < MIN_CITIZENS_FOR_CITY) {
      console.warn(
        `[CityService] City ${city.name} (${city.cityId}) is below minimum citizen threshold`
      );
      // In a full implementation, this would start a grace period timer
      // and potentially disband the city if citizens aren't added
    }
  }

  // ============================================
  // Timer Management
  // ============================================

  /**
   * Start upkeep processing timer
   */
  private startUpkeepProcessing(): void {
    if (this.upkeepTimer) {
      return;
    }

    this.upkeepTimer = setInterval(() => {
      this.processUpkeepCycle();
    }, this.options.upkeepCheckInterval);

    console.log(
      `[CityService] Upkeep processing started (interval: ${this.options.upkeepCheckInterval}ms)`
    );
  }

  /**
   * Stop upkeep processing timer
   */
  private stopUpkeepProcessing(): void {
    if (this.upkeepTimer) {
      clearInterval(this.upkeepTimer);
      this.upkeepTimer = undefined;
      console.log('[CityService] Upkeep processing stopped');
    }
  }

  /**
   * Start election processing timer
   */
  private startElectionProcessing(): void {
    if (this.electionTimer) {
      return;
    }

    this.electionTimer = setInterval(() => {
      this.processAllElections();
    }, this.options.electionCheckInterval);

    console.log(
      `[CityService] Election processing started (interval: ${this.options.electionCheckInterval}ms)`
    );
  }

  /**
   * Stop election processing timer
   */
  private stopElectionProcessing(): void {
    if (this.electionTimer) {
      clearInterval(this.electionTimer);
      this.electionTimer = undefined;
      console.log('[CityService] Election processing stopped');
    }
  }

  /**
   * Process all active elections
   */
  private processAllElections(): void {
    let processed = 0;

    for (const city of this.cities.values()) {
      if (city.currentElection && hasElectionEnded(city.currentElection)) {
        const result = this.processElection(city.cityId);
        if (result.success) {
          processed++;
        }
      }
    }

    if (processed > 0) {
      console.log(`[CityService] Processed ${processed} elections`);
    }
  }

  // ============================================
  // Event Callbacks
  // ============================================

  /**
   * Register callback for city founded events
   */
  onCityFounded(callback: CityFoundedCallback): void {
    this.foundedCallbacks.add(callback);
  }

  /**
   * Unregister city founded callback
   */
  offCityFounded(callback: CityFoundedCallback): void {
    this.foundedCallbacks.delete(callback);
  }

  /**
   * Register callback for city disbanded events
   */
  onCityDisbanded(callback: CityDisbandedCallback): void {
    this.disbandedCallbacks.add(callback);
  }

  /**
   * Unregister city disbanded callback
   */
  offCityDisbanded(callback: CityDisbandedCallback): void {
    this.disbandedCallbacks.delete(callback);
  }

  /**
   * Register callback for election result events
   */
  onElectionResult(callback: ElectionResultCallback): void {
    this.electionCallbacks.add(callback);
  }

  /**
   * Unregister election result callback
   */
  offElectionResult(callback: ElectionResultCallback): void {
    this.electionCallbacks.delete(callback);
  }

  /**
   * Register callback for tax collection events
   */
  onTaxCollection(callback: TaxCollectionCallback): void {
    this.taxCallbacks.add(callback);
  }

  /**
   * Unregister tax collection callback
   */
  offTaxCollection(callback: TaxCollectionCallback): void {
    this.taxCallbacks.delete(callback);
  }

  /**
   * Emit city founded event
   */
  private emitCityFounded(event: CityFoundedEvent): void {
    for (const callback of this.foundedCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[CityService] Error in founded callback:', error);
      }
    }
  }

  /**
   * Emit city disbanded event
   */
  private emitCityDisbanded(event: CityDisbandedEvent): void {
    for (const callback of this.disbandedCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[CityService] Error in disbanded callback:', error);
      }
    }
  }

  /**
   * Emit election result event
   */
  private emitElectionResult(event: ElectionResultEvent): void {
    for (const callback of this.electionCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[CityService] Error in election callback:', error);
      }
    }
  }

  /**
   * Emit tax collection event
   */
  private emitTaxCollection(event: TaxCollectionEvent): void {
    for (const callback of this.taxCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[CityService] Error in tax callback:', error);
      }
    }
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get city service statistics
   */
  getStats(): {
    totalCities: number;
    citiesByPlanet: Map<string, number>;
    totalCitizens: number;
    activeElections: number;
    totalTreasury: bigint;
  } {
    const citiesByPlanet = new Map<string, number>();
    let totalCitizens = 0;
    let activeElections = 0;
    let totalTreasury = 0n;

    for (const city of this.cities.values()) {
      // Count by planet
      const current = citiesByPlanet.get(city.planetId) ?? 0;
      citiesByPlanet.set(city.planetId, current + 1);

      // Count citizens
      totalCitizens += city.getCitizenCount();

      // Count active elections
      if (city.currentElection && !hasElectionEnded(city.currentElection)) {
        activeElections++;
      }

      // Sum treasury
      totalTreasury += city.treasury;
    }

    return {
      totalCities: this.cities.size,
      citiesByPlanet,
      totalCitizens,
      activeElections,
      totalTreasury,
    };
  }
}

/**
 * Create a new CityService instance
 */
export function createCityService(options?: CityServiceOptions): CityService {
  return new CityService(options);
}

/**
 * Singleton instance for global access
 */
let globalCityService: CityService | null = null;

/**
 * Get or create the global city service instance
 */
export function getCityService(options?: CityServiceOptions): CityService {
  if (!globalCityService) {
    globalCityService = new CityService(options);
  }
  return globalCityService;
}
