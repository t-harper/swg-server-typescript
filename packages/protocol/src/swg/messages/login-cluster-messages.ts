/**
 * SWG Login Cluster Messages
 * Protocol messages for cluster enumeration and status
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';
import { LoginMessageOpcode, type SwgMessageBase } from './login-messages.js';

// ============================================
// LoginEnumCluster (0xC11C63B9)
// ============================================

/**
 * Cluster data entry for LoginEnumCluster
 */
export interface ClusterDataEntry {
  clusterId: number;
  clusterName: string;
  timeZone: number;
}

/**
 * LoginEnumCluster - Server sends cluster info to client
 * Contains a list of available game clusters (servers)
 */
export interface LoginEnumCluster extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginEnumCluster;
  clusterData: ClusterDataEntry[];
  maxCharsPerAccount: number;
}

/**
 * Serialize LoginEnumCluster message
 */
export function serializeLoginEnumCluster(message: LoginEnumCluster): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.clusterData.length);

  for (const cluster of message.clusterData) {
    writer.writeUInt32LE(cluster.clusterId);
    writer.writeStringWithLength16LE(cluster.clusterName);
    writer.writeInt32LE(cluster.timeZone);
  }

  writer.writeUInt32LE(message.maxCharsPerAccount);
  return writer.toBuffer();
}

/**
 * Deserialize LoginEnumCluster message
 */
export function deserializeLoginEnumCluster(data: Uint8Array): LoginEnumCluster {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginEnumCluster) {
    throw new Error(`Invalid opcode for LoginEnumCluster: 0x${opcode.toString(16)}`);
  }

  const count = reader.readUInt32LE();
  const clusterData: ClusterDataEntry[] = [];

  for (let i = 0; i < count; i++) {
    const clusterId = reader.readUInt32LE();
    const clusterName = reader.readStringWithLength16LE();
    const timeZone = reader.readInt32LE();
    clusterData.push({ clusterId, clusterName, timeZone });
  }

  const maxCharsPerAccount = reader.readUInt32LE();

  return {
    opcode: LoginMessageOpcode.LoginEnumCluster,
    clusterData,
    maxCharsPerAccount,
  };
}

/**
 * Create a LoginEnumCluster message
 */
export function createLoginEnumCluster(
  clusterData: ClusterDataEntry[],
  maxCharsPerAccount: number
): LoginEnumCluster {
  return {
    opcode: LoginMessageOpcode.LoginEnumCluster,
    clusterData,
    maxCharsPerAccount,
  };
}

// ============================================
// LoginClusterStatus (0x25D27D45)
// ============================================

/**
 * Cluster status data entry for LoginClusterStatus
 */
export interface ClusterStatusDataEntry {
  clusterId: number;
  connectionServerAddress: string;
  connectionServerPort: number;
  pingPort: number;
  populationOnline: number;
  populationStatusLoaded: number;
  maxCharactersPerAccount: number;
  timeZone: number;
  status: number;
  notRecommended: boolean;
  onlinePlayerLimit: number;
  onlineFreeTrialLimit: number;
}

/**
 * LoginClusterStatus - Server sends cluster status with connection info
 * Contains connection details and population data for each cluster
 */
export interface LoginClusterStatus extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginClusterStatus;
  clusterStatusData: ClusterStatusDataEntry[];
}

/**
 * Serialize LoginClusterStatus message
 */
export function serializeLoginClusterStatus(message: LoginClusterStatus): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.clusterStatusData.length);

  for (const entry of message.clusterStatusData) {
    writer.writeUInt32LE(entry.clusterId);
    writer.writeStringWithLength16LE(entry.connectionServerAddress);
    writer.writeUInt16LE(entry.connectionServerPort);
    writer.writeUInt16LE(entry.pingPort);
    writer.writeUInt32LE(entry.populationOnline);
    writer.writeUInt32LE(entry.populationStatusLoaded);
    writer.writeUInt32LE(entry.maxCharactersPerAccount);
    writer.writeInt32LE(entry.timeZone);
    writer.writeUInt32LE(entry.status);
    writer.writeUInt8(entry.notRecommended ? 1 : 0);
    writer.writeUInt32LE(entry.onlinePlayerLimit);
    writer.writeUInt32LE(entry.onlineFreeTrialLimit);
  }

  return writer.toBuffer();
}

/**
 * Deserialize LoginClusterStatus message
 */
export function deserializeLoginClusterStatus(data: Uint8Array): LoginClusterStatus {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginClusterStatus) {
    throw new Error(`Invalid opcode for LoginClusterStatus: 0x${opcode.toString(16)}`);
  }

  const count = reader.readUInt32LE();
  const clusterStatusData: ClusterStatusDataEntry[] = [];

  for (let i = 0; i < count; i++) {
    const clusterId = reader.readUInt32LE();
    const connectionServerAddress = reader.readStringWithLength16LE();
    const connectionServerPort = reader.readUInt16LE();
    const pingPort = reader.readUInt16LE();
    const populationOnline = reader.readUInt32LE();
    const populationStatusLoaded = reader.readUInt32LE();
    const maxCharactersPerAccount = reader.readUInt32LE();
    const timeZone = reader.readInt32LE();
    const status = reader.readUInt32LE();
    const notRecommended = reader.readUInt8() !== 0;
    const onlinePlayerLimit = reader.readUInt32LE();
    const onlineFreeTrialLimit = reader.readUInt32LE();

    clusterStatusData.push({
      clusterId,
      connectionServerAddress,
      connectionServerPort,
      pingPort,
      populationOnline,
      populationStatusLoaded,
      maxCharactersPerAccount,
      timeZone,
      status,
      notRecommended,
      onlinePlayerLimit,
      onlineFreeTrialLimit,
    });
  }

  return {
    opcode: LoginMessageOpcode.LoginClusterStatus,
    clusterStatusData,
  };
}

/**
 * Create a LoginClusterStatus message
 */
export function createLoginClusterStatus(
  clusterStatusData: ClusterStatusDataEntry[]
): LoginClusterStatus {
  return {
    opcode: LoginMessageOpcode.LoginClusterStatus,
    clusterStatusData,
  };
}
