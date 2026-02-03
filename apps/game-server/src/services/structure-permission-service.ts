/**
 * Structure Permission Service
 * Handles access control for buildings and structures
 *
 * This service provides:
 * - Permission checks (enter, admin, vendor, hopper, storage)
 * - Permission management (grant, revoke)
 * - Ban management
 * - Public/private access control
 * - Cell-specific permissions for multi-room buildings
 */

import type { ObjectId } from '@swg/shared-types';
import {
  BuildingObject,
  BuildingPermission,
  CellObject,
  type PermissionEntry,
  createPermissionSet,
} from '@swg/objects';
import {
  validatePermissionGrant,
  validatePermissionRevoke,
  validateBan,
  validateUnban,
  validateSetPublic,
  canTransferOwnership,
  getRequiredPrivilegeLevel,
  hasPrivilegeLevel,
  PrivilegeLevel,
  type PermissionValidationResult,
  PermissionErrorCode,
} from './permission-validator.js';

/**
 * Result of a permission operation
 */
export interface PermissionOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Error code if failed */
  errorCode?: PermissionErrorCode;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Effective permissions for a player on a structure
 */
export interface EffectivePermissions {
  /** Can enter the structure */
  canEnter: boolean;
  /** Has admin privileges */
  isAdmin: boolean;
  /** Is the owner */
  isOwner: boolean;
  /** Can use vendor terminals */
  canUseVendor: boolean;
  /** Can access hoppers */
  canAccessHopper: boolean;
  /** Can access storage */
  canAccessStorage: boolean;
  /** Is banned */
  isBanned: boolean;
  /** Raw permission set if on permission list */
  permissions?: Set<BuildingPermission>;
}

/**
 * Permission list entry for external use
 */
export interface PermissionListEntry {
  characterId: ObjectId;
  characterName: string;
  permissions: BuildingPermission[];
  isAdmin: boolean;
}

/**
 * Cell permission entry
 */
export interface CellPermissionEntry {
  playerId: ObjectId;
  canAccess: boolean;
}

/**
 * Permission change event
 */
export interface PermissionChangeEvent {
  structureId: ObjectId;
  actorId: ObjectId;
  targetId?: ObjectId;
  action: 'grant' | 'revoke' | 'ban' | 'unban' | 'setPublic' | 'clearAll';
  permission?: BuildingPermission;
  isPublic?: boolean;
  timestamp: number;
}

/**
 * Permission change callback
 */
export type PermissionChangeCallback = (event: PermissionChangeEvent) => void;

/**
 * Structure Permission Service Options
 */
export interface StructurePermissionServiceOptions {
  /** Callback for permission changes (for broadcasting) */
  onPermissionChange?: PermissionChangeCallback;
}

/**
 * Structure Permission Service
 * Central service for managing building access control
 */
export class StructurePermissionService {
  /** Registered structures by ID */
  private readonly structures: Map<ObjectId, BuildingObject>;

  /** Registered cells by building ID */
  private readonly cellsByBuilding: Map<ObjectId, Map<number, CellObject>>;

  /** Permission change callbacks */
  private readonly changeCallbacks: Set<PermissionChangeCallback>;

  constructor(options: StructurePermissionServiceOptions = {}) {
    this.structures = new Map();
    this.cellsByBuilding = new Map();
    this.changeCallbacks = new Set();

    if (options.onPermissionChange) {
      this.changeCallbacks.add(options.onPermissionChange);
    }
  }

  // ============================================
  // Structure Registration
  // ============================================

  /**
   * Register a structure with the service
   */
  registerStructure(structure: BuildingObject): void {
    this.structures.set(structure.objectId, structure);
  }

  /**
   * Unregister a structure
   */
  unregisterStructure(structureId: ObjectId): void {
    this.structures.delete(structureId);
    this.cellsByBuilding.delete(structureId);
  }

  /**
   * Get a registered structure
   */
  getStructure(structureId: ObjectId): BuildingObject | undefined {
    return this.structures.get(structureId);
  }

  /**
   * Register a cell for a building
   */
  registerCell(buildingId: ObjectId, cell: CellObject): void {
    let cells = this.cellsByBuilding.get(buildingId);
    if (!cells) {
      cells = new Map();
      this.cellsByBuilding.set(buildingId, cells);
    }
    cells.set(cell.cellIndex, cell);
  }

  /**
   * Get a cell by building and index
   */
  getCell(buildingId: ObjectId, cellIndex: number): CellObject | undefined {
    return this.cellsByBuilding.get(buildingId)?.get(cellIndex);
  }

  // ============================================
  // Permission Checks
  // ============================================

  /**
   * Check if a player can enter a structure
   */
  canEnter(structureId: ObjectId, playerId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }
    return structure.canEnter(playerId);
  }

  /**
   * Check if a player has admin privileges
   */
  canAdmin(structureId: ObjectId, playerId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }
    return structure.isAdmin(playerId);
  }

  /**
   * Check if a player can use vendor terminals
   */
  canUseVendor(structureId: ObjectId, playerId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }

    // Owner and admin always have vendor access
    if (structure.isOwner(playerId) || structure.isAdmin(playerId)) {
      return true;
    }

    // Check specific vendor permission
    return structure.hasPermission(playerId, BuildingPermission.Vendor);
  }

  /**
   * Check if a player can access hoppers
   */
  canAccessHopper(structureId: ObjectId, playerId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }

    // Owner and admin always have hopper access
    if (structure.isOwner(playerId) || structure.isAdmin(playerId)) {
      return true;
    }

    // Check specific hopper permission
    return structure.hasPermission(playerId, BuildingPermission.Hopper);
  }

  /**
   * Check if a player can access storage
   */
  canAccessStorage(structureId: ObjectId, playerId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }

    // Owner and admin always have storage access
    if (structure.isOwner(playerId) || structure.isAdmin(playerId)) {
      return true;
    }

    // Check specific storage permission
    return structure.hasPermission(playerId, BuildingPermission.Storage);
  }

  /**
   * Check if a player has a specific permission
   */
  hasPermission(
    structureId: ObjectId,
    playerId: ObjectId,
    permission: BuildingPermission
  ): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }
    return structure.hasPermission(playerId, permission);
  }

  /**
   * Get all effective permissions for a player on a structure
   */
  getEffectivePermissions(structureId: ObjectId, playerId: ObjectId): EffectivePermissions {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        canEnter: false,
        isAdmin: false,
        isOwner: false,
        canUseVendor: false,
        canAccessHopper: false,
        canAccessStorage: false,
        isBanned: false,
      };
    }

    const isOwner = structure.isOwner(playerId);
    const isAdmin = structure.isAdmin(playerId);
    const isBanned = structure.banList.has(playerId);
    const permissionEntry = structure.permissionList.get(playerId);

    return {
      canEnter: !isBanned && (isOwner || isAdmin || structure.isPublic ||
        (permissionEntry?.permissions.has(BuildingPermission.Enter) ?? false)),
      isAdmin,
      isOwner,
      canUseVendor: isOwner || isAdmin ||
        (permissionEntry?.permissions.has(BuildingPermission.Vendor) ?? false),
      canAccessHopper: isOwner || isAdmin ||
        (permissionEntry?.permissions.has(BuildingPermission.Hopper) ?? false),
      canAccessStorage: isOwner || isAdmin ||
        (permissionEntry?.permissions.has(BuildingPermission.Storage) ?? false),
      isBanned,
      permissions: permissionEntry?.permissions,
    };
  }

  // ============================================
  // Permission Management
  // ============================================

  /**
   * Grant a permission to a player
   */
  grantPermission(
    structureId: ObjectId,
    targetId: ObjectId,
    permission: BuildingPermission,
    actorId: ObjectId,
    targetName: string = 'Unknown'
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Validate the operation
    const validation = validatePermissionGrant(structure, actorId, targetId, permission);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errorMessage ?? 'Validation failed',
        errorCode: validation.errorCode,
      };
    }

    // Perform the grant
    const result = structure.grantPermission(
      targetId,
      targetName,
      createPermissionSet(permission),
      actorId
    );

    if (result.success) {
      this.emitPermissionChange({
        structureId,
        actorId,
        targetId,
        action: 'grant',
        permission,
        timestamp: Date.now(),
      });
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Revoke a permission from a player
   */
  revokePermission(
    structureId: ObjectId,
    targetId: ObjectId,
    permission: BuildingPermission,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Validate the operation
    const validation = validatePermissionRevoke(structure, actorId, targetId, permission);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errorMessage ?? 'Validation failed',
        errorCode: validation.errorCode,
      };
    }

    // Get the permission entry and remove the specific permission
    const entry = structure.permissionList.get(targetId);
    if (entry) {
      entry.permissions.delete(permission);

      // If no permissions left, remove the entry entirely
      if (entry.permissions.size === 0) {
        structure.permissionList.delete(targetId);
      }

      structure.markModified();

      this.emitPermissionChange({
        structureId,
        actorId,
        targetId,
        action: 'revoke',
        permission,
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: `Permission revoked`,
      };
    }

    return {
      success: false,
      message: 'Permission entry not found',
      errorCode: PermissionErrorCode.TargetNotFound,
    };
  }

  /**
   * Grant all permissions to a player
   */
  grantAllPermissions(
    structureId: ObjectId,
    targetId: ObjectId,
    actorId: ObjectId,
    targetName: string = 'Unknown'
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Only owner can grant all permissions (includes Admin)
    if (!structure.isOwner(actorId)) {
      return {
        success: false,
        message: 'Only the owner can grant all permissions',
        errorCode: PermissionErrorCode.InsufficientPrivilege,
      };
    }

    // Cannot modify owner
    if (structure.isOwner(targetId)) {
      return {
        success: false,
        message: 'Cannot modify owner permissions',
        errorCode: PermissionErrorCode.CannotModifyOwner,
      };
    }

    const allPermissions = createPermissionSet(
      BuildingPermission.Enter,
      BuildingPermission.Admin,
      BuildingPermission.Vendor,
      BuildingPermission.Hopper,
      BuildingPermission.Storage
    );

    const result = structure.grantPermission(targetId, targetName, allPermissions, actorId);

    if (result.success) {
      this.emitPermissionChange({
        structureId,
        actorId,
        targetId,
        action: 'grant',
        timestamp: Date.now(),
      });
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Revoke all permissions from a player
   */
  revokeAllPermissions(
    structureId: ObjectId,
    targetId: ObjectId,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Validate the operation
    const validation = validatePermissionRevoke(structure, actorId, targetId);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errorMessage ?? 'Validation failed',
        errorCode: validation.errorCode,
      };
    }

    const result = structure.revokePermission(targetId, actorId);

    if (result.success) {
      this.emitPermissionChange({
        structureId,
        actorId,
        targetId,
        action: 'revoke',
        timestamp: Date.now(),
      });
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Get the full permission list for a structure
   */
  getPermissionList(structureId: ObjectId): PermissionListEntry[] {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return [];
    }

    const entries: PermissionListEntry[] = [];
    for (const [characterId, entry] of structure.permissionList) {
      entries.push({
        characterId,
        characterName: entry.characterName,
        permissions: Array.from(entry.permissions),
        isAdmin: entry.permissions.has(BuildingPermission.Admin),
      });
    }

    return entries;
  }

  /**
   * Clear all permissions from a structure
   */
  clearPermissionList(
    structureId: ObjectId,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Only owner can clear all permissions
    if (!structure.isOwner(actorId)) {
      return {
        success: false,
        message: 'Only the owner can clear the permission list',
        errorCode: PermissionErrorCode.InsufficientPrivilege,
      };
    }

    const count = structure.permissionList.size;
    structure.permissionList.clear();
    structure.markModified();

    this.emitPermissionChange({
      structureId,
      actorId,
      action: 'clearAll',
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `Cleared ${count} entries from permission list`,
      data: { clearedCount: count },
    };
  }

  // ============================================
  // Ban Management
  // ============================================

  /**
   * Ban a player from a structure
   */
  banFromStructure(
    structureId: ObjectId,
    targetId: ObjectId,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Validate the operation
    const validation = validateBan(structure, actorId, targetId);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errorMessage ?? 'Validation failed',
        errorCode: validation.errorCode,
      };
    }

    const result = structure.ban(targetId, actorId);

    if (result.success) {
      this.emitPermissionChange({
        structureId,
        actorId,
        targetId,
        action: 'ban',
        timestamp: Date.now(),
      });
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Unban a player from a structure
   */
  unbanFromStructure(
    structureId: ObjectId,
    targetId: ObjectId,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Validate the operation
    const validation = validateUnban(structure, actorId, targetId);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errorMessage ?? 'Validation failed',
        errorCode: validation.errorCode,
      };
    }

    const result = structure.unban(targetId);

    if (result.success) {
      this.emitPermissionChange({
        structureId,
        actorId,
        targetId,
        action: 'unban',
        timestamp: Date.now(),
      });
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Get the ban list for a structure
   */
  getBanList(structureId: ObjectId): ObjectId[] {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return [];
    }
    return Array.from(structure.banList);
  }

  /**
   * Check if a player is banned from a structure
   */
  isBanned(structureId: ObjectId, playerId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }
    return structure.banList.has(playerId);
  }

  // ============================================
  // Public/Private Access
  // ============================================

  /**
   * Set the public access status of a structure
   */
  setPublic(
    structureId: ObjectId,
    isPublic: boolean,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Validate the operation
    const validation = validateSetPublic(structure, actorId, isPublic);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errorMessage ?? 'Validation failed',
        errorCode: validation.errorCode,
      };
    }

    const result = structure.setPublic(isPublic, actorId);

    if (result.success) {
      this.emitPermissionChange({
        structureId,
        actorId,
        action: 'setPublic',
        isPublic,
        timestamp: Date.now(),
      });
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Check if a structure is public
   */
  isPublic(structureId: ObjectId): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }
    return structure.isPublic;
  }

  // ============================================
  // Cell-Specific Permissions
  // ============================================

  /**
   * Set cell access permission for a player
   */
  setCellAccess(
    structureId: ObjectId,
    cellIndex: number,
    playerId: ObjectId,
    canAccess: boolean,
    actorId: ObjectId
  ): PermissionOperationResult {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    // Only owner or admin can modify cell permissions
    if (!structure.isOwner(actorId) && !structure.isAdmin(actorId)) {
      return {
        success: false,
        message: 'You do not have permission to modify cell access',
        errorCode: PermissionErrorCode.InsufficientPrivilege,
      };
    }

    const cell = this.getCell(structureId, cellIndex);
    if (!cell) {
      return {
        success: false,
        message: `Cell ${cellIndex} not found`,
        errorCode: PermissionErrorCode.InvalidStructure,
      };
    }

    if (canAccess) {
      cell.addPermissionOverride(playerId);
    } else {
      cell.removePermissionOverride(playerId);
    }

    return {
      success: true,
      message: canAccess ? 'Cell access granted' : 'Cell access revoked',
      data: { cellIndex, playerId: playerId.toString(), canAccess },
    };
  }

  /**
   * Check if a player can enter a specific cell
   */
  canEnterCell(
    structureId: ObjectId,
    cellIndex: number,
    playerId: ObjectId
  ): boolean {
    const structure = this.structures.get(structureId);
    if (!structure) {
      return false;
    }

    // Owner and admin can always enter any cell
    if (structure.isOwner(playerId) || structure.isAdmin(playerId)) {
      return true;
    }

    // Check if player can enter the structure at all
    if (!structure.canEnter(playerId)) {
      return false;
    }

    const cell = this.getCell(structureId, cellIndex);
    if (!cell) {
      // If cell doesn't exist, fall back to structure permission
      return true;
    }

    // Check cell-specific permissions
    return cell.canEnter(playerId);
  }

  /**
   * Get all cell permissions for a specific cell
   */
  getCellPermissions(
    structureId: ObjectId,
    cellIndex: number
  ): CellPermissionEntry[] {
    const cell = this.getCell(structureId, cellIndex);
    if (!cell || !cell.permissionOverride) {
      return [];
    }

    return Array.from(cell.permissionOverride).map(playerId => ({
      playerId,
      canAccess: true,
    }));
  }

  // ============================================
  // Event Callbacks
  // ============================================

  /**
   * Register a permission change callback
   */
  onPermissionChange(callback: PermissionChangeCallback): void {
    this.changeCallbacks.add(callback);
  }

  /**
   * Unregister a permission change callback
   */
  offPermissionChange(callback: PermissionChangeCallback): void {
    this.changeCallbacks.delete(callback);
  }

  /**
   * Emit a permission change event
   */
  private emitPermissionChange(event: PermissionChangeEvent): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[StructurePermissionService] Error in permission change callback:', error);
      }
    }
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get service statistics
   */
  getStats(): {
    registeredStructures: number;
    registeredCells: number;
    callbackCount: number;
  } {
    let cellCount = 0;
    for (const cells of this.cellsByBuilding.values()) {
      cellCount += cells.size;
    }

    return {
      registeredStructures: this.structures.size,
      registeredCells: cellCount,
      callbackCount: this.changeCallbacks.size,
    };
  }
}

/**
 * Create a new StructurePermissionService instance
 */
export function createStructurePermissionService(
  options?: StructurePermissionServiceOptions
): StructurePermissionService {
  return new StructurePermissionService(options);
}

/**
 * Singleton instance for global access
 */
let globalPermissionService: StructurePermissionService | null = null;

/**
 * Get or create the global permission service instance
 */
export function getStructurePermissionService(
  options?: StructurePermissionServiceOptions
): StructurePermissionService {
  if (!globalPermissionService) {
    globalPermissionService = new StructurePermissionService(options);
  }
  return globalPermissionService;
}
