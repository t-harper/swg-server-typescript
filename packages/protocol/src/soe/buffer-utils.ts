/**
 * Binary Buffer Utilities for SOE Protocol
 * Provides BufferReader and BufferWriter classes for parsing and building packets
 * The SOE protocol primarily uses big-endian byte order
 */

/**
 * BufferReader - Read binary data from a buffer
 * Maintains an internal position pointer that advances with each read
 */
export class BufferReader {
  private buffer: Uint8Array;
  private view: DataView;
  private position: number;

  constructor(data: Uint8Array | ArrayBuffer) {
    if (data instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(data);
    } else {
      this.buffer = data;
    }
    this.view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.buffer.byteLength
    );
    this.position = 0;
  }

  /**
   * Get the underlying buffer
   */
  getBuffer(): Uint8Array {
    return this.buffer;
  }

  /**
   * Get current read position
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Set the read position
   */
  setPosition(pos: number): void {
    if (pos < 0 || pos > this.buffer.length) {
      throw new RangeError(`Position ${pos} out of bounds [0, ${this.buffer.length}]`);
    }
    this.position = pos;
  }

  /**
   * Skip ahead by a number of bytes
   */
  skip(bytes: number): void {
    this.setPosition(this.position + bytes);
  }

  /**
   * Get remaining bytes in buffer
   */
  remaining(): number {
    return this.buffer.length - this.position;
  }

  /**
   * Check if there are at least n bytes remaining
   */
  hasRemaining(n: number): boolean {
    return this.remaining() >= n;
  }

  /**
   * Check if we've reached the end
   */
  isAtEnd(): boolean {
    return this.position >= this.buffer.length;
  }

  /**
   * Get total buffer length
   */
  length(): number {
    return this.buffer.length;
  }

  /**
   * Read a single unsigned byte
   */
  readUInt8(): number {
    if (!this.hasRemaining(1)) {
      throw new RangeError('Buffer underflow: cannot read UInt8');
    }
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  /**
   * Read a single signed byte
   */
  readInt8(): number {
    if (!this.hasRemaining(1)) {
      throw new RangeError('Buffer underflow: cannot read Int8');
    }
    const value = this.view.getInt8(this.position);
    this.position += 1;
    return value;
  }

  /**
   * Read unsigned 16-bit integer (big-endian)
   */
  readUInt16BE(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError('Buffer underflow: cannot read UInt16BE');
    }
    const value = this.view.getUint16(this.position, false);
    this.position += 2;
    return value;
  }

  /**
   * Read unsigned 16-bit integer (little-endian)
   */
  readUInt16LE(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError('Buffer underflow: cannot read UInt16LE');
    }
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  /**
   * Read signed 16-bit integer (big-endian)
   */
  readInt16BE(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError('Buffer underflow: cannot read Int16BE');
    }
    const value = this.view.getInt16(this.position, false);
    this.position += 2;
    return value;
  }

  /**
   * Read signed 16-bit integer (little-endian)
   */
  readInt16LE(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError('Buffer underflow: cannot read Int16LE');
    }
    const value = this.view.getInt16(this.position, true);
    this.position += 2;
    return value;
  }

  /**
   * Read unsigned 32-bit integer (big-endian)
   */
  readUInt32BE(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError('Buffer underflow: cannot read UInt32BE');
    }
    const value = this.view.getUint32(this.position, false);
    this.position += 4;
    return value;
  }

  /**
   * Read unsigned 32-bit integer (little-endian)
   */
  readUInt32LE(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError('Buffer underflow: cannot read UInt32LE');
    }
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  /**
   * Read signed 32-bit integer (big-endian)
   */
  readInt32BE(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError('Buffer underflow: cannot read Int32BE');
    }
    const value = this.view.getInt32(this.position, false);
    this.position += 4;
    return value;
  }

  /**
   * Read signed 32-bit integer (little-endian)
   */
  readInt32LE(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError('Buffer underflow: cannot read Int32LE');
    }
    const value = this.view.getInt32(this.position, true);
    this.position += 4;
    return value;
  }

  /**
   * Read unsigned 64-bit integer (big-endian) as BigInt
   */
  readUInt64BE(): bigint {
    if (!this.hasRemaining(8)) {
      throw new RangeError('Buffer underflow: cannot read UInt64BE');
    }
    const value = this.view.getBigUint64(this.position, false);
    this.position += 8;
    return value;
  }

  /**
   * Read signed 64-bit integer (big-endian) as BigInt
   */
  readInt64BE(): bigint {
    if (!this.hasRemaining(8)) {
      throw new RangeError('Buffer underflow: cannot read Int64BE');
    }
    const value = this.view.getBigInt64(this.position, false);
    this.position += 8;
    return value;
  }

  /**
   * Read unsigned 64-bit integer (little-endian) as BigInt
   */
  readUInt64LE(): bigint {
    if (!this.hasRemaining(8)) {
      throw new RangeError('Buffer underflow: cannot read UInt64LE');
    }
    const value = this.view.getBigUint64(this.position, true);
    this.position += 8;
    return value;
  }

  /**
   * Read signed 64-bit integer (little-endian) as BigInt
   */
  readInt64LE(): bigint {
    if (!this.hasRemaining(8)) {
      throw new RangeError('Buffer underflow: cannot read Int64LE');
    }
    const value = this.view.getBigInt64(this.position, true);
    this.position += 8;
    return value;
  }

  /**
   * Read 32-bit float (big-endian)
   */
  readFloatBE(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError('Buffer underflow: cannot read FloatBE');
    }
    const value = this.view.getFloat32(this.position, false);
    this.position += 4;
    return value;
  }

  /**
   * Read 32-bit float (little-endian)
   */
  readFloatLE(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError('Buffer underflow: cannot read FloatLE');
    }
    const value = this.view.getFloat32(this.position, true);
    this.position += 4;
    return value;
  }

  /**
   * Read 64-bit double (big-endian)
   */
  readDoubleBE(): number {
    if (!this.hasRemaining(8)) {
      throw new RangeError('Buffer underflow: cannot read DoubleBE');
    }
    const value = this.view.getFloat64(this.position, false);
    this.position += 8;
    return value;
  }

  /**
   * Read 64-bit double (little-endian)
   */
  readDoubleLE(): number {
    if (!this.hasRemaining(8)) {
      throw new RangeError('Buffer underflow: cannot read DoubleLE');
    }
    const value = this.view.getFloat64(this.position, true);
    this.position += 8;
    return value;
  }

  /**
   * Read raw bytes
   */
  readBytes(length: number): Uint8Array {
    if (!this.hasRemaining(length)) {
      throw new RangeError(`Buffer underflow: cannot read ${length} bytes`);
    }
    const bytes = this.buffer.subarray(this.position, this.position + length);
    this.position += length;
    return bytes;
  }

  /**
   * Read all remaining bytes
   */
  readRemaining(): Uint8Array {
    const bytes = this.buffer.subarray(this.position);
    this.position = this.buffer.length;
    return bytes;
  }

  /**
   * Peek at bytes without advancing position
   */
  peekBytes(length: number): Uint8Array {
    if (!this.hasRemaining(length)) {
      throw new RangeError(`Buffer underflow: cannot peek ${length} bytes`);
    }
    return this.buffer.subarray(this.position, this.position + length);
  }

  /**
   * Peek at a single byte without advancing position
   */
  peekUInt8(): number {
    if (!this.hasRemaining(1)) {
      throw new RangeError('Buffer underflow: cannot peek UInt8');
    }
    return this.view.getUint8(this.position);
  }

  /**
   * Peek at 16-bit unsigned integer (big-endian)
   */
  peekUInt16BE(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError('Buffer underflow: cannot peek UInt16BE');
    }
    return this.view.getUint16(this.position, false);
  }

  /**
   * Read a null-terminated ASCII string
   */
  readStringNT(): string {
    const start = this.position;
    while (this.position < this.buffer.length && this.buffer[this.position] !== 0) {
      this.position++;
    }
    const bytes = this.buffer.subarray(start, this.position);
    if (this.position < this.buffer.length) {
      this.position++; // Skip null terminator
    }
    return new TextDecoder('ascii').decode(bytes);
  }

  /**
   * Read a fixed-length ASCII string
   */
  readStringFixed(length: number): string {
    const bytes = this.readBytes(length);
    // Find null terminator if present
    let end = bytes.length;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) {
        end = i;
        break;
      }
    }
    return new TextDecoder('ascii').decode(bytes.subarray(0, end));
  }

  /**
   * Read a length-prefixed ASCII string (16-bit length, big-endian)
   */
  readStringWithLength16BE(): string {
    const length = this.readUInt16BE();
    if (length === 0) return '';
    const bytes = this.readBytes(length);
    return new TextDecoder('ascii').decode(bytes);
  }

  /**
   * Read a length-prefixed ASCII string (32-bit length, big-endian)
   */
  readStringWithLength32BE(): string {
    const length = this.readUInt32BE();
    if (length === 0) return '';
    const bytes = this.readBytes(length);
    return new TextDecoder('ascii').decode(bytes);
  }

  /**
   * Read a null-terminated UTF-16 LE string
   */
  readUnicodeStringNT(): string {
    const start = this.position;
    while (this.hasRemaining(2)) {
      const char = this.view.getUint16(this.position, true);
      if (char === 0) {
        break;
      }
      this.position += 2;
    }
    const bytes = this.buffer.subarray(start, this.position);
    if (this.hasRemaining(2)) {
      this.position += 2; // Skip null terminator
    }
    return new TextDecoder('utf-16le').decode(bytes);
  }

  /**
   * Read a length-prefixed ASCII string (16-bit length, little-endian)
   * This is the standard SWG Archive string format
   */
  readStringWithLength16LE(): string {
    const length = this.readUInt16LE();
    if (length === 0) return '';
    const bytes = this.readBytes(length);
    return new TextDecoder('ascii').decode(bytes);
  }

  /**
   * Read a length-prefixed ASCII string (32-bit length, little-endian)
   */
  readStringWithLength32LE(): string {
    const length = this.readUInt32LE();
    if (length === 0) return '';
    const bytes = this.readBytes(length);
    return new TextDecoder('ascii').decode(bytes);
  }

  /**
   * Read an AutoArray<unsigned char> (int32LE count + raw bytes)
   * Used in C++ Archive for byte array fields
   */
  readAutoArray(): Uint8Array {
    const count = this.readInt32LE();
    if (count <= 0) return new Uint8Array(0);
    return this.readBytes(count);
  }

  /**
   * Read a length-prefixed UTF-16 LE string (32-bit LE character count)
   * This is the C++ Archive Unicode::String format
   */
  readUnicodeStringWithLength(): string {
    const charCount = this.readUInt32LE();
    if (charCount === 0) return '';
    const byteLength = charCount * 2;
    const bytes = this.readBytes(byteLength);
    return new TextDecoder('utf-16le').decode(bytes);
  }

  /**
   * Read SOE-style variable-length integer
   * Uses 1 byte if value < 255, otherwise 1 byte (0xFF) + 2 bytes
   */
  readVariableLength(): number {
    const first = this.readUInt8();
    if (first === 0xff) {
      return this.readUInt16BE();
    }
    return first;
  }
}

/**
 * BufferWriter - Write binary data to a buffer
 * Automatically grows the buffer as needed
 */
export class BufferWriter {
  private buffer: Uint8Array;
  private view: DataView;
  private position: number;
  private capacity: number;

  constructor(initialCapacity: number = 256) {
    this.capacity = initialCapacity;
    this.buffer = new Uint8Array(this.capacity);
    this.view = new DataView(this.buffer.buffer);
    this.position = 0;
  }

  /**
   * Ensure the buffer has enough capacity
   */
  private ensureCapacity(additional: number): void {
    const required = this.position + additional;
    if (required > this.capacity) {
      // Double the capacity or use required size, whichever is larger
      const newCapacity = Math.max(this.capacity * 2, required);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      this.view = new DataView(this.buffer.buffer);
      this.capacity = newCapacity;
    }
  }

  /**
   * Get the current write position (also the current length of written data)
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Get the written data as a new buffer
   */
  toBuffer(): Uint8Array {
    return this.buffer.subarray(0, this.position);
  }

  /**
   * Get a copy of the written data
   */
  toBufferCopy(): Uint8Array {
    return new Uint8Array(this.buffer.subarray(0, this.position));
  }

  /**
   * Reset the writer to the beginning
   */
  reset(): void {
    this.position = 0;
  }

  /**
   * Set the write position
   */
  setPosition(pos: number): void {
    if (pos < 0) {
      throw new RangeError(`Position ${pos} cannot be negative`);
    }
    this.ensureCapacity(pos - this.position);
    this.position = pos;
  }

  /**
   * Write a single unsigned byte
   */
  writeUInt8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.position, value & 0xff);
    this.position += 1;
  }

  /**
   * Write a single signed byte
   */
  writeInt8(value: number): void {
    this.ensureCapacity(1);
    this.view.setInt8(this.position, value);
    this.position += 1;
  }

  /**
   * Write unsigned 16-bit integer (big-endian)
   */
  writeUInt16BE(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.position, value & 0xffff, false);
    this.position += 2;
  }

  /**
   * Write unsigned 16-bit integer (little-endian)
   */
  writeUInt16LE(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.position, value & 0xffff, true);
    this.position += 2;
  }

  /**
   * Write signed 16-bit integer (big-endian)
   */
  writeInt16BE(value: number): void {
    this.ensureCapacity(2);
    this.view.setInt16(this.position, value, false);
    this.position += 2;
  }

  /**
   * Write signed 16-bit integer (little-endian)
   */
  writeInt16LE(value: number): void {
    this.ensureCapacity(2);
    this.view.setInt16(this.position, value, true);
    this.position += 2;
  }

  /**
   * Write unsigned 32-bit integer (big-endian)
   */
  writeUInt32BE(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.position, value >>> 0, false);
    this.position += 4;
  }

  /**
   * Write unsigned 32-bit integer (little-endian)
   */
  writeUInt32LE(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.position, value >>> 0, true);
    this.position += 4;
  }

  /**
   * Write signed 32-bit integer (big-endian)
   */
  writeInt32BE(value: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.position, value, false);
    this.position += 4;
  }

  /**
   * Write signed 32-bit integer (little-endian)
   */
  writeInt32LE(value: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.position, value, true);
    this.position += 4;
  }

  /**
   * Write unsigned 64-bit integer (big-endian) from BigInt
   */
  writeUInt64BE(value: bigint): void {
    this.ensureCapacity(8);
    this.view.setBigUint64(this.position, value, false);
    this.position += 8;
  }

  /**
   * Write signed 64-bit integer (big-endian) from BigInt
   */
  writeInt64BE(value: bigint): void {
    this.ensureCapacity(8);
    this.view.setBigInt64(this.position, value, false);
    this.position += 8;
  }

  /**
   * Write unsigned 64-bit integer (little-endian) from BigInt
   */
  writeUInt64LE(value: bigint): void {
    this.ensureCapacity(8);
    this.view.setBigUint64(this.position, value, true);
    this.position += 8;
  }

  /**
   * Write signed 64-bit integer (little-endian) from BigInt
   */
  writeInt64LE(value: bigint): void {
    this.ensureCapacity(8);
    this.view.setBigInt64(this.position, value, true);
    this.position += 8;
  }

  /**
   * Write 32-bit float (big-endian)
   */
  writeFloatBE(value: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.position, value, false);
    this.position += 4;
  }

  /**
   * Write 32-bit float (little-endian)
   */
  writeFloatLE(value: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.position, value, true);
    this.position += 4;
  }

  /**
   * Write 64-bit double (big-endian)
   */
  writeDoubleBE(value: number): void {
    this.ensureCapacity(8);
    this.view.setFloat64(this.position, value, false);
    this.position += 8;
  }

  /**
   * Write 64-bit double (little-endian)
   */
  writeDoubleLE(value: number): void {
    this.ensureCapacity(8);
    this.view.setFloat64(this.position, value, true);
    this.position += 8;
  }

  /**
   * Write raw bytes
   */
  writeBytes(data: Uint8Array): void {
    this.ensureCapacity(data.length);
    this.buffer.set(data, this.position);
    this.position += data.length;
  }

  /**
   * Write a null-terminated ASCII string
   */
  writeStringNT(str: string): void {
    const encoded = new TextEncoder().encode(str);
    this.writeBytes(encoded);
    this.writeUInt8(0); // Null terminator
  }

  /**
   * Write a fixed-length ASCII string (padded with nulls)
   */
  writeStringFixed(str: string, length: number): void {
    const encoded = new TextEncoder().encode(str);
    this.ensureCapacity(length);
    const copyLength = Math.min(encoded.length, length);
    this.buffer.set(encoded.subarray(0, copyLength), this.position);
    // Fill remaining with zeros
    for (let i = copyLength; i < length; i++) {
      this.buffer[this.position + i] = 0;
    }
    this.position += length;
  }

  /**
   * Write a length-prefixed ASCII string (16-bit length, big-endian)
   */
  writeStringWithLength16BE(str: string): void {
    const encoded = new TextEncoder().encode(str);
    this.writeUInt16BE(encoded.length);
    this.writeBytes(encoded);
  }

  /**
   * Write a length-prefixed ASCII string (32-bit length, big-endian)
   */
  writeStringWithLength32BE(str: string): void {
    const encoded = new TextEncoder().encode(str);
    this.writeUInt32BE(encoded.length);
    this.writeBytes(encoded);
  }

  /**
   * Write a null-terminated UTF-16 LE string
   */
  writeUnicodeStringNT(str: string): void {
    const encoder = new TextEncoder();
    // Convert to UTF-16LE manually
    for (const char of str) {
      const code = char.charCodeAt(0);
      this.writeUInt16LE(code);
    }
    this.writeUInt16LE(0); // Null terminator
  }

  /**
   * Write a length-prefixed ASCII string (16-bit length, little-endian)
   * This is the standard SWG Archive string format
   */
  writeStringWithLength16LE(str: string): void {
    const encoded = new TextEncoder().encode(str);
    this.writeUInt16LE(encoded.length);
    this.writeBytes(encoded);
  }

  /**
   * Write a length-prefixed ASCII string (32-bit length, little-endian)
   */
  writeStringWithLength32LE(str: string): void {
    const encoded = new TextEncoder().encode(str);
    this.writeUInt32LE(encoded.length);
    this.writeBytes(encoded);
  }

  /**
   * Write an AutoArray<unsigned char> (int32LE count + raw bytes)
   * Used in C++ Archive for byte array fields
   */
  writeAutoArray(data: Uint8Array): void {
    this.writeInt32LE(data.length);
    this.writeBytes(data);
  }

  /**
   * Write a length-prefixed UTF-16 LE string (32-bit LE character count)
   * This is the C++ Archive Unicode::String format
   */
  writeUnicodeStringWithLength(str: string): void {
    this.writeUInt32LE(str.length); // Character count (LE to match C++ Archive)
    for (const char of str) {
      const code = char.charCodeAt(0);
      this.writeUInt16LE(code);
    }
  }

  /**
   * Write SOE-style variable-length integer
   * Uses 1 byte if value < 255, otherwise 1 byte (0xFF) + 2 bytes
   */
  writeVariableLength(value: number): void {
    if (value < 0xff) {
      this.writeUInt8(value);
    } else {
      this.writeUInt8(0xff);
      this.writeUInt16BE(value);
    }
  }

  /**
   * Write zeros (padding)
   */
  writeZeros(count: number): void {
    this.ensureCapacity(count);
    for (let i = 0; i < count; i++) {
      this.buffer[this.position + i] = 0;
    }
    this.position += count;
  }
}

/**
 * Utility function to convert a hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[\s-]/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.substring(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex character at position ${i}`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Utility function to convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array, separator: string = ''): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(separator);
}

/**
 * Utility function to concatenate multiple Uint8Arrays
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
