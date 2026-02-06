/**
 * Star Wars Galaxies - Metric Registry
 *
 * Central registry for all metrics, providing a singleton pattern
 * for metric management.
 */

import {
  MetricRegistry,
  Metric,
  CollectedMetric,
  CounterConfig,
  GaugeConfig,
  HistogramConfig,
  SummaryConfig,
  MetricType,
  LabeledMetricValue,
} from './metric-types.js';
import { Counter } from './counters.js';
import { Gauge } from './gauges.js';
import { Histogram } from './histograms.js';

/**
 * Validate metric name follows Prometheus conventions
 */
function validateMetricName(name: string): void {
  const validPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
  if (!validPattern.test(name)) {
    throw new Error(
      `Invalid metric name "${name}". Must match pattern [a-zA-Z_:][a-zA-Z0-9_:]*`
    );
  }
}

/**
 * Validate label names follow Prometheus conventions
 */
function validateLabelNames(labelNames: string[]): void {
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const reservedPattern = /^__/;

  for (const name of labelNames) {
    if (!validPattern.test(name)) {
      throw new Error(
        `Invalid label name "${name}". Must match pattern [a-zA-Z_][a-zA-Z0-9_]*`
      );
    }
    if (reservedPattern.test(name)) {
      throw new Error(
        `Invalid label name "${name}". Labels starting with __ are reserved`
      );
    }
  }
}

/**
 * Registry implementation
 */
class Registry implements MetricRegistry {
  private metrics: Map<string, Metric> = new Map();

  /**
   * Create and register a counter
   */
  counter(config: CounterConfig): Counter {
    validateMetricName(config.name);
    if (config.labelNames) {
      validateLabelNames(config.labelNames);
    }

    if (this.metrics.has(config.name)) {
      const existing = this.metrics.get(config.name)!;
      if (existing.type !== MetricType.COUNTER) {
        throw new Error(
          `Metric "${config.name}" already registered as ${existing.type}`
        );
      }
      return existing as Counter;
    }

    const counter = new Counter(config);
    this.metrics.set(config.name, counter);
    return counter;
  }

  /**
   * Create and register a gauge
   */
  gauge(config: GaugeConfig): Gauge {
    validateMetricName(config.name);
    if (config.labelNames) {
      validateLabelNames(config.labelNames);
    }

    if (this.metrics.has(config.name)) {
      const existing = this.metrics.get(config.name)!;
      if (existing.type !== MetricType.GAUGE) {
        throw new Error(
          `Metric "${config.name}" already registered as ${existing.type}`
        );
      }
      return existing as Gauge;
    }

    const gauge = new Gauge(config);
    this.metrics.set(config.name, gauge);
    return gauge;
  }

  /**
   * Create and register a histogram
   */
  histogram(config: HistogramConfig): Histogram {
    validateMetricName(config.name);
    if (config.labelNames) {
      validateLabelNames(config.labelNames);
    }

    if (this.metrics.has(config.name)) {
      const existing = this.metrics.get(config.name)!;
      if (existing.type !== MetricType.HISTOGRAM) {
        throw new Error(
          `Metric "${config.name}" already registered as ${existing.type}`
        );
      }
      return existing as Histogram;
    }

    const histogram = new Histogram(config);
    this.metrics.set(config.name, histogram);
    return histogram;
  }

  /**
   * Create and register a summary (placeholder - summaries are complex)
   */
  summary(_config: SummaryConfig): never {
    // Summary metrics are complex to implement correctly
    // They require streaming quantile calculation with a sliding window
    // For now, we recommend using histograms instead
    throw new Error(
      'Summary metrics are not yet implemented. Use histograms instead.'
    );
  }

  /**
   * Get a metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all registered metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Collect all metrics for export
   */
  collect(): CollectedMetric[] {
    const collected: CollectedMetric[] = [];

    for (const metric of this.metrics.values()) {
      const values: LabeledMetricValue[] = [];

      if (metric.type === MetricType.COUNTER) {
        const counter = metric as Counter;
        for (const { labels, value } of counter.getAll()) {
          values.push({ labels, value });
        }
      } else if (metric.type === MetricType.GAUGE) {
        const gauge = metric as Gauge;
        for (const { labels, value } of gauge.getAll()) {
          values.push({ labels, value });
        }
      } else if (metric.type === MetricType.HISTOGRAM) {
        const histogram = metric as Histogram;
        for (const { labels, value } of histogram.getAll()) {
          values.push({ labels, value });
        }
      }

      // Only include metrics that have values
      if (values.length > 0 || this.hasCollectCallback(metric)) {
        collected.push({
          name: metric.name,
          help: metric.help,
          type: metric.type,
          values,
        });
      }
    }

    return collected;
  }

  /**
   * Check if a metric has a collect callback
   */
  private hasCollectCallback(metric: Metric): boolean {
    if (metric.type === MetricType.GAUGE) {
      return (metric as Gauge).hasCollectCallback();
    }
    return false;
  }

  /**
   * Remove a metric by name
   */
  remove(name: string): boolean {
    return this.metrics.delete(name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Reset all metrics to initial state
   */
  resetAll(): void {
    for (const metric of this.metrics.values()) {
      if (metric.type === MetricType.COUNTER) {
        (metric as Counter).reset();
      } else if (metric.type === MetricType.GAUGE) {
        // Don't reset callback-based gauges
        const gauge = metric as Gauge;
        if (!gauge.hasCollectCallback()) {
          gauge.clear();
        }
      } else if (metric.type === MetricType.HISTOGRAM) {
        (metric as Histogram).reset();
      }
    }
  }
}

// Singleton instance
let defaultRegistry: Registry | null = null;

/**
 * Get the default metric registry (singleton)
 */
export function getDefaultRegistry(): MetricRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new Registry();
  }
  return defaultRegistry;
}

/**
 * Create a new isolated registry (useful for testing)
 */
export function createRegistry(): MetricRegistry {
  return new Registry();
}

/**
 * Reset the default registry (useful for testing)
 */
export function resetDefaultRegistry(): void {
  if (defaultRegistry) {
    defaultRegistry.clear();
  }
  defaultRegistry = null;
}

// Re-export the Registry class for typing purposes
export { Registry };
