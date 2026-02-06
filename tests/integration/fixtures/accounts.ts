/**
 * Test Account Fixtures
 * Provides test account data and utilities for integration testing
 */

import * as crypto from 'node:crypto';
import type { DatabaseFixture } from '../setup/test-database.js';

/**
 * Test account data structure
 */
export interface TestAccount {
  accountId: number;
  username: string;
  password: string;
  passwordHash: string;
  stationId: bigint;
  status: 'active' | 'suspended' | 'banned' | 'pending';
}

/**
 * Hash a password using the same algorithm as the server
 * Uses SHA-256 for simplicity in tests
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Pre-defined test accounts for consistent testing
 */
export const TEST_ACCOUNTS: TestAccount[] = [
  {
    accountId: 1,
    username: 'testuser1',
    password: 'password123',
    passwordHash: hashPassword('password123'),
    stationId: 1000000001n,
    status: 'active',
  },
  {
    accountId: 2,
    username: 'testuser2',
    password: 'password456',
    passwordHash: hashPassword('password456'),
    stationId: 1000000002n,
    status: 'active',
  },
  {
    accountId: 3,
    username: 'suspended_user',
    password: 'password789',
    passwordHash: hashPassword('password789'),
    stationId: 1000000003n,
    status: 'suspended',
  },
  {
    accountId: 4,
    username: 'banned_user',
    password: 'bannedpass',
    passwordHash: hashPassword('bannedpass'),
    stationId: 1000000004n,
    status: 'banned',
  },
  {
    accountId: 5,
    username: 'pending_user',
    password: 'pendingpass',
    passwordHash: hashPassword('pendingpass'),
    stationId: 1000000005n,
    status: 'pending',
  },
  {
    accountId: 10,
    username: 'loadtest_user',
    password: 'loadtest123',
    passwordHash: hashPassword('loadtest123'),
    stationId: 1000000010n,
    status: 'active',
  },
];

/**
 * Get a test account by username
 */
export function getTestAccount(username: string): TestAccount | undefined {
  return TEST_ACCOUNTS.find((a) => a.username === username);
}

/**
 * Get a test account by ID
 */
export function getTestAccountById(accountId: number): TestAccount | undefined {
  return TEST_ACCOUNTS.find((a) => a.accountId === accountId);
}

/**
 * Get all active test accounts
 */
export function getActiveTestAccounts(): TestAccount[] {
  return TEST_ACCOUNTS.filter((a) => a.status === 'active');
}

/**
 * Create a test account with custom properties
 */
export function createTestAccount(
  overrides: Partial<TestAccount> & { accountId: number; username: string }
): TestAccount {
  const password = overrides.password ?? 'defaultpassword';
  return {
    accountId: overrides.accountId,
    username: overrides.username,
    password,
    passwordHash: overrides.passwordHash ?? hashPassword(password),
    stationId: overrides.stationId ?? BigInt(1000000000 + overrides.accountId),
    status: overrides.status ?? 'active',
  };
}

/**
 * Create multiple test accounts
 */
export function createTestAccounts(
  count: number,
  startId: number = 100
): TestAccount[] {
  const accounts: TestAccount[] = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    accounts.push(
      createTestAccount({
        accountId: id,
        username: `generated_user_${id}`,
        password: `genpass_${id}`,
      })
    );
  }
  return accounts;
}

/**
 * Convert test accounts to database fixture format
 */
export function accountsToFixture(accounts: TestAccount[]): DatabaseFixture {
  return {
    table: 'accounts',
    data: accounts.map((account) => ({
      account_id: account.accountId,
      username: account.username,
      password_hash: account.passwordHash,
      station_id: account.stationId.toString(),
      status: account.status,
      created_at: new Date(),
    })),
  };
}

/**
 * Default accounts fixture for standard tests
 */
export function getDefaultAccountsFixture(): DatabaseFixture {
  return accountsToFixture(TEST_ACCOUNTS);
}

/**
 * Minimal accounts fixture for quick tests
 */
export function getMinimalAccountsFixture(): DatabaseFixture {
  return accountsToFixture(TEST_ACCOUNTS.slice(0, 2));
}

/**
 * Credentials type for login tests
 */
export interface TestCredentials {
  username: string;
  password: string;
  expectedResult: 'success' | 'invalid' | 'suspended' | 'banned' | 'pending';
}

/**
 * Test credentials for various login scenarios
 */
export const TEST_CREDENTIALS: TestCredentials[] = [
  {
    username: 'testuser1',
    password: 'password123',
    expectedResult: 'success',
  },
  {
    username: 'testuser1',
    password: 'wrongpassword',
    expectedResult: 'invalid',
  },
  {
    username: 'nonexistent_user',
    password: 'anypassword',
    expectedResult: 'invalid',
  },
  {
    username: 'suspended_user',
    password: 'password789',
    expectedResult: 'suspended',
  },
  {
    username: 'banned_user',
    password: 'bannedpass',
    expectedResult: 'banned',
  },
];

/**
 * Get credentials for a specific test case
 */
export function getCredentialsForCase(
  expectedResult: TestCredentials['expectedResult']
): TestCredentials | undefined {
  return TEST_CREDENTIALS.find((c) => c.expectedResult === expectedResult);
}
