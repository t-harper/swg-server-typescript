/**
 * UDP Server Wrapper
 * Provides a clean interface for dgram UDP socket operations
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';

/**
 * Remote address information for incoming packets
 */
export interface RemoteInfo {
  address: string;
  port: number;
  family: 'IPv4' | 'IPv6';
  size: number;
}

/**
 * Message handler callback type
 */
export type MessageCallback = (data: Buffer, rinfo: RemoteInfo) => void;

/**
 * UDP server statistics
 */
export interface UdpServerStats {
  /** Total bytes received */
  bytesReceived: bigint;
  /** Total bytes sent */
  bytesSent: bigint;
  /** Total packets received */
  packetsReceived: bigint;
  /** Total packets sent */
  packetsSent: bigint;
  /** Server start time */
  startTime: number;
  /** Server uptime in milliseconds */
  uptime: number;
  /** Current bound address */
  boundAddress: string | null;
  /** Current bound port */
  boundPort: number | null;
  /** Whether the server is currently listening */
  isListening: boolean;
}

/**
 * UDP server configuration
 */
export interface UdpServerConfig {
  /** Socket type ('udp4' or 'udp6') */
  type?: 'udp4' | 'udp6';
  /** Enable address reuse */
  reuseAddr?: boolean;
  /** Receive buffer size (bytes) */
  recvBufferSize?: number;
  /** Send buffer size (bytes) */
  sendBufferSize?: number;
}

/**
 * UdpServer - A wrapper around Node.js dgram for UDP socket operations
 */
export class UdpServer extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private readonly config: Required<UdpServerConfig>;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private stats: {
    bytesReceived: bigint;
    bytesSent: bigint;
    packetsReceived: bigint;
    packetsSent: bigint;
    startTime: number;
  };
  private boundAddress: string | null = null;
  private boundPort: number | null = null;
  private isListening: boolean = false;

  constructor(config: UdpServerConfig = {}) {
    super();

    this.config = {
      type: config.type ?? 'udp4',
      reuseAddr: config.reuseAddr ?? true,
      recvBufferSize: config.recvBufferSize ?? 1024 * 1024, // 1MB
      sendBufferSize: config.sendBufferSize ?? 1024 * 1024, // 1MB
    };

    this.stats = {
      bytesReceived: BigInt(0),
      bytesSent: BigInt(0),
      packetsReceived: BigInt(0),
      packetsSent: BigInt(0),
      startTime: 0,
    };
  }

  /**
   * Bind the server to a port and address
   * @param port - Port number to bind to
   * @param address - Address to bind to (default: '0.0.0.0')
   * @returns Promise that resolves when bound
   */
  async bind(port: number, address: string = '0.0.0.0'): Promise<void> {
    if (this.socket) {
      throw new Error('Server is already bound');
    }

    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket({
        type: this.config.type,
        reuseAddr: this.config.reuseAddr,
      });

      // Set up error handler first
      const onError = (err: Error): void => {
        this.socket?.removeListener('listening', onListening);
        reject(err);
      };

      const onListening = (): void => {
        this.socket?.removeListener('error', onError);
        this.isListening = true;
        this.stats.startTime = Date.now();

        const addressInfo = this.socket?.address();
        if (addressInfo && typeof addressInfo === 'object') {
          this.boundAddress = addressInfo.address;
          this.boundPort = addressInfo.port;
        }

        // Set socket buffer sizes
        try {
          this.socket?.setRecvBufferSize(this.config.recvBufferSize);
          this.socket?.setSendBufferSize(this.config.sendBufferSize);
        } catch {
          // Buffer size setting may fail on some systems, not critical
        }

        this.setupEventHandlers();
        this.emit('listening', this.boundAddress, this.boundPort);
        resolve();
      };

      this.socket.once('error', onError);
      this.socket.once('listening', onListening);
      this.socket.bind(port, address);
    });
  }

  /**
   * Set up event handlers for the socket
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      this.stats.packetsReceived += BigInt(1);
      this.stats.bytesReceived += BigInt(msg.length);

      const remoteInfo: RemoteInfo = {
        address: rinfo.address,
        port: rinfo.port,
        family: rinfo.family as 'IPv4' | 'IPv6',
        size: rinfo.size,
      };

      // Emit to all registered callbacks
      for (const callback of this.messageCallbacks) {
        try {
          callback(msg, remoteInfo);
        } catch (error) {
          this.emit('error', error);
        }
      }

      // Also emit as event
      this.emit('message', msg, remoteInfo);
    });

    this.socket.on('error', (err: Error) => {
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      this.isListening = false;
      this.boundAddress = null;
      this.boundPort = null;
      this.emit('close');
    });
  }

  /**
   * Send data to a remote address
   * @param data - Data to send (Buffer or Uint8Array)
   * @param address - Remote address
   * @param port - Remote port
   * @returns Promise that resolves when data is sent
   */
  async send(data: Buffer | Uint8Array, address: string, port: number): Promise<void> {
    if (!this.socket || !this.isListening) {
      throw new Error('Server is not bound');
    }

    const buffer = data instanceof Buffer ? data : Buffer.from(data);

    return new Promise((resolve, reject) => {
      this.socket!.send(buffer, 0, buffer.length, port, address, (err) => {
        if (err) {
          reject(err);
        } else {
          this.stats.packetsSent += BigInt(1);
          this.stats.bytesSent += BigInt(buffer.length);
          resolve();
        }
      });
    });
  }

  /**
   * Send data without waiting for completion (fire-and-forget)
   * @param data - Data to send
   * @param address - Remote address
   * @param port - Remote port
   */
  sendAsync(data: Buffer | Uint8Array, address: string, port: number): void {
    if (!this.socket || !this.isListening) {
      return;
    }

    const buffer = data instanceof Buffer ? data : Buffer.from(data);

    this.socket.send(buffer, 0, buffer.length, port, address, (err) => {
      if (err) {
        this.emit('error', err);
      } else {
        this.stats.packetsSent += BigInt(1);
        this.stats.bytesSent += BigInt(buffer.length);
      }
    });
  }

  /**
   * Register a callback for incoming messages
   * @param callback - Function to call when message is received
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.add(callback);
  }

  /**
   * Remove a message callback
   * @param callback - The callback to remove
   */
  offMessage(callback: MessageCallback): void {
    this.messageCallbacks.delete(callback);
  }

  /**
   * Remove all message callbacks
   */
  clearMessageCallbacks(): void {
    this.messageCallbacks.clear();
  }

  /**
   * Gracefully close the server
   * @returns Promise that resolves when closed
   */
  async close(): Promise<void> {
    if (!this.socket) {
      return;
    }

    return new Promise((resolve) => {
      this.socket!.close(() => {
        this.socket = null;
        this.isListening = false;
        this.messageCallbacks.clear();
        resolve();
      });
    });
  }

  /**
   * Get server statistics
   * @returns Current server statistics
   */
  getStats(): UdpServerStats {
    return {
      bytesReceived: this.stats.bytesReceived,
      bytesSent: this.stats.bytesSent,
      packetsReceived: this.stats.packetsReceived,
      packetsSent: this.stats.packetsSent,
      startTime: this.stats.startTime,
      uptime: this.stats.startTime > 0 ? Date.now() - this.stats.startTime : 0,
      boundAddress: this.boundAddress,
      boundPort: this.boundPort,
      isListening: this.isListening,
    };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.stats.bytesReceived = BigInt(0);
    this.stats.bytesSent = BigInt(0);
    this.stats.packetsReceived = BigInt(0);
    this.stats.packetsSent = BigInt(0);
  }

  /**
   * Check if the server is currently listening
   */
  isBound(): boolean {
    return this.isListening;
  }

  /**
   * Get the bound address
   */
  getBoundAddress(): { address: string; port: number } | null {
    if (!this.boundAddress || !this.boundPort) {
      return null;
    }
    return {
      address: this.boundAddress,
      port: this.boundPort,
    };
  }
}

/**
 * Create a new UDP server instance
 * @param config - Server configuration
 * @returns New UdpServer instance
 */
export function createUdpServer(config?: UdpServerConfig): UdpServer {
  return new UdpServer(config);
}
