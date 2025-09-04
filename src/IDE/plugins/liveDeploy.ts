
import type { Plugin, IDEApi } from '../types';

export const liveDeployPlugin: Plugin = {
    id: 'live-deploy',
    name: 'AI Live Deployment',
    description: 'Simulates deploying your static website to a public URL.',
    
    activate: (api: IDEApi) => {
        // The core logic is in SourceControlPanel.tsx
        // This plugin is mainly for discoverability in the UI
        console.log("Live Deploy plugin activated.");
    },

    deactivate: (api: IDEApi) => {
        // No-op
    },
};
