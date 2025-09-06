"use client";

import { runAgent } from "@/action-executor";
import { useIdeState } from "@/ide-api";
import { useState } from "react";

export function AgentRuntime() {
  const [prompt, setPrompt] = useState("Create a simple React app with a counter button.");
  const [isRunning, setIsRunning] = useState(false);
  const { files, openTabs, activeTab, status } = useIdeState();

  const handleRunAgent = async () => {
    if (isRunning || !prompt) return;
    setIsRunning(true);
    await runAgent(prompt);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white font-mono text-sm">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-cyan-400">MominAI - Live Agent Runtime</h1>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-grow bg-gray-900 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Enter a prompt for the AI agent..."
          />
          <button
            onClick={handleRunAgent}
            disabled={isRunning}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-bold py-1 px-4 rounded"
          >
            {isRunning ? "Running..." : "Run Agent"}
          </button>
        </div>
        <div className="mt-2 text-gray-400">
          <strong>Status:</strong> {status}
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Panel 1: File Tree */}
        <div className="w-1/4 border-r border-gray-700 p-4 overflow-y-auto">
          <h2 className="font-bold mb-2">File System</h2>
          <ul>
            {Object.keys(files).length > 0 ? (
              Object.keys(files).sort().map((path) => (
                <li key={path} className={`truncate ${activeTab === path ? 'text-cyan-400' : ''}`}>
                  - {path}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No files created yet.</li>
            )}
          </ul>
        </div>

        {/* Panel 2: Code Editor */}
        <div className="w-3/4 flex flex-col">
          <div className="flex border-b border-gray-700">
            {(openTabs as string[]).map((tab: string) => (
              <div
                key={tab}
                className={`px-4 py-2 border-r border-gray-700 cursor-pointer ${
                  activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {tab.split('/').pop()}
              </div>
            ))}
          </div>
          <div className="flex-grow bg-gray-900 p-4 overflow-y-auto">
            <pre className="whitespace-pre-wrap">
              {activeTab && files[activeTab] !== undefined
                ? files[activeTab]
                : "// Select a file to view its content"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
