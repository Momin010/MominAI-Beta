import { loggingManager } from './logging-manager';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  operation?: string;
  recoverable: boolean;
}

export interface ErrorRecovery {
  action: string;
  description: string;
  handler: () => Promise<void>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Core error handling methods
  handleError(error: any, operation?: string): ErrorDetails {
    const errorDetails = this.parseError(error, operation);
    this.logError(errorDetails);
    return errorDetails;
  }

  private parseError(error: any, operation?: string): ErrorDetails {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';
    let details: any = {};
    let recoverable = false;

    if (error instanceof Error) {
      message = error.message;
      details.stack = error.stack;
    }

    // Handle specific error types
    if (error.code) {
      code = error.code;
    }

    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      code = 'NETWORK_ERROR';
      recoverable = true;
    }

    // Filesystem errors
    if (error.code === 'ENOENT') {
      code = 'FILE_NOT_FOUND';
      message = 'File or directory not found';
      recoverable = true;
    } else if (error.code === 'EACCES') {
      code = 'PERMISSION_DENIED';
      message = 'Permission denied';
      recoverable = false;
    } else if (error.code === 'ENOSPC') {
      code = 'DISK_FULL';
      message = 'Disk is full';
      recoverable = false;
    }

    // API errors
    if (error.status) {
      code = `HTTP_${error.status}`;
      if (error.status >= 500) {
        recoverable = true;
      }
    }

    // OpenRouter/AI specific errors
    if (error.message?.includes('rate limit')) {
      code = 'RATE_LIMIT_EXCEEDED';
      recoverable = true;
    } else if (error.message?.includes('timeout')) {
      code = 'TIMEOUT_ERROR';
      recoverable = true;
    }

    return {
      code,
      message,
      details,
      timestamp: new Date(),
      operation,
      recoverable
    };
  }

  private logError(error: ErrorDetails): void {
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    // Log to logging manager
    const logLevel = error.recoverable ? 'warn' : 'error';
    loggingManager.log(logLevel, 'error_handler', error.message, {
      operation: error.operation,
      data: {
        code: error.code,
        recoverable: error.recoverable,
        details: error.details
      }
    });
  }

  // Recovery mechanisms
  getRecoveryOptions(error: ErrorDetails): ErrorRecovery[] {
    const options: ErrorRecovery[] = [];

    switch (error.code) {
      case 'NETWORK_ERROR':
        options.push({
          action: 'retry',
          description: 'Retry the operation',
          handler: async () => {
            // This will be implemented by the caller
            throw new Error('Retry handler not implemented');
          }
        });
        break;

      case 'FILE_NOT_FOUND':
        options.push({
          action: 'create_file',
          description: 'Create the missing file',
          handler: async () => {
            // This will be implemented by the caller
            throw new Error('Create file handler not implemented');
          }
        });
        break;

      case 'RATE_LIMIT_EXCEEDED':
        options.push({
          action: 'wait_and_retry',
          description: 'Wait and retry (recommended)',
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          }
        });
        break;

      case 'TIMEOUT_ERROR':
        options.push({
          action: 'retry',
          description: 'Retry with longer timeout',
          handler: async () => {
            // This will be implemented by the caller
            throw new Error('Retry handler not implemented');
          }
        });
        break;
    }

    return options;
  }

  // Error reporting
  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  // User-friendly error messages
  getUserFriendlyMessage(error: ErrorDetails): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Connection failed. Please check your internet connection and try again.';
      case 'FILE_NOT_FOUND':
        return 'The requested file could not be found.';
      case 'PERMISSION_DENIED':
        return 'You don\'t have permission to perform this action.';
      case 'DISK_FULL':
        return 'Your disk is full. Please free up some space.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'TIMEOUT_ERROR':
        return 'The operation timed out. Please try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  // Error boundary helper
  createErrorBoundary(error: any, fallbackMessage?: string): ErrorDetails {
    const errorDetails = this.handleError(error, 'error_boundary');
    return {
      ...errorDetails,
      message: fallbackMessage || this.getUserFriendlyMessage(errorDetails)
    };
  }
}

// Convenience functions
export const handleError = (error: any, operation?: string): ErrorDetails => {
  return ErrorHandler.getInstance().handleError(error, operation);
};

export const getRecoveryOptions = (error: ErrorDetails): ErrorRecovery[] => {
  return ErrorHandler.getInstance().getRecoveryOptions(error);
};

export const getUserFriendlyMessage = (error: ErrorDetails): string => {
  return ErrorHandler.getInstance().getUserFriendlyMessage(error);
};

// Custom error classes
export class FilesystemError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'FilesystemError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public status?: number, public details?: any) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AIError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AIError';
  }
}