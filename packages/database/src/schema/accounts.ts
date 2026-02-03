/**
 * Account Schema
 * Database schema for user accounts and authentication
 */

import {
  bigint,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { characters } from './characters.js';

/**
 * Account status enumeration
 */
export const accountStatusEnum = mysqlEnum('status', [
  'active',
  'suspended',
  'banned',
  'pending',
]);

/**
 * Accounts table schema
 * Stores user account information and authentication data
 */
export const accounts = mysqlTable(
  'accounts',
  {
    accountId: int('account_id').primaryKey().autoincrement(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    stationId: bigint('station_id', { mode: 'bigint' }).unique(),
    status: accountStatusEnum.notNull().default('active'),
    createdAt: datetime('created_at').notNull().default(new Date()),
    lastLogin: datetime('last_login'),
  },
  (table) => [
    index('idx_accounts_username').on(table.username),
    index('idx_accounts_station_id').on(table.stationId),
    index('idx_accounts_status').on(table.status),
  ]
);

/**
 * Account relations
 */
export const accountsRelations = relations(accounts, ({ many }) => ({
  characters: many(characters),
}));

/**
 * Account status type
 */
export type AccountStatus = 'active' | 'suspended' | 'banned' | 'pending';

/**
 * Account insert type
 */
export type NewAccount = typeof accounts.$inferInsert;

/**
 * Account select type
 */
export type Account = typeof accounts.$inferSelect;
