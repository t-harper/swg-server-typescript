/**
 * @swg/shared-types
 * Shared TypeScript interfaces and types for the SWG server
 */

// Object Pooling System
export * from './pooling/index.js';

// Network Types
export interface NetworkAddress {
  address: string;
  port: number;
}

// Object ID type - 64-bit snowflake-like ID
export type ObjectId = bigint;

// CRC32 hash value
export type CrcValue = number;

// Scene/Zone identifier
export type SceneId = string;

// Position in 3D space
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Quaternion for orientation
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Transform combining position and orientation
export interface Transform {
  position: Vector3;
  orientation: Quaternion;
}

// Account status enum
export enum AccountStatus {
  Active = 0,
  Banned = 1,
  Suspended = 2,
  Closed = 3,
}

// Character creation data
export interface CharacterCreateData {
  name: string;
  species: string;
  gender: string;
  customization: Uint8Array;
  profession: string;
  biography: string;
  startingLocation: string;
  hairTemplate: string;
  hairCustomization: Uint8Array;
}

// Session data stored in Redis
export interface SessionData {
  accountId: number;
  stationId: number;
  characterId?: ObjectId;
  loginTime: number;
  lastActivity: number;
  connectionServer?: NetworkAddress;
  gameServer?: NetworkAddress;
}

// Server status for inter-process communication
export interface ServerStatus {
  serverId: string;
  serverType: string;
  address: NetworkAddress;
  online: boolean;
  playerCount: number;
  maxPlayers: number;
  startTime: number;
}
