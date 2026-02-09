/**
 * Guild Manager Service
 * Manages guild lifecycle, persistence, and member status tracking
 *
 * Responsibilities:
 * - Guild creation and disbanding
 * - Loading and saving guilds to/from database
 * - Member online/offline status tracking
 * - Guild message broadcasting
 * - Name-based guild lookup
 */

import type { ObjectId } from '@swg/shared-types';
import {
  GuildObject,
  GuildRank,
  GuildPermission,
  generateObjectId,
  validateGuildName,
  validateGuildAbbreviation,
  type GuildMember,
  type GuildOperationResult,
} from '@swg/objects';

/**
 * Guild persistence data for database storage
 */
export interface GuildPersistenceData {
  /** Guild ID */
  guildId: string;
  /** Guild name */
  name: string;
  /** Guild abbreviation */
  abbreviation: string;
  /** Leader character ID */
  leaderId: string;
  /** Treasury balance */
  treasury: string;
  /** Message of the day */
  motd: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last modified timestamp */
  modifiedAt: string;
  /** Sponsored city ID (if any) */
  sponsoredCity: string | null;
  /** Tax rate */
  taxRate: number;
  /** Whether guild is recruiting */
  isRecruiting: boolean;
  /** Member data */
  members: GuildMemberPersistenceData[];
  /** War data */
  wars: GuildWarPersistenceData[];
  /** Allied guild IDs */
  allies: string[];
  /** Enemy guild IDs */
  enemies: string[];
  /** Custom rank names */
  rankNames: Record<number, string>;
  /** Custom rank permissions */
  rankPermissions: Record<number, number>;
}

/**
 * Member persistence data
 */
export interface GuildMemberPersistenceData {
  characterId: string;
  characterName: string;
  rank: number;
  joinedAt: number;
  lastOnline: number;
  title?: string | undefined;
  sponsoredBy?: string | undefined;
  totalDonated: string;
  notes?: string | undefined;
}

/**
 * War persistence data
 */
export interface GuildWarPersistenceData {
  guildId: string;
  guildName: string;
  declaredAt: number;
  declaredBy: string;
  status: number;
  kills: number;
  deaths: number;
  peaceOfferedAt?: number | undefined;
  endedAt?: number | undefined;
}

/**
 * Database persistence provider interface
 */
export interface GuildPersistenceProvider {
  /** Load guild data from database */
  loadGuild(guildId: bigint): Promise<GuildPersistenceData | null>;
  /** Save guild data to database */
  saveGuild(data: GuildPersistenceData): Promise<void>;
  /** Delete guild from database */
  deleteGuild(guildId: bigint): Promise<void>;
  /** Check if guild name is taken */
  isGuildNameTaken(name: string): Promise<boolean>;
  /** Check if abbreviation is taken */
  isAbbreviationTaken(abbreviation: string): Promise<boolean>;
  /** Get all guild IDs for a player */
  getPlayerGuildIds(playerId: ObjectId): Promise<bigint[]>;
  /** Get guild ID by name */
  getGuildIdByName(name: string): Promise<bigint | null>;
}

/**
 * Callback for guild messages
 */
export type GuildMessageCallback = (guildId: bigint, playerId: ObjectId, message: unknown) => void;

/**
 * Guild manager options
 */
export interface GuildManagerOptions {
  /** Persistence provider for database operations */
  persistenceProvider?: GuildPersistenceProvider;
  /** Auto-save interval in milliseconds (default: 5 minutes) */
  autoSaveInterval?: number;
  /** Enable auto-save */
  enableAutoSave?: boolean;
}

/**
 * Guild Manager Service
 * Central service for managing all guilds
 */
export class GuildManager {
  /** Active guilds by ID */
  readonly guilds: Map<bigint, GuildObject>;

  /** Guild IDs by name (lowercase) */
  readonly guildsByName: Map<string, bigint>;

  /** Player to guild mapping */
  private readonly playerGuilds: Map<ObjectId, bigint>;

  /** Persistence provider */
  private readonly persistence: GuildPersistenceProvider | undefined;

  /** Configuration options */
  private readonly options: Required<Omit<GuildManagerOptions, 'persistenceProvider'>>;

  /** Auto-save timer */
  private autoSaveTimer: ReturnType<typeof setInterval> | undefined;

  /** Dirty guilds needing save */
  private readonly dirtyGuilds: Set<bigint>;

  /** Message broadcast callbacks */
  private readonly messageCallbacks: Set<GuildMessageCallback>;

  /** Initialization flag */
  private initialized: boolean = false;

  constructor(options: GuildManagerOptions = {}) {
    this.guilds = new Map();
    this.guildsByName = new Map();
    this.playerGuilds = new Map();
    this.dirtyGuilds = new Set();
    this.messageCallbacks = new Set();
    this.persistence = options.persistenceProvider;

    this.options = {
      autoSaveInterval: options.autoSaveInterval ?? 5 * 60 * 1000, // 5 minutes
      enableAutoSave: options.enableAutoSave ?? true,
    };
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the guild manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[GuildManager] Initializing...');

    if (this.options.enableAutoSave && this.persistence) {
      this.startAutoSave();
    }

    this.initialized = true;
    console.log('[GuildManager] Initialized');
  }

  /**
   * Shutdown the guild manager
   */
  async shutdown(): Promise<void> {
    console.log('[GuildManager] Shutting down...');

    this.stopAutoSave();

    // Save all dirty guilds
    await this.saveAllDirty();

    this.guilds.clear();
    this.guildsByName.clear();
    this.playerGuilds.clear();
    this.dirtyGuilds.clear();
    this.messageCallbacks.clear();
    this.initialized = false;

    console.log('[GuildManager] Shutdown complete');
  }

  // ============================================
  // Guild Creation / Disbanding
  // ============================================

  /**
   * Create a new guild
   * @param leaderId - Character ID of the guild leader
   * @param name - Guild name
   * @param abbreviation - Guild abbreviation
   * @returns Created guild or null with error
   */
  async createGuild(
    leaderId: ObjectId,
    name: string,
    abbreviation: string
  ): Promise<{ guild: GuildObject | null; errorMessage?: string }> {
    // Validate name
    const nameError = validateGuildName(name);
    if (nameError) {
      return { guild: null, errorMessage: nameError };
    }

    // Validate abbreviation
    const abbrevError = validateGuildAbbreviation(abbreviation);
    if (abbrevError) {
      return { guild: null, errorMessage: abbrevError };
    }

    // Check if player already has a guild
    if (this.playerGuilds.has(leaderId)) {
      return { guild: null, errorMessage: 'You are already in a guild' };
    }

    // Check name uniqueness
    const lowerName = name.toLowerCase();
    if (this.guildsByName.has(lowerName)) {
      return { guild: null, errorMessage: 'A guild with this name already exists' };
    }

    if (this.persistence) {
      const nameTaken = await this.persistence.isGuildNameTaken(name);
      if (nameTaken) {
        return { guild: null, errorMessage: 'A guild with this name already exists' };
      }

      const abbrevTaken = await this.persistence.isAbbreviationTaken(abbreviation);
      if (abbrevTaken) {
        return { guild: null, errorMessage: 'This abbreviation is already taken' };
      }
    }

    // Generate guild ID
    const guildId = BigInt(generateObjectId());

    // Create guild object
    const guild = new GuildObject(guildId, name.trim(), abbreviation.trim(), leaderId);

    // Add leader as first member
    const leaderMember: GuildMember = {
      characterId: leaderId,
      characterName: '', // Will be set by caller
      rank: GuildRank.Leader,
      joinedAt: Date.now(),
      lastOnline: Date.now(),
      totalDonated: 0n,
      isOnline: true,
    };
    guild.addMember(leaderMember);

    // Register guild
    this.guilds.set(guildId, guild);
    this.guildsByName.set(lowerName, guildId);
    this.playerGuilds.set(leaderId, guildId);
    this.markDirty(guildId);

    console.log(`[GuildManager] Created guild "${name}" [${abbreviation}] with ID ${guildId}`);

    return { guild };
  }

  /**
   * Disband a guild
   * @param guildId - Guild ID to disband
   * @param actorId - Character ID performing the disband
   * @returns Operation result
   */
  async disbandGuild(guildId: bigint, actorId: ObjectId): Promise<GuildOperationResult> {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, errorMessage: 'Guild not found' };
    }

    // Only leader can disband
    if (actorId !== guild.leaderId) {
      return { success: false, errorMessage: 'Only the guild leader can disband the guild' };
    }

    // Check permission
    if (!guild.hasPermission(actorId, GuildPermission.Disband)) {
      return { success: false, errorMessage: 'You do not have permission to disband the guild' };
    }

    // Remove all member mappings
    for (const member of guild.members.values()) {
      this.playerGuilds.delete(member.characterId);
    }

    // Remove from registries
    this.guilds.delete(guildId);
    this.guildsByName.delete(guild.name.toLowerCase());
    this.dirtyGuilds.delete(guildId);

    // Delete from persistence
    if (this.persistence) {
      await this.persistence.deleteGuild(guildId);
    }

    console.log(`[GuildManager] Disbanded guild "${guild.name}" (${guildId})`);

    return { success: true };
  }

  // ============================================
  // Guild Loading / Saving
  // ============================================

  /**
   * Load a guild from the database
   * @param guildId - Guild ID to load
   * @returns Loaded guild or undefined
   */
  async loadGuild(guildId: bigint): Promise<GuildObject | undefined> {
    // Check if already loaded
    if (this.guilds.has(guildId)) {
      return this.guilds.get(guildId);
    }

    if (!this.persistence) {
      return undefined;
    }

    const data = await this.persistence.loadGuild(guildId);
    if (!data) {
      return undefined;
    }

    // Reconstruct guild object
    const guild = this.deserializeGuild(data);

    // Register guild
    this.guilds.set(guildId, guild);
    this.guildsByName.set(guild.name.toLowerCase(), guildId);

    // Register member mappings
    for (const member of guild.members.values()) {
      this.playerGuilds.set(member.characterId, guildId);
    }

    console.log(`[GuildManager] Loaded guild "${guild.name}" (${guildId})`);

    return guild;
  }

  /**
   * Save a guild to the database
   * @param guildId - Guild ID to save
   */
  async saveGuild(guildId: bigint): Promise<void> {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return;
    }

    if (!this.persistence) {
      return;
    }

    const data = this.serializeGuild(guild);
    await this.persistence.saveGuild(data);
    this.dirtyGuilds.delete(guildId);

    console.log(`[GuildManager] Saved guild "${guild.name}" (${guildId})`);
  }

  /**
   * Save all dirty guilds
   */
  private async saveAllDirty(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const guildId of this.dirtyGuilds) {
      promises.push(this.saveGuild(guildId));
    }
    await Promise.all(promises);
  }

  /**
   * Mark a guild as needing to be saved
   */
  private markDirty(guildId: bigint): void {
    this.dirtyGuilds.add(guildId);
  }

  // ============================================
  // Guild Queries
  // ============================================

  /**
   * Get a guild by ID, loading from database if needed
   * @param guildId - Guild ID
   * @returns Guild object or undefined
   */
  async getGuild(guildId: bigint): Promise<GuildObject | undefined> {
    let guild = this.guilds.get(guildId);
    if (!guild && this.persistence) {
      guild = await this.loadGuild(guildId);
    }
    return guild;
  }

  /**
   * Get a guild by ID (synchronous, only returns cached guilds)
   * @param guildId - Guild ID
   * @returns Guild object or undefined
   */
  getGuildSync(guildId: bigint): GuildObject | undefined {
    return this.guilds.get(guildId);
  }

  /**
   * Get a guild by name
   * @param name - Guild name (case-insensitive)
   * @returns Guild object or undefined
   */
  async getGuildByName(name: string): Promise<GuildObject | undefined> {
    const lowerName = name.toLowerCase();

    // Check cache first
    const cachedId = this.guildsByName.get(lowerName);
    if (cachedId) {
      return this.guilds.get(cachedId);
    }

    // Try to load from persistence
    if (this.persistence) {
      const guildId = await this.persistence.getGuildIdByName(name);
      if (guildId) {
        return this.loadGuild(guildId);
      }
    }

    return undefined;
  }

  /**
   * Get a player's guild
   * @param playerId - Player character ID
   * @returns Guild object or undefined
   */
  async getPlayerGuild(playerId: ObjectId): Promise<GuildObject | undefined> {
    // Check cache first
    const cachedGuildId = this.playerGuilds.get(playerId);
    if (cachedGuildId) {
      return this.guilds.get(cachedGuildId);
    }

    // Try to load from persistence
    if (this.persistence) {
      const guildIds = await this.persistence.getPlayerGuildIds(playerId);
      if (guildIds.length > 0) {
        // Player should only be in one guild
        return this.loadGuild(guildIds[0]!);
      }
    }

    return undefined;
  }

  /**
   * Get a player's guild ID (synchronous)
   * @param playerId - Player character ID
   * @returns Guild ID or undefined
   */
  getPlayerGuildId(playerId: ObjectId): bigint | undefined {
    return this.playerGuilds.get(playerId);
  }

  // ============================================
  // Member Status
  // ============================================

  /**
   * Handle a member coming online
   * @param guildId - Guild ID
   * @param playerId - Player character ID
   */
  handleMemberOnline(guildId: bigint, playerId: ObjectId): void {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return;
    }

    guild.setMemberOnlineStatus(playerId, true);
    this.markDirty(guildId);

    console.log(`[GuildManager] Member ${playerId} came online in guild ${guild.name}`);
  }

  /**
   * Handle a member going offline
   * @param guildId - Guild ID
   * @param playerId - Player character ID
   */
  handleMemberOffline(guildId: bigint, playerId: ObjectId): void {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return;
    }

    guild.setMemberOnlineStatus(playerId, false);
    this.markDirty(guildId);

    console.log(`[GuildManager] Member ${playerId} went offline in guild ${guild.name}`);
  }

  /**
   * Register a player as a guild member
   * Used when a player joins a guild
   */
  registerPlayerGuild(playerId: ObjectId, guildId: bigint): void {
    this.playerGuilds.set(playerId, guildId);
  }

  /**
   * Unregister a player from their guild
   * Used when a player leaves or is kicked from a guild
   */
  unregisterPlayerGuild(playerId: ObjectId): void {
    this.playerGuilds.delete(playerId);
  }

  // ============================================
  // Message Broadcasting
  // ============================================

  /**
   * Broadcast a message to all online members of a guild
   * @param guildId - Guild ID
   * @param message - Message to broadcast
   */
  broadcastGuildMessage(guildId: bigint, message: unknown): void {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return;
    }

    // Get all online members
    const onlineIds = guild.getOnlineMemberIds();

    // Notify all registered callbacks
    for (const playerId of onlineIds) {
      for (const callback of this.messageCallbacks) {
        try {
          callback(guildId, playerId, message);
        } catch (error) {
          console.error('[GuildManager] Error in message callback:', error);
        }
      }
    }
  }

  /**
   * Register a callback for guild messages
   * @param callback - Callback function
   */
  onGuildMessage(callback: GuildMessageCallback): void {
    this.messageCallbacks.add(callback);
  }

  /**
   * Unregister a guild message callback
   * @param callback - Callback function
   */
  offGuildMessage(callback: GuildMessageCallback): void {
    this.messageCallbacks.delete(callback);
  }

  // ============================================
  // Auto-Save
  // ============================================

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveAllDirty().catch((error) => {
        console.error('[GuildManager] Auto-save error:', error);
      });
    }, this.options.autoSaveInterval);

    console.log(
      `[GuildManager] Started auto-save (interval: ${this.options.autoSaveInterval}ms)`
    );
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
      console.log('[GuildManager] Stopped auto-save');
    }
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize a guild object for persistence
   */
  private serializeGuild(guild: GuildObject): GuildPersistenceData {
    const members: GuildMemberPersistenceData[] = [];
    for (const member of guild.members.values()) {
      members.push({
        characterId: member.characterId.toString(),
        characterName: member.characterName,
        rank: member.rank,
        joinedAt: member.joinedAt,
        lastOnline: member.lastOnline,
        title: member.title,
        sponsoredBy: member.sponsoredBy?.toString(),
        totalDonated: member.totalDonated.toString(),
        notes: member.notes,
      });
    }

    const wars: GuildWarPersistenceData[] = [];
    for (const war of guild.wars.values()) {
      wars.push({
        guildId: war.guildId.toString(),
        guildName: war.guildName,
        declaredAt: war.declaredAt,
        declaredBy: war.declaredBy.toString(),
        status: war.status,
        kills: war.kills,
        deaths: war.deaths,
        peaceOfferedAt: war.peaceOfferedAt,
        endedAt: war.endedAt,
      });
    }

    const rankNames: Record<number, string> = {};
    for (const [rank, name] of guild.rankNames) {
      rankNames[rank] = name;
    }

    const rankPermissions: Record<number, number> = {};
    for (const [rank, perms] of guild.rankPermissions) {
      rankPermissions[rank] = perms;
    }

    return {
      guildId: guild.guildId.toString(),
      name: guild.name,
      abbreviation: guild.abbreviation,
      leaderId: guild.leaderId.toString(),
      treasury: guild.treasury.toString(),
      motd: guild.motd,
      createdAt: guild.createdAt.toISOString(),
      modifiedAt: guild.modifiedAt.toISOString(),
      sponsoredCity: guild.sponsoredCity?.toString() ?? null,
      taxRate: guild.taxRate,
      isRecruiting: guild.isRecruiting,
      members,
      wars,
      allies: Array.from(guild.allies).map((id) => id.toString()),
      enemies: Array.from(guild.enemies).map((id) => id.toString()),
      rankNames,
      rankPermissions,
    };
  }

  /**
   * Deserialize guild data into a guild object
   */
  private deserializeGuild(data: GuildPersistenceData): GuildObject {
    const guildId = BigInt(data.guildId);
    const leaderId = BigInt(data.leaderId) as ObjectId;

    const guild = new GuildObject(guildId, data.name, data.abbreviation, leaderId);

    // Restore members
    for (const memberData of data.members) {
      const member: GuildMember = {
        characterId: BigInt(memberData.characterId) as ObjectId,
        characterName: memberData.characterName,
        rank: memberData.rank as GuildRank,
        joinedAt: memberData.joinedAt,
        lastOnline: memberData.lastOnline,
        title: memberData.title,
        sponsoredBy: memberData.sponsoredBy
          ? (BigInt(memberData.sponsoredBy) as ObjectId)
          : undefined,
        totalDonated: BigInt(memberData.totalDonated),
        notes: memberData.notes,
        isOnline: false, // Reset to offline on load
      };
      guild.addMember(member);
    }

    return guild;
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get guild manager statistics
   */
  getStats(): {
    totalGuilds: number;
    totalMembers: number;
    onlineMembers: number;
    dirtyGuilds: number;
  } {
    let totalMembers = 0;
    let onlineMembers = 0;

    for (const guild of this.guilds.values()) {
      totalMembers += guild.memberCount;
      onlineMembers += guild.getOnlineMembers();
    }

    return {
      totalGuilds: this.guilds.size,
      totalMembers,
      onlineMembers,
      dirtyGuilds: this.dirtyGuilds.size,
    };
  }
}

/**
 * Create a new GuildManager instance
 */
export function createGuildManager(options?: GuildManagerOptions): GuildManager {
  return new GuildManager(options);
}

/**
 * Singleton instance for global access
 */
let globalGuildManager: GuildManager | null = null;

/**
 * Get or create the global guild manager instance
 */
export function getGuildManager(options?: GuildManagerOptions): GuildManager {
  if (!globalGuildManager) {
    globalGuildManager = new GuildManager(options);
  }
  return globalGuildManager;
}
