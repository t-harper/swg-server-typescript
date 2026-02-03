/**
 * GroupObject - Player Group Management
 *
 * This is a logical object (not a SceneObject) that manages player groups and raids.
 * Groups allow players to:
 * - Share experience points
 * - Coordinate loot distribution
 * - Track member positions and status
 * - Form organized formations
 *
 * Groups are limited to 8 members, while raids support up to 20 members.
 */

import type { ObjectId } from '@swg/shared-types';
import {
  GroupMember,
  GroupLootRule,
  GroupPickupRule,
  GroupFormationType,
  MAX_GROUP_SIZE,
  MAX_RAID_SIZE,
} from './group-types.js';

/**
 * Group property indices for delta tracking
 */
export enum GrpoProperty {
  GroupId = 0,
  Leader = 1,
  LootMaster = 2,
  LootRule = 3,
  PickupRule = 4,
  LootThreshold = 5,
  Formation = 6,
  IsRaid = 7,
  Members = 8,
}

/**
 * Result of a group operation
 */
export interface GroupOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  errorMessage?: string;
  /** Additional data from the operation */
  data?: Record<string, unknown>;
}

/**
 * Member status update data
 */
export interface MemberStatusUpdate {
  /** Current health percentage (0-100) */
  healthPercent?: number;
  /** Current action percentage (0-100) */
  actionPercent?: number;
  /** Current mind percentage (0-100) */
  mindPercent?: number;
  /** Current position */
  position?: {
    x: number;
    y: number;
    z: number;
  };
  /** Current planet/zone ID */
  planetId?: string;
  /** Online status */
  isOnline?: boolean;
}

/**
 * GroupObject class
 *
 * Manages a player group or raid, including membership, loot rules,
 * and member status tracking. This is a logical object that does not
 * exist in the game world as a physical entity.
 *
 * @example
 * ```typescript
 * const group = new GroupObject(groupId);
 * group.addMember({
 *   characterId: playerId,
 *   characterName: 'PlayerName',
 *   profession: 'Bounty Hunter',
 *   level: 80,
 *   healthPercent: 100,
 *   actionPercent: 100,
 *   mindPercent: 100,
 *   position: { x: 0, y: 0, z: 0 },
 *   planetId: 'tatooine',
 *   isOnline: true,
 *   isLeader: true,
 *   isLootMaster: true,
 * });
 * ```
 */
export class GroupObject {
  /** Unique group identifier */
  private _groupId: bigint;

  /** Map of character IDs to group members */
  private _members: Map<ObjectId, GroupMember> = new Map();

  /** Current group leader */
  private _leader: ObjectId = 0n;

  /** Current loot master (for MasterLooter rule) */
  private _lootMaster: ObjectId = 0n;

  /** Current loot distribution rule */
  private _lootRule: GroupLootRule = GroupLootRule.FreeForAll;

  /** Current pickup rule */
  private _pickupRule: GroupPickupRule = GroupPickupRule.All;

  /** Credit threshold for pickup rule (when AboveThreshold is active) */
  private _lootThreshold: number = 0;

  /** Current formation type */
  private _formation: GroupFormationType = GroupFormationType.None;

  /** Whether this is a raid group (allows up to 20 members) */
  private _isRaid: boolean = false;

  /** Creation timestamp */
  private _createdAt: number = Date.now();

  /** Last update timestamp */
  private _updatedAt: number = Date.now();

  /**
   * Create a new GroupObject
   * @param groupId - Unique identifier for this group
   * @param isRaid - Whether this is a raid group (default: false)
   */
  constructor(groupId: bigint, isRaid: boolean = false) {
    this._groupId = groupId;
    this._isRaid = isRaid;
  }

  // ============================================
  // Getters
  // ============================================

  /** Get the group ID */
  get groupId(): bigint {
    return this._groupId;
  }

  /** Get the current members map */
  get members(): Map<ObjectId, GroupMember> {
    return this._members;
  }

  /** Get the leader's character ID */
  get leader(): ObjectId {
    return this._leader;
  }

  /** Get the loot master's character ID */
  get lootMaster(): ObjectId {
    return this._lootMaster;
  }

  /** Get the current loot rule */
  get lootRule(): GroupLootRule {
    return this._lootRule;
  }

  /** Get the current pickup rule */
  get pickupRule(): GroupPickupRule {
    return this._pickupRule;
  }

  /** Get the loot threshold */
  get lootThreshold(): number {
    return this._lootThreshold;
  }

  /** Get the current formation */
  get formation(): GroupFormationType {
    return this._formation;
  }

  /** Check if this is a raid group */
  get isRaid(): boolean {
    return this._isRaid;
  }

  /** Get the creation timestamp */
  get createdAt(): number {
    return this._createdAt;
  }

  /** Get the last update timestamp */
  get updatedAt(): number {
    return this._updatedAt;
  }

  // ============================================
  // Member Management
  // ============================================

  /**
   * Add a member to the group
   * @param member - The member to add
   * @returns Operation result with success status
   */
  addMember(member: GroupMember): GroupOperationResult {
    // Check if group is full
    if (this.isFull()) {
      return {
        success: false,
        errorMessage: `Group is full (max ${this.getMaxSize()} members)`,
      };
    }

    // Check if member is already in group
    if (this._members.has(member.characterId)) {
      return {
        success: false,
        errorMessage: 'Character is already a member of this group',
      };
    }

    // Add the member
    this._members.set(member.characterId, { ...member });

    // If this is the first member, make them leader and loot master
    if (this._members.size === 1) {
      this._leader = member.characterId;
      this._lootMaster = member.characterId;
      // Update the member's flags
      const addedMember = this._members.get(member.characterId)!;
      addedMember.isLeader = true;
      addedMember.isLootMaster = true;
    }

    this._updatedAt = Date.now();

    return {
      success: true,
      data: { memberId: member.characterId, memberCount: this._members.size },
    };
  }

  /**
   * Remove a member from the group
   * @param characterId - The character ID to remove
   * @returns Operation result with success status
   */
  removeMember(characterId: ObjectId): GroupOperationResult {
    const member = this._members.get(characterId);

    if (!member) {
      return {
        success: false,
        errorMessage: 'Character is not a member of this group',
      };
    }

    // Remove the member
    this._members.delete(characterId);
    this._updatedAt = Date.now();

    // If the removed member was the leader, assign a new leader
    if (this._leader === characterId && this._members.size > 0) {
      const newLeader = this._members.keys().next().value as ObjectId;
      this.setLeader(newLeader);
    }

    // If the removed member was the loot master, assign a new loot master
    if (this._lootMaster === characterId && this._members.size > 0) {
      this.setLootMaster(this._leader);
    }

    // Check if group should be disbanded
    const shouldDisband = this._members.size <= 1;

    return {
      success: true,
      data: {
        memberId: characterId,
        memberCount: this._members.size,
        shouldDisband,
      },
    };
  }

  /**
   * Set a new group leader
   * @param characterId - The character ID to make leader
   * @returns Operation result with success status
   */
  setLeader(characterId: ObjectId): GroupOperationResult {
    if (!this._members.has(characterId)) {
      return {
        success: false,
        errorMessage: 'Character is not a member of this group',
      };
    }

    // Update old leader's flag
    if (this._leader !== 0n) {
      const oldLeader = this._members.get(this._leader);
      if (oldLeader) {
        oldLeader.isLeader = false;
      }
    }

    // Set new leader
    this._leader = characterId;
    const newLeader = this._members.get(characterId)!;
    newLeader.isLeader = true;
    this._updatedAt = Date.now();

    return {
      success: true,
      data: { newLeader: characterId },
    };
  }

  /**
   * Set the loot master
   * @param characterId - The character ID to make loot master
   * @returns Operation result with success status
   */
  setLootMaster(characterId: ObjectId): GroupOperationResult {
    if (!this._members.has(characterId)) {
      return {
        success: false,
        errorMessage: 'Character is not a member of this group',
      };
    }

    // Update old loot master's flag
    if (this._lootMaster !== 0n) {
      const oldLootMaster = this._members.get(this._lootMaster);
      if (oldLootMaster) {
        oldLootMaster.isLootMaster = false;
      }
    }

    // Set new loot master
    this._lootMaster = characterId;
    const newLootMaster = this._members.get(characterId)!;
    newLootMaster.isLootMaster = true;
    this._updatedAt = Date.now();

    return {
      success: true,
      data: { newLootMaster: characterId },
    };
  }

  /**
   * Set the loot distribution rule
   * @param rule - The loot rule to set
   * @param threshold - Optional loot threshold (for AboveThreshold pickup rule)
   * @returns Operation result with success status
   */
  setLootRule(rule: GroupLootRule, threshold?: number): GroupOperationResult {
    this._lootRule = rule;

    if (threshold !== undefined) {
      this._lootThreshold = Math.max(0, threshold);
    }

    this._updatedAt = Date.now();

    return {
      success: true,
      data: { lootRule: rule, lootThreshold: this._lootThreshold },
    };
  }

  /**
   * Set the pickup rule
   * @param rule - The pickup rule to set
   * @param threshold - Optional credit threshold
   * @returns Operation result with success status
   */
  setPickupRule(rule: GroupPickupRule, threshold?: number): GroupOperationResult {
    this._pickupRule = rule;

    if (threshold !== undefined) {
      this._lootThreshold = Math.max(0, threshold);
    }

    this._updatedAt = Date.now();

    return {
      success: true,
      data: { pickupRule: rule, lootThreshold: this._lootThreshold },
    };
  }

  /**
   * Set the group formation
   * @param formation - The formation type to set
   * @returns Operation result with success status
   */
  setFormation(formation: GroupFormationType): GroupOperationResult {
    this._formation = formation;
    this._updatedAt = Date.now();

    return {
      success: true,
      data: { formation },
    };
  }

  /**
   * Update a member's status (health, position, etc.)
   * @param characterId - The character ID to update
   * @param status - The status updates to apply
   * @returns Operation result with success status
   */
  updateMemberStatus(
    characterId: ObjectId,
    status: MemberStatusUpdate
  ): GroupOperationResult {
    const member = this._members.get(characterId);

    if (!member) {
      return {
        success: false,
        errorMessage: 'Character is not a member of this group',
      };
    }

    // Apply updates
    if (status.healthPercent !== undefined) {
      member.healthPercent = Math.max(0, Math.min(100, status.healthPercent));
    }
    if (status.actionPercent !== undefined) {
      member.actionPercent = Math.max(0, Math.min(100, status.actionPercent));
    }
    if (status.mindPercent !== undefined) {
      member.mindPercent = Math.max(0, Math.min(100, status.mindPercent));
    }
    if (status.position !== undefined) {
      member.position = { ...status.position };
    }
    if (status.planetId !== undefined) {
      member.planetId = status.planetId;
    }
    if (status.isOnline !== undefined) {
      member.isOnline = status.isOnline;
    }

    this._updatedAt = Date.now();

    return {
      success: true,
      data: { memberId: characterId, updatedFields: Object.keys(status) },
    };
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get all members as an array
   * @returns Array of group members
   */
  getMemberList(): GroupMember[] {
    return Array.from(this._members.values());
  }

  /**
   * Get all member IDs
   * @returns Array of member character IDs
   */
  getMemberIds(): ObjectId[] {
    return Array.from(this._members.keys());
  }

  /**
   * Check if a character is the group leader
   * @param characterId - The character ID to check
   * @returns True if the character is the leader
   */
  isLeader(characterId: ObjectId): boolean {
    return this._leader === characterId;
  }

  /**
   * Check if a character is a member of the group
   * @param characterId - The character ID to check
   * @returns True if the character is a member
   */
  isMember(characterId: ObjectId): boolean {
    return this._members.has(characterId);
  }

  /**
   * Check if a character is the loot master
   * @param characterId - The character ID to check
   * @returns True if the character is the loot master
   */
  isLootMasterChar(characterId: ObjectId): boolean {
    return this._lootMaster === characterId;
  }

  /**
   * Get the current member count
   * @returns Number of members in the group
   */
  getSize(): number {
    return this._members.size;
  }

  /**
   * Get the maximum group size
   * @returns Maximum number of members allowed
   */
  getMaxSize(): number {
    return this._isRaid ? MAX_RAID_SIZE : MAX_GROUP_SIZE;
  }

  /**
   * Check if the group is at capacity
   * @returns True if the group is full
   */
  isFull(): boolean {
    return this._members.size >= this.getMaxSize();
  }

  /**
   * Check if the group is empty
   * @returns True if the group has no members
   */
  isEmpty(): boolean {
    return this._members.size === 0;
  }

  /**
   * Get a specific member by character ID
   * @param characterId - The character ID to look up
   * @returns The member or undefined if not found
   */
  getMember(characterId: ObjectId): GroupMember | undefined {
    return this._members.get(characterId);
  }

  /**
   * Get online members only
   * @returns Array of online group members
   */
  getOnlineMembers(): GroupMember[] {
    return this.getMemberList().filter((m) => m.isOnline);
  }

  /**
   * Get members on a specific planet
   * @param planetId - The planet/zone ID to filter by
   * @returns Array of members on that planet
   */
  getMembersOnPlanet(planetId: string): GroupMember[] {
    return this.getMemberList().filter((m) => m.planetId === planetId);
  }

  // ============================================
  // Group Management
  // ============================================

  /**
   * Convert a standard group to a raid
   * @returns Operation result with success status
   */
  convertToRaid(): GroupOperationResult {
    if (this._isRaid) {
      return {
        success: false,
        errorMessage: 'Group is already a raid',
      };
    }

    this._isRaid = true;
    this._updatedAt = Date.now();

    return {
      success: true,
      data: { isRaid: true, maxSize: MAX_RAID_SIZE },
    };
  }

  /**
   * Convert a raid back to a standard group (if size permits)
   * @returns Operation result with success status
   */
  convertToGroup(): GroupOperationResult {
    if (!this._isRaid) {
      return {
        success: false,
        errorMessage: 'Group is not a raid',
      };
    }

    if (this._members.size > MAX_GROUP_SIZE) {
      return {
        success: false,
        errorMessage: `Cannot convert to group: too many members (${this._members.size} > ${MAX_GROUP_SIZE})`,
      };
    }

    this._isRaid = false;
    this._updatedAt = Date.now();

    return {
      success: true,
      data: { isRaid: false, maxSize: MAX_GROUP_SIZE },
    };
  }

  /**
   * Disband the group, removing all members
   * @returns Operation result with the list of removed members
   */
  disband(): GroupOperationResult {
    const memberIds = this.getMemberIds();

    this._members.clear();
    this._leader = 0n;
    this._lootMaster = 0n;
    this._updatedAt = Date.now();

    return {
      success: true,
      data: { disbandedMembers: memberIds },
    };
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize the group to a plain object for storage/transmission
   * @returns Plain object representation of the group
   */
  toJSON(): Record<string, unknown> {
    return {
      groupId: this._groupId.toString(),
      members: this.getMemberList().map((m) => ({
        ...m,
        characterId: m.characterId.toString(),
      })),
      leader: this._leader.toString(),
      lootMaster: this._lootMaster.toString(),
      lootRule: this._lootRule,
      pickupRule: this._pickupRule,
      lootThreshold: this._lootThreshold,
      formation: this._formation,
      isRaid: this._isRaid,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Create a GroupObject from serialized data
   * @param data - The serialized group data
   * @returns A new GroupObject instance
   */
  static fromJSON(data: Record<string, unknown>): GroupObject {
    const group = new GroupObject(
      BigInt(data.groupId as string),
      data.isRaid as boolean
    );

    // Restore properties
    group._leader = BigInt(data.leader as string);
    group._lootMaster = BigInt(data.lootMaster as string);
    group._lootRule = data.lootRule as GroupLootRule;
    group._pickupRule = data.pickupRule as GroupPickupRule;
    group._lootThreshold = data.lootThreshold as number;
    group._formation = data.formation as GroupFormationType;
    group._createdAt = data.createdAt as number;
    group._updatedAt = data.updatedAt as number;

    // Restore members
    const members = data.members as Array<Record<string, unknown>>;
    for (const m of members) {
      const member: GroupMember = {
        characterId: BigInt(m.characterId as string),
        characterName: m.characterName as string,
        profession: m.profession as string,
        level: m.level as number,
        healthPercent: m.healthPercent as number,
        actionPercent: m.actionPercent as number,
        mindPercent: m.mindPercent as number,
        position: m.position as { x: number; y: number; z: number },
        planetId: m.planetId as string,
        isOnline: m.isOnline as boolean,
        isLeader: m.isLeader as boolean,
        isLootMaster: m.isLootMaster as boolean,
      };
      group._members.set(member.characterId, member);
    }

    return group;
  }
}
