import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Terminal as TerminalIcon, Loader2, X } from 'lucide-react';

interface TerminalProps {
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onCommandExecute?: (command: string, output: string) => void;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
  operationId?: string;
}

interface RunningOperation {
  id: string;
  command: string;
  startTime: Date;
}

const Terminal: React.FC<TerminalProps> = ({
  isVisible = true,
  onToggleVisibility,
  onCommandExecute
}) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'output',
      content: 'Welcome to MominAI Terminal',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'output',
      content: 'Type commands to interact with your project',
      timestamp: new Date()
    }
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [runningOperations, setRunningOperations] = useState<RunningOperation[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = (type: 'input' | 'output' | 'error', content: string) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setLines(prev => [...prev, newLine]);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    const operationId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    addLine('input', `$ ${command}`);
    setIsExecuting(true);

    // Add to running operations
    const runningOp: RunningOperation = {
      id: operationId,
      command,
      startTime: new Date()
    };
    setRunningOperations(prev => [...prev, runningOp]);

    try {
      // Call the terminal API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          operationId
        }),
      });

      const result = await response.json();

      if (result.success) {
        addLine('output', result.output);
      } else {
        addLine('error', result.output);
      }

      if (onCommandExecute) {
        onCommandExecute(command, result.output);
      }
    } catch (error) {
      addLine('error', `Network error: ${error}`);
    } finally {
      setIsExecuting(false);
      // Remove from running operations
      setRunningOperations(prev => prev.filter(op => op.id !== operationId));
    }
  };

  const cancelCommand = async (operationId: string) => {
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          operationId
        }),
      });

      const result = await response.json();
      if (result.success) {
        addLine('output', `Command cancelled: ${runningOperations.find(op => op.id === operationId)?.command}`);
        setRunningOperations(prev => prev.filter(op => op.id !== operationId));
      } else {
        addLine('error', `Failed to cancel command: ${result.message}`);
      }
    } catch (error) {
      addLine('error', `Failed to cancel command: ${error}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = currentCommand.trim();
    if (command && !isExecuting) {
      executeCommand(command);
      setCurrentCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      // TODO: Implement command history
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      // TODO: Implement command history
      e.preventDefault();
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggleVisibility}
          className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Show Terminal"
        >
          <TerminalIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Terminal</span>
          {isExecuting && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          )}
          {runningOperations.length > 0 && (
            <span className="text-xs text-blue-400 bg-blue-900/50 px-2 py-1 rounded">
              {runningOperations.length} running
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => executeCommand('clear')}
            className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded"
            title="Clear Terminal"
          >
            Clear
          </button>
          <button
            onClick={onToggleVisibility}
            className="text-gray-400 hover:text-white"
            title="Hide Terminal"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="h-64 overflow-y-auto p-4 font-mono text-sm"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`mb-1 ${
              line.type === 'input'
                ? 'text-green-400'
                : line.type === 'error'
                ? 'text-red-400'
                : 'text-gray-300'
            }`}
          >
            {line.type === 'input' && <span className="text-blue-400">❯</span>}
            <span className="ml-2">{line.content}</span>
          </div>
        ))}
      </div>

      {/* Running Operations */}
      {runningOperations.length > 0 && (
        <div className="border-t border-gray-700 p-2">
          <div className="text-xs text-gray-400 mb-2">Running Operations:</div>
          <div className="space-y-1">
            {runningOperations.map((operation) => (
              <div key={operation.id} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 truncate">{operation.command}</div>
                  <div className="text-xs text-gray-500">
                    {Math.round((Date.now() - operation.startTime.getTime()) / 1000)}s
                  </div>
                </div>
                <button
                  onClick={() => cancelCommand(operation.id)}
                  className="ml-2 text-red-400 hover:text-red-300 p-1 rounded"
                  title="Cancel operation"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-sm">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            className="flex-1 bg-transparent border-none outline-none text-gray-300 font-mono text-sm placeholder-gray-500"
            placeholder={isExecuting ? "Executing..." : "Type a command..."}
            autoFocus
          />
          <button
            type="submit"
            disabled={isExecuting || !currentCommand.trim()}
            className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;