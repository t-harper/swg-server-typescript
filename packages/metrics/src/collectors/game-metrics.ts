/**
 * Star Wars Galaxies - Game Metrics
 *
 * Pre-defined metrics for game server monitoring.
 */

import { MetricRegistry } from '../metric-types.js';
import { getDefaultRegistry } from '../metric-registry.js';
import { Counter } from '../counters.js';
import { Gauge } from '../gauges.js';
import { Histogram } from '../histograms.js';

/**
 * Game metrics collection
 */
export interface GameMetrics {
  // Player metrics
  playersOnline: Gauge;
  playerLogins: Counter;
  playerLogouts: Counter;

  // Connection metrics
  connectionsTotal: Counter;
  connectionsActive: Gauge;
  connectionErrors: Counter;

  // Packet metrics
  packetsReceived: Counter;
  packetsSent: Counter;
  bytesReceived: Counter;
  bytesSent: Counter;
  packetErrors: Counter;

  // Message processing
  messageProcessingDuration: Histogram;
  messagesProcessed: Counter;
  messageErrors: Counter;

  // Zone metrics
  zonePlayerCount: Gauge;
  zoneObjectCount: Gauge;

  // Object metrics
  objectsLoaded: Gauge;
  objectsCreated: Counter;
  objectsDestroyed: Counter;

  // Server metrics
  serverUptime: Gauge;
  tickDuration: Histogram;
  ticksTotal: Counter;
}

/**
 * Create game metrics and register them with the given registry
 */
export function createGameMetrics(registry?: MetricRegistry): GameMetrics {
  const reg = registry ?? getDefaultRegistry();

  return {
    // Player metrics
    playersOnline: reg.gauge({
      name: 'swg_players_online',
      help: 'Number of players currently online',
    }),

    playerLogins: reg.counter({
      name: 'swg_player_logins_total',
      help: 'Total number of player login events',
    }),

    playerLogouts: reg.counter({
      name: 'swg_player_logouts_total',
      help: 'Total number of player logout events',
    }),

    // Connection metrics
    connectionsTotal: reg.counter({
      name: 'swg_connections_total',
      help: 'Total number of connections established',
      labelNames: ['type'], // tcp, udp, websocket
    }),

    connectionsActive: reg.gauge({
      name: 'swg_connections_active',
      help: 'Number of currently active connections',
      labelNames: ['type'],
    }),

    connectionErrors: reg.counter({
      name: 'swg_connection_errors_total',
      help: 'Total number of connection errors',
      labelNames: ['type', 'error_type'],
    }),

    // Packet metrics
    packetsReceived: reg.counter({
      name: 'swg_packets_received_total',
      help: 'Total number of packets received',
      labelNames: ['packet_type'],
    }),

    packetsSent: reg.counter({
      name: 'swg_packets_sent_total',
      help: 'Total number of packets sent',
      labelNames: ['packet_type'],
    }),

    bytesReceived: reg.counter({
      name: 'swg_bytes_received_total',
      help: 'Total bytes received',
    }),

    bytesSent: reg.counter({
      name: 'swg_bytes_sent_total',
      help: 'Total bytes sent',
    }),

    packetErrors: reg.counter({
      name: 'swg_packet_errors_total',
      help: 'Total number of packet processing errors',
      labelNames: ['error_type'],
    }),

    // Message processing
    messageProcessingDuration: reg.histogram({
      name: 'swg_message_processing_duration_seconds',
      help: 'Duration of message processing in seconds',
      labelNames: ['message_type'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    }),

    messagesProcessed: reg.counter({
      name: 'swg_messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['message_type'],
    }),

    messageErrors: reg.counter({
      name: 'swg_message_errors_total',
      help: 'Total number of message processing errors',
      labelNames: ['message_type', 'error_type'],
    }),

    // Zone metrics
    zonePlayerCount: reg.gauge({
      name: 'swg_zone_player_count',
      help: 'Number of players in each zone',
      labelNames: ['zone'],
    }),

    zoneObjectCount: reg.gauge({
      name: 'swg_zone_object_count',
      help: 'Number of objects in each zone',
      labelNames: ['zone'],
    }),

    // Object metrics
    objectsLoaded: reg.gauge({
      name: 'swg_objects_loaded',
      help: 'Number of objects currently loaded in memory',
      labelNames: ['object_type'],
    }),

    objectsCreated: reg.counter({
      name: 'swg_objects_created_total',
      help: 'Total number of objects created',
      labelNames: ['object_type'],
    }),

    objectsDestroyed: reg.counter({
      name: 'swg_objects_destroyed_total',
      help: 'Total number of objects destroyed',
      labelNames: ['object_type'],
    }),

    // Server metrics
    serverUptime: reg.gauge({
      name: 'swg_server_uptime_seconds',
      help: 'Server uptime in seconds',
    }),

    tickDuration: reg.histogram({
      name: 'swg_tick_duration_seconds',
      help: 'Duration of server tick processing in seconds',
      buckets: [0.001, 0.005, 0.01, 0.016, 0.033, 0.05, 0.1, 0.25, 0.5, 1],
    }),

    ticksTotal: reg.counter({
      name: 'swg_ticks_total',
      help: 'Total number of server ticks processed',
    }),
  };
}

// Singleton instance of game metrics
let gameMetricsInstance: GameMetrics | null = null;

/**
 * Get the singleton game metrics instance
 */
export function getGameMetrics(): GameMetrics {
  if (!gameMetricsInstance) {
    gameMetricsInstance = createGameMetrics();
  }
  return gameMetricsInstance;
}

/**
 * Reset game metrics singleton (useful for testing)
 */
export function resetGameMetrics(): void {
  gameMetricsInstance = null;
}

/**
 * Helper to record a message processed
 */
export function recordMessageProcessed(
  metrics: GameMetrics,
  messageType: string,
  durationSeconds: number
): void {
  metrics.messagesProcessed.inc({ message_type: messageType });
  metrics.messageProcessingDuration.observe(durationSeconds, { message_type: messageType });
}

/**
 * Helper to record a message error
 */
export function recordMessageError(
  metrics: GameMetrics,
  messageType: string,
  errorType: string
): void {
  metrics.messageErrors.inc({ message_type: messageType, error_type: errorType });
}

/**
 * Helper to update zone player counts
 */
export function updateZonePlayerCounts(
  metrics: GameMetrics,
  zoneCounts: Record<string, number>
): void {
  for (const [zone, count] of Object.entries(zoneCounts)) {
    metrics.zonePlayerCount.set(count, { zone });
  }
}

/**
 * Helper to track a player login
 */
export function trackPlayerLogin(metrics: GameMetrics): void {
  metrics.playerLogins.inc();
  metrics.playersOnline.inc();
}

/**
 * Helper to track a player logout
 */
export function trackPlayerLogout(metrics: GameMetrics): void {
  metrics.playerLogouts.inc();
  metrics.playersOnline.dec();
}

/**
 * Helper to track packet sent
 */
export function trackPacketSent(
  metrics: GameMetrics,
  packetType: string,
  bytes: number
): void {
  metrics.packetsSent.inc({ packet_type: packetType });
  metrics.bytesSent.add(bytes);
}

/**
 * Helper to track packet received
 */
export function trackPacketReceived(
  metrics: GameMetrics,
  packetType: string,
  bytes: number
): void {
  metrics.packetsReceived.inc({ packet_type: packetType });
  metrics.bytesReceived.add(bytes);
}
