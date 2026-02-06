/**
 * Database Connection
 * MySQL connection pool and Drizzle ORM instance management
 */

import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.js';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  waitForConnections?: boolean;
  queueLimit?: number;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<DatabaseConfig> = {
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

/**
 * Database instance type with full schema
 */
export type Database = MySql2Database<typeof schema>;

/**
 * Connection pool instance
 */
let pool: mysql.Pool | null = null;

/**
 * Drizzle database instance
 */
let db: Database | null = null;

/**
 * Initialize the database connection pool and Drizzle instance
 * @param config Database connection configuration
 * @returns Drizzle database instance
 */
export function initDb(config: DatabaseConfig): Database {
  if (db !== null) {
    return db;
  }

  const poolConfig: mysql.PoolOptions = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit ?? DEFAULT_CONFIG.connectionLimit ?? 10,
    waitForConnections: config.waitForConnections ?? DEFAULT_CONFIG.waitForConnections ?? true,
    queueLimit: config.queueLimit ?? DEFAULT_CONFIG.queueLimit ?? 0,
    enableKeepAlive: config.enableKeepAlive ?? DEFAULT_CONFIG.enableKeepAlive ?? true,
    keepAliveInitialDelay: config.keepAliveInitialDelay ?? DEFAULT_CONFIG.keepAliveInitialDelay ?? 10000,
  };

  pool = mysql.createPool(poolConfig);
  db = drizzle(pool, { schema, mode: 'default' });

  return db;
}

/**
 * Get the database instance
 * @throws Error if database is not initialized
 * @returns Drizzle database instance
 */
export function getDb(): Database {
  if (db === null) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Check if database is initialized
 * @returns True if database is initialized
 */
export function isDbInitialized(): boolean {
  return db !== null;
}

/**
 * Close the database connection pool gracefully
 * @returns Promise that resolves when all connections are closed
 */
export async function closeDb(): Promise<void> {
  if (pool !== null) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/**
 * Get the underlying connection pool for direct access
 * @throws Error if pool is not initialized
 * @returns MySQL connection pool
 */
export function getPool(): mysql.Pool {
  if (pool === null) {
    throw new Error('Database pool not initialized. Call initDb() first.');
  }
  return pool;
}

/**
 * Execute a raw SQL query using the pool
 * Useful for migrations or complex queries not supported by Drizzle
 * @param sql SQL query string
 * @param values Query parameter values
 * @returns Query result
 */
export async function executeRaw<T>(
  sql: string,
  values?: unknown[]
): Promise<T> {
  const poolInstance = getPool();
  const [result] = await poolInstance.execute(sql, values);
  return result as T;
}
