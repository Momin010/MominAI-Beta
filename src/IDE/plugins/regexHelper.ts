import type { Plugin, IDEApi } from '../types';

export const regexHelperPlugin: Plugin = {
    id: 'regex-helper',
    name: 'AI Regex Helper',
    description: 'A command to generate regular expressions from natural language.',
    
    activate: (api: IDEApi) => {
        // The command is registered in App.tsx to handle modal state.
        // This plugin is essentially a placeholder to show it in the plugin list.
    },

    deactivate: (api: IDEApi) => {
        // Command unregistering logic can be added to IDEApi if needed
    },
};