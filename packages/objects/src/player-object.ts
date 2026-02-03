/**
 * PlayerObject - Represents player characters in the game world
 * Extends CreatureObject with player-specific properties like:
 * - Account and station tracking
 * - Biography and title
 * - Waypoints
 * - Experience and schematics
 * - Quest progress
 * - Friends and ignore lists
 * - Faction standing and GCW participation
 * - Player flags and settings
 *
 * This is the final class in the object hierarchy:
 * SceneObject -> TangibleObject -> CreatureObject -> PlayerObject
 *
 * Baseline Types:
 * - PLAY3: Station ID, flags, biography, born date
 * - PLAY6: Admin level, XP types, waypoints, crafting stage, quests
 * - PLAY8: Food/drink fill, GCW points, home region
 * - PLAY9: Played time, profession, friends, ignore
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { CreatureObject } from './creature-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';

/**
 * Player flags (bitmask) for various player states
 */
export const PlayerFlags = {
  /** No special flags */
  NONE: 0n,
  /** Show helmet on character */
  SHOW_HELMET: 1n << 0n,
  /** Looking for group */
  LFG: 1n << 1n,
  /** Roleplay flag */
  ROLEPLAY: 1n << 2n,
  /** Away from keyboard */
  AFK: 1n << 3n,
  /** Link dead (disconnected but still in world) */
  LINK_DEAD: 1n << 4n,
  /** Anonymous (hide from searches) */
  ANONYMOUS: 1n << 5n,
  /** Show backpack */
  SHOW_BACKPACK: 1n << 6n,
  /** In developer mode */
  DEVELOPER: 1n << 7n,
  /** Out of character chat */
  OOC: 1n << 8n,
  /** Training indicator */
  TRAINING: 1n << 9n,
  /** Helper flag (for new player assistance) */
  HELPER: 1n << 10n,
  /** Newbie flag */
  NEWBIE: 1n << 11n,
  /** Display faction rank */
  DISPLAY_FACTION_RANK: 1n << 12n,
  /** Veteran status */
  VETERAN: 1n << 13n,
  /** Character trial */
  CHARACTER_TRIAL: 1n << 14n,
  /** Beta tester */
  BETA_TESTER: 1n << 15n,
} as const;

export type PlayerFlagsType = bigint;

/**
 * PvP Type for Galactic Civil War participation
 */
export const PvpType = {
  /** Neutral - not participating in GCW */
  NEUTRAL: 'neutral',
  /** Covert - hidden faction affiliation */
  COVERT: 'covert',
  /** Overt - openly factioned and attackable */
  OVERT: 'overt',
} as const;

export type PvpTypeValue = (typeof PvpType)[keyof typeof PvpType];

/**
 * Waypoint data structure
 */
export interface Waypoint {
  /** Unique waypoint ID */
  objectId: ObjectId;
  /** Display name */
  name: string;
  /** Planet/scene name */
  planetName: string;
  /** World X coordinate */
  x: number;
  /** World Y coordinate (height) */
  y: number;
  /** World Z coordinate */
  z: number;
  /** Waypoint color (blue, green, orange, yellow, white, purple) */
  color: number;
  /** Whether this waypoint is active/visible on HUD */
  active: boolean;
}

/**
 * Waypoint color values
 */
export const WaypointColor = {
  BLUE: 1,
  GREEN: 2,
  ORANGE: 3,
  YELLOW: 4,
  WHITE: 5,
  PURPLE: 6,
} as const;

export type WaypointColorType = (typeof WaypointColor)[keyof typeof WaypointColor];

/**
 * Quest state data structure
 */
export interface QuestState {
  /** Quest CRC identifier */
  questCrc: CrcValue;
  /** Whether the quest is active */
  active: boolean;
  /** Current quest stage/step */
  stage: number;
  /** Timestamp when quest was accepted */
  acceptedAt: number;
  /** Quest-specific progress counters */
  counters: Map<string, number>;
}

/**
 * Admin level enumeration
 */
export const AdminLevel = {
  PLAYER: 0,
  CSR: 1,
  DEVELOPER: 2,
  QA: 3,
  ADMIN: 4,
} as const;

export type AdminLevelType = (typeof AdminLevel)[keyof typeof AdminLevel];

/**
 * Crafting stage enumeration
 */
export const CraftingStage = {
  NONE: 0,
  SELECTING_SCHEMATIC: 1,
  ASSEMBLY: 2,
  EXPERIMENT: 3,
  CUSTOMIZATION: 4,
  FINISHED: 5,
} as const;

export type CraftingStageType = (typeof CraftingStage)[keyof typeof CraftingStage];

/**
 * PLAY property indices for delta tracking
 * These match the variable indices in PLAY baselines
 */
export const PlayProperty = {
  // PLAY3
  STATION_ID: 0,
  PLAYER_FLAGS: 1,
  BIOGRAPHY: 2,
  BORN_DATE: 3,
  CURRENT_TITLE: 4,
  // PLAY6
  ADMIN_LEVEL: 0,
  EXPERIENCE: 1,
  WAYPOINTS: 2,
  CRAFTING_STAGE: 3,
  CRAFTING_SCHEMATIC: 4,
  NEAREST_CRAFTING_STATION: 5,
  DRAFT_SCHEMATICS: 6,
  ACTIVE_QUESTS: 7,
  COMPLETED_QUESTS: 8,
  // PLAY8
  FOOD_FILL_CURRENT: 0,
  FOOD_FILL_MAX: 1,
  DRINK_FILL_CURRENT: 2,
  DRINK_FILL_MAX: 3,
  GCW_POINTS: 4,
  PVP_KILLS: 5,
  LIFETIME_GCW_POINTS: 6,
  HOME_REGION: 7,
  // PLAY9
  PLAYED_TIME: 0,
  PROFESSION_TITLE: 1,
  FRIENDS: 2,
  IGNORE: 3,
  MATCHMAKING_FLAGS: 4,
  CHAT_FLAGS: 5,
} as const;

/**
 * PlayerObject - Player character object
 * Extends CreatureObject with player-specific properties
 */
export class PlayerObject extends CreatureObject {
  // ============================================
  // Account & Session
  // ============================================

  /** Associated account ID */
  accountId: bigint;

  /** Station ID for tracking */
  stationId: string;

  /** Character creation timestamp */
  birthDate: number;

  /** Total time played in seconds */
  playedTime: number;

  /** Current session start timestamp */
  sessionStartTime: number;

  /** Last logout timestamp */
  lastLogout: number;

  // ============================================
  // Biography & Title
  // ============================================

  /** Character biography */
  biography: string;

  /** Currently displayed title */
  title: string;

  /** Profession title (from skill tree) */
  professionTitle: string;

  // ============================================
  // Waypoints
  // ============================================

  /** Player's waypoints */
  waypoints: Map<ObjectId, Waypoint>;

  /** Currently active waypoint (shown on HUD) */
  activeWaypoint: ObjectId | null;

  // ============================================
  // Experience & Skills
  // ============================================

  /** Experience by type (combat_general, crafting, etc.) */
  experience: Map<string, number>;

  /** Granted schematics (CRCs the player can use) */
  schematicsGranted: Set<CrcValue>;

  // ============================================
  // Quests
  // ============================================

  /** Completed quest CRCs */
  completedQuests: Set<CrcValue>;

  /** Active quests with progress */
  activeQuests: Map<CrcValue, QuestState>;

  // ============================================
  // Friends & Ignore
  // ============================================

  /** Friend character names */
  friends: Set<string>;

  /** Ignored character names */
  ignore: Set<string>;

  // ============================================
  // Faction Standing
  // ============================================

  /** Faction to standing value map */
  factionStanding: Map<string, number>;

  /** PvP type (neutral, covert, overt) */
  pvpType: PvpTypeValue;

  /** Galactic Civil War points */
  gcwPoints: number;

  /** Lifetime GCW points earned */
  lifetimeGcwPoints: number;

  /** PvP kills count */
  pvpKills: number;

  // ============================================
  // Flags & Settings
  // ============================================

  /** Player state flags bitmask */
  playerFlags: PlayerFlagsType;

  /** Chat settings flags */
  chatFlags: number;

  /** LFG matchmaking flags */
  matchMakingFlags: number;

  /** Admin privilege level */
  adminLevel: AdminLevelType;

  // ============================================
  // Food & Drink
  // ============================================

  /** Current food buff fill */
  foodFillCurrent: number;

  /** Maximum food buff fill */
  foodFillMax: number;

  /** Current drink buff fill */
  drinkFillCurrent: number;

  /** Maximum drink buff fill */
  drinkFillMax: number;

  // ============================================
  // Crafting
  // ============================================

  /** Current crafting stage */
  craftingStage: CraftingStageType;

  /** Currently crafting schematic CRC */
  craftingSchematic: CrcValue;

  /** Nearest crafting station ID */
  nearestCraftingStation: ObjectId;

  // ============================================
  // Home
  // ============================================

  /** Home region/city CRC */
  homeRegion: CrcValue;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for PLAY3 */
  private deltaTrackerPlay3: DeltaTracker;

  /** Delta tracker for PLAY6 */
  private deltaTrackerPlay6: DeltaTracker;

  /** Delta tracker for PLAY8 */
  private deltaTrackerPlay8: DeltaTracker;

  /** Delta tracker for PLAY9 */
  private deltaTrackerPlay9: DeltaTracker;

  /** Update counters for list properties */
  private playListUpdateCounters: Map<string, number>;

  /**
   * Create a new PlayerObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Player;

    // Initialize account & session
    this.accountId = 0n;
    this.stationId = '';
    this.birthDate = Date.now();
    this.playedTime = 0;
    this.sessionStartTime = Date.now();
    this.lastLogout = 0;

    // Initialize biography & title
    this.biography = '';
    this.title = '';
    this.professionTitle = '';

    // Initialize waypoints
    this.waypoints = new Map();
    this.activeWaypoint = null;

    // Initialize experience & schematics
    this.experience = new Map();
    this.schematicsGranted = new Set();

    // Initialize quests
    this.completedQuests = new Set();
    this.activeQuests = new Map();

    // Initialize friends & ignore
    this.friends = new Set();
    this.ignore = new Set();

    // Initialize faction standing
    this.factionStanding = new Map();
    this.pvpType = PvpType.NEUTRAL;
    this.gcwPoints = 0;
    this.lifetimeGcwPoints = 0;
    this.pvpKills = 0;

    // Initialize flags & settings
    this.playerFlags = PlayerFlags.NONE;
    this.chatFlags = 0;
    this.matchMakingFlags = 0;
    this.adminLevel = AdminLevel.PLAYER;

    // Initialize food & drink
    this.foodFillCurrent = 0;
    this.foodFillMax = 100;
    this.drinkFillCurrent = 0;
    this.drinkFillMax = 100;

    // Initialize crafting
    this.craftingStage = CraftingStage.NONE;
    this.craftingSchematic = 0;
    this.nearestCraftingStation = 0n;

    // Initialize home
    this.homeRegion = 0;

    // Initialize delta trackers
    this.deltaTrackerPlay3 = new DeltaTracker();
    this.deltaTrackerPlay6 = new DeltaTracker();
    this.deltaTrackerPlay8 = new DeltaTracker();
    this.deltaTrackerPlay9 = new DeltaTracker();
    this.playListUpdateCounters = new Map();
  }

  /**
   * Get baseline type for PLAY objects
   */
  override getBaselineType(): string {
    return 'PLAY';
  }

  // ============================================
  // Experience Management
  // ============================================

  /**
   * Add experience to a specific type
   * @param type - Experience type (e.g., 'combat_general', 'crafting')
   * @param amount - Amount of XP to add
   * @returns New experience total for this type
   */
  addExperience(type: string, amount: number): number {
    const current = this.experience.get(type) ?? 0;
    const newTotal = current + amount;
    const isNew = !this.experience.has(type);
    this.experience.set(type, newTotal);
    this.incrementPlayListUpdateCounter('experience');
    this.deltaTrackerPlay6.trackMapChange(PlayProperty.EXPERIENCE, type, newTotal, isNew);
    this.markModified();
    return newTotal;
  }

  /**
   * Get experience for a specific type
   */
  getExperience(type: string): number {
    return this.experience.get(type) ?? 0;
  }

  /**
   * Set experience for a specific type
   */
  setExperience(type: string, amount: number): void {
    const isNew = !this.experience.has(type);
    this.experience.set(type, Math.max(0, amount));
    this.incrementPlayListUpdateCounter('experience');
    this.deltaTrackerPlay6.trackMapChange(PlayProperty.EXPERIENCE, type, amount, isNew);
    this.markModified();
  }

  // ============================================
  // Schematic Management
  // ============================================

  /**
   * Award a schematic to the player
   * @param crc - Schematic CRC
   * @returns true if newly granted, false if already had
   */
  awardSchematic(crc: CrcValue): boolean {
    if (this.schematicsGranted.has(crc)) {
      return false;
    }
    this.schematicsGranted.add(crc);
    this.incrementPlayListUpdateCounter('schematics');
    this.deltaTrackerPlay6.trackListAdd(
      PlayProperty.DRAFT_SCHEMATICS,
      this.schematicsGranted.size - 1,
      crc
    );
    this.markModified();
    return true;
  }

  /**
   * Check if player has a schematic
   */
  hasSchematic(crc: CrcValue): boolean {
    return this.schematicsGranted.has(crc);
  }

  /**
   * Remove a schematic from the player
   */
  removeSchematic(crc: CrcValue): boolean {
    if (!this.schematicsGranted.has(crc)) {
      return false;
    }
    this.schematicsGranted.delete(crc);
    this.incrementPlayListUpdateCounter('schematics');
    this.deltaTrackerPlay6.trackListRemove(PlayProperty.DRAFT_SCHEMATICS, 0, crc);
    this.markModified();
    return true;
  }

  // ============================================
  // Quest Management
  // ============================================

  /**
   * Complete a quest
   * @param crc - Quest CRC
   * @returns true if newly completed, false if already completed
   */
  completeQuest(crc: CrcValue): boolean {
    if (this.completedQuests.has(crc)) {
      return false;
    }
    this.completedQuests.add(crc);
    this.activeQuests.delete(crc);
    this.incrementPlayListUpdateCounter('completedQuests');
    this.deltaTrackerPlay6.trackListAdd(
      PlayProperty.COMPLETED_QUESTS,
      this.completedQuests.size - 1,
      crc
    );
    this.markModified();
    return true;
  }

  /**
   * Check if quest is completed
   */
  hasCompletedQuest(crc: CrcValue): boolean {
    return this.completedQuests.has(crc);
  }

  /**
   * Accept a quest
   */
  acceptQuest(crc: CrcValue): boolean {
    if (this.activeQuests.has(crc) || this.completedQuests.has(crc)) {
      return false;
    }
    const questState: QuestState = {
      questCrc: crc,
      active: true,
      stage: 0,
      acceptedAt: Date.now(),
      counters: new Map(),
    };
    this.activeQuests.set(crc, questState);
    this.incrementPlayListUpdateCounter('activeQuests');
    this.deltaTrackerPlay6.trackMapChange(PlayProperty.ACTIVE_QUESTS, crc, questState, true);
    this.markModified();
    return true;
  }

  /**
   * Abandon a quest
   */
  abandonQuest(crc: CrcValue): boolean {
    if (!this.activeQuests.has(crc)) {
      return false;
    }
    this.activeQuests.delete(crc);
    this.incrementPlayListUpdateCounter('activeQuests');
    this.deltaTrackerPlay6.trackMapRemove(PlayProperty.ACTIVE_QUESTS, crc);
    this.markModified();
    return true;
  }

  /**
   * Update quest progress
   */
  updateQuestProgress(crc: CrcValue, stage: number): boolean {
    const quest = this.activeQuests.get(crc);
    if (!quest) {
      return false;
    }
    quest.stage = stage;
    this.incrementPlayListUpdateCounter('activeQuests');
    this.deltaTrackerPlay6.trackMapChange(PlayProperty.ACTIVE_QUESTS, crc, quest, false);
    this.markModified();
    return true;
  }

  // ============================================
  // Waypoint Management
  // ============================================

  /**
   * Add a waypoint
   */
  addWaypoint(waypoint: Waypoint): void {
    const isNew = !this.waypoints.has(waypoint.objectId);
    this.waypoints.set(waypoint.objectId, waypoint);
    if (waypoint.active && this.activeWaypoint !== waypoint.objectId) {
      this.activeWaypoint = waypoint.objectId;
    }
    this.incrementPlayListUpdateCounter('waypoints');
    this.deltaTrackerPlay6.trackMapChange(PlayProperty.WAYPOINTS, waypoint.objectId, waypoint, isNew);
    this.markModified();
  }

  /**
   * Remove a waypoint
   */
  removeWaypoint(waypointId: ObjectId): boolean {
    if (!this.waypoints.has(waypointId)) {
      return false;
    }
    this.waypoints.delete(waypointId);
    if (this.activeWaypoint === waypointId) {
      this.activeWaypoint = null;
    }
    this.incrementPlayListUpdateCounter('waypoints');
    this.deltaTrackerPlay6.trackMapRemove(PlayProperty.WAYPOINTS, waypointId);
    this.markModified();
    return true;
  }

  /**
   * Set the active waypoint
   */
  setActiveWaypoint(waypointId: ObjectId | null): boolean {
    if (waypointId !== null && !this.waypoints.has(waypointId)) {
      return false;
    }
    // Deactivate old waypoint
    if (this.activeWaypoint !== null) {
      const oldWaypoint = this.waypoints.get(this.activeWaypoint);
      if (oldWaypoint) {
        oldWaypoint.active = false;
      }
    }
    // Activate new waypoint
    this.activeWaypoint = waypointId;
    if (waypointId !== null) {
      const newWaypoint = this.waypoints.get(waypointId);
      if (newWaypoint) {
        newWaypoint.active = true;
        this.deltaTrackerPlay6.trackMapChange(PlayProperty.WAYPOINTS, waypointId, newWaypoint, false);
      }
    }
    this.markModified();
    return true;
  }

  /**
   * Get a waypoint by ID
   */
  getWaypoint(waypointId: ObjectId): Waypoint | undefined {
    return this.waypoints.get(waypointId);
  }

  // ============================================
  // Friends & Ignore Management
  // ============================================

  /**
   * Add a friend
   * @param name - Character name to add
   * @returns true if added, false if already in list
   */
  addFriend(name: string): boolean {
    const normalizedName = name.toLowerCase();
    if (this.friends.has(normalizedName)) {
      return false;
    }
    this.friends.add(normalizedName);
    this.incrementPlayListUpdateCounter('friends');
    this.deltaTrackerPlay9.trackListAdd(PlayProperty.FRIENDS, this.friends.size - 1, normalizedName);
    this.markModified();
    return true;
  }

  /**
   * Remove a friend
   * @param name - Character name to remove
   * @returns true if removed, false if not in list
   */
  removeFriend(name: string): boolean {
    const normalizedName = name.toLowerCase();
    if (!this.friends.has(normalizedName)) {
      return false;
    }
    this.friends.delete(normalizedName);
    this.incrementPlayListUpdateCounter('friends');
    this.deltaTrackerPlay9.trackListRemove(PlayProperty.FRIENDS, 0, normalizedName);
    this.markModified();
    return true;
  }

  /**
   * Check if a character is a friend
   */
  isFriend(name: string): boolean {
    return this.friends.has(name.toLowerCase());
  }

  /**
   * Add to ignore list
   * @param name - Character name to ignore
   * @returns true if added, false if already in list
   */
  addIgnore(name: string): boolean {
    const normalizedName = name.toLowerCase();
    if (this.ignore.has(normalizedName)) {
      return false;
    }
    this.ignore.add(normalizedName);
    this.incrementPlayListUpdateCounter('ignore');
    this.deltaTrackerPlay9.trackListAdd(PlayProperty.IGNORE, this.ignore.size - 1, normalizedName);
    this.markModified();
    return true;
  }

  /**
   * Remove from ignore list
   * @param name - Character name to unignore
   * @returns true if removed, false if not in list
   */
  removeIgnore(name: string): boolean {
    const normalizedName = name.toLowerCase();
    if (!this.ignore.has(normalizedName)) {
      return false;
    }
    this.ignore.delete(normalizedName);
    this.incrementPlayListUpdateCounter('ignore');
    this.deltaTrackerPlay9.trackListRemove(PlayProperty.IGNORE, 0, normalizedName);
    this.markModified();
    return true;
  }

  /**
   * Check if a character is ignored
   */
  isIgnored(name: string): boolean {
    return this.ignore.has(name.toLowerCase());
  }

  // ============================================
  // Faction Standing
  // ============================================

  /**
   * Set faction standing
   */
  setFactionStanding(faction: string, standing: number): void {
    const isNew = !this.factionStanding.has(faction);
    this.factionStanding.set(faction, standing);
    this.markModified();
  }

  /**
   * Get faction standing
   */
  getFactionStanding(faction: string): number {
    return this.factionStanding.get(faction) ?? 0;
  }

  /**
   * Modify faction standing
   */
  modifyFactionStanding(faction: string, delta: number): number {
    const current = this.getFactionStanding(faction);
    const newStanding = current + delta;
    this.setFactionStanding(faction, newStanding);
    return newStanding;
  }

  /**
   * Set PvP type
   */
  setPvpType(type: PvpTypeValue): void {
    if (this.pvpType !== type) {
      this.pvpType = type;
      this.markModified();
    }
  }

  /**
   * Add GCW points
   */
  addGcwPoints(points: number): void {
    this.gcwPoints += points;
    this.lifetimeGcwPoints += points;
    this.deltaTrackerPlay8.trackChange(PlayProperty.GCW_POINTS, DeltaType.Change);
    this.deltaTrackerPlay8.trackChange(PlayProperty.LIFETIME_GCW_POINTS, DeltaType.Change);
    this.markModified();
  }

  // ============================================
  // Played Time
  // ============================================

  /**
   * Update played time based on current session
   * @returns Total played time in seconds
   */
  updatePlayedTime(): number {
    const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    this.playedTime += sessionTime;
    this.sessionStartTime = Date.now();
    this.deltaTrackerPlay9.trackChange(PlayProperty.PLAYED_TIME, DeltaType.Change);
    this.markModified();
    return this.playedTime;
  }

  /**
   * Get total played time including current session
   */
  getTotalPlayedTime(): number {
    const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    return this.playedTime + sessionTime;
  }

  /**
   * Start a new session (call on login)
   */
  startSession(): void {
    this.sessionStartTime = Date.now();
  }

  /**
   * End the current session (call on logout)
   */
  endSession(): void {
    this.updatePlayedTime();
    this.lastLogout = Date.now();
  }

  // ============================================
  // Title Management
  // ============================================

  /**
   * Set the displayed title
   * @param title - Title to display (empty string to clear)
   */
  setTitle(title: string): void {
    if (this.title !== title) {
      this.title = title;
      this.deltaTrackerPlay3.trackChange(PlayProperty.CURRENT_TITLE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the profession title
   */
  setProfessionTitle(title: string): void {
    if (this.professionTitle !== title) {
      this.professionTitle = title;
      this.deltaTrackerPlay9.trackChange(PlayProperty.PROFESSION_TITLE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set biography
   */
  setBiography(bio: string): void {
    if (this.biography !== bio) {
      this.biography = bio;
      this.deltaTrackerPlay3.trackChange(PlayProperty.BIOGRAPHY, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Flag Management
  // ============================================

  /**
   * Set a player flag
   * @param flag - Flag to set
   */
  setFlag(flag: PlayerFlagsType): void {
    if ((this.playerFlags & flag) === 0n) {
      this.playerFlags |= flag;
      this.deltaTrackerPlay3.trackChange(PlayProperty.PLAYER_FLAGS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Clear a player flag
   * @param flag - Flag to clear
   */
  clearFlag(flag: PlayerFlagsType): void {
    if ((this.playerFlags & flag) !== 0n) {
      this.playerFlags &= ~flag;
      this.deltaTrackerPlay3.trackChange(PlayProperty.PLAYER_FLAGS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a player flag is set
   * @param flag - Flag to check
   */
  hasFlag(flag: PlayerFlagsType): boolean {
    return (this.playerFlags & flag) !== 0n;
  }

  /**
   * Toggle a player flag
   * @param flag - Flag to toggle
   */
  toggleFlag(flag: PlayerFlagsType): void {
    this.playerFlags ^= flag;
    this.deltaTrackerPlay3.trackChange(PlayProperty.PLAYER_FLAGS, DeltaType.Change);
    this.markModified();
  }

  /**
   * Check if player is LFG
   */
  isLfg(): boolean {
    return this.hasFlag(PlayerFlags.LFG);
  }

  /**
   * Check if player is AFK
   */
  isAfk(): boolean {
    return this.hasFlag(PlayerFlags.AFK);
  }

  /**
   * Check if player is anonymous
   */
  isAnonymous(): boolean {
    return this.hasFlag(PlayerFlags.ANONYMOUS);
  }

  /**
   * Check if player is link dead
   */
  isLinkDead(): boolean {
    return this.hasFlag(PlayerFlags.LINK_DEAD);
  }

  // ============================================
  // Food & Drink
  // ============================================

  /**
   * Apply food buff fill
   * @param amount - Amount to add
   * @returns Amount actually added (capped at max)
   */
  addFoodFill(amount: number): number {
    const available = this.foodFillMax - this.foodFillCurrent;
    const added = Math.min(amount, available);
    if (added > 0) {
      this.foodFillCurrent += added;
      this.deltaTrackerPlay8.trackChange(PlayProperty.FOOD_FILL_CURRENT, DeltaType.Change);
      this.markModified();
    }
    return added;
  }

  /**
   * Consume food fill (when buff expires or is used)
   */
  consumeFoodFill(amount: number): void {
    this.foodFillCurrent = Math.max(0, this.foodFillCurrent - amount);
    this.deltaTrackerPlay8.trackChange(PlayProperty.FOOD_FILL_CURRENT, DeltaType.Change);
    this.markModified();
  }

  /**
   * Apply drink buff fill
   * @param amount - Amount to add
   * @returns Amount actually added (capped at max)
   */
  addDrinkFill(amount: number): number {
    const available = this.drinkFillMax - this.drinkFillCurrent;
    const added = Math.min(amount, available);
    if (added > 0) {
      this.drinkFillCurrent += added;
      this.deltaTrackerPlay8.trackChange(PlayProperty.DRINK_FILL_CURRENT, DeltaType.Change);
      this.markModified();
    }
    return added;
  }

  /**
   * Consume drink fill
   */
  consumeDrinkFill(amount: number): void {
    this.drinkFillCurrent = Math.max(0, this.drinkFillCurrent - amount);
    this.deltaTrackerPlay8.trackChange(PlayProperty.DRINK_FILL_CURRENT, DeltaType.Change);
    this.markModified();
  }

  // ============================================
  // Admin
  // ============================================

  /**
   * Set admin level
   */
  setAdminLevel(level: AdminLevelType): void {
    if (this.adminLevel !== level) {
      this.adminLevel = level;
      this.deltaTrackerPlay6.trackChange(PlayProperty.ADMIN_LEVEL, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if player is an admin (any level above player)
   */
  isAdmin(): boolean {
    return this.adminLevel > AdminLevel.PLAYER;
  }

  // ============================================
  // Delta Tracking
  // ============================================

  /**
   * Increment update counter for a list property
   */
  private incrementPlayListUpdateCounter(listName: string): void {
    const current = this.playListUpdateCounters.get(listName) ?? 0;
    this.playListUpdateCounters.set(listName, current + 1);
  }

  /**
   * Get update counter for a list property
   */
  getPlayListUpdateCounter(listName: string): number {
    return this.playListUpdateCounters.get(listName) ?? 0;
  }

  /**
   * Check if PLAY3 has changes
   */
  hasPlay3Changes(): boolean {
    return this.deltaTrackerPlay3.hasChanges();
  }

  /**
   * Check if PLAY6 has changes
   */
  hasPlay6Changes(): boolean {
    return this.deltaTrackerPlay6.hasChanges();
  }

  /**
   * Check if PLAY8 has changes
   */
  hasPlay8Changes(): boolean {
    return this.deltaTrackerPlay8.hasChanges();
  }

  /**
   * Check if PLAY9 has changes
   */
  hasPlay9Changes(): boolean {
    return this.deltaTrackerPlay9.hasChanges();
  }

  /**
   * Get PLAY3 delta tracker
   */
  getPlay3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerPlay3;
  }

  /**
   * Get PLAY6 delta tracker
   */
  getPlay6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerPlay6;
  }

  /**
   * Get PLAY8 delta tracker
   */
  getPlay8DeltaTracker(): DeltaTracker {
    return this.deltaTrackerPlay8;
  }

  /**
   * Get PLAY9 delta tracker
   */
  getPlay9DeltaTracker(): DeltaTracker {
    return this.deltaTrackerPlay9;
  }

  /**
   * Clear all delta trackers
   */
  override clearAllDeltas(): void {
    super.clearAllDeltas();
    this.deltaTrackerPlay3.clear();
    this.deltaTrackerPlay6.clear();
    this.deltaTrackerPlay8.clear();
    this.deltaTrackerPlay9.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      accountId: this.accountId.toString(),
      stationId: this.stationId,
      birthDate: this.birthDate,
      playedTime: this.playedTime,
      lastLogout: this.lastLogout,
      biography: this.biography,
      title: this.title,
      professionTitle: this.professionTitle,
      waypoints: Array.from(this.waypoints.entries()).map(([id, wp]) => ({
        ...wp,
        objectId: id.toString(),
      })),
      activeWaypoint: this.activeWaypoint?.toString() ?? null,
      experience: Object.fromEntries(this.experience),
      schematicsGranted: Array.from(this.schematicsGranted),
      completedQuests: Array.from(this.completedQuests),
      activeQuests: Array.from(this.activeQuests.entries()).map(([crc, state]) => ({
        ...state,
        counters: Object.fromEntries(state.counters),
      })),
      friends: Array.from(this.friends),
      ignore: Array.from(this.ignore),
      factionStanding: Object.fromEntries(this.factionStanding),
      pvpType: this.pvpType,
      gcwPoints: this.gcwPoints,
      lifetimeGcwPoints: this.lifetimeGcwPoints,
      pvpKills: this.pvpKills,
      playerFlags: this.playerFlags.toString(),
      chatFlags: this.chatFlags,
      matchMakingFlags: this.matchMakingFlags,
      adminLevel: this.adminLevel,
      foodFillCurrent: this.foodFillCurrent,
      foodFillMax: this.foodFillMax,
      drinkFillCurrent: this.drinkFillCurrent,
      drinkFillMax: this.drinkFillMax,
      craftingStage: this.craftingStage,
      homeRegion: this.homeRegion,
    };
  }
}
