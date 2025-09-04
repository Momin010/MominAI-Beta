import Head from 'next/head'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ChatArea from '../components/ChatArea'
import PromptInput from '../components/PromptInput'
import EditorPanel from '../components/EditorPanel'
import TaskManager from '../components/TaskManager'
import Terminal from '../components/Terminal'
import LoadingIndicator from '../components/LoadingIndicator'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { EditorAgent, EditorState, EditorCommand, executeEditorCommands } from '../lib/editor-agent'
import { FileNode } from '../components/FileTree'
import { ProjectManager } from '../lib/project-manager'

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  user_id?: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
}

export default function Home() {
  const userId = 'anonymous-user'; // Generic user ID for non-authenticated usage
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskManager, setShowTaskManager] = useState(false);

  // AI Mode state
  const [currentAIMode, setCurrentAIMode] = useState<'ask' | 'code' | 'architect'>('code');

  // Editor state
  const [editorState, setEditorState] = useState<EditorState>({
    currentFile: 'untitled.js',
    code: '// Welcome to the Editor\n// Write your code here\n\nconsole.log(\'Hello, World!\');',
    cursorLine: 0,
    cursorColumn: 0,
    selectionStart: 0,
    selectionEnd: 0,
  });

  // Editor mode state
  const [editorMode, setEditorMode] = useState<'editor' | 'preview'>('editor');

  // Command execution state
  const [isExecutingCommands, setIsExecutingCommands] = useState(false);

  // Project files state
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([
    {
      name: 'src',
      path: 'src',
      type: 'folder',
      isExpanded: true,
      children: [
        {
          name: 'components',
          path: 'src/components',
          type: 'folder',
          isExpanded: false,
          children: [
            { name: 'App.tsx', path: 'src/components/App.tsx', type: 'file' },
            { name: 'Header.tsx', path: 'src/components/Header.tsx', type: 'file' }
          ]
        },
        { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
        { name: 'index.tsx', path: 'src/index.tsx', type: 'file' },
        { name: 'styles.css', path: 'src/styles.css', type: 'file' }
      ]
    },
    { name: 'package.json', path: 'package.json', type: 'file' },
    { name: 'README.md', path: 'README.md', type: 'file' }
  ]);

  // Terminal state
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');

  // Loading and status state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [projectStatus, setProjectStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Background processing state
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);

  // Callback to execute commands and update state
  const executeCommands = async (commands: EditorCommand[]) => {
    setIsExecutingCommands(true);
    try {
      await executeEditorCommands(commands, editorAgent);
    } finally {
      setIsExecutingCommands(false);
    }
  };

  // Create editor agent
  const [editorAgent] = useState(() => new EditorAgent(editorState, setEditorState, () => setEditorMode('preview')));

  // File selection handler
  const handleFileSelect = (filePath: string) => {
    // For now, simulate opening a file by updating the editor state
    const fileName = filePath.split('/').pop() || filePath;
    setEditorState(prev => ({
      ...prev,
      currentFile: filePath,
      code: `// Opened file: ${fileName}\n// Path: ${filePath}\n\nconsole.log('File opened successfully!');`
    }));
  };

  // Terminal command handler
  const handleTerminalCommand = (command: string, output: string) => {
    setTerminalOutput(output);
    // Show terminal when commands are executed
    if (!isTerminalVisible) {
      setIsTerminalVisible(true);
    }
  };

  // Project command handler
  const handleProjectCommand = async (command: any) => {
    if (command.action === 'createProject') {
      setIsLoading(true);
      setLoadingMessage(`Creating ${command.template} project: ${command.projectName}`);
      setProjectStatus({ type: null, message: '' });

      try {
        // Call the filesystem API to create the project
        const response = await fetch('/api/filesystem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'createProject',
            template: command.template,
            projectName: command.projectName
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create project');
        }

        const result = await response.json();

        // Update the project files state with the new project structure
        const newProjectFiles = ProjectManager.filesToFileNodes(result.files);
        setProjectFiles(prev => [...prev, ...newProjectFiles]);

        // Show success status
        setProjectStatus({
          type: 'success',
          message: `Project "${command.projectName}" created successfully!`
        });

        // Clear loading after a delay
        setTimeout(() => {
          setIsLoading(false);
          setLoadingMessage('');
        }, 2000);

        // Show terminal for npm install
        if (!isTerminalVisible) {
          setIsTerminalVisible(true);
        }
      } catch (error) {
        console.error('Error creating project:', error);
        setProjectStatus({
          type: 'error',
          message: `Failed to create project: ${error}`
        });
        setIsLoading(false);
        setLoadingMessage('');
      }
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Task management handlers
  const handleTaskAdd = (taskData: Omit<Task, 'id' | 'created_at'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));

    // Auto-switch to Code mode when task status changes to in_progress
    if (updates.status === 'in_progress') {
      // This will be handled by the PromptInput component's mode change callback
      // The UI will update to show Code mode automatically
    }
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleTaskCommand = (command: any) => {
    switch (command.action) {
      case 'createTask':
        handleTaskAdd({
          title: command.title || 'New Task',
          description: command.description,
          status: 'pending'
        });
        break;
      case 'updateTask':
        if (command.id) {
          handleTaskUpdate(command.id, { status: command.status });
        }
        break;
      case 'deleteTask':
        if (command.id) {
          handleTaskDelete(command.id);
        }
        break;
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600">
      <Head>
        <title>MominAI Sandbox</title>
      </Head>
      <div className="flex flex-col h-screen">
        {/* Loading Indicator */}
        <LoadingIndicator
          isLoading={isLoading}
          message={loadingMessage}
          type={projectStatus.type === 'success' ? 'success' : projectStatus.type === 'error' ? 'error' : 'spinner'}
        />

        {feedbackMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-lg backdrop-blur-xl bg-white/10 ${feedbackType === 'success' ? 'text-green-300' : 'text-red-300'}`}>
            {feedbackMessage}
          </div>
        )}
        <div className="flex-1 p-4">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left Panel: Chat */}
            <Panel defaultSize={50} minSize={20} className="pr-2">
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 flex flex-col h-full">
                {/* Task Manager - shown when in architect mode */}
                <div className="mb-4">
                  <TaskManager
                    tasks={tasks}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskAdd={handleTaskAdd}
                    onTaskDelete={handleTaskDelete}
                    isVisible={showTaskManager}
                    onToggleVisibility={() => setShowTaskManager(!showTaskManager)}
                  />
                </div>

                <ChatArea
                  messages={messages}
                  submitting={isSubmitting}
                  currentUserId={userId}
                  onNewMessage={addMessage}
                  backgroundProcessing={backgroundProcessing}
                />
                <div className="mt-4">
                  <PromptInput
                    addMessage={addMessage}
                    setIsSubmitting={setIsSubmitting}
                    editorAgent={editorAgent}
                    executeCommands={executeCommands}
                    currentMode={currentAIMode}
                    onModeChange={(mode) => {
                      setCurrentAIMode(mode);
                      // Show task manager when switching to architect mode
                      setShowTaskManager(mode === 'architect');
                    }}
                    onTaskCommand={handleTaskCommand}
                    onProjectCommand={handleProjectCommand}
                    onPermissionResponse={(granted, commands, taskCommands, projectCommands) => {
                      if (granted) {
                        // Handle permission granted - this would be called from PromptInput
                        console.log('Permission granted for multi-file project');
                      }
                    }}
                    setBackgroundProcessing={setBackgroundProcessing}
                  />
                </div>
              </div>
            </Panel>
            {/* Resize Handle */}
            <PanelResizeHandle className="w-2 bg-white/10 backdrop-blur-xl rounded-full mx-1 transition-all duration-300 hover:bg-white/20 hover:w-3 cursor-col-resize hidden md:block" />
            {/* Right Panel: Editor */}
            <Panel defaultSize={50} minSize={20} className="pl-2">
              <EditorPanel
                editorState={editorState}
                onStateChange={setEditorState}
                isExecutingCommands={isExecutingCommands}
                mode={editorMode}
                onModeChange={setEditorMode}
                projectFiles={projectFiles}
                onFileSelect={handleFileSelect}
              />
            </Panel>
          </PanelGroup>
        </div>

        {/* Terminal Panel */}
        <div className="mt-4">
          <Terminal
            isVisible={isTerminalVisible}
            onToggleVisibility={() => setIsTerminalVisible(!isTerminalVisible)}
            onCommandExecute={handleTerminalCommand}
          />
        </div>
      </div>
    </div>
  )
}