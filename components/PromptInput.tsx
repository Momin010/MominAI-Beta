import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Send, Code, MessageSquare, Building } from 'lucide-react';
import { EditorAgent, EditorCommand, executeEditorCommands } from '../lib/editor-agent';
import { getConversationalResponse } from '../src/IDE/services/aiService';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  user_id?: string;
  created_at: string;
}

type AIMode = 'ask' | 'code' | 'architect';

interface TaskCommand {
  action: 'createTask' | 'updateTask' | 'deleteTask';
  title?: string;
  description?: string;
  id?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

interface ProjectCommand {
  action: 'createProject';
  template: string;
  projectName: string;
}

interface PromptInputProps {
  addMessage: (message: Message) => void;
  setIsSubmitting?: (submitting: boolean) => void;
  editorAgent: EditorAgent;
  executeCommands: (commands: EditorCommand[]) => Promise<void>;
  onModeChange?: (mode: AIMode) => void;
  onTaskCommand?: (command: TaskCommand) => void;
  onProjectCommand?: (command: ProjectCommand) => void;
  currentMode?: AIMode;
  onPermissionResponse?: (granted: boolean, commands: EditorCommand[], taskCommands: TaskCommand[], projectCommands: ProjectCommand[]) => void;
  setBackgroundProcessing?: (processing: boolean) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ addMessage, setIsSubmitting, editorAgent, executeCommands, onModeChange, onTaskCommand, onProjectCommand, currentMode: propCurrentMode, onPermissionResponse, setBackgroundProcessing }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [waitingForPermission, setWaitingForPermission] = useState(false);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);

  // Use prop currentMode or default to 'code'
  const currentMode = propCurrentMode || 'code';

  // Use a generic user ID for non-authenticated usage
  const userId = 'anonymous-user';

  const modeConfig = {
    ask: {
      icon: MessageSquare,
      label: 'Ask',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      description: 'Conversational AI'
    },
    code: {
      icon: Code,
      label: 'Code',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      description: 'Programming Assistant'
    },
    architect: {
      icon: Building,
      label: 'Architect',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      description: 'Planning & Tasks'
    }
  };

  const currentModeConfig = modeConfig[currentMode];

  // Helper function to parse mixed response containing JSON commands and text
  const parseResponse = (response: string) => {
    let conversationalText = response;
    let commands: EditorCommand[] = [];
    let taskCommands: TaskCommand[] = [];
    let projectCommands: ProjectCommand[] = [];

    // Extract JSON blocks from the response
    const jsonRegex = /(\[[\s\S]*?\]|\{[\s\S]*?\})/g;
    const jsonMatches = response.match(jsonRegex);

    if (jsonMatches) {
      for (const jsonMatch of jsonMatches) {
        try {
          const parsed = JSON.parse(jsonMatch);

          if (Array.isArray(parsed)) {
            // Handle array of commands
            const editorCmds = parsed.filter(cmd => cmd.action && ['openFile', 'type', 'moveCursor', 'select', 'comment', 'finish'].includes(cmd.action));
            const taskCmds = parsed.filter(cmd => cmd.action && ['createTask', 'updateTask', 'deleteTask'].includes(cmd.action));
            const projectCmds = parsed.filter(cmd => cmd.action === 'createProject');

            commands.push(...editorCmds);
            taskCommands.push(...taskCmds);
            projectCommands.push(...projectCmds);
          } else if (parsed.action) {
            // Handle single command
            if (['openFile', 'type', 'moveCursor', 'select', 'comment', 'finish'].includes(parsed.action)) {
              commands.push(parsed);
            } else if (['createTask', 'updateTask', 'deleteTask'].includes(parsed.action)) {
              taskCommands.push(parsed);
            } else if (parsed.action === 'createProject') {
              projectCommands.push(parsed);
            }
          }

          // Remove the JSON from conversational text
          conversationalText = conversationalText.replace(jsonMatch, '').trim();
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    }

    // Clean up conversational text (remove extra whitespace, empty lines)
    conversationalText = conversationalText.replace(/\n\s*\n/g, '\n').trim();

    return { conversationalText, commands, taskCommands, projectCommands };
  };

  // Request permission for multi-file projects
  const requestMultiFilePermission = async (commands: EditorCommand[], taskCommands: TaskCommand[], projectCommands: ProjectCommand[]): Promise<boolean> => {
    setWaitingForPermission(true);

    const permissionMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: "I'd like to create a complete project with multiple files for you. Is it possible that I can code in different files for this project?",
      created_at: new Date().toISOString(),
    };
    addMessage(permissionMessage);

    // Wait for user response via callback
    return new Promise((resolve) => {
      const handlePermissionResponse = (granted: boolean) => {
        setWaitingForPermission(false);
        if (granted) {
          executeCommandsInBackground(commands, taskCommands, projectCommands);
        }
        resolve(granted);
      };

      // Store the pending commands for later execution
      if (onPermissionResponse) {
        onPermissionResponse(true, commands, taskCommands, projectCommands);
      }

      // For demo purposes, auto-approve after a delay
      // In real implementation, this would wait for actual user input
      setTimeout(() => {
        handlePermissionResponse(true);
      }, 2000);
    });
  };

  // Execute commands in background
  const executeCommandsInBackground = async (commands: EditorCommand[], taskCommands: TaskCommand[], projectCommands: ProjectCommand[]) => {
    setIsBackgroundProcessing(true);
    setBackgroundProcessing?.(true);

    try {
      // Execute editor commands
      if (commands.length > 0) {
        await executeCommands(commands);
      }

      // Execute task commands
      if (taskCommands.length > 0) {
        taskCommands.forEach(cmd => onTaskCommand?.(cmd));

        // Auto-switch to Code mode when task status changes to in_progress
        const inProgressTask = taskCommands.find(cmd => cmd.action === 'updateTask' && cmd.status === 'in_progress');
        if (inProgressTask) {
          onModeChange?.('code');
        }
      }

      // Execute project commands
      if (projectCommands.length > 0) {
        projectCommands.forEach(cmd => onProjectCommand?.(cmd));
      }

      console.log('Background commands executed successfully');

      // Show success message
      const successMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: "Perfect! I've successfully created your project with multiple components and files.",
        created_at: new Date().toISOString(),
      };
      addMessage(successMessage);

    } catch (error) {
      console.error('Error executing background commands:', error);

      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: "I encountered an error while creating the files. Please try again or let me know if you need help with something else.",
        created_at: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setIsBackgroundProcessing(false);
      setBackgroundProcessing?.(false);
    }
  };

  // Click outside handler for mode selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
        setShowModeSelector(false);
      }
    };

    if (showModeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeSelector]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-expand
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const submitPrompt = async (promptText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: promptText,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    addMessage(userMessage);

    try {
      // Call AI through Gemini service
      const apiKey = process.env.GEMINI_API_KEY || null;
      const result = await getConversationalResponse(promptText, currentMode, apiKey);

      // Parse response to extract JSON commands and conversational text
      const { conversationalText, commands, taskCommands, projectCommands } = parseResponse(result);

      // Check if this involves multi-file project creation
      const hasMultiFileProject = projectCommands.length > 0 || (commands.length > 3); // More than 3 commands likely indicates multi-file

      if (hasMultiFileProject) {
        const permissionGranted = await requestMultiFilePermission(commands, taskCommands, projectCommands);
        if (!permissionGranted) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: "I understand you'd like me to create a project with multiple files. Let me know if you'd like me to proceed!",
            created_at: new Date().toISOString(),
          };
          addMessage(aiMessage);
          return;
        }
        // Commands are already executed in requestMultiFilePermission if granted
      } else {
        // Execute commands in background for non-multi-file operations
        if (commands.length > 0 || taskCommands.length > 0 || projectCommands.length > 0) {
          executeCommandsInBackground(commands, taskCommands, projectCommands);
        }
      }

      // Show only conversational response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: conversationalText || "I've processed your request and executed the necessary commands in the background.",
        created_at: new Date().toISOString(),
      };
      addMessage(aiMessage);

      try {
        toast.success('Gemini response received successfully!');
      } catch (toastError) {
        console.log('Success: Gemini response received successfully!');
      }
      setLastError(null);
      setCanRetry(false);
    } catch (err) {
      console.error('Gemini API Error:', err);

      let errorMessage = 'An unexpected error occurred';
      let errorType = 'unknown';
      let shouldAllowRetry = true;

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        if (message.includes('api key') || message.includes('authorization') || message.includes('invalid')) {
          errorMessage = 'API key is invalid or missing. Please check your Gemini API key configuration.';
          errorType = 'auth';
          shouldAllowRetry = false;
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
          errorType = 'network';
        } else if (message.includes('rate limit') || message.includes('429')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
          errorType = 'rate_limit';
        } else if (message.includes('model') && message.includes('not found')) {
          errorMessage = 'The requested model is not available. Please try a different model.';
          errorType = 'model';
          shouldAllowRetry = false;
        } else if (message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
          errorType = 'timeout';
        } else {
          errorMessage = err.message;
          errorType = 'api_error';
        }
      }

      console.error(`Error type: ${errorType}, Message: ${errorMessage}`);
      setLastError(errorMessage);
      setCanRetry(shouldAllowRetry);
      try {
        toast.error(errorMessage);
      } catch (toastError) {
        console.error('Failed to show toast notification:', toastError);
        // Error is already displayed in the UI via lastError state
      }
    }
  };

  const handleSubmit = async () => {
    if (input.trim()) {
      setIsLoading(true);
      setIsSubmitting?.(true);
      setLastError(null);
      setCanRetry(false);

      try {
        await submitPrompt(input.trim());
      } finally {
        setIsLoading(false);
        setIsSubmitting?.(false);
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const handleRetry = async () => {
    if (lastError && canRetry) {
      setIsLoading(true);
      setIsSubmitting?.(true);

      try {
        await submitPrompt(input.trim());
      } finally {
        setIsLoading(false);
        setIsSubmitting?.(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="backdrop-blur-xl bg-white/10 rounded-lg p-4 border border-white/10"
    >
      {lastError && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm mb-2">{lastError}</p>
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-xs rounded transition-colors"
            >
              {isLoading ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      )}
      <div className="flex items-end space-x-2">
        {/* Mode Selector */}
        <div ref={modeSelectorRef} className="relative">
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${currentModeConfig.bgColor} ${currentModeConfig.color} border border-white/20 hover:bg-opacity-30`}
          >
            <currentModeConfig.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{currentModeConfig.label}</span>
          </button>

          {showModeSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full mb-2 left-0 w-48 bg-black/90 backdrop-blur-xl rounded-lg border border-white/20 shadow-xl z-10"
            >
              {Object.entries(modeConfig).map(([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => {
                    setShowModeSelector(false);
                    onModeChange?.(mode as AIMode);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                    currentMode === mode ? 'bg-white/20' : ''
                  }`}
                >
                  <config.icon className={`w-4 h-4 ${config.color}`} />
                  <div>
                    <div className={`text-sm font-medium ${config.color}`}>{config.label}</div>
                    <div className="text-xs text-white/60">{config.description}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Enter your prompt..."
            className="w-full resize-none rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 backdrop-blur-xl bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white rounded-lg transition-colors flex items-center space-x-2 border border-white/20"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default PromptInput;