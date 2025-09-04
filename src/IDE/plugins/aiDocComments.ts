
import type { Plugin, IDEApi } from '../types';
import { getCodeExplanation } from '../services/aiService';

export const aiDocCommentsPlugin: Plugin = {
    id: 'ai-doc-comments',
    name: 'AI Doc Comments',
    description: 'Provides AI-generated explanations when you hover over code.',
    
    activate: (api: IDEApi) => {
        // Temporarily disabled due to Monaco -> CodeMirror migration.
        // This requires re-implementing with CodeMirror's hoverTooltip extension.
        console.log("AI Doc Comments plugin inactive.");
    },

    deactivate: (api: IDEApi) => {
        // No-op
    },
};
