import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { ErrorDetails, getRecoveryOptions, getUserFriendlyMessage } from '../lib/error-handler';

interface RecoveryDialogProps {
  error: ErrorDetails | null;
  isVisible: boolean;
  onClose: () => void;
  onRetry?: (action: string) => Promise<void>;
  onDismiss?: () => void;
}

interface RecoveryOption {
  action: string;
  description: string;
  handler: () => Promise<void>;
}

const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  error,
  isVisible,
  onClose,
  onRetry,
  onDismiss
}) => {
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOption[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAction, setRetryAction] = useState<string | null>(null);

  useEffect(() => {
    if (error && isVisible) {
      const options = getRecoveryOptions(error);
      setRecoveryOptions(options.map(option => ({
        action: option.action,
        description: option.description,
        handler: async () => {
          setIsRetrying(true);
          setRetryAction(option.action);
          try {
            await option.handler();
            if (onRetry) {
              await onRetry(option.action);
            }
            onClose();
          } catch (retryError) {
            console.error('Recovery action failed:', retryError);
            // Keep dialog open to show the error
          } finally {
            setIsRetrying(false);
            setRetryAction(null);
          }
        }
      })));
    }
  }, [error, isVisible, onRetry, onClose]);

  if (!isVisible || !error) return null;

  const getErrorIcon = () => {
    if (error.recoverable) {
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    }
    return <AlertCircle className="w-6 h-6 text-red-500" />;
  };

  const getErrorColor = () => {
    if (error.recoverable) {
      return 'border-yellow-200 bg-yellow-50';
    }
    return 'border-red-200 bg-red-50';
  };

  const getTitle = () => {
    if (error.recoverable) {
      return 'Operation Failed - Recovery Available';
    }
    return 'Operation Failed';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-lg border-2 shadow-xl ${getErrorColor()}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getErrorIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{getTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Error Message */}
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">
              {getUserFriendlyMessage(error)}
            </p>
            {error.operation && (
              <p className="text-sm text-gray-500 mt-2">
                Operation: {error.operation}
              </p>
            )}
          </div>

          {/* Error Details */}
          <details className="mb-4">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800">
              <div>Error Code: {error.code}</div>
              <div>Timestamp: {error.timestamp.toLocaleString()}</div>
              {error.details && (
                <div>Details: {JSON.stringify(error.details, null, 2)}</div>
              )}
            </div>
          </details>

          {/* Recovery Options */}
          {recoveryOptions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recovery Options:</h4>
              <div className="space-y-2">
                {recoveryOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={option.handler}
                    disabled={isRetrying}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 capitalize">
                          {option.action.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.description}
                        </div>
                      </div>
                      {isRetrying && retryAction === option.action && (
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onDismiss && (
              <button
                onClick={() => {
                  onDismiss();
                  onClose();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryDialog;