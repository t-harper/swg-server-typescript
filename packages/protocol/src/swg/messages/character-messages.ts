import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

export const CharacterMessageOpcodes = {
  DeleteCharacterMessage: 0xe87ad031,
  DeleteCharacterReplyMessage: 0x8268616c,
  LogoutMessage: 0x42878cb1,
  HeartBeat: 0xa16cf9af,
  CharacterSheetResponseMessage: 0x9b3a17c4,
  RefreshCharacterList: 0x4aaf6e21,
  ErrorMessage: 0xb5abf91a,
  ClientNotificationBoxMessage: 0x0b07e249,
} as const;

// ============================================================================
// DeleteCharacterMessage
// ============================================================================

export interface DeleteCharacterMessage {
  clusterId: number;
  characterId: bigint;
}

export function serializeDeleteCharacterMessage(msg: DeleteCharacterMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.DeleteCharacterMessage);
  writer.writeUInt32LE(msg.clusterId);
  writer.writeUInt64LE(msg.characterId);
  return writer.toBuffer();
}

export function deserializeDeleteCharacterMessage(data: Uint8Array): DeleteCharacterMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const clusterId = reader.readUInt32LE();
  const characterId = reader.readUInt64LE();
  return { clusterId, characterId };
}

export function createDeleteCharacterMessage(
  clusterId: number,
  characterId: bigint
): DeleteCharacterMessage {
  return { clusterId, characterId };
}

// ============================================================================
// DeleteCharacterReplyMessage
// ============================================================================

export enum DeleteCharacterResultCode {
  rc_OK = 0,
  rc_ALREADY_IN_PROGRESS = 1,
  rc_CLUSTER_DOWN = 2,
}

export interface DeleteCharacterReplyMessage {
  resultCode: number;
}

export function serializeDeleteCharacterReplyMessage(msg: DeleteCharacterReplyMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.DeleteCharacterReplyMessage);
  writer.writeInt32LE(msg.resultCode);
  return writer.toBuffer();
}

export function deserializeDeleteCharacterReplyMessage(data: Uint8Array): DeleteCharacterReplyMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const resultCode = reader.readInt32LE();
  return { resultCode };
}

export function createDeleteCharacterReplyMessage(
  resultCode: DeleteCharacterResultCode
): DeleteCharacterReplyMessage {
  return { resultCode };
}

// ============================================================================
// LogoutMessage (empty)
// ============================================================================

export interface LogoutMessage {
  // Empty message
}

export function serializeLogoutMessage(_msg?: LogoutMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.LogoutMessage);
  return writer.toBuffer();
}

export function deserializeLogoutMessage(data: Uint8Array): LogoutMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {};
}

export function createLogoutMessage(): LogoutMessage {
  return {};
}

// ============================================================================
// HeartBeat (empty)
// ============================================================================

export interface HeartBeat {
  // Empty message
}

export function serializeHeartBeat(_msg?: HeartBeat): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.HeartBeat);
  return writer.toBuffer();
}

export function deserializeHeartBeat(data: Uint8Array): HeartBeat {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {};
}

export function createHeartBeat(): HeartBeat {
  return {};
}

// ============================================================================
// CharacterSheetResponseMessage
// ============================================================================

export interface CharacterSheetResponseMessage {
  bornDate: number;
  played: number;
  bindLocation_x: number;
  bindLocation_y: number;
  bindLocation_z: number;
  bindPlanet: string;
  bankLocation_x: number;
  bankLocation_y: number;
  bankLocation_z: number;
  bankPlanet: string;
  residenceLocation_x: number;
  residenceLocation_y: number;
  residenceLocation_z: number;
  residencePlanet: string;
  citizensOf: string;
  spouseName: string;
  lotsUsed: number;
}

export function serializeCharacterSheetResponseMessage(
  msg: CharacterSheetResponseMessage
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(11); // operandCount (Vector counts as 1 addVariable)
  writer.writeUInt32LE(CharacterMessageOpcodes.CharacterSheetResponseMessage);

  writer.writeInt32LE(msg.bornDate);
  writer.writeInt32LE(msg.played);

  // bindLocation (Vector = 3 floats)
  writer.writeFloatLE(msg.bindLocation_x);
  writer.writeFloatLE(msg.bindLocation_y);
  writer.writeFloatLE(msg.bindLocation_z);
  writer.writeStringWithLength16LE(msg.bindPlanet);

  // bankLocation (Vector = 3 floats)
  writer.writeFloatLE(msg.bankLocation_x);
  writer.writeFloatLE(msg.bankLocation_y);
  writer.writeFloatLE(msg.bankLocation_z);
  writer.writeStringWithLength16LE(msg.bankPlanet);

  // residenceLocation (Vector = 3 floats)
  writer.writeFloatLE(msg.residenceLocation_x);
  writer.writeFloatLE(msg.residenceLocation_y);
  writer.writeFloatLE(msg.residenceLocation_z);
  writer.writeStringWithLength16LE(msg.residencePlanet);

  writer.writeStringWithLength16LE(msg.citizensOf);
  writer.writeUnicodeStringWithLength(msg.spouseName);
  writer.writeInt32LE(msg.lotsUsed);

  return writer.toBuffer();
}

export function deserializeCharacterSheetResponseMessage(
  data: Uint8Array
): CharacterSheetResponseMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode

  const bornDate = reader.readInt32LE();
  const played = reader.readInt32LE();

  // bindLocation (Vector = 3 floats)
  const bindLocation_x = reader.readFloatLE();
  const bindLocation_y = reader.readFloatLE();
  const bindLocation_z = reader.readFloatLE();
  const bindPlanet = reader.readStringWithLength16LE();

  // bankLocation (Vector = 3 floats)
  const bankLocation_x = reader.readFloatLE();
  const bankLocation_y = reader.readFloatLE();
  const bankLocation_z = reader.readFloatLE();
  const bankPlanet = reader.readStringWithLength16LE();

  // residenceLocation (Vector = 3 floats)
  const residenceLocation_x = reader.readFloatLE();
  const residenceLocation_y = reader.readFloatLE();
  const residenceLocation_z = reader.readFloatLE();
  const residencePlanet = reader.readStringWithLength16LE();

  const citizensOf = reader.readStringWithLength16LE();
  const spouseName = reader.readUnicodeStringWithLength();
  const lotsUsed = reader.readInt32LE();

  return {
    bornDate,
    played,
    bindLocation_x,
    bindLocation_y,
    bindLocation_z,
    bindPlanet,
    bankLocation_x,
    bankLocation_y,
    bankLocation_z,
    bankPlanet,
    residenceLocation_x,
    residenceLocation_y,
    residenceLocation_z,
    residencePlanet,
    citizensOf,
    spouseName,
    lotsUsed,
  };
}

export function createCharacterSheetResponseMessage(
  data: Partial<CharacterSheetResponseMessage>
): CharacterSheetResponseMessage {
  return {
    bornDate: data.bornDate ?? 0,
    played: data.played ?? 0,
    bindLocation_x: data.bindLocation_x ?? 0,
    bindLocation_y: data.bindLocation_y ?? 0,
    bindLocation_z: data.bindLocation_z ?? 0,
    bindPlanet: data.bindPlanet ?? '',
    bankLocation_x: data.bankLocation_x ?? 0,
    bankLocation_y: data.bankLocation_y ?? 0,
    bankLocation_z: data.bankLocation_z ?? 0,
    bankPlanet: data.bankPlanet ?? '',
    residenceLocation_x: data.residenceLocation_x ?? 0,
    residenceLocation_y: data.residenceLocation_y ?? 0,
    residenceLocation_z: data.residenceLocation_z ?? 0,
    residencePlanet: data.residencePlanet ?? '',
    citizensOf: data.citizensOf ?? '',
    spouseName: data.spouseName ?? '',
    lotsUsed: data.lotsUsed ?? 0,
  };
}

// ============================================================================
// RefreshCharacterList (empty)
// ============================================================================

export interface RefreshCharacterList {
  // Empty message
}

export function serializeRefreshCharacterList(_msg?: RefreshCharacterList): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.RefreshCharacterList);
  return writer.toBuffer();
}

export function deserializeRefreshCharacterList(data: Uint8Array): RefreshCharacterList {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  return {};
}

export function createRefreshCharacterList(): RefreshCharacterList {
  return {};
}

// ============================================================================
// ErrorMessage
// ============================================================================

export interface ErrorMessage {
  errorName: string;
  description: string;
  fatal: boolean;
}

export function serializeErrorMessage(msg: ErrorMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.ErrorMessage);
  writer.writeStringWithLength16LE(msg.errorName);
  writer.writeStringWithLength16LE(msg.description);
  writer.writeUInt8(msg.fatal ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeErrorMessage(data: Uint8Array): ErrorMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const errorName = reader.readStringWithLength16LE();
  const description = reader.readStringWithLength16LE();
  const fatal = reader.readUInt8() !== 0;
  return { errorName, description, fatal };
}

export function createErrorMessage(
  errorName: string,
  description: string,
  fatal: boolean
): ErrorMessage {
  return { errorName, description, fatal };
}

// ============================================================================
// ClientNotificationBoxMessage
// ============================================================================

export enum ClientNotificationIconStyle {
  IS_NONE = 0,
  IS_QUESTION = 1,
  IS_EXCLAMATION = 2,
}

export enum ClientNotificationChannel {
  NC_HELP = 0,
  NC_SPECIAL_CANCEL = 0xff,
  NC_SPECIAL_CANCEL_ALL = 0xfe,
}

export interface ClientNotificationBoxMessage {
  sequenceId: number;
  player: bigint;
  contents: string;
  useNotificationIcon: boolean;
  iconStyle: number;
  timeout: number;
  channel: number;
  sound: string;
}

export function serializeClientNotificationBoxMessage(
  msg: ClientNotificationBoxMessage
): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(CharacterMessageOpcodes.ClientNotificationBoxMessage);
  writer.writeInt32LE(msg.sequenceId);
  writer.writeUInt64LE(msg.player);
  writer.writeUnicodeStringWithLength(msg.contents);
  writer.writeUInt8(msg.useNotificationIcon ? 1 : 0);
  writer.writeInt32LE(msg.iconStyle);
  writer.writeFloatLE(msg.timeout);
  writer.writeInt32LE(msg.channel);
  writer.writeStringWithLength16LE(msg.sound);
  return writer.toBuffer();
}

export function deserializeClientNotificationBoxMessage(
  data: Uint8Array
): ClientNotificationBoxMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  reader.readUInt32LE(); // opcode
  const sequenceId = reader.readInt32LE();
  const player = reader.readUInt64LE();
  const contents = reader.readUnicodeStringWithLength();
  const useNotificationIcon = reader.readUInt8() !== 0;
  const iconStyle = reader.readInt32LE();
  const timeout = reader.readFloatLE();
  const channel = reader.readInt32LE();
  const sound = reader.readStringWithLength16LE();

  return {
    sequenceId,
    player,
    contents,
    useNotificationIcon,
    iconStyle,
    timeout,
    channel,
    sound,
  };
}

export function createClientNotificationBoxMessage(
  data: Partial<ClientNotificationBoxMessage>
): ClientNotificationBoxMessage {
  return {
    sequenceId: data.sequenceId ?? 0,
    player: data.player ?? 0n,
    contents: data.contents ?? '',
    useNotificationIcon: data.useNotificationIcon ?? false,
    iconStyle: data.iconStyle ?? ClientNotificationIconStyle.IS_NONE,
    timeout: data.timeout ?? 0,
    channel: data.channel ?? ClientNotificationChannel.NC_HELP,
    sound: data.sound ?? '',
  };
}
