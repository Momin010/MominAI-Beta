import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import TerminalPanel from './TerminalPanel';

interface CodeRunnerProps {
  code: string;
  language: string;
}

type ExecutionTarget = 'frontend' | 'backend';

const CodeRunner: React.FC<CodeRunnerProps> = ({ code, language }) => {
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('frontend');
  const [logs, setLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const runCode = () => {
    if (!code.trim()) {
      toast.error('No code to run');
      return;
    }

    setIsRunning(true);
    setOutput('');
    setLogs([]);

    // Determine execution target based on language
    const targetLanguage = language.toLowerCase();
    const isFrontendLanguage = ['javascript', 'typescript', 'js', 'ts'].includes(targetLanguage);
    const isBackendLanguage = ['python', 'node', 'nodejs'].includes(targetLanguage);

    if (executionTarget === 'frontend' && isFrontendLanguage) {
      runFrontend();
    } else if (executionTarget === 'backend' && isBackendLanguage) {
      runBackend();
    } else {
      // Auto-route based on language
      if (isFrontendLanguage) {
        runFrontend();
      } else if (isBackendLanguage) {
        runBackend();
      } else {
        toast.error('Unsupported language for execution');
        setIsRunning(false);
      }
    }
  };

  const runFrontend = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Create a script to run the code safely
    const script = iframeDoc.createElement('script');
    script.textContent = `
      (function() {
        const logs = [];
        const originalLog = console.log;
        console.log = function(...args) {
          logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
          originalLog.apply(console, args);
        };

        try {
          // Execute the code
          ${code}
        } catch (error) {
          logs.push('Error: ' + error.message);
        }

        // Send logs back to parent
        window.parent.postMessage({ type: 'code-output', output: logs.join('\\n') }, '*');
      })();
    `;

    iframeDoc.body.appendChild(script);
  };

  const runBackend = async () => {
    try {
      const backendLanguage = language.toLowerCase() === 'python' ? 'python' : 'node';

      const response = await fetch('/api/run-backend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: backendLanguage,
          userContext: {
            userId: 'anonymous', // You might want to get this from auth context
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const sessionId = result.sessionId;

      // Connect to WebSocket for real-time logs
      connectWebSocket(sessionId);

    } catch (error) {
      console.error('Backend execution error:', error);
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
      toast.error('Failed to start backend execution');
    }
  };

  const connectWebSocket = (sessionId: string) => {
    const wsUrl = `ws://localhost:3000/api/run-backend/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => [...prev, data.message]);
        setOutput(prev => prev + data.message + '\n');
      } else if (data.type === 'execution_complete') {
        setIsRunning(false);
        toast.success(`Execution ${data.status}`);
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setOutput(prev => prev + 'WebSocket error occurred\n');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'code-output') {
        setOutput(event.data.output);
        setIsRunning(false);
        toast.success('Code executed successfully');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Execution Target:
          </label>
          <select
            value={executionTarget}
            onChange={(e) => setExecutionTarget(e.target.value as ExecutionTarget)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="frontend">Frontend (Browser)</option>
            <option value="backend">Backend (Docker)</option>
          </select>
        </div>
        <button
          onClick={runCode}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>

      <TerminalPanel
        frontendOutput={output}
        backendLogs={logs}
        isRunning={isRunning}
        executionTarget={executionTarget}
      />

      <iframe
        ref={iframeRef}
        srcDoc="<html><body></body></html>"
        sandbox="allow-scripts"
        style={{ display: 'none' }}
        title="Code Runner"
      />
    </div>
  );
};

export default CodeRunner;