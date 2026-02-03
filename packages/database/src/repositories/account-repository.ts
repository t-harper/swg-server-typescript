/**
 * Account Repository
 * Data access layer for account management and authentication
 */

import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { getDb, type Database } from '../connection.js';
import { accounts, type Account, type NewAccount } from '../schema/accounts.js';

/**
 * Salt rounds for bcrypt password hashing
 */
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Account creation data (without password hash)
 */
export interface CreateAccountData {
  username: string;
  password: string;
  stationId?: bigint;
}

/**
 * Account Repository
 * Provides data access methods for account operations
 */
export class AccountRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Find an account by username
   * @param username The username to search for
   * @returns The account if found, undefined otherwise
   */
  async findByUsername(username: string): Promise<Account | undefined> {
    const result = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.username, username))
      .limit(1);

    return result[0];
  }

  /**
   * Find an account by station ID
   * @param stationId The station ID to search for
   * @returns The account if found, undefined otherwise
   */
  async findByStationId(stationId: bigint): Promise<Account | undefined> {
    const result = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.stationId, stationId))
      .limit(1);

    return result[0];
  }

  /**
   * Find an account by account ID
   * @param accountId The account ID to search for
   * @returns The account if found, undefined otherwise
   */
  async findById(accountId: number): Promise<Account | undefined> {
    const result = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.accountId, accountId))
      .limit(1);

    return result[0];
  }

  /**
   * Create a new account with hashed password
   * @param data Account creation data including plaintext password
   * @returns The created account
   */
  async create(data: CreateAccountData): Promise<Account> {
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    const newAccount: NewAccount = {
      username: data.username,
      passwordHash,
      stationId: data.stationId,
      status: 'active',
      createdAt: new Date(),
    };

    const result = await this.db.insert(accounts).values(newAccount);
    const insertId = Number(result[0].insertId);

    const created = await this.findById(insertId);
    if (created === undefined) {
      throw new Error('Failed to retrieve created account');
    }

    return created;
  }

  /**
   * Update the last login timestamp for an account
   * @param accountId The account ID to update
   * @returns True if the account was updated, false if not found
   */
  async updateLastLogin(accountId: number): Promise<boolean> {
    const result = await this.db
      .update(accounts)
      .set({ lastLogin: new Date() })
      .where(eq(accounts.accountId, accountId));

    return result[0].affectedRows > 0;
  }

  /**
   * Validate a password against an account's stored hash
   * @param account The account to validate against
   * @param password The plaintext password to validate
   * @returns True if the password is valid, false otherwise
   */
  async validatePassword(account: Account, password: string): Promise<boolean> {
    return bcrypt.compare(password, account.passwordHash);
  }

  /**
   * Update an account's password
   * @param accountId The account ID to update
   * @param newPassword The new plaintext password
   * @returns True if the password was updated, false if account not found
   */
  async updatePassword(accountId: number, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    const result = await this.db
      .update(accounts)
      .set({ passwordHash })
      .where(eq(accounts.accountId, accountId));

    return result[0].affectedRows > 0;
  }

  /**
   * Update an account's status
   * @param accountId The account ID to update
   * @param status The new status
   * @returns True if the status was updated, false if account not found
   */
  async updateStatus(
    accountId: number,
    status: Account['status']
  ): Promise<boolean> {
    const result = await this.db
      .update(accounts)
      .set({ status })
      .where(eq(accounts.accountId, accountId));

    return result[0].affectedRows > 0;
  }

  /**
   * Delete an account by ID
   * @param accountId The account ID to delete
   * @returns True if the account was deleted, false if not found
   */
  async delete(accountId: number): Promise<boolean> {
    const result = await this.db
      .delete(accounts)
      .where(eq(accounts.accountId, accountId));

    return result[0].affectedRows > 0;
  }
}

/**
 * Create a new AccountRepository instance
 * @param db Optional database instance (uses getDb() if not provided)
 * @returns AccountRepository instance
 */
export function createAccountRepository(db?: Database): AccountRepository {
  return new AccountRepository(db);
}
