import { progressManager } from './progress-manager';
import { handleError } from './error-handler';

export interface StreamChunk {
  id: string;
  type: 'stdout' | 'stderr' | 'progress' | 'status' | 'completion' | 'error';
  data: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StreamingOperation {
  id: string;
  type: 'terminal' | 'ai_request' | 'file_operation' | 'batch_operation';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalChunks: number;
  currentChunk: number;
  lastActivity: Date;
}

export class StreamingManager {
  private static instance: StreamingManager;
  private activeStreams: Map<string, StreamingOperation> = new Map();
  private streamCallbacks: Map<string, ((chunk: StreamChunk) => void)[]> = new Map();
  private operationCallbacks: Map<string, ((operation: StreamingOperation) => void)[]> = new Map();

  static getInstance(): StreamingManager {
    if (!StreamingManager.instance) {
      StreamingManager.instance = new StreamingManager();
    }
    return StreamingManager.instance;
  }

  // Start a new streaming operation
  startOperation(
    operationId: string,
    type: StreamingOperation['type'],
    initialMessage?: string
  ): void {
    const operation: StreamingOperation = {
      id: operationId,
      type,
      startTime: new Date(),
      status: 'running',
      progress: 0,
      totalChunks: 0,
      currentChunk: 0,
      lastActivity: new Date()
    };

    this.activeStreams.set(operationId, operation);

    // Track in progress manager
    progressManager.trackOperation(operationId, type, initialMessage || `Starting ${type} operation`);

    // Notify listeners
    this.notifyOperationUpdate(operation);

    if (initialMessage) {
      this.emitChunk(operationId, {
        id: `init_${Date.now()}`,
        type: 'status',
        data: initialMessage,
        timestamp: new Date()
      });
    }
  }

  // End a streaming operation
  endOperation(operationId: string, success: boolean = true, finalMessage?: string): void {
    const operation = this.activeStreams.get(operationId);
    if (!operation) return;

    operation.endTime = new Date();
    operation.status = success ? 'completed' : 'failed';
    operation.progress = 100;

    // Update progress manager
    if (success) {
      progressManager.completeOperation(operationId, finalMessage);
    } else {
      progressManager.failOperation(operationId, finalMessage || 'Operation failed');
    }

    // Emit final chunk
    if (finalMessage) {
      this.emitChunk(operationId, {
        id: `final_${Date.now()}`,
        type: success ? 'completion' : 'error',
        data: finalMessage,
        timestamp: new Date()
      });
    }

    // Notify listeners
    this.notifyOperationUpdate(operation);

    // Clean up after a delay
    setTimeout(() => {
      this.activeStreams.delete(operationId);
      this.streamCallbacks.delete(operationId);
      this.operationCallbacks.delete(operationId);
    }, 5000);
  }

  // Cancel a streaming operation
  cancelOperation(operationId: string, reason?: string): void {
    const operation = this.activeStreams.get(operationId);
    if (!operation) return;

    operation.status = 'cancelled';
    operation.endTime = new Date();

    progressManager.cancelOperation(operationId);

    this.emitChunk(operationId, {
      id: `cancel_${Date.now()}`,
      type: 'status',
      data: reason || 'Operation cancelled',
      timestamp: new Date()
    });

    this.notifyOperationUpdate(operation);

    // Clean up
    this.activeStreams.delete(operationId);
    this.streamCallbacks.delete(operationId);
    this.operationCallbacks.delete(operationId);
  }

  // Emit a stream chunk
  emitChunk(operationId: string, chunk: StreamChunk): void {
    const operation = this.activeStreams.get(operationId);
    if (!operation) return;

    // Update operation stats
    operation.currentChunk++;
    operation.lastActivity = new Date();

    // Update progress based on chunk type
    if (chunk.type === 'progress' && chunk.metadata?.progress !== undefined) {
      operation.progress = Math.max(0, Math.min(100, chunk.metadata.progress));
    } else if (chunk.type === 'completion') {
      operation.progress = 100;
    }

    // Update progress manager
    progressManager.updateOperationProgress(
      operationId,
      operation.progress,
      chunk.data,
      operation.status === 'running' ? 'running' : undefined
    );

    // Notify stream listeners
    const callbacks = this.streamCallbacks.get(operationId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(chunk);
        } catch (error) {
          console.error('Stream callback error:', error);
        }
      });
    }

    // Notify operation listeners
    this.notifyOperationUpdate(operation);
  }

  // Subscribe to stream chunks
  onStreamChunk(operationId: string, callback: (chunk: StreamChunk) => void): () => void {
    if (!this.streamCallbacks.has(operationId)) {
      this.streamCallbacks.set(operationId, []);
    }

    this.streamCallbacks.get(operationId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.streamCallbacks.get(operationId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Subscribe to operation updates
  onOperationUpdate(operationId: string, callback: (operation: StreamingOperation) => void): () => void {
    if (!this.operationCallbacks.has(operationId)) {
      this.operationCallbacks.set(operationId, []);
    }

    this.operationCallbacks.get(operationId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.operationCallbacks.get(operationId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Get operation details
  getOperation(operationId: string): StreamingOperation | undefined {
    return this.activeStreams.get(operationId);
  }

  // Get all active operations
  getActiveOperations(): StreamingOperation[] {
    return Array.from(this.activeStreams.values());
  }

  // Get operations by type
  getOperationsByType(type: StreamingOperation['type']): StreamingOperation[] {
    return Array.from(this.activeStreams.values()).filter(op => op.type === type);
  }

  // Utility methods for common streaming patterns
  async streamTerminalCommand(
    operationId: string,
    command: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<void> {
    this.startOperation(operationId, 'terminal', `Executing: ${command}`);

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`Terminal API error: ${response.status}`);
      }

      const result = await response.json();

      // Simulate streaming for now (in a real implementation, this would be server-sent events)
      if (result.success) {
        this.emitChunk(operationId, {
          id: `stdout_${Date.now()}`,
          type: 'stdout',
          data: result.output,
          timestamp: new Date()
        });

        if (onChunk) {
          onChunk({
            id: `stdout_${Date.now()}`,
            type: 'stdout',
            data: result.output,
            timestamp: new Date()
          });
        }

        this.endOperation(operationId, true, 'Command completed successfully');
      } else {
        throw new Error(result.output || 'Command failed');
      }
    } catch (error) {
      const errorDetails = handleError(error, 'terminal_stream');
      this.emitChunk(operationId, {
        id: `error_${Date.now()}`,
        type: 'error',
        data: errorDetails.message,
        timestamp: new Date(),
        metadata: { code: errorDetails.code }
      });
      this.endOperation(operationId, false, errorDetails.message);
    }
  }

  async streamAIRequest(
    operationId: string,
    prompt: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<void> {
    this.startOperation(operationId, 'ai_request', 'Processing AI request...');

    try {
      // Use Gemini streaming for conversational responses
      const { GoogleGenerativeAI } = await import('@google/generative-ai');

      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY not configured');
      }

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContentStream(prompt);

      let chunkCount = 0;
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          chunkCount++;

          this.emitChunk(operationId, {
            id: `ai_chunk_${chunkCount}`,
            type: 'stdout',
            data: chunkText,
            timestamp: new Date(),
            metadata: { chunkNumber: chunkCount }
          });

          if (onChunk) {
            onChunk({
              id: `ai_chunk_${chunkCount}`,
              type: 'stdout',
              data: chunkText,
              timestamp: new Date(),
              metadata: { chunkNumber: chunkCount }
            });
          }
        }
      }

      this.endOperation(operationId, true, `AI response completed (${chunkCount} chunks)`);
    } catch (error) {
      const errorDetails = handleError(error, 'ai_stream');
      this.emitChunk(operationId, {
        id: `error_${Date.now()}`,
        type: 'error',
        data: errorDetails.message,
        timestamp: new Date(),
        metadata: { code: errorDetails.code }
      });
      this.endOperation(operationId, false, errorDetails.message);
    }
  }

  private notifyOperationUpdate(operation: StreamingOperation): void {
    const callbacks = this.operationCallbacks.get(operation.id);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(operation);
        } catch (error) {
          console.error('Operation callback error:', error);
        }
      });
    }
  }
}

// Convenience functions
export const streamingManager = StreamingManager.getInstance();

export const startStreamingOperation = (
  operationId: string,
  type: StreamingOperation['type'],
  message?: string
): void => {
  streamingManager.startOperation(operationId, type, message);
};

export const endStreamingOperation = (operationId: string, success?: boolean, message?: string): void => {
  streamingManager.endOperation(operationId, success, message);
};

export const cancelStreamingOperation = (operationId: string, reason?: string): void => {
  streamingManager.cancelOperation(operationId, reason);
};

export const streamTerminalCommand = (
  operationId: string,
  command: string,
  onChunk?: (chunk: StreamChunk) => void
): Promise<void> => {
  return streamingManager.streamTerminalCommand(operationId, command, onChunk);
};

export const streamAIRequest = (
  operationId: string,
  prompt: string,
  onChunk?: (chunk: StreamChunk) => void
): Promise<void> => {
  return streamingManager.streamAIRequest(operationId, prompt, onChunk);
};