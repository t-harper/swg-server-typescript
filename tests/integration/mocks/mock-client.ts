/**
 * Mock SWG Client
 * Simulates an SWG client for integration testing
 * Implements SOE protocol and SWG message handling
 */

import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import {
  SoeOpcode,
  type SoePacket,
  type SessionResponsePacket,
  type DataPacket,
  type AckPacket,
  deserialize,
  serialize,
  createSessionRequest,
  createAck,
  createData,
  createPing,
  createDisconnect,
} from '@swg/protocol/soe';
import {
  BufferReader,
  BufferWriter,
} from '@swg/protocol/soe/buffer-utils.js';
import { calculateSoeCrc as crc32 } from '@swg/protocol/soe/crc32.js';
import {
  LoginMessageOpcode,
  type LoginClientToken,
  type LoginIncorrectClientId,
  type EnumerateCharacterIdResponse,
  type CharacterData,
  serializeLoginClientId,
  serializeEnumerateCharacterId,
  deserializeLoginClientToken,
  deserializeLoginIncorrectClientId,
  deserializeEnumerateCharacterIdResponse,
  getLoginMessageOpcode,
} from '@swg/protocol/swg/messages/login-messages.js';
import {
  ZoneMessageOpcode,
  type CmdStartScene,
  type SceneCreateObjectByCrc,
  deserializeCmdStartScene,
  deserializeSceneCreateObjectByCrc,
  serializeCmdSceneReady,
  getZoneMessageOpcode,
} from '@swg/protocol/swg/messages/zone-messages.js';

/**
 * Mock client configuration
 */
export interface MockClientConfig {
  serverAddress: string;
  serverPort: number;
  bindPort?: number;
  timeout?: number;
  debug?: boolean;
}

/**
 * Connection state for the mock client
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'in_zone';

/**
 * Captured packet for assertions
 */
export interface CapturedPacket {
  timestamp: number;
  direction: 'sent' | 'received';
  opcode: number;
  data: Uint8Array;
  parsed?: SoePacket | object;
}

/**
 * Login result from authentication
 */
export interface LoginResult {
  success: boolean;
  accountId?: number;
  stationId?: bigint;
  sessionToken?: string;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Character enumeration result
 */
export interface CharacterListResult {
  success: boolean;
  characters: CharacterData[];
}

/**
 * Zone entry result
 */
export interface ZoneEntryResult {
  success: boolean;
  objectId?: bigint;
  terrainFileName?: string;
  position?: { x: number; y: number; z: number };
}

/**
 * Mock SWG Client for testing
 */
export class MockClient extends EventEmitter {
  private readonly config: Required<MockClientConfig>;
  private socket: dgram.Socket | null = null;
  private state: ConnectionState = 'disconnected';

  // Session state
  private connectionId: number = 0;
  private crcSeed: number = 0;
  private useCompression: boolean = false;
  private sendSequence: number = 0;
  private receiveSequence: number = 0;

  // Authentication state
  private accountId?: number;
  private stationId?: bigint;
  private sessionToken?: string;

  // Packet capture
  private capturedPackets: CapturedPacket[] = [];
  private captureEnabled: boolean = true;

  // Pending responses
  private pendingResponses: Map<number, {
    resolve: (data: Uint8Array) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(config: MockClientConfig) {
    super();
    this.config = {
      serverAddress: config.serverAddress,
      serverPort: config.serverPort,
      bindPort: config.bindPort ?? 0,
      timeout: config.timeout ?? 10000,
      debug: config.debug ?? false,
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get captured packets
   */
  getCapturedPackets(): CapturedPacket[] {
    return [...this.capturedPackets];
  }

  /**
   * Clear captured packets
   */
  clearCapturedPackets(): void {
    this.capturedPackets = [];
  }

  /**
   * Enable/disable packet capture
   */
  setCaptureEnabled(enabled: boolean): void {
    this.captureEnabled = enabled;
  }

  /**
   * Log debug message
   */
  private debug(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[MockClient] ${message}`, ...args);
    }
  }

  /**
   * Capture a packet
   */
  private capturePacket(
    direction: 'sent' | 'received',
    opcode: number,
    data: Uint8Array,
    parsed?: SoePacket | object
  ): void {
    if (!this.captureEnabled) return;

    this.capturedPackets.push({
      timestamp: Date.now(),
      direction,
      opcode,
      data: new Uint8Array(data),
      parsed,
    });
  }

  /**
   * Connect to the server and establish SOE session
   */
  async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      throw new Error(`Cannot connect: already in state ${this.state}`);
    }

    this.debug('Connecting to server...');
    this.state = 'connecting';

    // Create UDP socket
    this.socket = dgram.createSocket('udp4');

    // Set up event handlers
    this.socket.on('message', (msg, rinfo) => {
      this.handlePacket(new Uint8Array(msg));
    });

    this.socket.on('error', (err) => {
      this.debug('Socket error:', err);
      this.emit('error', err);
    });

    // Bind socket
    await new Promise<void>((resolve, reject) => {
      this.socket!.bind(this.config.bindPort, () => {
        resolve();
      });
    });

    // Generate connection ID
    this.connectionId = Math.floor(Math.random() * 0xffffffff);

    // Send session request
    const sessionRequest = createSessionRequest(
      this.connectionId,
      496,
      'SOE/2'
    );
    const packet = serialize(sessionRequest);

    this.capturePacket('sent', SoeOpcode.SessionRequest, packet, sessionRequest);
    await this.sendPacket(packet);

    // Wait for session response
    const response = await this.waitForPacket(SoeOpcode.SessionResponse);
    const sessionResponse = deserialize(response) as SessionResponsePacket;

    this.crcSeed = sessionResponse.crcSeed;
    this.useCompression = sessionResponse.useCompression;
    this.state = 'connected';

    this.debug('Connected with CRC seed:', this.crcSeed);
    this.emit('connected');
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (this.state === 'disconnected') {
      return;
    }

    this.debug('Disconnecting...');

    // Send disconnect packet
    const disconnectPacket = createDisconnect(this.connectionId, 0x06);
    const packet = serialize(disconnectPacket);
    await this.sendPacket(packet);

    // Close socket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // Clear pending responses
    for (const pending of this.pendingResponses.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client disconnected'));
    }
    this.pendingResponses.clear();

    // Reset state
    this.state = 'disconnected';
    this.sendSequence = 0;
    this.receiveSequence = 0;
    this.accountId = undefined;
    this.stationId = undefined;
    this.sessionToken = undefined;

    this.debug('Disconnected');
    this.emit('disconnected');
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<LoginResult> {
    if (this.state !== 'connected') {
      throw new Error(`Cannot login: not connected (state: ${this.state})`);
    }

    this.debug(`Logging in as ${username}...`);

    // Create login message
    const loginClientId = {
      opcode: LoginMessageOpcode.LoginClientId,
      username,
      password,
      clientVersion: '20051010-18:00',
    };

    const messageData = serializeLoginClientId(loginClientId as any);
    await this.sendReliable(messageData);

    // Wait for response (either success or failure)
    const responseData = await this.waitForSwgMessage([
      LoginMessageOpcode.LoginClientToken,
      LoginMessageOpcode.LoginIncorrectClientId,
    ]);

    const opcode = getLoginMessageOpcode(responseData);

    if (opcode === LoginMessageOpcode.LoginClientToken) {
      const token = deserializeLoginClientToken(responseData);
      this.accountId = token.accountId;
      this.stationId = token.stationId;
      this.sessionToken = token.sessionToken;
      this.state = 'authenticated';

      this.debug(`Login successful: accountId=${token.accountId}`);

      return {
        success: true,
        accountId: token.accountId,
        stationId: token.stationId,
        sessionToken: token.sessionToken,
      };
    } else {
      const error = deserializeLoginIncorrectClientId(responseData);
      this.debug(`Login failed: ${error.errorMessage}`);

      return {
        success: false,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
      };
    }
  }

  /**
   * Request character enumeration
   */
  async enumerateCharacters(): Promise<CharacterListResult> {
    if (this.state !== 'authenticated' && this.state !== 'connected') {
      throw new Error(`Cannot enumerate characters: not authenticated (state: ${this.state})`);
    }

    this.debug('Enumerating characters...');

    const enumerateMsg = {
      opcode: LoginMessageOpcode.EnumerateCharacterId,
    };

    const messageData = serializeEnumerateCharacterId(enumerateMsg as any);
    await this.sendReliable(messageData);

    // Wait for character list response
    const responseData = await this.waitForSwgMessage([
      LoginMessageOpcode.EnumerateCharacterIdResponse,
    ]);

    const response = deserializeEnumerateCharacterIdResponse(responseData);
    this.debug(`Received ${response.characters.length} characters`);

    return {
      success: true,
      characters: response.characters,
    };
  }

  /**
   * Select a character and enter the zone
   */
  async selectCharacter(characterId: bigint): Promise<ZoneEntryResult> {
    if (this.state !== 'authenticated') {
      throw new Error(`Cannot select character: not authenticated (state: ${this.state})`);
    }

    this.debug(`Selecting character ${characterId}...`);

    // Create SelectCharacter message
    const writer = new BufferWriter(16);
    writer.writeUInt32LE(0xb5098d76); // SelectCharacter opcode
    writer.writeUInt64LE(characterId);

    await this.sendReliable(writer.toBuffer());

    // Wait for CmdStartScene
    const sceneData = await this.waitForSwgMessage([
      ZoneMessageOpcode.CmdStartScene,
    ]);

    const startScene = deserializeCmdStartScene(sceneData);
    this.debug(`Entering zone: ${startScene.terrainFileName}`);

    // Send CmdSceneReady
    const sceneReady = serializeCmdSceneReady();
    await this.sendReliable(sceneReady);

    this.state = 'in_zone';

    return {
      success: true,
      objectId: startScene.objectId,
      terrainFileName: startScene.terrainFileName,
      position: {
        x: startScene.positionX,
        y: startScene.positionY,
        z: startScene.positionZ,
      },
    };
  }

  /**
   * Send movement update
   */
  async sendMovementUpdate(
    x: number,
    y: number,
    z: number,
    yaw: number = 0
  ): Promise<void> {
    if (this.state !== 'in_zone') {
      throw new Error(`Cannot send movement: not in zone (state: ${this.state})`);
    }

    // Create DataTransform message (simplified)
    const writer = new BufferWriter(64);
    writer.writeUInt32LE(0x71f90d00); // DataTransform opcode
    // ... position data would go here
    writer.writeFloatLE(x);
    writer.writeFloatLE(y);
    writer.writeFloatLE(z);
    writer.writeFloatLE(yaw);

    await this.sendReliable(writer.toBuffer());
  }

  /**
   * Send a ping packet
   */
  async sendPing(): Promise<void> {
    if (this.state === 'disconnected') {
      throw new Error('Cannot send ping: not connected');
    }

    const ping = createPing();
    const packet = serialize(ping);
    this.capturePacket('sent', SoeOpcode.Ping, packet, ping);
    await this.sendPacket(packet);
  }

  /**
   * Send raw packet to server
   */
  private async sendPacket(data: Uint8Array): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.send(
        Buffer.from(data),
        this.config.serverPort,
        this.config.serverAddress,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Send reliable data (with sequence number)
   */
  private async sendReliable(data: Uint8Array): Promise<void> {
    const sequence = this.sendSequence++;
    const dataPacket = createData(sequence, data);
    const packet = this.wrapWithCrc(serialize(dataPacket));

    this.capturePacket('sent', SoeOpcode.Data, packet, dataPacket);
    await this.sendPacket(packet);
  }

  /**
   * Wrap packet with CRC
   */
  private wrapWithCrc(data: Uint8Array): Uint8Array {
    if (this.crcSeed === 0) {
      return data;
    }

    // Calculate CRC (simplified - actual implementation varies)
    const crcValue = crc32(data, this.crcSeed);
    const result = new Uint8Array(data.length + 2);
    result.set(data);
    result[data.length] = (crcValue >> 8) & 0xff;
    result[data.length + 1] = crcValue & 0xff;
    return result;
  }

  /**
   * Handle incoming packet
   */
  private handlePacket(data: Uint8Array): void {
    try {
      // Strip CRC if present
      const packetData = this.crcSeed !== 0 ? data.slice(0, -2) : data;

      const packet = deserialize(packetData);
      this.capturePacket('received', packet.opcode, data, packet);

      this.debug(`Received packet: opcode=0x${packet.opcode.toString(16)}`);

      switch (packet.opcode) {
        case SoeOpcode.SessionResponse:
          this.resolvePending(SoeOpcode.SessionResponse, packetData);
          break;

        case SoeOpcode.Data: {
          const dataPacket = packet as DataPacket;
          // Send ACK
          this.sendAck(dataPacket.sequence);
          // Process the inner data
          this.handleSwgMessage(dataPacket.data);
          break;
        }

        case SoeOpcode.Ack:
          // Handle acknowledgement
          break;

        case SoeOpcode.Ping:
          // Respond to ping
          this.sendPing();
          break;

        case SoeOpcode.Disconnect:
          this.state = 'disconnected';
          this.emit('disconnected');
          break;

        default:
          this.debug(`Unhandled SOE opcode: 0x${packet.opcode.toString(16)}`);
      }
    } catch (error) {
      this.debug('Error handling packet:', error);
    }
  }

  /**
   * Handle SWG message (inner data from Data packet)
   */
  private handleSwgMessage(data: Uint8Array): void {
    if (data.length < 4) return;

    const reader = new BufferReader(data);
    const opcode = reader.readUInt32LE();

    this.debug(`Received SWG message: opcode=0x${opcode.toString(16)}`);

    // Resolve any pending response for this opcode
    this.resolvePending(opcode, data);

    // Emit event for the message
    this.emit('swg-message', opcode, data);
  }

  /**
   * Send ACK for a sequence number
   */
  private async sendAck(sequence: number): Promise<void> {
    const ack = createAck(sequence);
    const packet = this.wrapWithCrc(serialize(ack));
    await this.sendPacket(packet);
  }

  /**
   * Wait for a specific SOE packet type
   */
  private waitForPacket(opcode: number): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(opcode);
        reject(new Error(`Timeout waiting for packet 0x${opcode.toString(16)}`));
      }, this.config.timeout);

      this.pendingResponses.set(opcode, { resolve, reject, timeout });
    });
  }

  /**
   * Wait for a specific SWG message type
   */
  private waitForSwgMessage(opcodes: number[]): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        for (const opcode of opcodes) {
          this.pendingResponses.delete(opcode);
        }
        reject(new Error(`Timeout waiting for SWG message`));
      }, this.config.timeout);

      for (const opcode of opcodes) {
        this.pendingResponses.set(opcode, { resolve, reject, timeout });
      }
    });
  }

  /**
   * Resolve a pending response
   */
  private resolvePending(opcode: number, data: Uint8Array): void {
    const pending = this.pendingResponses.get(opcode);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingResponses.delete(opcode);
      pending.resolve(data);
    }
  }
}

/**
 * Create a mock client instance
 */
export function createMockClient(config: MockClientConfig): MockClient {
  return new MockClient(config);
}

/**
 * Create multiple mock clients for load testing
 */
export function createMockClients(
  count: number,
  config: Omit<MockClientConfig, 'bindPort'>
): MockClient[] {
  const clients: MockClient[] = [];
  for (let i = 0; i < count; i++) {
    clients.push(
      new MockClient({
        ...config,
        bindPort: 0, // Auto-assign ports
      })
    );
  }
  return clients;
}

/**
 * Helper to wait for all clients to connect
 */
export async function connectAll(clients: MockClient[]): Promise<void> {
  await Promise.all(clients.map((c) => c.connect()));
}

/**
 * Helper to disconnect all clients
 */
export async function disconnectAll(clients: MockClient[]): Promise<void> {
  await Promise.all(clients.map((c) => c.disconnect()));
}
