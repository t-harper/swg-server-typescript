/**
 * Star Wars Galaxies - Metrics Types
 *
 * Core type definitions for the metrics and monitoring system.
 */

/**
 * Supported metric types
 */
export enum MetricType {
  /** Monotonically increasing value (e.g., total requests) */
  COUNTER = 'counter',
  /** Value that can go up or down (e.g., current connections) */
  GAUGE = 'gauge',
  /** Distribution of values in buckets (e.g., request latency) */
  HISTOGRAM = 'histogram',
  /** Streaming quantiles over a sliding window */
  SUMMARY = 'summary',
}

/**
 * Labels attached to metrics for dimensional data
 */
export type MetricLabels = Record<string, string>;

/**
 * Label name/value pair
 */
export interface LabelPair {
  name: string;
  value: string;
}

/**
 * Base metric interface shared by all metric types
 */
export interface BaseMetric {
  /** Metric name (should follow prometheus naming conventions) */
  readonly name: string;
  /** Human-readable description */
  readonly help: string;
  /** Type of metric */
  readonly type: MetricType;
  /** Label names defined for this metric */
  readonly labelNames: readonly string[];
}

/**
 * Counter metric - monotonically increasing value
 */
export interface CounterMetric extends BaseMetric {
  readonly type: MetricType.COUNTER;

  /** Increment the counter by 1 */
  inc(labels?: MetricLabels): void;

  /** Increment the counter by a specific amount (must be positive) */
  add(value: number, labels?: MetricLabels): void;

  /** Get current value for given labels */
  get(labels?: MetricLabels): number;

  /** Reset counter to 0 */
  reset(labels?: MetricLabels): void;
}

/**
 * Gauge metric - value that can increase or decrease
 */
export interface GaugeMetric extends BaseMetric {
  readonly type: MetricType.GAUGE;

  /** Set the gauge to an absolute value */
  set(value: number, labels?: MetricLabels): void;

  /** Increment the gauge by 1 */
  inc(labels?: MetricLabels): void;

  /** Decrement the gauge by 1 */
  dec(labels?: MetricLabels): void;

  /** Add to the gauge (can be negative) */
  add(value: number, labels?: MetricLabels): void;

  /** Subtract from the gauge */
  sub(value: number, labels?: MetricLabels): void;

  /** Get current value */
  get(labels?: MetricLabels): number;

  /** Set gauge to current Unix timestamp in seconds */
  setToCurrentTime(labels?: MetricLabels): void;
}

/**
 * Histogram bucket definition
 */
export interface HistogramBucket {
  /** Upper bound of the bucket (inclusive) */
  le: number;
  /** Count of observations in this bucket */
  count: number;
}

/**
 * Histogram observation result
 */
export interface HistogramValue {
  /** Sum of all observed values */
  sum: number;
  /** Total count of observations */
  count: number;
  /** Bucket counts */
  buckets: HistogramBucket[];
}

/**
 * Histogram metric - distribution of values
 */
export interface HistogramMetric extends BaseMetric {
  readonly type: MetricType.HISTOGRAM;

  /** Configured bucket boundaries */
  readonly buckets: readonly number[];

  /** Record an observation */
  observe(value: number, labels?: MetricLabels): void;

  /** Get histogram data */
  get(labels?: MetricLabels): HistogramValue;

  /** Start a timer, returns function to stop and record duration */
  startTimer(labels?: MetricLabels): () => number;

  /** Reset histogram */
  reset(labels?: MetricLabels): void;
}

/**
 * Summary quantile definition
 */
export interface SummaryQuantile {
  /** Quantile (0-1) */
  quantile: number;
  /** Value at this quantile */
  value: number;
}

/**
 * Summary value
 */
export interface SummaryValue {
  /** Sum of all observed values */
  sum: number;
  /** Total count of observations */
  count: number;
  /** Calculated quantiles */
  quantiles: SummaryQuantile[];
}

/**
 * Summary metric - streaming quantiles
 */
export interface SummaryMetric extends BaseMetric {
  readonly type: MetricType.SUMMARY;

  /** Configured quantiles to calculate */
  readonly quantiles: readonly number[];

  /** Record an observation */
  observe(value: number, labels?: MetricLabels): void;

  /** Get summary data */
  get(labels?: MetricLabels): SummaryValue;

  /** Start a timer, returns function to stop and record duration */
  startTimer(labels?: MetricLabels): () => number;

  /** Reset summary */
  reset(labels?: MetricLabels): void;
}

/**
 * Union type for all metrics
 */
export type Metric = CounterMetric | GaugeMetric | HistogramMetric | SummaryMetric;

/**
 * Metric value with labels for serialization
 */
export interface LabeledMetricValue {
  labels: MetricLabels;
  value: number | HistogramValue | SummaryValue;
}

/**
 * Collected metric data for export
 */
export interface CollectedMetric {
  name: string;
  help: string;
  type: MetricType;
  values: LabeledMetricValue[];
}

/**
 * Configuration for creating a counter
 */
export interface CounterConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

/**
 * Configuration for creating a gauge
 */
export interface GaugeConfig {
  name: string;
  help: string;
  labelNames?: string[];
  /** Optional callback to collect gauge value on demand */
  collect?: () => number;
}

/**
 * Configuration for creating a histogram
 */
export interface HistogramConfig {
  name: string;
  help: string;
  labelNames?: string[];
  /** Bucket upper bounds, defaults to exponential buckets */
  buckets?: number[];
}

/**
 * Configuration for creating a summary
 */
export interface SummaryConfig {
  name: string;
  help: string;
  labelNames?: string[];
  /** Quantiles to calculate, defaults to [0.5, 0.9, 0.99] */
  quantiles?: number[];
  /** Max age of observations in milliseconds */
  maxAgeMs?: number;
  /** Number of buckets for sliding window */
  ageBuckets?: number;
}

/**
 * Metric registry interface
 */
export interface MetricRegistry {
  /** Create and register a counter */
  counter(config: CounterConfig): CounterMetric;

  /** Create and register a gauge */
  gauge(config: GaugeConfig): GaugeMetric;

  /** Create and register a histogram */
  histogram(config: HistogramConfig): HistogramMetric;

  /** Create and register a summary */
  summary(config: SummaryConfig): SummaryMetric;

  /** Get a metric by name */
  getMetric(name: string): Metric | undefined;

  /** Get all registered metrics */
  getMetrics(): Metric[];

  /** Collect all metrics for export */
  collect(): CollectedMetric[];

  /** Remove a metric by name */
  remove(name: string): boolean;

  /** Clear all metrics */
  clear(): void;

  /** Reset all metrics to initial state */
  resetAll(): void;
}

/**
 * Default histogram buckets (exponential from 0.005 to 10 seconds)
 */
export const DEFAULT_BUCKETS: readonly number[] = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
] as const;

/**
 * Default summary quantiles
 */
export const DEFAULT_QUANTILES: readonly number[] = [0.5, 0.9, 0.99] as const;

/**
 * Generate linear buckets
 */
export function linearBuckets(start: number, width: number, count: number): number[] {
  const buckets: number[] = [];
  for (let i = 0; i < count; i++) {
    buckets.push(start + i * width);
  }
  return buckets;
}

/**
 * Generate exponential buckets
 */
export function exponentialBuckets(start: number, factor: number, count: number): number[] {
  const buckets: number[] = [];
  let current = start;
  for (let i = 0; i < count; i++) {
    buckets.push(current);
    current *= factor;
  }
  return buckets;
}
