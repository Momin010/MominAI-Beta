import { BatchProgress, BatchResult } from './batch-manager';

export interface OperationProgress {
  operationId: string;
  operationType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  recoverable?: boolean;
}

export interface OverallProgress {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  cancelledOperations: number;
  runningOperations: number;
  pendingOperations: number;
  overallProgress: number; // 0-100
  estimatedTimeRemaining?: number;
  currentOperation?: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
}

export class ProgressManager {
  private static instance: ProgressManager;
  private operations: Map<string, OperationProgress> = new Map();
  private progressCallbacks: ((progress: OverallProgress) => void)[] = [];
  private operationCallbacks: ((operation: OperationProgress) => void)[] = [];
  private startTime: Date | null = null;

  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
    }
    return ProgressManager.instance;
  }

  // Track a new operation
  trackOperation(operationId: string, operationType: string, message: string = ''): void {
    const operation: OperationProgress = {
      operationId,
      operationType,
      status: 'pending',
      progress: 0,
      message: message || `Starting ${operationType} operation`,
      startTime: new Date()
    };

    this.operations.set(operationId, operation);
    this.notifyOperationUpdate(operation);
    this.notifyProgressUpdate();
  }

  // Update operation progress
  updateOperationProgress(
    operationId: string,
    progress: number,
    message?: string,
    status?: OperationProgress['status']
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.progress = Math.max(0, Math.min(100, progress));
    if (message) operation.message = message;
    if (status) operation.status = status;

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      operation.endTime = new Date();
      operation.duration = operation.endTime.getTime() - operation.startTime.getTime();
    }

    this.notifyOperationUpdate(operation);
    this.notifyProgressUpdate();
  }

  // Mark operation as running
  startOperation(operationId: string, message?: string): void {
    this.updateOperationProgress(operationId, 10, message || 'Operation started', 'running');
  }

  // Mark operation as completed
  completeOperation(operationId: string, message?: string): void {
    this.updateOperationProgress(operationId, 100, message || 'Operation completed successfully', 'completed');
  }

  // Mark operation as failed
  failOperation(operationId: string, error: string, recoverable: boolean = false): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.error = error;
    operation.recoverable = recoverable;
    this.updateOperationProgress(operationId, 0, `Operation failed: ${error}`, 'failed');
  }

  // Cancel operation
  cancelOperation(operationId: string): void {
    this.updateOperationProgress(operationId, 0, 'Operation cancelled', 'cancelled');
  }

  // Handle batch progress updates
  handleBatchProgress(progress: BatchProgress): void {
    if (progress.currentOperation) {
      // Update current operation progress
      const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
      this.updateOperationProgress(
        progress.currentOperation,
        progressPercent,
        `Processing batch: ${progress.completed}/${progress.total} completed`
      );
    }

    this.notifyProgressUpdate();
  }

  // Handle batch result
  handleBatchResult(result: BatchResult): void {
    if (result.success) {
      this.completeOperation(result.operationId, 'Batch operation completed');
    } else {
      this.failOperation(result.operationId, result.error || 'Batch operation failed', result.recoverable);
    }
  }

  // Get overall progress
  getOverallProgress(): OverallProgress {
    const operations = Array.from(this.operations.values());
    const total = operations.length;
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const cancelled = operations.filter(op => op.status === 'cancelled').length;
    const running = operations.filter(op => op.status === 'running').length;
    const pending = operations.filter(op => op.status === 'pending').length;

    let status: OverallProgress['status'] = 'idle';
    if (running > 0) status = 'running';
    else if (total > 0 && completed === total) status = 'completed';
    else if (failed > 0) status = 'failed';
    else if (cancelled > 0) status = 'cancelled';

    const overallProgress = total > 0 ? ((completed + failed + cancelled) / total) * 100 : 0;

    // Estimate time remaining
    let estimatedTimeRemaining: number | undefined;
    if (running > 0 && this.startTime) {
      const elapsed = Date.now() - this.startTime.getTime();
      const completedOps = completed + failed + cancelled;
      if (completedOps > 0) {
        const avgTimePerOp = elapsed / completedOps;
        const remainingOps = total - completedOps;
        estimatedTimeRemaining = avgTimePerOp * remainingOps;
      }
    }

    const currentOperation = operations.find(op => op.status === 'running')?.message;

    return {
      totalOperations: total,
      completedOperations: completed,
      failedOperations: failed,
      cancelledOperations: cancelled,
      runningOperations: running,
      pendingOperations: pending,
      overallProgress,
      estimatedTimeRemaining,
      currentOperation,
      status
    };
  }

  // Get operation details
  getOperation(operationId: string): OperationProgress | undefined {
    return this.operations.get(operationId);
  }

  // Get all operations
  getAllOperations(): OperationProgress[] {
    return Array.from(this.operations.values());
  }

  // Clear completed operations (keep failed and cancelled for history)
  clearCompletedOperations(): void {
    const idsToDelete: string[] = [];
    this.operations.forEach((operation, id) => {
      if (operation.status === 'completed') {
        idsToDelete.push(id);
      }
    });
    idsToDelete.forEach(id => this.operations.delete(id));
    this.notifyProgressUpdate();
  }

  // Clear all operations
  clearAllOperations(): void {
    this.operations.clear();
    this.startTime = null;
    this.notifyProgressUpdate();
  }

  // Event listeners
  onProgressUpdate(callback: (progress: OverallProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  onOperationUpdate(callback: (operation: OperationProgress) => void): void {
    this.operationCallbacks.push(callback);
  }

  private notifyProgressUpdate(): void {
    const progress = this.getOverallProgress();
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private notifyOperationUpdate(operation: OperationProgress): void {
    this.operationCallbacks.forEach(callback => callback(operation));
  }

  // Initialize tracking session
  startTracking(): void {
    this.startTime = new Date();
  }

  // Cleanup
  clearCallbacks(): void {
    this.progressCallbacks = [];
    this.operationCallbacks = [];
  }
}

// Convenience functions
export const progressManager = ProgressManager.getInstance();

export const trackOperation = (operationId: string, operationType: string, message?: string): void => {
  progressManager.trackOperation(operationId, operationType, message);
};

export const updateOperationProgress = (
  operationId: string,
  progress: number,
  message?: string,
  status?: OperationProgress['status']
): void => {
  progressManager.updateOperationProgress(operationId, progress, message, status);
};

export const completeOperation = (operationId: string, message?: string): void => {
  progressManager.completeOperation(operationId, message);
};

export const failOperation = (operationId: string, error: string, recoverable?: boolean): void => {
  progressManager.failOperation(operationId, error, recoverable);
};

export const cancelOperation = (operationId: string): void => {
  progressManager.cancelOperation(operationId);
};

export const getOverallProgress = (): OverallProgress => {
  return progressManager.getOverallProgress();
};

export const getOperation = (operationId: string): OperationProgress | undefined => {
  return progressManager.getOperation(operationId);
};