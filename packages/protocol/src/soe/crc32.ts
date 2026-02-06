/**
 * CRC32 Implementation for SOE Protocol
 * The SOE protocol uses a standard CRC32 with configurable seed
 * but only transmits the lower 16 bits (2 bytes) in packets
 */

import { CrcConfig } from './constants.js';

/**
 * Pre-computed CRC32 lookup table for performance
 */
const crcTable: number[] = new Array(256);

/**
 * Initialize the CRC lookup table using the IEEE polynomial
 */
function initCrcTable(): void {
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ CrcConfig.POLYNOMIAL;
      } else {
        crc = crc >>> 1;
      }
    }
    crcTable[i] = crc >>> 0; // Ensure unsigned
  }
}

// Initialize table on module load
initCrcTable();

/**
 * Calculate CRC32 for the given data
 * @param data - The data to calculate CRC for
 * @param seed - Optional CRC seed (default: 0)
 * @returns The 32-bit CRC value
 */
export function calculateCrc32(data: Uint8Array, seed: number = 0): number {
  let crc: number = CrcConfig.INITIAL_VALUE;

  // Mix in the seed
  if (seed !== 0) {
    const seedBytes = new Uint8Array(4);
    const view = new DataView(seedBytes.buffer);
    view.setUint32(0, seed, true); // Little-endian (matches C++ native byte order on x86)
    for (const byte of seedBytes) {
      const tableIndex = (crc ^ byte) & 0xff;
      const tableValue = crcTable[tableIndex];
      if (tableValue !== undefined) {
        crc = (crc >>> 8) ^ tableValue;
      }
    }
  }

  // Process data bytes
  for (const byte of data) {
    const tableIndex = (crc ^ byte) & 0xff;
    const tableValue = crcTable[tableIndex];
    if (tableValue !== undefined) {
      crc = (crc >>> 8) ^ tableValue;
    }
  }

  return (crc ^ CrcConfig.FINAL_XOR) >>> 0;
}

/**
 * Calculate the 16-bit CRC used in SOE packets
 * SOE protocol only uses the lower 16 bits of the CRC32
 * @param data - The data to calculate CRC for
 * @param seed - The session CRC seed
 * @returns The 16-bit CRC value
 */
export function calculateSoeCrc(data: Uint8Array, seed: number): number {
  const fullCrc = calculateCrc32(data, seed);
  return fullCrc & 0xffff;
}

/**
 * Append CRC to packet data
 * @param data - The packet data (without CRC)
 * @param seed - The session CRC seed
 * @returns New buffer with CRC appended
 */
export function appendCrc(data: Uint8Array, seed: number): Uint8Array {
  const crc = calculateSoeCrc(data, seed);
  const result = new Uint8Array(data.length + CrcConfig.CRC_LENGTH);

  // Copy original data
  result.set(data, 0);

  // Append CRC in big-endian format
  result[data.length] = (crc >> 8) & 0xff;
  result[data.length + 1] = crc & 0xff;

  return result;
}

/**
 * Validate CRC of packet data
 * @param data - The packet data (including CRC)
 * @param seed - The session CRC seed
 * @returns True if CRC is valid
 */
export function validateCrc(data: Uint8Array, seed: number): boolean {
  if (data.length < CrcConfig.CRC_LENGTH) {
    return false;
  }

  // Extract the CRC from the end of the packet
  const packetCrc =
    ((data[data.length - 2] ?? 0) << 8) | (data[data.length - 1] ?? 0);

  // Calculate CRC of the data (excluding the CRC bytes)
  const dataWithoutCrc = data.subarray(0, data.length - CrcConfig.CRC_LENGTH);
  const calculatedCrc = calculateSoeCrc(dataWithoutCrc, seed);

  return packetCrc === calculatedCrc;
}

/**
 * Strip CRC from packet data
 * @param data - The packet data (including CRC)
 * @returns Data without CRC bytes
 */
export function stripCrc(data: Uint8Array): Uint8Array {
  if (data.length < CrcConfig.CRC_LENGTH) {
    return data;
  }
  return data.subarray(0, data.length - CrcConfig.CRC_LENGTH);
}

/**
 * Get the CRC bytes from the end of a packet
 * @param data - The packet data (including CRC)
 * @returns The 16-bit CRC value
 */
export function extractCrc(data: Uint8Array): number {
  if (data.length < CrcConfig.CRC_LENGTH) {
    return 0;
  }
  return (
    ((data[data.length - 2] ?? 0) << 8) | (data[data.length - 1] ?? 0)
  );
}

/**
 * CRC32 utility class for stateful operations
 */
export class Crc32Calculator {
  private seed: number;

  constructor(seed: number = 0) {
    this.seed = seed;
  }

  /**
   * Set the CRC seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Get the current CRC seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Calculate full 32-bit CRC
   */
  calculate(data: Uint8Array): number {
    return calculateCrc32(data, this.seed);
  }

  /**
   * Calculate 16-bit SOE CRC
   */
  calculateSoe(data: Uint8Array): number {
    return calculateSoeCrc(data, this.seed);
  }

  /**
   * Append CRC to data
   */
  append(data: Uint8Array): Uint8Array {
    return appendCrc(data, this.seed);
  }

  /**
   * Validate CRC of data
   */
  validate(data: Uint8Array): boolean {
    return validateCrc(data, this.seed);
  }
}
