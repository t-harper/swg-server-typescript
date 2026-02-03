/**
 * Structure Permission Handler
 * Network handler for structure permission operations
 *
 * Handles:
 * - StructurePermissionListMessage - Request/response for permission lists
 * - StructurePermissionUpdateMessage - Grant/revoke/ban operations
 * - Ban/unban messages
 * - Broadcasting permission changes to nearby players
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  BuildingPermission,
  StructureOperation,
  PermissionUpdateAction,
  type StructurePermissionListMessage,
  type StructurePermissionUpdateMessage,
  createStructurePermissionListResponse,
  createStructurePermissionUpdateResponse,
  type PermissionEntryData,
  StructureMessageCrc,
} from '@swg/objects';
import {
  StructurePermissionService,
  type PermissionOperationResult,
  type PermissionChangeEvent,
} from '../services/structure-permission-service.js';
import { PermissionErrorCode } from '../services/permission-validator.js';

/**
 * Player session interface for permission handler
 */
export interface PermissionSession {
  characterId: bigint;
  characterName: string;
  position?: Vector3;
  sceneId?: string;
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * Handler result interface
 */
export interface PermissionHandlerResult {
  success: boolean;
  message: string;
  errorCode?: PermissionErrorCode;
  responseData?: Uint8Array;
}

/**
 * Broadcast callback type
 */
export type BroadcastCallback = (
  sceneId: string,
  position: Vector3,
  radius: number,
  data: Uint8Array,
  excludeId?: bigint
) => void;

/**
 * Name resolver callback - resolves player ID to name
 */
export type NameResolverCallback = (playerId: bigint) => Promise<string | null>;

/**
 * Structure Permission Handler Options
 */
export interface StructurePermissionHandlerOptions {
  /** Permission service instance */
  permissionService: StructurePermissionService;
  /** Broadcast callback for notifying nearby players */
  broadcastCallback?: BroadcastCallback;
  /** Name resolver for player lookups */
  nameResolver?: NameResolverCallback;
  /** Broadcast radius for permission changes */
  broadcastRadius?: number;
}

/**
 * Structure Permission Handler
 * Processes network messages for structure permission management
 */
export class StructurePermissionHandler {
  private readonly permissionService: StructurePermissionService;
  private readonly sessions: Map<bigint, PermissionSession>;
  private broadcastCallback?: BroadcastCallback;
  private nameResolver?: NameResolverCallback;
  private readonly broadcastRadius: number;

  constructor(options: StructurePermissionHandlerOptions) {
    this.permissionService = options.permissionService;
    this.sessions = new Map();
    this.broadcastCallback = options.broadcastCallback;
    this.nameResolver = options.nameResolver;
    this.broadcastRadius = options.broadcastRadius ?? 128;

    // Subscribe to permission changes for broadcasting
    this.permissionService.onPermissionChange(this.onPermissionChanged.bind(this));
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Register a player session
   */
  registerSession(session: PermissionSession): void {
    this.sessions.set(session.characterId, session);
  }

  /**
   * Unregister a player session
   */
  unregisterSession(characterId: bigint): void {
    this.sessions.delete(characterId);
  }

  /**
   * Get a registered session
   */
  getSession(characterId: bigint): PermissionSession | undefined {
    return this.sessions.get(characterId);
  }

  /**
   * Set the broadcast callback
   */
  setBroadcastCallback(callback: BroadcastCallback): void {
    this.broadcastCallback = callback;
  }

  /**
   * Set the name resolver callback
   */
  setNameResolver(resolver: NameResolverCallback): void {
    this.nameResolver = resolver;
  }

  // ============================================
  // Message Handlers
  // ============================================

  /**
   * Handle a permission list request
   */
  async handlePermissionListRequest(
    message: StructurePermissionListMessage
  ): Promise<PermissionHandlerResult> {
    const { structureId, playerId } = message;

    const structure = this.permissionService.getStructure(structureId);
    if (!structure) {
      const response = createStructurePermissionListResponse(
        playerId,
        structureId,
        undefined,
        undefined,
        undefined,
        false,
        false,
        false,
        'Structure not found'
      );
      return {
        success: false,
        message: 'Structure not found',
        errorCode: PermissionErrorCode.InvalidStructure,
        responseData: this.serializePermissionListResponse(response),
      };
    }

    // Check if requester has permission to view the list
    const isOwner = structure.isOwner(playerId);
    const isAdmin = structure.isAdmin(playerId);

    if (!isOwner && !isAdmin) {
      const response = createStructurePermissionListResponse(
        playerId,
        structureId,
        undefined,
        undefined,
        undefined,
        false,
        false,
        false,
        'You do not have permission to view the permission list'
      );
      return {
        success: false,
        message: 'Insufficient privileges',
        errorCode: PermissionErrorCode.InsufficientPrivilege,
        responseData: this.serializePermissionListResponse(response),
      };
    }

    // Get the permission list
    const permissionList = this.permissionService.getPermissionList(structureId);
    const banList = this.permissionService.getBanList(structureId);
    const isPublic = this.permissionService.isPublic(structureId);

    // Convert to message format
    const entries: PermissionEntryData[] = permissionList.map(entry => ({
      characterId: entry.characterId,
      characterName: entry.characterName,
      permissions: entry.permissions,
    }));

    const response = createStructurePermissionListResponse(
      playerId,
      structureId,
      entries,
      banList,
      isPublic,
      isOwner,
      isAdmin,
      true
    );

    return {
      success: true,
      message: 'Permission list retrieved',
      responseData: this.serializePermissionListResponse(response),
    };
  }

  /**
   * Handle a permission update request
   */
  async handlePermissionUpdateRequest(
    message: StructurePermissionUpdateMessage
  ): Promise<PermissionHandlerResult> {
    const { structureId, playerId, action, targetId, targetName, permissions, isPublic } = message;

    let result: PermissionOperationResult;
    let resolvedTargetName = targetName ?? 'Unknown';

    // Resolve target name if needed
    if (targetId && !targetName && this.nameResolver) {
      const resolved = await this.nameResolver(targetId);
      if (resolved) {
        resolvedTargetName = resolved;
      }
    }

    switch (action) {
      case PermissionUpdateAction.Grant:
        if (!targetId || !permissions || permissions.length === 0) {
          result = {
            success: false,
            message: 'Invalid grant request: missing target or permissions',
          };
        } else {
          // Grant each permission
          let lastResult: PermissionOperationResult = { success: true, message: '' };
          for (const permission of permissions) {
            lastResult = this.permissionService.grantPermission(
              structureId,
              targetId,
              permission,
              playerId,
              resolvedTargetName
            );
            if (!lastResult.success) {
              break;
            }
          }
          result = lastResult;
        }
        break;

      case PermissionUpdateAction.Revoke:
        if (!targetId) {
          result = {
            success: false,
            message: 'Invalid revoke request: missing target',
          };
        } else if (permissions && permissions.length > 0) {
          // Revoke specific permissions
          let lastResult: PermissionOperationResult = { success: true, message: '' };
          for (const permission of permissions) {
            lastResult = this.permissionService.revokePermission(
              structureId,
              targetId,
              permission,
              playerId
            );
            if (!lastResult.success) {
              break;
            }
          }
          result = lastResult;
        } else {
          // Revoke all permissions
          result = this.permissionService.revokeAllPermissions(structureId, targetId, playerId);
        }
        break;

      case PermissionUpdateAction.Ban:
        if (!targetId) {
          result = {
            success: false,
            message: 'Invalid ban request: missing target',
          };
        } else {
          result = this.permissionService.banFromStructure(structureId, targetId, playerId);
        }
        break;

      case PermissionUpdateAction.Unban:
        if (!targetId) {
          result = {
            success: false,
            message: 'Invalid unban request: missing target',
          };
        } else {
          result = this.permissionService.unbanFromStructure(structureId, targetId, playerId);
        }
        break;

      case PermissionUpdateAction.SetPublic:
        if (isPublic === undefined) {
          result = {
            success: false,
            message: 'Invalid set public request: missing public flag',
          };
        } else {
          result = this.permissionService.setPublic(structureId, isPublic, playerId);
        }
        break;

      default:
        result = {
          success: false,
          message: 'Unknown permission action',
        };
    }

    // Get updated counts for response
    const structure = this.permissionService.getStructure(structureId);
    const permissionListSize = structure?.permissionList.size ?? 0;
    const banListSize = structure?.banList.size ?? 0;

    const response = createStructurePermissionUpdateResponse(
      playerId,
      structureId,
      action,
      permissionListSize,
      banListSize,
      result.success,
      result.success ? undefined : result.message
    );

    return {
      success: result.success,
      message: result.message,
      errorCode: result.errorCode,
      responseData: this.serializePermissionUpdateResponse(response),
    };
  }

  // ============================================
  // Broadcasting
  // ============================================

  /**
   * Handle permission change events and broadcast to nearby players
   */
  private onPermissionChanged(event: PermissionChangeEvent): void {
    if (!this.broadcastCallback) {
      return;
    }

    const structure = this.permissionService.getStructure(event.structureId);
    if (!structure) {
      return;
    }

    // Create a broadcast message for permission changes
    const broadcastData = this.createPermissionChangeBroadcast(event);
    if (!broadcastData) {
      return;
    }

    // Get structure position and scene
    const position = structure.position;
    const sceneId = structure.sceneId;

    if (!sceneId) {
      return;
    }

    // Broadcast to nearby players
    this.broadcastCallback(
      sceneId,
      position,
      this.broadcastRadius,
      broadcastData,
      event.actorId // Exclude the actor who made the change
    );
  }

  /**
   * Create broadcast data for a permission change
   */
  private createPermissionChangeBroadcast(event: PermissionChangeEvent): Uint8Array | null {
    // Create a simple notification message
    // In a full implementation, this would use proper SWG message serialization
    const message = {
      type: 'permissionChange',
      structureId: event.structureId.toString(),
      action: event.action,
      targetId: event.targetId?.toString(),
      permission: event.permission,
      isPublic: event.isPublic,
      timestamp: event.timestamp,
    };

    // Serialize to JSON for now - in production, use proper protocol serialization
    const json = JSON.stringify(message);
    return new TextEncoder().encode(json);
  }

  /**
   * Send a response to a specific player
   */
  private sendToPlayer(playerId: bigint, data: Uint8Array): void {
    const session = this.sessions.get(playerId);
    if (session?.sendCallback) {
      session.sendCallback(data);
    }
  }

  // ============================================
  // Serialization Helpers
  // ============================================

  /**
   * Serialize permission list response
   * In production, this would use proper SWG protocol serialization
   */
  private serializePermissionListResponse(response: ReturnType<typeof createStructurePermissionListResponse>): Uint8Array {
    // For now, serialize as JSON
    // In production, use proper protocol serialization
    const json = JSON.stringify({
      ...response,
      structureId: response.structureId.toString(),
      playerId: response.playerId.toString(),
      entries: response.entries?.map(e => ({
        ...e,
        characterId: e.characterId.toString(),
      })),
      bannedPlayers: response.bannedPlayers?.map(id => id.toString()),
    });
    return new TextEncoder().encode(json);
  }

  /**
   * Serialize permission update response
   * In production, this would use proper SWG protocol serialization
   */
  private serializePermissionUpdateResponse(response: ReturnType<typeof createStructurePermissionUpdateResponse>): Uint8Array {
    // For now, serialize as JSON
    // In production, use proper protocol serialization
    const json = JSON.stringify({
      ...response,
      structureId: response.structureId.toString(),
      playerId: response.playerId.toString(),
    });
    return new TextEncoder().encode(json);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if a player can view structure permissions
   */
  canViewPermissions(structureId: ObjectId, playerId: ObjectId): boolean {
    return this.permissionService.canAdmin(structureId, playerId);
  }

  /**
   * Check if a player can modify structure permissions
   */
  canModifyPermissions(structureId: ObjectId, playerId: ObjectId): boolean {
    return this.permissionService.canAdmin(structureId, playerId);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    registeredSessions: number;
    serviceStats: ReturnType<StructurePermissionService['getStats']>;
  } {
    return {
      registeredSessions: this.sessions.size,
      serviceStats: this.permissionService.getStats(),
    };
  }
}

/**
 * Create a new StructurePermissionHandler instance
 */
export function createStructurePermissionHandler(
  options: StructurePermissionHandlerOptions
): StructurePermissionHandler {
  return new StructurePermissionHandler(options);
}
