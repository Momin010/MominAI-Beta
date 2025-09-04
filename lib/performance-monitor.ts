import { loggingManager } from './logging-manager';

export interface PerformanceMetric {
  id: string;
  name: string;
  category: 'operation' | 'network' | 'memory' | 'render' | 'system';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  value?: number;
  unit?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PerformanceStats {
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  totalCount: number;
  successRate: number;
  throughput: number; // operations per second
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_operation' | 'high_memory' | 'low_throughput' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  recommendations?: string[];
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetrics = 5000;
  private thresholds = {
    slowOperation: 5000, // 5 seconds
    highMemoryUsage: 100 * 1024 * 1024, // 100MB
    lowThroughput: 1, // operations per second
    highErrorRate: 0.1 // 10%
  };

  private performanceCallbacks: ((metric: PerformanceMetric) => void)[] = [];
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTiming(
    name: string,
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>,
    tags?: string[]
  ): string {
    const metricId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetric = {
      id: metricId,
      name,
      category,
      startTime: new Date(),
      metadata,
      tags
    };

    this.metrics.unshift(metric);

    // Maintain max metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    loggingManager.debug('performance', `Started timing: ${name}`, {
      operation: name,
      data: { metricId, category, metadata, tags }
    });

    return metricId;
  }

  // End timing an operation
  endTiming(metricId: string, additionalMetadata?: Record<string, any>): void {
    const metric = this.metrics.find(m => m.id === metricId);
    if (!metric) return;

    metric.endTime = new Date();
    metric.duration = metric.endTime.getTime() - metric.startTime.getTime();

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metric);

    // Notify callbacks
    this.performanceCallbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Performance callback error:', error);
      }
    });

    loggingManager.debug('performance', `Ended timing: ${metric.name}`, {
      operation: metric.name,
      data: {
        metricId,
        duration: metric.duration,
        category: metric.category,
        metadata: metric.metadata
      }
    });
  }

  // Record a metric value
  recordMetric(
    name: string,
    category: PerformanceMetric['category'],
    value: number,
    unit: string,
    metadata?: Record<string, any>,
    tags?: string[]
  ): void {
    const metricId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetric = {
      id: metricId,
      name,
      category,
      startTime: new Date(),
      value,
      unit,
      metadata,
      tags
    };

    this.metrics.unshift(metric);

    // Maintain max metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metric);

    // Notify callbacks
    this.performanceCallbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Performance callback error:', error);
      }
    });

    loggingManager.debug('performance', `Recorded metric: ${name}`, {
      operation: name,
      data: { metricId, value, unit, category, metadata, tags }
    });
  }

  // Time a function execution
  async timeFunction<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
    tags?: string[]
  ): Promise<T> {
    const metricId = this.startTiming(name, category, metadata, tags);

    try {
      const result = await fn();
      this.endTiming(metricId, { success: true });
      return result;
    } catch (error) {
      this.endTiming(metricId, { success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Get performance statistics
  getStats(
    name?: string,
    category?: PerformanceMetric['category'],
    since?: Date
  ): PerformanceStats {
    let filteredMetrics = this.metrics.filter(m => m.duration !== undefined);

    if (name) {
      filteredMetrics = filteredMetrics.filter(m => m.name === name);
    }

    if (category) {
      filteredMetrics = filteredMetrics.filter(m => m.category === category);
    }

    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.startTime >= since);
    }

    if (filteredMetrics.length === 0) {
      return {
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        totalCount: 0,
        successRate: 0,
        throughput: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration!);
    const sortedDurations = durations.sort((a, b) => a - b);

    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = sortedDurations[0];
    const maxDuration = sortedDurations[sortedDurations.length - 1];
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p95Duration = sortedDurations[p95Index];

    const successfulOperations = filteredMetrics.filter(m =>
      m.metadata?.success !== false
    ).length;
    const successRate = successfulOperations / filteredMetrics.length;

    // Calculate throughput (operations per second)
    const timeSpan = since ?
      (new Date().getTime() - since.getTime()) / 1000 :
      (filteredMetrics[0].startTime.getTime() - filteredMetrics[filteredMetrics.length - 1].startTime.getTime()) / 1000;

    const throughput = timeSpan > 0 ? filteredMetrics.length / timeSpan : 0;

    return {
      averageDuration,
      minDuration,
      maxDuration,
      p95Duration,
      totalCount: filteredMetrics.length,
      successRate,
      throughput
    };
  }

  // Check performance thresholds and create alerts
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const alerts: PerformanceAlert[] = [];

    // Check operation duration
    if (metric.category === 'operation' && metric.duration && metric.duration > this.thresholds.slowOperation) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'slow_operation',
        severity: metric.duration > this.thresholds.slowOperation * 2 ? 'high' : 'medium',
        message: `Slow operation detected: ${metric.name} took ${metric.duration}ms`,
        metric: metric.name,
        threshold: this.thresholds.slowOperation,
        currentValue: metric.duration,
        timestamp: new Date(),
        recommendations: [
          'Consider optimizing the operation',
          'Check for blocking I/O operations',
          'Review database queries if applicable',
          'Consider caching frequently accessed data'
        ]
      });
    }

    // Check memory usage
    if (metric.category === 'memory' && metric.value && metric.value > this.thresholds.highMemoryUsage) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'high_memory',
        severity: 'high',
        message: `High memory usage detected: ${metric.value} bytes`,
        metric: metric.name,
        threshold: this.thresholds.highMemoryUsage,
        currentValue: metric.value,
        timestamp: new Date(),
        recommendations: [
          'Check for memory leaks',
          'Optimize data structures',
          'Implement pagination for large datasets',
          'Consider using streaming for large files'
        ]
      });
    }

    // Check throughput
    if (metric.category === 'operation' && metric.metadata?.throughput !== undefined) {
      const throughput = metric.metadata.throughput;
      if (throughput < this.thresholds.lowThroughput) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'low_throughput',
          severity: 'medium',
          message: `Low throughput detected: ${throughput} ops/sec`,
          metric: metric.name,
          threshold: this.thresholds.lowThroughput,
          currentValue: throughput,
          timestamp: new Date(),
          recommendations: [
            'Check for bottlenecks in the system',
            'Optimize concurrent operations',
            'Review network latency',
            'Consider load balancing'
          ]
        });
      }
    }

    // Add alerts to the list
    alerts.forEach(alert => {
      this.alerts.unshift(alert);

      // Keep only recent alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(0, 100);
      }

      // Notify alert callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Alert callback error:', error);
        }
      });

      // Log the alert
      loggingManager.warn('performance', alert.message, {
        operation: alert.metric,
        data: {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          threshold: alert.threshold,
          currentValue: alert.currentValue,
          recommendations: alert.recommendations
        }
      });
    });
  }

  // Get memory usage
  getMemoryUsage(): { used: number; total: number; percentage: number } {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  // Monitor memory usage
  startMemoryMonitoring(intervalMs: number = 30000): () => void {
    const intervalId = setInterval(() => {
      const memory = this.getMemoryUsage();
      this.recordMetric(
        'memory_usage',
        'memory',
        memory.used,
        'bytes',
        {
          total: memory.total,
          percentage: memory.percentage
        },
        ['system', 'memory']
      );
    }, intervalMs);

    return () => clearInterval(intervalId);
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts.slice(0, limit);
  }

  // Clear old metrics
  clearOldMetrics(olderThan: Date): number {
    const initialLength = this.metrics.length;
    this.metrics = this.metrics.filter(metric => metric.startTime >= olderThan);
    return initialLength - this.metrics.length;
  }

  // Export performance data
  exportMetrics(options: {
    format?: 'json' | 'csv';
    since?: Date;
    category?: PerformanceMetric['category'];
  } = {}): string {
    let filteredMetrics = [...this.metrics];

    if (options.since) {
      filteredMetrics = filteredMetrics.filter(m => m.startTime >= options.since!);
    }

    if (options.category) {
      filteredMetrics = filteredMetrics.filter(m => m.category === options.category);
    }

    switch (options.format) {
      case 'csv':
        return this.exportAsCSV(filteredMetrics);
      case 'json':
      default:
        return JSON.stringify(filteredMetrics, null, 2);
    }
  }

  private exportAsCSV(metrics: PerformanceMetric[]): string {
    const headers = ['timestamp', 'name', 'category', 'duration', 'value', 'unit', 'tags'];
    const rows = metrics.map(metric => [
      metric.startTime.toISOString(),
      metric.name,
      metric.category,
      metric.duration?.toString() || '',
      metric.value?.toString() || '',
      metric.unit || '',
      metric.tags?.join(';') || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  // Event listeners
  onPerformanceUpdate(callback: (metric: PerformanceMetric) => void): () => void {
    this.performanceCallbacks.push(callback);
    return () => {
      const index = this.performanceCallbacks.indexOf(callback);
      if (index !== -1) {
        this.performanceCallbacks.splice(index, 1);
      }
    };
  }

  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index !== -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }
}

// Convenience functions
export const performanceMonitor = PerformanceMonitor.getInstance();

export const startTiming = (
  name: string,
  category: PerformanceMetric['category'],
  metadata?: Record<string, any>,
  tags?: string[]
) => performanceMonitor.startTiming(name, category, metadata, tags);

export const endTiming = (metricId: string, additionalMetadata?: Record<string, any>) =>
  performanceMonitor.endTiming(metricId, additionalMetadata);

export const recordMetric = (
  name: string,
  category: PerformanceMetric['category'],
  value: number,
  unit: string,
  metadata?: Record<string, any>,
  tags?: string[]
) => performanceMonitor.recordMetric(name, category, value, unit, metadata, tags);

export const timeFunction = <T>(
  name: string,
  category: PerformanceMetric['category'],
  fn: () => Promise<T>,
  metadata?: Record<string, any>,
  tags?: string[]
) => performanceMonitor.timeFunction(name, category, fn, metadata, tags);

export const getPerformanceStats = (
  name?: string,
  category?: PerformanceMetric['category'],
  since?: Date
) => performanceMonitor.getStats(name, category, since);