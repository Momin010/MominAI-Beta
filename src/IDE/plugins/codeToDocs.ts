

import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { generateDocsForCode } from '../services/aiService';

const EDITOR_ACTION_ID = 'code-to-docs';

export const codeToDocsPlugin: Plugin = {
    id: 'code-to-docs',
    name: 'Code to Docs Generator',
    description: 'Generates Markdown documentation for the current file.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: EDITOR_ACTION_ID,
            label: 'AI: Generate Documentation for Current File',
            category: 'AI',
            action: async () => {
                const filePath = api.getActiveFile();
                if (!filePath || filePath.endsWith('.md')) {
                    api.showNotification({ type: 'warning', message: 'This command can only be run on non-markdown files.' });
                    return;
                }
                const content = api.getOpenFileContent();
                api.showNotification({ type: 'info', message: 'Generating documentation...' });
                try {
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    if (!filePath) {
                        api.showNotification({ type: 'error', message: 'No active file to generate docs for.' });
                        return;
                    }
                    const filePathStr = filePath as string;
                    const docContent = await generateDocsForCode(content, filePathStr, apiKey);
                    const docPath = filePathStr.substring(0, filePathStr.lastIndexOf('.')) + '.md';
                    api.createNode(docPath, 'file', docContent);
                    api.showNotification({ type: 'success', message: `Documentation created at ${docPath}` });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to generate docs.";
                    api.showNotification({ type: 'error', message });
                }
            },
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand(EDITOR_ACTION_ID);
    },
};
