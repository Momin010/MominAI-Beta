import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Terminal, Cpu, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { StreamChunk, StreamingOperation, streamingManager } from '../lib/streaming-manager';

interface StreamingDisplayProps {
  operationId: string;
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

const StreamingDisplay: React.FC<StreamingDisplayProps> = ({
  operationId,
  isVisible,
  onClose,
  className = ''
}) => {
  const [operation, setOperation] = useState<StreamingOperation | null>(null);
  const [chunks, setChunks] = useState<StreamChunk[]>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chunksEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !operationId) return;

    // Get initial operation state
    const initialOperation = streamingManager.getOperation(operationId);
    if (initialOperation) {
      setOperation(initialOperation);
    }

    // Subscribe to operation updates
    const unsubscribeOperation = streamingManager.onOperationUpdate(operationId, (updatedOperation) => {
      setOperation(updatedOperation);
    });

    // Subscribe to stream chunks
    const unsubscribeStream = streamingManager.onStreamChunk(operationId, (chunk) => {
      setChunks(prev => [...prev, chunk]);
    });

    return () => {
      unsubscribeOperation();
      unsubscribeStream();
    };
  }, [operationId, isVisible]);

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (isAutoScrollEnabled && chunksEndRef.current) {
      chunksEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chunks, isAutoScrollEnabled]);

  if (!isVisible || !operation) return null;

  const getOperationIcon = () => {
    switch (operation.type) {
      case 'terminal':
        return <Terminal className="w-5 h-5 text-green-500" />;
      case 'ai_request':
        return <Cpu className="w-5 h-5 text-blue-500" />;
      case 'file_operation':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'batch_operation':
        return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
      default:
        return <Play className="w-5 h-5 text-gray-500" />;
    }
  };

  const getChunkIcon = (chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'stdout':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'stderr':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'progress':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'status':
        return <Play className="w-3 h-3 text-blue-500" />;
      case 'completion':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <FileText className="w-3 h-3 text-gray-500" />;
    }
  };

  const getChunkColor = (chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'stdout':
        return 'text-green-600';
      case 'stderr':
        return 'text-red-600';
      case 'progress':
        return 'text-blue-600';
      case 'status':
        return 'text-blue-600';
      case 'completion':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();

    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      <div className="bg-white/95 backdrop-blur-xl rounded-lg shadow-lg border border-gray-200 w-96 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {getOperationIcon()}
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {operation.type.replace('_', ' ')}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDuration(operation.startTime, operation.endTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
              className={`text-xs px-2 py-1 rounded ${
                isAutoScrollEnabled
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Auto-scroll
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <Square className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{operation.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${operation.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>{operation.currentChunk} chunks</span>
            <span>{operation.status}</span>
          </div>
        </div>

        {/* Stream Content */}
        <div
          ref={scrollRef}
          className="h-64 overflow-y-auto p-4 font-mono text-sm bg-gray-50"
        >
          {chunks.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Waiting for stream data...
            </div>
          ) : (
            <div className="space-y-2">
              {chunks.map((chunk, index) => (
                <div key={chunk.id} className="flex items-start gap-2">
                  {getChunkIcon(chunk)}
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs ${getChunkColor(chunk)} break-words`}>
                      {chunk.data}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(chunk.timestamp)}
                      {chunk.metadata && (
                        <span className="ml-2">
                          {Object.entries(chunk.metadata)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chunksEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Started: {operation.startTime.toLocaleTimeString()}
          </div>
          <div className="flex gap-2">
            {operation.status === 'running' && (
              <button
                onClick={() => streamingManager.cancelOperation(operationId, 'Cancelled by user')}
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => setChunks([])}
              className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingDisplay;