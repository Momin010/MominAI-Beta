export interface Diagnostic {
  line: number;
  message: string;
  source?: string;
  startCol?: number;
  endCol?: number;
  severity?: 'error' | 'warning' | 'info';
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
  children?: Record<string, FileSystemNode>;
}

export type Theme = 'deep-space' | 'nordic-light';

export interface Directory extends FileSystemNode {
  type: 'directory';
  children: Record<string, FileSystemNode>;
}

export interface GistApiResponse {
  id: string;
  url: string;
  html_url: string;
  files: Record<string, {
    filename?: string;
    type?: string;
    language?: string;
    raw_url?: string;
    size?: number;
    content?: string;
  }>;
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string;
  comments: number;
  user: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  } | null;
  comments_url: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
  truncated: boolean;
}