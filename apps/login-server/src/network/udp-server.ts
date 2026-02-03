/**
 * UDP Server
 * Wrapper around Node.js dgram for handling UDP communications
 */

import dgram, { type Socket, type RemoteInfo } from 'dgram';
import { EventEmitter } from 'events';

/**
 * Remote endpoint information
 */
export interface RemoteEndpoint {
  address: string;
  port: number;
}

/**
 * Message received callback
 */
export type MessageCallback = (
  data: Uint8Array,
  remote: RemoteEndpoint
) => void;

/**
 * Error callback
 */
export type ErrorCallback = (error: Error) => void;

/**
 * UDP Server configuration
 */
export interface UdpServerConfig {
  /** Whether to use IPv6 (default: false) */
  ipv6?: boolean;
  /** Receive buffer size in bytes */
  recvBufferSize?: number;
  /** Send buffer size in bytes */
  sendBufferSize?: number;
  /** Enable address reuse (default: true) */
  reuseAddr?: boolean;
}

/**
 * UdpServer class
 * Provides a simple interface for UDP socket operations
 */
export class UdpServer extends EventEmitter {
  private socket: Socket | null = null;
  private readonly config: Required<UdpServerConfig>;
  private boundAddress: string | null = null;
  private boundPort: number | null = null;
  private isRunning = false;
  private messageHandler: MessageCallback | null = null;
  private errorHandler: ErrorCallback | null = null;

  constructor(config: UdpServerConfig = {}) {
    super();
    this.config = {
      ipv6: config.ipv6 ?? false,
      recvBufferSize: config.recvBufferSize ?? 65536,
      sendBufferSize: config.sendBufferSize ?? 65536,
      reuseAddr: config.reuseAddr ?? true,
    };
  }

  /**
   * Check if the server is currently running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the bound address
   */
  public getAddress(): string | null {
    return this.boundAddress;
  }

  /**
   * Get the bound port
   */
  public getPort(): number | null {
    return this.boundPort;
  }

  /**
   * Bind the UDP socket to a port and address
   * @param port - The port to bind to
   * @param address - The address to bind to (default: '0.0.0.0')
   * @returns Promise that resolves when bound
   */
  public bind(port: number, address: string = '0.0.0.0'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        reject(new Error('UDP server is already running'));
        return;
      }

      const socketType = this.config.ipv6 ? 'udp6' : 'udp4';
      this.socket = dgram.createSocket({
        type: socketType,
        reuseAddr: this.config.reuseAddr,
      });

      // Set up error handler for binding errors
      const bindErrorHandler = (err: Error): void => {
        this.socket?.removeListener('error', bindErrorHandler);
        this.socket = null;
        reject(err);
      };

      this.socket.once('error', bindErrorHandler);

      // Set up listening handler
      this.socket.once('listening', () => {
        this.socket?.removeListener('error', bindErrorHandler);

        if (this.socket) {
          // Set buffer sizes
          try {
            this.socket.setRecvBufferSize(this.config.recvBufferSize);
            this.socket.setSendBufferSize(this.config.sendBufferSize);
          } catch {
            // Buffer size setting may fail on some systems, ignore
          }

          // Get actual bound address
          const addr = this.socket.address();
          this.boundAddress = addr.address;
          this.boundPort = addr.port;
          this.isRunning = true;

          // Set up message handler
          this.socket.on('message', this.handleMessage.bind(this));

          // Set up error handler for runtime errors
          this.socket.on('error', this.handleError.bind(this));

          // Set up close handler
          this.socket.on('close', () => {
            this.isRunning = false;
            this.boundAddress = null;
            this.boundPort = null;
            this.emit('close');
          });

          this.emit('listening', { address: this.boundAddress, port: this.boundPort });
          resolve();
        }
      });

      // Bind the socket
      this.socket.bind(port, address);
    });
  }

  /**
   * Register a callback for incoming messages
   * @param callback - The callback to invoke on message receipt
   */
  public onMessage(callback: MessageCallback): void {
    this.messageHandler = callback;
  }

  /**
   * Register a callback for errors
   * @param callback - The callback to invoke on error
   */
  public onError(callback: ErrorCallback): void {
    this.errorHandler = callback;
  }

  /**
   * Internal message handler
   */
  private handleMessage(msg: Buffer, rinfo: RemoteInfo): void {
    const data = new Uint8Array(msg);
    const remote: RemoteEndpoint = {
      address: rinfo.address,
      port: rinfo.port,
    };

    // Emit event
    this.emit('message', data, remote);

    // Call registered handler
    if (this.messageHandler) {
      try {
        this.messageHandler(data, remote);
      } catch (error) {
        console.error('[UdpServer] Error in message handler:', error);
        this.handleError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Internal error handler
   */
  private handleError(error: Error): void {
    // Emit event
    this.emit('error', error);

    // Call registered handler
    if (this.errorHandler) {
      this.errorHandler(error);
    } else {
      console.error('[UdpServer] Unhandled error:', error);
    }
  }

  /**
   * Send data to a remote endpoint
   * @param data - The data to send
   * @param address - The destination address
   * @param port - The destination port
   * @returns Promise that resolves when sent
   */
  public send(data: Uint8Array, address: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isRunning) {
        reject(new Error('UDP server is not running'));
        return;
      }

      const buffer = Buffer.from(data);
      this.socket.send(buffer, 0, buffer.length, port, address, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Send data to a remote endpoint (fire and forget)
   * Does not wait for confirmation, useful for high-frequency sends
   * @param data - The data to send
   * @param address - The destination address
   * @param port - The destination port
   */
  public sendSync(data: Uint8Array, address: string, port: number): void {
    if (!this.socket || !this.isRunning) {
      return;
    }

    const buffer = Buffer.from(data);
    this.socket.send(buffer, 0, buffer.length, port, address, (err) => {
      if (err) {
        this.handleError(err);
      }
    });
  }

  /**
   * Close the UDP socket gracefully
   * @returns Promise that resolves when closed
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isRunning) {
        resolve();
        return;
      }

      this.socket.once('close', () => {
        this.socket = null;
        this.isRunning = false;
        this.boundAddress = null;
        this.boundPort = null;
        resolve();
      });

      this.socket.close();
    });
  }

  /**
   * Get socket statistics (if available)
   */
  public getStats(): { sent: number; received: number } | null {
    // Note: Node.js dgram doesn't expose these directly
    // This is a placeholder for potential future implementation
    return null;
  }
}

/**
 * Create a new UDP server instance
 * @param config - Optional configuration
 * @returns UdpServer instance
 */
export function createUdpServer(config?: UdpServerConfig): UdpServer {
  return new UdpServer(config);
}
