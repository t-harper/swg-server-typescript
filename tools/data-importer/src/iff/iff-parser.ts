/**
 * IFF (Interchange File Format) binary format parser for SWG game data
 *
 * IFF is a container format using nested chunks. Each chunk has:
 * - 4-byte type identifier (ASCII)
 * - 4-byte size (big-endian)
 * - Data payload (raw bytes or nested chunks for FORM types)
 *
 * FORM chunks are containers that hold other chunks and have an additional
 * 4-byte type identifier after the size field.
 */

/**
 * Represents a parsed IFF chunk
 */
export interface IffChunk {
  /** 4-character type identifier (e.g., 'FORM', 'DATA', 'XXXX') */
  type: string;
  /** Size of the chunk data in bytes */
  size: number;
  /** Raw data bytes or array of nested chunks for FORM types */
  data: Uint8Array | IffChunk[];
  /** For FORM chunks, the specific form type (e.g., 'SHOT', 'STOT') */
  formType?: string;
}

/**
 * Error thrown during IFF parsing
 */
export class IffParseError extends Error {
  constructor(
    message: string,
    public readonly offset: number,
    public readonly chunkType?: string
  ) {
    super(
      `${message} at offset ${offset}${chunkType ? ` (chunk: ${chunkType})` : ''}`
    );
    this.name = 'IffParseError';
  }
}

/**
 * IFF binary format parser
 *
 * Parses IFF files into a tree structure of chunks. Supports nested FORM
 * containers to unlimited depth.
 */
export class IffParser {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number;

  constructor() {
    this.buffer = new Uint8Array(0);
    this.view = new DataView(this.buffer.buffer);
    this.offset = 0;
  }

  /**
   * Parse an IFF file from a Uint8Array buffer
   * @param buffer - The raw bytes of the IFF file
   * @returns The root IFF chunk (typically a FORM)
   */
  parse(buffer: Uint8Array): IffChunk {
    this.buffer = buffer;
    this.view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    this.offset = 0;

    if (buffer.length < 8) {
      throw new IffParseError('Buffer too small for IFF header', 0);
    }

    return this.parseChunk();
  }

  /**
   * Parse a single chunk at the current offset
   */
  private parseChunk(): IffChunk {
    const startOffset = this.offset;

    if (this.offset + 8 > this.buffer.length) {
      throw new IffParseError('Unexpected end of file reading chunk header', this.offset);
    }

    // Read 4-byte type (ASCII)
    const type = this.readType();

    // Read 4-byte size (big-endian)
    const size = this.readUint32BE();

    // Validate size
    if (this.offset + size > this.buffer.length) {
      throw new IffParseError(
        `Chunk size ${size} exceeds remaining buffer (${this.buffer.length - this.offset} bytes)`,
        startOffset,
        type
      );
    }

    // Check if this is a FORM container
    if (type === 'FORM') {
      return this.parseFormChunk(size);
    }

    // Regular data chunk
    const data = this.buffer.slice(this.offset, this.offset + size);
    this.offset += size;

    // IFF chunks are padded to even boundaries
    if (size % 2 !== 0 && this.offset < this.buffer.length) {
      this.offset += 1;
    }

    return { type, size, data };
  }

  /**
   * Parse a FORM container chunk
   */
  private parseFormChunk(size: number): IffChunk {
    const formStartOffset = this.offset;
    const formEndOffset = formStartOffset + size;

    if (size < 4) {
      throw new IffParseError('FORM chunk too small for form type', this.offset - 4, 'FORM');
    }

    // Read the form type (e.g., 'SHOT', 'STOT')
    const formType = this.readType();

    // Parse child chunks
    const children: IffChunk[] = [];

    while (this.offset < formEndOffset) {
      // Check if we have enough bytes for another chunk header
      if (this.offset + 8 > formEndOffset) {
        // Not enough space for another chunk, might be padding
        break;
      }

      const child = this.parseChunk();
      children.push(child);
    }

    // Ensure we're at the end of the FORM
    this.offset = formEndOffset;

    // IFF chunks are padded to even boundaries
    if (size % 2 !== 0 && this.offset < this.buffer.length) {
      this.offset += 1;
    }

    return {
      type: 'FORM',
      size,
      data: children,
      formType,
    };
  }

  /**
   * Read a 4-byte ASCII type identifier
   */
  private readType(): string {
    const bytes = this.buffer.slice(this.offset, this.offset + 4);
    this.offset += 4;

    // Convert to ASCII string
    let type = '';
    for (let i = 0; i < 4; i++) {
      type += String.fromCharCode(bytes[i] ?? 0);
    }
    return type;
  }

  /**
   * Read a 4-byte big-endian unsigned integer
   */
  private readUint32BE(): number {
    const value = this.view.getUint32(this.offset, false); // false = big-endian
    this.offset += 4;
    return value;
  }

  /**
   * Check if a chunk is a FORM container
   */
  static isForm(chunk: IffChunk): boolean {
    return chunk.type === 'FORM' && Array.isArray(chunk.data);
  }

  /**
   * Find the first chunk of a specific type within a FORM
   * @param chunk - The chunk to search (must be a FORM)
   * @param type - The chunk type to find
   * @returns The found chunk or undefined
   */
  static findChunk(chunk: IffChunk, type: string): IffChunk | undefined {
    if (!IffParser.isForm(chunk)) {
      return undefined;
    }

    const children = chunk.data as IffChunk[];
    return children.find((c) => c.type === type || c.formType === type);
  }

  /**
   * Find all chunks of a specific type within a FORM
   * @param chunk - The chunk to search (must be a FORM)
   * @param type - The chunk type to find
   * @returns Array of matching chunks
   */
  static findAllChunks(chunk: IffChunk, type: string): IffChunk[] {
    if (!IffParser.isForm(chunk)) {
      return [];
    }

    const children = chunk.data as IffChunk[];
    return children.filter((c) => c.type === type || c.formType === type);
  }

  /**
   * Recursively find a chunk by type, searching nested FORMs
   * @param chunk - The root chunk to search
   * @param type - The chunk type to find
   * @returns The found chunk or undefined
   */
  static findChunkDeep(chunk: IffChunk, type: string): IffChunk | undefined {
    if (chunk.type === type || chunk.formType === type) {
      return chunk;
    }

    if (!IffParser.isForm(chunk)) {
      return undefined;
    }

    const children = chunk.data as IffChunk[];
    for (const child of children) {
      const found = IffParser.findChunkDeep(child, type);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * Recursively find all chunks of a specific type
   * @param chunk - The root chunk to search
   * @param type - The chunk type to find
   * @returns Array of all matching chunks
   */
  static findAllChunksDeep(chunk: IffChunk, type: string): IffChunk[] {
    const results: IffChunk[] = [];

    if (chunk.type === type || chunk.formType === type) {
      results.push(chunk);
    }

    if (IffParser.isForm(chunk)) {
      const children = chunk.data as IffChunk[];
      for (const child of children) {
        results.push(...IffParser.findAllChunksDeep(child, type));
      }
    }

    return results;
  }

  /**
   * Get the form type path from root to a specific chunk
   * Useful for debugging and identifying template structure
   */
  static getFormPath(root: IffChunk): string[] {
    const path: string[] = [];

    function traverse(chunk: IffChunk): void {
      if (chunk.formType) {
        path.push(chunk.formType);
      }
      if (IffParser.isForm(chunk)) {
        const children = chunk.data as IffChunk[];
        for (const child of children) {
          if (IffParser.isForm(child)) {
            traverse(child);
            break; // Only follow first FORM for path
          }
        }
      }
    }

    traverse(root);
    return path;
  }

  /**
   * Debug helper: print chunk structure
   */
  static printStructure(chunk: IffChunk, indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    let output = '';

    if (chunk.formType) {
      output += `${prefix}FORM ${chunk.formType} (${chunk.size} bytes)\n`;
    } else {
      const dataSize = chunk.data instanceof Uint8Array ? chunk.data.length : 0;
      output += `${prefix}${chunk.type} (${chunk.size} bytes, data: ${dataSize})\n`;
    }

    if (IffParser.isForm(chunk)) {
      const children = chunk.data as IffChunk[];
      for (const child of children) {
        output += IffParser.printStructure(child, indent + 1);
      }
    }

    return output;
  }
}

/**
 * Helper class for reading binary data from IFF chunk data
 */
export class IffDataReader {
  private data: Uint8Array;
  private view: DataView;
  private offset: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.offset = 0;
  }

  /**
   * Get current read position
   */
  get position(): number {
    return this.offset;
  }

  /**
   * Get remaining bytes
   */
  get remaining(): number {
    return this.data.length - this.offset;
  }

  /**
   * Check if there are more bytes to read
   */
  hasMore(): boolean {
    return this.offset < this.data.length;
  }

  /**
   * Skip bytes
   */
  skip(count: number): void {
    this.offset += count;
  }

  /**
   * Seek to absolute position
   */
  seek(position: number): void {
    this.offset = position;
  }

  /**
   * Read a single byte
   */
  readUint8(): number {
    const value = this.data[this.offset] ?? 0;
    this.offset += 1;
    return value;
  }

  /**
   * Read a signed byte
   */
  readInt8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * Read 2-byte unsigned integer (big-endian)
   */
  readUint16BE(): number {
    const value = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return value;
  }

  /**
   * Read 2-byte unsigned integer (little-endian)
   */
  readUint16LE(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * Read 4-byte unsigned integer (big-endian)
   */
  readUint32BE(): number {
    const value = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return value;
  }

  /**
   * Read 4-byte unsigned integer (little-endian)
   */
  readUint32LE(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Read 4-byte signed integer (big-endian)
   */
  readInt32BE(): number {
    const value = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return value;
  }

  /**
   * Read 4-byte signed integer (little-endian)
   */
  readInt32LE(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Read 4-byte float (big-endian)
   */
  readFloat32BE(): number {
    const value = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return value;
  }

  /**
   * Read 4-byte float (little-endian)
   */
  readFloat32LE(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * Read a null-terminated string
   */
  readCString(): string {
    let end = this.offset;
    while (end < this.data.length && this.data[end] !== 0) {
      end++;
    }

    const bytes = this.data.slice(this.offset, end);
    this.offset = end + 1; // Skip null terminator

    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Read a length-prefixed string (1-byte length)
   */
  readPascalString(): string {
    const length = this.readUint8();
    return this.readFixedString(length);
  }

  /**
   * Read a length-prefixed string (2-byte length, big-endian)
   */
  readString16BE(): string {
    const length = this.readUint16BE();
    return this.readFixedString(length);
  }

  /**
   * Read a fixed-length string
   */
  readFixedString(length: number): string {
    const bytes = this.data.slice(this.offset, this.offset + length);
    this.offset += length;

    // Trim null bytes
    let end = bytes.length;
    while (end > 0 && bytes[end - 1] === 0) {
      end--;
    }

    return new TextDecoder('utf-8').decode(bytes.slice(0, end));
  }

  /**
   * Read raw bytes
   */
  readBytes(count: number): Uint8Array {
    const bytes = this.data.slice(this.offset, this.offset + count);
    this.offset += count;
    return bytes;
  }

  /**
   * Read a boolean (1 byte, 0 = false, non-zero = true)
   */
  readBool(): boolean {
    return this.readUint8() !== 0;
  }

  /**
   * Read a 4-byte boolean (SWG sometimes uses 4-byte bools)
   */
  readBool32(): boolean {
    return this.readUint32BE() !== 0;
  }
}
