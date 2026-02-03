/**
 * CRFT Baseline Serialization
 * Handles serialization of CraftingTool data for client synchronization
 *
 * SWG baselines are packets that synchronize object state between server and client.
 * Crafting tools use baselines 3 and 6 for their specific data, extending TANO baselines.
 *
 * Baseline 3: Shared crafting tool data (visible to all observers)
 * Baseline 6: Server crafting tool data (usage tracking, etc.)
 */

import { BufferWriter, BufferReader } from '@swg/protocol';
import { CraftingTool } from '../crafting-tool.js';
import { CraftingStation } from '../crafting-station.js';
import type { ObjectId } from '@swg/shared-types';

/** CRFT type identifier (CRC of "CRFT") */
export const CRFT_TYPE_CRC = 0x43524654; // "CRFT" in ASCII

/** STNO type identifier for stations (CRC of "STNO") */
export const STNO_TYPE_CRC = 0x53544e4f; // "STNO" in ASCII

/**
 * Delta operation types for list updates
 */
export enum CrftDeltaOperation {
  Add = 0,
  Remove = 1,
  Change = 2,
  Clear = 3,
  Set = 4,
}

/**
 * Write a Unicode (UTF-16LE) string with 32-bit length prefix
 */
function writeUnicodeString(writer: BufferWriter, str: string): void {
  writer.writeUInt32LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt16LE(str.charCodeAt(i));
  }
}

/**
 * Read a Unicode (UTF-16LE) string with 32-bit length prefix
 */
function readUnicodeString(reader: BufferReader): string {
  const length = reader.readUInt32LE();
  if (length === 0) return '';

  let result = '';
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(reader.readUInt16LE());
  }
  return result;
}

/**
 * Write an ASCII string with 16-bit length prefix
 */
function writeAsciiString(writer: BufferWriter, str: string): void {
  writer.writeUInt16LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt8(str.charCodeAt(i) & 0xff);
  }
}

/**
 * Read an ASCII string with 16-bit length prefix
 */
function readAsciiString(reader: BufferReader): string {
  const length = reader.readUInt16LE();
  if (length === 0) return '';

  const bytes = reader.readBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i] ?? 0);
  }
  return result;
}

/**
 * Serialize CRFT Baseline 3 (shared crafting tool data)
 * This baseline contains data visible to all players observing the tool
 */
export function serializeCrftBaseline3(tool: CraftingTool): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(CRFT_TYPE_CRC); // Object type
  writer.writeUInt8(3); // Baseline number

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== CRFT3 Variables ====

  // 0: Crafting tool type
  writer.writeUInt8(tool.craftingToolType);
  variableCount++;

  // 1: Effectiveness (0-100)
  writer.writeUInt8(tool.effectiveness);
  variableCount++;

  // 2: Complexity limit
  writer.writeUInt16LE(tool.complexityLimit);
  variableCount++;

  // 3: Is station flag
  writer.writeUInt8(tool.isStation ? 1 : 0);
  variableCount++;

  // 4: Tool quality
  writer.writeUInt8(tool.toolQuality);
  variableCount++;

  // 5: Assembly bonus
  writer.writeUInt8(tool.assemblyBonus);
  variableCount++;

  // 6: Experimentation bonus
  writer.writeUInt8(tool.experimentationBonus);
  variableCount++;

  // 7: Required skill
  writeAsciiString(writer, tool.getRequiredSkill());
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize CRFT Baseline 6 (server crafting tool data)
 * This baseline contains usage tracking and internal state
 */
export function serializeCrftBaseline6(tool: CraftingTool): Uint8Array {
  const writer = new BufferWriter(64);

  // Baseline header
  writer.writeUInt32LE(CRFT_TYPE_CRC);
  writer.writeUInt8(6);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== CRFT6 Variables ====

  // 0: Uses remaining (-1 = unlimited)
  writer.writeInt32LE(tool.usesRemaining);
  variableCount++;

  // 1: Max uses (-1 = unlimited)
  writer.writeInt32LE(tool.maxUses);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize STNO Baseline 3 (station-specific data)
 * This extends CRFT3 with station placement and permission data
 */
export function serializeStnoBaseline3(station: CraftingStation): Uint8Array {
  const writer = new BufferWriter(512);

  // Baseline header
  writer.writeUInt32LE(STNO_TYPE_CRC);
  writer.writeUInt8(3);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== STNO3 Variables (includes CRFT3 data) ====

  // 0: Crafting tool type
  writer.writeUInt8(station.craftingToolType);
  variableCount++;

  // 1: Effectiveness
  writer.writeUInt8(station.effectiveness);
  variableCount++;

  // 2: Complexity limit
  writer.writeUInt16LE(station.complexityLimit);
  variableCount++;

  // 3: Is station flag (always true for stations)
  writer.writeUInt8(1);
  variableCount++;

  // 4: Tool quality
  writer.writeUInt8(station.toolQuality);
  variableCount++;

  // 5: Assembly bonus
  writer.writeUInt8(station.assemblyBonus);
  variableCount++;

  // 6: Experimentation bonus
  writer.writeUInt8(station.experimentationBonus);
  variableCount++;

  // 7: Required skill
  writeAsciiString(writer, station.getRequiredSkill());
  variableCount++;

  // ==== Station-specific variables ====

  // 8: Station type
  writer.writeUInt8(station.stationType);
  variableCount++;

  // 9: Placed position (X, Y, Z as floats)
  writer.writeFloat32LE(station.placedPosition.x);
  writer.writeFloat32LE(station.placedPosition.y);
  writer.writeFloat32LE(station.placedPosition.z);
  variableCount++;

  // 10: Rotation (radians)
  writer.writeFloat32LE(station.rotation);
  variableCount++;

  // 11: Placed in cell (0 = world)
  writer.writeUInt64LE(station.placedInCell ?? 0n);
  variableCount++;

  // 12: Is public flag
  writer.writeUInt8(station.isPublic ? 1 : 0);
  variableCount++;

  // 13: Placed by (player ID)
  writer.writeUInt64LE(station.placedBy);
  variableCount++;

  // 14: Placement time
  writer.writeUInt64LE(BigInt(station.placementTime));
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize STNO Baseline 6 (station server data)
 * This extends CRFT6 with allowed users list
 */
export function serializeStnoBaseline6(station: CraftingStation): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(STNO_TYPE_CRC);
  writer.writeUInt8(6);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== STNO6 Variables (includes CRFT6 data) ====

  // 0: Uses remaining
  writer.writeInt32LE(station.usesRemaining);
  variableCount++;

  // 1: Max uses
  writer.writeInt32LE(station.maxUses);
  variableCount++;

  // ==== Station-specific variables ====

  // 2: Allowed users list
  const allowedUsers = station.getAllowedUsers();
  writer.writeUInt32LE(allowedUsers.length); // List size
  writer.writeUInt32LE(station.getAllowedUsersUpdateCounter()); // Update counter
  for (const userId of allowedUsers) {
    writer.writeUInt64LE(userId);
  }
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate a delta message for CRFT Baseline 3 changes
 */
export function generateCrftBaseline3Delta(
  tool: CraftingTool,
  changedProperties: string[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(CRFT_TYPE_CRC);
  writer.writeUInt8(3);

  // Count of updates
  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case 'craftingToolType':
        writer.writeUInt16LE(0);
        writer.writeUInt8(tool.craftingToolType);
        updateCount++;
        break;

      case 'effectiveness':
        writer.writeUInt16LE(1);
        writer.writeUInt8(tool.effectiveness);
        updateCount++;
        break;

      case 'complexityLimit':
        writer.writeUInt16LE(2);
        writer.writeUInt16LE(tool.complexityLimit);
        updateCount++;
        break;

      case 'isStation':
        writer.writeUInt16LE(3);
        writer.writeUInt8(tool.isStation ? 1 : 0);
        updateCount++;
        break;

      case 'toolQuality':
        writer.writeUInt16LE(4);
        writer.writeUInt8(tool.toolQuality);
        updateCount++;
        break;

      case 'assemblyBonus':
        writer.writeUInt16LE(5);
        writer.writeUInt8(tool.assemblyBonus);
        updateCount++;
        break;

      case 'experimentationBonus':
        writer.writeUInt16LE(6);
        writer.writeUInt8(tool.experimentationBonus);
        updateCount++;
        break;
    }
  }

  if (updateCount === 0) {
    return null;
  }

  // Update the count
  const endPos = writer.getPosition();
  writer.setPosition(updateCountPos);
  writer.writeUInt16LE(updateCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate a delta message for CRFT Baseline 6 changes
 */
export function generateCrftBaseline6Delta(
  tool: CraftingTool,
  changedProperties: string[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(CRFT_TYPE_CRC);
  writer.writeUInt8(6);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case 'usesRemaining':
        writer.writeUInt16LE(0);
        writer.writeInt32LE(tool.usesRemaining);
        updateCount++;
        break;

      case 'maxUses':
        writer.writeUInt16LE(1);
        writer.writeInt32LE(tool.maxUses);
        updateCount++;
        break;
    }
  }

  if (updateCount === 0) {
    return null;
  }

  const endPos = writer.getPosition();
  writer.setPosition(updateCountPos);
  writer.writeUInt16LE(updateCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate delta for allowed users list changes
 */
export function generateAllowedUsersListDelta(
  station: CraftingStation,
  operation: CrftDeltaOperation,
  userId?: ObjectId,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(STNO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1); // One update

  // Variable index for allowed users list
  writer.writeUInt16LE(2);

  // List delta format
  const allowedUsers = station.getAllowedUsers();
  writer.writeUInt32LE(allowedUsers.length);
  writer.writeUInt32LE(station.getAllowedUsersUpdateCounter());

  writer.writeUInt8(1); // Number of list operations
  writer.writeUInt8(operation);

  switch (operation) {
    case CrftDeltaOperation.Add:
      if (userId !== undefined) {
        writer.writeUInt64LE(userId);
      }
      break;

    case CrftDeltaOperation.Remove:
      if (index !== undefined) {
        writer.writeUInt16LE(index);
      }
      break;

    case CrftDeltaOperation.Clear:
      // No additional data needed
      break;
  }

  return writer.toBuffer();
}

/**
 * Deserialize CRFT Baseline 3 data into a CraftingTool
 */
export function deserializeCrftBaseline3(tool: CraftingTool, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header (type CRC + baseline number)
  reader.skip(5);

  // Read variable count
  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    tool.craftingToolType = reader.readUInt8();
  }

  if (variableCount >= 2) {
    tool.effectiveness = reader.readUInt8();
  }

  if (variableCount >= 3) {
    tool.complexityLimit = reader.readUInt16LE();
  }

  if (variableCount >= 4) {
    tool.isStation = reader.readUInt8() !== 0;
  }

  if (variableCount >= 5) {
    tool.toolQuality = reader.readUInt8();
  }

  if (variableCount >= 6) {
    tool.assemblyBonus = reader.readUInt8();
  }

  if (variableCount >= 7) {
    tool.experimentationBonus = reader.readUInt8();
  }

  if (variableCount >= 8) {
    // Required skill is read-only (derived from tool type)
    readAsciiString(reader);
  }
}

/**
 * Deserialize CRFT Baseline 6 data into a CraftingTool
 */
export function deserializeCrftBaseline6(tool: CraftingTool, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    tool.usesRemaining = reader.readInt32LE();
  }

  if (variableCount >= 2) {
    tool.maxUses = reader.readInt32LE();
  }
}

/**
 * Create all baselines for a CraftingTool
 */
export function createCrftBaselines(tool: CraftingTool): {
  baseline3: Uint8Array;
  baseline6: Uint8Array;
} {
  return {
    baseline3: serializeCrftBaseline3(tool),
    baseline6: serializeCrftBaseline6(tool),
  };
}

/**
 * Create all baselines for a CraftingStation
 */
export function createStnoBaselines(station: CraftingStation): {
  baseline3: Uint8Array;
  baseline6: Uint8Array;
} {
  return {
    baseline3: serializeStnoBaseline3(station),
    baseline6: serializeStnoBaseline6(station),
  };
}

/**
 * Create a full baseline packet for sending to client
 */
export function createCrftBaselinePacket(objectId: bigint, baseline: Uint8Array): Uint8Array {
  const writer = new BufferWriter(baseline.length + 16);

  // Message header
  writer.writeUInt64LE(objectId);
  writer.writeBytes(baseline);

  return writer.toBuffer();
}

/**
 * Create a delta packet for sending to client
 */
export function createCrftDeltaPacket(objectId: bigint, delta: Uint8Array): Uint8Array {
  const writer = new BufferWriter(delta.length + 16);

  // Message header
  writer.writeUInt64LE(objectId);
  writer.writeBytes(delta);

  return writer.toBuffer();
}
