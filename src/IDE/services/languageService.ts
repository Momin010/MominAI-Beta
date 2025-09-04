import type { Diagnostic } from '../types';

/**
 * A simple language service to analyze code for potential issues.
 * This can be expanded to include more complex checks, linting, or even
 * integrate with a real language server protocol client.
 */

export const analyzeCode = (code: string, language: string): Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // --- JavaScript / TypeScript Checks ---
        if (language === 'javascript' || language === 'typescript') {
            // Check for console.log statements
            const consoleMatch = line.match(/console\.(log|warn|error)/);
            if (consoleMatch) {
                diagnostics.push({
                    line: lineNumber,
                    startCol: consoleMatch.index! + 1,
                    endCol: consoleMatch.index! + consoleMatch[0].length + 1,
                    message: `Avoid using console.${consoleMatch[1]} in production code.`,
                    severity: 'warning',
                    source: 'CodeCraft Linter'
                });
            }
        }

        // --- General Checks for all languages ---
        
        // Check for trailing whitespace
        const trailingSpaceMatch = line.match(/\s+$/);
        if (trailingSpaceMatch) {
            diagnostics.push({
                line: lineNumber,
                startCol: line.length - trailingSpaceMatch[0].length + 1,
                endCol: line.length + 1,
                message: 'Trailing whitespace is present.',
                severity: 'info',
                source: 'CodeCraft Linter'
            });
        }
    });

    return diagnostics;
};
