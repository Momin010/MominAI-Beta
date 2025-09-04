import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EditorState } from '../lib/editor-agent';
import FileTree, { FileNode } from './FileTree';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Mode = 'editor' | 'preview';

interface EditorPanelProps {
  editorState: EditorState;
  onStateChange: (state: EditorState) => void;
  isExecutingCommands?: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  projectFiles?: FileNode[];
  onFileSelect?: (filePath: string) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  editorState,
  onStateChange,
  isExecutingCommands = false,
  mode,
  onModeChange,
  projectFiles = [],
  onFileSelect
}) => {
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);

  const handleModeChange = (newMode: Mode) => {
    onModeChange(newMode);
  };

  const handleFileSelect = (filePath: string) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  return (
    <div className={`h-full flex flex-col backdrop-blur-xl bg-white/10 rounded-2xl p-4 border transition-all duration-300 ${
      isExecutingCommands
        ? 'border-blue-400 shadow-lg shadow-blue-400/20 bg-white/15'
        : 'border-white/10'
    }`}>
      {/* Header with Toggle and File Tree Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-full p-1 border border-white/20">
          <div className="flex">
            <button
              onClick={() => handleModeChange('editor')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'editor'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => handleModeChange('preview')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'preview'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* File Tree Toggle Button */}
        <button
          onClick={() => setIsFileTreeCollapsed(!isFileTreeCollapsed)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title={isFileTreeCollapsed ? "Show File Tree" : "Hide File Tree"}
        >
          {isFileTreeCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content Area with Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {!isFileTreeCollapsed && (
          <div className="w-64 border-r border-white/10 mr-4">
            <FileTree
              files={projectFiles}
              onFileSelect={handleFileSelect}
              selectedFile={editorState.currentFile}
              className="h-full"
            />
          </div>
        )}

        {/* Editor/Preview Area */}
        <div className="flex-1 overflow-hidden">
          {mode === 'editor' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <textarea
                value={editorState.code}
                onChange={(e) => onStateChange({ ...editorState, code: e.target.value })}
                className="w-full h-full resize-none rounded-lg border border-white/20 bg-white/5 backdrop-blur-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 font-mono text-sm"
                placeholder="Write your code here..."
                spellCheck={false}
              />
            </motion.div>
          ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <iframe
                  srcDoc={editorState.code}
                  className="w-full h-full bg-white rounded-lg border border-white/20"
                  title="Code Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </motion.div>
            )}
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;