/**
 * Command Logger
 * Audit logging for GM commands with database persistence and
 * in-memory buffering for performance
 */

import type { ObjectId } from '@swg/shared-types';
import { type CommandLogEntry, AdminLevel, getAdminLevelName } from './command-types.js';

/**
 * Data for logging a command execution
 */
export interface CommandLogData {
  /** Executor object ID */
  executorId: ObjectId;
  /** Executor character name */
  executorName: string;
  /** Admin level at time of execution */
  adminLevel: AdminLevel;
  /** Command name */
  command: string;
  /** Command arguments */
  args: string[];
  /** Target object ID (if applicable) */
  targetId?: ObjectId | undefined;
  /** Whether command succeeded */
  success: boolean;
  /** Result message */
  resultMessage: string;
  /** Zone where command was executed */
  zoneId?: string | undefined;
}

/**
 * Log persistence provider interface
 * Implement this to store logs in a database
 */
export interface LogPersistenceProvider {
  /** Save a log entry to persistent storage */
  saveLog(entry: CommandLogEntry): Promise<void>;
  /** Query logs with optional filters */
  queryLogs(
    filters: LogQueryFilters,
    limit: number,
    offset: number
  ): Promise<CommandLogEntry[]>;
  /** Get log count matching filters */
  getLogCount(filters: LogQueryFilters): Promise<number>;
}

/**
 * Filters for querying logs
 */
export interface LogQueryFilters {
  /** Filter by executor */
  executorId?: ObjectId;
  /** Filter by executor name (partial match) */
  executorName?: string;
  /** Filter by command name */
  command?: string;
  /** Filter by minimum admin level */
  minAdminLevel?: AdminLevel;
  /** Filter by success/failure */
  success?: boolean;
  /** Filter by zone */
  zoneId?: string;
  /** Filter by date range start */
  startDate?: Date;
  /** Filter by date range end */
  endDate?: Date;
}

/**
 * Options for the command logger
 */
export interface CommandLoggerOptions {
  /** Persistence provider for database storage */
  persistenceProvider?: LogPersistenceProvider;
  /** Maximum in-memory log entries (default: 1000) */
  maxMemoryEntries?: number;
  /** Flush buffer interval in milliseconds (default: 30000) */
  flushInterval?: number;
  /** Enable console logging of commands (default: true) */
  consoleLogging?: boolean;
  /** Log level threshold for console (default: CSR) */
  consoleLogLevel?: AdminLevel;
}

/**
 * ID generator for log entries
 */
let logIdCounter = 0n;
function generateLogId(): bigint {
  return BigInt(Date.now()) * 1000000n + logIdCounter++;
}

/**
 * Command Logger
 * Provides audit logging for all GM command executions
 */
export class CommandLogger {
  private readonly memoryBuffer: CommandLogEntry[];
  private readonly maxMemoryEntries: number;
  private readonly persistenceProvider?: LogPersistenceProvider | undefined;
  private readonly consoleLogging: boolean;
  private readonly consoleLogLevel: AdminLevel;
  private flushTimer?: ReturnType<typeof setInterval> | undefined;
  private pendingFlush: CommandLogEntry[];
  private flushing: boolean;

  constructor(options: CommandLoggerOptions = {}) {
    this.memoryBuffer = [];
    this.pendingFlush = [];
    this.flushing = false;
    this.maxMemoryEntries = options.maxMemoryEntries ?? 1000;
    this.persistenceProvider = options.persistenceProvider;
    this.consoleLogging = options.consoleLogging ?? true;
    this.consoleLogLevel = options.consoleLogLevel ?? AdminLevel.CSR;

    // Start periodic flush if persistence is enabled
    if (this.persistenceProvider && options.flushInterval !== 0) {
      const interval = options.flushInterval ?? 30000;
      this.flushTimer = setInterval(() => {
        this.flushToDatabase().catch((err) =>
          console.error('[CommandLogger] Flush error:', err)
        );
      }, interval);
    }
  }

  /**
   * Log a command execution
   */
  async logCommand(data: CommandLogData): Promise<CommandLogEntry> {
    const entry: CommandLogEntry = {
      id: generateLogId(),
      timestamp: new Date(),
      executorId: data.executorId,
      executorName: data.executorName,
      adminLevel: data.adminLevel,
      command: data.command,
      args: [...data.args],
      targetId: data.targetId,
      success: data.success,
      resultMessage: data.resultMessage,
      zoneId: data.zoneId,
    };

    // Add to memory buffer
    this.memoryBuffer.push(entry);

    // Trim buffer if too large
    while (this.memoryBuffer.length > this.maxMemoryEntries) {
      this.memoryBuffer.shift();
    }

    // Add to pending flush queue
    if (this.persistenceProvider) {
      this.pendingFlush.push(entry);
    }

    // Console logging
    if (this.consoleLogging && data.adminLevel >= this.consoleLogLevel) {
      this.logToConsole(entry);
    }

    return entry;
  }

  /**
   * Log entry to console
   */
  private logToConsole(entry: CommandLogEntry): void {
    const status = entry.success ? 'OK' : 'FAIL';
    const target = entry.targetId ? ` -> ${entry.targetId}` : '';
    const args = entry.args.length > 0 ? ` ${entry.args.join(' ')}` : '';

    console.log(
      `[GM] [${getAdminLevelName(entry.adminLevel)}] ` +
        `${entry.executorName} (${entry.executorId}): ` +
        `/${entry.command}${args}${target} [${status}]`
    );
  }

  /**
   * Flush pending logs to database
   */
  async flushToDatabase(): Promise<number> {
    if (!this.persistenceProvider || this.pendingFlush.length === 0 || this.flushing) {
      return 0;
    }

    this.flushing = true;
    const toFlush = [...this.pendingFlush];
    this.pendingFlush = [];

    let flushed = 0;
    try {
      for (const entry of toFlush) {
        await this.persistenceProvider.saveLog(entry);
        flushed++;
      }
    } catch (error) {
      // Re-queue failed entries
      this.pendingFlush.unshift(...toFlush.slice(flushed));
      console.error(
        `[CommandLogger] Failed to flush ${toFlush.length - flushed} entries:`,
        error
      );
    } finally {
      this.flushing = false;
    }

    return flushed;
  }

  /**
   * Query logs from memory buffer
   */
  queryMemoryLogs(
    filters: LogQueryFilters,
    limit: number = 100,
    offset: number = 0
  ): CommandLogEntry[] {
    let results = this.memoryBuffer.filter((entry) => this.matchesFilters(entry, filters));

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  /**
   * Query logs from database (if persistence is enabled)
   */
  async queryDatabaseLogs(
    filters: LogQueryFilters,
    limit: number = 100,
    offset: number = 0
  ): Promise<CommandLogEntry[]> {
    if (!this.persistenceProvider) {
      return this.queryMemoryLogs(filters, limit, offset);
    }

    return this.persistenceProvider.queryLogs(filters, limit, offset);
  }

  /**
   * Get recent logs for a specific executor
   */
  getExecutorLogs(executorId: ObjectId, limit: number = 50): CommandLogEntry[] {
    return this.queryMemoryLogs({ executorId }, limit);
  }

  /**
   * Get recent logs for a specific command
   */
  getCommandLogs(command: string, limit: number = 50): CommandLogEntry[] {
    return this.queryMemoryLogs({ command }, limit);
  }

  /**
   * Get failed command attempts
   */
  getFailedCommands(limit: number = 50): CommandLogEntry[] {
    return this.queryMemoryLogs({ success: false }, limit);
  }

  /**
   * Get logs for a specific zone
   */
  getZoneLogs(zoneId: string, limit: number = 50): CommandLogEntry[] {
    return this.queryMemoryLogs({ zoneId }, limit);
  }

  /**
   * Check if a log entry matches the given filters
   */
  private matchesFilters(entry: CommandLogEntry, filters: LogQueryFilters): boolean {
    if (filters.executorId !== undefined && entry.executorId !== filters.executorId) {
      return false;
    }

    if (
      filters.executorName !== undefined &&
      !entry.executorName.toLowerCase().includes(filters.executorName.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.command !== undefined &&
      entry.command.toLowerCase() !== filters.command.toLowerCase()
    ) {
      return false;
    }

    if (filters.minAdminLevel !== undefined && entry.adminLevel < filters.minAdminLevel) {
      return false;
    }

    if (filters.success !== undefined && entry.success !== filters.success) {
      return false;
    }

    if (filters.zoneId !== undefined && entry.zoneId !== filters.zoneId) {
      return false;
    }

    if (filters.startDate !== undefined && entry.timestamp < filters.startDate) {
      return false;
    }

    if (filters.endDate !== undefined && entry.timestamp > filters.endDate) {
      return false;
    }

    return true;
  }

  /**
   * Generate a summary report of command usage
   */
  generateUsageReport(since?: Date): {
    totalCommands: number;
    successRate: number;
    byCommand: Map<string, { count: number; failures: number }>;
    byExecutor: Map<string, { count: number; failures: number }>;
    byLevel: Map<AdminLevel, number>;
  } {
    const sinceTime = since?.getTime() ?? 0;
    const relevantLogs = this.memoryBuffer.filter(
      (e) => e.timestamp.getTime() >= sinceTime
    );

    const byCommand = new Map<string, { count: number; failures: number }>();
    const byExecutor = new Map<string, { count: number; failures: number }>();
    const byLevel = new Map<AdminLevel, number>();

    let totalCommands = 0;
    let failures = 0;

    for (const entry of relevantLogs) {
      totalCommands++;
      if (!entry.success) {
        failures++;
      }

      // By command
      const cmdStats = byCommand.get(entry.command) ?? { count: 0, failures: 0 };
      cmdStats.count++;
      if (!entry.success) {
        cmdStats.failures++;
      }
      byCommand.set(entry.command, cmdStats);

      // By executor
      const execStats = byExecutor.get(entry.executorName) ?? {
        count: 0,
        failures: 0,
      };
      execStats.count++;
      if (!entry.success) {
        execStats.failures++;
      }
      byExecutor.set(entry.executorName, execStats);

      // By level
      const levelCount = byLevel.get(entry.adminLevel) ?? 0;
      byLevel.set(entry.adminLevel, levelCount + 1);
    }

    return {
      totalCommands,
      successRate: totalCommands > 0 ? (totalCommands - failures) / totalCommands : 1,
      byCommand,
      byExecutor,
      byLevel,
    };
  }

  /**
   * Clear the memory buffer
   */
  clearMemoryBuffer(): void {
    this.memoryBuffer.length = 0;
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.memoryBuffer.length;
  }

  /**
   * Get pending flush count
   */
  getPendingFlushCount(): number {
    return this.pendingFlush.length;
  }

  /**
   * Shutdown the logger
   */
  async shutdown(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Final flush
    await this.flushToDatabase();
  }
}

/**
 * Create a new CommandLogger instance
 */
export function createCommandLogger(options?: CommandLoggerOptions): CommandLogger {
  return new CommandLogger(options);
}
