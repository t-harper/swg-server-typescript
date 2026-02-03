/**
 * Cell System Types
 * Type definitions for building interior cells in the SWG housing system
 *
 * Cells represent individual rooms within a building structure. Each room
 * in a player house or NPC building is a separate cell with its own:
 * - Object contents (furniture, decorations, etc.)
 * - Portal connections to adjacent cells
 * - Lighting configuration
 * - Access permissions
 *
 * Cell Index Convention:
 * - Cell 0 is always the entrance/exterior portal
 * - Interior cells start at index 1
 */

/**
 * Maximum number of objects allowed in a single cell
 * This limit helps with memory and network performance
 */
export const MAX_OBJECTS_PER_CELL = 400;

/**
 * Maximum length for cell display names
 * Cell names like "Living Room" or "Storage" are capped at this length
 */
export const MAX_CELL_NAME_LENGTH = 64;

/**
 * Portal connection between cells
 * Portals represent doorways, archways, or other passages between cells
 */
export interface CellPortal {
  /** Unique identifier for this portal within the cell */
  portalId: number;
  /** Index of the cell this portal connects to */
  connectedCellIndex: number;
  /** Position of the portal within the cell (x, y, z) */
  position: {
    x: number;
    y: number;
    z: number;
  };
  /** Whether the portal is currently open (passable) */
  isOpen: boolean;
  /** Whether the portal is locked (requires key/permission to open) */
  isLocked: boolean;
}

/**
 * Lighting configuration for a cell
 * Controls the visual appearance of the cell interior
 */
export interface CellLighting {
  /** Ambient light color (RGB values 0-255) */
  ambientColor: {
    r: number;
    g: number;
    b: number;
  };
  /** Directional light color (RGB values 0-255) */
  directionalColor: {
    r: number;
    g: number;
    b: number;
  };
  /** Light intensity (0.0 to 1.0) */
  intensity: number;
}

/**
 * Floor plan dimensions for a cell
 * Defines the physical space of the cell
 */
export interface CellFloorplan {
  /** Width of the cell in meters */
  width: number;
  /** Height of the cell in meters (ceiling height) */
  height: number;
  /** Type of floor (e.g., "wood", "stone", "carpet") */
  floorType: string;
}

/**
 * Default lighting configuration for cells
 */
export const DEFAULT_CELL_LIGHTING: CellLighting = {
  ambientColor: { r: 128, g: 128, b: 128 },
  directionalColor: { r: 255, g: 255, b: 255 },
  intensity: 0.8,
};

/**
 * Default floorplan for cells
 */
export const DEFAULT_CELL_FLOORPLAN: CellFloorplan = {
  width: 10,
  height: 3,
  floorType: 'default',
};
