

import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { generateTestFile } from '../services/aiService';

const EDITOR_ACTION_ID = 'test-generator';

export const testGeneratorPlugin: Plugin = {
    id: 'test-generator',
    name: 'AI Test Generator',
    description: 'Generates a test file for the current file.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: EDITOR_ACTION_ID,
            label: 'AI: Generate Test File for Current File',
            category: 'AI',
            action: async () => {
                const filePath = api.getActiveFile();
                const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
                if (!filePath || !supportedExtensions.some(ext => filePath.endsWith(ext))) {
                    api.showNotification({ type: 'warning', message: 'Can only generate tests for JS/TS files.'});
                    return;
                }

                const content = api.getOpenFileContent() ?? '';
                api.showNotification({ type: 'info', message: `Generating tests for ${filePath.split('/').pop()}...` });
                try {
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    if (typeof filePath !== 'string') {
                        api.showNotification({ type: 'error', message: 'No active file to generate tests for.' });
                        return;
                    }
                    const testContent = await generateTestFile(content, filePath, apiKey);
                    const extension = filePath.substring(filePath.lastIndexOf('.'));
                    const testPath = filePath.replace(extension, `.test${extension}`);
                    api.createNode(testPath, 'file', testContent);
                    api.showNotification({ type: 'success', message: `Test file created at ${testPath}` });

                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to generate tests.";
                    api.showNotification({ type: 'error', message });
                }
            },
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand(EDITOR_ACTION_ID);
    },
};
