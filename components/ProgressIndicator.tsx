import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { progressManager, OverallProgress, OperationProgress } from '../lib/progress-manager';

interface ProgressIndicatorProps {
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isVisible,
  onClose,
  className = ''
}) => {
  const [overallProgress, setOverallProgress] = useState<OverallProgress | null>(null);
  const [operations, setOperations] = useState<OperationProgress[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Set up progress tracking
    const handleProgressUpdate = (progress: OverallProgress) => {
      setOverallProgress(progress);
    };

    const handleOperationUpdate = (operation: OperationProgress) => {
      setOperations(prev => {
        const existing = prev.find(op => op.operationId === operation.operationId);
        if (existing) {
          return prev.map(op => op.operationId === operation.operationId ? operation : op);
        } else {
          return [...prev, operation];
        }
      });
    };

    progressManager.onProgressUpdate(handleProgressUpdate);
    progressManager.onOperationUpdate(handleOperationUpdate);

    // Get initial state
    setOverallProgress(progressManager.getOverallProgress());
    setOperations(progressManager.getAllOperations());

    return () => {
      progressManager.clearCallbacks();
    };
  }, [isVisible]);

  if (!isVisible || !overallProgress) return null;

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusIcon = (status: OperationProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: OperationProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white/95 backdrop-blur-xl rounded-lg shadow-lg border border-gray-200 min-w-80 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Operation Progress</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">
              {overallProgress.completedOperations + overallProgress.failedOperations + overallProgress.cancelledOperations}/{overallProgress.totalOperations}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress.overallProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{Math.round(overallProgress.overallProgress)}% complete</span>
            {overallProgress.estimatedTimeRemaining && (
              <span>~{formatTime(overallProgress.estimatedTimeRemaining)} remaining</span>
            )}
          </div>

          {overallProgress.currentOperation && (
            <div className="mt-2 text-sm text-gray-600 truncate">
              {overallProgress.currentOperation}
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-gray-600">{overallProgress.completedOperations} completed</span>
            </div>
            {overallProgress.failedOperations > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                <span className="text-gray-600">{overallProgress.failedOperations} failed</span>
              </div>
            )}
            {overallProgress.runningOperations > 0 && (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-gray-600">{overallProgress.runningOperations} running</span>
              </div>
            )}
          </div>
        </div>

        {/* Operation Details */}
        {showDetails && operations.length > 0 && (
          <div className="border-t border-gray-200 max-h-60 overflow-y-auto">
            <div className="p-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Operation Details</h4>
              <div className="space-y-2">
                {operations.slice(-10).map((operation) => (
                  <div key={operation.operationId} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    {getStatusIcon(operation.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-900 truncate">
                          {operation.operationType}
                        </span>
                        <span className={`text-xs ${getStatusColor(operation.status)}`}>
                          {operation.progress}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {operation.message}
                      </div>
                      {operation.duration && (
                        <div className="text-xs text-gray-500">
                          {formatTime(operation.duration)}
                        </div>
                      )}
                      {operation.error && (
                        <div className="text-xs text-red-600 mt-1 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{operation.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-200 p-3 flex justify-between">
          <button
            onClick={() => progressManager.clearCompletedOperations()}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear Completed
          </button>
          <button
            onClick={() => progressManager.clearAllOperations()}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;