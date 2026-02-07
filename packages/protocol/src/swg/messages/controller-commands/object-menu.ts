/**
 * Object Menu (Radial Menu) Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageType:
 *   - CM_objectMenuRequest  (326) - Client->Server AND Server->Client
 *   - CM_objectMenuResponse (327) - Server->Client
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueObjectMenuRequest.cpp pack/unpack
 *
 * Wire format (MessageQueueObjectMenuRequest):
 *   NetworkId  targetId      (u64)
 *   NetworkId  requestorId   (u64)
 *   u8         sequence
 *   u32        menuItemCount
 *   for each menu item:
 *     u8              parentId       (index of parent, 0 = root)
 *     u8              menuItemType   (ObjectMenuRequestData enum)
 *     u8              menuItemAction
 *     Unicode::String label          (u32LE charCount + utf16le)
 *     bool            serverNotify   (u8, 0 or 1)
 *
 * CM_objectMenuResponse uses the same wire format as CM_objectMenuRequest.
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Interfaces
// ============================================

/**
 * A single item in the radial/object menu.
 */
export interface ObjectMenuRequestDataItem {
  /** Index of parent item (0 = root level) */
  parentId: number;
  /** ObjectMenuItemType enum value (e.g. examine, trade, loot, etc.) */
  menuItemType: number;
  /** Action flags for this menu item */
  menuItemAction: number;
  /** Unicode label text (can be empty for standard menu items) */
  label: string;
  /** Whether the server should be notified when this item is selected */
  serverNotify: boolean;
}

/**
 * ObjectMenuMessage - shared format for both CM_objectMenuRequest (326)
 * and CM_objectMenuResponse (327).
 */
export interface ObjectMenuMessage {
  /** NetworkId of the target object being right-clicked */
  targetId: bigint;
  /** NetworkId of the player making the request */
  requestorId: bigint;
  /** Sequence number for request/response matching */
  sequence: number;
  /** The list of radial menu items */
  menuItems: ObjectMenuRequestDataItem[];
}

// ============================================
// Serialize
// ============================================

/**
 * Serialize an ObjectMenuMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueObjectMenuRequest::pack):
 *   u64   targetId
 *   u64   requestorId
 *   u8    sequence
 *   u32   menuItemCount
 *   for each menu item:
 *     u8              parentId
 *     u8              menuItemType
 *     u8              menuItemAction
 *     Unicode::String label (u32LE charCount + utf16le)
 *     u8              serverNotify (bool)
 */
export function serializeObjectMenu(msg: ObjectMenuMessage): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt64LE(msg.targetId);
  writer.writeUInt64LE(msg.requestorId);
  writer.writeUInt8(msg.sequence);
  writer.writeUInt32LE(msg.menuItems.length);

  for (const item of msg.menuItems) {
    writer.writeUInt8(item.parentId);
    writer.writeUInt8(item.menuItemType);
    writer.writeUInt8(item.menuItemAction);
    writer.writeUnicodeStringWithLength(item.label);
    writer.writeUInt8(item.serverNotify ? 1 : 0);
  }

  return writer.toBuffer();
}

// ============================================
// Deserialize
// ============================================

/**
 * Deserialize an ObjectMenuMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeObjectMenu(
  data: Uint8Array,
  offset: number = 0
): ObjectMenuMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const targetId = reader.readUInt64LE();
  const requestorId = reader.readUInt64LE();
  const sequence = reader.readUInt8();
  const menuItemCount = reader.readUInt32LE();

  const menuItems: ObjectMenuRequestDataItem[] = [];
  for (let i = 0; i < menuItemCount; i++) {
    const parentId = reader.readUInt8();
    const menuItemType = reader.readUInt8();
    const menuItemAction = reader.readUInt8();
    const label = reader.readUnicodeStringWithLength();
    const serverNotify = reader.readUInt8() !== 0;

    menuItems.push({
      parentId,
      menuItemType,
      menuItemAction,
      label,
      serverNotify,
    });
  }

  return { targetId, requestorId, sequence, menuItems };
}

// ============================================
// Factory
// ============================================

/**
 * Create an ObjectMenuMessage.
 *
 * @param targetId    - NetworkId of the target object
 * @param requestorId - NetworkId of the requesting player
 * @param sequence    - Sequence number for request/response matching
 * @param menuItems   - List of radial menu items
 */
export function createObjectMenu(
  targetId: bigint,
  requestorId: bigint,
  sequence: number,
  menuItems: ObjectMenuRequestDataItem[] = []
): ObjectMenuMessage {
  return { targetId, requestorId, sequence, menuItems };
}

/**
 * Create an ObjectMenuRequestDataItem.
 *
 * @param menuItemType   - ObjectMenuItemType enum value
 * @param parentId       - Index of parent item (0 = root)
 * @param menuItemAction - Action flags (default 0)
 * @param label          - Unicode label text (default empty)
 * @param serverNotify   - Whether server is notified on selection (default false)
 */
export function createObjectMenuRequestDataItem(
  menuItemType: number,
  parentId: number = 0,
  menuItemAction: number = 0,
  label: string = '',
  serverNotify: boolean = false
): ObjectMenuRequestDataItem {
  return { parentId, menuItemType, menuItemAction, label, serverNotify };
}
