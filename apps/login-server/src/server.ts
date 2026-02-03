/**
 * Login Server
 * Main server orchestration for handling login requests
 */

import type { ServerConfig } from '@swg/config';
import {
  initDb,
  AccountRepository,
  CharacterRepository,
} from '@swg/database';
import { getRedisClient, SessionStore } from '@swg/redis';
import {
  SessionManager,
  type Session,
  DisconnectReason,
} from '@swg/protocol/soe';
import {
  LoginMessageOpcode,
  deserializeLoginClientId,
  getLoginMessageOpcode,
} from '@swg/protocol/swg/messages/login-messages.js';
import {
  CharacterCreationOpcode,
  deserializeClientCreateCharacter,
  deserializeClientVerifyAndLockNameRequest,
  deserializeClientRandomNameRequest,
} from '@swg/protocol/swg/messages/character-creation.js';

import { UdpServer, createUdpServer, type RemoteEndpoint } from './network/udp-server.js';
import {
  LoginHandler,
  createLoginHandler,
  type ClientSession,
} from './handlers/login-handler.js';
import {
  CharacterHandler,
  createCharacterHandler,
} from './handlers/character-handler.js';
import {
  CharacterCreationHandler,
  createCharacterCreationHandler,
} from './handlers/character-creation-handler.js';

/**
 * Extended session with login-specific data
 */
interface LoginSession {
  soeSession: Session;
  clientSession: ClientSession;
  authenticated: boolean;
  accountId?: number;
  stationId?: bigint;
  sessionToken?: string;
}

/**
 * Login Server instance interface
 */
export interface LoginServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getConnectionCount(): number;
}

/**
 * Create a unique key for a client endpoint
 */
function getClientKey(address: string, port: number): string {
  return `${address}:${port}`;
}

/**
 * Create the Login Server
 * @param config - Server configuration
 * @returns LoginServer instance
 */
export async function createServer(config: ServerConfig): Promise<LoginServer> {
  // Initialize database
  const db = initDb(config.database);
  console.log('[LoginServer] Database initialized');

  // Initialize Redis
  const redisClient = getRedisClient(config.redis);
  await redisClient.connect();
  console.log('[LoginServer] Redis connected');

  // Create repositories
  const accountRepository = new AccountRepository(db);
  const characterRepository = new CharacterRepository(db);

  // Create session store
  const sessionStore = new SessionStore(redisClient, {
    defaultTtlSeconds: config.loginServer?.sessionTimeout ?? 3600,
    keyPrefix: 'login:session:',
  });

  // Create handlers
  const serverId = 1; // Could be configurable
  const loginHandler = createLoginHandler(accountRepository, sessionStore, serverId);
  const characterHandler = createCharacterHandler(
    characterRepository,
    sessionStore,
    serverId
  );
  const characterCreationHandler = createCharacterCreationHandler(
    characterRepository,
    sessionStore,
    serverId
  );

  // Create UDP server
  const udpServer = createUdpServer({
    recvBufferSize: 65536,
    sendBufferSize: 65536,
  });

  // Create SOE session manager
  const sessionManager = new SessionManager({
    udpBufferSize: 496,
    sessionTimeout: 30000,
    resendTimeout: 500,
    maxRetries: 5,
    enableCompression: true,
    enableEncryption: true,
    tickInterval: 100,
  });

  // Login sessions map (keyed by client address:port)
  const loginSessions = new Map<string, LoginSession>();

  // Server configuration
  const serverPort = config.loginServer?.port ?? 44453;
  const bindAddress = config.loginServer?.bindAddress ?? '0.0.0.0';

  /**
   * Get or create a login session for a SOE session
   */
  function getLoginSession(soeSession: Session): LoginSession {
    const key = soeSession.getKey();
    let loginSession = loginSessions.get(key);

    if (!loginSession) {
      const clientSession: ClientSession = {
        connectionId: soeSession.sessionId,
        address: soeSession.clientAddress.address,
        port: soeSession.clientAddress.port,
        crcSeed: soeSession.crcSeed,
        authenticated: false,
      };

      loginSession = {
        soeSession,
        clientSession,
        authenticated: false,
      };

      loginSessions.set(key, loginSession);
    }

    return loginSession;
  }

  /**
   * Handle SWG message received from client
   */
  async function handleSwgMessage(
    soeSession: Session,
    data: Uint8Array
  ): Promise<void> {
    const clientKey = soeSession.getKey();

    if (data.length < 4) {
      console.warn(`[LoginServer] SWG message too short from ${clientKey}`);
      return;
    }

    const loginSession = getLoginSession(soeSession);
    const opcode = getLoginMessageOpcode(data);

    try {
      switch (opcode) {
        case LoginMessageOpcode.LoginClientId: {
          console.log(`[LoginServer] LoginClientId from ${clientKey}`);
          const loginMessage = deserializeLoginClientId(data);
          const result = await loginHandler.handleLoginClientId(
            loginSession.clientSession,
            loginMessage
          );

          if (result.success && result.session) {
            // Update login session with authenticated info
            loginSession.authenticated = true;
            loginSession.accountId = result.session.accountId;
            loginSession.stationId = result.session.stationId;
            loginSession.sessionToken = result.session.sessionToken;

            // Also update client session
            loginSession.clientSession.authenticated = true;
            loginSession.clientSession.accountId = result.session.accountId;
            loginSession.clientSession.stationId = result.session.stationId;
            loginSession.clientSession.sessionToken = result.session.sessionToken;
          }

          // Send response using reliable delivery
          sessionManager.sendReliable(soeSession, result.response);
          break;
        }

        case LoginMessageOpcode.EnumerateCharacterId: {
          console.log(`[LoginServer] EnumerateCharacterId from ${clientKey}`);
          const result = await characterHandler.handleEnumerateCharacterId(
            loginSession.clientSession
          );

          // Send response using reliable delivery
          sessionManager.sendReliable(soeSession, result.response);
          break;
        }

        case CharacterCreationOpcode.ClientCreateCharacter: {
          console.log(`[LoginServer] ClientCreateCharacter from ${clientKey}`);
          const createMessage = deserializeClientCreateCharacter(data);
          const result = await characterCreationHandler.createCharacter(
            loginSession.clientSession,
            createMessage
          );

          // Send response using reliable delivery
          sessionManager.sendReliable(soeSession, result.response);

          if (result.success) {
            console.log(
              `[LoginServer] Character created: ${createMessage.characterName} (ID: ${result.characterId})`
            );
          } else {
            console.log(
              `[LoginServer] Character creation failed: ${result.errorMessage}`
            );
          }
          break;
        }

        case CharacterCreationOpcode.ClientVerifyAndLockNameRequest: {
          console.log(`[LoginServer] ClientVerifyAndLockNameRequest from ${clientKey}`);
          const verifyMessage = deserializeClientVerifyAndLockNameRequest(data);
          const response = await characterCreationHandler.handleVerifyName(
            loginSession.clientSession,
            verifyMessage
          );

          sessionManager.sendReliable(soeSession, response);
          break;
        }

        case CharacterCreationOpcode.ClientRandomNameRequest: {
          console.log(`[LoginServer] ClientRandomNameRequest from ${clientKey}`);
          const randomMessage = deserializeClientRandomNameRequest(data);
          const response = characterCreationHandler.handleRandomName(randomMessage);

          sessionManager.sendReliable(soeSession, response);
          break;
        }

        default:
          console.log(
            `[LoginServer] Unknown SWG message opcode: 0x${opcode.toString(16)} from ${clientKey}`
          );
      }
    } catch (error) {
      console.error(`[LoginServer] Error handling SWG message from ${clientKey}:`, error);
    }
  }

  /**
   * Clean up a login session
   */
  async function cleanupLoginSession(key: string): Promise<void> {
    const loginSession = loginSessions.get(key);
    if (loginSession) {
      // Clean up Redis session if authenticated
      if (loginSession.authenticated && loginSession.sessionToken) {
        try {
          await sessionStore.deleteSession(loginSession.sessionToken);
        } catch (error) {
          console.error(`[LoginServer] Error deleting Redis session:`, error);
        }
      }
      loginSessions.delete(key);
    }
  }

  // Set up session manager callbacks
  sessionManager.setSendCallback((data, address, port) => {
    udpServer.sendSync(data, address, port);
  });

  // Handle new connections
  sessionManager.on('session:connected', (session) => {
    const key = session.getKey();
    console.log(`[LoginServer] Session connected: ${key}`);
    getLoginSession(session);
  });

  // Handle disconnections
  sessionManager.on('session:disconnected', (session, reason) => {
    const key = session.getKey();
    console.log(`[LoginServer] Session disconnected: ${key}, reason: ${reason}`);
    void cleanupLoginSession(key);
  });

  // Handle received data (SWG messages)
  sessionManager.on('data', (session, data) => {
    void handleSwgMessage(session, data);
  });

  // Handle errors
  sessionManager.on('error', (error, session) => {
    if (session) {
      console.error(`[LoginServer] Error for session ${session.getKey()}:`, error);
    } else {
      console.error('[LoginServer] Error:', error);
    }
  });

  // Set up UDP message handler
  udpServer.onMessage((data, remote) => {
    sessionManager.handlePacket(data, {
      address: remote.address,
      port: remote.port,
    });
  });

  // Set up error handler
  udpServer.onError((error) => {
    console.error('[LoginServer] UDP error:', error);
  });

  // Server control state
  let running = false;

  return {
    async start(): Promise<void> {
      if (running) {
        throw new Error('Server is already running');
      }

      await udpServer.bind(serverPort, bindAddress);
      sessionManager.start();
      running = true;

      console.log(`[LoginServer] Started on ${bindAddress}:${serverPort}`);
    },

    async stop(): Promise<void> {
      if (!running) {
        return;
      }

      // Stop session manager (disconnects all sessions)
      sessionManager.stop();

      // Disconnect all sessions gracefully
      for (const session of sessionManager.getSessions()) {
        sessionManager.disconnectSession(session, DisconnectReason.Application);
      }

      // Clean up all login sessions
      for (const key of loginSessions.keys()) {
        await cleanupLoginSession(key);
      }

      // Destroy session manager
      sessionManager.destroy();

      // Close UDP server
      await udpServer.close();

      // Disconnect Redis
      await redisClient.disconnect();

      running = false;
      console.log('[LoginServer] Stopped');
    },

    isRunning(): boolean {
      return running;
    },

    getConnectionCount(): number {
      return sessionManager.getSessionCount();
    },
  };
}
