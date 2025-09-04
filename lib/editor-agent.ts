export interface EditorCommand {
  action: 'openFile' | 'moveCursor' | 'type' | 'select' | 'comment' | 'finish';
  path?: string;
  line?: number;
  column?: number;
  text?: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  reason?: string;
}

export interface EditorState {
  currentFile: string;
  code: string;
  cursorLine: number;
  cursorColumn: number;
  selectionStart: number;
  selectionEnd: number;
}

export class EditorAgent {
  private state: EditorState;
  private onStateChange?: (state: EditorState) => void;
  private onFinish?: () => void;

  constructor(initialState: EditorState, onStateChange?: (state: EditorState) => void, onFinish?: () => void) {
    this.state = { ...initialState };
    this.onStateChange = onStateChange;
    this.onFinish = onFinish;
  }

  getState(): EditorState {
    return { ...this.state };
  }

  async executeCommand(command: EditorCommand): Promise<void> {
    switch (command.action) {
      case 'openFile':
        await this.openFile(command.path!);
        break;
      case 'moveCursor':
        this.moveCursor(command.line!, command.column!);
        break;
      case 'type':
        await this.typeText(command.text!);
        break;
      case 'select':
        this.selectText(command.startLine!, command.startColumn!, command.endLine!, command.endColumn!);
        break;
      case 'comment':
        await this.commentSelection();
        break;
      case 'finish':
        this.finish(command.reason);
        break;
      default:
        throw new Error(`Unknown action: ${command.action}`);
    }
  }

  private async openFile(path: string): Promise<void> {
    this.state.currentFile = path;

    try {
      // Try to read the file from the server
      const response = await fetch(`/api/filesystem?filePath=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        this.state.code = data.content || '';
      } else {
        // File doesn't exist, create it with default content
        this.state.code = `// New file: ${path}\n\n// Add your code here\n`;
        // Create the file on the server
        await fetch('/api/filesystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'write',
            filePath: path,
            content: this.state.code
          })
        });
      }
    } catch (error) {
      console.error('Error opening file:', error);
      this.state.code = `// Error opening file: ${path}\n\nconsole.log('File could not be opened');`;
    }

    this.state.cursorLine = 0;
    this.state.cursorColumn = 0;
    this.state.selectionStart = 0;
    this.state.selectionEnd = 0;
    this.notifyStateChange();
  }

  private moveCursor(line: number, column: number): void {
    this.state.cursorLine = line;
    this.state.cursorColumn = column;
    this.notifyStateChange();
  }

  private async typeText(text: string): Promise<void> {
    // Simple text insertion at cursor position
    const lines = this.state.code.split('\n');
    const currentLine = lines[this.state.cursorLine] || '';
    const beforeCursor = currentLine.slice(0, this.state.cursorColumn);
    const afterCursor = currentLine.slice(this.state.cursorColumn);
    lines[this.state.cursorLine] = beforeCursor + text + afterCursor;
    this.state.code = lines.join('\n');

    // Update cursor position
    const newLines = text.split('\n');
    if (newLines.length > 1) {
      this.state.cursorLine += newLines.length - 1;
      this.state.cursorColumn = newLines[newLines.length - 1].length;
    } else {
      this.state.cursorColumn += text.length;
    }

    // Save changes to filesystem
    try {
      await fetch('/api/filesystem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          filePath: this.state.currentFile,
          content: this.state.code
        })
      });
    } catch (error) {
      console.error('Error saving file:', error);
    }

    this.notifyStateChange();
  }

  private selectText(startLine: number, startColumn: number, endLine: number, endColumn: number): void {
    const lines = this.state.code.split('\n');
    let startPos = 0;
    let endPos = 0;

    for (let i = 0; i < lines.length; i++) {
      if (i < startLine) {
        startPos += lines[i].length + 1; // +1 for newline
      } else if (i === startLine) {
        startPos += startColumn;
      }

      if (i < endLine) {
        endPos += lines[i].length + 1;
      } else if (i === endLine) {
        endPos += endColumn;
      }
    }

    this.state.selectionStart = startPos;
    this.state.selectionEnd = endPos;
    this.notifyStateChange();
  }

  private async commentSelection(): Promise<void> {
    // Simple line commenting for JavaScript/TypeScript
    const lines = this.state.code.split('\n');
    const startLine = Math.min(this.state.cursorLine, Math.floor(this.state.selectionStart / (this.state.code.length / lines.length)));
    const endLine = Math.max(this.state.cursorLine, Math.floor(this.state.selectionEnd / (this.state.code.length / lines.length)));

    for (let i = startLine; i <= endLine; i++) {
      if (lines[i] && !lines[i].trim().startsWith('//')) {
        lines[i] = '// ' + lines[i];
      }
    }

    this.state.code = lines.join('\n');

    // Save changes to filesystem
    try {
      await fetch('/api/filesystem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          filePath: this.state.currentFile,
          content: this.state.code
        })
      });
    } catch (error) {
      console.error('Error saving file:', error);
    }

    this.notifyStateChange();
  }

  private finish(reason?: string): void {
    console.log('Task finished:', reason);
    if (this.onFinish) {
      this.onFinish();
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}

export async function executeEditorCommands(commands: EditorCommand[], agent: EditorAgent): Promise<void> {
  for (const command of commands) {
    await agent.executeCommand(command);
    // Add small delay between commands for visual feedback
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}