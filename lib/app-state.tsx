import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { FileNode } from '../components/FileTree';
import { batchManager, BatchOperation } from './batch-manager';
import { progressManager, OverallProgress } from './progress-manager';

// Application state interface
export interface AppState {
  // File system state
  projectFiles: FileNode[];
  selectedFile: string | null;
  currentDirectory: string;

  // UI state
  isLoading: boolean;
  loadingMessage: string;
  showProgressIndicator: boolean;
  showTerminal: boolean;

  // Operation state
  currentOperations: string[];
  operationHistory: Array<{
    id: string;
    type: string;
    status: 'success' | 'error' | 'cancelled';
    timestamp: Date;
    message: string;
  }>;

  // Error state
  lastError: {
    message: string;
    code: string;
    timestamp: Date;
  } | null;

  // User preferences
  theme: 'light' | 'dark';
  autoSave: boolean;
  showHiddenFiles: boolean;
}

// Action types
export type AppAction =
  | { type: 'SET_PROJECT_FILES'; payload: FileNode[] }
  | { type: 'ADD_PROJECT_FILE'; payload: FileNode }
  | { type: 'REMOVE_PROJECT_FILE'; payload: string }
  | { type: 'UPDATE_PROJECT_FILE'; payload: { path: string; updates: Partial<FileNode> } }
  | { type: 'SET_SELECTED_FILE'; payload: string | null }
  | { type: 'SET_CURRENT_DIRECTORY'; payload: string }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
  | { type: 'SET_SHOW_PROGRESS_INDICATOR'; payload: boolean }
  | { type: 'SET_SHOW_TERMINAL'; payload: boolean }
  | { type: 'ADD_OPERATION'; payload: string }
  | { type: 'REMOVE_OPERATION'; payload: string }
  | { type: 'ADD_OPERATION_HISTORY'; payload: { id: string; type: string; status: 'success' | 'error' | 'cancelled'; message: string } }
  | { type: 'SET_LAST_ERROR'; payload: { message: string; code: string } | null }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_AUTO_SAVE'; payload: boolean }
  | { type: 'SET_SHOW_HIDDEN_FILES'; payload: boolean }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  projectFiles: [],
  selectedFile: null,
  currentDirectory: '.',
  isLoading: false,
  loadingMessage: '',
  showProgressIndicator: false,
  showTerminal: false,
  currentOperations: [],
  operationHistory: [],
  lastError: null,
  theme: 'dark',
  autoSave: true,
  showHiddenFiles: false,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROJECT_FILES':
      return { ...state, projectFiles: action.payload };

    case 'ADD_PROJECT_FILE':
      return { ...state, projectFiles: [...state.projectFiles, action.payload] };

    case 'REMOVE_PROJECT_FILE':
      const removeFileRecursive = (files: FileNode[], path: string): FileNode[] => {
        return files
          .filter(file => file.path !== path)
          .map(file => ({
            ...file,
            children: file.children ? removeFileRecursive(file.children, path) : undefined
          }));
      };
      return { ...state, projectFiles: removeFileRecursive(state.projectFiles, action.payload) };

    case 'UPDATE_PROJECT_FILE':
      const updateFileRecursive = (files: FileNode[], path: string, updates: Partial<FileNode>): FileNode[] => {
        return files.map(file => {
          if (file.path === path) {
            return { ...file, ...updates };
          }
          if (file.children) {
            return {
              ...file,
              children: updateFileRecursive(file.children, path, updates)
            };
          }
          return file;
        });
      };
      return { ...state, projectFiles: updateFileRecursive(state.projectFiles, action.payload.path, action.payload.updates) };

    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload };

    case 'SET_CURRENT_DIRECTORY':
      return { ...state, currentDirectory: action.payload };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || ''
      };

    case 'SET_SHOW_PROGRESS_INDICATOR':
      return { ...state, showProgressIndicator: action.payload };

    case 'SET_SHOW_TERMINAL':
      return { ...state, showTerminal: action.payload };

    case 'ADD_OPERATION':
      return {
        ...state,
        currentOperations: [...state.currentOperations, action.payload],
        showProgressIndicator: true
      };

    case 'REMOVE_OPERATION':
      const remainingOps = state.currentOperations.filter(id => id !== action.payload);
      return {
        ...state,
        currentOperations: remainingOps,
        showProgressIndicator: remainingOps.length > 0
      };

    case 'ADD_OPERATION_HISTORY':
      return {
        ...state,
        operationHistory: [
          ...state.operationHistory.slice(-49), // Keep last 50 operations
          {
            id: action.payload.id,
            type: action.payload.type,
            status: action.payload.status,
            timestamp: new Date(),
            message: action.payload.message
          }
        ]
      };

    case 'SET_LAST_ERROR':
      return {
        ...state,
        lastError: action.payload ? {
          ...action.payload,
          timestamp: new Date()
        } : null
      };

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_AUTO_SAVE':
      return { ...state, autoSave: action.payload };

    case 'SET_SHOW_HIDDEN_FILES':
      return { ...state, showHiddenFiles: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

// Action creators
export const appActions = {
  setProjectFiles: (files: FileNode[]) => ({ type: 'SET_PROJECT_FILES' as const, payload: files }),
  addProjectFile: (file: FileNode) => ({ type: 'ADD_PROJECT_FILE' as const, payload: file }),
  removeProjectFile: (path: string) => ({ type: 'REMOVE_PROJECT_FILE' as const, payload: path }),
  updateProjectFile: (path: string, updates: Partial<FileNode>) => ({
    type: 'UPDATE_PROJECT_FILE' as const,
    payload: { path, updates }
  }),
  setSelectedFile: (file: string | null) => ({ type: 'SET_SELECTED_FILE' as const, payload: file }),
  setCurrentDirectory: (dir: string) => ({ type: 'SET_CURRENT_DIRECTORY' as const, payload: dir }),
  setLoading: (isLoading: boolean, message?: string) => ({
    type: 'SET_LOADING' as const,
    payload: { isLoading, message }
  }),
  setShowProgressIndicator: (show: boolean) => ({ type: 'SET_SHOW_PROGRESS_INDICATOR' as const, payload: show }),
  setShowTerminal: (show: boolean) => ({ type: 'SET_SHOW_TERMINAL' as const, payload: show }),
  addOperation: (operationId: string) => ({ type: 'ADD_OPERATION' as const, payload: operationId }),
  removeOperation: (operationId: string) => ({ type: 'REMOVE_OPERATION' as const, payload: operationId }),
  addOperationHistory: (id: string, type: string, status: 'success' | 'error' | 'cancelled', message: string) => ({
    type: 'ADD_OPERATION_HISTORY' as const,
    payload: { id, type, status, message }
  }),
  setLastError: (error: { message: string; code: string } | null) => ({ type: 'SET_LAST_ERROR' as const, payload: error }),
  setTheme: (theme: 'light' | 'dark') => ({ type: 'SET_THEME' as const, payload: theme }),
  setAutoSave: (autoSave: boolean) => ({ type: 'SET_AUTO_SAVE' as const, payload: autoSave }),
  setShowHiddenFiles: (show: boolean) => ({ type: 'SET_SHOW_HIDDEN_FILES' as const, payload: show }),
  resetState: () => ({ type: 'RESET_STATE' as const }),
};

// Integration with existing managers
export function initializeStateIntegration() {
  // Integrate with batch manager
  batchManager.onResult((result) => {
    // This will be called from components that use the context
  });

  // Integrate with progress manager
  progressManager.onProgressUpdate((progress) => {
    // This will be called from components that use the context
  });
}