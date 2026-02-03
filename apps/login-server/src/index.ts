/**
 * @swg/login-server
 * Authentication server for SWG (port 44453)
 */

// Export server components for programmatic use
export { createServer, type LoginServer } from './server.js';
export {
  LoginHandler,
  createLoginHandler,
  type ClientSession,
  type LoginResult,
} from './handlers/login-handler.js';
export {
  CharacterHandler,
  createCharacterHandler,
  CharacterType,
  type CharacterTypeValue,
  type CharacterEnumerationResult,
} from './handlers/character-handler.js';
export {
  UdpServer,
  createUdpServer,
  type UdpServerConfig,
  type RemoteEndpoint,
  type MessageCallback,
  type ErrorCallback,
} from './network/udp-server.js';

// Main entry point when run directly
import { createServer } from './server.js';
import { loadConfigFromEnv, parseConfig } from '@swg/config';

async function main(): Promise<void> {
  console.log('Starting SWG Login Server...');

  const config = parseConfig({
    ...loadConfigFromEnv(),
    loginServer: {
      port: parseInt(process.env['LOGIN_PORT'] ?? '44453', 10),
      bindAddress: process.env['LOGIN_BIND'] ?? '0.0.0.0',
    },
  });

  const server = await createServer(config);
  await server.start();

  console.log(`Login Server listening on ${config.loginServer?.bindAddress}:${config.loginServer?.port}`);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('Shutting down Login Server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

// Only run main if this is the entry point
const isMainModule = process.argv[1]?.endsWith('index.js') ||
                     process.argv[1]?.endsWith('index.ts') ||
                     process.argv[1]?.includes('login-server');

if (isMainModule) {
  void main().catch((error: unknown) => {
    console.error('Fatal error starting Login Server:', error);
    process.exit(1);
  });
}
