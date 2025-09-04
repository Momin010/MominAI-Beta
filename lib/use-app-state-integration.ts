import { useEffect, useCallback } from 'react';
import { useAppState, appActions } from './app-state';
import { batchManager } from './batch-manager';
import { progressManager } from './progress-manager';
import { cancellationManager } from './cancellation-manager';

export function useAppStateIntegration() {
  const { state, dispatch } = useAppState();

  // Batch manager integration
  useEffect(() => {
    const handleBatchResult = (result: any) => {
      if (result.success) {
        dispatch(appActions.addOperationHistory(result.operationId, 'batch', 'success', 'Operation completed'));
      } else {
        dispatch(appActions.addOperationHistory(result.operationId, 'batch', 'error', result.error || 'Operation failed'));
        dispatch(appActions.setLastError({
          message: result.error || 'Batch operation failed',
          code: result.code || 'BATCH_ERROR'
        }));
      }
      dispatch(appActions.removeOperation(result.operationId));
    };

    const handleBatchProgress = (progress: any) => {
      // Update loading state based on progress
      if (progress.total > 0) {
        const percent = Math.round((progress.completed / progress.total) * 100);
        dispatch(appActions.setLoading(
          progress.completed < progress.total,
          `Processing operations: ${progress.completed}/${progress.total} (${percent}%)`
        ));
      }
    };

    batchManager.onResult(handleBatchResult);
    batchManager.onProgress(handleBatchProgress);

    return () => {
      batchManager.clearCallbacks();
    };
  }, [dispatch]);

  // Progress manager integration
  useEffect(() => {
    const handleProgressUpdate = (progress: any) => {
      dispatch(appActions.setShowProgressIndicator(
        progress.runningOperations > 0 || progress.pendingOperations > 0
      ));
    };

    const handleOperationUpdate = (operation: any) => {
      if (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') {
        dispatch(appActions.removeOperation(operation.operationId));
      }
    };

    progressManager.onProgressUpdate(handleProgressUpdate);
    progressManager.onOperationUpdate(handleOperationUpdate);

    return () => {
      progressManager.clearCallbacks();
    };
  }, [dispatch]);

  // Cancellation manager integration
  useEffect(() => {
    // Handle cancellation events if needed
    return () => {
      // Cleanup is handled by the cancellation manager automatically
    };
  }, []);

  // File operations
  const createFile = useCallback(async (path: string, content: string = '') => {
    const operationId = batchManager.addOperation({
      type: 'write',
      path,
      content,
      priority: 'normal'
    });

    dispatch(appActions.addOperation(operationId));
    return operationId;
  }, [dispatch]);

  const createFolder = useCallback(async (path: string) => {
    const operationId = batchManager.addOperation({
      type: 'create',
      path: path + '/', // Add trailing slash to indicate folder
      priority: 'normal'
    });

    dispatch(appActions.addOperation(operationId));
    return operationId;
  }, [dispatch]);

  const deleteFile = useCallback(async (path: string) => {
    const operationId = batchManager.addOperation({
      type: 'delete',
      path,
      priority: 'high' // Deletions are high priority
    });

    dispatch(appActions.addOperation(operationId));
    return operationId;
  }, [dispatch]);

  const readFile = useCallback(async (path: string) => {
    const operationId = batchManager.addOperation({
      type: 'read',
      path,
      priority: 'high' // Reads are high priority
    });

    dispatch(appActions.addOperation(operationId));
    return operationId;
  }, [dispatch]);

  const listDirectory = useCallback(async (path: string) => {
    const operationId = batchManager.addOperation({
      type: 'list',
      path,
      priority: 'normal'
    });

    dispatch(appActions.addOperation(operationId));
    return operationId;
  }, [dispatch]);

  // Batch operations
  const createFilesBatch = useCallback(async (files: Array<{ path: string; content: string }>) => {
    const operations = files.map(file => ({
      type: 'write' as const,
      path: file.path,
      content: file.content,
      priority: 'normal' as const
    }));

    const operationIds = batchManager.addOperations(operations);
    operationIds.forEach(id => dispatch(appActions.addOperation(id)));
    return operationIds;
  }, [dispatch]);

  // Terminal operations
  const executeTerminalCommand = useCallback(async (command: string) => {
    dispatch(appActions.setLoading(true, `Executing: ${command}`));

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      const result = await response.json();

      if (result.success) {
        dispatch(appActions.addOperationHistory(
          result.operationId || `terminal_${Date.now()}`,
          'terminal',
          'success',
          `Command executed: ${command}`
        ));
      } else {
        dispatch(appActions.addOperationHistory(
          result.operationId || `terminal_${Date.now()}`,
          'terminal',
          'error',
          result.output || 'Command failed'
        ));
        dispatch(appActions.setLastError({
          message: result.output || 'Terminal command failed',
          code: result.code || 'TERMINAL_ERROR'
        }));
      }
    } catch (error: any) {
      dispatch(appActions.addOperationHistory(
        `terminal_${Date.now()}`,
        'terminal',
        'error',
        `Network error: ${error.message}`
      ));
      dispatch(appActions.setLastError({
        message: 'Failed to execute terminal command',
        code: 'NETWORK_ERROR'
      }));
    } finally {
      dispatch(appActions.setLoading(false));
    }
  }, [dispatch]);

  // Utility functions
  const clearErrors = useCallback(() => {
    dispatch(appActions.setLastError(null));
  }, [dispatch]);

  const clearOperationHistory = useCallback(() => {
    // Note: This would require adding a CLEAR_HISTORY action to the reducer
    // For now, we'll reset the entire state
    dispatch(appActions.resetState());
  }, [dispatch]);

  const getOperationStatus = useCallback((operationId: string) => {
    return progressManager.getOperation(operationId);
  }, []);

  const cancelOperation = useCallback(async (operationId: string) => {
    const cancelled = await cancellationManager.cancelOperation(operationId);
    if (cancelled) {
      dispatch(appActions.removeOperation(operationId));
      dispatch(appActions.addOperationHistory(
        operationId,
        'operation',
        'cancelled',
        'Operation cancelled by user'
      ));
    }
    return cancelled;
  }, [dispatch]);

  const cancelAllOperations = useCallback(async () => {
    const cancelledCount = await cancellationManager.cancelAllOperations();
    dispatch(appActions.setLoading(false));
    dispatch(appActions.setShowProgressIndicator(false));
    return cancelledCount;
  }, [dispatch]);

  return {
    // State
    ...state,

    // File operations
    createFile,
    createFolder,
    deleteFile,
    readFile,
    listDirectory,
    createFilesBatch,

    // Terminal operations
    executeTerminalCommand,

    // Utility functions
    clearErrors,
    clearOperationHistory,
    getOperationStatus,
    cancelOperation,
    cancelAllOperations,

    // Direct dispatch access for custom actions
    dispatch,
  };
}