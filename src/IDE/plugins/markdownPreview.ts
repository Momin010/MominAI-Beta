
import React from 'react';
import type { Plugin, IDEApi } from '../types';

const EDITOR_ACTION_ID = 'markdown-preview';

export const markdownPreviewPlugin: Plugin = {
    id: 'markdown-preview',
    name: 'Markdown Preview',
    description: 'Adds a button to preview .md files as rendered HTML in the preview pane.',
    
    activate: (api: IDEApi) => {
        // Temporarily disabled due to Monaco -> CodeMirror migration.
        // This can be re-implemented via a command palette command.
        console.log("Markdown Preview plugin inactive.");
    },

    deactivate: (api: IDEApi) => {
        // api.removeEditorAction(EDITOR_ACTION_ID);
    },
};
