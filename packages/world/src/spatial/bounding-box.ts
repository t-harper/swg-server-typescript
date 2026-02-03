/**
 * @swg/world - Bounding Box
 * Axis-aligned bounding box for spatial queries
 */

/**
 * Represents an axis-aligned bounding box (AABB) in 2D space.
 * Used for spatial partitioning and collision detection.
 */
export interface BoundingBox {
  /** Minimum X coordinate (left edge) */
  minX: number;
  /** Minimum Y coordinate (bottom edge) */
  minY: number;
  /** Maximum X coordinate (right edge) */
  maxX: number;
  /** Maximum Y coordinate (top edge) */
  maxY: number;
}

/**
 * Creates a new bounding box from the given coordinates.
 */
export function createBoundingBox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): BoundingBox {
  return { minX, minY, maxX, maxY };
}

/**
 * Creates a bounding box from a center point and radius.
 * Useful for circular range queries.
 */
export function fromCenterRadius(
  centerX: number,
  centerY: number,
  radius: number
): BoundingBox {
  return {
    minX: centerX - radius,
    minY: centerY - radius,
    maxX: centerX + radius,
    maxY: centerY + radius,
  };
}

/**
 * Merges two bounding boxes into a new box that contains both.
 */
export function merge(a: BoundingBox, b: BoundingBox): BoundingBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/**
 * Checks if two bounding boxes intersect (overlap).
 */
export function intersects(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

/**
 * Checks if bounding box `a` completely contains bounding box `b`.
 */
export function contains(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.minX <= b.minX &&
    a.maxX >= b.maxX &&
    a.minY <= b.minY &&
    a.maxY >= b.maxY
  );
}

/**
 * Checks if a bounding box contains a specific point.
 */
export function containsPoint(
  box: BoundingBox,
  x: number,
  y: number
): boolean {
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
}

/**
 * Expands a bounding box by a given amount in all directions.
 */
export function expand(box: BoundingBox, amount: number): BoundingBox {
  return {
    minX: box.minX - amount,
    minY: box.minY - amount,
    maxX: box.maxX + amount,
    maxY: box.maxY + amount,
  };
}

/**
 * Gets the width of a bounding box.
 */
export function getWidth(box: BoundingBox): number {
  return box.maxX - box.minX;
}

/**
 * Gets the height of a bounding box.
 */
export function getHeight(box: BoundingBox): number {
  return box.maxY - box.minY;
}

/**
 * Gets the center point of a bounding box.
 */
export function getCenter(box: BoundingBox): { x: number; y: number } {
  return {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
  };
}

/**
 * Gets the area of a bounding box.
 */
export function getArea(box: BoundingBox): number {
  return getWidth(box) * getHeight(box);
}

/**
 * Checks if a circle (defined by center and radius) intersects with a bounding box.
 * Used for efficient radius queries.
 */
export function intersectsCircle(
  box: BoundingBox,
  centerX: number,
  centerY: number,
  radius: number
): boolean {
  // Find the closest point on the box to the circle center
  const closestX = Math.max(box.minX, Math.min(centerX, box.maxX));
  const closestY = Math.max(box.minY, Math.min(centerY, box.maxY));

  // Calculate distance from circle center to closest point
  const distanceX = centerX - closestX;
  const distanceY = centerY - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;

  return distanceSquared <= radius * radius;
}

/**
 * Subdivides a bounding box into four quadrants.
 * Used internally by QuadTree.
 */
export function subdivide(box: BoundingBox): [BoundingBox, BoundingBox, BoundingBox, BoundingBox] {
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;

  return [
    // Top-left (NW)
    { minX: box.minX, minY: midY, maxX: midX, maxY: box.maxY },
    // Top-right (NE)
    { minX: midX, minY: midY, maxX: box.maxX, maxY: box.maxY },
    // Bottom-left (SW)
    { minX: box.minX, minY: box.minY, maxX: midX, maxY: midY },
    // Bottom-right (SE)
    { minX: midX, minY: box.minY, maxX: box.maxX, maxY: midY },
  ];
}
