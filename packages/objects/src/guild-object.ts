/**
 * GuildObject - Represents player guilds in the game
 *
 * Guilds are social organizations that provide:
 * - Hierarchical membership with ranks and permissions
 * - Shared treasury for guild funds
 * - War declarations and diplomacy
 * - Alliance systems
 * - Player city sponsorship
 * - Mayor elections support
 *
 * This is a standalone object class (not derived from SceneObject)
 * as guilds are abstract entities without physical world presence.
 */

import type { ObjectId } from '@swg/shared-types';
import {
  GuildRank,
  GuildPermission,
  WarStatus,
  MAX_GUILD_SIZE,
  MAX_MOTD,
  MAX_ALLIES,
  MAX_WARS,
  DEFAULT_RANK_PERMISSIONS,
  DEFAULT_RANK_NAMES,
  hasGuildPermission,
  validateGuildName,
  validateGuildAbbreviation,
  type GuildMember,
  type GuildWar,
  type GuildElection,
  type GuildInvitation,
  type GuildLogEntry,
} from './guild-types.js';

/**
 * Result type for guild operations
 */
export interface GuildOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  errorMessage?: string;
}

/**
 * GuildObject - Player guild management class
 */
export class GuildObject {
  // ============================================
  // Core Properties
  // ============================================

  /** Unique guild ID */
  readonly guildId: bigint;

  /** Guild name */
  private _name: string;

  /** Guild abbreviation (1-5 characters) */
  private _abbreviation: string;

  /** Guild leader character ID */
  private _leaderId: ObjectId;

  /** Guild members indexed by character ID */
  private _members: Map<ObjectId, GuildMember>;

  /** Guild treasury balance */
  private _treasury: bigint;

  /** Message of the day */
  private _motd: string;

  /** Guild creation timestamp */
  readonly createdAt: Date;

  /** Last modification timestamp */
  private _modifiedAt: Date;

  // ============================================
  // City & Sponsorship
  // ============================================

  /** Associated player city object ID (if any) */
  private _sponsoredCity: ObjectId | null;

  // ============================================
  // Diplomacy
  // ============================================

  /** Active wars indexed by enemy guild ID */
  private _wars: Map<bigint, GuildWar>;

  /** Allied guild IDs */
  private _allies: Set<bigint>;

  /** Enemy guild IDs (guilds we have declared as enemies) */
  private _enemies: Set<bigint>;

  // ============================================
  // Rank Customization
  // ============================================

  /** Custom rank names */
  private _rankNames: Map<GuildRank, string>;

  /** Custom rank permissions */
  private _rankPermissions: Map<GuildRank, number>;

  // ============================================
  // Invitations & Elections
  // ============================================

  /** Pending invitations */
  private _pendingInvitations: Map<ObjectId, GuildInvitation>;

  /** Current election (if any) */
  private _currentElection: GuildElection | null;

  // ============================================
  // Activity Logging
  // ============================================

  /** Guild activity log */
  private _activityLog: GuildLogEntry[];

  /** Maximum log entries to keep */
  private static readonly MAX_LOG_ENTRIES = 100;

  // ============================================
  // Settings
  // ============================================

  /** Tax rate for city income (0.0 - 1.0) */
  private _taxRate: number;

  /** Whether the guild is recruiting */
  private _isRecruiting: boolean;

  /**
   * Create a new GuildObject
   * @param guildId - Unique guild identifier
   * @param name - Guild display name
   * @param abbreviation - Short guild abbreviation (1-5 chars)
   * @param leaderId - Character ID of the guild leader
   */
  constructor(guildId: bigint, name: string, abbreviation: string, leaderId: ObjectId) {
    this.guildId = guildId;
    this._name = name;
    this._abbreviation = abbreviation.toUpperCase();
    this._leaderId = leaderId;
    this._members = new Map();
    this._treasury = 0n;
    this._motd = '';
    this.createdAt = new Date();
    this._modifiedAt = new Date();
    this._sponsoredCity = null;
    this._wars = new Map();
    this._allies = new Set();
    this._enemies = new Set();
    this._rankNames = new Map(DEFAULT_RANK_NAMES);
    this._rankPermissions = new Map(DEFAULT_RANK_PERMISSIONS);
    this._pendingInvitations = new Map();
    this._currentElection = null;
    this._activityLog = [];
    this._taxRate = 0;
    this._isRecruiting = true;
  }

  // ============================================
  // Getters
  // ============================================

  get name(): string {
    return this._name;
  }

  get abbreviation(): string {
    return this._abbreviation;
  }

  get leaderId(): ObjectId {
    return this._leaderId;
  }

  get members(): Map<ObjectId, GuildMember> {
    return new Map(this._members);
  }

  get treasury(): bigint {
    return this._treasury;
  }

  get motd(): string {
    return this._motd;
  }

  get modifiedAt(): Date {
    return this._modifiedAt;
  }

  get sponsoredCity(): ObjectId | null {
    return this._sponsoredCity;
  }

  get wars(): Map<bigint, GuildWar> {
    return new Map(this._wars);
  }

  get allies(): Set<bigint> {
    return new Set(this._allies);
  }

  get enemies(): Set<bigint> {
    return new Set(this._enemies);
  }

  get rankNames(): Map<GuildRank, string> {
    return new Map(this._rankNames);
  }

  get rankPermissions(): Map<GuildRank, number> {
    return new Map(this._rankPermissions);
  }

  get taxRate(): number {
    return this._taxRate;
  }

  get isRecruiting(): boolean {
    return this._isRecruiting;
  }

  get currentElection(): GuildElection | null {
    return this._currentElection;
  }

  get memberCount(): number {
    return this._members.size;
  }

  // ============================================
  // Member Management
  // ============================================

  /**
   * Add a new member to the guild
   * @param member - Member data to add
   * @param sponsorId - Character ID of the sponsoring member (optional)
   */
  addMember(member: GuildMember, sponsorId?: ObjectId): GuildOperationResult {
    if (this._members.size >= MAX_GUILD_SIZE) {
      return { success: false, errorMessage: 'Guild is at maximum capacity' };
    }

    if (this._members.has(member.characterId)) {
      return { success: false, errorMessage: 'Character is already a guild member' };
    }

    const newMember: GuildMember = {
      ...member,
      sponsoredBy: sponsorId,
      joinedAt: Date.now(),
      totalDonated: 0n,
      isOnline: false,
    };

    this._members.set(member.characterId, newMember);
    this.markModified();
    this.logEvent('member_joined', sponsorId, member.characterId);

    return { success: true };
  }

  /**
   * Remove a member from the guild
   * @param characterId - Character ID to remove
   * @param kickerId - Character ID of the person kicking (optional, for logging)
   */
  removeMember(characterId: ObjectId, kickerId?: ObjectId): GuildOperationResult {
    if (!this._members.has(characterId)) {
      return { success: false, errorMessage: 'Character is not a guild member' };
    }

    if (characterId === this._leaderId) {
      return {
        success: false,
        errorMessage: 'Cannot remove the guild leader. Transfer leadership first.',
      };
    }

    this._members.delete(characterId);
    this.markModified();

    if (kickerId) {
      this.logEvent('member_kicked', kickerId, characterId);
    } else {
      this.logEvent('member_left', characterId);
    }

    return { success: true };
  }

  /**
   * Promote a member to a higher rank
   * @param characterId - Character to promote
   * @param actorId - Character performing the promotion
   */
  promoteMember(characterId: ObjectId, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.Promote)) {
      return { success: false, errorMessage: 'You do not have permission to promote members' };
    }

    const member = this._members.get(characterId);
    if (!member) {
      return { success: false, errorMessage: 'Character is not a guild member' };
    }

    if (member.rank === GuildRank.Leader) {
      return { success: false, errorMessage: 'Cannot promote the leader' };
    }

    // Cannot promote to Leader rank
    if (member.rank === GuildRank.Officer) {
      return { success: false, errorMessage: 'Cannot promote beyond Officer. Use setLeader instead.' };
    }

    // Check that actor outranks the target
    const actorMember = this._members.get(actorId);
    if (actorMember && actorMember.rank >= member.rank && actorId !== this._leaderId) {
      return { success: false, errorMessage: 'You can only promote members below your rank' };
    }

    // Promote by decreasing rank number (lower = higher rank)
    member.rank = member.rank - 1;
    this.markModified();
    this.logEvent('member_promoted', actorId, characterId, `Promoted to ${this.getRankName(member.rank)}`);

    return { success: true };
  }

  /**
   * Demote a member to a lower rank
   * @param characterId - Character to demote
   * @param actorId - Character performing the demotion
   */
  demoteMember(characterId: ObjectId, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.Demote)) {
      return { success: false, errorMessage: 'You do not have permission to demote members' };
    }

    const member = this._members.get(characterId);
    if (!member) {
      return { success: false, errorMessage: 'Character is not a guild member' };
    }

    if (characterId === this._leaderId) {
      return { success: false, errorMessage: 'Cannot demote the leader' };
    }

    // Cannot demote below Novice
    if (member.rank === GuildRank.Novice || member.rank >= GuildRank.Custom9) {
      return { success: false, errorMessage: 'Member is already at the lowest rank' };
    }

    // Check that actor outranks the target
    const actorMember = this._members.get(actorId);
    if (actorMember && actorMember.rank >= member.rank && actorId !== this._leaderId) {
      return { success: false, errorMessage: 'You can only demote members below your rank' };
    }

    // Demote by increasing rank number (higher = lower rank)
    member.rank = member.rank + 1;
    this.markModified();
    this.logEvent('member_demoted', actorId, characterId, `Demoted to ${this.getRankName(member.rank)}`);

    return { success: true };
  }

  /**
   * Transfer guild leadership to another member
   * @param newLeaderId - Character ID of the new leader
   */
  setLeader(newLeaderId: ObjectId): GuildOperationResult {
    const newLeader = this._members.get(newLeaderId);
    if (!newLeader) {
      return { success: false, errorMessage: 'Character is not a guild member' };
    }

    const oldLeaderId = this._leaderId;
    const oldLeader = this._members.get(oldLeaderId);

    // Update ranks
    if (oldLeader) {
      oldLeader.rank = GuildRank.Officer;
    }
    newLeader.rank = GuildRank.Leader;
    this._leaderId = newLeaderId;

    this.markModified();
    this.logEvent('leader_changed', oldLeaderId, newLeaderId);

    return { success: true };
  }

  /**
   * Set a member's rank directly
   * @param characterId - Character to modify
   * @param rank - New rank
   * @param actorId - Character performing the change
   */
  setMemberRank(characterId: ObjectId, rank: GuildRank, actorId: ObjectId): GuildOperationResult {
    if (rank === GuildRank.Leader) {
      return { success: false, errorMessage: 'Use setLeader to transfer leadership' };
    }

    const actor = this._members.get(actorId);
    if (!actor) {
      return { success: false, errorMessage: 'Actor is not a guild member' };
    }

    // Only leader can set ranks directly
    if (actorId !== this._leaderId) {
      return { success: false, errorMessage: 'Only the guild leader can set ranks directly' };
    }

    const member = this._members.get(characterId);
    if (!member) {
      return { success: false, errorMessage: 'Character is not a guild member' };
    }

    if (characterId === this._leaderId) {
      return { success: false, errorMessage: 'Cannot change the leader rank' };
    }

    const oldRankName = this.getRankName(member.rank);
    member.rank = rank;
    this.markModified();
    this.logEvent('member_promoted', actorId, characterId, `Changed from ${oldRankName} to ${this.getRankName(rank)}`);

    return { success: true };
  }

  // ============================================
  // MOTD Management
  // ============================================

  /**
   * Set the message of the day
   * @param message - New MOTD
   * @param actorId - Character setting the MOTD
   */
  setMotd(message: string, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.EditMotd)) {
      return { success: false, errorMessage: 'You do not have permission to edit the MOTD' };
    }

    if (message.length > MAX_MOTD) {
      return { success: false, errorMessage: `MOTD cannot exceed ${MAX_MOTD} characters` };
    }

    this._motd = message;
    this.markModified();
    this.logEvent('motd_changed', actorId, undefined, message.substring(0, 50));

    return { success: true };
  }

  // ============================================
  // Treasury Management
  // ============================================

  /**
   * Deposit credits into the guild treasury
   * @param amount - Amount to deposit
   * @param depositorId - Character making the deposit
   */
  depositCredits(amount: bigint, depositorId: ObjectId): GuildOperationResult {
    if (amount <= 0n) {
      return { success: false, errorMessage: 'Deposit amount must be positive' };
    }

    const member = this._members.get(depositorId);
    if (!member) {
      return { success: false, errorMessage: 'Depositor is not a guild member' };
    }

    this._treasury += amount;
    member.totalDonated += amount;
    this.markModified();
    this.logEvent('treasury_deposit', depositorId, undefined, `Deposited ${amount} credits`, amount);

    return { success: true };
  }

  /**
   * Withdraw credits from the guild treasury
   * @param amount - Amount to withdraw
   * @param actorId - Character making the withdrawal
   */
  withdrawCredits(amount: bigint, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.WithdrawCredits)) {
      return { success: false, errorMessage: 'You do not have permission to withdraw credits' };
    }

    if (amount <= 0n) {
      return { success: false, errorMessage: 'Withdrawal amount must be positive' };
    }

    if (amount > this._treasury) {
      return { success: false, errorMessage: 'Insufficient funds in treasury' };
    }

    this._treasury -= amount;
    this.markModified();
    this.logEvent('treasury_withdraw', actorId, undefined, `Withdrew ${amount} credits`, amount);

    return { success: true };
  }

  // ============================================
  // War Management
  // ============================================

  /**
   * Declare war on another guild
   * @param targetGuildId - Guild ID to declare war on
   * @param targetGuildName - Name of the target guild
   * @param actorId - Character declaring war
   */
  declareWar(
    targetGuildId: bigint,
    targetGuildName: string,
    actorId: ObjectId
  ): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.DeclareWar)) {
      return { success: false, errorMessage: 'You do not have permission to declare war' };
    }

    if (this._wars.size >= MAX_WARS) {
      return { success: false, errorMessage: 'Maximum number of active wars reached' };
    }

    if (this._wars.has(targetGuildId)) {
      return { success: false, errorMessage: 'Already at war with this guild' };
    }

    if (this._allies.has(targetGuildId)) {
      return { success: false, errorMessage: 'Cannot declare war on an ally' };
    }

    if (targetGuildId === this.guildId) {
      return { success: false, errorMessage: 'Cannot declare war on yourself' };
    }

    const war: GuildWar = {
      guildId: targetGuildId,
      guildName: targetGuildName,
      declaredAt: Date.now(),
      declaredBy: this.guildId,
      status: WarStatus.Active,
      kills: 0,
      deaths: 0,
    };

    this._wars.set(targetGuildId, war);
    this._enemies.add(targetGuildId);
    this.markModified();
    this.logEvent('war_declared', actorId, undefined, `Declared war on ${targetGuildName}`);

    return { success: true };
  }

  /**
   * Accept peace with another guild
   * @param targetGuildId - Guild ID to make peace with
   * @param actorId - Character accepting peace
   */
  acceptPeace(targetGuildId: bigint, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.AcceptPeace)) {
      return { success: false, errorMessage: 'You do not have permission to accept peace' };
    }

    const war = this._wars.get(targetGuildId);
    if (!war) {
      return { success: false, errorMessage: 'Not at war with this guild' };
    }

    war.status = WarStatus.Ended;
    war.endedAt = Date.now();
    this._wars.delete(targetGuildId);
    this._enemies.delete(targetGuildId);
    this.markModified();
    this.logEvent('war_ended', actorId, undefined, `Peace with ${war.guildName}`);

    return { success: true };
  }

  /**
   * Offer peace to another guild
   * @param targetGuildId - Guild ID to offer peace to
   * @param actorId - Character offering peace
   */
  offerPeace(targetGuildId: bigint, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.AcceptPeace)) {
      return { success: false, errorMessage: 'You do not have permission to offer peace' };
    }

    const war = this._wars.get(targetGuildId);
    if (!war) {
      return { success: false, errorMessage: 'Not at war with this guild' };
    }

    war.status = WarStatus.PeaceOffered;
    war.peaceOfferedAt = Date.now();
    this.markModified();

    return { success: true };
  }

  /**
   * Record a kill in an active war
   * @param enemyGuildId - Guild ID of the defeated enemy
   */
  recordWarKill(enemyGuildId: bigint): void {
    const war = this._wars.get(enemyGuildId);
    if (war && war.status === WarStatus.Active) {
      war.kills++;
      this.markModified();
    }
  }

  /**
   * Record a death in an active war
   * @param enemyGuildId - Guild ID of the enemy who killed our member
   */
  recordWarDeath(enemyGuildId: bigint): void {
    const war = this._wars.get(enemyGuildId);
    if (war && war.status === WarStatus.Active) {
      war.deaths++;
      this.markModified();
    }
  }

  // ============================================
  // Alliance Management
  // ============================================

  /**
   * Add an ally guild
   * @param allyGuildId - Guild ID to ally with
   * @param actorId - Character forming the alliance
   */
  addAlly(allyGuildId: bigint, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.ManageAlliances)) {
      return { success: false, errorMessage: 'You do not have permission to manage alliances' };
    }

    if (this._allies.size >= MAX_ALLIES) {
      return { success: false, errorMessage: 'Maximum number of allies reached' };
    }

    if (this._wars.has(allyGuildId)) {
      return { success: false, errorMessage: 'Cannot ally with a guild you are at war with' };
    }

    if (allyGuildId === this.guildId) {
      return { success: false, errorMessage: 'Cannot ally with yourself' };
    }

    this._allies.add(allyGuildId);
    this._enemies.delete(allyGuildId);
    this.markModified();
    this.logEvent('alliance_formed', actorId, undefined, `Allied with guild ${allyGuildId}`);

    return { success: true };
  }

  /**
   * Remove an ally guild
   * @param allyGuildId - Guild ID to remove from allies
   * @param actorId - Character breaking the alliance
   */
  removeAlly(allyGuildId: bigint, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.ManageAlliances)) {
      return { success: false, errorMessage: 'You do not have permission to manage alliances' };
    }

    if (!this._allies.has(allyGuildId)) {
      return { success: false, errorMessage: 'Guild is not an ally' };
    }

    this._allies.delete(allyGuildId);
    this.markModified();
    this.logEvent('alliance_broken', actorId, undefined, `Broke alliance with guild ${allyGuildId}`);

    return { success: true };
  }

  // ============================================
  // Permission Checking
  // ============================================

  /**
   * Check if a character has a specific permission
   * @param characterId - Character to check
   * @param permission - Permission to check for
   */
  hasPermission(characterId: ObjectId, permission: number): boolean {
    const member = this._members.get(characterId);
    if (!member) {
      return false;
    }

    const permissions = this._rankPermissions.get(member.rank) ?? 0;
    return hasGuildPermission(permissions, permission);
  }

  /**
   * Get all permissions for a character
   * @param characterId - Character to get permissions for
   */
  getPermissions(characterId: ObjectId): number {
    const member = this._members.get(characterId);
    if (!member) {
      return 0;
    }

    return this._rankPermissions.get(member.rank) ?? 0;
  }

  // ============================================
  // Member Queries
  // ============================================

  /**
   * Get the full member list
   */
  getMemberList(): GuildMember[] {
    return Array.from(this._members.values());
  }

  /**
   * Get count of online members
   */
  getOnlineMembers(): number {
    let count = 0;
    for (const member of this._members.values()) {
      if (member.isOnline) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get list of online member IDs
   */
  getOnlineMemberIds(): ObjectId[] {
    const online: ObjectId[] = [];
    for (const member of this._members.values()) {
      if (member.isOnline) {
        online.push(member.characterId);
      }
    }
    return online;
  }

  /**
   * Check if a character is a member
   * @param characterId - Character to check
   */
  isMember(characterId: ObjectId): boolean {
    return this._members.has(characterId);
  }

  /**
   * Get a member's rank
   * @param characterId - Character to get rank for
   */
  getRank(characterId: ObjectId): GuildRank | null {
    const member = this._members.get(characterId);
    return member?.rank ?? null;
  }

  /**
   * Get a member by character ID
   * @param characterId - Character ID to look up
   */
  getMember(characterId: ObjectId): GuildMember | undefined {
    return this._members.get(characterId);
  }

  /**
   * Get members by rank
   * @param rank - Rank to filter by
   */
  getMembersByRank(rank: GuildRank): GuildMember[] {
    return Array.from(this._members.values()).filter((m) => m.rank === rank);
  }

  /**
   * Set a member's online status
   * @param characterId - Character ID
   * @param isOnline - Whether the character is online
   */
  setMemberOnlineStatus(characterId: ObjectId, isOnline: boolean): void {
    const member = this._members.get(characterId);
    if (member) {
      member.isOnline = isOnline;
      if (isOnline) {
        member.lastOnline = Date.now();
      }
      this.markModified();
    }
  }

  // ============================================
  // Rank Customization
  // ============================================

  /**
   * Get the display name for a rank
   * @param rank - Rank to get name for
   */
  getRankName(rank: GuildRank): string {
    return this._rankNames.get(rank) ?? DEFAULT_RANK_NAMES.get(rank) ?? `Rank ${rank}`;
  }

  /**
   * Set a custom name for a rank
   * @param rank - Rank to rename
   * @param name - New name
   * @param actorId - Character performing the rename
   */
  setRankName(rank: GuildRank, name: string, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.RenameRanks)) {
      return { success: false, errorMessage: 'You do not have permission to rename ranks' };
    }

    if (rank === GuildRank.Leader) {
      return { success: false, errorMessage: 'Cannot rename the Leader rank' };
    }

    if (!name || name.trim().length === 0) {
      return { success: false, errorMessage: 'Rank name cannot be empty' };
    }

    if (name.length > 25) {
      return { success: false, errorMessage: 'Rank name cannot exceed 25 characters' };
    }

    this._rankNames.set(rank, name.trim());
    this.markModified();

    return { success: true };
  }

  /**
   * Set permissions for a rank
   * @param rank - Rank to modify
   * @param permissions - New permission bitmask
   * @param actorId - Character performing the modification
   */
  setRankPermissions(rank: GuildRank, permissions: number, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.ModifyPermissions)) {
      return { success: false, errorMessage: 'You do not have permission to modify rank permissions' };
    }

    if (rank === GuildRank.Leader) {
      return { success: false, errorMessage: 'Cannot modify Leader permissions' };
    }

    // Remove leader-only permissions if someone tries to add them
    const sanitizedPermissions =
      permissions & ~(GuildPermission.TransferLeadership | GuildPermission.Disband);

    this._rankPermissions.set(rank, sanitizedPermissions);
    this.markModified();

    return { success: true };
  }

  // ============================================
  // City Sponsorship
  // ============================================

  /**
   * Set the sponsored city
   * @param cityId - City object ID (or null to remove)
   */
  setSponsoredCity(cityId: ObjectId | null): void {
    this._sponsoredCity = cityId;
    this.markModified();
  }

  // ============================================
  // Guild Settings
  // ============================================

  /**
   * Set the guild name
   * @param name - New guild name
   * @param actorId - Character changing the name (must be leader)
   */
  setName(name: string, actorId: ObjectId): GuildOperationResult {
    if (actorId !== this._leaderId) {
      return { success: false, errorMessage: 'Only the guild leader can change the guild name' };
    }

    const validationError = validateGuildName(name);
    if (validationError) {
      return { success: false, errorMessage: validationError };
    }

    this._name = name.trim();
    this.markModified();

    return { success: true };
  }

  /**
   * Set the guild abbreviation
   * @param abbreviation - New abbreviation
   * @param actorId - Character changing the abbreviation (must be leader)
   */
  setAbbreviation(abbreviation: string, actorId: ObjectId): GuildOperationResult {
    if (actorId !== this._leaderId) {
      return { success: false, errorMessage: 'Only the guild leader can change the abbreviation' };
    }

    const validationError = validateGuildAbbreviation(abbreviation);
    if (validationError) {
      return { success: false, errorMessage: validationError };
    }

    this._abbreviation = abbreviation.toUpperCase().trim();
    this.markModified();

    return { success: true };
  }

  /**
   * Set the tax rate
   * @param rate - New tax rate (0.0 - 1.0)
   * @param actorId - Character setting the rate
   */
  setTaxRate(rate: number, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.SetTax)) {
      return { success: false, errorMessage: 'You do not have permission to set the tax rate' };
    }

    if (rate < 0 || rate > 1) {
      return { success: false, errorMessage: 'Tax rate must be between 0 and 1' };
    }

    this._taxRate = rate;
    this.markModified();

    return { success: true };
  }

  /**
   * Set recruiting status
   * @param isRecruiting - Whether the guild is recruiting
   * @param actorId - Character changing the status
   */
  setRecruiting(isRecruiting: boolean, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.EditMotd)) {
      return { success: false, errorMessage: 'You do not have permission to change recruiting status' };
    }

    this._isRecruiting = isRecruiting;
    this.markModified();

    return { success: true };
  }

  // ============================================
  // Invitations
  // ============================================

  /**
   * Add a pending invitation
   * @param invitation - Invitation data
   * @param actorId - Character sending the invitation
   */
  addInvitation(invitation: GuildInvitation, actorId: ObjectId): GuildOperationResult {
    if (!this.hasPermission(actorId, GuildPermission.Invite)) {
      return { success: false, errorMessage: 'You do not have permission to invite members' };
    }

    if (this._members.has(invitation.characterId)) {
      return { success: false, errorMessage: 'Character is already a guild member' };
    }

    if (this._pendingInvitations.has(invitation.characterId)) {
      return { success: false, errorMessage: 'Invitation already pending for this character' };
    }

    this._pendingInvitations.set(invitation.characterId, invitation);
    this.markModified();

    return { success: true };
  }

  /**
   * Remove a pending invitation
   * @param characterId - Character ID to remove invitation for
   */
  removeInvitation(characterId: ObjectId): void {
    this._pendingInvitations.delete(characterId);
    this.markModified();
  }

  /**
   * Get a pending invitation
   * @param characterId - Character ID to check
   */
  getInvitation(characterId: ObjectId): GuildInvitation | undefined {
    return this._pendingInvitations.get(characterId);
  }

  /**
   * Clean up expired invitations
   */
  cleanupExpiredInvitations(): void {
    const now = Date.now();
    for (const [characterId, invitation] of this._pendingInvitations) {
      if (invitation.expiresAt < now) {
        this._pendingInvitations.delete(characterId);
      }
    }
  }

  // ============================================
  // Activity Logging
  // ============================================

  /**
   * Log a guild event
   */
  private logEvent(
    eventType: GuildLogEntry['eventType'],
    actorId?: ObjectId,
    targetId?: ObjectId,
    details?: string,
    amount?: bigint
  ): void {
    const entry: GuildLogEntry = {
      timestamp: Date.now(),
      eventType,
      actorId,
      targetId,
      details,
      amount,
    };

    this._activityLog.unshift(entry);

    // Trim log if too long
    if (this._activityLog.length > GuildObject.MAX_LOG_ENTRIES) {
      this._activityLog = this._activityLog.slice(0, GuildObject.MAX_LOG_ENTRIES);
    }
  }

  /**
   * Get the activity log
   * @param limit - Maximum number of entries to return
   */
  getActivityLog(limit?: number): GuildLogEntry[] {
    if (limit) {
      return this._activityLog.slice(0, limit);
    }
    return [...this._activityLog];
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Mark the guild as modified
   */
  private markModified(): void {
    this._modifiedAt = new Date();
  }

  /**
   * Check if the guild can be disbanded
   */
  canDisband(): boolean {
    return this._members.size <= 1;
  }

  /**
   * Check if guild is at war with another guild
   * @param guildId - Guild ID to check
   */
  isAtWarWith(guildId: bigint): boolean {
    const war = this._wars.get(guildId);
    return war !== undefined && war.status === WarStatus.Active;
  }

  /**
   * Check if guild is allied with another guild
   * @param guildId - Guild ID to check
   */
  isAlliedWith(guildId: bigint): boolean {
    return this._allies.has(guildId);
  }

  /**
   * Serialize the guild to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      guildId: this.guildId.toString(),
      name: this._name,
      abbreviation: this._abbreviation,
      leaderId: this._leaderId.toString(),
      members: Array.from(this._members.entries()).map(([, member]) => ({
        ...member,
        characterId: member.characterId.toString(),
        totalDonated: member.totalDonated.toString(),
        sponsoredBy: member.sponsoredBy?.toString(),
      })),
      treasury: this._treasury.toString(),
      motd: this._motd,
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this._modifiedAt.toISOString(),
      sponsoredCity: this._sponsoredCity?.toString() ?? null,
      wars: Array.from(this._wars.entries()).map(([, war]) => ({
        ...war,
        guildId: war.guildId.toString(),
        declaredBy: war.declaredBy.toString(),
      })),
      allies: Array.from(this._allies).map((id) => id.toString()),
      enemies: Array.from(this._enemies).map((id) => id.toString()),
      rankNames: Object.fromEntries(this._rankNames),
      rankPermissions: Object.fromEntries(this._rankPermissions),
      taxRate: this._taxRate,
      isRecruiting: this._isRecruiting,
      memberCount: this._members.size,
    };
  }
}
