/**
 * Drizzle Kit Configuration
 * Configuration for database migrations and schema management
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Schema files location
  schema: './src/schema/*.ts',

  // Output directory for generated migrations
  out: './drizzle',

  // Database dialect
  dialect: 'mysql',

  // Database connection configuration
  // Uses environment variables for sensitive data
  dbCredentials: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 3306),
    user: process.env['DB_USER'] ?? 'swg',
    password: process.env['DB_PASSWORD'] ?? '',
    database: process.env['DB_NAME'] ?? 'swg',
  },

  // Verbose output during migrations
  verbose: true,

  // Strict mode for safer migrations
  strict: true,

  // Table filters (include all tables)
  tablesFilter: ['*'],
});
