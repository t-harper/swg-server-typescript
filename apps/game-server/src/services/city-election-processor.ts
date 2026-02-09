/**
 * City Election Processor
 * Handles election phase management, validation, and result processing
 * for player city mayoral elections.
 */

import type { ObjectId } from '@swg/shared-types';
import {
  CityObject,
  CitizenRank,
  type CityElection,
  type CityOperationResult,
  hasElectionEnded,
  getElectionTimeRemaining,
  ELECTION_DURATION_DAYS,
  ELECTION_COOLDOWN_DAYS,
} from '@swg/objects';

/**
 * Election phase enumeration
 */
export enum ElectionPhase {
  /** No election active */
  None = 'none',
  /** Nomination phase - candidates can register */
  Nomination = 'nomination',
  /** Voting phase - citizens can cast votes */
  Voting = 'voting',
  /** Results phase - election ended, awaiting processing */
  Results = 'results',
}

/**
 * Election announcement types
 */
export enum ElectionAnnouncementType {
  /** Election has started */
  Started = 'started',
  /** Nomination phase ending soon */
  NominationEnding = 'nomination_ending',
  /** Voting phase ending soon */
  VotingEnding = 'voting_ending',
  /** Election results */
  Results = 'results',
  /** Tie occurred */
  Tie = 'tie',
}

/**
 * Election announcement data
 */
export interface ElectionAnnouncement {
  type: ElectionAnnouncementType;
  cityId: bigint;
  cityName: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Candidate validation result
 */
export interface CandidateValidationResult {
  valid: boolean;
  reason?: string;
  code?: string;
}

/**
 * Election processing result
 */
export interface ElectionProcessingResult {
  processed: number;
  resultsAnnounced: number;
  ties: number;
  errors: number;
}

/**
 * Tied election result
 */
export interface TiedElectionResult {
  cityId: bigint;
  cityName: string;
  tiedCandidates: Array<{
    candidateId: ObjectId;
    candidateName: string;
    votes: number;
  }>;
  resolution: 'incumbent' | 'random' | 'runoff';
  winnerId: ObjectId;
  winnerName: string;
}

/**
 * Callback for election announcements
 */
export type ElectionAnnouncementCallback = (announcement: ElectionAnnouncement) => void;

/**
 * City Election Processor
 * Manages election phases and processes election results
 */
export class CityElectionProcessor {
  /** Announcement callbacks */
  private readonly announcementCallbacks: Set<ElectionAnnouncementCallback>;

  /** Minimum votes required for election validity */
  private readonly minimumVotesRequired: number;

  /** Whether to use incumbent advantage for ties */
  private readonly incumbentAdvantage: boolean;

  constructor(options: {
    minimumVotesRequired?: number;
    incumbentAdvantage?: boolean;
  } = {}) {
    this.announcementCallbacks = new Set();
    this.minimumVotesRequired = options.minimumVotesRequired ?? 1;
    this.incumbentAdvantage = options.incumbentAdvantage ?? true;
  }

  // ============================================
  // Phase Management
  // ============================================

  /**
   * Get the current election phase for a city
   */
  getElectionPhase(city: CityObject): ElectionPhase {
    if (!city.currentElection) {
      return ElectionPhase.None;
    }

    const election = city.currentElection;
    const now = Date.now();
    const electionStart = election.startedAt.getTime();
    const electionEnd = election.endsAt.getTime();

    // Nomination phase: first 7 days
    const nominationEnd = electionStart + (7 * 24 * 60 * 60 * 1000);
    if (now < nominationEnd) {
      return ElectionPhase.Nomination;
    }

    // Voting phase: until election ends
    if (now < electionEnd) {
      return ElectionPhase.Voting;
    }

    // Results phase: election ended but not processed
    return ElectionPhase.Results;
  }

  /**
   * Get remaining time for current phase
   */
  getPhaseTimeRemaining(city: CityObject): number {
    if (!city.currentElection) {
      return 0;
    }

    const phase = this.getElectionPhase(city);
    const now = Date.now();

    switch (phase) {
      case ElectionPhase.Nomination: {
        const nominationEnd = city.currentElection.startedAt.getTime() + (7 * 24 * 60 * 60 * 1000);
        return Math.max(0, nominationEnd - now);
      }
      case ElectionPhase.Voting:
        return getElectionTimeRemaining(city.currentElection);
      default:
        return 0;
    }
  }

  // ============================================
  // Election Processing
  // ============================================

  /**
   * Process all active elections that have ended
   * @param cities - Map of cities to process
   */
  processActiveElections(
    cities: Map<bigint, CityObject>
  ): ElectionProcessingResult {
    const result: ElectionProcessingResult = {
      processed: 0,
      resultsAnnounced: 0,
      ties: 0,
      errors: 0,
    };

    for (const city of cities.values()) {
      if (!city.currentElection) {
        continue;
      }

      const phase = this.getElectionPhase(city);
      if (phase !== ElectionPhase.Results) {
        continue;
      }

      try {
        const electionResult = this.processElection(city);
        result.processed++;

        if (electionResult.success) {
          result.resultsAnnounced++;
          if (electionResult.wasTied) {
            result.ties++;
          }
        } else {
          result.errors++;
        }
      } catch (error) {
        console.error(
          `[ElectionProcessor] Error processing election for city ${city.cityId}:`,
          error
        );
        result.errors++;
      }
    }

    return result;
  }

  /**
   * Process a single city's election
   */
  private processElection(
    city: CityObject
  ): CityOperationResult & { wasTied?: boolean; winnerId?: ObjectId } {
    if (!city.currentElection) {
      return {
        success: false,
        message: 'No active election',
        code: 'NO_ELECTION',
      };
    }

    const election = city.currentElection;

    // Check for minimum votes
    const totalVotes = this.getTotalVotes(election);
    if (totalVotes < this.minimumVotesRequired) {
      // Not enough votes, incumbent remains
      this.announceResults(city.cityId, city.name, city.mayorId, city.getMayor()?.name ?? 'Unknown');
      city.currentElection = undefined;
      return {
        success: true,
        message: 'Election concluded - insufficient votes, incumbent remains',
        wasTied: false,
        winnerId: city.mayorId,
      };
    }

    // Find candidates with highest votes
    const candidates = Array.from(election.candidates.entries());
    const maxVotes = Math.max(...candidates.map(([, votes]) => votes));
    const topCandidates = candidates.filter(([, votes]) => votes === maxVotes);

    // Check for tie
    if (topCandidates.length > 1) {
      const tiedCandidateInfo = topCandidates.map(([candidateId, votes]) => ({
        candidateId,
        candidateName: city.citizens.get(candidateId)?.name ?? 'Unknown',
        votes,
      }));

      const tieResult = this.handleTiedElection(city.cityId, city.name, tiedCandidateInfo, city.mayorId);

      // Apply the tie resolution
      this.applyElectionResult(city, tieResult.winnerId);
      this.announceResults(city.cityId, city.name, tieResult.winnerId, tieResult.winnerName);

      return {
        success: true,
        message: `Tied election resolved - ${tieResult.winnerName} wins`,
        wasTied: true,
        winnerId: tieResult.winnerId,
      };
    }

    // Clear winner
    const [winnerId, winnerVotes] = topCandidates[0]!;
    const winner = city.citizens.get(winnerId);

    // Apply result
    this.applyElectionResult(city, winnerId);
    this.announceResults(city.cityId, city.name, winnerId, winner?.name ?? 'Unknown');

    return {
      success: true,
      message: `${winner?.name} wins with ${winnerVotes} votes`,
      wasTied: false,
      winnerId,
    };
  }

  /**
   * Apply election result to city
   */
  private applyElectionResult(city: CityObject, winnerId: ObjectId): void {
    // Demote old mayor
    const oldMayor = city.citizens.get(city.mayorId);
    if (oldMayor) {
      oldMayor.rank = CitizenRank.Citizen;
    }

    // Promote new mayor
    const newMayor = city.citizens.get(winnerId);
    if (newMayor) {
      newMayor.rank = CitizenRank.Mayor;
    }

    // Update city
    city.mayorId = winnerId;
    city.currentElection = undefined;

    // Clear vote records
    for (const citizen of city.citizens.values()) {
      citizen.votedFor = undefined;
    }
  }

  /**
   * Get total votes cast in an election
   */
  private getTotalVotes(election: CityElection): number {
    let total = 0;
    for (const votes of election.candidates.values()) {
      total += votes;
    }
    return total;
  }

  // ============================================
  // Announcements
  // ============================================

  /**
   * Announce that an election has started
   */
  announceElectionStart(cityId: bigint, cityName: string): void {
    this.emitAnnouncement({
      type: ElectionAnnouncementType.Started,
      cityId,
      cityName,
      message: `Mayoral election has begun in ${cityName}! Voting ends in ${ELECTION_DURATION_DAYS} days.`,
      timestamp: Date.now(),
    });
  }

  /**
   * Announce election results
   */
  announceResults(
    cityId: bigint,
    cityName: string,
    winnerId: ObjectId,
    winnerName: string
  ): void {
    this.emitAnnouncement({
      type: ElectionAnnouncementType.Results,
      cityId,
      cityName,
      message: `${winnerName} has been elected mayor of ${cityName}!`,
      data: {
        winnerId: winnerId.toString(),
        winnerName,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle a tied election
   * Returns the winner based on tie-breaking rules
   */
  handleTiedElection(
    cityId: bigint,
    cityName: string,
    tiedCandidates: Array<{
      candidateId: ObjectId;
      candidateName: string;
      votes: number;
    }>,
    incumbentId: ObjectId
  ): TiedElectionResult {
    // Check if incumbent is among tied candidates
    const incumbentInTie = tiedCandidates.find(
      (c) => c.candidateId === incumbentId
    );

    let winnerId: ObjectId;
    let winnerName: string;
    let resolution: 'incumbent' | 'random' | 'runoff';

    if (this.incumbentAdvantage && incumbentInTie) {
      // Incumbent wins ties
      winnerId = incumbentId;
      winnerName = incumbentInTie.candidateName;
      resolution = 'incumbent';
    } else {
      // Random selection (in a real implementation, might use runoff)
      const randomIndex = Math.floor(Math.random() * tiedCandidates.length);
      const randomWinner = tiedCandidates[randomIndex]!;
      winnerId = randomWinner.candidateId;
      winnerName = randomWinner.candidateName;
      resolution = 'random';
    }

    // Announce the tie and resolution
    this.emitAnnouncement({
      type: ElectionAnnouncementType.Tie,
      cityId,
      cityName,
      message: `Tied election in ${cityName}! ${winnerName} wins via ${resolution === 'incumbent' ? 'incumbent advantage' : 'random selection'}.`,
      data: {
        tiedCandidates: tiedCandidates.map((c) => ({
          candidateId: c.candidateId.toString(),
          candidateName: c.candidateName,
          votes: c.votes,
        })),
        resolution,
        winnerId: winnerId.toString(),
        winnerName,
      },
      timestamp: Date.now(),
    });

    return {
      cityId,
      cityName,
      tiedCandidates,
      resolution,
      winnerId,
      winnerName,
    };
  }

  // ============================================
  // Candidate Validation
  // ============================================

  /**
   * Validate if a player can be a candidate
   */
  validateCandidate(
    city: CityObject,
    playerId: ObjectId
  ): CandidateValidationResult {
    // Must be a citizen
    if (!city.isCitizen(playerId)) {
      return {
        valid: false,
        reason: 'Only citizens can run for mayor',
        code: 'NOT_CITIZEN',
      };
    }

    // Election must be active
    if (!city.currentElection) {
      return {
        valid: false,
        reason: 'No election is currently active',
        code: 'NO_ELECTION',
      };
    }

    // Must be in nomination phase
    const phase = this.getElectionPhase(city);
    if (phase !== ElectionPhase.Nomination) {
      return {
        valid: false,
        reason: 'Candidate registration is only open during the nomination phase',
        code: 'WRONG_PHASE',
      };
    }

    // Must not already be registered
    if (city.currentElection.candidates.has(playerId)) {
      return {
        valid: false,
        reason: 'Already registered as a candidate',
        code: 'ALREADY_REGISTERED',
      };
    }

    // Additional checks could include:
    // - Minimum time as citizen
    // - No recent bans
    // - etc.

    return {
      valid: true,
    };
  }

  /**
   * Validate if a player can vote
   */
  validateVoter(
    city: CityObject,
    playerId: ObjectId
  ): CandidateValidationResult {
    // Must be a citizen
    if (!city.isCitizen(playerId)) {
      return {
        valid: false,
        reason: 'Only citizens can vote',
        code: 'NOT_CITIZEN',
      };
    }

    // Election must be active
    if (!city.currentElection) {
      return {
        valid: false,
        reason: 'No election is currently active',
        code: 'NO_ELECTION',
      };
    }

    // Must be in voting phase
    const phase = this.getElectionPhase(city);
    if (phase !== ElectionPhase.Voting) {
      return {
        valid: false,
        reason: 'Voting is only open during the voting phase',
        code: 'WRONG_PHASE',
      };
    }

    // Must not have already voted
    if (city.currentElection.hasVoted.has(playerId)) {
      return {
        valid: false,
        reason: 'You have already voted in this election',
        code: 'ALREADY_VOTED',
      };
    }

    return {
      valid: true,
    };
  }

  // ============================================
  // Election Status
  // ============================================

  /**
   * Get detailed election status for a city
   */
  getElectionStatus(city: CityObject): {
    phase: ElectionPhase;
    phaseTimeRemaining: number;
    totalVotes: number;
    candidateCount: number;
    candidates: Array<{
      candidateId: ObjectId;
      candidateName: string;
      votes: number;
    }>;
    voterTurnout: number;
  } | null {
    if (!city.currentElection) {
      return null;
    }

    const election = city.currentElection;
    const phase = this.getElectionPhase(city);
    const phaseTimeRemaining = this.getPhaseTimeRemaining(city);
    const totalVotes = this.getTotalVotes(election);
    const eligibleVoters = city.getCitizenCount();
    const voterTurnout = eligibleVoters > 0 ? (totalVotes / eligibleVoters) * 100 : 0;

    const candidates = Array.from(election.candidates.entries()).map(
      ([candidateId, votes]) => ({
        candidateId,
        candidateName: city.citizens.get(candidateId)?.name ?? 'Unknown',
        votes,
      })
    );

    // Sort by votes descending
    candidates.sort((a, b) => b.votes - a.votes);

    return {
      phase,
      phaseTimeRemaining,
      totalVotes,
      candidateCount: candidates.length,
      candidates,
      voterTurnout,
    };
  }

  /**
   * Check if an election can be started for a city
   */
  canStartElection(city: CityObject): CandidateValidationResult {
    // Cannot start if election already active
    if (city.currentElection && !hasElectionEnded(city.currentElection)) {
      return {
        valid: false,
        reason: 'An election is already in progress',
        code: 'ELECTION_ACTIVE',
      };
    }

    // Check cooldown from last election
    // In a full implementation, track lastElectionEnd on the city
    // For now, always allow if no active election

    return {
      valid: true,
    };
  }

  // ============================================
  // Event Callbacks
  // ============================================

  /**
   * Register callback for election announcements
   */
  onAnnouncement(callback: ElectionAnnouncementCallback): void {
    this.announcementCallbacks.add(callback);
  }

  /**
   * Unregister announcement callback
   */
  offAnnouncement(callback: ElectionAnnouncementCallback): void {
    this.announcementCallbacks.delete(callback);
  }

  /**
   * Emit an announcement to all callbacks
   */
  private emitAnnouncement(announcement: ElectionAnnouncement): void {
    for (const callback of this.announcementCallbacks) {
      try {
        callback(announcement);
      } catch (error) {
        console.error('[ElectionProcessor] Error in announcement callback:', error);
      }
    }
  }
}

/**
 * Create a new CityElectionProcessor instance
 */
export function createCityElectionProcessor(options?: {
  minimumVotesRequired?: number;
  incumbentAdvantage?: boolean;
}): CityElectionProcessor {
  return new CityElectionProcessor(options);
}
