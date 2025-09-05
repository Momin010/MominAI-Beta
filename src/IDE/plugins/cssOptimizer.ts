

import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { optimizeCss } from '../services/aiService';

const EDITOR_ACTION_ID = 'css-optimizer';

export const cssOptimizerPlugin: Plugin = {
    id: 'css-optimizer',
    name: 'CSS Optimizer',
    description: 'Uses AI to optimize and refactor your CSS file.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: EDITOR_ACTION_ID,
            label: 'AI: Optimize Current CSS File',
            category: 'AI',
            action: async () => {
                const filePath = api.getActiveFile();
                if (!filePath || !filePath.endsWith('.css')) {
                    api.showNotification({ type: 'warning', message: 'This command only works on CSS files.'});
                    return;
                }

                const content = api.getOpenFileContent();
                api.showNotification({ type: 'info', message: 'Optimizing CSS...' });
                try {
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    if (typeof content !== 'string') {
                        api.showNotification({ type: 'error', message: 'No CSS content to optimize.' });
                        return;
                    }
                    const optimizedContent = await optimizeCss(content, apiKey);
                    api.updateActiveFileContent(optimizedContent);
                    api.showNotification({ type: 'success', message: 'CSS optimized successfully.' });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to optimize CSS.";
                    api.showNotification({ type: 'error', message });
                }
            },
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand(EDITOR_ACTION_ID);
    },
};
