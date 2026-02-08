/**
 * SWG Zone Messages
 * Protocol messages for zone management, object spawning, and scene transitions
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * Zone message opcodes
 */
export const ZoneMessageOpcode = {
  /** Client ready for scene data (sent after loading screen) */
  CmdSceneReady: 0x43fd1c22,
  /** Start scene loading - sent from server to client */
  CmdStartScene: 0x3ae6dfae,
  /** Create object by CRC template */
  SceneCreateObjectByCrc: 0xfe89ddea,
  /** Destroy/remove object from scene */
  SceneDestroyObject: 0x4d45d504,
  /** Update object containment (container change) */
  UpdateContainment: 0x56cbde9e,
  /** Load terrain data */
  LoadTerrainMessage: 0x50083fda,
  /** Object endpoint message */
  SceneEndBaselines: 0x2c436037,
  /** Server time sync */
  ServerTimeMessage: 0x2ebc3bd9,
  /** Game server ready acknowledgement */
  GameServerReady: 0xd5899226,
  /** Request warp to location */
  RequestWarp: 0x1e05af97,
  /** Scene selection/planet menu */
  SelectCharacter: 0xb5098d76,
} as const;

export type ZoneMessageOpcodeType =
  (typeof ZoneMessageOpcode)[keyof typeof ZoneMessageOpcode];

// ============================================
// CmdSceneReady (0x43FD1C22)
// ============================================

/**
 * CmdSceneReady - Client ready for scene data
 * Sent by client after loading screen completes
 */
export interface CmdSceneReady {
  opcode: typeof ZoneMessageOpcode.CmdSceneReady;
}

/**
 * Serialize CmdSceneReady message
 */
export function serializeCmdSceneReady(): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(ZoneMessageOpcode.CmdSceneReady);
  return writer.toBuffer();
}

/**
 * Deserialize CmdSceneReady message
 */
export function deserializeCmdSceneReady(data: Uint8Array): CmdSceneReady {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.CmdSceneReady) {
    throw new Error(`Invalid opcode for CmdSceneReady: 0x${opcode.toString(16)}`);
  }
  return { opcode: ZoneMessageOpcode.CmdSceneReady };
}

// ============================================
// CmdStartScene (0x3AEBA79E)
// ============================================

/**
 * CmdStartScene - Start scene loading
 * Sent from server to initiate client scene load
 * C++ fields: disableWorldSnapshot(bool) + objectId(NetworkId) + sceneName(string)
 *   + startPosition(Vector: x,y,z) + startYaw(float) + templateName(string)
 *   + timeSeconds(int64) + serverEpoch(int32)
 */
export interface CmdStartScene {
  opcode: typeof ZoneMessageOpcode.CmdStartScene;
  ignoreLayoutFiles: boolean;
  objectId: bigint;
  sceneName: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  startYaw: number;
  templateName: string;
  galacticTime: bigint;
  serverEpoch: number;
}

/**
 * Serialize CmdStartScene message
 */
export function serializeCmdStartScene(message: CmdStartScene): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(9); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt8(message.ignoreLayoutFiles ? 1 : 0);
  writer.writeUInt64LE(message.objectId);
  writer.writeStringWithLength16LE(message.sceneName);
  writer.writeFloatLE(message.positionX);
  writer.writeFloatLE(message.positionY);
  writer.writeFloatLE(message.positionZ);
  writer.writeFloatLE(message.startYaw);
  writer.writeStringWithLength16LE(message.templateName);
  writer.writeUInt64LE(message.galacticTime);
  writer.writeInt32LE(message.serverEpoch);
  return writer.toBuffer();
}

/**
 * Deserialize CmdStartScene message
 */
export function deserializeCmdStartScene(data: Uint8Array): CmdStartScene {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.CmdStartScene) {
    throw new Error(`Invalid opcode for CmdStartScene: 0x${opcode.toString(16)}`);
  }
  const ignoreLayoutFiles = reader.readUInt8() !== 0;
  const objectId = reader.readUInt64LE();
  const sceneName = reader.readStringWithLength16LE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  const startYaw = reader.readFloatLE();
  const templateName = reader.readStringWithLength16LE();
  const galacticTime = reader.readUInt64LE();
  const serverEpoch = reader.readInt32LE();

  return {
    opcode: ZoneMessageOpcode.CmdStartScene,
    ignoreLayoutFiles,
    objectId,
    sceneName,
    positionX,
    positionY,
    positionZ,
    startYaw,
    templateName,
    galacticTime,
    serverEpoch,
  };
}

/**
 * Create a CmdStartScene message
 * @param sceneName - Scene ID like "tatooine", NOT the terrain file path
 * @param templateName - Full template path like "object/creature/player/shared_human_male.iff"
 */
export function createCmdStartScene(
  objectId: bigint,
  sceneName: string,
  x: number,
  y: number,
  z: number,
  startYaw: number = 0,
  templateName: string = '',
  galacticTime: bigint = 0n,
  serverEpoch: number = 0
): CmdStartScene {
  return {
    opcode: ZoneMessageOpcode.CmdStartScene,
    ignoreLayoutFiles: false,
    objectId,
    sceneName,
    positionX: x,
    positionY: y,
    positionZ: z,
    startYaw,
    templateName,
    galacticTime,
    serverEpoch,
  };
}

// ============================================
// SceneCreateObjectByCrc (0xFE89DDEA)
// ============================================

/**
 * SceneCreateObjectByCrc - Create object in scene
 * Sent from server to spawn an object to the client
 */
export interface SceneCreateObjectByCrc {
  opcode: typeof ZoneMessageOpcode.SceneCreateObjectByCrc;
  objectId: bigint;
  positionX: number;
  positionY: number;
  positionZ: number;
  orientationX: number;
  orientationY: number;
  orientationZ: number;
  orientationW: number;
  templateCrc: number;
  hyperspace: boolean;
}

/**
 * Serialize SceneCreateObjectByCrc message
 */
export function serializeSceneCreateObjectByCrc(
  message: SceneCreateObjectByCrc
): Uint8Array {
  const writer = new BufferWriter(52);
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  // C++ Transform: Quaternion(x,y,z,w) THEN Vector(x,y,z)
  writer.writeFloatLE(message.orientationX);
  writer.writeFloatLE(message.orientationY);
  writer.writeFloatLE(message.orientationZ);
  writer.writeFloatLE(message.orientationW);
  writer.writeFloatLE(message.positionX);
  writer.writeFloatLE(message.positionY);
  writer.writeFloatLE(message.positionZ);
  writer.writeUInt32LE(message.templateCrc);
  writer.writeUInt8(message.hyperspace ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize SceneCreateObjectByCrc message
 */
export function deserializeSceneCreateObjectByCrc(
  data: Uint8Array
): SceneCreateObjectByCrc {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.SceneCreateObjectByCrc) {
    throw new Error(
      `Invalid opcode for SceneCreateObjectByCrc: 0x${opcode.toString(16)}`
    );
  }
  const objectId = reader.readUInt64LE();
  // C++ Transform: Quaternion(x,y,z,w) THEN Vector(x,y,z)
  const orientationX = reader.readFloatLE();
  const orientationY = reader.readFloatLE();
  const orientationZ = reader.readFloatLE();
  const orientationW = reader.readFloatLE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  const templateCrc = reader.readUInt32LE();
  const hyperspace = reader.readUInt8() !== 0;

  return {
    opcode: ZoneMessageOpcode.SceneCreateObjectByCrc,
    objectId,
    positionX,
    positionY,
    positionZ,
    orientationX,
    orientationY,
    orientationZ,
    orientationW,
    templateCrc,
    hyperspace,
  };
}

/**
 * Create a SceneCreateObjectByCrc message
 */
export function createSceneCreateObjectByCrc(
  objectId: bigint,
  templateCrc: number,
  x: number,
  y: number,
  z: number,
  orientationX: number = 0,
  orientationY: number = 0,
  orientationZ: number = 0,
  orientationW: number = 1,
  hyperspace: boolean = false
): SceneCreateObjectByCrc {
  return {
    opcode: ZoneMessageOpcode.SceneCreateObjectByCrc,
    objectId,
    positionX: x,
    positionY: y,
    positionZ: z,
    orientationX,
    orientationY,
    orientationZ,
    orientationW,
    templateCrc,
    hyperspace,
  };
}

// ============================================
// SceneDestroyObject (0x4D45D504)
// ============================================

/**
 * SceneDestroyObject - Remove object from scene
 * Sent from server to despawn an object from the client
 */
export interface SceneDestroyObject {
  opcode: typeof ZoneMessageOpcode.SceneDestroyObject;
  objectId: bigint;
  hyperspace: boolean;
}

/**
 * Serialize SceneDestroyObject message
 */
export function serializeSceneDestroyObject(
  message: SceneDestroyObject
): Uint8Array {
  const writer = new BufferWriter(18);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUInt8(message.hyperspace ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize SceneDestroyObject message
 */
export function deserializeSceneDestroyObject(
  data: Uint8Array
): SceneDestroyObject {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.SceneDestroyObject) {
    throw new Error(
      `Invalid opcode for SceneDestroyObject: 0x${opcode.toString(16)}`
    );
  }
  const objectId = reader.readUInt64LE();
  const hyperspace = reader.readUInt8() !== 0;

  return {
    opcode: ZoneMessageOpcode.SceneDestroyObject,
    objectId,
    hyperspace,
  };
}

/**
 * Create a SceneDestroyObject message
 */
export function createSceneDestroyObject(
  objectId: bigint,
  hyperspace: boolean = false
): SceneDestroyObject {
  return {
    opcode: ZoneMessageOpcode.SceneDestroyObject,
    objectId,
    hyperspace,
  };
}

// ============================================
// UpdateContainment (0x56CBDE9E)
// ============================================

/**
 * UpdateContainment - Update object container
 * Sent when an object moves into/out of a container
 */
export interface UpdateContainment {
  opcode: typeof ZoneMessageOpcode.UpdateContainment;
  objectId: bigint;
  containerId: bigint;
  slotArrangement: number;
}

/**
 * Serialize UpdateContainment message
 */
export function serializeUpdateContainment(
  message: UpdateContainment
): Uint8Array {
  const writer = new BufferWriter(28);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUInt64LE(message.containerId);
  writer.writeInt32LE(message.slotArrangement);
  return writer.toBuffer();
}

/**
 * Deserialize UpdateContainment message
 */
export function deserializeUpdateContainment(
  data: Uint8Array
): UpdateContainment {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.UpdateContainment) {
    throw new Error(
      `Invalid opcode for UpdateContainment: 0x${opcode.toString(16)}`
    );
  }
  const objectId = reader.readUInt64LE();
  const containerId = reader.readUInt64LE();
  const slotArrangement = reader.readInt32LE();

  return {
    opcode: ZoneMessageOpcode.UpdateContainment,
    objectId,
    containerId,
    slotArrangement,
  };
}

/**
 * Create an UpdateContainment message
 */
export function createUpdateContainment(
  objectId: bigint,
  containerId: bigint,
  slotArrangement: number = -1
): UpdateContainment {
  return {
    opcode: ZoneMessageOpcode.UpdateContainment,
    objectId,
    containerId,
    slotArrangement,
  };
}

// ============================================
// LoadTerrainMessage (0x50083FDA)
// ============================================

/**
 * LoadTerrainMessage - Load terrain data
 * Sent to load a new terrain file
 */
export interface LoadTerrainMessage {
  opcode: typeof ZoneMessageOpcode.LoadTerrainMessage;
  terrainFileName: string;
}

/**
 * Serialize LoadTerrainMessage
 */
export function serializeLoadTerrainMessage(
  message: LoadTerrainMessage
): Uint8Array {
  const terrainBytes = new TextEncoder().encode(message.terrainFileName);
  const writer = new BufferWriter(10 + terrainBytes.length);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt16LE(terrainBytes.length);
  writer.writeBytes(terrainBytes);
  return writer.toBuffer();
}

/**
 * Deserialize LoadTerrainMessage
 */
export function deserializeLoadTerrainMessage(
  data: Uint8Array
): LoadTerrainMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.LoadTerrainMessage) {
    throw new Error(
      `Invalid opcode for LoadTerrainMessage: 0x${opcode.toString(16)}`
    );
  }
  const length = reader.readUInt16LE();
  const terrainBytes = reader.readBytes(length);
  const terrainFileName = new TextDecoder('ascii').decode(terrainBytes);

  return {
    opcode: ZoneMessageOpcode.LoadTerrainMessage,
    terrainFileName,
  };
}

/**
 * Create a LoadTerrainMessage
 */
export function createLoadTerrainMessage(
  terrainFileName: string
): LoadTerrainMessage {
  return {
    opcode: ZoneMessageOpcode.LoadTerrainMessage,
    terrainFileName,
  };
}

// ============================================
// SceneEndBaselines (0x2C436037)
// ============================================

/**
 * SceneEndBaselines - Signal end of baseline data for an object
 * Sent after all baselines for an object have been sent
 */
export interface SceneEndBaselines {
  opcode: typeof ZoneMessageOpcode.SceneEndBaselines;
  objectId: bigint;
}

/**
 * Serialize SceneEndBaselines message
 */
export function serializeSceneEndBaselines(
  message: SceneEndBaselines
): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  return writer.toBuffer();
}

/**
 * Deserialize SceneEndBaselines message
 */
export function deserializeSceneEndBaselines(
  data: Uint8Array
): SceneEndBaselines {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.SceneEndBaselines) {
    throw new Error(
      `Invalid opcode for SceneEndBaselines: 0x${opcode.toString(16)}`
    );
  }
  const objectId = reader.readUInt64LE();

  return {
    opcode: ZoneMessageOpcode.SceneEndBaselines,
    objectId,
  };
}

/**
 * Create a SceneEndBaselines message
 */
export function createSceneEndBaselines(objectId: bigint): SceneEndBaselines {
  return {
    opcode: ZoneMessageOpcode.SceneEndBaselines,
    objectId,
  };
}

// ============================================
// ServerTimeMessage (0x2E365218)
// ============================================

/**
 * ServerTimeMessage - Server time synchronization
 * Sent periodically to sync client time
 */
export interface ServerTimeMessage {
  opcode: typeof ZoneMessageOpcode.ServerTimeMessage;
  serverTime: bigint;
}

/**
 * Serialize ServerTimeMessage
 */
export function serializeServerTimeMessage(
  message: ServerTimeMessage
): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.serverTime);
  return writer.toBuffer();
}

/**
 * Deserialize ServerTimeMessage
 */
export function deserializeServerTimeMessage(
  data: Uint8Array
): ServerTimeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ZoneMessageOpcode.ServerTimeMessage) {
    throw new Error(
      `Invalid opcode for ServerTimeMessage: 0x${opcode.toString(16)}`
    );
  }
  const serverTime = reader.readUInt64LE();

  return {
    opcode: ZoneMessageOpcode.ServerTimeMessage,
    serverTime,
  };
}

/**
 * Create a ServerTimeMessage
 */
export function createServerTimeMessage(
  serverTime: bigint = BigInt(Date.now())
): ServerTimeMessage {
  return {
    opcode: ZoneMessageOpcode.ServerTimeMessage,
    serverTime,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all zone messages
 */
export type ZoneMessage =
  | CmdSceneReady
  | CmdStartScene
  | SceneCreateObjectByCrc
  | SceneDestroyObject
  | UpdateContainment
  | LoadTerrainMessage
  | SceneEndBaselines
  | ServerTimeMessage;

/**
 * Get the opcode from raw zone message data
 */
export function getZoneMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid zone message opcode
 */
export function isZoneMessageOpcode(
  opcode: number
): opcode is ZoneMessageOpcodeType {
  return Object.values(ZoneMessageOpcode).includes(
    opcode as ZoneMessageOpcodeType
  );
}

/**
 * Get terrain file name for a scene ID
 * Maps scene IDs to their terrain files
 */
export function getTerrainFileName(sceneId: string): string {
  // Map scene IDs to terrain file names
  const terrainMap: Record<string, string> = {
    tatooine: 'terrain/tatooine.trn',
    naboo: 'terrain/naboo.trn',
    corellia: 'terrain/corellia.trn',
    dantooine: 'terrain/dantooine.trn',
    dathomir: 'terrain/dathomir.trn',
    endor: 'terrain/endor.trn',
    lok: 'terrain/lok.trn',
    rori: 'terrain/rori.trn',
    talus: 'terrain/talus.trn',
    yavin4: 'terrain/yavin4.trn',
    kashyyyk_main: 'terrain/kashyyyk_main.trn',
    mustafar: 'terrain/mustafar.trn',
    tutorial: 'terrain/tutorial.trn',
    // Space zones
    space_tatooine: 'space/tatooine.tre',
    space_naboo: 'space/naboo.tre',
    space_corellia: 'space/corellia.tre',
    space_dantooine: 'space/dantooine.tre',
    space_dathomir: 'space/dathomir.tre',
    space_endor: 'space/endor.tre',
    space_lok: 'space/lok.tre',
    space_yavin4: 'space/yavin4.tre',
    space_kashyyyk: 'space/kashyyyk.tre',
    space_deep: 'space/deep.tre',
  };

  return terrainMap[sceneId] ?? `terrain/${sceneId}.trn`;
}
