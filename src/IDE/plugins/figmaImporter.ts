
import type { Plugin, IDEApi } from '../types';

export const figmaImporterPlugin: Plugin = {
    id: 'figma-importer',
    name: 'Figma Importer',
    description: 'Generates code from a Figma design URL.',
    
    activate: (api: IDEApi) => {
        // The core logic is in FigmaPanel.tsx and App.tsx
        // This plugin is mainly for discoverability in the UI
        console.log("Figma Importer plugin activated.");
    },

    deactivate: (api: IDEApi) => {
        // No-op
    },
};
