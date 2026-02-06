/**
 * Star Wars Galaxies - Gauge Metrics
 *
 * Gauge implementation for values that can go up or down.
 */

import {
  GaugeMetric,
  GaugeConfig,
  MetricType,
  MetricLabels,
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
 * Internal gauge value storage
 */
interface GaugeValue {
  value: number;
  labels: MetricLabels;
  lastUpdatedAt: number;
}

/**
 * Gauge metric implementation
 */
export class Gauge implements GaugeMetric {
  readonly name: string;
  readonly help: string;
  readonly type = MetricType.GAUGE;
  readonly labelNames: readonly string[];

  private values: Map<string, GaugeValue> = new Map();
  private collectCallback?: (() => number) | undefined;

  constructor(config: GaugeConfig) {
    this.name = config.name;
    this.help = config.help;
    this.labelNames = Object.freeze(config.labelNames ?? []);
    this.collectCallback = config.collect;
  }

  /**
   * Validate that provided labels match the configured label names
   */
  private validateLabels(labels?: MetricLabels): void {
    const providedKeys = labels ? Object.keys(labels).sort() : [];
    const expectedKeys = [...this.labelNames].sort();

    if (providedKeys.length !== expectedKeys.length) {
      throw new Error(
        `Gauge ${this.name}: expected labels [${expectedKeys.join(', ')}], got [${providedKeys.join(', ')}]`
      );
    }

    for (let i = 0; i < providedKeys.length; i++) {
      if (providedKeys[i] !== expectedKeys[i]) {
        throw new Error(
          `Gauge ${this.name}: expected labels [${expectedKeys.join(', ')}], got [${providedKeys.join(', ')}]`
        );
      }
    }
  }

  /**
   * Get or create a gauge value for the given labels
   */
  private getOrCreate(labels?: MetricLabels): GaugeValue {
    this.validateLabels(labels);
    const key = labelsToKey(labels);

    let gaugeValue = this.values.get(key);
    if (!gaugeValue) {
      gaugeValue = {
        value: 0,
        labels: labels ? { ...labels } : {},
        lastUpdatedAt: Date.now(),
      };
      this.values.set(key, gaugeValue);
    }

    return gaugeValue;
  }

  /**
   * Set the gauge to an absolute value
   */
  set(value: number, labels?: MetricLabels): void {
    const gaugeValue = this.getOrCreate(labels);
    gaugeValue.value = value;
    gaugeValue.lastUpdatedAt = Date.now();
  }

  /**
   * Increment the gauge by 1
   */
  inc(labels?: MetricLabels): void {
    this.add(1, labels);
  }

  /**
   * Decrement the gauge by 1
   */
  dec(labels?: MetricLabels): void {
    this.sub(1, labels);
  }

  /**
   * Add to the gauge (can be negative)
   */
  add(value: number, labels?: MetricLabels): void {
    const gaugeValue = this.getOrCreate(labels);
    gaugeValue.value += value;
    gaugeValue.lastUpdatedAt = Date.now();
  }

  /**
   * Subtract from the gauge
   */
  sub(value: number, labels?: MetricLabels): void {
    this.add(-value, labels);
  }

  /**
   * Get the current gauge value
   */
  get(labels?: MetricLabels): number {
    // If there's a collect callback and no labels, use it
    if (this.collectCallback && !labels && this.labelNames.length === 0) {
      return this.collectCallback();
    }

    this.validateLabels(labels);
    const key = labelsToKey(labels);
    const gaugeValue = this.values.get(key);
    return gaugeValue?.value ?? 0;
  }

  /**
   * Set gauge to current Unix timestamp in seconds
   */
  setToCurrentTime(labels?: MetricLabels): void {
    this.set(Date.now() / 1000, labels);
  }

  /**
   * Get all label combinations and their values
   */
  getAll(): Array<{ labels: MetricLabels; value: number }> {
    // If there's a collect callback and no labels, return callback value
    if (this.collectCallback && this.labelNames.length === 0) {
      return [{ labels: {}, value: this.collectCallback() }];
    }

    return Array.from(this.values.values()).map((gv) => ({
      labels: { ...gv.labels },
      value: gv.value,
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

  /**
   * Check if this gauge has a collect callback
   */
  hasCollectCallback(): boolean {
    return this.collectCallback !== undefined;
  }
}

/**
 * Create a callback-based gauge that collects values on demand
 */
export function createCallbackGauge(
  name: string,
  help: string,
  collectFn: () => number
): Gauge {
  return new Gauge({
    name,
    help,
    collect: collectFn,
  });
}

/**
 * Create a gauge for tracking memory usage
 */
export function createMemoryGauge(name: string, help: string): Gauge {
  return new Gauge({
    name,
    help,
    collect: () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
      return 0;
    },
  });
}

/**
 * Create a gauge for tracking RSS memory
 */
export function createRssMemoryGauge(name: string, help: string): Gauge {
  return new Gauge({
    name,
    help,
    collect: () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().rss;
      }
      return 0;
    },
  });
}

/**
 * Create a new gauge
 */
export function createGauge(config: GaugeConfig): Gauge {
  return new Gauge(config);
}
