/**
 * @swg/objects - Baseline Serialization
 *
 * Baselines are the SWG client's mechanism for synchronizing object state.
 * Each object type has multiple baseline "types" (numbered 1-9) that contain
 * different properties. The client caches these baselines and applies deltas
 * to keep objects in sync.
 *
 * Baseline Types (4-character codes):
 * - SCLT: Scene Object (base for all objects)
 * - TANO: Tangible Object (physical items)
 * - CREO: Creature Object (NPCs and players)
 * - PLAY: Player Object (player-specific data)
 * - BUIO: Building Interior Object
 * - HINO: Harvester Installation Object
 * - MINO: Manufacturing Installation Object
 * - ITNO: Intangible Object
 * - WEAO: Weapon Object
 * - MISO: Mission Object
 * - MSCO: Manufacturing Schematic Object
 * - GRUP: Group Object
 * - GILD: Guild Object
 * - WAYP: Waypoint Object
 * - SHIP: Ship Object
 * - RCNO: Resource Container Object
 *
 * Baseline Numbers:
 * - 1: Shared data (visible to all observers)
 * - 3: Shared data part 2 (CREO specific)
 * - 4: Private data (visible only to owner)
 * - 6: Private data part 2 (CREO specific)
 * - 7: Shared data part 3
 * - 8: Shared data part 4 (PLAY specific)
 * - 9: Shared data part 5 (PLAY specific)
 */

import { BufferWriter } from '@swg/protocol';
import type { SceneObject } from './scene-object.js';

/**
 * Baseline type constants
 * Four-character codes identifying object types in the protocol
 */
export const BaselineType = {
  /** Scene Object - base type for all objects */
  SCLT: 'SCLT',
  /** Tangible Object - physical items */
  TANO: 'TANO',
  /** Creature Object - NPCs and players */
  CREO: 'CREO',
  /** Player Object - player-specific data */
  PLAY: 'PLAY',
  /** Building Interior Object */
  BUIO: 'BUIO',
  /** Harvester Installation Object */
  HINO: 'HINO',
  /** Manufacturing Installation Object */
  MINO: 'MINO',
  /** Intangible Object */
  ITNO: 'ITNO',
  /** Weapon Object */
  WEAO: 'WEAO',
  /** Mission Object */
  MISO: 'MISO',
  /** Manufacturing Schematic Object */
  MSCO: 'MSCO',
  /** Group Object */
  GRUP: 'GRUP',
  /** Guild Object */
  GILD: 'GILD',
  /** Waypoint Object */
  WAYP: 'WAYP',
  /** Ship Object */
  SHIP: 'SHIP',
  /** Resource Container Object */
  RCNO: 'RCNO',
  /** Cell Object */
  CELL: 'CELL',
  /** Static Object */
  STAT: 'STAT',
} as const;

export type BaselineTypeValue = (typeof BaselineType)[keyof typeof BaselineType];

/**
 * Baseline number constants
 */
export const BaselineNumber = {
  /** Shared data baseline 1 */
  BASELINE_1: 1,
  /** Creature shared data baseline 3 */
  BASELINE_3: 3,
  /** Private data baseline 4 */
  BASELINE_4: 4,
  /** Creature private data baseline 6 */
  BASELINE_6: 6,
  /** Shared data baseline 7 */
  BASELINE_7: 7,
  /** Player shared data baseline 8 */
  BASELINE_8: 8,
  /** Player shared data baseline 9 */
  BASELINE_9: 9,
} as const;

export type BaselineNumberValue = (typeof BaselineNumber)[keyof typeof BaselineNumber];

/**
 * Create a baseline header for a message
 *
 * @param writer - BufferWriter to write to
 * @param objectId - The object's 64-bit ID
 * @param baselineType - Four-character type code (e.g., 'SCLT')
 * @param baselineNumber - Baseline number (1, 3, 4, 6, 7, 8, or 9)
 * @param operandCount - Number of operands in this baseline
 */
export function writeBaselineHeader(
  writer: BufferWriter,
  objectId: bigint,
  baselineType: string,
  baselineNumber: number,
  operandCount: number
): void {
  // Object ID (8 bytes, little-endian)
  writer.writeUInt64LE(objectId);

  // Type CRC (4 bytes) - ASCII characters as 32-bit value
  const typeCrc = baselineTypeToUInt32(baselineType);
  writer.writeUInt32LE(typeCrc);

  // Baseline number (1 byte)
  writer.writeUInt8(baselineNumber);

  // Operand count (2 bytes, little-endian)
  writer.writeUInt16LE(operandCount);
}

/**
 * Convert a 4-character baseline type to a 32-bit integer
 */
export function baselineTypeToUInt32(type: string): number {
  if (type.length !== 4) {
    throw new Error(`Baseline type must be exactly 4 characters, got: ${type}`);
  }
  return (
    (type.charCodeAt(0)) |
    (type.charCodeAt(1) << 8) |
    (type.charCodeAt(2) << 16) |
    (type.charCodeAt(3) << 24)
  );
}

/**
 * Convert a 32-bit integer back to a 4-character baseline type
 */
export function uint32ToBaselineType(value: number): string {
  return String.fromCharCode(
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff
  );
}

/**
 * Create Baseline 1 for a SceneObject
 *
 * Baseline 1 contains shared data visible to all observers:
 * - Object complexity
 * - String table file reference
 * - Object name index (0)
 * - Volume
 *
 * @param obj - The SceneObject to serialize
 * @returns Buffer containing the baseline data
 */
export function createSceneObjectBaseline1(obj: SceneObject): Uint8Array {
  const writer = new BufferWriter(128);

  // Write header
  writeBaselineHeader(writer, obj.objectId, obj.getBaselineType(), 1, 4);

  // Operand 0: Object complexity (float)
  writer.writeFloatLE(obj.objectComplexity);

  // Operand 1: String table file (ASCII string with length)
  writeAsciiString(writer, obj.objectNameStfFile);

  // Operand 2: Zero (placeholder for string ID - unused in modern client)
  writer.writeUInt32LE(0);

  // Operand 3: String table name (Unicode string with length)
  writeUnicodeString(writer, obj.objectNameStfName);

  return writer.toBuffer();
}

/**
 * Create Baseline 4 for a SceneObject
 *
 * Baseline 4 contains private data visible only to the owner:
 * - Various internal flags and counters
 *
 * @param obj - The SceneObject to serialize
 * @returns Buffer containing the baseline data
 */
export function createSceneObjectBaseline4(obj: SceneObject): Uint8Array {
  const writer = new BufferWriter(64);

  // Write header
  writeBaselineHeader(writer, obj.objectId, obj.getBaselineType(), 4, 2);

  // Operand 0: Unknown/Reserved (usually 0)
  writer.writeFloatLE(0);

  // Operand 1: Unknown/Reserved (usually 0)
  writer.writeUInt32LE(0);

  return writer.toBuffer();
}

/**
 * Create Baseline 7 for a SceneObject
 *
 * Baseline 7 contains additional shared data:
 * - Detail string file
 * - Detail string name
 *
 * @param obj - The SceneObject to serialize
 * @returns Buffer containing the baseline data
 */
export function createSceneObjectBaseline7(obj: SceneObject): Uint8Array {
  const writer = new BufferWriter(128);

  // Write header
  writeBaselineHeader(writer, obj.objectId, obj.getBaselineType(), 7, 2);

  // Operand 0: Detail string file
  writeAsciiString(writer, obj.detailStfFile);

  // Operand 1: Detail string name
  writeUnicodeString(writer, obj.detailStfName);

  return writer.toBuffer();
}

/**
 * Create all baselines for a SceneObject
 *
 * @param obj - The SceneObject to serialize
 * @returns Array of baseline buffers (1, 4, 7)
 */
export function createSceneObjectBaselines(obj: SceneObject): Uint8Array[] {
  return [
    createSceneObjectBaseline1(obj),
    createSceneObjectBaseline4(obj),
    createSceneObjectBaseline7(obj),
  ];
}

/**
 * Write an ASCII string with 16-bit length prefix
 */
export function writeAsciiString(writer: BufferWriter, str: string): void {
  const bytes = new TextEncoder().encode(str);
  writer.writeUInt16LE(bytes.length);
  writer.writeBytes(bytes);
}

/**
 * Write a Unicode (UTF-16LE) string with 32-bit character count prefix
 */
export function writeUnicodeString(writer: BufferWriter, str: string): void {
  writer.writeUInt32LE(str.length);
  for (const char of str) {
    writer.writeUInt16LE(char.charCodeAt(0));
  }
}

/**
 * Write a list header (for delta-trackable lists)
 *
 * @param writer - BufferWriter to write to
 * @param count - Number of items in the list
 * @param updateCounter - Delta update counter for this list
 */
export function writeListHeader(
  writer: BufferWriter,
  count: number,
  updateCounter: number
): void {
  writer.writeUInt32LE(count);
  writer.writeUInt32LE(updateCounter);
}

/**
 * Write position data (Vector3)
 */
export function writePosition(
  writer: BufferWriter,
  x: number,
  y: number,
  z: number
): void {
  writer.writeFloatLE(x);
  writer.writeFloatLE(y);
  writer.writeFloatLE(z);
}

/**
 * Write orientation data (Quaternion)
 */
export function writeOrientation(
  writer: BufferWriter,
  x: number,
  y: number,
  z: number,
  w: number
): void {
  writer.writeFloatLE(x);
  writer.writeFloatLE(y);
  writer.writeFloatLE(z);
  writer.writeFloatLE(w);
}

/**
 * Baseline creation function type
 */
export type BaselineCreator = (obj: SceneObject) => Uint8Array;

/**
 * Registry of baseline creators by type and number
 */
const baselineCreators: Map<string, Map<number, BaselineCreator>> = new Map();

/**
 * Register a baseline creator for a specific type and number
 */
export function registerBaselineCreator(
  type: string,
  number: number,
  creator: BaselineCreator
): void {
  let typeMap = baselineCreators.get(type);
  if (!typeMap) {
    typeMap = new Map();
    baselineCreators.set(type, typeMap);
  }
  typeMap.set(number, creator);
}

/**
 * Get a baseline creator for a specific type and number
 */
export function getBaselineCreator(
  type: string,
  number: number
): BaselineCreator | undefined {
  return baselineCreators.get(type)?.get(number);
}

/**
 * Create a specific baseline for an object
 *
 * @param obj - The SceneObject to serialize
 * @param baselineNumber - Which baseline to create (1, 3, 4, 6, 7, 8, or 9)
 * @returns Buffer containing the baseline data, or undefined if not supported
 */
export function createBaseline(
  obj: SceneObject,
  baselineNumber: number
): Uint8Array | undefined {
  const type = obj.getBaselineType();
  const creator = getBaselineCreator(type, baselineNumber);

  if (creator) {
    return creator(obj);
  }

  // Fall back to SCLT baselines for base objects
  switch (baselineNumber) {
    case 1:
      return createSceneObjectBaseline1(obj);
    case 4:
      return createSceneObjectBaseline4(obj);
    case 7:
      return createSceneObjectBaseline7(obj);
    default:
      return undefined;
  }
}

// Register default SCLT baseline creators
registerBaselineCreator(BaselineType.SCLT, 1, createSceneObjectBaseline1);
registerBaselineCreator(BaselineType.SCLT, 4, createSceneObjectBaseline4);
registerBaselineCreator(BaselineType.SCLT, 7, createSceneObjectBaseline7);
