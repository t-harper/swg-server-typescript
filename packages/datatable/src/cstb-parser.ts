import { IffDataReader } from './iff-data-reader.js';

export interface CrcStringTable {
  /** Map from CRC to template path */
  crcToPath: Map<number, string>;
  /** Map from template path to CRC */
  pathToCrc: Map<string, number>;
  /** Number of entries */
  entryCount: number;
}

/**
 * Parse a CSTB (CRC String Table) binary file.
 * Used for object_template_crc_string_table.iff
 */
export function parseCrcStringTable(buffer: Uint8Array): CrcStringTable {
  const reader = new IffDataReader(buffer);

  // Read outer FORM header
  const outerTag = readTag(reader);
  if (outerTag !== 'FORM') throw new Error(`Expected FORM, got "${outerTag}"`);
  reader.readUint32BE(); // outer size
  const formType = readTag(reader);
  if (formType !== 'CSTB') throw new Error(`Expected CSTB form type, got "${formType}"`);

  // Read inner FORM header
  const innerTag = readTag(reader);
  if (innerTag !== 'FORM') throw new Error(`Expected inner FORM, got "${innerTag}"`);
  reader.readUint32BE(); // inner size
  readTag(reader); // version "0000"

  // Read DATA chunk
  const dataTag = readTag(reader);
  if (dataTag !== 'DATA') throw new Error(`Expected DATA chunk, got "${dataTag}"`);
  reader.readUint32BE(); // data size
  const entryCount = reader.readInt32LE() >>> 0;

  // Read CRCT chunk
  const crctTag = readTag(reader);
  if (crctTag !== 'CRCT') throw new Error(`Expected CRCT chunk, got "${crctTag}"`);
  reader.readUint32BE(); // crct size
  const crcs = new Uint32Array(entryCount);
  for (let i = 0; i < entryCount; i++) {
    crcs[i] = reader.readInt32LE() >>> 0;
  }

  // Read STRT chunk
  const strtTag = readTag(reader);
  if (strtTag !== 'STRT') throw new Error(`Expected STRT chunk, got "${strtTag}"`);
  reader.readUint32BE(); // strt size
  const offsets = new Uint32Array(entryCount);
  for (let i = 0; i < entryCount; i++) {
    offsets[i] = reader.readInt32LE() >>> 0;
  }

  // Read STNG chunk
  const stngTag = readTag(reader);
  if (stngTag !== 'STNG') throw new Error(`Expected STNG chunk, got "${stngTag}"`);
  const stngSize = reader.readUint32BE();
  const stngStart = reader.position;

  // Build maps
  const crcToPath = new Map<number, string>();
  const pathToCrc = new Map<string, number>();

  for (let i = 0; i < entryCount; i++) {
    const strOffset = stngStart + offsets[i]!;
    // Read null-terminated string from buffer
    let end = strOffset;
    while (end < stngStart + stngSize && buffer[end] !== 0) end++;
    const path = new TextDecoder('ascii').decode(buffer.subarray(strOffset, end));

    crcToPath.set(crcs[i]!, path);
    pathToCrc.set(path, crcs[i]!);
  }

  return { crcToPath, pathToCrc, entryCount };
}

function readTag(reader: IffDataReader): string {
  const bytes = reader.readBytes(4);
  let tag = '';
  for (let i = 0; i < 4; i++) {
    tag += String.fromCharCode(bytes[i] ?? 0);
  }
  return tag;
}
