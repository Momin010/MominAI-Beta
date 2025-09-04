

import React from 'react';
import type { Plugin, IDEApi, Diagnostic } from '../types';
import { reviewCode } from '../services/aiService';

const EDITOR_ACTION_ID = 'ai-code-review';
const AI_REVIEW_SOURCE = 'AI Code Review';

export const aiCodeReviewPlugin: Plugin = {
    id: 'ai-code-review',
    name: 'AI Code Review',
    description: 'Adds an action to perform an AI-powered code review on the current file.',

    activate: (api: IDEApi) => {
        api.registerCommand({
            id: EDITOR_ACTION_ID,
            label: 'AI: Run Code Review on Current File',
            category: 'AI',
            action: async () => {
                const filePath = api.getActiveFile();
                const content = api.getOpenFileContent();

                if (!content || content.trim().length === 0) {
                    api.showNotification({ type: 'warning', message: 'Cannot run review on an empty file.' });
                    return;
                }

                api.showNotification({ type: 'info', message: 'Starting AI code review...' });
                try {
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    const results = await reviewCode(content, apiKey);
                    const diagnostics: Diagnostic[] = results.map(r => ({ ...r, source: AI_REVIEW_SOURCE }));
                    api.setAiDiagnostics(AI_REVIEW_SOURCE, diagnostics);
                    api.showNotification({ type: 'success', message: `AI review complete. Found ${diagnostics.length} issues.` });
                    api.switchBottomPanelView('problems');
                } catch (error) {
                    if (error instanceof Error) api.showNotification({ type: 'error', message: error.message });
                }
            },
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand(EDITOR_ACTION_ID);
        api.setAiDiagnostics(AI_REVIEW_SOURCE, []);
    },
};
