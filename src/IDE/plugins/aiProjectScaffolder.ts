

import type { Plugin, IDEApi } from '../types';
import { scaffoldProject } from '../services/aiService';

export const aiProjectScaffolderPlugin: Plugin = {
    id: 'ai-project-scaffolder',
    name: 'AI Project Scaffolder',
    description: 'Generates a complete project structure from a prompt.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: 'ai.scaffold.project',
            label: 'AI: New Project from Prompt...',
            category: 'AI',
            action: async () => {
                const prompt = window.prompt("Describe the project you want to build:");
                if (!prompt) return;
                
                api.showNotification({ type: 'info', message: 'Scaffolding project...' });
                try {
                    // FIX: Get API key from localStorage and pass it to the service function.
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    const files = await scaffoldProject(prompt, apiKey);
                    api.scaffoldProject(files);
                    api.showNotification({ type: 'success', message: 'Project scaffolded successfully!' });
                } catch (error) {
                    if (error instanceof Error) api.showNotification({ type: 'error', message: error.message });
                }
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand('ai.scaffold.project');
    },
};