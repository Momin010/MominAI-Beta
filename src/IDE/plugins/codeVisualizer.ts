

import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { generateMermaidDiagram } from '../services/aiService';

const EDITOR_ACTION_ID = 'code-visualizer';

export const codeVisualizerPlugin: Plugin = {
    id: 'code-visualizer',
    name: 'Code Visualizer',
    description: 'Generates a diagram to visualize the selected code.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: EDITOR_ACTION_ID,
            label: 'AI: Visualize Current File',
            category: 'AI',
            action: async () => {
                const filePath = api.getActiveFile();
                const content = api.getOpenFileContent();
                const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
                if (!filePath || !content || content.trim().length === 0 || !supportedExtensions.some(ext => filePath.endsWith(ext))) {
                    api.showNotification({type: 'warning', message: 'Can only visualize non-empty JS/TS files.'});
                    return;
                }

                api.showNotification({ type: 'info', message: 'Generating diagram...' });
                 try {
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    const mermaidCode = await generateMermaidDiagram(content, apiKey);
                    api.showInPreview(`Visualization: ${filePath.split('/').pop()}`, mermaidCode);
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to generate diagram.";
                    api.showNotification({ type: 'error', message });
                }
            },
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand(EDITOR_ACTION_ID);
    },
};
