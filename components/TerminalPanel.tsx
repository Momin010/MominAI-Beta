import React, { useState } from 'react';

interface TerminalPanelProps {
  frontendOutput: string;
  backendLogs: string[];
  isRunning: boolean;
  executionTarget: 'frontend' | 'backend';
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  frontendOutput,
  backendLogs,
  isRunning,
  executionTarget
}) => {
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend'>(executionTarget);

  const tabs = [
    { id: 'frontend', label: 'Frontend Console', icon: '🌐' },
    { id: 'backend', label: 'Backend Terminal', icon: '🐳' }
  ];

  return (
    <div className="mt-4 bg-gray-900 rounded-lg overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'frontend' | 'backend')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {isRunning && executionTarget === tab.id && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 min-h-64 max-h-96 overflow-y-auto">
        {activeTab === 'frontend' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="text-green-400">▶</span>
              <span>Browser Console Output</span>
            </div>
            {frontendOutput ? (
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {frontendOutput}
              </pre>
            ) : (
              <div className="text-gray-500 text-sm italic">
                No frontend output yet. Run JavaScript/TypeScript code to see results.
              </div>
            )}
          </div>
        )}

        {activeTab === 'backend' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="text-blue-400">🐳</span>
              <span>Docker Container Logs</span>
            </div>
            {backendLogs.length > 0 ? (
              <div className="space-y-1">
                {backendLogs.map((log, index) => (
                  <div key={index} className="text-blue-300 text-sm font-mono">
                    <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
                {isRunning && executionTarget === 'backend' && (
                  <div className="text-yellow-400 text-sm animate-pulse">
                    ▶ Executing in container...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm italic">
                No backend logs yet. Run Python or Node.js code to see container output.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>Status: {isRunning ? 'Running' : 'Ready'}</span>
            <span>Target: {executionTarget === 'frontend' ? 'Browser' : 'Docker'}</span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Active</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;