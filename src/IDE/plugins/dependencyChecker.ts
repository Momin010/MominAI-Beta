

import type { Plugin, IDEApi } from '../types';
import { analyzeDependencies } from '../services/aiService';

export const dependencyCheckerPlugin: Plugin = {
    id: 'dependency-checker',
    name: 'AI Dependency Checker',
    description: 'Analyzes package.json for outdated or vulnerable dependencies.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: 'deps.analyze',
            label: 'Dependencies: Analyze package.json',
            category: 'Tools',
            action: async () => {
                const packageJsonContent = api.readNode('/package.json');
                if (!packageJsonContent) {
                    api.showNotification({ type: 'warning', message: 'A `package.json` file was not found in the root.' });
                    return;
                }
                api.showNotification({ type: 'info', message: 'Analyzing dependencies...' });
                try {
                    // FIX: Get API key from localStorage and pass it to the service function.
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    const report = await analyzeDependencies(packageJsonContent, apiKey);
                    api.setDependencyReport(report);
                    api.showNotification({ type: 'success', message: 'Dependency analysis complete.' });
                } catch (error) {
                     if (error instanceof Error) api.showNotification({ type: 'error', message: error.message });
                }
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand('deps.analyze');
        api.setDependencyReport(null);
    },
};