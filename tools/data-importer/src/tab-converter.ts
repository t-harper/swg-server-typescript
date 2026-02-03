/**
 * Main TAB file converter for SWG data files
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, basename, dirname, extname, relative } from 'node:path';
import { parseTabContent, type ParsedTabFile, TabParseError } from './tab-parser.js';
import { generateTypesFile, type TableSchema, type TypeGeneratorOptions } from './type-generator.js';

/**
 * Conversion result statistics
 */
export interface ConversionResult {
  /** Total files processed (attempted) */
  filesProcessed: number;
  /** Files successfully converted */
  filesConverted: number;
  /** Error messages from failed conversions */
  errors: string[];
}

/**
 * Options for the TabConverter
 */
export interface TabConverterOptions {
  /** File extension for TAB files (default: '.tab') */
  tabExtension?: string;
  /** Indentation for JSON output (default: 2) */
  jsonIndent?: number;
  /** Generate TypeScript types alongside JSON (default: false) */
  generateTypes?: boolean;
  /** Options for type generation */
  typeGeneratorOptions?: TypeGeneratorOptions;
  /** Include metadata in JSON output (default: false) */
  includeMetadata?: boolean;
  /** Skip files that fail to parse instead of stopping (default: true) */
  continueOnError?: boolean;
  /** Custom logger (default: console) */
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

const DEFAULT_OPTIONS: Required<TabConverterOptions> = {
  tabExtension: '.tab',
  jsonIndent: 2,
  generateTypes: false,
  typeGeneratorOptions: {},
  includeMetadata: false,
  continueOnError: true,
  logger: {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg),
  },
};

/**
 * JSON output format when metadata is included
 */
interface JsonOutputWithMetadata<T = Record<string, unknown>> {
  _meta: {
    source: string;
    columns: string[];
    types: string[];
    rowCount: number;
    convertedAt: string;
  };
  data: T[];
}

/**
 * TAB file converter class
 */
export class TabConverter {
  private readonly options: Required<TabConverterOptions>;

  constructor(options: TabConverterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Parse a single TAB file and return the parsed data
   */
  async parseFile<T = Record<string, unknown>>(filePath: string): Promise<ParsedTabFile<T>> {
    const content = await readFile(filePath, 'utf-8');
    const fileName = basename(filePath);

    try {
      return parseTabContent<T>(content, fileName);
    } catch (error) {
      if (error instanceof TabParseError) {
        throw new Error(`Failed to parse ${fileName}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Convert a single TAB file to JSON
   */
  async convertFile(inputPath: string, outputPath: string): Promise<void> {
    const parsed = await this.parseFile(inputPath);
    const fileName = basename(inputPath);

    let output: unknown;

    if (this.options.includeMetadata) {
      const outputWithMeta: JsonOutputWithMetadata = {
        _meta: {
          source: fileName,
          columns: parsed.columns.map((c) => c.name),
          types: parsed.rawTypes,
          rowCount: parsed.rows.length,
          convertedAt: new Date().toISOString(),
        },
        data: parsed.rows,
      };
      output = outputWithMeta;
    } else {
      output = parsed.rows;
    }

    const json = JSON.stringify(output, null, this.options.jsonIndent);

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    await writeFile(outputPath, json, 'utf-8');

    this.options.logger.info(`Converted: ${fileName} -> ${basename(outputPath)}`);
  }

  /**
   * Convert a directory of TAB files to JSON
   */
  async convertDirectory(
    inputDir: string,
    outputDir: string,
    recursive: boolean = true
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      filesProcessed: 0,
      filesConverted: 0,
      errors: [],
    };

    const tableSchemas: TableSchema[] = [];

    await this.processDirectory(inputDir, outputDir, recursive, result, tableSchemas, inputDir);

    // Generate types file if enabled
    if (this.options.generateTypes && tableSchemas.length > 0) {
      try {
        const typesContent = generateTypesFile(tableSchemas, this.options.typeGeneratorOptions);
        const typesPath = join(outputDir, 'types.ts');
        await writeFile(typesPath, typesContent, 'utf-8');
        this.options.logger.info(`Generated types: ${typesPath}`);
      } catch (error) {
        const errorMsg = `Failed to generate types: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        this.options.logger.error(errorMsg);
      }
    }

    return result;
  }

  /**
   * Process a directory recursively
   */
  private async processDirectory(
    inputDir: string,
    outputDir: string,
    recursive: boolean,
    result: ConversionResult,
    tableSchemas: TableSchema[],
    baseInputDir: string
  ): Promise<void> {
    const entries = await readdir(inputDir, { withFileTypes: true });

    for (const entry of entries) {
      const inputPath = join(inputDir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          // Calculate relative output directory
          const relativeDir = relative(baseInputDir, inputPath);
          const subOutputDir = join(outputDir, relativeDir);

          await this.processDirectory(
            inputPath,
            subOutputDir,
            recursive,
            result,
            tableSchemas,
            baseInputDir
          );
        }
      } else if (entry.isFile() && this.isTabFile(entry.name)) {
        result.filesProcessed++;

        try {
          // Calculate output path
          const relativeFile = relative(baseInputDir, inputPath);
          const outputFileName = this.getOutputFileName(entry.name);
          const outputPath = join(outputDir, dirname(relativeFile), outputFileName);

          // Parse and convert
          const parsed = await this.parseFile(inputPath);

          // Store schema for type generation
          if (this.options.generateTypes) {
            tableSchemas.push({
              name: basename(entry.name, extname(entry.name)),
              columns: parsed.columns,
              rawTypes: parsed.rawTypes,
            });
          }

          // Write JSON output
          await this.writeJsonOutput(parsed, inputPath, outputPath);

          result.filesConverted++;
        } catch (error) {
          const errorMsg = `${entry.name}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          this.options.logger.error(`Error: ${errorMsg}`);

          if (!this.options.continueOnError) {
            throw error;
          }
        }
      }
    }
  }

  /**
   * Check if a file is a TAB file based on extension
   */
  private isTabFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith(this.options.tabExtension.toLowerCase());
  }

  /**
   * Get the output file name (replace .tab with .json)
   */
  private getOutputFileName(inputFileName: string): string {
    const baseName = basename(inputFileName, extname(inputFileName));
    return `${baseName}.json`;
  }

  /**
   * Write parsed data to JSON file
   */
  private async writeJsonOutput(
    parsed: ParsedTabFile,
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    const fileName = basename(inputPath);

    let output: unknown;

    if (this.options.includeMetadata) {
      const outputWithMeta: JsonOutputWithMetadata = {
        _meta: {
          source: fileName,
          columns: parsed.columns.map((c) => c.name),
          types: parsed.rawTypes,
          rowCount: parsed.rows.length,
          convertedAt: new Date().toISOString(),
        },
        data: parsed.rows,
      };
      output = outputWithMeta;
    } else {
      output = parsed.rows;
    }

    const json = JSON.stringify(output, null, this.options.jsonIndent);

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    await writeFile(outputPath, json, 'utf-8');

    this.options.logger.info(`Converted: ${fileName} -> ${basename(outputPath)}`);
  }

  /**
   * Get statistics about a TAB file without converting it
   */
  async getFileStats(filePath: string): Promise<{
    fileName: string;
    columnCount: number;
    rowCount: number;
    columns: Array<{ name: string; type: string }>;
    fileSize: number;
  }> {
    const [parsed, stats] = await Promise.all([
      this.parseFile(filePath),
      stat(filePath),
    ]);

    return {
      fileName: basename(filePath),
      columnCount: parsed.columns.length,
      rowCount: parsed.rows.length,
      columns: parsed.columns.map((c, i) => ({
        name: c.name,
        type: parsed.rawTypes[i] ?? 'unknown',
      })),
      fileSize: stats.size,
    };
  }

  /**
   * Validate a TAB file without converting it
   */
  async validateFile(filePath: string): Promise<{
    valid: boolean;
    error?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      const parsed = await this.parseFile(filePath);

      // Check for potential issues
      const uniqueColumns = new Set(parsed.columns.map((c) => c.name));
      if (uniqueColumns.size !== parsed.columns.length) {
        warnings.push('Duplicate column names detected');
      }

      if (parsed.rows.length === 0) {
        warnings.push('No data rows found');
      }

      return { valid: true, warnings };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        warnings,
      };
    }
  }
}
