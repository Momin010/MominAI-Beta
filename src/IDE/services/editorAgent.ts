// This service contains functions to programmatically control the CodeMirror editor instance,
// simulating a user's actions based on the AI agent's commands.

import type { EditorView } from '@codemirror/view';

const TYPING_DELAY_MS = 10; // Reduced delay for a faster feel

/**
 * Types text into the editor at the current cursor position with a realistic delay.
 */
export const typeText = async (editor: EditorView, text: string): Promise<void> => {
    if (!editor) return;

    for (const char of text.split('')) {
        const pos = editor.state.selection.main.head;
        editor.dispatch({
            changes: { from: pos, insert: char },
            selection: { anchor: pos + 1 },
            scrollIntoView: true
        });
        await new Promise(resolve => setTimeout(resolve, TYPING_DELAY_MS));
    }
};

/**
 * Moves the cursor to a specific line and column.
 * Note: CodeMirror lines are 1-based from the user's perspective, but the doc object is 0-based.
 * We'll stick to 1-based for consistency with the agent's commands.
 */
export const moveCursor = async (editor: EditorView, line: number, column: number): Promise<void> => {
    if (!editor) return;
    try {
        const lineInfo = editor.state.doc.line(line);
        const pos = Math.min(lineInfo.from + column - 1, lineInfo.to);
        editor.dispatch({
            selection: { anchor: pos },
            scrollIntoView: true,
        });
        editor.focus();
    } catch(e) {
        console.error(`Error moving cursor to line ${line}, col ${column}:`, e);
    }
};

/**
 * Selects a block of text from a start to an end position.
 */
export const selectText = async (editor: EditorView, startLine: number, startColumn: number, endLine: number, endColumn: number): Promise<void> => {
    if (!editor) return;
    try {
        const fromLine = editor.state.doc.line(startLine);
        const toLine = editor.state.doc.line(endLine);
        
        const from = Math.min(fromLine.from + startColumn - 1, fromLine.to);
        const to = Math.min(toLine.from + endColumn - 1, toLine.to);

        editor.dispatch({
            selection: { anchor: from, head: to },
            scrollIntoView: true,
        });
    } catch(e) {
         console.error(`Error selecting text:`, e);
    }
};

/**
 * Replaces the currently selected text with new text.
 */
export const replaceText = async (editor: EditorView, text: string): Promise<void> => {
    if (!editor) return;
    editor.dispatch(editor.state.replaceSelection(text));
};

/**
 * Deletes a specified number of lines forward from the current cursor position.
 */
export const deleteText = async (editor: EditorView, linesToDelete: number): Promise<void> => {
    if (!editor) return;
    const { from, to } = editor.state.selection.main;
    const startLine = editor.state.doc.lineAt(from);
    
    // If there is a selection, delete that instead
    if (from !== to) {
        editor.dispatch({ changes: { from, to, insert: '' }});
        return;
    }

    // Otherwise, delete lines forward
    const endLineNumber = Math.min(startLine.number + linesToDelete - 1, editor.state.doc.lines);
    const endLine = editor.state.doc.line(endLineNumber);
    
    // Include the newline character of the last line to delete
    const deleteTo = endLine.to + 1 <= editor.state.doc.length ? endLine.to + 1 : endLine.to;

    editor.dispatch({
        changes: { from: startLine.from, to: deleteTo },
    });
};