
import type { Plugin, IDEApi } from '../types';

// This plugin is now mostly handled in App.tsx to have direct access to state.
// This file serves to represent the feature in the plugin list.
// A more decoupled architecture might have the plugin manage its own state via the API.

export const collaborationPlugin: Plugin = {
    id: 'collaboration',
    name: 'Real-time Collaboration',
    description: 'Enables real-time collaboration between browser tabs.',
    
    activate: (api: IDEApi) => {
        // Core logic is now in App.tsx for simplicity
        console.log("Collaboration plugin activated (logic in App.tsx)");
    },

    deactivate: (api: IDEApi) => {
        // Cleanup logic would go here if state was managed by the plugin
    },
};
