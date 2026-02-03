/**
 * TypeScript type generation from TAB file schemas
 */

import type { TabColumn, TabColumnType } from './tab-parser.js';

/**
 * Table schema for type generation
 */
export interface TableSchema {
  name: string;
  columns: TabColumn[];
  rawTypes: string[];
}

/**
 * Options for type generation
 */
export interface TypeGeneratorOptions {
  /** Add JSDoc comments for columns */
  includeComments?: boolean;
  /** Export types (default: true) */
  exportTypes?: boolean;
  /** Use readonly properties */
  readonly?: boolean;
  /** Prefix for interface names */
  interfacePrefix?: string;
  /** Suffix for interface names */
  interfaceSuffix?: string;
}

const DEFAULT_OPTIONS: Required<TypeGeneratorOptions> = {
  includeComments: true,
  exportTypes: true,
  readonly: false,
  interfacePrefix: '',
  interfaceSuffix: '',
};

/**
 * Map TAB column type to TypeScript type
 */
export function mapTypeToTypeScript(tabType: TabColumnType): string {
  switch (tabType) {
    case 's': // string
    case 'e': // enum
    case 'p': // packed
    case 'v': // vector (stored as string)
    case 'c': // comment/custom
    case 'k': // key
    case 'l': // localized string
    case 't': // template
      return 'string';

    case 'i': // integer
    case 'f': // float
    case 'h': // hex
    case 'z': // crc/hash
      return 'number';

    case 'b': // boolean
      return 'boolean';

    default:
      // Unknown types default to string
      return 'string';
  }
}

/**
 * Get a description for a TAB type
 */
export function getTypeDescription(tabType: TabColumnType): string {
  switch (tabType) {
    case 's':
      return 'string';
    case 'i':
      return 'integer';
    case 'f':
      return 'float';
    case 'b':
      return 'boolean';
    case 'e':
      return 'enum';
    case 'h':
      return 'hex value';
    case 'p':
      return 'packed data';
    case 'v':
      return 'vector';
    case 'c':
      return 'custom';
    case 'k':
      return 'key';
    case 'l':
      return 'localized string';
    case 't':
      return 'template reference';
    case 'z':
      return 'CRC/hash';
    default:
      return `unknown (${tabType})`;
  }
}

/**
 * Convert a table name to a valid TypeScript interface name
 */
export function toInterfaceName(tableName: string, options: TypeGeneratorOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Remove file extension
  let name = tableName.replace(/\.[^.]+$/, '');

  // Convert to PascalCase
  name = name
    .split(/[-_\s./\\]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Ensure starts with letter
  if (!/^[A-Za-z]/.test(name)) {
    name = 'T' + name;
  }

  return `${opts.interfacePrefix}${name}${opts.interfaceSuffix}`;
}

/**
 * Convert a column name to a valid TypeScript property name
 */
export function toPropertyName(columnName: string): string {
  // If it contains special characters, we need to quote it
  if (/[^a-zA-Z0-9_$]/.test(columnName) || /^[0-9]/.test(columnName)) {
    return `'${columnName.replace(/'/g, "\\'")}'`;
  }
  return columnName;
}

/**
 * Check if a property name needs quotes
 */
export function needsQuotes(columnName: string): boolean {
  return /[^a-zA-Z0-9_$]/.test(columnName) || /^[0-9]/.test(columnName);
}

/**
 * Generate a TypeScript interface for a single table
 */
export function generateInterface(
  tableName: string,
  columns: TabColumn[],
  types: string[],
  options: TypeGeneratorOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const interfaceName = toInterfaceName(tableName, opts);

  const lines: string[] = [];

  // Add export keyword if needed
  const exportKeyword = opts.exportTypes ? 'export ' : '';

  lines.push(`${exportKeyword}interface ${interfaceName} {`);

  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (column === undefined) continue;

    const rawType = types[i] ?? 's';
    const tsType = mapTypeToTypeScript(column.type);
    const propName = toPropertyName(column.name);
    const readonlyPrefix = opts.readonly ? 'readonly ' : '';

    // Add JSDoc comment if enabled
    if (opts.includeComments) {
      const typeDesc = getTypeDescription(column.type);
      lines.push(`  /** TAB type: ${rawType} (${typeDesc}) */`);
    }

    lines.push(`  ${readonlyPrefix}${propName}: ${tsType};`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate a complete types file with all table interfaces
 */
export function generateTypesFile(
  tables: TableSchema[],
  options: TypeGeneratorOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const lines: string[] = [];

  // Add file header
  lines.push('/**');
  lines.push(' * Auto-generated TypeScript types from SWG TAB files');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(' * DO NOT EDIT - This file is automatically generated');
  lines.push(' */');
  lines.push('');

  // Generate each interface
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (table === undefined) continue;

    if (i > 0) {
      lines.push('');
    }

    lines.push(generateInterface(table.name, table.columns, table.rawTypes, opts));
  }

  // Add a union type if there are multiple tables
  if (tables.length > 1) {
    lines.push('');
    lines.push('/**');
    lines.push(' * Union of all generated table types');
    lines.push(' */');

    const typeNames = tables
      .filter((t): t is TableSchema => t !== undefined)
      .map((t) => toInterfaceName(t.name, opts));

    const exportKeyword = opts.exportTypes ? 'export ' : '';
    lines.push(`${exportKeyword}type AnyTableRow = ${typeNames.join(' | ')};`);
  }

  // Add a type map for table name -> row type
  if (tables.length > 0) {
    lines.push('');
    lines.push('/**');
    lines.push(' * Map of table names to their row types');
    lines.push(' */');

    const exportKeyword = opts.exportTypes ? 'export ' : '';
    lines.push(`${exportKeyword}interface TableTypeMap {`);

    for (const table of tables) {
      if (table === undefined) continue;
      const interfaceName = toInterfaceName(table.name, opts);
      // Use the original table name as the key
      const safeName = table.name.includes("'")
        ? `"${table.name}"`
        : `'${table.name}'`;
      lines.push(`  ${safeName}: ${interfaceName};`);
    }

    lines.push('}');
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate type definition for a single table as a standalone string
 */
export function generateTableType(
  tableName: string,
  columns: TabColumn[],
  types: string[],
  options: TypeGeneratorOptions = {}
): { interfaceName: string; definition: string } {
  const interfaceName = toInterfaceName(tableName, options);
  const definition = generateInterface(tableName, columns, types, options);

  return { interfaceName, definition };
}
