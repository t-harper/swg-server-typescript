/**
 * Permission Validator
 * Validation helpers for structure permission operations
 *
 * Provides validation logic for:
 * - Permission grant/revoke operations
 * - Ban/unban operations
 * - Ownership transfer validation
 * - Privilege level requirements
 */

import type { ObjectId } from '@swg/shared-types';
import {
  BuildingObject,
  BuildingPermission,
  MAX_PERMISSION_LIST,
} from '@swg/objects';

/**
 * Result of a permission validation check
 */
export interface PermissionValidationResult {
  /** Whether the operation is valid */
  valid: boolean;
  /** Error message if invalid */
  errorMessage?: string;
  /** Error code for programmatic handling */
  errorCode?: PermissionErrorCode;
}

/**
 * Error codes for permission validation failures
 */
export enum PermissionErrorCode {
  /** No error - operation valid */
  None = 0,
  /** Actor lacks required privileges */
  InsufficientPrivilege = 1,
  /** Target is the structure owner (cannot modify) */
  CannotModifyOwner = 2,
  /** Permission list is at capacity */
  PermissionListFull = 3,
  /** Target not found in permission list */
  TargetNotFound = 4,
  /** Target is banned from structure */
  TargetBanned = 5,
  /** Cannot perform action on self */
  CannotTargetSelf = 6,
  /** Structure not found or invalid */
  InvalidStructure = 7,
  /** Target not eligible for ownership */
  NotEligibleForOwnership = 8,
  /** Permission already granted */
  AlreadyGranted = 9,
  /** Target is already banned */
  AlreadyBanned = 10,
  /** Target is not banned */
  NotBanned = 11,
}

/**
 * Privilege levels for permission operations
 */
export enum PrivilegeLevel {
  /** No privilege required (public access) */
  None = 0,
  /** Basic entry permission */
  Entry = 1,
  /** Admin privileges required */
  Admin = 2,
  /** Owner privileges required */
  Owner = 3,
}

/**
 * Create a successful validation result
 */
export function validResult(): PermissionValidationResult {
  return { valid: true };
}

/**
 * Create a failed validation result
 */
export function invalidResult(
  errorMessage: string,
  errorCode: PermissionErrorCode = PermissionErrorCode.None
): PermissionValidationResult {
  return { valid: false, errorMessage, errorCode };
}

/**
 * Validate a permission grant operation
 * @param structure - The building object
 * @param actorId - ID of the player granting permission
 * @param targetId - ID of the player receiving permission
 * @param permission - The permission being granted
 * @returns Validation result
 */
export function validatePermissionGrant(
  structure: BuildingObject,
  actorId: ObjectId,
  targetId: ObjectId,
  permission: BuildingPermission
): PermissionValidationResult {
  // Check if structure is valid
  if (!structure) {
    return invalidResult('Structure not found', PermissionErrorCode.InvalidStructure);
  }

  // Check actor's privilege level
  if (!structure.isOwner(actorId) && !structure.isAdmin(actorId)) {
    return invalidResult(
      'You do not have permission to modify the permission list',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  // Cannot modify owner permissions
  if (structure.isOwner(targetId)) {
    return invalidResult(
      'Cannot modify owner permissions',
      PermissionErrorCode.CannotModifyOwner
    );
  }

  // Check permission list capacity for new entries
  const existingEntry = structure.permissionList.get(targetId);
  if (!existingEntry && structure.permissionList.size >= MAX_PERMISSION_LIST) {
    return invalidResult(
      `Permission list is full (maximum ${MAX_PERMISSION_LIST} entries)`,
      PermissionErrorCode.PermissionListFull
    );
  }

  // Check if target is banned (cannot grant while banned)
  if (structure.banList.has(targetId)) {
    return invalidResult(
      'Cannot grant permissions to a banned player',
      PermissionErrorCode.TargetBanned
    );
  }

  // Non-owners cannot grant Admin permission
  if (permission === BuildingPermission.Admin && !structure.isOwner(actorId)) {
    return invalidResult(
      'Only the owner can grant admin permissions',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  // Check if permission is already granted
  if (existingEntry && existingEntry.permissions.has(permission)) {
    return invalidResult(
      'Permission already granted',
      PermissionErrorCode.AlreadyGranted
    );
  }

  return validResult();
}

/**
 * Validate a permission revoke operation
 * @param structure - The building object
 * @param actorId - ID of the player revoking permission
 * @param targetId - ID of the player losing permission
 * @param permission - The permission being revoked (optional, undefined means revoke all)
 * @returns Validation result
 */
export function validatePermissionRevoke(
  structure: BuildingObject,
  actorId: ObjectId,
  targetId: ObjectId,
  permission?: BuildingPermission
): PermissionValidationResult {
  // Check if structure is valid
  if (!structure) {
    return invalidResult('Structure not found', PermissionErrorCode.InvalidStructure);
  }

  // Check actor's privilege level
  if (!structure.isOwner(actorId) && !structure.isAdmin(actorId)) {
    return invalidResult(
      'You do not have permission to modify the permission list',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  // Cannot modify owner permissions
  if (structure.isOwner(targetId)) {
    return invalidResult(
      'Cannot revoke owner permissions',
      PermissionErrorCode.CannotModifyOwner
    );
  }

  // Check if target exists in permission list
  const existingEntry = structure.permissionList.get(targetId);
  if (!existingEntry) {
    return invalidResult(
      'Player not found in permission list',
      PermissionErrorCode.TargetNotFound
    );
  }

  // Non-owners cannot revoke Admin permission from others
  if (permission === BuildingPermission.Admin && !structure.isOwner(actorId)) {
    // Allow admins to revoke their own admin permission
    if (actorId !== targetId) {
      return invalidResult(
        'Only the owner can revoke admin permissions',
        PermissionErrorCode.InsufficientPrivilege
      );
    }
  }

  return validResult();
}

/**
 * Validate a ban operation
 * @param structure - The building object
 * @param actorId - ID of the player performing the ban
 * @param targetId - ID of the player being banned
 * @returns Validation result
 */
export function validateBan(
  structure: BuildingObject,
  actorId: ObjectId,
  targetId: ObjectId
): PermissionValidationResult {
  // Check if structure is valid
  if (!structure) {
    return invalidResult('Structure not found', PermissionErrorCode.InvalidStructure);
  }

  // Check actor's privilege level
  if (!structure.isOwner(actorId) && !structure.isAdmin(actorId)) {
    return invalidResult(
      'You do not have permission to ban players',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  // Cannot ban the owner
  if (structure.isOwner(targetId)) {
    return invalidResult(
      'Cannot ban the owner',
      PermissionErrorCode.CannotModifyOwner
    );
  }

  // Cannot ban yourself
  if (actorId === targetId) {
    return invalidResult(
      'Cannot ban yourself',
      PermissionErrorCode.CannotTargetSelf
    );
  }

  // Check if already banned
  if (structure.banList.has(targetId)) {
    return invalidResult(
      'Player is already banned',
      PermissionErrorCode.AlreadyBanned
    );
  }

  // Non-owners cannot ban admins
  if (structure.isAdmin(targetId) && !structure.isOwner(actorId)) {
    return invalidResult(
      'Only the owner can ban admins',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  return validResult();
}

/**
 * Validate an unban operation
 * @param structure - The building object
 * @param actorId - ID of the player performing the unban
 * @param targetId - ID of the player being unbanned
 * @returns Validation result
 */
export function validateUnban(
  structure: BuildingObject,
  actorId: ObjectId,
  targetId: ObjectId
): PermissionValidationResult {
  // Check if structure is valid
  if (!structure) {
    return invalidResult('Structure not found', PermissionErrorCode.InvalidStructure);
  }

  // Check actor's privilege level
  if (!structure.isOwner(actorId) && !structure.isAdmin(actorId)) {
    return invalidResult(
      'You do not have permission to unban players',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  // Check if target is banned
  if (!structure.banList.has(targetId)) {
    return invalidResult(
      'Player is not banned',
      PermissionErrorCode.NotBanned
    );
  }

  return validResult();
}

/**
 * Check if ownership can be transferred
 * @param structure - The building object
 * @param actorId - Current owner ID
 * @param targetId - New owner ID
 * @returns Validation result
 */
export function canTransferOwnership(
  structure: BuildingObject,
  actorId: ObjectId,
  targetId: ObjectId
): PermissionValidationResult {
  // Check if structure is valid
  if (!structure) {
    return invalidResult('Structure not found', PermissionErrorCode.InvalidStructure);
  }

  // Only owner can transfer
  if (!structure.isOwner(actorId)) {
    return invalidResult(
      'Only the owner can transfer ownership',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  // Cannot transfer to yourself
  if (actorId === targetId) {
    return invalidResult(
      'Cannot transfer to yourself',
      PermissionErrorCode.CannotTargetSelf
    );
  }

  // Cannot transfer to banned player
  if (structure.banList.has(targetId)) {
    return invalidResult(
      'Cannot transfer to a banned player',
      PermissionErrorCode.TargetBanned
    );
  }

  return validResult();
}

/**
 * Get the required privilege level for a permission
 * @param permission - The building permission
 * @returns The minimum privilege level required to grant this permission
 */
export function getRequiredPrivilegeLevel(permission: BuildingPermission): PrivilegeLevel {
  switch (permission) {
    case BuildingPermission.Admin:
      // Only owner can grant admin
      return PrivilegeLevel.Owner;
    case BuildingPermission.Enter:
    case BuildingPermission.Vendor:
    case BuildingPermission.Hopper:
    case BuildingPermission.Storage:
      // Admin or owner can grant these
      return PrivilegeLevel.Admin;
    default:
      return PrivilegeLevel.Admin;
  }
}

/**
 * Check if an actor has the required privilege level
 * @param structure - The building object
 * @param actorId - ID of the actor
 * @param requiredLevel - Required privilege level
 * @returns True if actor has required privilege
 */
export function hasPrivilegeLevel(
  structure: BuildingObject,
  actorId: ObjectId,
  requiredLevel: PrivilegeLevel
): boolean {
  switch (requiredLevel) {
    case PrivilegeLevel.None:
      return true;
    case PrivilegeLevel.Entry:
      return structure.canEnter(actorId);
    case PrivilegeLevel.Admin:
      return structure.isOwner(actorId) || structure.isAdmin(actorId);
    case PrivilegeLevel.Owner:
      return structure.isOwner(actorId);
    default:
      return false;
  }
}

/**
 * Validate public/private status change
 * @param structure - The building object
 * @param actorId - ID of the player making the change
 * @param isPublic - New public status
 * @returns Validation result
 */
export function validateSetPublic(
  structure: BuildingObject,
  actorId: ObjectId,
  isPublic: boolean
): PermissionValidationResult {
  // Check if structure is valid
  if (!structure) {
    return invalidResult('Structure not found', PermissionErrorCode.InvalidStructure);
  }

  // Check actor's privilege level
  if (!structure.isOwner(actorId) && !structure.isAdmin(actorId)) {
    return invalidResult(
      'You do not have permission to change public access',
      PermissionErrorCode.InsufficientPrivilege
    );
  }

  return validResult();
}
