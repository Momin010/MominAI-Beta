
import type { Plugin, IDEApi } from '../types';

export const zenModePlugin: Plugin = {
    id: 'zen-mode',
    name: 'Zen Mode',
    description: 'A distraction-free editing mode.',
    
    activate: (api: IDEApi) => {
        // Command is registered in App.tsx to control modal state
        console.log("Zen Mode plugin activated (command in App.tsx).");
    },

    deactivate: (api: IDEApi) => {
        // Could ensure zen mode is turned off here
    },
};
