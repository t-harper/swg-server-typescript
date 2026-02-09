/**
 * Baseline Sender Service
 *
 * Takes game objects and sends their baselines to the client as properly
 * wrapped BaselinesMessage packets.
 *
 * Raw baseline data from the serializers (creo-baselines, play-baselines)
 * has the format:
 *   typeTag (u32LE) + packageId (u8) + variableCount (u16LE) + variables...
 *
 * The BaselinesMessage wire format is:
 *   opcode (u32LE) + targetId (u64LE) + typeTag (u32LE) + packageId (u8)
 *   + payloadSize (u32LE) + payload
 *
 * Where payload = variableCount (u16LE) + variables (everything after the
 * 5-byte header in the raw baseline data).
 *
 * This module extracts the typeTag and packageId from the raw baseline data,
 * then wraps everything into a proper BaselinesMessage using the protocol
 * serializer.
 */

import {
  createBaselinesMessage,
  serializeBaselinesMessage,
} from '@swg/protocol';
import type { CreatureObject, PlayerObject } from '@swg/objects';
import { TangibleObject } from '@swg/objects';
import {
  serializeCreoBaseline1,
  serializeCreoBaseline3,
  serializeCreoBaseline4,
  serializeCreoBaseline6,
  serializeCreoBaseline8,
  serializeCreoBaseline9,
  serializePlayBaseline3,
  serializePlayBaseline6,
  serializePlayBaseline8,
  serializePlayBaseline9,
  serializeTanoBaseline1,
  serializeTanoBaseline3,
  serializeTanoBaseline4,
  serializeTanoBaseline6,
  serializeTanoBaseline8,
  serializeTanoBaseline9,
} from '@swg/objects';

/**
 * Wrap raw baseline data into a serialized BaselinesMessage packet.
 *
 * The raw baseline has a 5-byte header (typeTag + packageId) that maps
 * directly to the BaselinesMessage fields. The remaining bytes become
 * the payload.
 */
export function wrapBaseline(targetId: bigint, rawBaseline: Uint8Array): Uint8Array {
  // Raw baseline format: typeTag(4) + packageId(1) + payload...
  const view = new DataView(rawBaseline.buffer, rawBaseline.byteOffset, rawBaseline.byteLength);
  const typeTag = view.getUint32(0, true);
  const packageId = rawBaseline[4]!;
  const payload = rawBaseline.subarray(5);

  const message = createBaselinesMessage(targetId, typeTag, packageId, payload);
  return serializeBaselinesMessage(message);
}

/** Callback type for sending reliable data to the client */
export type SendReliable = (data: Uint8Array) => void;

/**
 * Send all baselines for a player's creature object (CREO 1, 3, 4, 6)
 */
export function sendCreatureBaselines(
  creature: CreatureObject,
  objectId: bigint,
  send: SendReliable
): void {
  const baselines = [
    serializeCreoBaseline1(creature),
    serializeCreoBaseline3(creature),
    serializeCreoBaseline4(creature),
    serializeCreoBaseline6(creature),
    serializeCreoBaseline8(creature),
    serializeCreoBaseline9(creature),
  ];

  for (const baseline of baselines) {
    send(wrapBaseline(objectId, baseline));
  }
}

/**
 * Send all baselines for a player object (PLAY 3, 6, 8, 9)
 */
export function sendPlayerBaselines(
  player: PlayerObject,
  objectId: bigint,
  send: SendReliable
): void {
  const baselines = [
    serializePlayBaseline3(player),
    serializePlayBaseline6(player),
    serializePlayBaseline8(player),
    serializePlayBaseline9(player),
  ];

  for (const baseline of baselines) {
    send(wrapBaseline(objectId, baseline));
  }
}

/**
 * Send all baselines for a tangible object (TANO 3, 6, 1, 4, 8, 9)
 * Used for child container objects (inventory, datapad, bank, mission_bag)
 */
export function sendTangibleBaselines(
  tangible: TangibleObject,
  objectId: bigint,
  send: SendReliable
): void {
  // C++ order: shared (3,6), auth client (1,4), first parent (8,9)
  const baselines = [
    serializeTanoBaseline3(tangible),
    serializeTanoBaseline6(tangible),
    serializeTanoBaseline1(tangible),
    serializeTanoBaseline4(),
    serializeTanoBaseline8(),
    serializeTanoBaseline9(),
  ];

  for (const baseline of baselines) {
    send(wrapBaseline(objectId, baseline));
  }
}

/**
 * Send the complete set of baselines for zone-in (CREO + PLAY).
 * The CREO baselines are sent first, followed by the PLAY baselines.
 */
export function sendAllPlayerBaselines(
  creature: CreatureObject,
  player: PlayerObject,
  objectId: bigint,
  send: SendReliable
): void {
  sendCreatureBaselines(creature, objectId, send);
  sendPlayerBaselines(player, objectId, send);
}
