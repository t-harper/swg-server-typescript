/**
 * @swg/config
 * Configuration management for SWG server
 */

import { z } from 'zod';

// Database configuration schema
export const databaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(3306),
  user: z.string().default('swg'),
  password: z.string(),
  database: z.string().default('swg'),
  connectionLimit: z.number().default(10),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// Redis configuration schema
export const redisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(6379),
  password: z.string().optional(),
  db: z.number().default(0),
});

export type RedisConfig = z.infer<typeof redisConfigSchema>;

// Login server configuration
export const loginServerConfigSchema = z.object({
  port: z.number().default(44453),
  bindAddress: z.string().default('0.0.0.0'),
  maxConnections: z.number().default(1000),
  sessionTimeout: z.number().default(3600), // seconds
});

export type LoginServerConfig = z.infer<typeof loginServerConfigSchema>;

// Connection server configuration
export const connectionServerConfigSchema = z.object({
  port: z.number().default(44455),
  bindAddress: z.string().default('0.0.0.0'),
  maxConnections: z.number().default(3000),
  pingInterval: z.number().default(30000), // ms
  disconnectTimeout: z.number().default(60000), // ms
});

export type ConnectionServerConfig = z.infer<typeof connectionServerConfigSchema>;

// Game server configuration
export const gameServerConfigSchema = z.object({
  port: z.number().default(44463),
  bindAddress: z.string().default('0.0.0.0'),
  maxConnections: z.number().default(3000),
  sessionTimeout: z.number().default(3600), // seconds
  tickRate: z.number().default(30), // updates per second
  viewDistance: z.number().default(192), // meters
  spatialCellSize: z.number().default(64), // meters
});

export type GameServerConfig = z.infer<typeof gameServerConfigSchema>;

// Main server configuration
export const serverConfigSchema = z.object({
  clusterId: z.string().default('swg'),
  clusterName: z.string().default('SWG Server'),
  database: databaseConfigSchema,
  redis: redisConfigSchema,
  loginServer: loginServerConfigSchema.optional(),
  connectionServer: connectionServerConfigSchema.optional(),
  gameServer: gameServerConfigSchema.optional(),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

// Load configuration from environment variables
export function loadConfigFromEnv(): Partial<ServerConfig> {
  return {
    clusterId: process.env['SWG_CLUSTER_ID'],
    clusterName: process.env['SWG_CLUSTER_NAME'],
    database: {
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
      user: process.env['DB_USER'] ?? 'swg',
      password: process.env['DB_PASSWORD'] ?? '',
      database: process.env['DB_NAME'] ?? 'swg',
      connectionLimit: parseInt(process.env['DB_POOL_SIZE'] ?? '10', 10),
    },
    redis: {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
    },
  };
}

// Validate and parse configuration
export function parseConfig(config: unknown): ServerConfig {
  return serverConfigSchema.parse(config);
}
