/**
 * CellObject - Represents an interior cell within a building structure
 *
 * Cells are the building blocks of building interiors in SWG. Each room
 * in a player house is a separate cell with its own contents, lighting,
 * and portal connections to other cells.
 *
 * The cell system supports:
 * - Object placement and management within cells
 * - Portal-based navigation between cells
 * - Per-cell lighting and visual configuration
 * - Permission overrides for cell-specific access control
 *
 * Cell Index Convention:
 * - Index 0: Entrance cell (connects to building exterior)
 * - Index 1+: Interior cells (rooms, storage areas, etc.)
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { SceneObject, ObjectType } from './scene-object.js';
import {
  CellPortal,
  CellLighting,
  CellFloorplan,
  MAX_OBJECTS_PER_CELL,
  MAX_CELL_NAME_LENGTH,
  DEFAULT_CELL_LIGHTING,
  DEFAULT_CELL_FLOORPLAN,
} from './cell-types.js';

/**
 * CellObject - Represents a single cell (room) within a building
 * Extends SceneObject with cell-specific functionality for housing interiors
 */
export class CellObject extends SceneObject {
  /** Index of this cell within the parent building (0 = entrance) */
  cellIndex: number;

  /** Object ID of the parent building */
  buildingId: ObjectId;

  /** Display name for this cell (e.g., "Living Room", "Storage") */
  private _cellName: string;

  /** Set of object IDs contained within this cell */
  contents: Set<ObjectId>;

  /** Map of portal ID to portal configuration */
  portals: Map<number, CellPortal>;

  /** Physical dimensions and floor type of this cell */
  floorplan: CellFloorplan;

  /** Lighting configuration for this cell */
  lighting: CellLighting;

  /**
   * Whether this cell is publicly accessible
   * If true, anyone can enter. If false, inherits from building permissions
   */
  isPublic: boolean;

  /**
   * Cell-specific permission overrides
   * If set, only these object IDs (players) can access this cell
   * regardless of building-level permissions
   */
  permissionOverride?: Set<ObjectId>;

  /**
   * Create a new CellObject
   * @param objectId - Unique 64-bit identifier for this cell
   * @param buildingId - Object ID of the parent building
   * @param cellIndex - Index of this cell within the building
   * @param templateCrc - CRC32 hash of the cell template (optional)
   */
  constructor(
    objectId: ObjectId,
    buildingId: ObjectId,
    cellIndex: number = 0,
    templateCrc: CrcValue = 0
  ) {
    super(objectId, templateCrc);
    this.objectType = ObjectType.Cell;
    this.buildingId = buildingId;
    this.cellIndex = cellIndex;
    this._cellName = '';
    this.contents = new Set();
    this.portals = new Map();
    this.floorplan = { ...DEFAULT_CELL_FLOORPLAN };
    this.lighting = {
      ambientColor: { ...DEFAULT_CELL_LIGHTING.ambientColor },
      directionalColor: { ...DEFAULT_CELL_LIGHTING.directionalColor },
      intensity: DEFAULT_CELL_LIGHTING.intensity,
    };
    this.isPublic = false;
  }

  /**
   * Get the cell display name
   */
  get cellName(): string {
    return this._cellName;
  }

  /**
   * Set the cell display name (enforces max length)
   */
  set cellName(name: string) {
    if (name.length > MAX_CELL_NAME_LENGTH) {
      this._cellName = name.substring(0, MAX_CELL_NAME_LENGTH);
    } else {
      this._cellName = name;
    }
    this.markModified();
  }

  /**
   * Add an object to this cell's contents
   * @param objectId - Object ID to add
   * @returns True if added, false if cell is full
   */
  addObject(objectId: ObjectId): boolean {
    if (this.isFull()) {
      return false;
    }
    this.contents.add(objectId);
    this.markModified();
    return true;
  }

  /**
   * Remove an object from this cell's contents
   * @param objectId - Object ID to remove
   * @returns True if removed, false if not found
   */
  removeObject(objectId: ObjectId): boolean {
    const removed = this.contents.delete(objectId);
    if (removed) {
      this.markModified();
    }
    return removed;
  }

  /**
   * Get all objects contained in this cell
   * @returns Array of object IDs
   */
  getContents(): ObjectId[] {
    return Array.from(this.contents);
  }

  /**
   * Get the current number of objects in this cell
   * @returns Object count
   */
  getObjectCount(): number {
    return this.contents.size;
  }

  /**
   * Check if this cell is at maximum capacity
   * @returns True if cell is full
   */
  isFull(): boolean {
    return this.contents.size >= MAX_OBJECTS_PER_CELL;
  }

  /**
   * Check if a character can enter this cell
   * Considers public access, permission overrides, and cell state
   * @param characterId - Object ID of the character trying to enter
   * @returns True if the character can enter
   */
  canEnter(characterId: ObjectId): boolean {
    // Public cells allow anyone
    if (this.isPublic) {
      return true;
    }

    // Check cell-specific permission override
    if (this.permissionOverride) {
      return this.permissionOverride.has(characterId);
    }

    // If no override, access is determined by building permissions
    // (handled by the caller/building object)
    return true;
  }

  /**
   * Get portal information by portal ID
   * @param portalId - The portal ID to look up
   * @returns Portal configuration or undefined if not found
   */
  getPortal(portalId: number): CellPortal | undefined {
    return this.portals.get(portalId);
  }

  /**
   * Add or update a portal in this cell
   * @param portal - Portal configuration to add
   */
  addPortal(portal: CellPortal): void {
    this.portals.set(portal.portalId, portal);
    this.markModified();
  }

  /**
   * Remove a portal from this cell
   * @param portalId - The portal ID to remove
   * @returns True if removed, false if not found
   */
  removePortal(portalId: number): boolean {
    const removed = this.portals.delete(portalId);
    if (removed) {
      this.markModified();
    }
    return removed;
  }

  /**
   * Set the locked state of a portal
   * @param portalId - The portal ID to modify
   * @param isLocked - Whether the portal should be locked
   * @returns True if portal was found and updated
   */
  setPortalLocked(portalId: number, isLocked: boolean): boolean {
    const portal = this.portals.get(portalId);
    if (!portal) {
      return false;
    }
    portal.isLocked = isLocked;
    this.markModified();
    return true;
  }

  /**
   * Set the open/closed state of a portal
   * @param portalId - The portal ID to modify
   * @param isOpen - Whether the portal should be open
   * @returns True if portal was found and updated
   */
  setPortalOpen(portalId: number, isOpen: boolean): boolean {
    const portal = this.portals.get(portalId);
    if (!portal) {
      return false;
    }
    // Cannot open a locked portal without unlocking first
    if (isOpen && portal.isLocked) {
      return false;
    }
    portal.isOpen = isOpen;
    this.markModified();
    return true;
  }

  /**
   * Get all adjacent cell indices (cells connected via portals)
   * @returns Array of cell indices this cell connects to
   */
  getAdjacentCells(): number[] {
    const adjacentCells: number[] = [];
    for (const portal of this.portals.values()) {
      if (!adjacentCells.includes(portal.connectedCellIndex)) {
        adjacentCells.push(portal.connectedCellIndex);
      }
    }
    return adjacentCells;
  }

  /**
   * Check if this is the entrance cell (index 0)
   * @returns True if this is the entrance cell
   */
  isEntrance(): boolean {
    return this.cellIndex === 0;
  }

  /**
   * Update the cell's lighting configuration
   * @param lighting - New lighting configuration
   */
  setLighting(lighting: Partial<CellLighting>): void {
    if (lighting.ambientColor) {
      this.lighting.ambientColor = { ...lighting.ambientColor };
    }
    if (lighting.directionalColor) {
      this.lighting.directionalColor = { ...lighting.directionalColor };
    }
    if (lighting.intensity !== undefined) {
      this.lighting.intensity = Math.max(0, Math.min(1, lighting.intensity));
    }
    this.markModified();
  }

  /**
   * Update the cell's floorplan configuration
   * @param floorplan - New floorplan configuration
   */
  setFloorplan(floorplan: Partial<CellFloorplan>): void {
    if (floorplan.width !== undefined) {
      this.floorplan.width = floorplan.width;
    }
    if (floorplan.height !== undefined) {
      this.floorplan.height = floorplan.height;
    }
    if (floorplan.floorType !== undefined) {
      this.floorplan.floorType = floorplan.floorType;
    }
    this.markModified();
  }

  /**
   * Add a character to the permission override list
   * @param characterId - Object ID of the character to grant access
   */
  addPermissionOverride(characterId: ObjectId): void {
    if (!this.permissionOverride) {
      this.permissionOverride = new Set();
    }
    this.permissionOverride.add(characterId);
    this.markModified();
  }

  /**
   * Remove a character from the permission override list
   * @param characterId - Object ID of the character to revoke access
   * @returns True if removed, false if not found
   */
  removePermissionOverride(characterId: ObjectId): boolean {
    if (!this.permissionOverride) {
      return false;
    }
    const removed = this.permissionOverride.delete(characterId);
    if (removed) {
      this.markModified();
    }
    return removed;
  }

  /**
   * Clear all permission overrides for this cell
   */
  clearPermissionOverrides(): void {
    if (this.permissionOverride && this.permissionOverride.size > 0) {
      delete this.permissionOverride;
      this.markModified();
    }
  }

  /**
   * Check if a character has a specific permission override
   * @param characterId - Object ID to check
   * @returns True if character has an override, false otherwise
   */
  hasPermissionOverride(characterId: ObjectId): boolean {
    return this.permissionOverride?.has(characterId) ?? false;
  }

  /**
   * Get all characters with permission overrides
   * @returns Array of character object IDs, or empty array if no overrides
   */
  getPermissionOverrides(): ObjectId[] {
    return this.permissionOverride ? Array.from(this.permissionOverride) : [];
  }

  /**
   * Get the baseline type for this object
   * Cells use the SCLT baseline type
   */
  override getBaselineType(): string {
    return 'SCLT';
  }

  /**
   * Serialize the cell to a JSON-compatible object
   */
  override toJSON(): Record<string, unknown> {
    const base = super.toJSON();
    return {
      ...base,
      cellIndex: this.cellIndex,
      buildingId: this.buildingId.toString(),
      cellName: this._cellName,
      contents: Array.from(this.contents).map((id) => id.toString()),
      portals: Array.from(this.portals.entries()).map(([, portal]) => ({
        ...portal,
      })),
      floorplan: { ...this.floorplan },
      lighting: {
        ambientColor: { ...this.lighting.ambientColor },
        directionalColor: { ...this.lighting.directionalColor },
        intensity: this.lighting.intensity,
      },
      isPublic: this.isPublic,
      permissionOverride: this.permissionOverride
        ? Array.from(this.permissionOverride).map((id) => id.toString())
        : undefined,
    };
  }
}
