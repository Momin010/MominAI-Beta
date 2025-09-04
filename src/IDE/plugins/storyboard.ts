
import type { Plugin, IDEApi } from '../types';

// Logic for scanning components is now in App.tsx to simplify state management.
// This plugin file ensures the feature is visible in the plugin list.

export const storyboardPlugin: Plugin = {
    id: 'storyboard',
    name: 'Component Storyboard',
    description: 'Provides a Storybook-like view for your UI components.',
    
    activate: (api: IDEApi) => {
        console.log("Storyboard plugin activated (logic in App.tsx).");
    },

    deactivate: (api: IDEApi) => {
        // Cleanup logic if needed
    },
};
