/**
 * Load Testing Utilities
 * Provides tools for spawning multiple mock clients and measuring performance
 */

import { EventEmitter } from 'node:events';
import * as os from 'node:os';
import {
  createMockClient,
  createMockClients,
  connectAll,
  disconnectAll,
  type MockClient,
} from '../mocks/mock-client.js';

/**
 * Load test configuration
 */
export interface LoadTestConfig {
  /** Server address */
  serverAddress: string;
  /** Server port */
  serverPort: number;
  /** Number of concurrent clients */
  concurrentClients: number;
  /** Test duration in milliseconds */
  duration: number;
  /** Ramp-up time in milliseconds (time to spawn all clients) */
  rampUpTime?: number;
  /** Action interval per client in milliseconds */
  actionInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Username prefix for generated accounts */
  usernamePrefix?: string;
  /** Password for generated accounts */
  password?: string;
}

/**
 * Metrics for a single operation
 */
export interface OperationMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Response time statistics
 */
export interface ResponseTimeStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Load test results
 */
export interface LoadTestResults {
  /** Test configuration */
  config: LoadTestConfig;
  /** Test start time */
  startTime: number;
  /** Test end time */
  endTime: number;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Total number of operations */
  totalOperations: number;
  /** Number of successful operations */
  successfulOperations: number;
  /** Number of failed operations */
  failedOperations: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** Response time statistics per operation type */
  responseTimesByOperation: Map<string, ResponseTimeStats>;
  /** Overall response time statistics */
  overallResponseTimes: ResponseTimeStats;
  /** Memory usage over time */
  memorySnapshots: MemorySnapshot[];
  /** Peak memory usage */
  peakMemory: MemorySnapshot;
  /** Error summary */
  errors: Map<string, number>;
  /** Connected clients at end */
  connectedClients: number;
}

/**
 * Calculate response time statistics
 */
function calculateStats(durations: number[]): ResponseTimeStats {
  if (durations.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  const squaredDiffs = sorted.map((d) => Math.pow(d - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    median: sorted[Math.floor(sorted.length / 2)]!,
    p95: sorted[Math.floor(sorted.length * 0.95)]!,
    p99: sorted[Math.floor(sorted.length * 0.99)]!,
    stdDev,
  };
}

/**
 * Load Test Runner
 */
export class LoadTestRunner extends EventEmitter {
  private config: Required<LoadTestConfig>;
  private clients: MockClient[] = [];
  private metrics: OperationMetrics[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private running: boolean = false;
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(config: LoadTestConfig) {
    super();
    this.config = {
      serverAddress: config.serverAddress,
      serverPort: config.serverPort,
      concurrentClients: config.concurrentClients,
      duration: config.duration,
      rampUpTime: config.rampUpTime ?? 5000,
      actionInterval: config.actionInterval ?? 1000,
      debug: config.debug ?? false,
      usernamePrefix: config.usernamePrefix ?? 'loadtest_',
      password: config.password ?? 'loadtest123',
    };
  }

  /**
   * Log message if debug enabled
   */
  private debug(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[LoadTest] ${message}`, ...args);
    }
  }

  /**
   * Record an operation metric
   */
  private recordOperation(
    operation: string,
    startTime: number,
    success: boolean,
    error?: string
  ): void {
    const endTime = Date.now();
    this.metrics.push({
      operation,
      startTime,
      endTime,
      duration: endTime - startTime,
      success,
      error,
    });

    this.emit('operation', {
      operation,
      duration: endTime - startTime,
      success,
      error,
    });
  }

  /**
   * Take a memory snapshot
   */
  private takeMemorySnapshot(): void {
    const mem = process.memoryUsage();
    this.memorySnapshots.push({
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
    });
  }

  /**
   * Run the load test
   */
  async run(): Promise<LoadTestResults> {
    console.log('='.repeat(60));
    console.log('SWG Server Load Test');
    console.log('='.repeat(60));
    console.log(`Target: ${this.config.serverAddress}:${this.config.serverPort}`);
    console.log(`Clients: ${this.config.concurrentClients}`);
    console.log(`Duration: ${this.config.duration}ms`);
    console.log(`Ramp-up: ${this.config.rampUpTime}ms`);
    console.log('='.repeat(60));

    this.running = true;
    this.startTime = Date.now();
    this.metrics = [];
    this.memorySnapshots = [];

    // Start memory monitoring
    const memoryInterval = setInterval(() => {
      this.takeMemorySnapshot();
    }, 1000);

    try {
      // Phase 1: Ramp-up - Connect clients gradually
      console.log('\n[Phase 1] Ramp-up - Connecting clients...');
      await this.rampUpClients();

      // Phase 2: Steady state - Run operations
      console.log('\n[Phase 2] Steady state - Running operations...');
      await this.runSteadyState();

      // Phase 3: Ramp-down - Disconnect clients
      console.log('\n[Phase 3] Ramp-down - Disconnecting clients...');
      await this.rampDownClients();
    } catch (error) {
      console.error('Load test error:', error);
    } finally {
      clearInterval(memoryInterval);
      this.running = false;
      this.endTime = Date.now();
    }

    // Generate results
    const results = this.generateResults();
    this.printResults(results);

    return results;
  }

  /**
   * Gradually connect clients
   */
  private async rampUpClients(): Promise<void> {
    const delayBetweenClients = this.config.rampUpTime / this.config.concurrentClients;

    for (let i = 0; i < this.config.concurrentClients; i++) {
      if (!this.running) break;

      const client = createMockClient({
        serverAddress: this.config.serverAddress,
        serverPort: this.config.serverPort,
        debug: false,
      });

      const startTime = Date.now();
      try {
        await client.connect();
        this.clients.push(client);
        this.recordOperation('connect', startTime, true);
        this.debug(`Client ${i + 1}/${this.config.concurrentClients} connected`);
      } catch (error) {
        this.recordOperation(
          'connect',
          startTime,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
        this.debug(`Client ${i + 1} connection failed:`, error);
      }

      // Delay before next client
      if (i < this.config.concurrentClients - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenClients));
      }
    }

    console.log(`Connected ${this.clients.length}/${this.config.concurrentClients} clients`);
  }

  /**
   * Run steady state operations
   */
  private async runSteadyState(): Promise<void> {
    const endTime = Date.now() + this.config.duration;
    let operationCount = 0;

    // Create operation promises for each client
    const clientOperations = this.clients.map(async (client, index) => {
      while (Date.now() < endTime && this.running) {
        await this.performClientOperation(client, index);
        operationCount++;

        // Wait between operations
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.actionInterval)
        );
      }
    });

    // Progress reporting
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.config.duration - elapsed);
      const successCount = this.metrics.filter((m) => m.success).length;
      const failCount = this.metrics.filter((m) => !m.success).length;

      console.log(
        `Progress: ${Math.round((elapsed / this.config.duration) * 100)}% | ` +
        `Operations: ${this.metrics.length} | ` +
        `Success: ${successCount} | ` +
        `Failed: ${failCount} | ` +
        `Remaining: ${Math.round(remaining / 1000)}s`
      );
    }, 5000);

    await Promise.all(clientOperations);
    clearInterval(progressInterval);

    console.log(`Completed ${operationCount} operations`);
  }

  /**
   * Perform a single operation on a client
   */
  private async performClientOperation(
    client: MockClient,
    clientIndex: number
  ): Promise<void> {
    const operations = ['login', 'enumerate', 'ping'];
    const operation = operations[Math.floor(Math.random() * operations.length)]!;

    const startTime = Date.now();

    try {
      switch (operation) {
        case 'login':
          await client.login(
            `${this.config.usernamePrefix}${clientIndex}`,
            this.config.password
          );
          this.recordOperation('login', startTime, true);
          break;

        case 'enumerate':
          if (client.getState() === 'authenticated') {
            await client.enumerateCharacters();
            this.recordOperation('enumerate', startTime, true);
          }
          break;

        case 'ping':
          await client.sendPing();
          this.recordOperation('ping', startTime, true);
          break;
      }
    } catch (error) {
      this.recordOperation(
        operation,
        startTime,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Disconnect all clients
   */
  private async rampDownClients(): Promise<void> {
    const disconnectPromises = this.clients.map(async (client, index) => {
      const startTime = Date.now();
      try {
        await client.disconnect();
        this.recordOperation('disconnect', startTime, true);
        this.debug(`Client ${index + 1} disconnected`);
      } catch (error) {
        this.recordOperation(
          'disconnect',
          startTime,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });

    await Promise.all(disconnectPromises);
    console.log(`Disconnected ${this.clients.length} clients`);
    this.clients = [];
  }

  /**
   * Generate test results
   */
  private generateResults(): LoadTestResults {
    const totalDuration = this.endTime - this.startTime;
    const successfulOps = this.metrics.filter((m) => m.success);
    const failedOps = this.metrics.filter((m) => !m.success);

    // Group metrics by operation type
    const metricsByOperation = new Map<string, OperationMetrics[]>();
    for (const metric of this.metrics) {
      const existing = metricsByOperation.get(metric.operation) ?? [];
      existing.push(metric);
      metricsByOperation.set(metric.operation, existing);
    }

    // Calculate stats per operation
    const responseTimesByOperation = new Map<string, ResponseTimeStats>();
    for (const [operation, metrics] of metricsByOperation) {
      const durations = metrics.filter((m) => m.success).map((m) => m.duration);
      responseTimesByOperation.set(operation, calculateStats(durations));
    }

    // Overall stats
    const allDurations = successfulOps.map((m) => m.duration);
    const overallResponseTimes = calculateStats(allDurations);

    // Error summary
    const errors = new Map<string, number>();
    for (const metric of failedOps) {
      const errorKey = metric.error ?? 'Unknown error';
      errors.set(errorKey, (errors.get(errorKey) ?? 0) + 1);
    }

    // Peak memory
    const peakMemory = this.memorySnapshots.reduce(
      (peak, snapshot) => (snapshot.heapUsed > peak.heapUsed ? snapshot : peak),
      this.memorySnapshots[0] ?? {
        timestamp: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
      }
    );

    return {
      config: this.config,
      startTime: this.startTime,
      endTime: this.endTime,
      totalDuration,
      totalOperations: this.metrics.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      operationsPerSecond: (this.metrics.length / totalDuration) * 1000,
      responseTimesByOperation,
      overallResponseTimes,
      memorySnapshots: this.memorySnapshots,
      peakMemory,
      errors,
      connectedClients: this.clients.length,
    };
  }

  /**
   * Print test results
   */
  private printResults(results: LoadTestResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(60));

    console.log('\n--- Summary ---');
    console.log(`Total Duration: ${results.totalDuration}ms`);
    console.log(`Total Operations: ${results.totalOperations}`);
    console.log(`Successful: ${results.successfulOperations}`);
    console.log(`Failed: ${results.failedOperations}`);
    console.log(
      `Success Rate: ${(
        (results.successfulOperations / results.totalOperations) *
        100
      ).toFixed(2)}%`
    );
    console.log(`Operations/sec: ${results.operationsPerSecond.toFixed(2)}`);

    console.log('\n--- Response Times (ms) ---');
    console.log('Overall:');
    console.log(`  Min: ${results.overallResponseTimes.min.toFixed(2)}`);
    console.log(`  Max: ${results.overallResponseTimes.max.toFixed(2)}`);
    console.log(`  Mean: ${results.overallResponseTimes.mean.toFixed(2)}`);
    console.log(`  Median: ${results.overallResponseTimes.median.toFixed(2)}`);
    console.log(`  P95: ${results.overallResponseTimes.p95.toFixed(2)}`);
    console.log(`  P99: ${results.overallResponseTimes.p99.toFixed(2)}`);
    console.log(`  StdDev: ${results.overallResponseTimes.stdDev.toFixed(2)}`);

    console.log('\nBy Operation:');
    for (const [operation, stats] of results.responseTimesByOperation) {
      console.log(`  ${operation}:`);
      console.log(`    Mean: ${stats.mean.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms`);
    }

    console.log('\n--- Memory Usage ---');
    console.log(
      `Peak Heap Used: ${(results.peakMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `Peak Heap Total: ${(results.peakMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(`Peak RSS: ${(results.peakMemory.rss / 1024 / 1024).toFixed(2)} MB`);

    if (results.errors.size > 0) {
      console.log('\n--- Errors ---');
      for (const [error, count] of results.errors) {
        console.log(`  ${error}: ${count}`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Stop the test
   */
  stop(): void {
    this.running = false;
  }
}

/**
 * Generate a load test report in JSON format
 */
export function generateReport(results: LoadTestResults): string {
  const report = {
    ...results,
    responseTimesByOperation: Object.fromEntries(results.responseTimesByOperation),
    errors: Object.fromEntries(results.errors),
    systemInfo: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
    },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * CLI entry point for running load tests
 */
async function main(): Promise<void> {
  const config: LoadTestConfig = {
    serverAddress: process.env['SERVER_ADDRESS'] ?? '127.0.0.1',
    serverPort: parseInt(process.env['SERVER_PORT'] ?? '44453', 10),
    concurrentClients: parseInt(process.env['CONCURRENT_CLIENTS'] ?? '10', 10),
    duration: parseInt(process.env['DURATION'] ?? '30000', 10),
    rampUpTime: parseInt(process.env['RAMP_UP_TIME'] ?? '5000', 10),
    actionInterval: parseInt(process.env['ACTION_INTERVAL'] ?? '1000', 10),
    debug: process.env['DEBUG'] === 'true',
    usernamePrefix: process.env['USERNAME_PREFIX'] ?? 'loadtest_',
    password: process.env['PASSWORD'] ?? 'loadtest123',
  };

  console.log('Starting load test with configuration:');
  console.log(JSON.stringify(config, null, 2));

  const runner = new LoadTestRunner(config);

  // Handle termination
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping test...');
    runner.stop();
  });

  try {
    const results = await runner.run();

    // Save report to file
    const reportPath = `load-test-report-${Date.now()}.json`;
    const report = generateReport(results);
    const fs = await import('node:fs/promises');
    await fs.writeFile(reportPath, report);
    console.log(`\nReport saved to: ${reportPath}`);
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);
