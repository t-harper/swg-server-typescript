/**
 * Login Handler
 * Handles authentication flow for login requests
 */

import { createHash } from 'node:crypto';
import type { Account } from '@swg/database';
import { AccountRepository } from '@swg/database';
import { SessionStore, type SessionData } from '@swg/redis';
import { BufferWriter } from '@swg/protocol/soe/buffer-utils.js';
import {
  LoginMessageOpcode,
  type LoginClientId,
  createLoginClientToken,
  serializeLoginClientToken,
} from '@swg/protocol/swg/messages/login-messages.js';

/**
 * Session context for a connected client
 */
export interface ClientSession {
  connectionId: number;
  address: string;
  port: number;
  crcSeed: number;
  authenticated: boolean;
  accountId?: number;
  stationId?: bigint;
  sessionToken?: string;
}

/**
 * Result of a login attempt
 */
export interface LoginResult {
  success: boolean;
  response: Uint8Array;
  session?: {
    accountId: number;
    stationId: bigint;
    sessionToken: string;
  };
}

/**
 * LoginHandler class
 * Manages authentication requests and session creation
 */
export class LoginHandler {
  private readonly accountRepository: AccountRepository;
  private readonly sessionStore: SessionStore;
  private readonly serverId: number;

  constructor(
    accountRepository: AccountRepository,
    sessionStore: SessionStore,
    serverId: number = 1
  ) {
    this.accountRepository = accountRepository;
    this.sessionStore = sessionStore;
    this.serverId = serverId;
  }

  /**
   * Handle a LoginClientId message (authentication request)
   * @param session - The client session context
   * @param message - The login message from the client
   * @returns LoginResult with success status and response message
   */
  public async handleLoginClientId(
    session: ClientSession,
    message: LoginClientId
  ): Promise<LoginResult> {
    const { username, password } = message;

    console.log(`[LoginHandler] Login attempt for user: ${username}`);

    try {
      // Validate credentials
      const validationResult = await this.validateCredentials(username, password);

      if (!validationResult.valid) {
        console.log(
          `[LoginHandler] Login failed for ${username}: ${validationResult.errorMessage}`
        );

        // In C++, LoginIncorrectClientId is a server identity message, not an error.
        // On auth failure, we disconnect the client.
        return {
          success: false,
          response: new Uint8Array(0),
        };
      }

      const account = validationResult.account;
      if (!account) {
        throw new Error('Account not found after successful validation');
      }

      // Generate station ID if not present
      const stationId = account.stationId ?? BigInt(account.accountId);

      // Create session in Redis
      const sessionToken = await this.sessionStore.createSession(
        account.accountId,
        Number(stationId),
        {
          connectionServer: {
            address: session.address,
            port: session.port,
          },
        }
      );

      // Update last login time
      await this.accountRepository.updateLastLogin(account.accountId);

      console.log(
        `[LoginHandler] Login successful for ${username} (accountId: ${account.accountId})`
      );

      // Convert Redis token hex to bytes.
      const tokenBytes = this.hexToBytes(sessionToken);

      // Match C++ LoginClientToken payload shape:
      // AutoArray<u8> carries a packed KeyShare::Token blob.
      // We preserve Redis interoperability by embedding token bytes in cipherData.
      const legacyTokenBytes = this.packLegacyLoginToken(tokenBytes);

      // Create success response with C++ format: token(AutoArray<u8>) + stationId(u32) + username(string)
      const tokenResponse = createLoginClientToken(
        legacyTokenBytes,
        Number(stationId),
        username
      );

      return {
        success: true,
        response: serializeLoginClientToken(tokenResponse),
        session: {
          accountId: account.accountId,
          stationId,
          sessionToken,
        },
      };
    } catch (error) {
      console.error(`[LoginHandler] Error during login for ${username}:`, error);

      return {
        success: false,
        response: new Uint8Array(0),
      };
    }
  }

  /**
   * Validate user credentials
   */
  private async validateCredentials(
    username: string,
    password: string
  ): Promise<{
    valid: boolean;
    account?: Account;
    errorMessage: string;
  }> {
    // Check for empty credentials
    if (!username || !password) {
      return {
        valid: false,
        errorMessage: 'Username and password are required.',
      };
    }

    // Find account by username, or auto-create if it doesn't exist
    let account = await this.accountRepository.findByUsername(username);
    if (!account) {
      console.log(`[LoginHandler] Account not found for ${username}, creating new account`);
      account = await this.accountRepository.create({ username, password });
    }

    // Check account status
    if (account.status === 'banned') {
      return {
        valid: false,
        errorMessage: 'This account has been banned.',
      };
    }

    if (account.status === 'suspended') {
      return {
        valid: false,
        errorMessage: 'This account has been suspended.',
      };
    }

    if (account.status === 'pending') {
      return {
        valid: false,
        errorMessage: 'This account is pending activation.',
      };
    }

    // Validate password
    const isPasswordValid = await this.accountRepository.validatePassword(
      account,
      password
    );

    if (!isPasswordValid) {
      return {
        valid: false,
        errorMessage: 'Invalid username or password.',
      };
    }

    // Check for existing session (prevent double login)
    const existingSession = await this.sessionStore.getSessionByAccountId(
      account.accountId
    );
    if (existingSession) {
      const existingToken = await this.sessionStore.getTokenByAccountId(
        account.accountId
      );
      if (existingToken) {
        await this.sessionStore.deleteSession(existingToken);
        console.log(
          `[LoginHandler] Invalidated existing session for account ${account.accountId}`
        );
      }
    }

    return {
      valid: true,
      account,
      errorMessage: '',
    };
  }

  private hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid session token hex length');
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      const byteHex = hex.substring(i * 2, i * 2 + 2);
      const parsed = Number.parseInt(byteHex, 16);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid session token hex at index ${i}`);
      }
      bytes[i] = parsed;
    }
    return bytes;
  }

  private packLegacyLoginToken(rawTokenBytes: Uint8Array): Uint8Array {
    // KeyShare::Token wire layout used by C++ login:
    // u32LE cipherDataLen + u32LE dataLen + cipherData + digest[16]
    const writer = new BufferWriter(8 + rawTokenBytes.length + 16);
    writer.writeUInt32LE(rawTokenBytes.length);
    writer.writeUInt32LE(rawTokenBytes.length);
    writer.writeBytes(rawTokenBytes);

    // Digest is opaque to the client; keep deterministic bytes for debugging.
    const digest = createHash('md5').update(rawTokenBytes).digest();
    writer.writeBytes(new Uint8Array(digest));

    return writer.toBuffer();
  }

  /**
   * Verify an existing session token
   * @param token - The session token to verify
   * @returns Session data if valid, null otherwise
   */
  public async verifySession(token: string): Promise<SessionData | null> {
    const session = await this.sessionStore.getSession(token);
    if (!session) {
      return null;
    }

    // Refresh session TTL
    await this.sessionStore.refreshSession(token);

    return session;
  }

  /**
   * Invalidate a session
   * @param token - The session token to invalidate
   * @returns True if session was invalidated
   */
  public async invalidateSession(token: string): Promise<boolean> {
    return this.sessionStore.deleteSession(token);
  }

  /**
   * Get the server ID
   */
  public getServerId(): number {
    return this.serverId;
  }
}

/**
 * Create a new LoginHandler instance
 */
export function createLoginHandler(
  accountRepository: AccountRepository,
  sessionStore: SessionStore,
  serverId?: number
): LoginHandler {
  return new LoginHandler(accountRepository, sessionStore, serverId);
}
