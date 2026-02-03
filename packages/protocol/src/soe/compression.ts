/**
 * Zlib Compression for SOE Protocol
 * The SOE protocol supports optional zlib compression for packet data
 * Compression is indicated by a flag byte at the start of the payload
 */

import pako from 'pako';
import { CompressionFlag, SoeProtocolDefaults } from './constants.js';

/**
 * Compression result containing the data and whether compression was applied
 */
export interface CompressionResult {
  data: Uint8Array;
  compressed: boolean;
}

/**
 * Compress data using zlib deflate
 * @param data - The data to compress
 * @returns Compressed data
 */
export function compressData(data: Uint8Array): Uint8Array {
  try {
    return pako.deflate(data);
  } catch {
    // If compression fails, return original data
    return data;
  }
}

/**
 * Decompress zlib deflated data
 * @param data - The compressed data
 * @returns Decompressed data
 * @throws Error if decompression fails
 */
export function decompressData(data: Uint8Array): Uint8Array {
  try {
    return pako.inflate(data);
  } catch (error) {
    throw new Error(
      `Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Compress data if it exceeds the threshold
 * Prepends a compression flag byte
 * @param data - The data to potentially compress
 * @param threshold - Minimum size to trigger compression (default: 40 bytes)
 * @returns Result with flag indicating if compression was applied
 */
export function compress(
  data: Uint8Array,
  threshold: number = SoeProtocolDefaults.COMPRESSION_THRESHOLD
): CompressionResult {
  // Don't compress small packets
  if (data.length < threshold) {
    const result = new Uint8Array(data.length + 1);
    result[0] = CompressionFlag.None;
    result.set(data, 1);
    return { data: result, compressed: false };
  }

  const compressed = compressData(data);

  // Only use compression if it actually reduces size
  if (compressed.length < data.length) {
    const result = new Uint8Array(compressed.length + 1);
    result[0] = CompressionFlag.Compressed;
    result.set(compressed, 1);
    return { data: result, compressed: true };
  }

  // Compression didn't help, return uncompressed
  const result = new Uint8Array(data.length + 1);
  result[0] = CompressionFlag.None;
  result.set(data, 1);
  return { data: result, compressed: false };
}

/**
 * Decompress data based on the compression flag
 * @param data - The data with compression flag prefix
 * @returns Decompressed data (without flag)
 * @throws Error if decompression fails
 */
export function decompress(data: Uint8Array): Uint8Array {
  if (data.length < 1) {
    throw new Error('Data too short to contain compression flag');
  }

  const flag = data[0];
  const payload = data.subarray(1);

  if (flag === CompressionFlag.Compressed) {
    return decompressData(payload);
  }

  // Not compressed, just return the data without the flag
  return payload;
}

/**
 * Check if data is compressed based on the flag byte
 * @param data - The data with compression flag prefix
 * @returns True if the data is compressed
 */
export function isCompressed(data: Uint8Array): boolean {
  if (data.length < 1) return false;
  return data[0] === CompressionFlag.Compressed;
}

/**
 * Try to decompress data, returning original if decompression fails
 * @param data - The data with compression flag prefix
 * @returns Decompressed data or original payload if not compressed/fails
 */
export function tryDecompress(data: Uint8Array): Uint8Array {
  if (data.length < 1) return data;

  const flag = data[0];
  const payload = data.subarray(1);

  if (flag === CompressionFlag.Compressed) {
    try {
      return decompressData(payload);
    } catch {
      // Return payload without flag on failure
      return payload;
    }
  }

  return payload;
}

/**
 * Compression handler class for stateful compression operations
 */
export class SoeCompression {
  private enabled: boolean;
  private threshold: number;

  constructor(
    enabled: boolean = true,
    threshold: number = SoeProtocolDefaults.COMPRESSION_THRESHOLD
  ) {
    this.enabled = enabled;
    this.threshold = threshold;
  }

  /**
   * Enable or disable compression
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if compression is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set the compression threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /**
   * Get the compression threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Compress data if enabled and above threshold
   * @param data - Data to compress
   * @returns Compression result
   */
  compress(data: Uint8Array): CompressionResult {
    if (!this.enabled) {
      const result = new Uint8Array(data.length + 1);
      result[0] = CompressionFlag.None;
      result.set(data, 1);
      return { data: result, compressed: false };
    }
    return compress(data, this.threshold);
  }

  /**
   * Decompress data
   * @param data - Data to decompress
   * @returns Decompressed data
   */
  decompress(data: Uint8Array): Uint8Array {
    return decompress(data);
  }

  /**
   * Try to decompress, returning original on failure
   * @param data - Data to decompress
   * @returns Decompressed data or original
   */
  tryDecompress(data: Uint8Array): Uint8Array {
    return tryDecompress(data);
  }
}

/**
 * Calculate compression ratio
 * @param original - Original data size
 * @param compressed - Compressed data size
 * @returns Compression ratio (0-1, where 0.5 means 50% of original size)
 */
export function compressionRatio(
  original: number,
  compressed: number
): number {
  if (original === 0) return 1;
  return compressed / original;
}

/**
 * Check if compression would be beneficial
 * @param data - The data to check
 * @param threshold - Minimum size threshold
 * @returns True if data should be compressed
 */
export function shouldCompress(
  data: Uint8Array,
  threshold: number = SoeProtocolDefaults.COMPRESSION_THRESHOLD
): boolean {
  if (data.length < threshold) return false;

  // Try compression and check if it helps
  const compressed = compressData(data);
  return compressed.length < data.length;
}
