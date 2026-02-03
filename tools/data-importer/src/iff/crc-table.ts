/**
 * CRC32 calculation and lookup table generation for SWG template paths
 *
 * SWG uses CRC32 hashes to identify templates efficiently. This module
 * provides CRC calculation and utilities for building lookup tables.
 */

/**
 * Pre-computed CRC32 lookup table (polynomial 0xEDB88320)
 * This is the standard CRC32 polynomial used by SWG
 */
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
    table[i] = crc >>> 0; // Ensure unsigned
  }

  return table;
})();

/**
 * Calculate CRC32 hash of a string
 * @param data - The string to hash (typically a template path)
 * @returns The CRC32 hash as an unsigned 32-bit integer
 */
export function calculateCrc32(data: string): number {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i) & 0xff;
    crc = (crc >>> 8) ^ (CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0);
  }

  return (crc ^ 0xffffffff) >>> 0; // Return as unsigned
}

/**
 * Calculate CRC32 hash of a byte array
 * @param data - The bytes to hash
 * @returns The CRC32 hash as an unsigned 32-bit integer
 */
export function calculateCrc32Bytes(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0;
    crc = (crc >>> 8) ^ (CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * CRC lookup table entry
 */
export interface CrcEntry {
  /** The original path */
  path: string;
  /** The CRC32 hash */
  crc: number;
}

/**
 * Bidirectional CRC lookup table
 */
export interface CrcTable {
  /** Map of path to CRC */
  pathToCrc: Record<string, number>;
  /** Map of CRC (as hex string) to path */
  crcToPath: Record<string, string>;
  /** Total number of entries */
  count: number;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * CRC table generator options
 */
export interface CrcTableOptions {
  /** Convert paths to lowercase before hashing (default: true) */
  lowercase?: boolean;
  /** Strip file extension before hashing (default: false) */
  stripExtension?: boolean;
  /** File extensions to include (default: ['.iff']) */
  extensions?: string[];
  /** Include subdirectories (default: true) */
  recursive?: boolean;
}

const DEFAULT_OPTIONS: Required<CrcTableOptions> = {
  lowercase: true,
  stripExtension: false,
  extensions: ['.iff'],
  recursive: true,
};

/**
 * Generate a CRC lookup table from a directory of templates
 * @param templateDir - Directory containing template files
 * @param options - Generation options
 * @returns The generated CRC table
 */
export async function generateCrcTable(
  templateDir: string,
  options: CrcTableOptions = {}
): Promise<CrcTable> {
  const { readdir } = await import('node:fs/promises');
  const { join, relative, extname } = await import('node:path');

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const table: CrcTable = {
    pathToCrc: {},
    crcToPath: {},
    count: 0,
    generatedAt: new Date().toISOString(),
  };

  const extensionSet = new Set(opts.extensions.map((e) => e.toLowerCase()));

  async function* walkDir(dir: string): AsyncGenerator<string> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && opts.recursive) {
        yield* walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (extensionSet.has(ext)) {
          yield fullPath;
        }
      }
    }
  }

  for await (const filePath of walkDir(templateDir)) {
    let relativePath = relative(templateDir, filePath);

    // Normalize path separators
    relativePath = relativePath.replace(/\\/g, '/');

    // Optionally strip extension
    if (opts.stripExtension) {
      const ext = extname(relativePath);
      relativePath = relativePath.slice(0, -ext.length);
    }

    // Optionally convert to lowercase
    const hashPath = opts.lowercase ? relativePath.toLowerCase() : relativePath;

    // Calculate CRC
    const crc = calculateCrc32(hashPath);
    const crcHex = crc.toString(16).padStart(8, '0');

    // Check for collisions
    if (table.crcToPath[crcHex] !== undefined) {
      console.warn(
        `CRC collision detected: ${hashPath} collides with ${table.crcToPath[crcHex]} (0x${crcHex})`
      );
    }

    // Add to tables
    table.pathToCrc[relativePath] = crc;
    table.crcToPath[crcHex] = relativePath;
    table.count++;
  }

  return table;
}

/**
 * Generate CRC table entries from a list of paths
 * @param paths - Array of paths to hash
 * @param options - Generation options
 * @returns Array of CRC entries
 */
export function generateCrcEntries(
  paths: string[],
  options: CrcTableOptions = {}
): CrcEntry[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const entries: CrcEntry[] = [];

  for (let path of paths) {
    // Normalize path separators
    path = path.replace(/\\/g, '/');

    // Optionally strip extension
    if (opts.stripExtension) {
      // Find extension by looking for last dot
      const dotIndex = path.lastIndexOf('.');
      if (dotIndex > 0) {
        path = path.slice(0, dotIndex);
      }
    }

    // Optionally convert to lowercase
    const hashPath = opts.lowercase ? path.toLowerCase() : path;

    entries.push({
      path,
      crc: calculateCrc32(hashPath),
    });
  }

  return entries;
}

/**
 * Convert a CRC table to JSON string for export
 * @param table - The CRC table to serialize
 * @param pretty - Whether to pretty-print the JSON (default: true)
 * @returns JSON string representation
 */
export function crcTableToJson(table: CrcTable, pretty: boolean = true): string {
  return JSON.stringify(table, null, pretty ? 2 : undefined);
}

/**
 * Load a CRC table from JSON
 * @param json - JSON string to parse
 * @returns The parsed CRC table
 */
export function crcTableFromJson(json: string): CrcTable {
  const parsed = JSON.parse(json) as CrcTable;

  // Validate structure
  if (
    typeof parsed.pathToCrc !== 'object' ||
    typeof parsed.crcToPath !== 'object' ||
    typeof parsed.count !== 'number'
  ) {
    throw new Error('Invalid CRC table format');
  }

  return parsed;
}

/**
 * Look up a path by its CRC
 * @param table - The CRC table to search
 * @param crc - The CRC to look up (number or hex string)
 * @returns The path or undefined if not found
 */
export function lookupByCrc(table: CrcTable, crc: number | string): string | undefined {
  const crcHex = typeof crc === 'number' ? crc.toString(16).padStart(8, '0') : crc.toLowerCase();
  return table.crcToPath[crcHex];
}

/**
 * Look up a CRC by its path
 * @param table - The CRC table to search
 * @param path - The path to look up
 * @returns The CRC or undefined if not found
 */
export function lookupByPath(table: CrcTable, path: string): number | undefined {
  // Try exact match first
  if (table.pathToCrc[path] !== undefined) {
    return table.pathToCrc[path];
  }

  // Try lowercase
  const lowerPath = path.toLowerCase();
  if (table.pathToCrc[lowerPath] !== undefined) {
    return table.pathToCrc[lowerPath];
  }

  // Try with normalized separators
  const normalizedPath = path.replace(/\\/g, '/');
  if (table.pathToCrc[normalizedPath] !== undefined) {
    return table.pathToCrc[normalizedPath];
  }

  return undefined;
}

/**
 * Merge multiple CRC tables into one
 * @param tables - Array of tables to merge
 * @returns Merged CRC table
 */
export function mergeCrcTables(...tables: CrcTable[]): CrcTable {
  const merged: CrcTable = {
    pathToCrc: {},
    crcToPath: {},
    count: 0,
    generatedAt: new Date().toISOString(),
  };

  for (const table of tables) {
    for (const [path, crc] of Object.entries(table.pathToCrc)) {
      const crcHex = crc.toString(16).padStart(8, '0');

      // Check for collisions
      if (merged.crcToPath[crcHex] !== undefined && merged.crcToPath[crcHex] !== path) {
        console.warn(
          `CRC collision during merge: ${path} collides with ${merged.crcToPath[crcHex]} (0x${crcHex})`
        );
      }

      merged.pathToCrc[path] = crc;
      merged.crcToPath[crcHex] = path;
    }
  }

  merged.count = Object.keys(merged.pathToCrc).length;

  return merged;
}

/**
 * Export CRC table as a TypeScript const for embedding in code
 * @param table - The CRC table to export
 * @param varName - Variable name to use (default: 'CRC_TABLE')
 * @returns TypeScript source code
 */
export function crcTableToTypeScript(table: CrcTable, varName: string = 'CRC_TABLE'): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Auto-generated CRC lookup table for SWG templates');
  lines.push(` * Generated at: ${table.generatedAt}`);
  lines.push(` * Total entries: ${table.count}`);
  lines.push(' * DO NOT EDIT - This file is automatically generated');
  lines.push(' */');
  lines.push('');

  // Export path to CRC mapping
  lines.push(`export const ${varName}_PATH_TO_CRC: Record<string, number> = {`);
  const sortedPaths = Object.keys(table.pathToCrc).sort();
  for (const path of sortedPaths) {
    const crc = table.pathToCrc[path];
    lines.push(`  '${path.replace(/'/g, "\\'")}': 0x${crc?.toString(16).padStart(8, '0')},`);
  }
  lines.push('};');
  lines.push('');

  // Export CRC to path mapping
  lines.push(`export const ${varName}_CRC_TO_PATH: Record<number, string> = {`);
  const sortedCrcs = Object.keys(table.crcToPath).sort();
  for (const crcHex of sortedCrcs) {
    const path = table.crcToPath[crcHex];
    lines.push(`  0x${crcHex}: '${path?.replace(/'/g, "\\'")}',`);
  }
  lines.push('};');
  lines.push('');

  // Export helper functions
  lines.push(`export function lookup${varName}ByCrc(crc: number): string | undefined {`);
  lines.push(`  return ${varName}_CRC_TO_PATH[crc];`);
  lines.push('}');
  lines.push('');

  lines.push(`export function lookup${varName}ByPath(path: string): number | undefined {`);
  lines.push(`  return ${varName}_PATH_TO_CRC[path.toLowerCase()];`);
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
