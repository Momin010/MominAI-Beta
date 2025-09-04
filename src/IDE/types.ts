export interface Diagnostic {
  line: number;
  message: string;
  source?: string;
}

export interface DependencyReport {
  dependencies: string[];
  vulnerabilities: string[];
  recommendations: string[];
}

export interface AIFixResponse {
  fixed: boolean;
  code: string;
  explanation: string;
}

export interface EditorActionCommand {
  action: string;
  text?: string;
  path?: string;
  content?: string;
  line?: number;
  column?: number;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  lines?: number;
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export interface EditorAIAction {
  type: string;
  payload: any;
}

export interface FileSystemNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileSystemNode[];
}