

import type { Plugin, IDEApi } from '../types';
import { migrateCode } from '../services/aiService';

const handleMigration = async (api: IDEApi, from: string, to: string, supportedExtensions: string[]) => {
    const activeFile = api.getActiveFile();
    if (!activeFile || !supportedExtensions.some(ext => activeFile.endsWith(ext))) {
        api.showNotification({ type: 'warning', message: `This action only works on ${supportedExtensions.join(', ')} files.` });
        return;
    }
    const content = api.getOpenFileContent();
    api.showNotification({ type: 'info', message: `Migrating from ${from} to ${to}...` });
    try {
        // FIX: Get API key from localStorage and pass it to the service function.
        const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
        const newCode = await migrateCode(content, from, to, apiKey);
        api.updateActiveFileContent(newCode);
        api.showNotification({ type: 'success', message: 'Migration complete!' });
    } catch (error) {
        if(error instanceof Error) api.showNotification({ type: 'error', message: error.message });
    }
};

export const aiCodeMigratorPlugin: Plugin = {
    id: 'ai-code-migrator',
    name: 'AI Code Migrator',
    description: 'Uses AI to migrate code between languages or frameworks.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: 'ai.migrate.js-to-ts',
            label: 'AI: Migrate JavaScript to TypeScript',
            category: 'AI',
            action: () => handleMigration(api, 'JavaScript', 'TypeScript', ['.js', '.jsx'])
        });
        api.registerCommand({
            id: 'ai.migrate.class-to-functional',
            label: 'AI: Migrate React Class to Functional Component',
            category: 'AI',
            action: () => handleMigration(api, 'React Class Component', 'React Functional Component', ['.jsx', '.tsx'])
        });
    },

    deactivate: (api: IDEApi) => {
        api.unregisterCommand('ai.migrate.js-to-ts');
        api.unregisterCommand('ai.migrate.class-to-functional');
    },
};