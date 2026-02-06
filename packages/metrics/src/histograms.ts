/**
 * Star Wars Galaxies - Histogram Metrics
 *
 * Histogram implementation for distribution tracking with buckets.
 */

import {
  HistogramMetric,
  HistogramConfig,
  HistogramValue,
  HistogramBucket,
  MetricType,
  MetricLabels,
  DEFAULT_BUCKETS,
} from './metric-types.js';

/**
 * Generate a unique key for a label combination
 */
function labelsToKey(labels?: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return '';
  }
  const sortedKeys = Object.keys(labels).sort();
  return sortedKeys.map((k) => `${k}="${labels[k]}"`).join(',');
}

/**
 * Internal histogram value storage
 */
interface HistogramData {
  sum: number;
  count: number;
  buckets: number[]; // counts for each bucket
  labels: MetricLabels;
  lastUpdatedAt: number;
}

/**
 * Histogram metric implementation
 */
export class Histogram implements HistogramMetric {
  readonly name: string;
  readonly help: string;
  readonly type = MetricType.HISTOGRAM;
  readonly labelNames: readonly string[];
  readonly buckets: readonly number[];

  private values: Map<string, HistogramData> = new Map();

  constructor(config: HistogramConfig) {
    this.name = config.name;
    this.help = config.help;
    this.labelNames = Object.freeze(config.labelNames ?? []);

    // Sort and deduplicate buckets
    const configBuckets = config.buckets ?? [...DEFAULT_BUCKETS];
    const sortedBuckets = [...new Set(configBuckets)].sort((a, b) => a - b);

    // Ensure +Inf bucket exists
    if (sortedBuckets[sortedBuckets.length - 1] !== Infinity) {
      sortedBuckets.push(Infinity);
    }

    this.buckets = Object.freeze(sortedBuckets);
  }

  /**
   * Validate that provided labels match the configured label names
   */
  private validateLabels(labels?: MetricLabels): void {
    const providedKeys = labels ? Object.keys(labels).sort() : [];
    const expectedKeys = [...this.labelNames].sort();

    if (providedKeys.length !== expectedKeys.length) {
      throw new Error(
        `Histogram ${this.name}: expected labels [${expectedKeys.join(', ')}], got [${providedKeys.join(', ')}]`
      );
    }

    for (let i = 0; i < providedKeys.length; i++) {
      if (providedKeys[i] !== expectedKeys[i]) {
        throw new Error(
          `Histogram ${this.name}: expected labels [${expectedKeys.join(', ')}], got [${providedKeys.join(', ')}]`
        );
      }
    }
  }

  /**
   * Get or create histogram data for the given labels
   */
  private getOrCreate(labels?: MetricLabels): HistogramData {
    this.validateLabels(labels);
    const key = labelsToKey(labels);

    let histogramData = this.values.get(key);
    if (!histogramData) {
      histogramData = {
        sum: 0,
        count: 0,
        buckets: new Array(this.buckets.length).fill(0),
        labels: labels ? { ...labels } : {},
        lastUpdatedAt: Date.now(),
      };
      this.values.set(key, histogramData);
    }

    return histogramData;
  }

  /**
   * Record an observation
   */
  observe(value: number, labels?: MetricLabels): void {
    const data = this.getOrCreate(labels);
    data.sum += value;
    data.count += 1;

    // Increment all buckets where value <= bucket boundary
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]!) {
        data.buckets[i]!++;
      }
    }

    data.lastUpdatedAt = Date.now();
  }

  /**
   * Get histogram data
   */
  get(labels?: MetricLabels): HistogramValue {
    this.validateLabels(labels);
    const key = labelsToKey(labels);
    const data = this.values.get(key);

    if (!data) {
      return {
        sum: 0,
        count: 0,
        buckets: this.buckets.map((le) => ({ le, count: 0 })),
      };
    }

    return {
      sum: data.sum,
      count: data.count,
      buckets: this.buckets.map((le, i) => ({ le, count: data.buckets[i] ?? 0 })),
    };
  }

  /**
   * Start a timer, returns function to stop and record duration
   */
  startTimer(labels?: MetricLabels): () => number {
    const startTime = process.hrtime.bigint();
    return () => {
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;
      this.observe(durationSeconds, labels);
      return durationSeconds;
    };
  }

  /**
   * Reset histogram
   */
  reset(labels?: MetricLabels): void {
    if (labels) {
      this.validateLabels(labels);
      const key = labelsToKey(labels);
      const data = this.values.get(key);
      if (data) {
        data.sum = 0;
        data.count = 0;
        data.buckets = new Array(this.buckets.length).fill(0);
        data.lastUpdatedAt = Date.now();
      }
    } else {
      // Reset all label combinations
      for (const data of this.values.values()) {
        data.sum = 0;
        data.count = 0;
        data.buckets = new Array(this.buckets.length).fill(0);
        data.lastUpdatedAt = Date.now();
      }
    }
  }

  /**
   * Get all label combinations and their values
   */
  getAll(): Array<{ labels: MetricLabels; value: HistogramValue }> {
    return Array.from(this.values.values()).map((data) => ({
      labels: { ...data.labels },
      value: {
        sum: data.sum,
        count: data.count,
        buckets: this.buckets.map((le, i) => ({ le, count: data.buckets[i] ?? 0 })),
      },
    }));
  }

  /**
   * Remove a specific label combination
   */
  remove(labels: MetricLabels): boolean {
    this.validateLabels(labels);
    const key = labelsToKey(labels);
    return this.values.delete(key);
  }

  /**
   * Clear all values
   */
  clear(): void {
    this.values.clear();
  }
}

/**
 * Calculate percentile from histogram data
 * Uses linear interpolation within buckets
 */
export function calculatePercentile(histogram: HistogramValue, percentile: number): number {
  if (histogram.count === 0) {
    return 0;
  }

  const target = percentile * histogram.count;
  let previousCount = 0;
  let previousBound = 0;

  for (const bucket of histogram.buckets) {
    if (bucket.count >= target) {
      // Linear interpolation within this bucket
      const bucketWidth = bucket.le - previousBound;
      const bucketCount = bucket.count - previousCount;

      if (bucketCount === 0) {
        return previousBound;
      }

      const ratio = (target - previousCount) / bucketCount;
      return previousBound + ratio * bucketWidth;
    }

    previousCount = bucket.count;
    previousBound = bucket.le === Infinity ? previousBound : bucket.le;
  }

  // Shouldn't reach here if histogram is properly formed
  return histogram.sum / histogram.count;
}

/**
 * Calculate common percentiles (p50, p90, p95, p99)
 */
export function calculateCommonPercentiles(histogram: HistogramValue): {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
} {
  return {
    p50: calculatePercentile(histogram, 0.5),
    p90: calculatePercentile(histogram, 0.9),
    p95: calculatePercentile(histogram, 0.95),
    p99: calculatePercentile(histogram, 0.99),
    mean: histogram.count > 0 ? histogram.sum / histogram.count : 0,
  };
}

/**
 * Helper to time an async function
 */
export async function timeAsync<T>(
  histogram: Histogram,
  fn: () => Promise<T>,
  labels?: MetricLabels
): Promise<T> {
  const stopTimer = histogram.startTimer(labels);
  try {
    return await fn();
  } finally {
    stopTimer();
  }
}

/**
 * Helper to time a sync function
 */
export function timeSync<T>(
  histogram: Histogram,
  fn: () => T,
  labels?: MetricLabels
): T {
  const stopTimer = histogram.startTimer(labels);
  try {
    return fn();
  } finally {
    stopTimer();
  }
}

/**
 * Create a new histogram
 */
export function createHistogram(config: HistogramConfig): Histogram {
  return new Histogram(config);
}

/**
 * Create buckets optimized for HTTP request latency (in seconds)
 */
export function httpLatencyBuckets(): number[] {
  return [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
}

/**
 * Create buckets optimized for database query latency (in seconds)
 */
export function dbLatencyBuckets(): number[] {
  return [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];
}

/**
 * Create buckets for byte sizes
 */
export function byteSizeBuckets(): number[] {
  return [
    100, 1000, 10000, 100000, // 100B, 1KB, 10KB, 100KB
    1000000, 10000000, 100000000, // 1MB, 10MB, 100MB
    1000000000, // 1GB
  ];
}
