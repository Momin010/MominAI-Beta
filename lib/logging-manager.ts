export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  operation?: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
  duration?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
  averageDuration?: number;
}

export class LoggingManager {
  private static instance: LoggingManager;
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs
  private logCallbacks: ((entry: LogEntry) => void)[] = [];
  private sessionId: string;
  private userId: string | null = null;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  // Set user ID for logging
  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Log a message
  log(
    level: LogLevel,
    category: string,
    message: string,
    options: {
      operation?: string;
      data?: Record<string, any>;
      stackTrace?: string;
      duration?: number;
    } = {}
  ): string {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      operation: options.operation,
      message,
      data: options.data,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      stackTrace: options.stackTrace,
      duration: options.duration
    };

    // Add to logs array
    this.logs.unshift(entry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging for development
    const consoleMethod = level === 'error' || level === 'critical' ? 'error' :
                         level === 'warn' ? 'warn' :
                         level === 'info' ? 'info' : 'debug';

    console[consoleMethod](`[${level.toUpperCase()}] ${category}: ${message}`, {
      operation: options.operation,
      data: options.data,
      duration: options.duration
    });

    // Notify callbacks
    this.logCallbacks.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Log callback error:', error);
      }
    });

    return entry.id;
  }

  // Convenience methods for different log levels
  debug(category: string, message: string, options?: Parameters<LoggingManager['log']>[3]): string {
    return this.log('debug', category, message, options);
  }

  info(category: string, message: string, options?: Parameters<LoggingManager['log']>[3]): string {
    return this.log('info', category, message, options);
  }

  warn(category: string, message: string, options?: Parameters<LoggingManager['log']>[3]): string {
    return this.log('warn', category, message, options);
  }

  error(category: string, message: string, options?: Parameters<LoggingManager['log']>[3]): string {
    return this.log('error', category, message, options);
  }

  critical(category: string, message: string, options?: Parameters<LoggingManager['log']>[3]): string {
    return this.log('critical', category, message, options);
  }

  // Log operation start
  startOperation(operation: string, category: string, data?: Record<string, any>): string {
    return this.info(category, `Starting operation: ${operation}`, {
      operation,
      data: { ...data, event: 'start' }
    });
  }

  // Log operation end
  endOperation(operationId: string, operation: string, category: string, success: boolean, data?: Record<string, any>): void {
    const level = success ? 'info' : 'error';
    const status = success ? 'completed' : 'failed';

    this.log(level, category, `Operation ${status}: ${operation}`, {
      operation,
      data: { ...data, event: 'end', success, operationId }
    });
  }

  // Log with timing
  async timeOperation<T>(
    operation: string,
    category: string,
    fn: () => Promise<T>,
    data?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const logId = this.startOperation(operation, category, data);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.endOperation(logId, operation, category, true, {
        ...data,
        duration
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.endOperation(logId, operation, category, false, {
        ...data,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  // Get logs with filtering
  getLogs(options: {
    level?: LogLevel;
    category?: string;
    operation?: string;
    since?: Date;
    until?: Date;
    limit?: number;
  } = {}): LogEntry[] {
    let filtered = [...this.logs];

    if (options.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }

    if (options.category) {
      filtered = filtered.filter(log => log.category === options.category);
    }

    if (options.operation) {
      filtered = filtered.filter(log => log.operation === options.operation);
    }

    if (options.since) {
      filtered = filtered.filter(log => log.timestamp >= options.since!);
    }

    if (options.until) {
      filtered = filtered.filter(log => log.timestamp <= options.until!);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  // Get log statistics
  getStats(options: {
    since?: Date;
    until?: Date;
  } = {}): LogStats {
    const logs = this.getLogs(options);
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0
    };

    const byCategory: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    logs.forEach(log => {
      byLevel[log.level]++;

      if (!byCategory[log.category]) {
        byCategory[log.category] = 0;
      }
      byCategory[log.category]++;

      if (log.duration !== undefined) {
        totalDuration += log.duration;
        durationCount++;
      }
    });

    const timestamps = logs.map(log => log.timestamp.getTime());
    const start = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
    const end = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

    return {
      total: logs.length,
      byLevel,
      byCategory,
      timeRange: { start, end },
      averageDuration: durationCount > 0 ? totalDuration / durationCount : undefined
    };
  }

  // Export logs
  exportLogs(options: {
    format?: 'json' | 'csv' | 'txt';
    level?: LogLevel;
    category?: string;
    since?: Date;
    until?: Date;
  } = {}): string {
    const logs = this.getLogs(options);

    switch (options.format) {
      case 'csv':
        return this.exportAsCSV(logs);
      case 'txt':
        return this.exportAsText(logs);
      case 'json':
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  private exportAsCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'category', 'operation', 'message', 'duration', 'userId', 'sessionId'];
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.operation || '',
      log.message.replace(/"/g, '""'), // Escape quotes
      log.duration?.toString() || '',
      log.userId || '',
      log.sessionId || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private exportAsText(logs: LogEntry[]): string {
    return logs.map(log =>
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} ${log.category}: ${log.message}${
        log.operation ? ` (operation: ${log.operation})` : ''
      }${log.duration ? ` [${log.duration}ms]` : ''}`
    ).join('\n');
  }

  // Clear logs
  clearLogs(options: {
    level?: LogLevel;
    category?: string;
    before?: Date;
  } = {}): number {
    let removedCount = 0;

    if (options.level || options.category || options.before) {
      this.logs = this.logs.filter(log => {
        if (options.level && log.level === options.level) {
          removedCount++;
          return false;
        }
        if (options.category && log.category === options.category) {
          removedCount++;
          return false;
        }
        if (options.before && log.timestamp < options.before) {
          removedCount++;
          return false;
        }
        return true;
      });
    } else {
      removedCount = this.logs.length;
      this.logs = [];
    }

    return removedCount;
  }

  // Subscribe to log events
  onLog(callback: (entry: LogEntry) => void): () => void {
    this.logCallbacks.push(callback);

    return () => {
      const index = this.logCallbacks.indexOf(callback);
      if (index !== -1) {
        this.logCallbacks.splice(index, 1);
      }
    };
  }

  // Get session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      logCount: this.logs.length,
      startTime: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : new Date()
    };
  }
}

// Convenience functions
export const loggingManager = LoggingManager.getInstance();

export const logDebug = (category: string, message: string, options?: Parameters<LoggingManager['log']>[3]) =>
  loggingManager.debug(category, message, options);

export const logInfo = (category: string, message: string, options?: Parameters<LoggingManager['log']>[3]) =>
  loggingManager.info(category, message, options);

export const logWarn = (category: string, message: string, options?: Parameters<LoggingManager['log']>[3]) =>
  loggingManager.warn(category, message, options);

export const logError = (category: string, message: string, options?: Parameters<LoggingManager['log']>[3]) =>
  loggingManager.error(category, message, options);

export const logCritical = (category: string, message: string, options?: Parameters<LoggingManager['log']>[3]) =>
  loggingManager.critical(category, message, options);

export const timeOperation = <T>(
  operation: string,
  category: string,
  fn: () => Promise<T>,
  data?: Record<string, any>
) => loggingManager.timeOperation(operation, category, fn, data);