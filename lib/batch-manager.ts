import { handleError, getUserFriendlyMessage } from './error-handler';
import { progressManager } from './progress-manager';

export interface BatchOperation {
  id: string;
  type: 'read' | 'write' | 'create' | 'delete' | 'list';
  path: string;
  content?: string;
  priority: 'low' | 'normal' | 'high';
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

export interface BatchResult {
  operationId: string;
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  recoverable?: boolean;
  duration: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentOperation?: string;
  estimatedTimeRemaining?: number;
}

export class BatchManager {
  private static instance: BatchManager;
  private operationQueue: BatchOperation[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private processingDelay = 100; // ms between batches
  private maxConcurrentBatches = 3;
  private activeBatches = 0;

  private progressCallbacks: ((progress: BatchProgress) => void)[] = [];
  private resultCallbacks: ((result: BatchResult) => void)[] = [];

  static getInstance(): BatchManager {
    if (!BatchManager.instance) {
      BatchManager.instance = new BatchManager();
    }
    return BatchManager.instance;
  }

  // Add operation to queue
  addOperation(operation: Omit<BatchOperation, 'id' | 'timestamp' | 'retries' | 'maxRetries'>): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: BatchOperation = {
      ...operation,
      id: operationId,
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3
    };

    this.operationQueue.push(fullOperation);
    this.sortQueueByPriority();

    // Track operation in progress manager
    progressManager.trackOperation(operationId, operation.type, `Queued ${operation.type} operation for ${operation.path}`);

    this.processQueue();

    return operationId;
  }

  // Add multiple operations at once
  addOperations(operations: Omit<BatchOperation, 'id' | 'timestamp' | 'retries' | 'maxRetries'>[]): string[] {
    const operationIds: string[] = [];

    for (const operation of operations) {
      const operationId = this.addOperation(operation);
      operationIds.push(operationId);
    }

    return operationIds;
  }

  // Process the operation queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0 || this.activeBatches >= this.maxConcurrentBatches) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.operationQueue.length > 0 && this.activeBatches < this.maxConcurrentBatches) {
        const batch = this.getNextBatch();
        if (batch.length > 0) {
          this.activeBatches++;
          this.processBatch(batch).finally(() => {
            this.activeBatches--;
            this.processQueue();
          });
        }

        // Small delay between batches to prevent overwhelming the system
        if (this.operationQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Get next batch of operations
  private getNextBatch(): BatchOperation[] {
    const batch: BatchOperation[] = [];
    const highPriority = this.operationQueue.filter(op => op.priority === 'high').slice(0, this.batchSize);
    const normalPriority = this.operationQueue.filter(op => op.priority === 'normal').slice(0, this.batchSize - highPriority.length);
    const lowPriority = this.operationQueue.filter(op => op.priority === 'low').slice(0, this.batchSize - highPriority.length - normalPriority.length);

    batch.push(...highPriority, ...normalPriority, ...lowPriority);

    // Remove from queue
    this.operationQueue = this.operationQueue.filter(op => !batch.includes(op));

    return batch;
  }

  // Process a batch of operations
  private async processBatch(batch: BatchOperation[]): Promise<void> {
    const startTime = Date.now();

    // Start tracking batch operations
    batch.forEach(operation => {
      progressManager.startOperation(operation.id, `Processing ${operation.type} operation`);
    });

    const progress: BatchProgress = {
      total: batch.length,
      completed: 0,
      failed: 0,
      currentOperation: batch[0]?.path
    };

    this.notifyProgress(progress);

    try {
      // Send batch to API
      const response = await fetch('/api/filesystem/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operations: batch }),
      });

      if (!response.ok) {
        throw new Error(`Batch API error: ${response.status}`);
      }

      const results = await response.json();

      // Process results
      for (const result of results) {
        const operation = batch.find(op => op.id === result.operationId);
        if (operation) {
          progress.completed++;
          progress.currentOperation = operation.path;

          if (result.success) {
            progressManager.completeOperation(result.operationId, 'Operation completed successfully');
            this.notifyResult({
              operationId: result.operationId,
              success: true,
              data: result.data,
              duration: Date.now() - startTime
            });
          } else {
            progress.failed++;
            progressManager.failOperation(result.operationId, result.error || 'Operation failed', result.recoverable);
            this.handleFailedOperation(operation, result);
          }
        }
      }

      this.notifyProgress(progress);

    } catch (error) {
      // Handle batch failure - retry individual operations
      for (const operation of batch) {
        progress.failed++;
        this.handleFailedOperation(operation, {
          error: error instanceof Error ? error.message : 'Batch processing failed',
          code: 'BATCH_ERROR',
          recoverable: true
        });
      }

      this.notifyProgress(progress);
    }
  }

  // Handle failed operation
  private handleFailedOperation(operation: BatchOperation, result: any): void {
    operation.retries++;

    if (operation.retries < operation.maxRetries && result.recoverable) {
      // Re-queue for retry
      setTimeout(() => {
        this.operationQueue.push(operation);
        this.sortQueueByPriority();
        this.processQueue();
      }, Math.pow(2, operation.retries) * 1000); // Exponential backoff
    } else {
      // Max retries reached or non-recoverable
      this.notifyResult({
        operationId: operation.id,
        success: false,
        error: result.error || 'Operation failed',
        code: result.code,
        recoverable: result.recoverable,
        duration: 0
      });
    }
  }

  // Sort queue by priority
  private sortQueueByPriority(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.operationQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  // Cancel operation
  cancelOperation(operationId: string): boolean {
    const index = this.operationQueue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.operationQueue.splice(index, 1);
      progressManager.cancelOperation(operationId);
      this.notifyResult({
        operationId,
        success: false,
        error: 'Operation cancelled',
        code: 'CANCELLED',
        recoverable: false,
        duration: 0
      });
      return true;
    }
    return false;
  }

  // Cancel all operations
  cancelAllOperations(): void {
    const cancelledOperations = [...this.operationQueue];
    this.operationQueue = [];

    for (const operation of cancelledOperations) {
      progressManager.cancelOperation(operation.id);
      this.notifyResult({
        operationId: operation.id,
        success: false,
        error: 'Operation cancelled',
        code: 'CANCELLED',
        recoverable: false,
        duration: 0
      });
    }
  }

  // Get queue status
  getQueueStatus(): { queued: number; processing: boolean; activeBatches: number } {
    return {
      queued: this.operationQueue.length,
      processing: this.isProcessing,
      activeBatches: this.activeBatches
    };
  }

  // Event listeners
  onProgress(callback: (progress: BatchProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  onResult(callback: (result: BatchResult) => void): void {
    this.resultCallbacks.push(callback);
  }

  private notifyProgress(progress: BatchProgress): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private notifyResult(result: BatchResult): void {
    this.resultCallbacks.forEach(callback => callback(result));
  }

  // Cleanup
  clearCallbacks(): void {
    this.progressCallbacks = [];
    this.resultCallbacks = [];
  }
}

// Convenience functions
export const batchManager = BatchManager.getInstance();

export const addBatchOperation = (operation: Omit<BatchOperation, 'id' | 'timestamp' | 'retries' | 'maxRetries'>): string => {
  return batchManager.addOperation(operation);
};

export const addBatchOperations = (operations: Omit<BatchOperation, 'id' | 'timestamp' | 'retries' | 'maxRetries'>[]): string[] => {
  return batchManager.addOperations(operations);
};

export const cancelBatchOperation = (operationId: string): boolean => {
  return batchManager.cancelOperation(operationId);
};

export const cancelAllBatchOperations = (): void => {
  batchManager.cancelAllOperations();
};

export const getBatchQueueStatus = () => {
  return batchManager.getQueueStatus();
};