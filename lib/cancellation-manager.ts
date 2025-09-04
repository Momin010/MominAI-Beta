export interface CancellableOperation {
  id: string;
  type: 'terminal' | 'filesystem' | 'ai_request';
  controller?: AbortController;
  process?: any; // For terminal processes
  cancel: () => Promise<void>;
  onCancel?: () => void;
}

export class CancellationManager {
  private static instance: CancellationManager;
  private operations: Map<string, CancellableOperation> = new Map();

  static getInstance(): CancellationManager {
    if (!CancellationManager.instance) {
      CancellationManager.instance = new CancellationManager();
    }
    return CancellationManager.instance;
  }

  // Register a cancellable operation
  registerOperation(operation: CancellableOperation): string {
    this.operations.set(operation.id, operation);
    return operation.id;
  }

  // Cancel a specific operation
  async cancelOperation(operationId: string): Promise<boolean> {
    const operation = this.operations.get(operationId);
    if (!operation) return false;

    try {
      // Call the cancel function
      await operation.cancel();

      // Call the onCancel callback if provided
      if (operation.onCancel) {
        operation.onCancel();
      }

      // Clean up
      this.operations.delete(operationId);
      return true;
    } catch (error) {
      console.error(`Failed to cancel operation ${operationId}:`, error);
      return false;
    }
  }

  // Cancel all operations of a specific type
  async cancelOperationsByType(type: CancellableOperation['type']): Promise<number> {
    const operationsToCancel = Array.from(this.operations.values())
      .filter(op => op.type === type);

    let cancelledCount = 0;
    for (const operation of operationsToCancel) {
      if (await this.cancelOperation(operation.id)) {
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  // Cancel all operations
  async cancelAllOperations(): Promise<number> {
    const allOperations = Array.from(this.operations.keys());
    let cancelledCount = 0;

    for (const operationId of allOperations) {
      if (await this.cancelOperation(operationId)) {
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  // Get operation status
  getOperation(operationId: string): CancellableOperation | undefined {
    return this.operations.get(operationId);
  }

  // Get all operations
  getAllOperations(): CancellableOperation[] {
    return Array.from(this.operations.values());
  }

  // Get operations by type
  getOperationsByType(type: CancellableOperation['type']): CancellableOperation[] {
    return Array.from(this.operations.values()).filter(op => op.type === type);
  }

  // Check if operation exists
  hasOperation(operationId: string): boolean {
    return this.operations.has(operationId);
  }

  // Clean up completed operations
  cleanupOperation(operationId: string): void {
    this.operations.delete(operationId);
  }

  // Create AbortController-based cancellable operation
  createAbortControllerOperation(
    id: string,
    type: CancellableOperation['type'],
    onCancel?: () => void
  ): { controller: AbortController; operationId: string } {
    const controller = new AbortController();

    const operation: CancellableOperation = {
      id,
      type,
      controller,
      cancel: async () => {
        controller.abort();
      },
      onCancel
    };

    this.registerOperation(operation);
    return { controller, operationId: id };
  }

  // Create process-based cancellable operation
  createProcessOperation(
    id: string,
    process: any,
    onCancel?: () => void
  ): string {
    const operation: CancellableOperation = {
      id,
      type: 'terminal',
      process,
      cancel: async () => {
        if (process && typeof process.kill === 'function') {
          process.kill('SIGTERM');
          // Give it 5 seconds to terminate gracefully, then force kill
          setTimeout(() => {
            if (!process.killed) {
              process.kill('SIGKILL');
            }
          }, 5000);
        }
      },
      onCancel
    };

    return this.registerOperation(operation);
  }
}

// Convenience functions
export const cancellationManager = CancellationManager.getInstance();

export const registerCancellableOperation = (operation: CancellableOperation): string => {
  return cancellationManager.registerOperation(operation);
};

export const cancelOperation = (operationId: string): Promise<boolean> => {
  return cancellationManager.cancelOperation(operationId);
};

export const cancelOperationsByType = (type: CancellableOperation['type']): Promise<number> => {
  return cancellationManager.cancelOperationsByType(type);
};

export const cancelAllOperations = (): Promise<number> => {
  return cancellationManager.cancelAllOperations();
};

export const createAbortControllerOperation = (
  id: string,
  type: CancellableOperation['type'],
  onCancel?: () => void
) => {
  return cancellationManager.createAbortControllerOperation(id, type, onCancel);
};

export const createProcessOperation = (id: string, process: any, onCancel?: () => void): string => {
  return cancellationManager.createProcessOperation(id, process, onCancel);
};