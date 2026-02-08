/**
 * DataTable Converter - File I/O wrapper for DTII datatable parsing
 *
 * Handles single-file and batch conversion of SWG binary datatable files
 * (.iff in DTII format) to JSON.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative, dirname, extname } from 'node:path';
import { parseDataTable, type DataTableResult } from './datatable-parser.js';

export interface ConversionStats {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

export class DataTableConverter {
  /**
   * Parse a file and return the result (no file output)
   */
  async parseFile(inputPath: string): Promise<DataTableResult> {
    const fullPath = resolve(inputPath);
    const data = await readFile(fullPath);
    return parseDataTable(new Uint8Array(data), fullPath);
  }

  /**
   * Convert a single file to JSON
   */
  async convertFile(inputPath: string, outputPath: string): Promise<void> {
    const result = await this.parseFile(inputPath);
    const json = JSON.stringify(result.rows, null, 2);
    const outFull = resolve(outputPath);
    await mkdir(dirname(outFull), { recursive: true });
    await writeFile(outFull, json);
  }

  /**
   * Convert a directory of .iff datatable files to .json
   */
  async convertDirectory(
    inputDir: string,
    outputDir: string,
    options?: { recursive?: boolean; verbose?: boolean }
  ): Promise<ConversionStats> {
    const recursive = options?.recursive ?? true;
    const verbose = options?.verbose ?? false;

    const inputPath = resolve(inputDir);
    const outputPath = resolve(outputDir);

    const stats: ConversionStats = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for await (const filePath of walkIffFiles(inputPath, recursive)) {
      stats.processed++;
      const relativePath = relative(inputPath, filePath);

      try {
        const data = await readFile(filePath);
        const result = parseDataTable(new Uint8Array(data), relativePath);
        const json = JSON.stringify(result.rows, null, 2);

        const outFile = join(outputPath, relativePath.replace(/\.iff$/i, '.json'));
        await mkdir(dirname(outFile), { recursive: true });
        await writeFile(outFile, json);

        stats.successful++;
        if (verbose) {
          console.log(`  OK: ${relativePath} (${result.rowCount} rows, ${result.columnCount} cols)`);
        }
      } catch (e) {
        stats.failed++;
        const errMsg = e instanceof Error ? e.message : String(e);
        stats.errors.push({ file: relativePath, error: errMsg });
        if (verbose) {
          console.log(`  FAIL: ${relativePath}: ${errMsg}`);
        }
      }
    }

    return stats;
  }
}

/**
 * Walk a directory yielding .iff file paths
 */
async function* walkIffFiles(dir: string, recursive: boolean): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      yield* walkIffFiles(fullPath, recursive);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.iff') {
      yield fullPath;
    }
  }
}
