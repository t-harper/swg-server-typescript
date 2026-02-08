/**
 * DataTableManager — singleton for lazy-loading and caching DTII datatable files.
 *
 * Mirrors the C++ DataTableManager pattern: call `install(dataRoot)` once at
 * startup, then `getTable("datatables/buildout/tatooine/tatooine_1_1.iff")`
 * to read-and-cache on demand.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDataTable, type DataTableResult } from './datatable-parser.js';

export class DataTableManager {
  private static instance: DataTableManager | undefined;

  private cache = new Map<string, DataTableResult>();
  private readonly dataRoot: string;

  private constructor(dataRoot: string) {
    this.dataRoot = dataRoot;
  }

  /**
   * Create the singleton with the given data root directory.
   * Typically `data/serverdata` relative to the project root.
   */
  static install(dataRoot: string): DataTableManager {
    DataTableManager.instance = new DataTableManager(dataRoot);
    console.log(`[DataTableManager] Installed with data root: ${dataRoot}`);
    return DataTableManager.instance;
  }

  /**
   * Get the singleton. Throws if `install()` has not been called.
   */
  static getInstance(): DataTableManager {
    if (!DataTableManager.instance) {
      throw new Error('DataTableManager not installed — call DataTableManager.install(dataRoot) first');
    }
    return DataTableManager.instance;
  }

  /**
   * Reset the singleton (for testing).
   */
  static resetInstance(): void {
    DataTableManager.instance = undefined;
  }

  /**
   * Lazy-load and cache a datatable by its path relative to dataRoot.
   *
   * Returns `undefined` if the file does not exist (matches C++ `openIfNotFound=true`).
   */
  getTable(path: string): DataTableResult | undefined {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const fullPath = resolve(this.dataRoot, path);
    try {
      const data = readFileSync(fullPath);
      const result = parseDataTable(new Uint8Array(data), path);
      this.cache.set(path, result);
      return result;
    } catch {
      // File not found or parse error — return undefined like C++
      return undefined;
    }
  }

  /**
   * Force-reload a table from disk, updating the cache.
   */
  reloadTable(path: string): DataTableResult | undefined {
    this.cache.delete(path);
    return this.getTable(path);
  }

  /**
   * Remove a table from the cache.
   */
  closeTable(path: string): void {
    this.cache.delete(path);
  }

  /**
   * Check whether a table is currently cached.
   */
  isLoaded(path: string): boolean {
    return this.cache.has(path);
  }

  /**
   * Number of tables currently in the cache.
   */
  getLoadedTableCount(): number {
    return this.cache.size;
  }

  /**
   * Get the data root directory.
   */
  getDataRoot(): string {
    return this.dataRoot;
  }

  // ── Convenience accessors (mirror C++ DataTable API) ──

  getIntValue(table: DataTableResult, column: string, row: number): number {
    const val = table.rows[row]?.[column];
    return typeof val === 'number' ? val : 0;
  }

  getFloatValue(table: DataTableResult, column: string, row: number): number {
    const val = table.rows[row]?.[column];
    return typeof val === 'number' ? val : 0;
  }

  getStringValue(table: DataTableResult, column: string, row: number): string {
    const val = table.rows[row]?.[column];
    return typeof val === 'string' ? val : '';
  }

  /**
   * Search a column for a matching string value, returning the row index.
   * Returns -1 if not found.
   */
  searchColumnString(table: DataTableResult, column: string, value: string): number {
    for (let i = 0; i < table.rows.length; i++) {
      if (table.rows[i]?.[column] === value) return i;
    }
    return -1;
  }
}
