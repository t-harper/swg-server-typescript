/**
 * Star Wars Galaxies - Counter Metrics
 *
 * Counter implementation for monotonically increasing values.
 */

import {
  CounterMetric,
  CounterConfig,
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
 * Internal counter value storage
 */
interface CounterValue {
  value: number;
  labels: MetricLabels;
  createdAt: number;
  lastUpdatedAt: number;
}

/**
 * Counter metric implementation
 */
export class Counter implements CounterMetric {
  readonly name: string;
  readonly help: string;
  readonly type = MetricType.COUNTER;
  readonly labelNames: readonly string[];

  private values: Map<string, CounterValue> = new Map();

  constructor(config: CounterConfig) {
    this.name = config.name;
    this.help = config.help;
    this.labelNames = Object.freeze(config.labelNames ?? []);
  }

  /**
   * Validate that provided labels match the configured label names
   */
  private validateLabels(labels?: MetricLabels): void {
    const providedKeys = labels ? Object.keys(labels).sort() : [];
    const expectedKeys = [...this.labelNames].sort();

    if (providedKeys.length !== expectedKeys.length) {
      throw new Error(
        `Counter ${this.name}: expected labels [${expectedKeys.join(', ')}], got [${providedKeys.join(', ')}]`
      );
    }

    for (let i = 0; i < providedKeys.length; i++) {
      if (providedKeys[i] !== expectedKeys[i]) {
        throw new Error(
          `Counter ${this.name}: expected labels [${expectedKeys.join(', ')}], got [${providedKeys.join(', ')}]`
        );
      }
    }
  }

  /**
   * Get or create a counter value for the given labels
   */
  private getOrCreate(labels?: MetricLabels): CounterValue {
    this.validateLabels(labels);
    const key = labelsToKey(labels);

    let counterValue = this.values.get(key);
    if (!counterValue) {
      const now = Date.now();
      counterValue = {
        value: 0,
        labels: labels ? { ...labels } : {},
        createdAt: now,
        lastUpdatedAt: now,
      };
      this.values.set(key, counterValue);
    }

    return counterValue;
  }

  /**
   * Increment the counter by 1
   */
  inc(labels?: MetricLabels): void {
    this.add(1, labels);
  }

  /**
   * Increment the counter by a specific value (must be positive)
   */
  add(value: number, labels?: MetricLabels): void {
    if (value < 0) {
      throw new Error(`Counter ${this.name}: cannot decrease counter value (received ${value})`);
    }

    const counterValue = this.getOrCreate(labels);
    counterValue.value += value;
    counterValue.lastUpdatedAt = Date.now();
  }

  /**
   * Get the current counter value
   */
  get(labels?: MetricLabels): number {
    this.validateLabels(labels);
    const key = labelsToKey(labels);
    const counterValue = this.values.get(key);
    return counterValue?.value ?? 0;
  }

  /**
   * Reset the counter to 0
   */
  reset(labels?: MetricLabels): void {
    if (labels) {
      this.validateLabels(labels);
      const key = labelsToKey(labels);
      const counterValue = this.values.get(key);
      if (counterValue) {
        counterValue.value = 0;
        counterValue.lastUpdatedAt = Date.now();
      }
    } else {
      // Reset all label combinations
      for (const counterValue of this.values.values()) {
        counterValue.value = 0;
        counterValue.lastUpdatedAt = Date.now();
      }
    }
  }

  /**
   * Get all label combinations and their values
   */
  getAll(): Array<{ labels: MetricLabels; value: number }> {
    return Array.from(this.values.values()).map((cv) => ({
      labels: { ...cv.labels },
      value: cv.value,
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
 * Helper class for calculating counter rates
 */
export class CounterRateCalculator {
  private previousValues: Map<string, { value: number; timestamp: number }> = new Map();

  /**
   * Calculate the rate of increase per second for a counter
   */
  calculateRate(counter: Counter, labels?: MetricLabels): number {
    const currentValue = counter.get(labels);
    const currentTimestamp = Date.now();
    const key = `${counter.name}:${labelsToKey(labels)}`;

    const previous = this.previousValues.get(key);

    // Store current value for next calculation
    this.previousValues.set(key, { value: currentValue, timestamp: currentTimestamp });

    if (!previous) {
      // First observation, can't calculate rate yet
      return 0;
    }

    const timeDeltaSeconds = (currentTimestamp - previous.timestamp) / 1000;
    if (timeDeltaSeconds <= 0) {
      return 0;
    }

    const valueDelta = currentValue - previous.value;
    return valueDelta / timeDeltaSeconds;
  }

  /**
   * Reset stored values
   */
  reset(): void {
    this.previousValues.clear();
  }
}

/**
 * Create a new counter
 */
export function createCounter(config: CounterConfig): Counter {
  return new Counter(config);
}
