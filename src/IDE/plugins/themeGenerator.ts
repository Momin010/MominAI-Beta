
import type { Plugin, IDEApi } from '../types';
import { generateTheme } from '../services/aiService';

export const themeGeneratorPlugin: Plugin = {
    id: 'theme-generator',
    name: 'AI Theme Generator',
    description: 'Generates a new UI theme from a text description.',
    
    activate: (api: IDEApi) => {
        api.registerCommand({
            id: 'ai.theme.generate',
            label: 'AI: Generate new UI theme...',
            category: 'Appearance',
            action: async () => {
                const description = prompt("Describe the theme you want to generate (e.g., 'a calming forest theme with greens and browns'):");
                if (!description) return;

                api.showNotification({ type: 'info', message: 'Generating theme...' });
                try {
                    // FIX: Get API key from localStorage and pass it to the service function.
                    const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null');
                    const themeVariables = await generateTheme(description, apiKey);
                    Object.entries(themeVariables).forEach(([key, value]) => {
                        document.body.style.setProperty(key, value);
                    });
                    api.showNotification({ type: 'success', message: 'New theme applied!' });
                } catch (error) {
                    // Fix: Refactored catch block to handle unknown error type safely.
                    if (error instanceof Error) {
                        api.showNotification({ type: 'error', message: error.message });
                    } else {
                        api.showNotification({ type: 'error', message: "Failed to generate theme." });
                    }
                }
            }
        });
    },

    deactivate: (api: IDEApi) => {
        // Can add unregister logic if needed
    },
};