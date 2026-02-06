/**
 * Star Wars Galaxies - Metrics Package
 *
 * Lightweight metrics and monitoring system for game server.
 *
 * @example
 * ```typescript
 * import { getDefaultRegistry, createPrometheusExporter } from '@swg/metrics';
 *
 * // Create metrics
 * const registry = getDefaultRegistry();
 * const requestCounter = registry.counter({
 *   name: 'http_requests_total',
 *   help: 'Total HTTP requests',
 *   labelNames: ['method', 'path'],
 * });
 *
 * // Use metrics
 * requestCounter.inc({ method: 'GET', path: '/api/players' });
 *
 * // Export metrics
 * const exporter = createPrometheusExporter();
 * const metricsText = exporter.export();
 * ```
 */

// Types
export {
  MetricType,
  MetricLabels,
  LabelPair,
  BaseMetric,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  HistogramBucket,
  HistogramValue,
  SummaryMetric,
  SummaryQuantile,
  SummaryValue,
  Metric,
  LabeledMetricValue,
  CollectedMetric,
  CounterConfig,
  GaugeConfig,
  HistogramConfig,
  SummaryConfig,
  MetricRegistry,
  DEFAULT_BUCKETS,
  DEFAULT_QUANTILES,
  linearBuckets,
  exponentialBuckets,
} from './metric-types.js';

// Registry
export {
  getDefaultRegistry,
  createRegistry,
  resetDefaultRegistry,
  Registry,
} from './metric-registry.js';

// Counter
export {
  Counter,
  CounterRateCalculator,
  createCounter,
} from './counters.js';

// Gauge
export {
  Gauge,
  createGauge,
  createCallbackGauge,
  createMemoryGauge,
  createRssMemoryGauge,
} from './gauges.js';

// Histogram
export {
  Histogram,
  createHistogram,
  calculatePercentile,
  calculateCommonPercentiles,
  timeAsync,
  timeSync,
  httpLatencyBuckets,
  dbLatencyBuckets,
  byteSizeBuckets,
} from './histograms.js';

// Game metrics collector
export {
  GameMetrics,
  createGameMetrics,
  getGameMetrics,
  resetGameMetrics,
  recordMessageProcessed,
  recordMessageError,
  updateZonePlayerCounts,
  trackPlayerLogin,
  trackPlayerLogout,
  trackPacketSent,
  trackPacketReceived,
} from './collectors/game-metrics.js';

// Database metrics collector
export {
  DatabaseMetrics,
  QueryType,
  QueryResult,
  QueryContext,
  TransactionContext,
  PoolStats,
  createDatabaseMetrics,
  getDatabaseMetrics,
  resetDatabaseMetrics,
  detectQueryType,
  extractTableName,
  QueryTracker,
  createQueryTracker,
} from './collectors/db-metrics.js';

// Prometheus exporter
export {
  PrometheusExporter,
  PrometheusExporterOptions,
  MetricsRequest,
  MetricsResponse,
  MetricsHandler,
  ParsedMetric,
  createPrometheusExporter,
  exportMetrics,
  createMetricsEndpoint,
  parsePrometheusText,
} from './exporters/prometheus.js';
