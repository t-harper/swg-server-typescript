/**
 * SOE Session Manager
 * Manages UDP sessions using the SOE protocol for Star Wars Galaxies
 * Handles connection establishment, reliable data transfer, fragmentation, and acknowledgements
 */

import { EventEmitter } from 'events';
import {
  SoeOpcode,
  SoeProtocolDefaults,
  DisconnectReason,
  type DisconnectReasonType,
  CrcConfig,
  getOpcodeName,
} from './constants.js';
import { appendCrc, validateCrc, stripCrc } from './crc32.js';
import { generateRandomSeed } from './encryption.js';
import { compressData, decompressData } from './compression.js';
import { BufferReader, BufferWriter, concatBytes } from './buffer-utils.js';
import * as Packet from './packet.js';

/**
 * Session states for the SOE protocol state machine
 */
export enum SessionState {
  /** No active connection */
  Disconnected = 0,
  /** Session request received, negotiating parameters */
  Negotiating = 1,
  /** Session fully established and active */
  Connected = 2,
  /** Disconnect initiated, waiting for cleanup */
  Terminating = 3,
}

/**
 * Client address information
 */
export interface ClientAddress {
  address: string;
  port: number;
}

/**
 * Remote info from UDP socket (compatible with dgram.RemoteInfo)
 */
export interface RemoteInfo {
  address: string;
  port: number;
  family?: 'IPv4' | 'IPv6';
  size?: number;
}

/**
 * Pending packet awaiting acknowledgement
 */
interface PendingPacket {
  sequence: number;
  data: Uint8Array;
  sentAt: number;
  retries: number;
}

/**
 * Fragment reassembly state
 */
interface FragmentBuffer {
  totalSize: number;
  receivedSize: number;
  fragments: Map<number, Uint8Array>;
  startSequence: number;
  expectedFragments: number;
}

/**
 * Session represents a single client connection
 */
export class Session {
  /** Unique connection ID from the client */
  public readonly sessionId: number;

  /** Current session state */
  public state: SessionState;

  /** CRC seed generated on connection for packet validation */
  public readonly crcSeed: number;

  /** Client's network address */
  public readonly clientAddress: ClientAddress;

  /** Next sequence number for outgoing packets */
  public sendSequence: number;

  /** Expected sequence number for incoming packets */
  public receiveSequence: number;

  /** Timestamp of last activity (for timeout detection) */
  public lastActivity: number;

  /** Whether SOE-level encryption (compression) is enabled for this session */
  public useCompression: boolean;

  /** Buffer for reordering out-of-order packets */
  public outOfOrderQueue: Map<number, Uint8Array>;

  /** Set of sequence numbers awaiting acknowledgement */
  public pendingAcks: Map<number, PendingPacket>;

  /** Buffer for reassembling fragmented packets */
  public fragmentBuffer: FragmentBuffer | null;

  /** Maximum packet size negotiated with client */
  public maxPacketSize: number;

  /** Protocol version */
  public protocolVersion: number;

  /** Statistics */
  public packetsSent: bigint;
  public packetsReceived: bigint;

  constructor(
    sessionId: number,
    clientAddress: ClientAddress,
    crcSeed: number,
    options: {
      useCompression?: boolean;
      maxPacketSize?: number;
      protocolVersion?: number;
    } = {}
  ) {
    this.sessionId = sessionId;
    this.clientAddress = clientAddress;
    this.crcSeed = crcSeed;
    this.state = SessionState.Negotiating;
    this.sendSequence = 0;
    this.receiveSequence = 0;
    this.lastActivity = Date.now();
    this.useCompression = options.useCompression ?? true;
    this.outOfOrderQueue = new Map();
    this.pendingAcks = new Map();
    this.fragmentBuffer = null;
    this.maxPacketSize = options.maxPacketSize ?? SoeProtocolDefaults.UDP_MAX_SIZE;
    this.protocolVersion = options.protocolVersion ?? SoeProtocolDefaults.PROTOCOL_VERSION;
    this.packetsSent = BigInt(0);
    this.packetsReceived = BigInt(0);
  }

  /**
   * Get the next send sequence and increment
   */
  getNextSendSequence(): number {
    const seq = this.sendSequence;
    this.sendSequence = (this.sendSequence + 1) & 0xffff; // 16-bit wraparound
    return seq;
  }

  /**
   * Check if a sequence number is newer than the expected receive sequence
   * Handles 16-bit wraparound
   */
  isSequenceNewer(sequence: number, expected: number): boolean {
    const diff = (sequence - expected) & 0xffff;
    return diff > 0 && diff < 0x8000;
  }

  /**
   * Check if a sequence number is older than the expected receive sequence
   */
  isSequenceOlder(sequence: number, expected: number): boolean {
    const diff = (expected - sequence) & 0xffff;
    return diff > 0 && diff < 0x8000;
  }

  /**
   * Update last activity timestamp
   */
  touch(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Get session key for map lookups
   */
  static getKey(address: string, port: number): string {
    return `${address}:${port}`;
  }

  /**
   * Get this session's key
   */
  getKey(): string {
    return Session.getKey(this.clientAddress.address, this.clientAddress.port);
  }
}

/**
 * Events emitted by the SessionManager
 */
export interface SessionManagerEvents {
  'session:connected': (session: Session) => void;
  'session:disconnected': (session: Session, reason: number) => void;
  'data': (session: Session, data: Uint8Array) => void;
  'error': (error: Error, session?: Session) => void;
}

/**
 * Configuration options for SessionManager
 */
export interface SessionManagerOptions {
  /** UDP buffer size to advertise to clients */
  udpBufferSize?: number;
  /** Session timeout in milliseconds */
  sessionTimeout?: number;
  /** Resend timeout for unacknowledged packets */
  resendTimeout?: number;
  /** Maximum retries before giving up on a packet */
  maxRetries?: number;
  /** Whether to enable compression by default */
  enableCompression?: boolean;
  /** Whether to enable encryption */
  enableEncryption?: boolean;
  /** Tick interval for timeout checks and retransmissions */
  tickInterval?: number;
}

/**
 * SessionManager handles SOE protocol sessions for multiple clients
 */
export class SessionManager extends EventEmitter {
  /** Map of active sessions keyed by address:port */
  private sessions: Map<string, Session>;

  /** Configuration options */
  private options: Required<SessionManagerOptions>;

  /** Send callback for transmitting packets */
  private sendCallback: ((data: Uint8Array, address: string, port: number) => void) | null;

  /** Tick timer handle */
  private tickTimer: ReturnType<typeof setInterval> | null;

  constructor(options: SessionManagerOptions = {}) {
    super();

    this.sessions = new Map();
    this.sendCallback = null;
    this.tickTimer = null;

    this.options = {
      udpBufferSize: options.udpBufferSize ?? SoeProtocolDefaults.UDP_MAX_SIZE,
      sessionTimeout: options.sessionTimeout ?? SoeProtocolDefaults.SESSION_TIMEOUT_MS,
      resendTimeout: options.resendTimeout ?? SoeProtocolDefaults.RESEND_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? 5,
      enableCompression: options.enableCompression ?? true,
      enableEncryption: options.enableEncryption ?? true,
      tickInterval: options.tickInterval ?? 100,
    };
  }

  /**
   * Set the send callback for transmitting packets
   */
  setSendCallback(callback: (data: Uint8Array, address: string, port: number) => void): void {
    this.sendCallback = callback;
  }

  /**
   * Start the tick timer for timeout checks and retransmissions
   */
  start(): void {
    if (this.tickTimer) {
      return;
    }
    this.tickTimer = setInterval(() => this.tick(), this.options.tickInterval);
  }

  /**
   * Stop the tick timer
   */
  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * Main packet handler - entry point for all incoming packets
   */
  handlePacket(data: Uint8Array, rinfo: RemoteInfo): void {
    if (data.length < 2) {
      this.emitError(new Error('Packet too short'));
      return;
    }

    const sessionKey = Session.getKey(rinfo.address, rinfo.port);
    const session = this.sessions.get(sessionKey);

    // Get opcode from packet
    const opcode = Packet.getPacketOpcode(data);

    // Debug logging for packet analysis
    const hexDump = Array.from(data.slice(0, Math.min(32, data.length)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log(`[SOE] Recv ${rinfo.address}:${rinfo.port} opcode=0x${opcode.toString(16).padStart(4, '0')} len=${data.length} hex=[${hexDump}]`);

    try {
      // Handle packets that don't require an existing session
      if (opcode === SoeOpcode.SessionRequest) {
        this.processSessionRequest(data, rinfo);
        return;
      }

      // All other packets require an existing session
      if (!session) {
        // Ignore packets from unknown sources
        return;
      }

      // Update activity timestamp
      session.touch();
      session.packetsReceived++;

      // Validate CRC for packets that have it (post-negotiation)
      // C++ flow: SessionRequest/SessionResponse have no CRC; all others do
      if (session.state === SessionState.Connected && this.packetHasCrc(opcode)) {
        if (!validateCrc(data, session.crcSeed)) {
          this.emitError(new Error('CRC validation failed'), session);
          return;
        }
        // Strip CRC for further processing
        data = stripCrc(data);
      }

      // SOE decrypt (compression-based) for all non-session packets
      // C++ ProcessRawPacket applies decrypt passes after CRC strip
      if (session.state === SessionState.Connected && this.packetHasCrc(opcode)) {
        data = this.soeDecrypt(data);
      }

      // Route to appropriate handler
      switch (opcode) {
        case SoeOpcode.SessionResponse:
          this.processSessionResponse(data, session);
          break;
        case SoeOpcode.Disconnect:
          this.processDisconnect(data, session);
          break;
        case SoeOpcode.Ping:
          this.processPing(session);
          break;
        case SoeOpcode.NetStatusRequest:
          this.processNetStatusRequest(data, session);
          break;
        case SoeOpcode.Data:
          this.processData(data, session);
          break;
        case SoeOpcode.DataFragment:
          this.processDataFragment(data, session);
          break;
        case SoeOpcode.Ack:
          this.processAck(data, session);
          break;
        case SoeOpcode.OutOfOrder:
          this.processOutOfOrder(data, session);
          break;
        case SoeOpcode.MultiPacket:
          this.processMultiPacket(data, session);
          break;
        default:
          this.emitError(new Error(`Unknown opcode: ${getOpcodeName(opcode)}`), session);
      }
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)), session);
    }
  }

  /**
   * Process a SessionRequest packet - handle new connection
   */
  private processSessionRequest(data: Uint8Array, rinfo: RemoteInfo): void {
    const packet = Packet.deserialize(data) as Packet.SessionRequestPacket;

    // Generate a CRC seed for this session
    const crcSeed = this.options.enableEncryption ? generateRandomSeed() : 0;

    // Create new session
    const session = this.createSession(
      rinfo.address,
      rinfo.port,
      packet.connectionId,
      crcSeed,
      {
        useCompression: this.options.enableCompression,
        maxPacketSize: Math.min(packet.clientUdpBufferSize, this.options.udpBufferSize),
      }
    );

    // Send session response
    // C++ has cEncryptPasses=2, both using UserSupplied (compression)
    const response = Packet.createSessionResponse(
      packet.connectionId,
      crcSeed,
      this.options.udpBufferSize,
      {
        encryptMethod0: this.options.enableCompression ? 1 : 0, // UserSupplied = compression
        encryptMethod1: this.options.enableCompression ? 1 : 0, // UserSupplied = compression
      }
    );

    // Session response is sent without CRC (pre-negotiation)
    this.sendRaw(session, Packet.serialize(response));

    // Mark session as connected
    session.state = SessionState.Connected;
    this.emit('session:connected', session);
  }

  /**
   * Process a SessionResponse packet - servers should not receive this
   * but handle gracefully if it arrives
   */
  private processSessionResponse(data: Uint8Array, session: Session): void {
    // Servers typically don't receive session responses
    // This would only happen if we initiated a connection as a client
    const packet = Packet.deserialize(data) as Packet.SessionResponsePacket;

    // Update session with negotiated parameters
    session.useCompression = packet.encryptMethod0 === 1; // UserSupplied = compression
    session.state = SessionState.Connected;

    this.emit('session:connected', session);
  }

  /**
   * Process a Disconnect packet - clean up session
   */
  private processDisconnect(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.DisconnectPacket;

    session.state = SessionState.Terminating;
    this.emit('session:disconnected', session, packet.reason);
    this.removeSession(session.clientAddress.address, session.clientAddress.port);
  }

  /**
   * Process a Ping packet - respond with ping
   */
  private processPing(session: Session): void {
    // Respond with a ping
    const response = Packet.createPing();
    this.sendPacket(session, Packet.serialize(response));
  }

  /**
   * Process a NetStatusRequest packet
   */
  private processNetStatusRequest(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.NetStatusRequestPacket;

    // Send net status response
    const response: Packet.NetStatusResponsePacket = {
      opcode: SoeOpcode.NetStatusResponse,
      clientTickCount: packet.clientTickCount,
      serverTickCount: Date.now() & 0xffffffff,
      clientPacketsSent: packet.packetsSent,
      clientPacketsReceived: packet.packetsReceived,
      serverPacketsSent: session.packetsSent,
      serverPacketsReceived: session.packetsReceived,
    };

    this.sendPacket(session, Packet.serialize(response));
  }

  /**
   * Process a Data packet - handle reliable data, send ack
   */
  private processData(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.DataPacket;

    // Check sequence number
    if (packet.sequence === session.receiveSequence) {
      // Expected packet - process it
      session.receiveSequence = (session.receiveSequence + 1) & 0xffff;

      // Emit the data event (SOE-level decompression already applied in handlePacket)
      this.emit('data', session, packet.data);

      // Send acknowledgement
      this.sendAck(session, packet.sequence);

      // Check for out-of-order packets that can now be processed
      this.processOutOfOrderQueue(session);
    } else if (session.isSequenceNewer(packet.sequence, session.receiveSequence)) {
      // Future packet - queue it for later processing
      if (session.outOfOrderQueue.size < SoeProtocolDefaults.MAX_OUT_OF_ORDER_PACKETS) {
        session.outOfOrderQueue.set(packet.sequence, packet.data);
      }

      // Send out-of-order notification for the expected sequence
      this.sendOutOfOrder(session, session.receiveSequence);

      // Still send ack for received packet
      this.sendAck(session, packet.sequence);
    } else {
      // Old packet - just ack it (duplicate)
      this.sendAck(session, packet.sequence);
    }
  }

  /**
   * Process a DataFragment packet - reassemble fragments
   */
  private processDataFragment(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.DataFragmentPacket;

    // Check sequence number
    if (packet.sequence !== session.receiveSequence) {
      if (session.isSequenceNewer(packet.sequence, session.receiveSequence)) {
        // Future packet - queue it
        if (session.outOfOrderQueue.size < SoeProtocolDefaults.MAX_OUT_OF_ORDER_PACKETS) {
          session.outOfOrderQueue.set(packet.sequence, data);
        }
        this.sendOutOfOrder(session, session.receiveSequence);
        this.sendAck(session, packet.sequence);
      } else {
        // Old packet - just ack
        this.sendAck(session, packet.sequence);
      }
      return;
    }

    // Expected packet - process fragment
    session.receiveSequence = (session.receiveSequence + 1) & 0xffff;
    this.sendAck(session, packet.sequence);

    // First fragment contains the total size in the first 4 bytes
    if (!session.fragmentBuffer) {
      if (packet.data.length < 4) {
        this.emitError(new Error('Fragment too short for size header'), session);
        return;
      }

      const reader = new BufferReader(packet.data);
      const totalSize = reader.readUInt32BE();
      const fragmentData = reader.readRemaining();

      session.fragmentBuffer = {
        totalSize,
        receivedSize: fragmentData.length,
        fragments: new Map([[packet.sequence, fragmentData]]),
        startSequence: packet.sequence,
        expectedFragments: Math.ceil(
          (totalSize + 4) / (session.maxPacketSize - 4 - CrcConfig.CRC_LENGTH)
        ),
      };
    } else {
      // Subsequent fragment
      session.fragmentBuffer.fragments.set(packet.sequence, packet.data);
      session.fragmentBuffer.receivedSize += packet.data.length;
    }

    // Check if we have all fragments
    if (session.fragmentBuffer.receivedSize >= session.fragmentBuffer.totalSize) {
      // Reassemble the complete data
      const completeData = this.reassembleFragments(session.fragmentBuffer);
      session.fragmentBuffer = null;

      // Emit the data event (SOE-level decompression already applied in handlePacket)
      this.emit('data', session, completeData);
    }

    // Process any queued out-of-order packets
    this.processOutOfOrderQueue(session);
  }

  /**
   * Process an Ack packet - remove from pending
   */
  private processAck(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.AckPacket;

    // Remove acknowledged packet from pending queue
    // Ack acknowledges all packets up to and including the sequence
    for (const [seq] of session.pendingAcks) {
      if (seq <= packet.sequence || session.isSequenceOlder(seq, packet.sequence)) {
        session.pendingAcks.delete(seq);
      }
    }
  }

  /**
   * Process an OutOfOrder packet - client reports gap
   */
  private processOutOfOrder(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.OutOfOrderPacket;

    // Client is reporting it received an out-of-order packet
    // We should resend the expected sequence if we have it pending
    const pending = session.pendingAcks.get(packet.sequence);
    if (pending) {
      // Resend immediately
      this.transmitPacket(session, pending.data);
      pending.sentAt = Date.now();
      pending.retries++;
    }
  }

  /**
   * Process a MultiPacket - handle bundled packets
   */
  private processMultiPacket(data: Uint8Array, session: Session): void {
    const packet = Packet.deserialize(data) as Packet.MultiPacket;

    // Process each sub-packet
    for (const subPacket of packet.subPackets) {
      if (subPacket.length >= 2) {
        // Recursively handle each sub-packet
        // Note: sub-packets don't have CRC
        const opcode = Packet.getPacketOpcode(subPacket);

        switch (opcode) {
          case SoeOpcode.Data:
            this.processData(subPacket, session);
            break;
          case SoeOpcode.DataFragment:
            this.processDataFragment(subPacket, session);
            break;
          case SoeOpcode.Ack:
            this.processAck(subPacket, session);
            break;
          case SoeOpcode.OutOfOrder:
            this.processOutOfOrder(subPacket, session);
            break;
          case SoeOpcode.Ping:
            this.processPing(session);
            break;
          default:
            // Ignore unknown sub-packets
            break;
        }
      }
    }
  }

  /**
   * Send a packet to a session with SOE encryption (compression) and CRC
   */
  sendPacket(session: Session, packet: Uint8Array): void {
    let data = packet;
    const opcode = Packet.getPacketOpcode(packet);

    // SOE encrypt (compression) + CRC for all non-session packets
    if (session.state === SessionState.Connected && this.packetHasCrc(opcode)) {
      data = this.soeEncrypt(data);
      data = appendCrc(data, session.crcSeed);
    }

    this.transmitPacket(session, data);
  }

  /**
   * Send reliable data - fragment if needed, track ack
   */
  sendReliable(session: Session, data: Uint8Array): void {
    if (session.state !== SessionState.Connected) {
      this.emitError(new Error('Cannot send data on disconnected session'), session);
      return;
    }

    // Calculate max data size per packet
    // Account for: opcode (2) + sequence (2) + compress flag (1) + CRC (2) = 7 bytes overhead
    const maxDataSize = session.maxPacketSize - 7;

    if (data.length <= maxDataSize) {
      // Send as single Data packet
      const sequence = session.getNextSendSequence();
      const packet = Packet.createData(sequence, data);
      const serialized = Packet.serialize(packet);

      // Apply SOE encryption (compression) and CRC
      const encrypted = this.soeEncrypt(serialized);
      const withCrc = appendCrc(encrypted, session.crcSeed);

      session.pendingAcks.set(sequence, {
        sequence,
        data: withCrc,
        sentAt: Date.now(),
        retries: 0,
      });

      this.transmitPacket(session, withCrc);
    } else {
      // Fragment the data
      this.sendFragmented(session, data);
    }
  }

  /**
   * Send fragmented data
   */
  private sendFragmented(session: Session, data: Uint8Array): void {
    // First fragment includes 4-byte size header
    // Calculate fragment size: max packet size - opcode (2) - sequence (2) - compress flag (1) - CRC (2) = -7
    const maxFragmentSize = session.maxPacketSize - 7;
    const firstFragmentDataSize = maxFragmentSize - 4; // Account for size header

    const fragments: Uint8Array[] = [];

    // First fragment with size header
    const writer = new BufferWriter(maxFragmentSize);
    writer.writeUInt32BE(data.length);
    writer.writeBytes(data.subarray(0, Math.min(firstFragmentDataSize, data.length)));
    fragments.push(writer.toBuffer());

    // Subsequent fragments
    let offset = firstFragmentDataSize;
    while (offset < data.length) {
      const chunkSize = Math.min(maxFragmentSize, data.length - offset);
      fragments.push(data.subarray(offset, offset + chunkSize));
      offset += chunkSize;
    }

    // Send each fragment
    for (const fragment of fragments) {
      const sequence = session.getNextSendSequence();
      const packet = Packet.createDataFragment(sequence, fragment);
      const serialized = Packet.serialize(packet);

      // Apply SOE encryption (compression) and CRC
      const encrypted = this.soeEncrypt(serialized);
      const withCrc = appendCrc(encrypted, session.crcSeed);

      session.pendingAcks.set(sequence, {
        sequence,
        data: withCrc,
        sentAt: Date.now(),
        retries: 0,
      });

      this.transmitPacket(session, withCrc);
    }
  }

  /**
   * Get a session by address and port
   */
  getSession(address: string, port: number): Session | undefined {
    return this.sessions.get(Session.getKey(address, port));
  }

  /**
   * Create a new session
   */
  createSession(
    address: string,
    port: number,
    connectionId: number,
    crcSeed?: number,
    options: {
      useCompression?: boolean;
      maxPacketSize?: number;
    } = {}
  ): Session {
    const key = Session.getKey(address, port);

    // Remove existing session if any
    if (this.sessions.has(key)) {
      this.removeSession(address, port);
    }

    const session = new Session(
      connectionId,
      { address, port },
      crcSeed ?? generateRandomSeed(),
      options
    );

    this.sessions.set(key, session);
    return session;
  }

  /**
   * Remove a session
   */
  removeSession(address: string, port: number): boolean {
    const key = Session.getKey(address, port);
    const session = this.sessions.get(key);

    if (session) {
      session.state = SessionState.Disconnected;
      session.pendingAcks.clear();
      session.outOfOrderQueue.clear();
      session.fragmentBuffer = null;
      this.sessions.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Disconnect a session gracefully
   */
  disconnectSession(session: Session, reason: DisconnectReasonType = DisconnectReason.Application): void {
    if (session.state === SessionState.Disconnected) {
      return;
    }

    session.state = SessionState.Terminating;

    // Send disconnect packet
    const packet = Packet.createDisconnect(session.sessionId, reason);
    this.sendPacket(session, Packet.serialize(packet));

    this.emit('session:disconnected', session, reason);
    this.removeSession(session.clientAddress.address, session.clientAddress.port);
  }

  /**
   * Get all active sessions
   */
  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Tick function - check timeouts, retransmit unacked packets
   */
  tick(): void {
    const now = Date.now();

    for (const session of this.sessions.values()) {
      // Check session timeout
      if (now - session.lastActivity > this.options.sessionTimeout) {
        this.disconnectSession(session, DisconnectReason.Timeout);
        continue;
      }

      // Check pending packets for retransmission
      for (const [sequence, pending] of session.pendingAcks) {
        if (now - pending.sentAt > this.options.resendTimeout) {
          if (pending.retries >= this.options.maxRetries) {
            // Too many retries - disconnect
            this.disconnectSession(session, DisconnectReason.UnacknowledgedTimeout);
            break;
          }

          // Retransmit
          this.transmitPacket(session, pending.data);
          pending.sentAt = now;
          pending.retries++;
        }
      }
    }
  }

  /**
   * Send an acknowledgement packet
   */
  private sendAck(session: Session, sequence: number): void {
    const packet = Packet.createAck(sequence);
    this.sendPacket(session, Packet.serialize(packet));
  }

  /**
   * Send an out-of-order notification
   */
  private sendOutOfOrder(session: Session, sequence: number): void {
    const packet = Packet.createOutOfOrder(sequence);
    this.sendPacket(session, Packet.serialize(packet));
  }

  /**
   * Process queued out-of-order packets
   */
  private processOutOfOrderQueue(session: Session): void {
    let processed = true;

    while (processed && session.outOfOrderQueue.size > 0) {
      processed = false;
      const data = session.outOfOrderQueue.get(session.receiveSequence);

      if (data) {
        session.outOfOrderQueue.delete(session.receiveSequence);
        const opcode = Packet.getPacketOpcode(data);

        if (opcode === SoeOpcode.Data) {
          // Process as data packet (already decompressed at SOE level)
          const packet = Packet.deserialize(data) as Packet.DataPacket;
          session.receiveSequence = (session.receiveSequence + 1) & 0xffff;

          this.emit('data', session, packet.data);
          processed = true;
        } else if (opcode === SoeOpcode.DataFragment) {
          // Re-process as fragment (it's the raw packet data)
          this.processDataFragment(data, session);
          processed = true;
        }
      }
    }
  }

  /**
   * Reassemble fragments into complete data
   */
  private reassembleFragments(fragmentBuffer: FragmentBuffer): Uint8Array {
    const result = new Uint8Array(fragmentBuffer.totalSize);
    let offset = 0;

    // Sort fragments by sequence and reassemble
    const sortedFragments = Array.from(fragmentBuffer.fragments.entries()).sort(
      ([a], [b]) => {
        // Handle wraparound in sequence comparison
        const diff = (a - fragmentBuffer.startSequence) & 0xffff;
        const diff2 = (b - fragmentBuffer.startSequence) & 0xffff;
        return diff - diff2;
      }
    );

    for (const [, data] of sortedFragments) {
      const copyLength = Math.min(data.length, fragmentBuffer.totalSize - offset);
      result.set(data.subarray(0, copyLength), offset);
      offset += copyLength;

      if (offset >= fragmentBuffer.totalSize) {
        break;
      }
    }

    return result;
  }

  /**
   * Single pass of SOE user-supplied encrypt (compression with trailing flag byte)
   * Matches C++ OnUserSuppliedEncrypt in ManagerHandler.cpp
   * Operates on raw payload bytes, appends flag byte at end
   */
  private soeEncryptOnePass(payload: Uint8Array): Uint8Array {
    if (payload.length > 0) {
      try {
        const compressed = compressData(payload);
        if (compressed.length < payload.length) {
          // Compression helped — compressed data + flag 0x01
          const result = new Uint8Array(compressed.length + 1);
          result.set(compressed);
          result[compressed.length] = 0x01;
          return result;
        }
      } catch {
        // Compression failed, fall through to uncompressed
      }
    }

    // Not compressed — original payload + flag 0x00
    const result = new Uint8Array(payload.length + 1);
    result.set(payload);
    result[payload.length] = 0x00;
    return result;
  }

  /**
   * Single pass of SOE user-supplied decrypt (decompression based on trailing flag byte)
   * Matches C++ OnUserSuppliedDecrypt in ManagerHandler.cpp
   * Checks last byte: 0x01 = compressed (decompress), 0x00 = not compressed (strip flag)
   */
  private soeDecryptOnePass(payload: Uint8Array): Uint8Array {
    if (payload.length === 0) {
      return payload;
    }

    const flag = payload[payload.length - 1];
    const data = payload.subarray(0, payload.length - 1);

    if (flag === 0x01 && data.length > 0) {
      // Compressed — decompress
      try {
        return decompressData(data);
      } catch (err) {
        console.error('[SOE] Decompression failed:', err);
        return data;
      }
    }

    // Not compressed — return data without flag byte
    return data;
  }

  /**
   * SOE encrypt with 2 passes (matches C++ cEncryptPasses=2)
   * Both passes use UserSupplied encryption (compression)
   * Operates on payload after opcode (first 2 bytes are preserved)
   */
  private soeEncrypt(data: Uint8Array): Uint8Array {
    const opcode = data.subarray(0, 2);
    let payload = data.subarray(2);

    // C++ encrypts in forward order: pass 0, then pass 1
    for (let j = 0; j < 2; j++) {
      payload = this.soeEncryptOnePass(payload);
    }

    const result = new Uint8Array(2 + payload.length);
    result.set(opcode);
    result.set(payload, 2);
    return result;
  }

  /**
   * SOE decrypt with 2 passes (matches C++ cEncryptPasses=2)
   * Both passes use UserSupplied decryption (decompression)
   * Operates on payload after opcode (first 2 bytes are preserved)
   */
  private soeDecrypt(data: Uint8Array): Uint8Array {
    if (data.length <= 2) {
      return data;
    }

    const opcode = data.subarray(0, 2);
    let payload = data.subarray(2);

    // C++ decrypts in reverse order: pass 1 first, then pass 0
    for (let j = 1; j >= 0; j--) {
      payload = this.soeDecryptOnePass(payload);
    }

    const result = new Uint8Array(2 + payload.length);
    result.set(opcode);
    result.set(payload, 2);
    return result;
  }

  /**
   * Send raw packet data without processing
   */
  private sendRaw(session: Session, data: Uint8Array): void {
    this.transmitPacket(session, data);
  }

  /**
   * Transmit packet to the network
   */
  private transmitPacket(session: Session, data: Uint8Array): void {
    if (!this.sendCallback) {
      this.emitError(new Error('No send callback configured'));
      return;
    }

    session.packetsSent++;
    this.sendCallback(data, session.clientAddress.address, session.clientAddress.port);
  }

  /**
   * Check if a packet type has CRC
   */
  private packetHasCrc(opcode: number): boolean {
    // Session request and response don't have CRC
    return opcode !== SoeOpcode.SessionRequest && opcode !== SoeOpcode.SessionResponse;
  }


  /**
   * Emit an error event
   */
  private emitError(error: Error, session?: Session): void {
    this.emit('error', error, session);
  }

  /**
   * Clean up and destroy the session manager
   */
  destroy(): void {
    this.stop();

    // Disconnect all sessions
    for (const session of this.sessions.values()) {
      this.disconnectSession(session, DisconnectReason.ManagerDeleted);
    }

    this.sessions.clear();
    this.sendCallback = null;
    this.removeAllListeners();
  }
}

// Type-safe event emitter interface
export interface SessionManager {
  on<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this;
  once<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this;
  emit<K extends keyof SessionManagerEvents>(
    event: K,
    ...args: Parameters<SessionManagerEvents[K]>
  ): boolean;
  off<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this;
  removeListener<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this;
}

export default SessionManager;
