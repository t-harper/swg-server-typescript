import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

export const TradeOpcodes = {
  BeginTradeMessage: 0x325932d8,
  AbortTradeMessage: 0x6d8a0c3a,
  AddItemMessage: 0x1e3e3fbb,
  AddItemFailedMessage: 0x5c56eaac,
  RemoveItemMessage: 0x44e03462,
  GiveMoneyMessage: 0xd1527cf8,
  AcceptTransactionMessage: 0xb131ca17,
  UnAcceptTransactionMessage: 0xe81e4382,
  VerifyTradeMessage: 0x9ae247ee,
  DenyTradeMessage: 0xea5f3820,
  BeginVerificationMessage: 0x8946cfab,
  TradeCompleteMessage: 0xc8f03561,
} as const;

// ============================================================================
// BeginTradeMessage - Initiates a trade with another player
// ============================================================================

export interface BeginTradeMessage {
  player: bigint; // NetworkId of the player to trade with
}

export function serializeBeginTradeMessage(msg: BeginTradeMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(TradeOpcodes.BeginTradeMessage);
  writer.writeUInt64LE(msg.player);
  return writer.toBuffer();
}

export function deserializeBeginTradeMessage(data: Uint8Array): BeginTradeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.BeginTradeMessage) {
    throw new Error(`Invalid opcode for BeginTradeMessage: ${opcode.toString(16)}`);
  }
  const player = reader.readUInt64LE();
  return { player };
}

export function createBeginTradeMessage(player: bigint): Uint8Array {
  return serializeBeginTradeMessage({ player });
}

// ============================================================================
// AbortTradeMessage - Cancels the current trade
// ============================================================================

export interface AbortTradeMessage {
  // Empty message
}

export function serializeAbortTradeMessage(_msg: AbortTradeMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.AbortTradeMessage);
  return writer.toBuffer();
}

export function deserializeAbortTradeMessage(data: Uint8Array): AbortTradeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.AbortTradeMessage) {
    throw new Error(`Invalid opcode for AbortTradeMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createAbortTradeMessage(): Uint8Array {
  return serializeAbortTradeMessage({});
}

// ============================================================================
// AddItemMessage - Adds an item to the trade window
// ============================================================================

export interface AddItemMessage {
  object: bigint; // NetworkId of the object to add
}

export function serializeAddItemMessage(msg: AddItemMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(TradeOpcodes.AddItemMessage);
  writer.writeUInt64LE(msg.object);
  return writer.toBuffer();
}

export function deserializeAddItemMessage(data: Uint8Array): AddItemMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.AddItemMessage) {
    throw new Error(`Invalid opcode for AddItemMessage: ${opcode.toString(16)}`);
  }
  const object = reader.readUInt64LE();
  return { object };
}

export function createAddItemMessage(object: bigint): Uint8Array {
  return serializeAddItemMessage({ object });
}

// ============================================================================
// AddItemFailedMessage - Item could not be added to trade
// ============================================================================

export interface AddItemFailedMessage {
  object: bigint; // NetworkId of the object that failed to add
}

export function serializeAddItemFailedMessage(msg: AddItemFailedMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(TradeOpcodes.AddItemFailedMessage);
  writer.writeUInt64LE(msg.object);
  return writer.toBuffer();
}

export function deserializeAddItemFailedMessage(data: Uint8Array): AddItemFailedMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.AddItemFailedMessage) {
    throw new Error(`Invalid opcode for AddItemFailedMessage: ${opcode.toString(16)}`);
  }
  const object = reader.readUInt64LE();
  return { object };
}

export function createAddItemFailedMessage(object: bigint): Uint8Array {
  return serializeAddItemFailedMessage({ object });
}

// ============================================================================
// RemoveItemMessage - Removes an item from the trade window
// ============================================================================

export interface RemoveItemMessage {
  object: bigint; // NetworkId of the object to remove
}

export function serializeRemoveItemMessage(msg: RemoveItemMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(TradeOpcodes.RemoveItemMessage);
  writer.writeUInt64LE(msg.object);
  return writer.toBuffer();
}

export function deserializeRemoveItemMessage(data: Uint8Array): RemoveItemMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.RemoveItemMessage) {
    throw new Error(`Invalid opcode for RemoveItemMessage: ${opcode.toString(16)}`);
  }
  const object = reader.readUInt64LE();
  return { object };
}

export function createRemoveItemMessage(object: bigint): Uint8Array {
  return serializeRemoveItemMessage({ object });
}

// ============================================================================
// GiveMoneyMessage - Offers credits in the trade
// ============================================================================

export interface GiveMoneyMessage {
  amount: number; // Amount of credits to give (i32)
}

export function serializeGiveMoneyMessage(msg: GiveMoneyMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(TradeOpcodes.GiveMoneyMessage);
  writer.writeInt32LE(msg.amount);
  return writer.toBuffer();
}

export function deserializeGiveMoneyMessage(data: Uint8Array): GiveMoneyMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.GiveMoneyMessage) {
    throw new Error(`Invalid opcode for GiveMoneyMessage: ${opcode.toString(16)}`);
  }
  const amount = reader.readInt32LE();
  return { amount };
}

export function createGiveMoneyMessage(amount: number): Uint8Array {
  return serializeGiveMoneyMessage({ amount });
}

// ============================================================================
// AcceptTransactionMessage - Player accepts the current trade offer
// ============================================================================

export interface AcceptTransactionMessage {
  // Empty message
}

export function serializeAcceptTransactionMessage(_msg: AcceptTransactionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.AcceptTransactionMessage);
  return writer.toBuffer();
}

export function deserializeAcceptTransactionMessage(data: Uint8Array): AcceptTransactionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.AcceptTransactionMessage) {
    throw new Error(`Invalid opcode for AcceptTransactionMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createAcceptTransactionMessage(): Uint8Array {
  return serializeAcceptTransactionMessage({});
}

// ============================================================================
// UnAcceptTransactionMessage - Player un-accepts the trade offer
// ============================================================================

export interface UnAcceptTransactionMessage {
  // Empty message
}

export function serializeUnAcceptTransactionMessage(_msg: UnAcceptTransactionMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.UnAcceptTransactionMessage);
  return writer.toBuffer();
}

export function deserializeUnAcceptTransactionMessage(data: Uint8Array): UnAcceptTransactionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.UnAcceptTransactionMessage) {
    throw new Error(`Invalid opcode for UnAcceptTransactionMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createUnAcceptTransactionMessage(): Uint8Array {
  return serializeUnAcceptTransactionMessage({});
}

// ============================================================================
// VerifyTradeMessage - Player confirms the final trade verification
// ============================================================================

export interface VerifyTradeMessage {
  // Empty message
}

export function serializeVerifyTradeMessage(_msg: VerifyTradeMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.VerifyTradeMessage);
  return writer.toBuffer();
}

export function deserializeVerifyTradeMessage(data: Uint8Array): VerifyTradeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.VerifyTradeMessage) {
    throw new Error(`Invalid opcode for VerifyTradeMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createVerifyTradeMessage(): Uint8Array {
  return serializeVerifyTradeMessage({});
}

// ============================================================================
// DenyTradeMessage - Player denies the final trade verification
// ============================================================================

export interface DenyTradeMessage {
  // Empty message
}

export function serializeDenyTradeMessage(_msg: DenyTradeMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.DenyTradeMessage);
  return writer.toBuffer();
}

export function deserializeDenyTradeMessage(data: Uint8Array): DenyTradeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.DenyTradeMessage) {
    throw new Error(`Invalid opcode for DenyTradeMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createDenyTradeMessage(): Uint8Array {
  return serializeDenyTradeMessage({});
}

// ============================================================================
// BeginVerificationMessage - Server signals verification phase has begun
// ============================================================================

export interface BeginVerificationMessage {
  // Empty message
}

export function serializeBeginVerificationMessage(_msg: BeginVerificationMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.BeginVerificationMessage);
  return writer.toBuffer();
}

export function deserializeBeginVerificationMessage(data: Uint8Array): BeginVerificationMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.BeginVerificationMessage) {
    throw new Error(`Invalid opcode for BeginVerificationMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createBeginVerificationMessage(): Uint8Array {
  return serializeBeginVerificationMessage({});
}

// ============================================================================
// TradeCompleteMessage - Server signals trade has completed successfully
// ============================================================================

export interface TradeCompleteMessage {
  // Empty message
}

export function serializeTradeCompleteMessage(_msg: TradeCompleteMessage): Uint8Array {
  const writer = new BufferWriter();
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(TradeOpcodes.TradeCompleteMessage);
  return writer.toBuffer();
}

export function deserializeTradeCompleteMessage(data: Uint8Array): TradeCompleteMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TradeOpcodes.TradeCompleteMessage) {
    throw new Error(`Invalid opcode for TradeCompleteMessage: ${opcode.toString(16)}`);
  }
  return {};
}

export function createTradeCompleteMessage(): Uint8Array {
  return serializeTradeCompleteMessage({});
}
