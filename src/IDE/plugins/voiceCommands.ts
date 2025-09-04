
import type { Plugin, IDEApi } from '../types';

// Logic is handled by the useVoiceCommands hook and App.tsx for direct state access.
// This plugin file ensures the feature is visible in the plugin list.

export const voiceCommandsPlugin: Plugin = {
    id: 'voice-commands',
    name: 'Voice Commands',
    description: 'Control the IDE with your voice.',
    
    activate: (api: IDEApi) => {
        console.log("Voice Commands plugin activated (logic in App.tsx).");
    },

    deactivate: (api: IDEApi) => {
        // Could call api.stopVoiceRecognition() here
    },
};
