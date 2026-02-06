/**
 * Star Wars Galaxies - Prometheus Exporter
 *
 * Exports metrics in Prometheus text format for scraping.
 */

import {
  MetricRegistry,
  MetricType,
  CollectedMetric,
  MetricLabels,
  HistogramValue,
  LabeledMetricValue,
} from '../metric-types.js';
import { getDefaultRegistry } from '../metric-registry.js';

/**
 * Format labels for Prometheus output
 */
function formatLabels(labels: MetricLabels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return '';
  }

  const formatted = entries
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');

  return `{${formatted}}`;
}

/**
 * Escape label values for Prometheus format
 */
function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Format a single metric value line
 */
function formatMetricLine(
  name: string,
  labels: MetricLabels,
  value: number,
  timestamp?: number
): string {
  const labelStr = formatLabels(labels);
  const valueStr = formatValue(value);
  const timestampStr = timestamp ? ` ${timestamp}` : '';
  return `${name}${labelStr} ${valueStr}${timestampStr}`;
}

/**
 * Format a numeric value (handle Infinity and NaN)
 */
function formatValue(value: number): string {
  if (value === Infinity) return '+Inf';
  if (value === -Infinity) return '-Inf';
  if (Number.isNaN(value)) return 'NaN';
  return value.toString();
}

/**
 * Get Prometheus type string
 */
function getPrometheusType(type: MetricType): string {
  switch (type) {
    case MetricType.COUNTER:
      return 'counter';
    case MetricType.GAUGE:
      return 'gauge';
    case MetricType.HISTOGRAM:
      return 'histogram';
    case MetricType.SUMMARY:
      return 'summary';
    default:
      return 'untyped';
  }
}

/**
 * Format a counter metric
 */
function formatCounter(metric: CollectedMetric, timestamp?: number): string[] {
  const lines: string[] = [];

  lines.push(`# HELP ${metric.name} ${escapeHelp(metric.help)}`);
  lines.push(`# TYPE ${metric.name} ${getPrometheusType(metric.type)}`);

  for (const { labels, value } of metric.values) {
    lines.push(formatMetricLine(metric.name, labels, value as number, timestamp));
  }

  return lines;
}

/**
 * Format a gauge metric
 */
function formatGauge(metric: CollectedMetric, timestamp?: number): string[] {
  const lines: string[] = [];

  lines.push(`# HELP ${metric.name} ${escapeHelp(metric.help)}`);
  lines.push(`# TYPE ${metric.name} ${getPrometheusType(metric.type)}`);

  for (const { labels, value } of metric.values) {
    lines.push(formatMetricLine(metric.name, labels, value as number, timestamp));
  }

  return lines;
}

/**
 * Format a histogram metric
 */
function formatHistogram(metric: CollectedMetric, timestamp?: number): string[] {
  const lines: string[] = [];

  lines.push(`# HELP ${metric.name} ${escapeHelp(metric.help)}`);
  lines.push(`# TYPE ${metric.name} ${getPrometheusType(metric.type)}`);

  for (const labeledValue of metric.values) {
    const { labels } = labeledValue;
    const histValue = labeledValue.value as HistogramValue;

    // Output bucket lines
    for (const bucket of histValue.buckets) {
      const bucketLabels: MetricLabels = {
        ...labels,
        le: formatValue(bucket.le),
      };
      lines.push(
        formatMetricLine(`${metric.name}_bucket`, bucketLabels, bucket.count, timestamp)
      );
    }

    // Output sum
    lines.push(formatMetricLine(`${metric.name}_sum`, labels, histValue.sum, timestamp));

    // Output count
    lines.push(formatMetricLine(`${metric.name}_count`, labels, histValue.count, timestamp));
  }

  return lines;
}

/**
 * Escape help text
 */
function escapeHelp(help: string): string {
  return help.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

/**
 * Format a single metric based on its type
 */
function formatMetric(metric: CollectedMetric, timestamp?: number): string[] {
  switch (metric.type) {
    case MetricType.COUNTER:
      return formatCounter(metric, timestamp);
    case MetricType.GAUGE:
      return formatGauge(metric, timestamp);
    case MetricType.HISTOGRAM:
      return formatHistogram(metric, timestamp);
    default:
      return [];
  }
}

/**
 * Prometheus exporter options
 */
export interface PrometheusExporterOptions {
  /** Include timestamps in output */
  includeTimestamp?: boolean;
  /** Custom prefix for all metric names */
  prefix?: string;
}

/**
 * Prometheus exporter class
 */
export class PrometheusExporter {
  private registry: MetricRegistry;
  private options: PrometheusExporterOptions;

  constructor(registry?: MetricRegistry, options?: PrometheusExporterOptions) {
    this.registry = registry ?? getDefaultRegistry();
    this.options = options ?? {};
  }

  /**
   * Export all metrics as Prometheus text format
   */
  export(): string {
    const collected = this.registry.collect();
    const timestamp = this.options.includeTimestamp ? Date.now() : undefined;
    const lines: string[] = [];

    for (const metric of collected) {
      // Apply prefix if configured
      const metricWithPrefix: CollectedMetric = this.options.prefix
        ? { ...metric, name: `${this.options.prefix}${metric.name}` }
        : metric;

      const metricLines = formatMetric(metricWithPrefix, timestamp);
      lines.push(...metricLines);
      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Get content type for Prometheus
   */
  getContentType(): string {
    return 'text/plain; version=0.0.4; charset=utf-8';
  }

  /**
   * Create an HTTP request handler for /metrics endpoint
   * Compatible with Node.js http.IncomingMessage and http.ServerResponse
   */
  createHandler(): MetricsHandler {
    return (_req, res) => {
      const metrics = this.export();
      res.setHeader('Content-Type', this.getContentType());
      res.end(metrics);
    };
  }
}

/**
 * HTTP request/response types (compatible with Node.js http module)
 */
export interface MetricsRequest {
  url?: string;
  method?: string;
}

export interface MetricsResponse {
  setHeader(name: string, value: string): void;
  end(data?: string): void;
  statusCode?: number;
}

export type MetricsHandler = (req: MetricsRequest, res: MetricsResponse) => void;

/**
 * Create a Prometheus exporter
 */
export function createPrometheusExporter(
  registry?: MetricRegistry,
  options?: PrometheusExporterOptions
): PrometheusExporter {
  return new PrometheusExporter(registry, options);
}

/**
 * Export metrics to Prometheus format string
 */
export function exportMetrics(registry?: MetricRegistry): string {
  const exporter = new PrometheusExporter(registry);
  return exporter.export();
}

/**
 * Create a simple metrics endpoint handler
 */
export function createMetricsEndpoint(
  registry?: MetricRegistry,
  options?: PrometheusExporterOptions
): MetricsHandler {
  const exporter = new PrometheusExporter(registry, options);
  return exporter.createHandler();
}

/**
 * Parse Prometheus text format (useful for testing)
 */
export function parsePrometheusText(text: string): ParsedMetric[] {
  const metrics: ParsedMetric[] = [];
  const lines = text.split('\n');

  let currentName = '';
  let currentHelp = '';
  let currentType = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      // Parse comments
      const helpMatch = trimmed.match(/^# HELP (\S+) (.*)$/);
      if (helpMatch) {
        currentName = helpMatch[1];
        currentHelp = helpMatch[2];
        continue;
      }

      const typeMatch = trimmed.match(/^# TYPE (\S+) (\S+)$/);
      if (typeMatch) {
        currentType = typeMatch[2];
        continue;
      }

      continue;
    }

    // Parse metric line
    const metricMatch = trimmed.match(/^(\S+?)(\{[^}]*\})?\s+(\S+)(\s+\d+)?$/);
    if (metricMatch) {
      const name = metricMatch[1];
      const labelsStr = metricMatch[2] || '';
      const value = parseFloat(metricMatch[3]);

      const labels: MetricLabels = {};
      if (labelsStr) {
        const labelMatches = labelsStr.matchAll(/(\w+)="([^"]*)"/g);
        for (const match of labelMatches) {
          labels[match[1]] = match[2];
        }
      }

      metrics.push({
        name,
        help: name.startsWith(currentName) ? currentHelp : '',
        type: name.startsWith(currentName) ? currentType : '',
        labels,
        value,
      });
    }
  }

  return metrics;
}

/**
 * Parsed metric from Prometheus text
 */
export interface ParsedMetric {
  name: string;
  help: string;
  type: string;
  labels: MetricLabels;
  value: number;
}
