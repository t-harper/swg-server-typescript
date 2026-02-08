/**
 * DataTable Parser for SWG DTII binary format
 *
 * Parses binary IFF datatable files (.iff) containing game configuration data.
 * These files use the DTII (DataTable IFF) format with COLS, TYPE, and ROWS chunks.
 *
 * Reads raw bytes directly using IffDataReader to avoid the IffParser's
 * even-boundary padding which breaks DTII files.
 */

import { IffDataReader } from './iff-parser.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DataTableBasicType = 'int' | 'float' | 'string' | 'comment';

export interface DataTableColumnType {
  /** Underlying storage type */
  basicType: DataTableBasicType;
  /** Raw typespec string (e.g. "e(red=0,green=1)") */
  typeSpec: string;
  /** Single char: i,f,s,h,e,b,v,p,z,c */
  typeChar: string;
  /** Default value from [...] suffix */
  defaultValue?: string | number;
  /** For 'e' and 'v' types: label → int value */
  enumMap?: Map<string, number>;
  /** For 'e' and 'v' types: int value → label */
  enumReverse?: Map<number, string>;
}

export interface DataTableColumn {
  name: string;
  index: number;
  type: DataTableColumnType;
}

export interface DataTableResult {
  /** Source filename */
  name: string;
  /** Format version: "0000" or "0001" */
  version: string;
  columns: DataTableColumn[];
  /** Array of {columnName: value} objects */
  rows: Record<string, unknown>[];
  rowCount: number;
  columnCount: number;
}

// ── Typespec Parsing ───────────────────────────────────────────────────────────

/**
 * Map a typespec character to its basic storage type
 */
export function getBasicType(typeChar: string): DataTableBasicType {
  switch (typeChar) {
    case 'i': // integer
    case 'h': // hex integer
    case 'b': // boolean (stored as i32)
    case 'e': // enum (stored as i32)
    case 'v': // bitvector (stored as i32)
    case 'z': // zero/unused integer
      return 'int';
    case 'f': // float
      return 'float';
    case 's': // string
    case 'p': // path string
      return 'string';
    case 'c': // comment (not stored in binary)
      return 'comment';
    default:
      return 'string';
  }
}

/**
 * Parse a typespec string into structured type info.
 *
 * Format: `<char>[(<key=val,...>)][<[default]>]`
 *
 * Examples:
 * - "s" → string
 * - "i[42]" → int, default 42
 * - "f[0]" → float, default 0
 * - "b[1]" → int (bool), default 1
 * - "e(red=0,green=1,blue=2)" → int with enum map
 * - "e(red=0,green=1)[red]" → int with enum + default label
 * - "v(flag1=1,flag2=2)" → int with bitvector map
 */
export function parseTypeSpec(spec: string): DataTableColumnType {
  const typeChar = spec.charAt(0);
  const basicType = getBasicType(typeChar);

  const result: DataTableColumnType = {
    basicType,
    typeSpec: spec,
    typeChar,
  };

  // Parse enum/bitvector definitions in (...)
  const parenStart = spec.indexOf('(');
  const parenEnd = spec.lastIndexOf(')');
  if (parenStart !== -1 && parenEnd !== -1 && parenEnd > parenStart) {
    const enumBody = spec.substring(parenStart + 1, parenEnd);
    const enumMap = new Map<string, number>();
    const enumReverse = new Map<number, string>();

    const entries = enumBody.split(',');
    for (const entry of entries) {
      const eqIndex = entry.lastIndexOf('=');
      if (eqIndex !== -1) {
        const key = entry.substring(0, eqIndex).trim();
        const val = parseInt(entry.substring(eqIndex + 1).trim(), 10);
        if (!isNaN(val)) {
          enumMap.set(key, val);
          // Only set reverse if not already set (first label wins for a value)
          if (!enumReverse.has(val)) {
            enumReverse.set(val, key);
          }
        }
      }
    }

    if (enumMap.size > 0) {
      result.enumMap = enumMap;
      result.enumReverse = enumReverse;
    }
  }

  // Parse default value in [...]
  const bracketStart = spec.lastIndexOf('[');
  const bracketEnd = spec.lastIndexOf(']');
  if (bracketStart !== -1 && bracketEnd !== -1 && bracketEnd > bracketStart) {
    const defaultStr = spec.substring(bracketStart + 1, bracketEnd);

    if (basicType === 'float') {
      const parsed = parseFloat(defaultStr);
      if (!isNaN(parsed)) {
        result.defaultValue = parsed;
      }
    } else if (basicType === 'int') {
      // Could be a number or an enum label
      const parsed = parseInt(defaultStr, 10);
      if (!isNaN(parsed)) {
        result.defaultValue = parsed;
      } else {
        // Might be an enum label reference
        result.defaultValue = defaultStr;
      }
    } else {
      result.defaultValue = defaultStr;
    }
  }

  return result;
}

// ── Main Parser ────────────────────────────────────────────────────────────────

/**
 * Parse a single DTII datatable file from raw bytes.
 *
 * Reads the IFF structure directly (without IffParser) to avoid
 * the even-boundary padding that breaks DTII chunk alignment.
 */
export function parseDataTable(buffer: Uint8Array, name?: string): DataTableResult {
  const reader = new IffDataReader(buffer);

  // ── Outer FORM header ──
  const outerTag = readTag(reader);
  if (outerTag !== 'FORM') {
    throw new Error(`Expected FORM tag, got "${outerTag}"`);
  }
  const _outerSize = reader.readUint32BE();
  const formType = readTag(reader);
  if (formType !== 'DTII') {
    throw new Error(`Expected DTII form type, got "${formType}"`);
  }

  // ── Inner FORM header (versioned) ──
  const innerTag = readTag(reader);
  if (innerTag !== 'FORM') {
    throw new Error(`Expected inner FORM tag, got "${innerTag}"`);
  }
  const _innerSize = reader.readUint32BE();
  const version = readTag(reader);

  // ── COLS chunk ──
  const colsTag = readTag(reader);
  if (colsTag !== 'COLS') {
    throw new Error(`Expected COLS chunk, got "${colsTag}"`);
  }
  const colsSize = reader.readUint32BE();
  const colsEnd = reader.position + colsSize;

  const columnCount = reader.readInt32LE();
  const columnNames: string[] = [];
  for (let i = 0; i < columnCount; i++) {
    columnNames.push(reader.readCString());
  }
  // Ensure we're at the end of the COLS chunk
  reader.seek(colsEnd);

  // ── TYPE chunk ──
  const typeTag = readTag(reader);
  if (typeTag !== 'TYPE') {
    throw new Error(`Expected TYPE chunk, got "${typeTag}"`);
  }
  const typeSize = reader.readUint32BE();
  const typeEnd = reader.position + typeSize;

  const columnTypes: DataTableColumnType[] = [];

  if (version === '0000') {
    // Legacy v0000: TYPE contains LE i32 enum values per column
    // 0=int, 1=float, 2=string, 3=comment(?)
    for (let i = 0; i < columnCount; i++) {
      const typeEnum = reader.readInt32LE();
      let basicType: DataTableBasicType;
      let typeChar: string;
      switch (typeEnum) {
        case 0:
          basicType = 'int';
          typeChar = 'i';
          break;
        case 1:
          basicType = 'float';
          typeChar = 'f';
          break;
        case 2:
          basicType = 'string';
          typeChar = 's';
          break;
        default:
          basicType = 'string';
          typeChar = 's';
          break;
      }
      columnTypes.push({
        basicType,
        typeSpec: typeChar,
        typeChar,
      });
    }
  } else {
    // v0001: null-terminated typespec strings
    for (let i = 0; i < columnCount; i++) {
      const spec = reader.readCString();
      columnTypes.push(parseTypeSpec(spec));
    }
  }
  // Ensure we're at the end of the TYPE chunk
  reader.seek(typeEnd);

  // ── ROWS chunk ──
  const rowsTag = readTag(reader);
  if (rowsTag !== 'ROWS') {
    throw new Error(`Expected ROWS chunk, got "${rowsTag}"`);
  }
  const _rowsSize = reader.readUint32BE();

  const rowCount = reader.readInt32LE();

  // Build column definitions
  const columns: DataTableColumn[] = columnNames.map((colName, i) => ({
    name: colName,
    index: i,
    type: columnTypes[i]!,
  }));

  // Filter out comment columns for reading (they have no binary data)
  const readableColumns = columns.filter((c) => c.type.basicType !== 'comment');

  // Read rows
  const rows: Record<string, unknown>[] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: Record<string, unknown> = {};

    for (const col of readableColumns) {
      switch (col.type.basicType) {
        case 'int':
          row[col.name] = reader.readInt32LE();
          break;
        case 'float':
          row[col.name] = reader.readFloat32LE();
          break;
        case 'string':
          row[col.name] = reader.readCString();
          break;
      }
    }

    // Set comment columns to empty string
    for (const col of columns) {
      if (col.type.basicType === 'comment') {
        row[col.name] = '';
      }
    }

    rows.push(row);
  }

  return {
    name: name ?? '',
    version,
    columns,
    rows,
    rowCount,
    columnCount,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Read a 4-byte ASCII tag from the reader
 */
function readTag(reader: IffDataReader): string {
  const bytes = reader.readBytes(4);
  let tag = '';
  for (let i = 0; i < 4; i++) {
    tag += String.fromCharCode(bytes[i] ?? 0);
  }
  return tag;
}
