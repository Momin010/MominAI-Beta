
import type { Plugin, IDEApi, Diagnostic } from '../types.ts';
import { analyzeCodeForBugs } from '../services/aiService';

const AI_LINTER_SOURCE = 'AI Linter';
let analysisTimeout: number | null = null;

const runAnalysis = (api: IDEApi) => {
    const activeFile = api.getActiveFile();
    if (!activeFile) {
        api.setAiDiagnostics(AI_LINTER_SOURCE, []);
        return;
    }
    const content = api.getOpenFileContent();

    if (!content || content.trim().length < 20) { // Don't analyze very small files
        api.setAiDiagnostics(AI_LINTER_SOURCE, []);
        return;
    }

    if (analysisTimeout) {
        clearTimeout(analysisTimeout);
    }

    analysisTimeout = window.setTimeout(async () => {
        try {
            // FIX: Get API key from localStorage and pass it to the service function.
            const apiKey = JSON.parse(localStorage.getItem('geminiApiKey') || 'null') || null;
            const results = await analyzeCodeForBugs(content, apiKey);
            const diagnostics: Diagnostic[] = results.map(r => ({ ...r, source: AI_LINTER_SOURCE }));
            api.setAiDiagnostics(AI_LINTER_SOURCE, diagnostics);
        } catch (e) {
            console.error("Error during AI code analysis:", e);
            api.setAiDiagnostics(AI_LINTER_SOURCE, []); // Clear on error
        }
    }, 1500); // Debounce for 1.5 seconds
};

export const aiDiagnosticsPlugin: Plugin = {
    id: 'ai-diagnostics',
    name: 'AI Diagnostics',
    description: 'Uses AI to find potential bugs and logical errors in your code.',
    
    activate: (api: IDEApi) => {
        const fileSavedUnsub = api.onFileSaved(() => runAnalysis(api));
        const activeFileUnsub = api.onActiveFileChanged(() => runAnalysis(api));
        
        // Initial run
        runAnalysis(api);
        
        // Store cleanup functions
        (window as any).__aiDiagnosticsCleanup = () => {
            fileSavedUnsub();
            activeFileUnsub();
            if (analysisTimeout) clearTimeout(analysisTimeout);
        };
    },

    deactivate: (api: IDEApi) => {
        if ((window as any).__aiDiagnosticsCleanup) {
            (window as any).__aiDiagnosticsCleanup();
        }
        api.setAiDiagnostics(AI_LINTER_SOURCE, []); // Clear diagnostics on deactivation
    },
};