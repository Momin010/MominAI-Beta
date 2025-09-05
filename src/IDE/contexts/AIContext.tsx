
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Message, EditorAIAction, FileSystemNode, EditorActionCommand } from '../types';
import { streamAIActions } from '../services/aiService.ts';
import * as editorAgent from '../services/editorAgent.ts';
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
        if (isLoading || !fs || !editorInstance) {
            toast.error('AI Agent is not ready. Please wait.');
            return;
        }
        if (!geminiApiKey) {
            toast.error('Please set your Gemini API key in the settings to use AI features.');
            setActiveTab('settings');
            return;
        }
        setIsLoading(true);

        const getAllFiles = (node: FileSystemNode | null, currentPath: string): {path: string, content: string}[] => {
            if (!node) return [];
            const files: {path: string, content: string}[] = [];
            if (node.type === 'file' && node.content) {
                files.push({ path: currentPath, content: node.content });
            } else if (node.type === 'directory' && node.children) {
                Object.entries(node.children).forEach(([name, child]) => {
                    files.push(...getAllFiles(child, currentPath + '/' + name));
                });
            }
            return files;
        };

        const allFiles = getAllFiles(fs, '/');
        const userMessage: Message = { sender: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);

        try {
            const actionStream = streamAIActions(prompt, allFiles, geminiApiKey);

            for await (const action of actionStream) {
                switch (action.action) {
                    case 'openFile':
                        if (action.path) setActiveTab(action.path);
                        // Brief pause to allow editor to switch models
                        await new Promise(resolve => setTimeout(resolve, 100));
                        break;
                    case 'createFile':
                        if (action.path) {
                            await createNode(action.path, 'file', action.content);
                            setActiveTab(action.path);
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                        break;
                    case 'type':
                        if (action.text) await editorAgent.typeText(editorInstance, action.text);
                        break;
                    case 'moveCursor':
                        if (action.line !== undefined && action.column !== undefined) {
                            await editorAgent.moveCursor(editorInstance, action.line, action.column);
                        }
                        break;
                    case 'delete':
                        if (action.lines !== undefined) await editorAgent.deleteText(editorInstance, action.lines);
                        break;
                    case 'select':
                        if (action.startLine !== undefined && action.startColumn !== undefined &&
                            action.endLine !== undefined && action.endColumn !== undefined) {
                            await editorAgent.selectText(editorInstance, action.startLine, action.startColumn, action.endLine, action.endColumn);
                        }
                        break;
                    case 'replace':
                         if (action.text) await editorAgent.replaceText(editorInstance, action.text);
                        break;
                    case 'comment':
                        if (action.text) setMessages(prev => [...prev, { sender: 'ai', text: action.text! }]);
                        break;
                    case 'finish':
                        setMessages(prev => [...prev, { sender: 'ai', text: action.text ?? 'Task completed' }]);
                        setIsLoading(false);
                        return; // End of operation
                    default:
                        console.warn('Unknown AI action:', action);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred with the AI agent.";
            toast.error(message);
            setMessages(prev => [...prev, {sender: 'ai', text: `An error occurred: ${message}`}]);
        } finally {
            setIsLoading(false);
        }

    }, [isLoading, fs, geminiApiKey, editorInstance, createNode, setActiveTab]);

    const performEditorAction = useCallback(async (action: EditorAIAction, code: string, filePath: string) => {
        // This function can now be simplified or routed through the main agent
        toast('This action is now handled by the main AI chat. Please ask the assistant directly.', { icon: 'ℹ️' })
    }, []);


    const value = { messages, isLoading, sendMessage, performEditorAction, geminiApiKey, createNode, openFile };

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};