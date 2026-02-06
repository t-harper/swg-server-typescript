/**
 * Test Database Utilities
 * Provides MySQL container management for isolated integration testing
 */

import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import * as schema from '@swg/database/schema/index.js';

/**
 * Database configuration for tests
 */
export interface TestDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Test database instance with container and connection
 */
export interface TestDatabase {
  container: StartedMySqlContainer;
  config: TestDatabaseConfig;
  pool: Pool;
  db: MySql2Database<typeof schema>;
  getConnection(): Promise<PoolConnection>;
  executeRaw<T>(sql: string, values?: unknown[]): Promise<T>;
}

/**
 * Database fixture type for seeding
 */
export interface DatabaseFixture {
  table: string;
  data: Record<string, unknown>[];
}

/**
 * Default MySQL container configuration
 */
const DEFAULT_MYSQL_CONFIG = {
  image: 'mysql:8.0',
  rootPassword: 'test_root_password',
  database: 'swg_test',
  user: 'swg_test_user',
  password: 'swg_test_password',
};

/**
 * SQL schema for test database
 * Creates all necessary tables for SWG server testing
 */
const CREATE_SCHEMA_SQL = `
-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  account_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  station_id BIGINT UNIQUE,
  status ENUM('active', 'suspended', 'banned', 'pending') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  INDEX idx_accounts_username (username),
  INDEX idx_accounts_station_id (station_id),
  INDEX idx_accounts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  character_id BIGINT PRIMARY KEY,
  account_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  scene_id VARCHAR(50) NOT NULL,
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  z FLOAT NOT NULL DEFAULT 0,
  orientation_x FLOAT NOT NULL DEFAULT 0,
  orientation_y FLOAT NOT NULL DEFAULT 0,
  orientation_z FLOAT NOT NULL DEFAULT 0,
  orientation_w FLOAT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_saved DATETIME,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  INDEX idx_characters_account_id (account_id),
  INDEX idx_characters_name (name),
  INDEX idx_characters_scene_id (scene_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Character appearance table
CREATE TABLE IF NOT EXISTS character_appearance (
  character_id BIGINT PRIMARY KEY,
  customization_data BLOB,
  scale FLOAT NOT NULL DEFAULT 1.0,
  FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Character skills table
CREATE TABLE IF NOT EXISTS character_skills (
  character_id BIGINT NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, skill_name),
  FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
  INDEX idx_character_skills_character_id (character_id),
  INDEX idx_character_skills_skill_name (skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Character experience table
CREATE TABLE IF NOT EXISTS character_experience (
  character_id BIGINT NOT NULL,
  experience_type VARCHAR(50) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, experience_type),
  FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
  INDEX idx_character_experience_character_id (character_id),
  INDEX idx_character_experience_type (experience_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Objects table (for game objects)
CREATE TABLE IF NOT EXISTS objects (
  object_id BIGINT PRIMARY KEY,
  template_crc INT UNSIGNED NOT NULL,
  container_id BIGINT,
  scene_id VARCHAR(50),
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  z FLOAT NOT NULL DEFAULT 0,
  orientation_x FLOAT NOT NULL DEFAULT 0,
  orientation_y FLOAT NOT NULL DEFAULT 0,
  orientation_z FLOAT NOT NULL DEFAULT 0,
  orientation_w FLOAT NOT NULL DEFAULT 1,
  object_data JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  INDEX idx_objects_template_crc (template_crc),
  INDEX idx_objects_container_id (container_id),
  INDEX idx_objects_scene_id (scene_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Create a test MySQL database container
 * @returns Promise resolving to TestDatabase instance
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  console.log('[TestDatabase] Starting MySQL container...');

  // Start MySQL container
  const container = await new MySqlContainer(DEFAULT_MYSQL_CONFIG.image)
    .withRootPassword(DEFAULT_MYSQL_CONFIG.rootPassword)
    .withDatabase(DEFAULT_MYSQL_CONFIG.database)
    .withUsername(DEFAULT_MYSQL_CONFIG.user)
    .withPassword(DEFAULT_MYSQL_CONFIG.password)
    .withReuse()
    .start();

  const config: TestDatabaseConfig = {
    host: container.getHost(),
    port: container.getPort(),
    user: DEFAULT_MYSQL_CONFIG.user,
    password: DEFAULT_MYSQL_CONFIG.password,
    database: DEFAULT_MYSQL_CONFIG.database,
  };

  console.log(`[TestDatabase] MySQL container started at ${config.host}:${config.port}`);

  // Create connection pool
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true, // Allow multiple statements for schema creation
  });

  // Create Drizzle instance
  const db = drizzle(pool, { schema, mode: 'default' });

  // Initialize schema
  console.log('[TestDatabase] Creating schema...');
  await pool.execute(CREATE_SCHEMA_SQL);
  console.log('[TestDatabase] Schema created');

  return {
    container,
    config,
    pool,
    db,

    async getConnection(): Promise<PoolConnection> {
      return pool.getConnection();
    },

    async executeRaw<T>(sql: string, values?: unknown[]): Promise<T> {
      const [result] = await pool.execute(sql, values);
      return result as T;
    },
  };
}

/**
 * Seed the test database with fixture data
 * @param testDb - Test database instance
 * @param fixtures - Array of fixtures to seed
 */
export async function seedDatabase(
  testDb: TestDatabase,
  fixtures: DatabaseFixture[]
): Promise<void> {
  console.log(`[TestDatabase] Seeding ${fixtures.length} fixtures...`);

  for (const fixture of fixtures) {
    if (fixture.data.length === 0) {
      continue;
    }

    const columns = Object.keys(fixture.data[0] ?? {});
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.map((c) => `\`${c}\``).join(', ');

    for (const row of fixture.data) {
      const values = columns.map((col) => row[col]);
      const sql = `INSERT INTO \`${fixture.table}\` (${columnNames}) VALUES (${placeholders})`;
      await testDb.pool.execute(sql, values);
    }

    console.log(`[TestDatabase] Seeded ${fixture.data.length} rows into ${fixture.table}`);
  }
}

/**
 * Clean all data from test database tables
 * @param testDb - Test database instance
 */
export async function cleanDatabase(testDb: TestDatabase): Promise<void> {
  console.log('[TestDatabase] Cleaning database...');

  // Disable foreign key checks temporarily
  await testDb.pool.execute('SET FOREIGN_KEY_CHECKS = 0');

  // Truncate all tables in reverse order of dependencies
  const tables = [
    'character_experience',
    'character_skills',
    'character_appearance',
    'objects',
    'characters',
    'accounts',
  ];

  for (const table of tables) {
    await testDb.pool.execute(`TRUNCATE TABLE \`${table}\``);
  }

  // Re-enable foreign key checks
  await testDb.pool.execute('SET FOREIGN_KEY_CHECKS = 1');

  console.log('[TestDatabase] Database cleaned');
}

/**
 * Clean up and stop the test database container
 * @param testDb - Test database instance
 */
export async function cleanupDatabase(testDb: TestDatabase): Promise<void> {
  console.log('[TestDatabase] Cleaning up...');

  try {
    // Close the connection pool
    await testDb.pool.end();
    console.log('[TestDatabase] Connection pool closed');
  } catch (error) {
    console.error('[TestDatabase] Error closing pool:', error);
  }

  try {
    // Stop the container
    await testDb.container.stop();
    console.log('[TestDatabase] Container stopped');
  } catch (error) {
    console.error('[TestDatabase] Error stopping container:', error);
  }
}

/**
 * Get database configuration from test database instance
 * Compatible with @swg/database DatabaseConfig
 */
export function getDatabaseConfig(testDb: TestDatabase): TestDatabaseConfig {
  return { ...testDb.config };
}
