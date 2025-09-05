import { loggingManager } from './logging-manager';

export interface ConversationEntry {
  id: string;
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  context: {
    projectState?: any;
    userPreferences?: any;
    sessionMetadata?: any;
  };
  outcome?: {
    success: boolean;
    feedback?: string;
    rating?: number;
    lessonsLearned?: string[];
  };
}

export interface ProjectState {
  id: string;
  name: string;
  type: string;
  files: Map<string, FileState>;
  dependencies: string[];
  lastModified: Date;
  metadata: {
    complexity: number;
    technologies: string[];
    status: 'active' | 'completed' | 'archived';
  };
}

export interface FileState {
  path: string;
  content: string;
  lastModified: Date;
  version: number;
  quality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface UserPreferences {
  codingStyle: {
    indentation: 'spaces' | 'tabs';
    spacing: number;
    namingConvention: 'camelCase' | 'snake_case' | 'kebab-case';
  };
  technologyPreferences: string[];
  projectTemplates: string[];
  communicationStyle: 'concise' | 'detailed' | 'technical';
  learningMode: boolean;
}

export class AdvancedMemoryManager {
  private static instance: AdvancedMemoryManager;
  private conversations: Map<string, ConversationEntry[]> = new Map();
  private projectStates: Map<string, ProjectState> = new Map();
  private userPreferences: UserPreferences;
  private maxConversationHistory = 1000;
  private maxProjectStates = 50;

  private constructor() {
    this.userPreferences = this.loadUserPreferences();
  }

  static getInstance(): AdvancedMemoryManager {
    if (!AdvancedMemoryManager.instance) {
      AdvancedMemoryManager.instance = new AdvancedMemoryManager();
    }
    return AdvancedMemoryManager.instance;
  }

  // Conversation Memory Management
  addConversationEntry(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    context: ConversationEntry['context'] = {},
    outcome?: ConversationEntry['outcome']
  ): string {
    const entryId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry: ConversationEntry = {
      id: entryId,
      timestamp: new Date(),
      userMessage,
      aiResponse,
      context,
      outcome
    };

    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }

    const sessionConversations = this.conversations.get(sessionId)!;
    sessionConversations.unshift(entry);

    // Maintain max history limit
    if (sessionConversations.length > this.maxConversationHistory) {
      sessionConversations.splice(this.maxConversationHistory);
    }

    loggingManager.debug('memory', `Added conversation entry: ${entryId}`, {
      operation: 'add_conversation_entry',
      data: { sessionId, entryId, messageLength: userMessage.length }
    });

    return entryId;
  }

  getConversationHistory(sessionId: string, limit: number = 50): ConversationEntry[] {
    const conversations = this.conversations.get(sessionId) || [];
    return conversations.slice(0, limit);
  }

  getRelevantContext(sessionId: string, currentQuery: string, maxEntries: number = 10): ConversationEntry[] {
    const conversations = this.conversations.get(sessionId) || [];
    if (conversations.length === 0) return [];

    // Simple relevance scoring based on keyword matching
    const queryWords = currentQuery.toLowerCase().split(/\s+/);

    const scoredEntries = conversations.map(entry => {
      const userText = entry.userMessage.toLowerCase();
      const aiText = entry.aiResponse.toLowerCase();

      let score = 0;
      queryWords.forEach(word => {
        if (userText.includes(word) || aiText.includes(word)) {
          score += 1;
        }
      });

      // Boost recent entries
      const hoursSince = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 5 - hoursSince); // Recent entries get up to 5 points

      return { entry, score };
    });

    return scoredEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, maxEntries)
      .map(item => item.entry);
  }

  updateConversationOutcome(entryId: string, outcome: ConversationEntry['outcome']): void {
    for (const [sessionId, conversations] of Array.from(this.conversations)) {
      const entry = conversations.find((c: ConversationEntry) => c.id === entryId);
      if (entry) {
        entry.outcome = outcome;
        loggingManager.debug('memory', `Updated conversation outcome: ${entryId}`, {
          operation: 'update_conversation_outcome',
          data: { sessionId, entryId, success: outcome?.success }
        });
        break;
      }
    }
  }

  // Project State Management
  createProjectState(projectId: string, name: string, type: string): ProjectState {
    const projectState: ProjectState = {
      id: projectId,
      name,
      type,
      files: new Map(),
      dependencies: [],
      lastModified: new Date(),
      metadata: {
        complexity: 0,
        technologies: [],
        status: 'active'
      }
    };

    this.projectStates.set(projectId, projectState);

    // Maintain max project states limit
    if (this.projectStates.size > this.maxProjectStates) {
      const oldestKey = Array.from(this.projectStates.keys())[0];
      this.projectStates.delete(oldestKey);
    }

    loggingManager.debug('memory', `Created project state: ${projectId}`, {
      operation: 'create_project_state',
      data: { projectId, name, type }
    });

    return projectState;
  }

  updateFileState(projectId: string, filePath: string, content: string): void {
    const project = this.projectStates.get(projectId);
    if (!project) return;

    const existingFile = project.files.get(filePath);
    const version = existingFile ? existingFile.version + 1 : 1;

    const fileState: FileState = {
      path: filePath,
      content,
      lastModified: new Date(),
      version,
      quality: {
        score: 0, // Will be calculated by QA system
        issues: [],
        suggestions: []
      }
    };

    project.files.set(filePath, fileState);
    project.lastModified = new Date();

    loggingManager.debug('memory', `Updated file state: ${filePath}`, {
      operation: 'update_file_state',
      data: { projectId, filePath, version }
    });
  }

  getProjectState(projectId: string): ProjectState | undefined {
    return this.projectStates.get(projectId);
  }

  getFileState(projectId: string, filePath: string): FileState | undefined {
    const project = this.projectStates.get(projectId);
    return project?.files.get(filePath);
  }

  updateProjectMetadata(projectId: string, updates: Partial<ProjectState['metadata']>): void {
    const project = this.projectStates.get(projectId);
    if (!project) return;

    project.metadata = { ...project.metadata, ...updates };
    project.lastModified = new Date();

    loggingManager.debug('memory', `Updated project metadata: ${projectId}`, {
      operation: 'update_project_metadata',
      data: { projectId, updates }
    });
  }

  // User Preferences Management
  updateUserPreferences(updates: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...updates };
    this.saveUserPreferences();

    loggingManager.debug('memory', 'Updated user preferences', {
      operation: 'update_user_preferences',
      data: { updates }
    });
  }

  getUserPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  // Learning and Analytics
  getLearningInsights(sessionId: string): {
    successfulPatterns: string[];
    commonIssues: string[];
    improvementAreas: string[];
    userBehaviorPatterns: string[];
  } {
    const conversations = this.conversations.get(sessionId) || [];
    const successfulEntries = conversations.filter(c => c.outcome?.success);
    const failedEntries = conversations.filter(c => !c.outcome?.success);

    // Analyze successful patterns
    const successfulPatterns = this.extractPatterns(successfulEntries, 'success');

    // Analyze common issues
    const commonIssues = this.extractPatterns(failedEntries, 'failure');

    // Identify improvement areas
    const improvementAreas = this.analyzeImprovementAreas(conversations);

    // User behavior patterns
    const userBehaviorPatterns = this.analyzeUserBehavior(conversations);

    return {
      successfulPatterns,
      commonIssues,
      improvementAreas,
      userBehaviorPatterns
    };
  }

  private extractPatterns(entries: ConversationEntry[], type: 'success' | 'failure'): string[] {
    const patterns: { [key: string]: number } = {};

    entries.forEach(entry => {
      const text = type === 'success' ? entry.aiResponse : entry.userMessage;
      // Simple pattern extraction - in real implementation, use NLP
      const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);

      words.forEach(word => {
        patterns[word] = (patterns[word] || 0) + 1;
      });
    });

    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([pattern]) => pattern);
  }

  private analyzeImprovementAreas(conversations: ConversationEntry[]): string[] {
    const areas: string[] = [];
    const recentConversations = conversations.slice(0, 20);

    // Check for repeated failures
    const failureRate = recentConversations.filter(c => !c.outcome?.success).length / recentConversations.length;
    if (failureRate > 0.3) {
      areas.push('High failure rate detected - consider reviewing error handling');
    }

    // Check for long response times (if available)
    const longResponses = recentConversations.filter(c =>
      c.context.sessionMetadata?.responseTime > 10000
    );
    if (longResponses.length > recentConversations.length * 0.2) {
      areas.push('Slow response times detected - consider optimization');
    }

    return areas;
  }

  private analyzeUserBehavior(conversations: ConversationEntry[]): string[] {
    const patterns: string[] = [];
    const recentConversations = conversations.slice(0, 50);

    // Analyze request complexity
    const avgMessageLength = recentConversations.reduce((sum, c) => sum + c.userMessage.length, 0) / recentConversations.length;
    if (avgMessageLength > 500) {
      patterns.push('User tends to provide detailed, complex requests');
    } else if (avgMessageLength < 100) {
      patterns.push('User prefers concise, direct communication');
    }

    // Analyze technology preferences
    const techMentions = new Map<string, number>();
    recentConversations.forEach(conv => {
      const text = conv.userMessage.toLowerCase();
      ['react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'node', 'nextjs'].forEach(tech => {
        if (text.includes(tech)) {
          techMentions.set(tech, (techMentions.get(tech) || 0) + 1);
        }
      });
    });

    if (techMentions.size > 0) {
      const topTech = Array.from(techMentions.entries()).sort(([,a], [,b]) => b - a)[0][0];
      patterns.push(`Frequently mentions ${topTech} technology`);
    }

    return patterns;
  }

  // Persistence
  private loadUserPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem('mominai-user-preferences');
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
    return this.getDefaultPreferences();
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('mominai-user-preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      codingStyle: {
        indentation: 'spaces',
        spacing: 2,
        namingConvention: 'camelCase'
      },
      technologyPreferences: ['react', 'typescript', 'nextjs'],
      projectTemplates: ['react-app', 'nextjs-app'],
      communicationStyle: 'detailed',
      learningMode: true
    };
  }

  // Cleanup
  clearSessionData(sessionId: string): void {
    this.conversations.delete(sessionId);
    loggingManager.debug('memory', `Cleared session data: ${sessionId}`, {
      operation: 'clear_session_data',
      data: { sessionId }
    });
  }

  clearOldData(olderThanDays: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Clear old conversations
    for (const [sessionId, conversations] of Array.from(this.conversations)) {
      const filtered = conversations.filter((c: ConversationEntry) => c.timestamp >= cutoffDate);
      if (filtered.length === 0) {
        this.conversations.delete(sessionId);
      } else {
        this.conversations.set(sessionId, filtered);
      }
    }

    // Clear old project states
    for (const [projectId, project] of Array.from(this.projectStates)) {
      if (project.lastModified < cutoffDate && project.metadata.status !== 'active') {
        this.projectStates.delete(projectId);
      }
    }

    loggingManager.debug('memory', 'Cleared old data', {
      operation: 'clear_old_data',
      data: { olderThanDays, conversationsCleared: this.conversations.size, projectsCleared: this.projectStates.size }
    });
  }
}

// Convenience functions
export const memoryManager = AdvancedMemoryManager.getInstance();

export const addConversationEntry = (
  sessionId: string,
  userMessage: string,
  aiResponse: string,
  context?: ConversationEntry['context'],
  outcome?: ConversationEntry['outcome']
) => memoryManager.addConversationEntry(sessionId, userMessage, aiResponse, context, outcome);

export const getConversationHistory = (sessionId: string, limit?: number) =>
  memoryManager.getConversationHistory(sessionId, limit);

export const getRelevantContext = (sessionId: string, currentQuery: string, maxEntries?: number) =>
  memoryManager.getRelevantContext(sessionId, currentQuery, maxEntries);

export const updateConversationOutcome = (entryId: string, outcome: ConversationEntry['outcome']) =>
  memoryManager.updateConversationOutcome(entryId, outcome);

export const createProjectState = (projectId: string, name: string, type: string) =>
  memoryManager.createProjectState(projectId, name, type);

export const updateFileState = (projectId: string, filePath: string, content: string) =>
  memoryManager.updateFileState(projectId, filePath, content);

export const getProjectState = (projectId: string) =>
  memoryManager.getProjectState(projectId);

export const getFileState = (projectId: string, filePath: string) =>
  memoryManager.getFileState(projectId, filePath);

export const updateProjectMetadata = (projectId: string, updates: Partial<ProjectState['metadata']>) =>
  memoryManager.updateProjectMetadata(projectId, updates);

export const updateUserPreferences = (updates: Partial<UserPreferences>) =>
  memoryManager.updateUserPreferences(updates);

export const getUserPreferences = () => memoryManager.getUserPreferences();

export const getLearningInsights = (sessionId: string) =>
  memoryManager.getLearningInsights(sessionId);