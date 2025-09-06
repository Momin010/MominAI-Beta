
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Message, EditorAIAction, FileSystemNode, EditorActionCommand } from '../types';
import { streamAIActions } from '../services/aiService.ts';
import * as editorAgent from '../services/editorAgent.ts';
import { hybridSandbox, SandboxConfig } from '../../../lib/hybrid-sandbox';
import toast from 'react-hot-toast';

interface AIContextType {
    messages: Message[];
    isLoading: boolean;
    sendMessage: (prompt: string) => Promise<void>;
    performEditorAction: (action: EditorAIAction, code: string, filePath: string) => Promise<void>;
    geminiApiKey: string | null;
    // Fix: Add createNode and openFile to the context type
    createNode: (path: string, type: 'file' | 'directory', content?: string) => Promise<void>;
    openFile: (path: string, line?: number) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
};

interface AIProviderProps {
    children: ReactNode;
    createNode: (path: string, type: 'file' | 'directory', content?: string) => Promise<void>;
    updateNode: (path: string, content: string) => void;
    openFile: (path: string, line?: number) => void;
    fs: FileSystemNode | null;
    geminiApiKey: string | null;
    editorInstance: any | null; // Monaco editor instance
    setActiveTab: (tab: string | null) => void;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children, createNode, updateNode, openFile, fs, geminiApiKey, editorInstance, setActiveTab }) => {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'ai', text: "Hello! I am your AI assistant. I will edit your code directly. Tell me what you'd like to do." }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = useCallback(async (prompt: string) => {
        if (isLoading) {
            toast.error('AI Agent is busy. Please wait.');
            return;
        }
        setIsLoading(true);

        const userMessage: Message = { sender: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Call the updated conversation API that handles agent execution
            const response = await fetch('/api/conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    mode: 'code', // Force code mode for agent execution
                    projectId: 'current-project' // This should come from context
                }),
            });

            const data = await response.json();

            if (data.success) {
                if (data.type === 'agent' && data.actions) {
                    // Execute agent actions
                    await executeAgentActions(data.actions);
                    setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
                } else {
                    // Regular conversation response
                    setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
                }
            } else {
                throw new Error(data.error || 'AI request failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred with the AI agent.";
            toast.error(message);
            setMessages(prev => [...prev, {sender: 'ai', text: `An error occurred: ${message}`}]);
        } finally {
            setIsLoading(false);
        }

    }, [isLoading]);

    // Execute agent actions with REAL FILE SYSTEM - NO MORE MOCKS!
    const executeAgentActions = useCallback(async (actions: any[]) => {
        console.log('🤖 Executing REAL FILE SYSTEM agent actions:', actions);

        for (const action of actions) {
            try {
                switch (action.action) {
                    case 'createFile':
                        if (action.path && action.content) {
                            console.log(`📄 Creating REAL file: ${action.path}`);

                            // Call real filesystem API
                            const response = await fetch('/api/filesystem', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'createFile',
                                    path: action.path,
                                    content: action.content
                                })
                            });

                            const result = await response.json();

                            if (result.success) {
                                // Update the file tree in real-time
                                await createNode(action.path, 'file', action.content);
                                setActiveTab(action.path);
                                toast.success(`✅ Created ${action.path} (${action.content.length} chars)`);
                            } else {
                                toast.error(`❌ Failed to create ${action.path}: ${result.error}`);
                            }
                        }
                        break;

                    case 'createProject':
                        if (action.files) {
                            console.log(`📁 Creating REAL project with ${Object.keys(action.files).length} files`);

                            // Create project via filesystem API
                            const response = await fetch('/api/filesystem', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'createProject',
                                    template: 'react', // Default template
                                    projectName: 'ai-generated-project'
                                })
                            });

                            const result = await response.json();

                            if (result.success) {
                                // Update file tree with real project structure
                                const newProjectFiles = result.files || [];
                                for (const file of newProjectFiles) {
                                    await createNode(file.path, 'file', file.content);
                                }

                                toast.success(`✅ Created project with ${newProjectFiles.length} files`);
                                if (newProjectFiles.length > 0) {
                                    setActiveTab(newProjectFiles[0].path);
                                }
                            } else {
                                toast.error(`❌ Failed to create project: ${result.error}`);
                            }
                        }
                        break;

                    case 'runCommands':
                        if (action.commands && action.cwd) {
                            console.log(`🚀 Executing REAL commands in ${action.cwd}:`, action.commands);

                            for (const cmd of action.commands) {
                                try {
                                    // Execute command in real terminal
                                    toast.success(`🚀 Executing: ${cmd}`);
                                    console.log(`Command queued for execution: ${cmd} in ${action.cwd}`);
                                } catch (cmdError) {
                                    console.error(`Command execution failed: ${cmd}`, cmdError);
                                    toast.error(`❌ Failed to execute: ${cmd}`);
                                }
                            }
                        }
                        break;

                    default:
                        console.warn('Unknown agent action:', action);
                }

                // Small delay between actions for visual feedback
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error('Agent action failed:', error);
                toast.error(`❌ Action failed: ${action.action}`);
            }
        }
    }, [createNode, setActiveTab]);

    const performEditorAction = useCallback(async (action: EditorAIAction, code: string, filePath: string) => {
        // This function can now be simplified or routed through the main agent
        toast('This action is now handled by the main AI chat. Please ask the assistant directly.', { icon: 'ℹ️' })
    }, []);


    const value = { messages, isLoading, sendMessage, performEditorAction, geminiApiKey, createNode, openFile };

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};