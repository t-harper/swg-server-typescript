/**
 * TAB file parsing logic for SWG data files
 */

/**
 * Supported TAB column types
 */
export type TabColumnType =
  | 's' // string
  | 'i' // integer
  | 'f' // float
  | 'b' // boolean
  | 'e' // enum (treated as string)
  | 'h' // hex (treated as number)
  | 'p' // packed (treated as string)
  | 'v' // vector (treated as string)
  | 'c' // comment/custom (treated as string)
  | 'k' // key (treated as string)
  | 'l' // localized string (treated as string)
  | 't' // template (treated as string)
  | 'z' // crc/hash (treated as number)
  | string; // fallback for unknown types

/**
 * Column definition from TAB header
 */
export interface TabColumn {
  name: string;
  type: TabColumnType;
  index: number;
}

/**
 * Parsed TAB file result
 */
export interface ParsedTabFile<T = Record<string, unknown>> {
  columns: TabColumn[];
  rows: T[];
  rawTypes: string[];
}

/**
 * Parse error with context
 */
export class TabParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column?: number,
    public readonly value?: string
  ) {
    super(`${message} at line ${line}${column !== undefined ? `, column ${column}` : ''}${value !== undefined ? `: "${value}"` : ''}`);
    this.name = 'TabParseError';
  }
}

/**
 * Check if a line is a comment
 */
export function isComment(line: string): boolean {
  return line.trimStart().startsWith('//');
}

/**
 * Check if a line is empty or whitespace only
 */
export function isEmpty(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * Parse the header line to extract column names
 */
export function parseHeader(line: string): string[] {
  if (isEmpty(line) || isComment(line)) {
    throw new TabParseError('Header line cannot be empty or a comment', 1);
  }

  const columns = line.split('\t');

  // Validate column names
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (col === undefined) {
      throw new TabParseError('Invalid column', 1, i);
    }
    // Allow empty column names (some TAB files have trailing tabs)
    const trimmed = col.trim();
    if (trimmed.length > 0) {
      columns[i] = trimmed;
    } else {
      columns[i] = `column_${i}`;
    }
  }

  return columns;
}

/**
 * Parse the types line to extract column types
 */
export function parseTypes(line: string): string[] {
  if (isEmpty(line) || isComment(line)) {
    throw new TabParseError('Types line cannot be empty or a comment', 2);
  }

  const types = line.split('\t').map((t) => t.trim().toLowerCase());

  return types;
}

/**
 * Convert a single value based on its type
 */
export function convertValue(
  value: string,
  type: TabColumnType,
  columnName: string,
  lineNumber: number
): unknown {
  // Handle NULL and empty values
  const trimmed = value.trim();

  if (trimmed === '' || trimmed.toUpperCase() === 'NULL') {
    // Return type-appropriate default for empty/null
    switch (type) {
      case 'i':
      case 'h':
      case 'z':
        return 0;
      case 'f':
        return 0.0;
      case 'b':
        return false;
      default:
        return '';
    }
  }

  switch (type) {
    case 's': // string
    case 'e': // enum
    case 'p': // packed
    case 'v': // vector
    case 'c': // comment/custom
    case 'k': // key
    case 'l': // localized string
    case 't': // template
      return trimmed;

    case 'i': // integer
      return parseInteger(trimmed, columnName, lineNumber);

    case 'f': // float
      return parseFloat_(trimmed, columnName, lineNumber);

    case 'b': // boolean
      return parseBoolean(trimmed);

    case 'h': // hex
      return parseHex(trimmed, columnName, lineNumber);

    case 'z': // crc/hash
      return parseCrcHash(trimmed, columnName, lineNumber);

    default:
      // Unknown type, treat as string
      return trimmed;
  }
}

/**
 * Parse an integer value
 */
function parseInteger(value: string, columnName: string, lineNumber: number): number {
  // Handle hex notation
  if (value.startsWith('0x') || value.startsWith('0X')) {
    const parsed = parseInt(value, 16);
    if (isNaN(parsed)) {
      throw new TabParseError(`Invalid hex integer in column "${columnName}"`, lineNumber, undefined, value);
    }
    return parsed;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new TabParseError(`Invalid integer in column "${columnName}"`, lineNumber, undefined, value);
  }
  return parsed;
}

/**
 * Parse a float value
 */
function parseFloat_(value: string, columnName: string, lineNumber: number): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new TabParseError(`Invalid float in column "${columnName}"`, lineNumber, undefined, value);
  }
  return parsed;
}

/**
 * Parse a boolean value
 */
function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
}

/**
 * Parse a hex value
 */
function parseHex(value: string, columnName: string, lineNumber: number): number {
  let hexValue = value;
  if (hexValue.startsWith('0x') || hexValue.startsWith('0X')) {
    hexValue = hexValue.slice(2);
  }

  const parsed = parseInt(hexValue, 16);
  if (isNaN(parsed)) {
    throw new TabParseError(`Invalid hex value in column "${columnName}"`, lineNumber, undefined, value);
  }
  return parsed;
}

/**
 * Parse a CRC/hash value (can be hex or decimal)
 */
function parseCrcHash(value: string, columnName: string, lineNumber: number): number {
  if (value.startsWith('0x') || value.startsWith('0X')) {
    return parseHex(value, columnName, lineNumber);
  }
  return parseInteger(value, columnName, lineNumber);
}

/**
 * Parse a single data row
 */
export function parseRow(
  line: string,
  columns: TabColumn[],
  lineNumber: number
): Record<string, unknown> {
  const values = line.split('\t');
  const row: Record<string, unknown> = {};

  for (const column of columns) {
    const value = values[column.index];
    const rawValue = value ?? '';

    row[column.name] = convertValue(rawValue, column.type, column.name, lineNumber);
  }

  return row;
}

/**
 * Parse a complete TAB file content
 */
export function parseTabContent<T = Record<string, unknown>>(
  content: string,
  fileName?: string
): ParsedTabFile<T> {
  const lines = content.split(/\r?\n/);
  const dataLines: string[] = [];

  // Filter out comments and empty lines, preserving original line numbers
  const lineMap: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && !isEmpty(line) && !isComment(line)) {
      dataLines.push(line);
      lineMap.push(i + 1); // 1-indexed line numbers
    }
  }

  if (dataLines.length < 2) {
    throw new TabParseError(
      `TAB file must have at least header and type lines${fileName ? ` (${fileName})` : ''}`,
      1
    );
  }

  const headerLine = dataLines[0];
  const typesLine = dataLines[1];

  if (headerLine === undefined || typesLine === undefined) {
    throw new TabParseError('Missing header or types line', 1);
  }

  // Parse header and types
  const columnNames = parseHeader(headerLine);
  const rawTypes = parseTypes(typesLine);

  // Build column definitions
  const columns: TabColumn[] = columnNames.map((name, index) => ({
    name,
    type: rawTypes[index] ?? 's',
    index,
  }));

  // Parse data rows
  const rows: T[] = [];
  for (let i = 2; i < dataLines.length; i++) {
    const line = dataLines[i];
    const originalLineNumber = lineMap[i];

    if (line === undefined || originalLineNumber === undefined) {
      continue;
    }

    try {
      const row = parseRow(line, columns, originalLineNumber);
      rows.push(row as T);
    } catch (error) {
      if (error instanceof TabParseError) {
        throw error;
      }
      throw new TabParseError(
        `Error parsing row: ${error instanceof Error ? error.message : String(error)}`,
        originalLineNumber
      );
    }
  }

  return {
    columns,
    rows,
    rawTypes,
  };
}
