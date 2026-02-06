/**
 * Resource Concentration Map
 * Manages spatial resource density distribution on planets
 */

/**
 * Concentration data point
 */
export interface ConcentrationPoint {
  x: number;
  z: number;
  concentration: number;
}

/**
 * Serializable concentration map data
 */
export interface ConcentrationMapData {
  /** Planet ID this map belongs to */
  planetId: string;
  /** Resource ID this map is for */
  resourceId: string;
  /** Grid cell size in world units */
  cellSize: number;
  /** Map origin X coordinate */
  originX: number;
  /** Map origin Z coordinate */
  originZ: number;
  /** Number of cells in X direction */
  width: number;
  /** Number of cells in Z direction */
  height: number;
  /** Concentration values (row-major order, 0-100) */
  data: number[];
  /** Random seed used to generate this map */
  seed: number;
  /** Timestamp when this map was created */
  createdAt: number;
}

/**
 * Options for generating a concentration map
 */
export interface GenerationOptions {
  /** Grid cell size in world units (default: 256) */
  cellSize?: number;
  /** Map width in cells (default: 64) */
  width?: number;
  /** Map height in cells (default: 64) */
  height?: number;
  /** Map origin X (default: -8192) */
  originX?: number;
  /** Map origin Z (default: -8192) */
  originZ?: number;
  /** Minimum concentration value (default: 0) */
  minConcentration?: number;
  /** Maximum concentration value (default: 100) */
  maxConcentration?: number;
  /** Number of concentration hotspots (default: 8-16 random) */
  hotspotCount?: number;
  /** Hotspot radius range in cells (default: 4-12) */
  hotspotRadiusMin?: number;
  /** Hotspot radius range in cells (default: 4-12) */
  hotspotRadiusMax?: number;
  /** Random seed (default: random) */
  seed?: number;
}

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Get next random number between 0 and 1
   */
  next(): number {
    // Simple LCG algorithm
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  /**
   * Get random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max]
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

/**
 * Resource Concentration Map
 * Provides spatial density information for resources on a planet
 */
export class ConcentrationMap {
  private planetId: string;
  private resourceId: string;
  private cellSize: number;
  private originX: number;
  private originZ: number;
  private width: number;
  private height: number;
  private data: Float32Array;
  private seed: number;
  private createdAt: number;

  /**
   * Create a new ConcentrationMap
   */
  constructor(data: ConcentrationMapData) {
    this.planetId = data.planetId;
    this.resourceId = data.resourceId;
    this.cellSize = data.cellSize;
    this.originX = data.originX;
    this.originZ = data.originZ;
    this.width = data.width;
    this.height = data.height;
    this.data = new Float32Array(data.data);
    this.seed = data.seed;
    this.createdAt = data.createdAt;
  }

  /**
   * Get the planet ID this map belongs to
   */
  getPlanetId(): string {
    return this.planetId;
  }

  /**
   * Get the resource ID this map is for
   */
  getResourceId(): string {
    return this.resourceId;
  }

  /**
   * Get concentration at a world position (0-100)
   * @param x - World X coordinate
   * @param z - World Z coordinate
   * @returns Concentration value (0-100), or 0 if outside map bounds
   */
  getConcentration(x: number, z: number): number {
    const cellX = Math.floor((x - this.originX) / this.cellSize);
    const cellZ = Math.floor((z - this.originZ) / this.cellSize);

    if (cellX < 0 || cellX >= this.width || cellZ < 0 || cellZ >= this.height) {
      return 0;
    }

    const index = cellZ * this.width + cellX;
    return this.data[index]!;
  }

  /**
   * Get interpolated concentration at a world position (smoother transitions)
   * @param x - World X coordinate
   * @param z - World Z coordinate
   * @returns Interpolated concentration value (0-100)
   */
  getInterpolatedConcentration(x: number, z: number): number {
    const localX = (x - this.originX) / this.cellSize;
    const localZ = (z - this.originZ) / this.cellSize;

    const x0 = Math.floor(localX);
    const z0 = Math.floor(localZ);
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    // Get corner values
    const v00 = this.getCellValue(x0, z0);
    const v10 = this.getCellValue(x1, z0);
    const v01 = this.getCellValue(x0, z1);
    const v11 = this.getCellValue(x1, z1);

    // Bilinear interpolation
    const fx = localX - x0;
    const fz = localZ - z0;

    const v0 = v00 + (v10 - v00) * fx;
    const v1 = v01 + (v11 - v01) * fx;

    return v0 + (v1 - v0) * fz;
  }

  /**
   * Get cell value with bounds checking
   */
  private getCellValue(cellX: number, cellZ: number): number {
    if (cellX < 0 || cellX >= this.width || cellZ < 0 || cellZ >= this.height) {
      return 0;
    }
    const index = cellZ * this.width + cellX;
    return this.data[index]!;
  }

  /**
   * Find the highest concentration point in the map
   * @returns Point with highest concentration
   */
  findHighestConcentration(): ConcentrationPoint {
    let maxConc = 0;
    let maxX = 0;
    let maxZ = 0;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const index = z * this.width + x;
        const val = this.data[index]!;
        if (val > maxConc) {
          maxConc = val;
          maxX = x;
          maxZ = z;
        }
      }
    }

    return {
      x: this.originX + (maxX + 0.5) * this.cellSize,
      z: this.originZ + (maxZ + 0.5) * this.cellSize,
      concentration: maxConc,
    };
  }

  /**
   * Find all points above a concentration threshold
   * @param threshold - Minimum concentration (0-100)
   * @returns Array of points above threshold
   */
  findPointsAboveThreshold(threshold: number): ConcentrationPoint[] {
    const points: ConcentrationPoint[] = [];

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const index = z * this.width + x;
        const val = this.data[index]!;
        if (val >= threshold) {
          points.push({
            x: this.originX + (x + 0.5) * this.cellSize,
            z: this.originZ + (z + 0.5) * this.cellSize,
            concentration: val,
          });
        }
      }
    }

    return points;
  }

  /**
   * Get the average concentration across the map
   */
  getAverageConcentration(): number {
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      sum += this.data[i]!;
    }
    return sum / this.data.length;
  }

  /**
   * Get the map dimensions
   */
  getDimensions(): { width: number; height: number; cellSize: number } {
    return {
      width: this.width,
      height: this.height,
      cellSize: this.cellSize,
    };
  }

  /**
   * Get the map bounds in world coordinates
   */
  getBounds(): { minX: number; minZ: number; maxX: number; maxZ: number } {
    return {
      minX: this.originX,
      minZ: this.originZ,
      maxX: this.originX + this.width * this.cellSize,
      maxZ: this.originZ + this.height * this.cellSize,
    };
  }

  /**
   * Get the creation timestamp
   */
  getCreatedAt(): number {
    return this.createdAt;
  }

  /**
   * Get the random seed used to generate this map
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Serialize the map for persistence
   */
  serialize(): ConcentrationMapData {
    return {
      planetId: this.planetId,
      resourceId: this.resourceId,
      cellSize: this.cellSize,
      originX: this.originX,
      originZ: this.originZ,
      width: this.width,
      height: this.height,
      data: Array.from(this.data),
      seed: this.seed,
      createdAt: this.createdAt,
    };
  }

  /**
   * Create a ConcentrationMap from serialized data
   */
  static deserialize(data: ConcentrationMapData): ConcentrationMap {
    return new ConcentrationMap(data);
  }
}

/**
 * Generate a random concentration map for a resource
 * @param planetId - Planet ID
 * @param resourceId - Resource ID
 * @param options - Generation options
 * @returns Generated ConcentrationMap
 */
export function generateConcentrationMap(
  planetId: string,
  resourceId: string,
  options: GenerationOptions = {}
): ConcentrationMap {
  const {
    cellSize = 256,
    width = 64,
    height = 64,
    originX = -8192,
    originZ = -8192,
    minConcentration = 0,
    maxConcentration = 100,
    hotspotRadiusMin = 4,
    hotspotRadiusMax = 12,
    seed = Date.now() ^ (Math.random() * 0xffffffff),
  } = options;

  const rng = new SeededRandom(seed);
  const hotspotCount = options.hotspotCount ?? rng.nextInt(8, 16);

  // Initialize data array with minimum concentration
  const data = new Float32Array(width * height);
  data.fill(minConcentration);

  // Generate hotspots
  const hotspots: Array<{ x: number; z: number; radius: number; intensity: number }> = [];

  for (let i = 0; i < hotspotCount; i++) {
    hotspots.push({
      x: rng.nextInt(0, width - 1),
      z: rng.nextInt(0, height - 1),
      radius: rng.nextFloat(hotspotRadiusMin, hotspotRadiusMax),
      intensity: rng.nextFloat(0.5, 1.0),
    });
  }

  // Apply hotspots to the data
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      let concentration = minConcentration;

      for (const hotspot of hotspots) {
        const dx = x - hotspot.x;
        const dz = z - hotspot.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < hotspot.radius) {
          // Smooth falloff from center
          const falloff = 1 - distance / hotspot.radius;
          const contribution = falloff * falloff * hotspot.intensity * maxConcentration;
          concentration = Math.max(concentration, contribution);
        }
      }

      // Add some noise for variation
      const noise = rng.nextFloat(-5, 5);
      concentration = Math.max(
        minConcentration,
        Math.min(maxConcentration, concentration + noise)
      );

      const index = z * width + x;
      data[index] = concentration;
    }
  }

  return new ConcentrationMap({
    planetId,
    resourceId,
    cellSize,
    originX,
    originZ,
    width,
    height,
    data: Array.from(data),
    seed,
    createdAt: Date.now(),
  });
}

/**
 * Merge multiple concentration maps (e.g., for resource variants)
 * @param maps - Array of concentration maps to merge
 * @param mode - Merge mode: 'max' takes highest value, 'avg' averages
 * @returns Merged concentration map data (without planet/resource IDs)
 */
export function mergeConcentrationMaps(
  maps: ConcentrationMap[],
  mode: 'max' | 'avg' = 'max'
): number[] {
  if (maps.length === 0) {
    throw new Error('Cannot merge empty array of maps');
  }

  const first = maps[0]!;
  const dims = first.getDimensions();
  const data = new Float32Array(dims.width * dims.height);

  if (mode === 'avg') {
    data.fill(0);
    for (const map of maps) {
      const serialized = map.serialize();
      for (let i = 0; i < data.length; i++) {
        data[i] = data[i]! + serialized.data[i]!;
      }
    }
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i]! / maps.length;
    }
  } else {
    // max mode
    data.fill(0);
    for (const map of maps) {
      const serialized = map.serialize();
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.max(data[i]!, serialized.data[i]!);
      }
    }
  }

  return Array.from(data);
}

/**
 * Create an empty concentration map (all zeros)
 * @param planetId - Planet ID
 * @param resourceId - Resource ID
 * @param options - Generation options
 * @returns Empty ConcentrationMap
 */
export function createEmptyConcentrationMap(
  planetId: string,
  resourceId: string,
  options: Omit<GenerationOptions, 'hotspotCount' | 'seed'> = {}
): ConcentrationMap {
  const {
    cellSize = 256,
    width = 64,
    height = 64,
    originX = -8192,
    originZ = -8192,
  } = options;

  return new ConcentrationMap({
    planetId,
    resourceId,
    cellSize,
    originX,
    originZ,
    width,
    height,
    data: new Array(width * height).fill(0),
    seed: 0,
    createdAt: Date.now(),
  });
}
