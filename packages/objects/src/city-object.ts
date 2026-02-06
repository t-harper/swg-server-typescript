/**
 * CityObject - Represents a player city in the game world
 *
 * Player cities are a core feature of Star Wars Galaxies that allow
 * players to found and manage their own settlements. Cities provide:
 * - Democratic governance through mayoral elections
 * - Civic structures (cloning, shuttles, banks, cantinas)
 * - Tax collection and treasury management
 * - Specialization bonuses for citizens
 *
 * Cities are "logical" objects - they don't have a physical presence
 * in the world like tangible objects, but they define a region and
 * track membership, governance, and resources.
 *
 * City Lifecycle:
 * 1. Player places City Hall and registers city
 * 2. Citizens join and city grows through ranks
 * 3. Elections occur periodically for mayor position
 * 4. Mayor manages structures, taxes, and specialization
 * 5. City pays weekly upkeep from treasury
 */

import type { ObjectId } from '@swg/shared-types';
import {
  CityRank,
  CitySpecialization,
  CitizenRank,
  CityStructureType,
  TaxType,
  CitizenRemovalReason,
  CITY_RANK_THRESHOLDS,
  CITY_RANK_RADIUS,
  MAX_CITIZENS,
  MAX_TAX_RATE,
  ELECTION_DURATION_DAYS,
  SPECIALIZATION_MIN_RANK,
  STRUCTURE_MIN_RANK,
  STRUCTURE_MAINTENANCE_COST,
  calculateCityRank,
  createCitizenRecord,
  createElection,
  hasElectionEnded,
  type CitizenRecord,
  type CityElection,
  type CityTax,
} from './city-types.js';

/**
 * Result of a city operation
 */
export interface CityOperationResult {
  success: boolean;
  message?: string;
  code?: string;
}

/**
 * CityObject - Player city management
 */
export class CityObject {
  // ============================================
  // Identity
  // ============================================

  /** Unique city identifier */
  cityId: bigint;

  /** City name (max 40 characters) */
  name: string;

  /** Planet/scene the city is located on */
  planetId: string;

  // ============================================
  // Location & Boundaries
  // ============================================

  /** City center position */
  position: { x: number; z: number };

  /** City border radius (based on rank) */
  radius: number;

  // ============================================
  // Governance
  // ============================================

  /** City rank based on population */
  rank: CityRank;

  /** City specialization */
  specialization: CitySpecialization;

  /** Current mayor's character ID */
  mayorId: ObjectId;

  /** Optional sponsoring guild ID */
  guildId?: bigint;

  // ============================================
  // Citizens
  // ============================================

  /** Map of character ID to citizen record */
  citizens: Map<ObjectId, CitizenRecord>;

  // ============================================
  // Economy
  // ============================================

  /** City treasury balance */
  treasury: bigint;

  /** Tax configurations */
  taxes: CityTax[];

  // ============================================
  // Structures
  // ============================================

  /** Map of structure object ID to structure type */
  structures: Map<ObjectId, CityStructureType>;

  // ============================================
  // Elections
  // ============================================

  /** Current active election, if any */
  currentElection?: CityElection | undefined;

  // ============================================
  // Timestamps
  // ============================================

  /** When the city was founded */
  foundedAt: Date;

  /** When upkeep was last paid */
  upkeepPaid: Date;

  // ============================================
  // State Tracking
  // ============================================

  /** Whether city data has been modified */
  private _modified: boolean = false;

  /**
   * Create a new CityObject
   * @param cityId - Unique city identifier
   * @param name - City name
   * @param planetId - Planet the city is on
   * @param x - X coordinate of city center
   * @param z - Z coordinate of city center
   * @param founderId - Character ID of the city founder (becomes mayor)
   * @param founderName - Name of the founding character
   */
  constructor(
    cityId: bigint,
    name: string,
    planetId: string,
    x: number,
    z: number,
    founderId: ObjectId,
    founderName: string
  ) {
    this.cityId = cityId;
    this.name = name;
    this.planetId = planetId;
    this.position = { x, z };

    // Start as an outpost
    this.rank = CityRank.Outpost;
    this.radius = CITY_RANK_RADIUS[CityRank.Outpost as CityRank];
    this.specialization = CitySpecialization.None;

    // Founder becomes mayor
    this.mayorId = founderId;
    this.citizens = new Map();

    // Add founder as first citizen with Mayor rank
    const founderRecord = createCitizenRecord(founderId, founderName, CitizenRank.Mayor);
    this.citizens.set(founderId, founderRecord);

    // Initialize economy
    this.treasury = 0n;
    this.taxes = [];

    // Initialize structures
    this.structures = new Map();

    // No active election initially
    this.currentElection = undefined;

    // Set timestamps
    this.foundedAt = new Date();
    this.upkeepPaid = new Date();
  }

  // ============================================
  // Citizen Management
  // ============================================

  /**
   * Add a citizen to the city
   * @param characterId - Character ID to add
   * @param name - Character name
   * @returns Operation result
   */
  addCitizen(characterId: ObjectId, name: string): CityOperationResult {
    // Check if already a citizen
    if (this.citizens.has(characterId)) {
      return {
        success: false,
        message: 'Character is already a citizen of this city',
        code: 'ALREADY_CITIZEN',
      };
    }

    // Check citizen limit
    const maxCitizens = MAX_CITIZENS[this.rank];
    if (this.citizens.size >= maxCitizens) {
      return {
        success: false,
        message: `City has reached maximum citizen capacity (${maxCitizens})`,
        code: 'CITY_FULL',
      };
    }

    // Add citizen
    const record = createCitizenRecord(characterId, name);
    this.citizens.set(characterId, record);
    this.markModified();

    // Check for rank upgrade
    this.updateRank();

    return {
      success: true,
      message: `${name} is now a citizen of ${this.name}`,
    };
  }

  /**
   * Remove a citizen from the city
   * @param characterId - Character ID to remove
   * @param reason - Reason for removal
   * @returns Operation result
   */
  removeCitizen(characterId: ObjectId, reason: CitizenRemovalReason): CityOperationResult {
    const citizen = this.citizens.get(characterId);
    if (!citizen) {
      return {
        success: false,
        message: 'Character is not a citizen of this city',
        code: 'NOT_CITIZEN',
      };
    }

    // Cannot remove the mayor (must transfer first)
    if (citizen.rank === CitizenRank.Mayor) {
      return {
        success: false,
        message: 'Cannot remove the mayor. Transfer mayorship first.',
        code: 'CANNOT_REMOVE_MAYOR',
      };
    }

    // Remove citizen
    this.citizens.delete(characterId);
    this.markModified();

    // Remove from election if voting
    if (this.currentElection) {
      this.currentElection.hasVoted.delete(characterId);
      this.currentElection.candidates.delete(characterId);
    }

    // Check for rank downgrade
    this.updateRank();

    return {
      success: true,
      message: `Citizen removed: ${reason}`,
    };
  }

  /**
   * Promote a citizen to a new rank
   * @param characterId - Character ID to promote
   * @param newRank - New rank to assign
   * @param actorId - ID of character performing the action
   * @returns Operation result
   */
  promoteCitizen(
    characterId: ObjectId,
    newRank: CitizenRank,
    actorId: ObjectId
  ): CityOperationResult {
    // Verify actor is mayor
    if (actorId !== this.mayorId) {
      return {
        success: false,
        message: 'Only the mayor can promote citizens',
        code: 'NOT_MAYOR',
      };
    }

    const citizen = this.citizens.get(characterId);
    if (!citizen) {
      return {
        success: false,
        message: 'Character is not a citizen of this city',
        code: 'NOT_CITIZEN',
      };
    }

    // Cannot promote to Mayor (use election or transfer)
    if (newRank === CitizenRank.Mayor) {
      return {
        success: false,
        message: 'Cannot promote to Mayor. Use election or transfer.',
        code: 'INVALID_PROMOTION',
      };
    }

    citizen.rank = newRank;
    this.markModified();

    return {
      success: true,
      message: `${citizen.name} is now a ${newRank === CitizenRank.Militia ? 'Militia' : 'Citizen'}`,
    };
  }

  /**
   * Get the current citizen count
   */
  getCitizenCount(): number {
    return this.citizens.size;
  }

  /**
   * Check if a character is a citizen
   */
  isCitizen(characterId: ObjectId): boolean {
    return this.citizens.has(characterId);
  }

  /**
   * Get citizen record by ID
   */
  getCitizen(characterId: ObjectId): CitizenRecord | undefined {
    return this.citizens.get(characterId);
  }

  // ============================================
  // Rank Management
  // ============================================

  /**
   * Update city rank based on current population
   * @returns true if rank changed
   */
  updateRank(): boolean {
    const newRank = calculateCityRank(this.citizens.size);
    if (newRank !== this.rank) {
      const oldRank = this.rank;
      this.rank = newRank;
      this.radius = this.calculateRadius();
      this.markModified();

      // If downgraded below specialization requirement, remove specialization
      if (newRank < SPECIALIZATION_MIN_RANK && this.specialization !== CitySpecialization.None) {
        this.specialization = CitySpecialization.None;
      }

      return true;
    }
    return false;
  }

  /**
   * Calculate the city border radius for current rank
   */
  calculateRadius(): number {
    return CITY_RANK_RADIUS[this.rank];
  }

  // ============================================
  // Election Management
  // ============================================

  /**
   * Start a new mayoral election
   * @returns Operation result
   */
  startElection(): CityOperationResult {
    if (this.currentElection && !hasElectionEnded(this.currentElection)) {
      return {
        success: false,
        message: 'An election is already in progress',
        code: 'ELECTION_IN_PROGRESS',
      };
    }

    this.currentElection = createElection(ELECTION_DURATION_DAYS);

    // Current mayor is automatically a candidate
    this.currentElection.candidates.set(this.mayorId, 0);
    this.markModified();

    return {
      success: true,
      message: `Mayoral election started. Voting ends in ${ELECTION_DURATION_DAYS} days.`,
    };
  }

  /**
   * Register as a candidate in the current election
   * @param characterId - Character ID to register
   * @returns Operation result
   */
  registerAsCandidate(characterId: ObjectId): CityOperationResult {
    if (!this.currentElection) {
      return {
        success: false,
        message: 'No election is currently active',
        code: 'NO_ELECTION',
      };
    }

    if (hasElectionEnded(this.currentElection)) {
      return {
        success: false,
        message: 'The election has ended',
        code: 'ELECTION_ENDED',
      };
    }

    if (!this.citizens.has(characterId)) {
      return {
        success: false,
        message: 'Only citizens can run for mayor',
        code: 'NOT_CITIZEN',
      };
    }

    if (this.currentElection.candidates.has(characterId)) {
      return {
        success: false,
        message: 'Already registered as a candidate',
        code: 'ALREADY_CANDIDATE',
      };
    }

    this.currentElection.candidates.set(characterId, 0);
    this.markModified();

    const citizen = this.citizens.get(characterId);
    return {
      success: true,
      message: `${citizen?.name} is now a mayoral candidate`,
    };
  }

  /**
   * Cast a vote in the current election
   * @param voterId - ID of the voting citizen
   * @param candidateId - ID of the candidate to vote for
   * @returns Operation result
   */
  castVote(voterId: ObjectId, candidateId: ObjectId): CityOperationResult {
    if (!this.currentElection) {
      return {
        success: false,
        message: 'No election is currently active',
        code: 'NO_ELECTION',
      };
    }

    if (hasElectionEnded(this.currentElection)) {
      return {
        success: false,
        message: 'The election has ended',
        code: 'ELECTION_ENDED',
      };
    }

    if (!this.citizens.has(voterId)) {
      return {
        success: false,
        message: 'Only citizens can vote',
        code: 'NOT_CITIZEN',
      };
    }

    if (this.currentElection.hasVoted.has(voterId)) {
      return {
        success: false,
        message: 'You have already voted in this election',
        code: 'ALREADY_VOTED',
      };
    }

    if (!this.currentElection.candidates.has(candidateId)) {
      return {
        success: false,
        message: 'Invalid candidate',
        code: 'INVALID_CANDIDATE',
      };
    }

    // Record vote
    const currentVotes = this.currentElection.candidates.get(candidateId) ?? 0;
    this.currentElection.candidates.set(candidateId, currentVotes + 1);
    this.currentElection.hasVoted.add(voterId);

    // Update citizen's vote record
    const citizen = this.citizens.get(voterId);
    if (citizen) {
      citizen.votedFor = candidateId;
    }

    this.markModified();

    return {
      success: true,
      message: 'Vote cast successfully',
    };
  }

  /**
   * End the current election and determine the winner
   * @returns Operation result with winner info
   */
  endElection(): CityOperationResult & { winnerId?: ObjectId; winnerName?: string } {
    if (!this.currentElection) {
      return {
        success: false,
        message: 'No election to end',
        code: 'NO_ELECTION',
      };
    }

    // Find the winner (most votes, tie goes to incumbent)
    let winnerId: ObjectId = this.mayorId;
    let maxVotes = this.currentElection.candidates.get(this.mayorId) ?? 0;

    for (const [candidateId, votes] of this.currentElection.candidates) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerId = candidateId;
      }
    }

    // Update mayor
    const oldMayor = this.citizens.get(this.mayorId);
    if (oldMayor) {
      oldMayor.rank = CitizenRank.Citizen;
    }

    const newMayor = this.citizens.get(winnerId);
    if (newMayor) {
      newMayor.rank = CitizenRank.Mayor;
    }

    this.mayorId = winnerId;

    // Clear election
    this.currentElection = undefined;

    // Clear all citizen vote records
    for (const citizen of this.citizens.values()) {
      citizen.votedFor = undefined;
    }

    this.markModified();

    return {
      success: true,
      message: `${newMayor?.name} has been elected mayor with ${maxVotes} votes`,
      winnerId,
      winnerName: newMayor?.name,
    };
  }

  // ============================================
  // Specialization
  // ============================================

  /**
   * Set the city's specialization
   * @param spec - New specialization
   * @param actorId - ID of character performing the action
   * @returns Operation result
   */
  setSpecialization(spec: CitySpecialization, actorId: ObjectId): CityOperationResult {
    // Verify actor is mayor
    if (actorId !== this.mayorId) {
      return {
        success: false,
        message: 'Only the mayor can set specialization',
        code: 'NOT_MAYOR',
      };
    }

    // Check rank requirement
    if (this.rank < SPECIALIZATION_MIN_RANK && spec !== CitySpecialization.None) {
      return {
        success: false,
        message: `City must be at least rank ${SPECIALIZATION_MIN_RANK} for specialization`,
        code: 'RANK_TOO_LOW',
      };
    }

    this.specialization = spec;
    this.markModified();

    return {
      success: true,
      message: `City specialization set to ${spec === CitySpecialization.None ? 'none' : spec}`,
    };
  }

  // ============================================
  // Treasury Management
  // ============================================

  /**
   * Deposit credits into the city treasury
   * @param amount - Amount to deposit
   * @param depositorId - ID of the depositing character
   * @returns Operation result
   */
  depositCredits(amount: bigint, depositorId: ObjectId): CityOperationResult {
    if (amount <= 0n) {
      return {
        success: false,
        message: 'Deposit amount must be positive',
        code: 'INVALID_AMOUNT',
      };
    }

    this.treasury += amount;
    this.markModified();

    return {
      success: true,
      message: `Deposited ${amount} credits into city treasury`,
    };
  }

  /**
   * Withdraw credits from the city treasury
   * @param amount - Amount to withdraw
   * @param actorId - ID of character performing the action
   * @returns Operation result
   */
  withdrawCredits(amount: bigint, actorId: ObjectId): CityOperationResult {
    // Verify actor is mayor
    if (actorId !== this.mayorId) {
      return {
        success: false,
        message: 'Only the mayor can withdraw from treasury',
        code: 'NOT_MAYOR',
      };
    }

    if (amount <= 0n) {
      return {
        success: false,
        message: 'Withdrawal amount must be positive',
        code: 'INVALID_AMOUNT',
      };
    }

    if (amount > this.treasury) {
      return {
        success: false,
        message: 'Insufficient funds in treasury',
        code: 'INSUFFICIENT_FUNDS',
      };
    }

    this.treasury -= amount;
    this.markModified();

    return {
      success: true,
      message: `Withdrew ${amount} credits from city treasury`,
    };
  }

  /**
   * Collect taxes from citizens and structures
   * This would typically be called by a scheduled task
   * @returns Total amount collected
   */
  collectTaxes(): bigint {
    // In a real implementation, this would:
    // 1. Calculate property tax based on structures
    // 2. Collect pending sales tax from vendors
    // 3. Add to treasury
    // For now, return 0 as a placeholder
    return 0n;
  }

  /**
   * Pay city upkeep (maintenance costs)
   * @returns Operation result
   */
  payUpkeep(): CityOperationResult {
    // Calculate total maintenance cost
    let totalCost = 0n;
    for (const structureType of this.structures.values()) {
      totalCost += BigInt(STRUCTURE_MAINTENANCE_COST[structureType]);
    }

    if (totalCost > this.treasury) {
      return {
        success: false,
        message: 'Insufficient funds for upkeep',
        code: 'INSUFFICIENT_FUNDS',
      };
    }

    this.treasury -= totalCost;
    this.upkeepPaid = new Date();
    this.markModified();

    return {
      success: true,
      message: `Paid ${totalCost} credits in upkeep`,
    };
  }

  /**
   * Calculate weekly upkeep cost
   */
  calculateUpkeepCost(): bigint {
    let totalCost = 0n;
    for (const structureType of this.structures.values()) {
      totalCost += BigInt(STRUCTURE_MAINTENANCE_COST[structureType]);
    }
    return totalCost;
  }

  // ============================================
  // Structure Management
  // ============================================

  /**
   * Add a structure to the city
   * @param objectId - Structure object ID
   * @param type - Structure type
   * @returns Operation result
   */
  addStructure(objectId: ObjectId, type: CityStructureType): CityOperationResult {
    // Check rank requirement
    const minRank = STRUCTURE_MIN_RANK[type];
    if (this.rank < minRank) {
      return {
        success: false,
        message: `City must be rank ${minRank} or higher for this structure`,
        code: 'RANK_TOO_LOW',
      };
    }

    if (this.structures.has(objectId)) {
      return {
        success: false,
        message: 'Structure already registered',
        code: 'ALREADY_REGISTERED',
      };
    }

    this.structures.set(objectId, type);
    this.markModified();

    return {
      success: true,
      message: 'Structure added to city',
    };
  }

  /**
   * Remove a structure from the city
   * @param objectId - Structure object ID
   * @returns Operation result
   */
  removeStructure(objectId: ObjectId): CityOperationResult {
    if (!this.structures.has(objectId)) {
      return {
        success: false,
        message: 'Structure not found in city',
        code: 'NOT_FOUND',
      };
    }

    const type = this.structures.get(objectId);

    // Cannot remove City Hall while city exists
    if (type === CityStructureType.CityHall) {
      return {
        success: false,
        message: 'Cannot remove City Hall',
        code: 'CANNOT_REMOVE_CITY_HALL',
      };
    }

    this.structures.delete(objectId);
    this.markModified();

    return {
      success: true,
      message: 'Structure removed from city',
    };
  }

  /**
   * Check if city has a specific structure type
   */
  hasStructureType(type: CityStructureType): boolean {
    for (const structureType of this.structures.values()) {
      if (structureType === type) {
        return true;
      }
    }
    return false;
  }

  // ============================================
  // Tax Management
  // ============================================

  /**
   * Set a tax rate
   * @param taxType - Type of tax
   * @param rate - Tax rate (0-20%)
   * @param actorId - ID of character performing the action
   * @returns Operation result
   */
  setTaxRate(taxType: TaxType, rate: number, actorId: ObjectId): CityOperationResult {
    if (actorId !== this.mayorId) {
      return {
        success: false,
        message: 'Only the mayor can set tax rates',
        code: 'NOT_MAYOR',
      };
    }

    if (rate < 0 || rate > MAX_TAX_RATE) {
      return {
        success: false,
        message: `Tax rate must be between 0 and ${MAX_TAX_RATE}%`,
        code: 'INVALID_RATE',
      };
    }

    // Find existing tax or create new
    let tax = this.taxes.find((t) => t.taxType === taxType);
    if (tax) {
      tax.taxRate = rate;
    } else {
      tax = { taxType, taxRate: rate, lastCollected: new Date() };
      this.taxes.push(tax);
    }

    this.markModified();

    return {
      success: true,
      message: `Tax rate set to ${rate}%`,
    };
  }

  /**
   * Get tax rate for a specific type
   */
  getTaxRate(taxType: TaxType): number {
    const tax = this.taxes.find((t) => t.taxType === taxType);
    return tax?.taxRate ?? 0;
  }

  // ============================================
  // Location Methods
  // ============================================

  /**
   * Check if a world position is within city bounds
   * @param x - World X coordinate
   * @param z - World Z coordinate
   * @returns true if position is within city radius
   */
  isInCityBounds(x: number, z: number): boolean {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const distanceSquared = dx * dx + dz * dz;
    return distanceSquared <= this.radius * this.radius;
  }

  /**
   * Get distance from city center to a position
   */
  getDistanceFromCenter(x: number, z: number): number {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // ============================================
  // Mayor Access
  // ============================================

  /**
   * Get the mayor's citizen record
   */
  getMayor(): CitizenRecord | undefined {
    return this.citizens.get(this.mayorId);
  }

  /**
   * Check if a character is the mayor
   */
  isMayor(characterId: ObjectId): boolean {
    return this.mayorId === characterId;
  }

  /**
   * Check if a character is militia or mayor
   */
  isMilitiaOrMayor(characterId: ObjectId): boolean {
    const citizen = this.citizens.get(characterId);
    return citizen !== undefined && citizen.rank >= CitizenRank.Militia;
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Mark the city as modified
   */
  private markModified(): void {
    this._modified = true;
  }

  /**
   * Check if city has been modified
   */
  isModified(): boolean {
    return this._modified;
  }

  /**
   * Clear modified flag
   */
  clearModified(): void {
    this._modified = false;
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for persistence
   */
  toJSON(): Record<string, unknown> {
    return {
      cityId: this.cityId.toString(),
      name: this.name,
      planetId: this.planetId,
      position: this.position,
      radius: this.radius,
      rank: this.rank,
      specialization: this.specialization,
      mayorId: this.mayorId.toString(),
      guildId: this.guildId?.toString(),
      citizens: Array.from(this.citizens.entries()).map(([id, record]) => ({
        characterId: id.toString(),
        name: record.name,
        rank: record.rank,
        joinedAt: record.joinedAt.toISOString(),
        votedFor: record.votedFor?.toString(),
      })),
      treasury: this.treasury.toString(),
      taxes: this.taxes.map((tax) => ({
        taxType: tax.taxType,
        taxRate: tax.taxRate,
        lastCollected: tax.lastCollected.toISOString(),
      })),
      structures: Array.from(this.structures.entries()).map(([id, type]) => ({
        objectId: id.toString(),
        type,
      })),
      currentElection: this.currentElection
        ? {
            startedAt: this.currentElection.startedAt.toISOString(),
            endsAt: this.currentElection.endsAt.toISOString(),
            candidates: Array.from(this.currentElection.candidates.entries()).map(
              ([id, votes]) => ({
                candidateId: id.toString(),
                votes,
              })
            ),
            hasVoted: Array.from(this.currentElection.hasVoted).map((id) => id.toString()),
          }
        : undefined,
      foundedAt: this.foundedAt.toISOString(),
      upkeepPaid: this.upkeepPaid.toISOString(),
    };
  }

  /**
   * Create a CityObject from JSON data
   */
  static fromJSON(data: Record<string, unknown>): CityObject {
    const citizens = (data.citizens as Array<Record<string, unknown>>) || [];
    const founder = citizens.find((c) => c.rank === CitizenRank.Mayor);

    const city = new CityObject(
      BigInt(data.cityId as string),
      data.name as string,
      data.planetId as string,
      (data.position as { x: number; z: number }).x,
      (data.position as { x: number; z: number }).z,
      BigInt(founder?.characterId as string || '0'),
      (founder?.name as string) || 'Unknown'
    );

    // Restore rank and specialization
    city.rank = data.rank as CityRank;
    city.radius = data.radius as number;
    city.specialization = data.specialization as CitySpecialization;
    city.mayorId = BigInt(data.mayorId as string);
    city.guildId = data.guildId ? BigInt(data.guildId as string) : undefined;

    // Restore citizens
    city.citizens.clear();
    for (const citizenData of citizens) {
      const record: CitizenRecord = {
        characterId: BigInt(citizenData.characterId as string),
        name: citizenData.name as string,
        rank: citizenData.rank as CitizenRank,
        joinedAt: new Date(citizenData.joinedAt as string),
        votedFor: citizenData.votedFor ? BigInt(citizenData.votedFor as string) : undefined,
      };
      city.citizens.set(record.characterId, record);
    }

    // Restore economy
    city.treasury = BigInt(data.treasury as string);
    city.taxes = ((data.taxes as Array<Record<string, unknown>>) || []).map((t) => ({
      taxType: t.taxType as TaxType,
      taxRate: t.taxRate as number,
      lastCollected: new Date(t.lastCollected as string),
    }));

    // Restore structures
    city.structures.clear();
    for (const structData of (data.structures as Array<Record<string, unknown>>) || []) {
      city.structures.set(
        BigInt(structData.objectId as string),
        structData.type as CityStructureType
      );
    }

    // Restore election
    if (data.currentElection) {
      const electionData = data.currentElection as Record<string, unknown>;
      city.currentElection = {
        startedAt: new Date(electionData.startedAt as string),
        endsAt: new Date(electionData.endsAt as string),
        candidates: new Map(
          ((electionData.candidates as Array<Record<string, unknown>>) || []).map((c) => [
            BigInt(c.candidateId as string),
            c.votes as number,
          ])
        ),
        hasVoted: new Set(
          ((electionData.hasVoted as string[]) || []).map((id) => BigInt(id))
        ),
      };
    }

    // Restore timestamps
    city.foundedAt = new Date(data.foundedAt as string);
    city.upkeepPaid = new Date(data.upkeepPaid as string);

    return city;
  }
}
