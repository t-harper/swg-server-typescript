/**
 * Guild Permission Service
 * Provides rank-based access control for guild operations
 *
 * This service handles permission checking for various guild actions:
 * - Inviting and kicking members
 * - Promoting and demoting members
 * - Treasury operations
 * - War and peace declarations
 * - MOTD editing
 * - Rank management
 */

import type { ObjectId } from '@swg/shared-types';
import {
  GuildObject,
  GuildRank,
  GuildPermission,
  hasGuildPermission,
  getPermissionName,
  type GuildMember,
} from '@swg/objects';

/**
 * Error class for guild permission failures
 */
export class GuildPermissionError extends Error {
  /** Guild ID where permission was denied */
  readonly guildId: bigint;
  /** Player ID who was denied */
  readonly playerId: ObjectId;
  /** Permission that was required */
  readonly permission: number;
  /** Human-readable permission name */
  readonly permissionName: string;

  constructor(guildId: bigint, playerId: ObjectId, permission: number, message?: string) {
    const permName = getPermissionName(permission);
    super(message ?? `Player ${playerId} lacks permission: ${permName}`);
    this.name = 'GuildPermissionError';
    this.guildId = guildId;
    this.playerId = playerId;
    this.permission = permission;
    this.permissionName = permName;
  }
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  allowed: boolean;
  /** Reason for denial (if not allowed) */
  reason?: string;
}

/**
 * Guild Permission Service
 * Central service for checking and enforcing guild permissions
 */
export class GuildPermissionService {
  /** Guild getter function for retrieving guild objects */
  private readonly getGuild: (guildId: bigint) => GuildObject | undefined;

  /**
   * Create a new GuildPermissionService
   * @param guildGetter - Function to retrieve GuildObject by ID
   */
  constructor(guildGetter: (guildId: bigint) => GuildObject | undefined) {
    this.getGuild = guildGetter;
  }

  // ============================================
  // Core Permission Checking
  // ============================================

  /**
   * Check if a player has a specific permission in a guild
   * @param guildId - Guild ID to check
   * @param playerId - Player ID to check
   * @param permission - Permission flag to check
   * @returns Whether the player has the permission
   */
  checkPermission(guildId: bigint, playerId: ObjectId, permission: number): boolean {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return false;
    }

    return guild.hasPermission(playerId, permission);
  }

  /**
   * Require a player to have a specific permission, throws if not
   * @param guildId - Guild ID to check
   * @param playerId - Player ID to check
   * @param permission - Permission flag required
   * @throws GuildPermissionError if permission is not granted
   */
  requirePermission(guildId: bigint, playerId: ObjectId, permission: number): void {
    if (!this.checkPermission(guildId, playerId, permission)) {
      throw new GuildPermissionError(guildId, playerId, permission);
    }
  }

  /**
   * Get a player's rank in a guild
   * @param guildId - Guild ID
   * @param playerId - Player ID
   * @returns Player's rank or null if not a member
   */
  private getPlayerRank(guildId: bigint, playerId: ObjectId): GuildRank | null {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return null;
    }
    return guild.getRank(playerId);
  }

  /**
   * Get a member from a guild
   * @param guildId - Guild ID
   * @param playerId - Player ID
   * @returns Member data or undefined
   */
  private getMember(guildId: bigint, playerId: ObjectId): GuildMember | undefined {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return undefined;
    }
    return guild.getMember(playerId);
  }

  // ============================================
  // Invite Permission
  // ============================================

  /**
   * Check if a player can invite new members to the guild
   * @param guildId - Guild ID
   * @param playerId - Player attempting to invite
   * @returns Permission check result
   */
  canInvite(guildId: bigint, playerId: ObjectId): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.Invite)) {
      return { allowed: false, reason: 'You do not have permission to invite members' };
    }

    return { allowed: true };
  }

  // ============================================
  // Kick Permission
  // ============================================

  /**
   * Check if a player can kick another member from the guild
   * Cannot kick members of higher or equal rank
   * @param guildId - Guild ID
   * @param playerId - Player attempting to kick
   * @param targetId - Player being kicked
   * @returns Permission check result
   */
  canKick(guildId: bigint, playerId: ObjectId, targetId: ObjectId): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.isMember(targetId)) {
      return { allowed: false, reason: 'Target is not a guild member' };
    }

    // Cannot kick yourself
    if (playerId === targetId) {
      return { allowed: false, reason: 'Cannot kick yourself. Use leave instead.' };
    }

    // Cannot kick the leader
    if (targetId === guild.leaderId) {
      return { allowed: false, reason: 'Cannot kick the guild leader' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.Kick)) {
      return { allowed: false, reason: 'You do not have permission to kick members' };
    }

    // Check rank hierarchy - cannot kick someone of equal or higher rank
    const actorRank = guild.getRank(playerId);
    const targetRank = guild.getRank(targetId);

    if (actorRank === null || targetRank === null) {
      return { allowed: false, reason: 'Unable to determine ranks' };
    }

    // Lower rank number = higher rank (Leader=0, Officer=1, etc.)
    if (actorRank >= targetRank) {
      return { allowed: false, reason: 'Cannot kick a member of equal or higher rank' };
    }

    return { allowed: true };
  }

  // ============================================
  // Promote Permission
  // ============================================

  /**
   * Check if a player can promote another member
   * Cannot promote to a rank equal or higher than your own
   * @param guildId - Guild ID
   * @param playerId - Player attempting to promote
   * @param targetId - Player being promoted
   * @param newRank - Target rank after promotion
   * @returns Permission check result
   */
  canPromote(
    guildId: bigint,
    playerId: ObjectId,
    targetId: ObjectId,
    newRank: GuildRank
  ): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.isMember(targetId)) {
      return { allowed: false, reason: 'Target is not a guild member' };
    }

    // Cannot promote yourself
    if (playerId === targetId) {
      return { allowed: false, reason: 'Cannot promote yourself' };
    }

    // Cannot promote to Leader
    if (newRank === GuildRank.Leader) {
      return { allowed: false, reason: 'Use transfer leadership to make someone leader' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.Promote)) {
      return { allowed: false, reason: 'You do not have permission to promote members' };
    }

    const actorRank = guild.getRank(playerId);
    const currentTargetRank = guild.getRank(targetId);

    if (actorRank === null || currentTargetRank === null) {
      return { allowed: false, reason: 'Unable to determine ranks' };
    }

    // Check target is currently below the actor
    if (actorRank >= currentTargetRank) {
      return { allowed: false, reason: 'Cannot promote a member of equal or higher rank' };
    }

    // Check new rank would still be below actor (or equal for leaders promoting to officer)
    // Lower rank number = higher rank
    if (newRank < actorRank) {
      return { allowed: false, reason: 'Cannot promote someone to a rank higher than your own' };
    }

    // Check it's actually a promotion (lower number = higher rank)
    if (newRank >= currentTargetRank) {
      return { allowed: false, reason: 'New rank must be higher than current rank' };
    }

    return { allowed: true };
  }

  // ============================================
  // Demote Permission
  // ============================================

  /**
   * Check if a player can demote another member
   * Cannot demote members of higher or equal rank
   * @param guildId - Guild ID
   * @param playerId - Player attempting to demote
   * @param targetId - Player being demoted
   * @param newRank - Target rank after demotion
   * @returns Permission check result
   */
  canDemote(
    guildId: bigint,
    playerId: ObjectId,
    targetId: ObjectId,
    newRank: GuildRank
  ): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.isMember(targetId)) {
      return { allowed: false, reason: 'Target is not a guild member' };
    }

    // Cannot demote yourself
    if (playerId === targetId) {
      return { allowed: false, reason: 'Cannot demote yourself' };
    }

    // Cannot demote the leader
    if (targetId === guild.leaderId) {
      return { allowed: false, reason: 'Cannot demote the guild leader' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.Demote)) {
      return { allowed: false, reason: 'You do not have permission to demote members' };
    }

    const actorRank = guild.getRank(playerId);
    const currentTargetRank = guild.getRank(targetId);

    if (actorRank === null || currentTargetRank === null) {
      return { allowed: false, reason: 'Unable to determine ranks' };
    }

    // Check target is currently below the actor
    if (actorRank >= currentTargetRank) {
      return { allowed: false, reason: 'Cannot demote a member of equal or higher rank' };
    }

    // Check it's actually a demotion (higher number = lower rank)
    if (newRank <= currentTargetRank) {
      return { allowed: false, reason: 'New rank must be lower than current rank' };
    }

    return { allowed: true };
  }

  // ============================================
  // Treasury Permission
  // ============================================

  /**
   * Check if a player can withdraw credits from the guild treasury
   * @param guildId - Guild ID
   * @param playerId - Player attempting to withdraw
   * @param amount - Amount to withdraw
   * @returns Permission check result
   */
  canWithdraw(guildId: bigint, playerId: ObjectId, amount: bigint): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.WithdrawCredits)) {
      return { allowed: false, reason: 'You do not have permission to withdraw credits' };
    }

    if (amount <= 0n) {
      return { allowed: false, reason: 'Withdrawal amount must be positive' };
    }

    if (amount > guild.treasury) {
      return { allowed: false, reason: 'Insufficient funds in treasury' };
    }

    return { allowed: true };
  }

  // ============================================
  // War Permission
  // ============================================

  /**
   * Check if a player can declare war on another guild
   * @param guildId - Guild ID
   * @param playerId - Player attempting to declare war
   * @returns Permission check result
   */
  canDeclareWar(guildId: bigint, playerId: ObjectId): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.DeclareWar)) {
      return { allowed: false, reason: 'You do not have permission to declare war' };
    }

    return { allowed: true };
  }

  /**
   * Check if a player can accept a peace offer
   * @param guildId - Guild ID
   * @param playerId - Player attempting to accept peace
   * @returns Permission check result
   */
  canAcceptPeace(guildId: bigint, playerId: ObjectId): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.AcceptPeace)) {
      return { allowed: false, reason: 'You do not have permission to accept peace' };
    }

    return { allowed: true };
  }

  // ============================================
  // MOTD Permission
  // ============================================

  /**
   * Check if a player can edit the message of the day
   * @param guildId - Guild ID
   * @param playerId - Player attempting to edit MOTD
   * @returns Permission check result
   */
  canEditMotd(guildId: bigint, playerId: ObjectId): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    if (!guild.hasPermission(playerId, GuildPermission.EditMotd)) {
      return { allowed: false, reason: 'You do not have permission to edit the MOTD' };
    }

    return { allowed: true };
  }

  // ============================================
  // Rank Management Permission
  // ============================================

  /**
   * Check if a player can manage rank customization (rename ranks, modify permissions)
   * @param guildId - Guild ID
   * @param playerId - Player attempting to manage ranks
   * @returns Permission check result
   */
  canManageRanks(guildId: bigint, playerId: ObjectId): PermissionCheckResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { allowed: false, reason: 'Guild not found' };
    }

    if (!guild.isMember(playerId)) {
      return { allowed: false, reason: 'Not a guild member' };
    }

    // Need both RenameRanks and ModifyPermissions for full rank management
    const canRename = guild.hasPermission(playerId, GuildPermission.RenameRanks);
    const canModify = guild.hasPermission(playerId, GuildPermission.ModifyPermissions);

    if (!canRename && !canModify) {
      return { allowed: false, reason: 'You do not have permission to manage ranks' };
    }

    return { allowed: true };
  }

  // ============================================
  // Effective Permissions
  // ============================================

  /**
   * Get all effective permissions for a player in a guild
   * Returns a bitmask of all granted permissions
   * @param guildId - Guild ID
   * @param playerId - Player ID
   * @returns Bitmask of permissions, 0 if not a member
   */
  getEffectivePermissions(guildId: bigint, playerId: ObjectId): number {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return GuildPermission.None;
    }

    return guild.getPermissions(playerId);
  }

  /**
   * Get a list of permission names the player has
   * @param guildId - Guild ID
   * @param playerId - Player ID
   * @returns Array of permission names
   */
  getPermissionNames(guildId: bigint, playerId: ObjectId): string[] {
    const permissions = this.getEffectivePermissions(guildId, playerId);
    const names: string[] = [];

    // Check each permission flag
    const allPermissions = [
      GuildPermission.Invite,
      GuildPermission.Kick,
      GuildPermission.Promote,
      GuildPermission.Demote,
      GuildPermission.EditMotd,
      GuildPermission.WithdrawCredits,
      GuildPermission.DeclareWar,
      GuildPermission.AcceptPeace,
      GuildPermission.SetTax,
      GuildPermission.ManageMail,
      GuildPermission.SponsorCitizen,
      GuildPermission.ManageAlliances,
      GuildPermission.RenameRanks,
      GuildPermission.ModifyPermissions,
      GuildPermission.TransferLeadership,
      GuildPermission.Disband,
    ];

    for (const perm of allPermissions) {
      if (hasGuildPermission(permissions, perm)) {
        names.push(getPermissionName(perm));
      }
    }

    return names;
  }
}

/**
 * Create a new GuildPermissionService instance
 * @param guildGetter - Function to retrieve GuildObject by ID
 */
export function createGuildPermissionService(
  guildGetter: (guildId: bigint) => GuildObject | undefined
): GuildPermissionService {
  return new GuildPermissionService(guildGetter);
}
