/**
 * @swg/connection-server
 * Client routing and session management server (port 44455)
 */

import { createServer } from './server.js';
import { loadConfigFromEnv, parseConfig } from '@swg/config';

// Re-export public API
export { createServer } from './server.js';
export type { ConnectionServer, ConnectionServerStats } from './server.js';

export { UdpServer, createUdpServer } from './network/udp-server.js';
export type {
  UdpServerConfig,
  UdpServerStats,
  RemoteInfo,
  MessageCallback,
} from './network/udp-server.js';

export {
  ConnectionHandler,
  createConnectionHandler,
  SessionState,
} from './handlers/connection-handler.js';
export type {
  ClientSession,
  ConnectionHandlerConfig,
  ValidationResult,
  PlayerConnectedMessage,
  PlayerDisconnectedMessage,
  HeartbeatMessage,
} from './handlers/connection-handler.js';

export {
  RoutingHandler,
  createRoutingHandler,
  GameServerStatus,
} from './handlers/routing-handler.js';
export type {
  GameServerInfo,
  RoutingResult,
  CharacterInfo,
  RoutingHandlerConfig,
  GameServerStatusMessage,
  PlayerRoutedMessage,
} from './handlers/routing-handler.js';

/**
 * Main entry point when running as a standalone server
 */
async function main(): Promise<void> {
  console.log('Starting SWG Connection Server...');
  console.log(`  Version: 1.0.0`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log('');

  // Build configuration from environment
  const envConfig = loadConfigFromEnv();

  const config = parseConfig({
    ...envConfig,
    connectionServer: {
      port: parseInt(process.env['CONNECTION_PORT'] ?? '44455', 10),
      bindAddress: process.env['CONNECTION_BIND'] ?? '0.0.0.0',
      maxConnections: parseInt(process.env['CONNECTION_MAX_CLIENTS'] ?? '3000', 10),
      pingInterval: parseInt(process.env['CONNECTION_PING_INTERVAL'] ?? '30000', 10),
      disconnectTimeout: parseInt(process.env['CONNECTION_DISCONNECT_TIMEOUT'] ?? '60000', 10),
    },
  });

  // Create and start server
  const server = await createServer(config);
  await server.start();

  const { connectionServer } = config;
  console.log('');
  console.log(`Connection Server listening on ${connectionServer?.bindAddress}:${connectionServer?.port}`);
  console.log('');
  console.log('Configuration:');
  console.log(`  Max Connections: ${connectionServer?.maxConnections}`);
  console.log(`  Ping Interval: ${connectionServer?.pingInterval}ms`);
  console.log(`  Disconnect Timeout: ${connectionServer?.disconnectTimeout}ms`);
  console.log(`  Redis: ${config.redis.host}:${config.redis.port}`);
  console.log('');
  console.log('Server is ready. Press Ctrl+C to stop.');

  // Periodic stats logging
  const statsInterval = setInterval(() => {
    const stats = server.getStats();
    console.log(
      `[Stats] Sessions: ${stats.activeSessions} | ` +
      `Packets: ${stats.network.packetsReceived}/${stats.network.packetsSent} (rx/tx) | ` +
      `Bytes: ${formatBytes(stats.network.bytesReceived)}/${formatBytes(stats.network.bytesSent)} (rx/tx)`
    );
  }, 60000); // Log stats every minute

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    console.log('');
    console.log(`Received ${signal}, shutting down Connection Server...`);

    clearInterval(statsInterval);

    try {
      await server.stop();
      console.log('Connection Server stopped successfully.');
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

// Run main if this is the entry point
const isMain = process.argv[1]?.includes('connection-server') ||
               process.argv[1]?.endsWith('/index.js') ||
               process.argv[1]?.endsWith('/index.ts');

if (isMain) {
  void main().catch((error: unknown) => {
    console.error('Fatal error starting Connection Server:', error);
    process.exit(1);
  });
}
