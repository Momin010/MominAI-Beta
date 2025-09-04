
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Message, EditorAIAction, FileSystemNode, EditorActionCommand } from '../types';
import { streamAIActions } from '../services/aiService.ts';
import * as editorAgent from '../services/editorAgent.ts';
import { useNotifications } from '../App.tsx';
import { getAllFiles } from '../utils/fsUtils.ts';

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
    const { addNotification } = useNotifications();

    const sendMessage = useCallback(async (prompt: string) => {
        if (isLoading || !fs || !editorInstance) {
            addNotification({ type: 'warning', message: 'AI Agent is not ready. Please wait.'});
            return;
        }
        if (!geminiApiKey) {
            addNotification({ type: 'error', message: 'Please set your Gemini API key in the settings to use AI features.' });
            setActiveTab('settings');
            return;
        }
        setIsLoading(true);

        const allFiles = getAllFiles(fs, '/');
        const userMessage: Message = { sender: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);

        try {
            const actionStream = streamAIActions(prompt, allFiles, geminiApiKey);

            for await (const action of actionStream) {
                switch (action.action) {
                    case 'openFile':
                        setActiveTab(action.path);
                        // Brief pause to allow editor to switch models
                        await new Promise(resolve => setTimeout(resolve, 100));
                        break;
                    case 'createFile':
                        await createNode(action.path, 'file', action.content);
                        setActiveTab(action.path);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        break;
                    case 'type':
                        await editorAgent.typeText(editorInstance, action.text);
                        break;
                    case 'moveCursor':
                        await editorAgent.moveCursor(editorInstance, action.line, action.column);
                        break;
                    case 'delete':
                        await editorAgent.deleteText(editorInstance, action.lines);
                        break;
                    case 'select':
                        await editorAgent.selectText(editorInstance, action.startLine, action.startColumn, action.endLine, action.endColumn);
                        break;
                    case 'replace':
                         await editorAgent.replaceText(editorInstance, action.text);
                        break;
                    case 'comment':
                        setMessages(prev => [...prev, { sender: 'ai', text: action.text }]);
                        break;
                    case 'finish':
                        setMessages(prev => [...prev, { sender: 'ai', text: action.reason }]);
                        setIsLoading(false);
                        return; // End of operation
                    default:
                        console.warn('Unknown AI action:', action);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred with the AI agent.";
            addNotification({ type: 'error', message });
            setMessages(prev => [...prev, {sender: 'ai', text: `An error occurred: ${message}`}]);
        } finally {
            setIsLoading(false);
        }

    }, [isLoading, fs, geminiApiKey, addNotification, editorInstance, createNode, setActiveTab]);

    const performEditorAction = useCallback(async (action: EditorAIAction, code: string, filePath: string) => {
        // This function can now be simplified or routed through the main agent
        addNotification({ type: 'info', message: 'This action is now handled by the main AI chat. Please ask the assistant directly.'})
    }, [addNotification]);


    const value = { messages, isLoading, sendMessage, performEditorAction, geminiApiKey, createNode, openFile };

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};