/**
 * @swg/chat-server
 * Chat server for SWG handling spatial chat, system messages, and broadcasts
 */

import { createServer } from './server.js';
import { loadConfigFromEnv, parseConfig } from '@swg/config';

// Re-export public API
export { createServer } from './server.js';
export type { ChatServer, ChatServerStats, ChatClientSession } from './server.js';

export {
  SpatialChatHandler,
  createSpatialChatHandler,
  SpatialChatType,
  ChatRanges,
  LanguageComprehension,
} from './handlers/spatial-chat-handler.js';
export type {
  SpatialChatHandlerConfig,
  SpatialChatMessage,
  SpatialChatResult,
  ChatParticipant,
  Position,
} from './handlers/spatial-chat-handler.js';

export {
  SystemMessageHandler,
  createSystemMessageHandler,
  SystemMessageType,
  MessagePriority,
  BroadcastScope,
} from './handlers/system-message-handler.js';
export type {
  SystemMessageHandlerConfig,
  SystemMessage,
  BroadcastAnnouncement,
  CombatSpamMessage,
  MessageRecipient,
} from './handlers/system-message-handler.js';

export {
  ChatRoomHandler,
  createChatRoomHandler,
} from './handlers/chat-room-handler.js';
export type {
  ChatRoom,
  RoomMember,
  ObjectId,
  CreateRoomOptions,
  RoomOperationResult,
  ChatRoomHandlerConfig,
  ChatRoomDatabase,
} from './handlers/chat-room-handler.js';

export {
  ChatRoomResultCode,
} from './handlers/chat-room-messages.js';
export type {
  ChatRoomInfo,
  ChatRoomMemberInfo,
  ChatRoomCreateMessage,
  ChatRoomCreateResponseMessage,
  ChatRoomDestroyMessage,
  ChatRoomDestroyResponseMessage,
  ChatRoomJoinMessage,
  ChatRoomJoinResponseMessage,
  ChatRoomLeaveMessage,
  ChatRoomLeaveResponseMessage,
  ChatRoomSendMessage,
  ChatRoomReceiveMessage,
  ChatRoomKickMessage,
  ChatRoomBanMessage,
  ChatRoomUnbanMessage,
  ChatRoomModeratorMessage,
  ChatRoomMOTDMessage,
  ChatRoomMOTDChangedMessage,
  ChatRoomListMessage,
  ChatRoomListResponseMessage,
  ChatRoomMembersMessage,
  ChatRoomMembersResponseMessage,
  ChatRoomUserJoinedMessage,
  ChatRoomUserLeftMessage,
  ChatRoomUserKickedMessage,
  ChatRoomUserBannedMessage,
  ChatRoomUserUnbannedMessage,
  ChatRoomDestroyedMessage,
  ChatRoomPubSubMessage,
} from './handlers/chat-room-messages.js';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: bigint): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Main entry point when running as a standalone server
 */
async function main(): Promise<void> {
  console.log('Starting SWG Chat Server...');
  console.log(`  Version: 1.0.0`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log('');

  // Build configuration from environment
  const envConfig = loadConfigFromEnv();

  const config = parseConfig({
    ...envConfig,
  });

  // Create and start server
  const server = await createServer(config);
  await server.start();

  const chatPort = process.env['CHAT_PORT'] ?? '44460';
  const chatBind = process.env['CHAT_BIND'] ?? '0.0.0.0';
  const maxConnections = process.env['CHAT_MAX_CONNECTIONS'] ?? '5000';

  console.log('');
  console.log(`Chat Server listening on ${chatBind}:${chatPort}`);
  console.log('');
  console.log('Configuration:');
  console.log(`  Max Connections: ${maxConnections}`);
  console.log(`  Redis: ${config.redis.host}:${config.redis.port}`);
  console.log('');
  console.log('Server is ready. Press Ctrl+C to stop.');

  // Periodic stats logging
  const statsInterval = setInterval(() => {
    const stats = server.getStats();
    console.log(
      `[Stats] Clients: ${stats.connectedClients} (${stats.authenticatedSessions} auth) | ` +
      `Chat: ${stats.spatialChatParticipants} | ` +
      `System: ${stats.systemMessageRecipients} | ` +
      `Messages: ${stats.messagesProcessed} | ` +
      `Traffic: ${formatBytes(stats.bytesReceived)}/${formatBytes(stats.bytesSent)} (rx/tx)`
    );
  }, 60000); // Log stats every minute

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    console.log('');
    console.log(`Received ${signal}, shutting down Chat Server...`);

    clearInterval(statsInterval);

    try {
      await server.stop();
      console.log('Chat Server stopped successfully.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    // Don't exit on unhandled rejection, just log it
  });
}

// Run main if this is the entry point
const isMain =
  process.argv[1]?.includes('chat-server') ||
  process.argv[1]?.endsWith('/index.js') ||
  process.argv[1]?.endsWith('/index.ts');

if (isMain) {
  void main().catch((error: unknown) => {
    console.error('Fatal error starting Chat Server:', error);
    process.exit(1);
  });
}
