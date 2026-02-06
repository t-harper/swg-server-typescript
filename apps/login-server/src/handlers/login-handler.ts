/**
 * Login Handler
 * Handles authentication flow for login requests
 */

import type { Account } from '@swg/database';
import { AccountRepository } from '@swg/database';
import { SessionStore, type SessionData } from '@swg/redis';
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

      // Convert session token hex string to byte array for AutoArray<u8> format
      const tokenBytes = new Uint8Array(sessionToken.length);
      for (let i = 0; i < sessionToken.length; i++) {
        tokenBytes[i] = sessionToken.charCodeAt(i);
      }

      // Create success response with C++ format: token(AutoArray<u8>) + stationId(u32) + username(string)
      const tokenResponse = createLoginClientToken(
        tokenBytes,
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

    // Find account by username
    const account = await this.accountRepository.findByUsername(username);
    if (!account) {
      return {
        valid: false,
        errorMessage: 'Invalid username or password.',
      };
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
