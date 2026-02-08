/**
 * Helper class for reading binary data from IFF chunk data.
 *
 * This is the canonical source — other packages re-export from here.
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

  get position(): number {
    return this.offset;
  }

  get remaining(): number {
    return this.data.length - this.offset;
  }

  hasMore(): boolean {
    return this.offset < this.data.length;
  }

  skip(count: number): void {
    this.offset += count;
  }

  seek(position: number): void {
    this.offset = position;
  }

  readUint8(): number {
    const value = this.data[this.offset] ?? 0;
    this.offset += 1;
    return value;
  }

  readInt8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readUint16BE(): number {
    const value = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readUint16LE(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readUint32BE(): number {
    const value = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readUint32LE(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readInt32BE(): number {
    const value = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readInt32LE(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat32BE(): number {
    const value = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readFloat32LE(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readCString(): string {
    let end = this.offset;
    while (end < this.data.length && this.data[end] !== 0) {
      end++;
    }

    const bytes = this.data.slice(this.offset, end);
    this.offset = end + 1; // Skip null terminator

    return new TextDecoder('utf-8').decode(bytes);
  }

  readPascalString(): string {
    const length = this.readUint8();
    return this.readFixedString(length);
  }

  readString16BE(): string {
    const length = this.readUint16BE();
    return this.readFixedString(length);
  }

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

  readBytes(count: number): Uint8Array {
    const bytes = this.data.slice(this.offset, this.offset + count);
    this.offset += count;
    return bytes;
  }

  readBool(): boolean {
    return this.readUint8() !== 0;
  }

  readBool32(): boolean {
    return this.readUint32BE() !== 0;
  }
}
