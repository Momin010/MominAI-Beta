import { useState, useCallback } from 'react';
import { ErrorDetails, handleError, getRecoveryOptions } from './error-handler';
import { useAppState, appActions } from './app-state';

export interface RecoveryState {
  currentError: ErrorDetails | null;
  isRecoveryDialogVisible: boolean;
  recoveryHistory: Array<{
    error: ErrorDetails;
    action: string;
    timestamp: Date;
    success: boolean;
  }>;
}

export function useErrorRecovery() {
  const { state, dispatch } = useAppState();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    currentError: null,
    isRecoveryDialogVisible: false,
    recoveryHistory: []
  });

  // Handle a new error
  const handleNewError = useCallback((error: any, operation?: string) => {
    const errorDetails = handleError(error, operation);

    setRecoveryState(prev => ({
      ...prev,
      currentError: errorDetails,
      isRecoveryDialogVisible: true
    }));

    // Also update app state
    dispatch(appActions.setLastError({
      message: errorDetails.message,
      code: errorDetails.code
    }));

    return errorDetails;
  }, [dispatch]);

  // Execute recovery action
  const executeRecovery = useCallback(async (action: string): Promise<boolean> => {
    if (!recoveryState.currentError) return false;

    try {
      const recoveryOptions = getRecoveryOptions(recoveryState.currentError);
      const selectedOption = recoveryOptions.find(option => option.action === action);

      if (!selectedOption) {
        throw new Error(`Recovery action '${action}' not found`);
      }

      await selectedOption.handler();

      // Record successful recovery
      setRecoveryState(prev => ({
        ...prev,
        recoveryHistory: [
          ...prev.recoveryHistory,
          {
            error: prev.currentError!,
            action,
            timestamp: new Date(),
            success: true
          }
        ]
      }));

      // Clear the error
      dispatch(appActions.setLastError(null));

      return true;
    } catch (error) {
      // Record failed recovery
      setRecoveryState(prev => ({
        ...prev,
        recoveryHistory: [
          ...prev.recoveryHistory,
          {
            error: prev.currentError!,
            action,
            timestamp: new Date(),
            success: false
          }
        ]
      }));

      // Re-throw the error so it can be handled by the caller
      throw error;
    }
  }, [recoveryState.currentError, dispatch]);

  // Dismiss current error
  const dismissError = useCallback(() => {
    setRecoveryState(prev => ({
      ...prev,
      currentError: null,
      isRecoveryDialogVisible: false
    }));

    dispatch(appActions.setLastError(null));
  }, [dispatch]);

  // Show recovery dialog for an existing error
  const showRecoveryDialog = useCallback((error: ErrorDetails) => {
    setRecoveryState(prev => ({
      ...prev,
      currentError: error,
      isRecoveryDialogVisible: true
    }));
  }, []);

  // Hide recovery dialog
  const hideRecoveryDialog = useCallback(() => {
    setRecoveryState(prev => ({
      ...prev,
      isRecoveryDialogVisible: false
    }));
  }, []);

  // Clear recovery history
  const clearRecoveryHistory = useCallback(() => {
    setRecoveryState(prev => ({
      ...prev,
      recoveryHistory: []
    }));
  }, []);

  // Get recovery statistics
  const getRecoveryStats = useCallback(() => {
    const history = recoveryState.recoveryHistory;
    const total = history.length;
    const successful = history.filter(h => h.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100
    };
  }, [recoveryState.recoveryHistory]);

  // Auto-retry mechanism for recoverable errors
  const autoRetry = useCallback(async (error: ErrorDetails, maxRetries: number = 3): Promise<boolean> => {
    if (!error.recoverable) return false;

    const recoveryOptions = getRecoveryOptions(error);
    const retryOption = recoveryOptions.find(option => option.action === 'retry');

    if (!retryOption) return false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await retryOption.handler();
        return true;
      } catch (retryError) {
        if (attempt === maxRetries) {
          throw retryError;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return false;
  }, []);

  // Batch error handling
  const handleBatchErrors = useCallback((errors: ErrorDetails[]) => {
    // Group errors by type
    const errorGroups = errors.reduce((groups, error) => {
      const key = error.code;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(error);
      return groups;
    }, {} as Record<string, ErrorDetails[]>);

    // Handle the most common error type
    const mostCommonErrorType = Object.keys(errorGroups).reduce((a, b) =>
      errorGroups[a].length > errorGroups[b].length ? a : b
    );

    if (mostCommonErrorType) {
      const representativeError = errorGroups[mostCommonErrorType][0];
      handleNewError(representativeError, `batch_operation_${mostCommonErrorType}`);
    }
  }, [handleNewError]);

  return {
    // State
    currentError: recoveryState.currentError,
    isRecoveryDialogVisible: recoveryState.isRecoveryDialogVisible,
    recoveryHistory: recoveryState.recoveryHistory,

    // App state error
    lastError: state.lastError,

    // Actions
    handleNewError,
    executeRecovery,
    dismissError,
    showRecoveryDialog,
    hideRecoveryDialog,
    clearRecoveryHistory,

    // Utilities
    getRecoveryStats,
    autoRetry,
    handleBatchErrors,
  };
}