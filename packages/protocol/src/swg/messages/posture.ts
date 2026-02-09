/**
 * SWG Posture Messages
 * Protocol messages for player posture state
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * SWG Message opcode for posture
 */
export const PostureMessageOpcode = {
  /** Posture change notification */
  PostureMessage: 0xf5ea7b42,
} as const;

export type PostureMessageOpcodeType =
  (typeof PostureMessageOpcode)[keyof typeof PostureMessageOpcode];

/**
 * Posture enumeration
 * Defines all possible character postures in SWG
 */
export const Posture = {
  /** Standing upright (normal) */
  UPRIGHT: 0,
  /** Crouched down */
  CROUCHED: 1,
  /** Lying prone on the ground */
  PRONE: 2,
  /** Sneaking/stealthed movement */
  SNEAKING: 3,
  /** Blocking (combat stance) */
  BLOCKING: 4,
  /** Climbing (ladders, etc.) */
  CLIMBING: 5,
  /** Flying (jetpack, vehicle) */
  FLYING: 6,
  /** Lying down (resting) */
  LYING_DOWN: 7,
  /** Sitting on ground or chair */
  SITTING: 8,
  /** Performing a skill animation */
  SKILL_ANIMATING: 9,
  /** Driving a vehicle */
  DRIVING_VEHICLE: 10,
  /** Riding a creature mount */
  RIDING_CREATURE: 11,
  /** Knocked down (combat) */
  KNOCKED_DOWN: 12,
  /** Incapacitated (near death) */
  INCAPACITATED: 13,
  /** Dead */
  DEAD: 14,
} as const;

export type PostureType = (typeof Posture)[keyof typeof Posture];

/**
 * Base interface for posture messages
 */
export interface PostureMessageBase {
  opcode: number;
}

/**
 * PostureMessage - Posture change notification
 * Sent by server when a player's posture changes
 */
export interface PostureMessage extends PostureMessageBase {
  opcode: typeof PostureMessageOpcode.PostureMessage;
  objectId: bigint;
  posture: PostureType;
}

/**
 * Serialize PostureMessage
 */
export function serializePostureMessage(message: PostureMessage): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt16LE(3); // operandCount (2 fields + cmd)
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUInt8(message.posture);
  return writer.toBuffer();
}

/**
 * Deserialize PostureMessage
 */
export function deserializePostureMessage(data: Uint8Array): PostureMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== PostureMessageOpcode.PostureMessage) {
    throw new Error(`Invalid opcode for PostureMessage: 0x${opcode.toString(16)}`);
  }

  const objectId = reader.readUInt64LE();
  const posture = reader.readUInt8() as PostureType;

  return {
    opcode: PostureMessageOpcode.PostureMessage,
    objectId,
    posture,
  };
}

/**
 * Get the opcode from raw posture message data
 */
export function getPostureMessageOpcode(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid posture message opcode
 */
export function isPostureMessageOpcode(
  opcode: number
): opcode is PostureMessageOpcodeType {
  return Object.values(PostureMessageOpcode).includes(
    opcode as PostureMessageOpcodeType
  );
}

/**
 * Create a PostureMessage
 */
export function createPostureMessage(
  objectId: bigint,
  posture: PostureType
): PostureMessage {
  return {
    opcode: PostureMessageOpcode.PostureMessage,
    objectId,
    posture,
  };
}

/**
 * Get the name of a posture value
 */
export function getPostureName(posture: PostureType): string {
  const names: Record<PostureType, string> = {
    [Posture.UPRIGHT]: 'Upright',
    [Posture.CROUCHED]: 'Crouched',
    [Posture.PRONE]: 'Prone',
    [Posture.SNEAKING]: 'Sneaking',
    [Posture.BLOCKING]: 'Blocking',
    [Posture.CLIMBING]: 'Climbing',
    [Posture.FLYING]: 'Flying',
    [Posture.LYING_DOWN]: 'Lying Down',
    [Posture.SITTING]: 'Sitting',
    [Posture.SKILL_ANIMATING]: 'Skill Animating',
    [Posture.DRIVING_VEHICLE]: 'Driving Vehicle',
    [Posture.RIDING_CREATURE]: 'Riding Creature',
    [Posture.KNOCKED_DOWN]: 'Knocked Down',
    [Posture.INCAPACITATED]: 'Incapacitated',
    [Posture.DEAD]: 'Dead',
  };
  return names[posture] ?? 'Unknown';
}

/**
 * Check if the posture allows movement
 */
export function canMoveInPosture(posture: PostureType): boolean {
  switch (posture) {
    case Posture.UPRIGHT:
    case Posture.CROUCHED:
    case Posture.PRONE:
    case Posture.SNEAKING:
    case Posture.FLYING:
    case Posture.DRIVING_VEHICLE:
    case Posture.RIDING_CREATURE:
      return true;
    case Posture.BLOCKING:
    case Posture.CLIMBING:
    case Posture.LYING_DOWN:
    case Posture.SITTING:
    case Posture.SKILL_ANIMATING:
    case Posture.KNOCKED_DOWN:
    case Posture.INCAPACITATED:
    case Posture.DEAD:
      return false;
    default:
      return false;
  }
}

/**
 * Get the movement speed modifier for a posture
 */
export function getPostureSpeedModifier(posture: PostureType): number {
  switch (posture) {
    case Posture.UPRIGHT:
      return 1.0;
    case Posture.CROUCHED:
      return 0.5;
    case Posture.PRONE:
      return 0.25;
    case Posture.SNEAKING:
      return 0.5;
    case Posture.FLYING:
      return 1.0;
    case Posture.DRIVING_VEHICLE:
      return 1.0; // Vehicle speed handled separately
    case Posture.RIDING_CREATURE:
      return 1.0; // Mount speed handled separately
    default:
      return 0.0;
  }
}

// ============================================
// UpdatePostureMessage (0x0bde6b41) — different from PostureMessage!
// Sent from server to client during zone-in for CreatureObjects
// ============================================

const UPDATE_POSTURE_MESSAGE_OPCODE = 0x0bde6b41;

export function createUpdatePostureMessage(
  posture: number,
  objectId: bigint
): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt16LE(3); // operandCount (2 fields + 1)
  writer.writeUInt32LE(UPDATE_POSTURE_MESSAGE_OPCODE);
  writer.writeUInt8(posture);
  writer.writeUInt64LE(objectId);
  return writer.toBuffer();
}

/**
 * Check if the posture represents an incapacitated state
 */
export function isIncapacitatedPosture(posture: PostureType): boolean {
  return (
    posture === Posture.KNOCKED_DOWN ||
    posture === Posture.INCAPACITATED ||
    posture === Posture.DEAD
  );
}
