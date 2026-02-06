/**
 * Star Wars Galaxies - Database Metrics
 *
 * Pre-defined metrics for database monitoring.
 */

import { MetricRegistry, CounterMetric, GaugeMetric, HistogramMetric } from '../metric-types.js';
import { getDefaultRegistry } from '../metric-registry.js';
import { dbLatencyBuckets } from '../histograms.js';

/**
 * Query type labels
 */
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'transaction' | 'other';

/**
 * Database metrics collection
 */
export interface DatabaseMetrics {
  // Query metrics
  queryDuration: HistogramMetric;
  queriesTotal: CounterMetric;
  queryErrors: CounterMetric;
  queryRowsAffected: CounterMetric;
  queryRowsReturned: CounterMetric;

  // Connection pool metrics
  connectionPoolSize: GaugeMetric;
  connectionPoolActive: GaugeMetric;
  connectionPoolIdle: GaugeMetric;
  connectionPoolWaiting: GaugeMetric;

  // Connection lifecycle
  connectionCreated: CounterMetric;
  connectionClosed: CounterMetric;
  connectionErrors: CounterMetric;
  connectionTimeouts: CounterMetric;

  // Transaction metrics
  transactionDuration: HistogramMetric;
  transactionsTotal: CounterMetric;
  transactionCommits: CounterMetric;
  transactionRollbacks: CounterMetric;
}

/**
 * Create database metrics and register them with the given registry
 */
export function createDatabaseMetrics(registry?: MetricRegistry): DatabaseMetrics {
  const reg = registry ?? getDefaultRegistry();

  return {
    // Query metrics
    queryDuration: reg.histogram({
      name: 'swg_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: dbLatencyBuckets(),
    }),

    queriesTotal: reg.counter({
      name: 'swg_db_queries_total',
      help: 'Total number of database queries executed',
      labelNames: ['query_type', 'table'],
    }),

    queryErrors: reg.counter({
      name: 'swg_db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['query_type', 'error_type'],
    }),

    queryRowsAffected: reg.counter({
      name: 'swg_db_rows_affected_total',
      help: 'Total number of rows affected by queries',
      labelNames: ['query_type'],
    }),

    queryRowsReturned: reg.counter({
      name: 'swg_db_rows_returned_total',
      help: 'Total number of rows returned by queries',
    }),

    // Connection pool metrics
    connectionPoolSize: reg.gauge({
      name: 'swg_db_connection_pool_size',
      help: 'Total size of the connection pool',
    }),

    connectionPoolActive: reg.gauge({
      name: 'swg_db_connection_pool_active',
      help: 'Number of active connections in the pool',
    }),

    connectionPoolIdle: reg.gauge({
      name: 'swg_db_connection_pool_idle',
      help: 'Number of idle connections in the pool',
    }),

    connectionPoolWaiting: reg.gauge({
      name: 'swg_db_connection_pool_waiting',
      help: 'Number of clients waiting for a connection',
    }),

    // Connection lifecycle
    connectionCreated: reg.counter({
      name: 'swg_db_connections_created_total',
      help: 'Total number of database connections created',
    }),

    connectionClosed: reg.counter({
      name: 'swg_db_connections_closed_total',
      help: 'Total number of database connections closed',
    }),

    connectionErrors: reg.counter({
      name: 'swg_db_connection_errors_total',
      help: 'Total number of database connection errors',
      labelNames: ['error_type'],
    }),

    connectionTimeouts: reg.counter({
      name: 'swg_db_connection_timeouts_total',
      help: 'Total number of connection pool timeouts',
    }),

    // Transaction metrics
    transactionDuration: reg.histogram({
      name: 'swg_db_transaction_duration_seconds',
      help: 'Duration of database transactions in seconds',
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),

    transactionsTotal: reg.counter({
      name: 'swg_db_transactions_total',
      help: 'Total number of database transactions',
    }),

    transactionCommits: reg.counter({
      name: 'swg_db_transaction_commits_total',
      help: 'Total number of committed transactions',
    }),

    transactionRollbacks: reg.counter({
      name: 'swg_db_transaction_rollbacks_total',
      help: 'Total number of rolled back transactions',
    }),
  };
}

// Singleton instance of database metrics
let dbMetricsInstance: DatabaseMetrics | null = null;

/**
 * Get the singleton database metrics instance
 */
export function getDatabaseMetrics(): DatabaseMetrics {
  if (!dbMetricsInstance) {
    dbMetricsInstance = createDatabaseMetrics();
  }
  return dbMetricsInstance;
}

/**
 * Reset database metrics singleton (useful for testing)
 */
export function resetDatabaseMetrics(): void {
  dbMetricsInstance = null;
}

/**
 * Determine query type from SQL string
 */
export function detectQueryType(sql: string): QueryType {
  const trimmed = sql.trim().toLowerCase();

  if (trimmed.startsWith('select')) return 'select';
  if (trimmed.startsWith('insert')) return 'insert';
  if (trimmed.startsWith('update')) return 'update';
  if (trimmed.startsWith('delete')) return 'delete';
  if (trimmed.startsWith('begin') || trimmed.startsWith('start transaction')) {
    return 'transaction';
  }

  return 'other';
}

/**
 * Extract table name from SQL (simplified extraction)
 */
export function extractTableName(sql: string): string {
  const trimmed = sql.trim().toLowerCase();

  // SELECT ... FROM table
  const fromMatch = trimmed.match(/from\s+["'`]?(\w+)["'`]?/);
  if (fromMatch?.[1]) return fromMatch[1];

  // INSERT INTO table
  const insertMatch = trimmed.match(/insert\s+into\s+["'`]?(\w+)["'`]?/);
  if (insertMatch?.[1]) return insertMatch[1];

  // UPDATE table
  const updateMatch = trimmed.match(/update\s+["'`]?(\w+)["'`]?/);
  if (updateMatch?.[1]) return updateMatch[1];

  // DELETE FROM table
  const deleteMatch = trimmed.match(/delete\s+from\s+["'`]?(\w+)["'`]?/);
  if (deleteMatch?.[1]) return deleteMatch[1];

  return 'unknown';
}

/**
 * Query tracker for timing database queries
 */
export class QueryTracker {
  private metrics: DatabaseMetrics;

  constructor(metrics?: DatabaseMetrics) {
    this.metrics = metrics ?? getDatabaseMetrics();
  }

  /**
   * Start tracking a query
   */
  startQuery(sql: string): QueryContext {
    const queryType = detectQueryType(sql);
    const table = extractTableName(sql);
    const stopTimer = this.metrics.queryDuration.startTimer({
      query_type: queryType,
      table,
    });

    return {
      queryType,
      table,
      stopTimer,
      complete: (result?: QueryResult) => this.completeQuery(queryType, table, stopTimer, result),
      error: (errorType: string) => this.queryError(queryType, table, stopTimer, errorType),
    };
  }

  /**
   * Complete a query successfully
   */
  private completeQuery(
    queryType: QueryType,
    table: string,
    stopTimer: () => number,
    result?: QueryResult
  ): number {
    const duration = stopTimer();
    this.metrics.queriesTotal.inc({ query_type: queryType, table });

    if (result) {
      if (result.rowsAffected !== undefined) {
        this.metrics.queryRowsAffected.add(result.rowsAffected, { query_type: queryType });
      }
      if (result.rowsReturned !== undefined) {
        this.metrics.queryRowsReturned.add(result.rowsReturned);
      }
    }

    return duration;
  }

  /**
   * Record a query error
   */
  private queryError(
    queryType: QueryType,
    _table: string,
    stopTimer: () => number,
    errorType: string
  ): number {
    const duration = stopTimer();
    this.metrics.queryErrors.inc({ query_type: queryType, error_type: errorType });
    return duration;
  }

  /**
   * Start tracking a transaction
   */
  startTransaction(): TransactionContext {
    const stopTimer = this.metrics.transactionDuration.startTimer();
    this.metrics.transactionsTotal.inc();

    return {
      stopTimer,
      commit: () => {
        const duration = stopTimer();
        this.metrics.transactionCommits.inc();
        return duration;
      },
      rollback: () => {
        const duration = stopTimer();
        this.metrics.transactionRollbacks.inc();
        return duration;
      },
    };
  }

  /**
   * Update connection pool metrics
   */
  updatePoolMetrics(stats: PoolStats): void {
    this.metrics.connectionPoolSize.set(stats.size);
    this.metrics.connectionPoolActive.set(stats.active);
    this.metrics.connectionPoolIdle.set(stats.idle);
    this.metrics.connectionPoolWaiting.set(stats.waiting);
  }
}

/**
 * Query result for tracking
 */
export interface QueryResult {
  rowsAffected?: number;
  rowsReturned?: number;
}

/**
 * Context for a tracked query
 */
export interface QueryContext {
  queryType: QueryType;
  table: string;
  stopTimer: () => number;
  complete: (result?: QueryResult) => number;
  error: (errorType: string) => number;
}

/**
 * Context for a tracked transaction
 */
export interface TransactionContext {
  stopTimer: () => number;
  commit: () => number;
  rollback: () => number;
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  size: number;
  active: number;
  idle: number;
  waiting: number;
}

/**
 * Create a query tracker instance
 */
export function createQueryTracker(metrics?: DatabaseMetrics): QueryTracker {
  return new QueryTracker(metrics);
}
