/**
 * XOR Encryption for SOE Protocol
 * The SOE protocol uses a simple XOR-based encryption with a session key
 * derived from the CRC seed exchanged during session establishment
 */

/**
 * Generate encryption key from CRC seed
 * The SOE protocol uses the seed to generate a repeating XOR key
 * @param seed - The CRC seed from session negotiation
 * @returns A 4-byte key derived from the seed
 */
export function generateKeyFromSeed(seed: number): Uint8Array {
  const key = new Uint8Array(4);
  key[0] = (seed >> 24) & 0xff;
  key[1] = (seed >> 16) & 0xff;
  key[2] = (seed >> 8) & 0xff;
  key[3] = seed & 0xff;
  return key;
}

/**
 * XOR encrypt/decrypt data in place
 * Since XOR is symmetric, the same function works for both operations
 * @param data - The data to encrypt/decrypt (modified in place)
 * @param key - The encryption key
 * @param offset - Starting offset in the data (default: 0)
 */
function xorTransform(
  data: Uint8Array,
  key: Uint8Array,
  offset: number = 0
): void {
  if (key.length === 0) return;

  for (let i = offset; i < data.length; i++) {
    const keyIndex = (i - offset) % key.length;
    const keyByte = key[keyIndex];
    const dataByte = data[i];
    if (keyByte !== undefined && dataByte !== undefined) {
      data[i] = dataByte ^ keyByte;
    }
  }
}

/**
 * Encrypt packet data using XOR encryption
 * @param data - The data to encrypt
 * @param seed - The session CRC seed
 * @param offset - Starting offset (skip headers)
 * @returns New encrypted buffer
 */
export function encrypt(
  data: Uint8Array,
  seed: number,
  offset: number = 0
): Uint8Array {
  if (seed === 0) {
    return data; // No encryption if seed is 0
  }

  const key = generateKeyFromSeed(seed);
  const result = new Uint8Array(data);
  xorTransform(result, key, offset);
  return result;
}

/**
 * Decrypt packet data using XOR encryption
 * @param data - The data to decrypt
 * @param seed - The session CRC seed
 * @param offset - Starting offset (skip headers)
 * @returns New decrypted buffer
 */
export function decrypt(
  data: Uint8Array,
  seed: number,
  offset: number = 0
): Uint8Array {
  // XOR is symmetric, so decryption is the same as encryption
  return encrypt(data, seed, offset);
}

/**
 * Encrypt data in place (modifies the input buffer)
 * @param data - The data to encrypt (modified in place)
 * @param seed - The session CRC seed
 * @param offset - Starting offset (skip headers)
 */
export function encryptInPlace(
  data: Uint8Array,
  seed: number,
  offset: number = 0
): void {
  if (seed === 0) return;
  const key = generateKeyFromSeed(seed);
  xorTransform(data, key, offset);
}

/**
 * Decrypt data in place (modifies the input buffer)
 * @param data - The data to decrypt (modified in place)
 * @param seed - The session CRC seed
 * @param offset - Starting offset (skip headers)
 */
export function decryptInPlace(
  data: Uint8Array,
  seed: number,
  offset: number = 0
): void {
  // XOR is symmetric
  encryptInPlace(data, seed, offset);
}

/**
 * SOE Encryption handler class for stateful session encryption
 */
export class SoeEncryption {
  private seed: number;
  private key: Uint8Array;
  private enabled: boolean;

  constructor(seed: number = 0) {
    this.seed = seed;
    this.key = generateKeyFromSeed(seed);
    this.enabled = seed !== 0;
  }

  /**
   * Update the encryption seed (called after session establishment)
   */
  setSeed(seed: number): void {
    this.seed = seed;
    this.key = generateKeyFromSeed(seed);
    this.enabled = seed !== 0;
  }

  /**
   * Get the current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Check if encryption is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable encryption
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Encrypt data
   * @param data - Data to encrypt
   * @param offset - Starting offset
   * @returns Encrypted data
   */
  encrypt(data: Uint8Array, offset: number = 0): Uint8Array {
    if (!this.enabled) return data;
    return encrypt(data, this.seed, offset);
  }

  /**
   * Decrypt data
   * @param data - Data to decrypt
   * @param offset - Starting offset
   * @returns Decrypted data
   */
  decrypt(data: Uint8Array, offset: number = 0): Uint8Array {
    if (!this.enabled) return data;
    return decrypt(data, this.seed, offset);
  }

  /**
   * Transform data in place (encrypt or decrypt)
   * @param data - Data to transform
   * @param offset - Starting offset
   */
  transformInPlace(data: Uint8Array, offset: number = 0): void {
    if (!this.enabled) return;
    xorTransform(data, this.key, offset);
  }
}

/**
 * Generate a random CRC seed for session establishment
 * @returns A random 32-bit seed value
 */
export function generateRandomSeed(): number {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return (
    ((bytes[0] ?? 0) << 24) |
    ((bytes[1] ?? 0) << 16) |
    ((bytes[2] ?? 0) << 8) |
    (bytes[3] ?? 0)
  ) >>> 0;
}
