import { loggingManager } from './logging-manager';
import { memoryManager, getRelevantContext, getUserPreferences, getLearningInsights } from './advanced-memory-manager';

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'analysis' | 'planning' | 'execution' | 'validation' | 'adaptation';
  basePrompt: string;
  variables: string[];
  contextRequirements: string[];
  successRate: number;
  usageCount: number;
  lastModified: Date;
  metadata: {
    complexity: number;
    expectedOutput: string;
    examples: string[];
  };
}

export interface PromptContext {
  sessionId: string;
  userRequest: string;
  projectState?: any;
  conversationHistory?: any[];
  userPreferences?: any;
  learningInsights?: any;
  currentStep?: string;
  previousResults?: any[];
  constraints?: string[];
}

export interface OptimizedPrompt {
  template: PromptTemplate;
  finalPrompt: string;
  contextUsed: string[];
  optimizationScore: number;
  expectedQuality: number;
  metadata: {
    adaptationReason: string;
    confidence: number;
    alternatives: string[];
  };
}

export class DynamicPromptEngine {
  private static instance: DynamicPromptEngine;
  private templates: Map<string, PromptTemplate> = new Map();
  private promptHistory: Map<string, OptimizedPrompt[]> = new Map();
  private adaptationRules: Map<string, any> = new Map();

  private constructor() {
    this.initializeDefaultTemplates();
    this.initializeAdaptationRules();
  }

  static getInstance(): DynamicPromptEngine {
    if (!DynamicPromptEngine.instance) {
      DynamicPromptEngine.instance = new DynamicPromptEngine();
    }
    return DynamicPromptEngine.instance;
  }

  // Core Prompt Generation
  async generateOptimizedPrompt(
    category: PromptTemplate['category'],
    context: PromptContext
  ): Promise<OptimizedPrompt> {
    const relevantContext = getRelevantContext(context.sessionId, context.userRequest);
    const userPrefs = getUserPreferences();
    const learningInsights = getLearningInsights(context.sessionId);

    // Select best template
    const template = this.selectBestTemplate(category, {
      ...context,
      relevantContext,
      userPrefs,
      learningInsights
    });

    // Adapt template based on context
    const adaptedTemplate = await this.adaptTemplate(template, {
      ...context,
      relevantContext,
      userPrefs,
      learningInsights
    });

    // Generate final prompt
    const finalPrompt = this.fillTemplateVariables(adaptedTemplate, {
      ...context,
      relevantContext,
      userPrefs,
      learningInsights
    });

    // Calculate optimization metrics
    const optimizationScore = this.calculateOptimizationScore(adaptedTemplate, context);
    const expectedQuality = this.predictPromptQuality(adaptedTemplate, context);

    const optimizedPrompt: OptimizedPrompt = {
      template: adaptedTemplate,
      finalPrompt,
      contextUsed: this.extractContextUsed(context),
      optimizationScore,
      expectedQuality,
      metadata: {
        adaptationReason: this.getAdaptationReason(adaptedTemplate, template),
        confidence: this.calculateConfidence(adaptedTemplate, context),
        alternatives: this.generateAlternatives(category, context)
      }
    };

    // Store for learning
    this.storePromptHistory(context.sessionId, optimizedPrompt);

    loggingManager.debug('prompt_engine', `Generated optimized prompt for ${category}`, {
      operation: 'generate_optimized_prompt',
      data: {
        category,
        templateId: template.id,
        optimizationScore,
        expectedQuality,
        contextUsed: optimizedPrompt.contextUsed.length
      }
    });

    return optimizedPrompt;
  }

  // Template Selection
  private selectBestTemplate(
    category: PromptTemplate['category'],
    context: any
  ): PromptTemplate {
    const categoryTemplates = Array.from(this.templates.values())
      .filter(t => t.category === category);

    if (categoryTemplates.length === 0) {
      throw new Error(`No templates found for category: ${category}`);
    }

    // Score templates based on context fit
    const scoredTemplates = categoryTemplates.map(template => ({
      template,
      score: this.scoreTemplateFit(template, context)
    }));

    // Return highest scoring template
    scoredTemplates.sort((a, b) => b.score - a.score);
    return scoredTemplates[0].template;
  }

  // Template Adaptation
  private async adaptTemplate(
    template: PromptTemplate,
    context: any
  ): Promise<PromptTemplate> {
    let adaptedTemplate = { ...template };

    // Apply adaptation rules
    for (const [ruleId, rule] of Array.from(this.adaptationRules)) {
      if (rule.condition(context)) {
        adaptedTemplate = await rule.adapt(adaptedTemplate, context);
        loggingManager.debug('prompt_engine', `Applied adaptation rule: ${ruleId}`, {
          operation: 'template_adaptation',
          data: { templateId: template.id, ruleId }
        });
      }
    }

    // Update template metrics
    adaptedTemplate.usageCount++;
    adaptedTemplate.lastModified = new Date();

    return adaptedTemplate;
  }

  // Variable Filling
  private fillTemplateVariables(template: PromptTemplate, context: any): string {
    let prompt = template.basePrompt;

    // Replace standard variables
    const variableMap: { [key: string]: any } = {
      userRequest: context.userRequest,
      projectState: JSON.stringify(context.projectState || {}),
      conversationHistory: this.formatConversationHistory(context.relevantContext || []),
      userPreferences: JSON.stringify(context.userPrefs || {}),
      learningInsights: JSON.stringify(context.learningInsights || {}),
      currentStep: context.currentStep || 'unknown',
      previousResults: JSON.stringify(context.previousResults || []),
      constraints: (context.constraints || []).join(', '),
      sessionId: context.sessionId
    };

    // Replace variables in prompt
    template.variables.forEach(variable => {
      const regex = new RegExp(`\\$\\{${variable}\\}`, 'g');
      const value = variableMap[variable] || '';
      prompt = prompt.replace(regex, value);
    });

    return prompt;
  }

  // Template Scoring
  private scoreTemplateFit(template: PromptTemplate, context: any): number {
    let score = template.successRate * 100; // Base score from success rate

    // Context relevance scoring
    if (context.relevantContext && context.relevantContext.length > 0) {
      score += 10; // Bonus for having relevant context
    }

    // User preference alignment
    if (context.userPrefs) {
      if (context.userPrefs.communicationStyle === 'detailed' && template.metadata.complexity > 5) {
        score += 15;
      }
      if (context.userPrefs.communicationStyle === 'concise' && template.metadata.complexity < 5) {
        score += 15;
      }
    }

    // Learning insights
    if (context.learningInsights) {
      const successfulPatterns = context.learningInsights.successfulPatterns || [];
      const templateWords = template.basePrompt.toLowerCase().split(/\s+/);

      successfulPatterns.forEach((pattern: string) => {
        if (templateWords.some((word: string) => word.includes(pattern.toLowerCase()))) {
          score += 5;
        }
      });
    }

    // Recency bonus
    const daysSinceModified = (Date.now() - template.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSinceModified); // Bonus for recently modified templates

    return score;
  }

  // Optimization Metrics
  private calculateOptimizationScore(template: PromptTemplate, context: any): number {
    let score = 50; // Base score

    // Template quality factors
    score += template.successRate * 30;
    score += Math.min(20, template.usageCount / 10); // Experience bonus

    // Context utilization
    if (context.relevantContext && context.relevantContext.length > 0) {
      score += 15;
    }
    if (context.userPrefs) {
      score += 10;
    }
    if (context.learningInsights) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private predictPromptQuality(template: PromptTemplate, context: any): number {
    // Simple prediction based on template metrics and context
    let quality = template.successRate * 100;

    // Adjust based on context richness
    const contextFactors = [
      context.relevantContext?.length > 0,
      context.userPrefs !== undefined,
      context.learningInsights !== undefined,
      context.projectState !== undefined
    ].filter(Boolean).length;

    quality += contextFactors * 5;

    return Math.min(100, Math.max(0, quality));
  }

  // Learning and Adaptation
  private storePromptHistory(sessionId: string, optimizedPrompt: OptimizedPrompt): void {
    if (!this.promptHistory.has(sessionId)) {
      this.promptHistory.set(sessionId, []);
    }

    const history = this.promptHistory.get(sessionId)!;
    history.unshift(optimizedPrompt);

    // Keep only recent history
    if (history.length > 50) {
      history.splice(50);
    }
  }

  async learnFromFeedback(
    sessionId: string,
    promptId: string,
    feedback: {
      success: boolean;
      quality: number;
      improvements?: string[];
    }
  ): Promise<void> {
    const history = this.promptHistory.get(sessionId);
    if (!history) return;

    const promptEntry = history.find(p => p.template.id === promptId);
    if (!promptEntry) return;

    // Update template success rate
    const template = promptEntry.template;
    const totalUses = template.usageCount;
    const currentSuccessRate = template.successRate;
    const newSuccessRate = feedback.success ?
      (currentSuccessRate * totalUses + 1) / (totalUses + 1) :
      (currentSuccessRate * totalUses) / (totalUses + 1);

    template.successRate = newSuccessRate;
    template.lastModified = new Date();

    // Store learning data
    const learningData = {
      sessionId,
      promptId,
      feedback,
      timestamp: new Date(),
      context: promptEntry.contextUsed
    };

    loggingManager.debug('prompt_engine', 'Learned from feedback', {
      operation: 'learn_from_feedback',
      data: {
        sessionId,
        promptId,
        success: feedback.success,
        quality: feedback.quality,
        newSuccessRate
      }
    });
  }

  // Helper Methods
  private formatConversationHistory(history: any[]): string {
    return history.slice(0, 5).map(entry =>
      `User: ${entry.userMessage}\nAI: ${entry.aiResponse}`
    ).join('\n\n');
  }

  private extractContextUsed(context: any): string[] {
    const used: string[] = [];

    if (context.relevantContext?.length > 0) used.push('conversation_history');
    if (context.userPrefs) used.push('user_preferences');
    if (context.learningInsights) used.push('learning_insights');
    if (context.projectState) used.push('project_state');
    if (context.previousResults?.length > 0) used.push('previous_results');
    if (context.constraints?.length > 0) used.push('constraints');

    return used;
  }

  private getAdaptationReason(adapted: PromptTemplate, original: PromptTemplate): string {
    if (adapted.id !== original.id) {
      return `Switched to template: ${adapted.name}`;
    }
    return 'Template optimized based on context';
  }

  private calculateConfidence(template: PromptTemplate, context: any): number {
    let confidence = template.successRate;

    // Boost confidence with rich context
    if (context.relevantContext?.length > 3) confidence += 0.1;
    if (context.learningInsights) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private generateAlternatives(
    category: PromptTemplate['category'],
    context: any
  ): string[] {
    const alternatives: string[] = [];
    const categoryTemplates = Array.from(this.templates.values())
      .filter(t => t.category === category)
      .sort((a, b) => b.successRate - a.successRate);

    categoryTemplates.slice(1, 4).forEach(template => {
      alternatives.push(template.name);
    });

    return alternatives;
  }

  // Template Management
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    loggingManager.debug('prompt_engine', `Added template: ${template.id}`, {
      operation: 'add_template',
      data: { templateId: template.id, category: template.category }
    });
  }

  updateTemplate(templateId: string, updates: Partial<PromptTemplate>): void {
    const template = this.templates.get(templateId);
    if (template) {
      Object.assign(template, updates);
      template.lastModified = new Date();
      loggingManager.debug('prompt_engine', `Updated template: ${templateId}`, {
        operation: 'update_template',
        data: { templateId, updates: Object.keys(updates) }
      });
    }
  }

  removeTemplate(templateId: string): void {
    this.templates.delete(templateId);
    loggingManager.debug('prompt_engine', `Removed template: ${templateId}`, {
      operation: 'remove_template',
      data: { templateId }
    });
  }

  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  // Initialization
  private initializeDefaultTemplates(): void {
    // Analysis templates
    this.addTemplate({
      id: 'analysis_basic',
      name: 'Basic Request Analysis',
      category: 'analysis',
      basePrompt: `Analyze the following user request and provide a structured breakdown:

User Request: \${userRequest}

Please provide:
1. Main purpose and goals
2. Key features needed
3. Technical requirements
4. Potential challenges
5. Recommended approach

Format your response as a structured analysis.`,
      variables: ['userRequest'],
      contextRequirements: [],
      successRate: 0.85,
      usageCount: 0,
      lastModified: new Date(),
      metadata: {
        complexity: 3,
        expectedOutput: 'Structured analysis with 5 sections',
        examples: ['Feature request analysis', 'Bug report analysis']
      }
    });

    // Planning templates
    this.addTemplate({
      id: 'planning_comprehensive',
      name: 'Comprehensive Planning',
      category: 'planning',
      basePrompt: `Create a detailed execution plan for the following request:

User Request: \${userRequest}
Context: \${conversationHistory}

Based on the analysis and context, create a step-by-step plan that includes:
1. Prerequisites and dependencies
2. Main implementation steps
3. Testing and validation steps
4. Risk mitigation strategies
5. Success criteria

Consider the user's preferences: \${userPreferences}
Learning from previous interactions: \${learningInsights}`,
      variables: ['userRequest', 'conversationHistory', 'userPreferences', 'learningInsights'],
      contextRequirements: ['conversation_history', 'user_preferences'],
      successRate: 0.90,
      usageCount: 0,
      lastModified: new Date(),
      metadata: {
        complexity: 7,
        expectedOutput: 'Detailed multi-step plan',
        examples: ['Complex feature planning', 'System refactoring planning']
      }
    });

    // Execution templates
    this.addTemplate({
      id: 'execution_focused',
      name: 'Focused Execution',
      category: 'execution',
      basePrompt: `Execute the following task with precision and attention to detail:

Task: \${userRequest}
Current Step: \${currentStep}
Previous Results: \${previousResults}

Requirements:
- Follow best practices for \${projectState}
- Consider user preferences: \${userPreferences}
- Apply lessons from similar tasks: \${learningInsights}

Provide a complete, working solution that meets all requirements.`,
      variables: ['userRequest', 'currentStep', 'previousResults', 'projectState', 'userPreferences', 'learningInsights'],
      contextRequirements: ['project_state', 'user_preferences', 'previous_results'],
      successRate: 0.88,
      usageCount: 0,
      lastModified: new Date(),
      metadata: {
        complexity: 6,
        expectedOutput: 'Complete working solution',
        examples: ['Code implementation', 'Configuration setup']
      }
    });

    // Validation templates
    this.addTemplate({
      id: 'validation_thorough',
      name: 'Thorough Validation',
      category: 'validation',
      basePrompt: `Validate the following implementation thoroughly:

Implementation Details: \${previousResults}
Original Requirements: \${userRequest}
Project Context: \${projectState}

Perform comprehensive validation including:
1. Functional correctness
2. Code quality and best practices
3. Error handling and edge cases
4. Performance considerations
5. Security implications
6. Compatibility with existing codebase

Provide detailed feedback and recommendations for improvements.`,
      variables: ['previousResults', 'userRequest', 'projectState'],
      contextRequirements: ['previous_results', 'project_state'],
      successRate: 0.92,
      usageCount: 0,
      lastModified: new Date(),
      metadata: {
        complexity: 5,
        expectedOutput: 'Comprehensive validation report',
        examples: ['Code review', 'Testing validation']
      }
    });
  }

  private initializeAdaptationRules(): void {
    // Rule for complex requests
    this.adaptationRules.set('complexity_boost', {
      condition: (context: any) => context.userRequest?.length > 500,
      adapt: async (template: PromptTemplate, context: any) => {
        return {
          ...template,
          basePrompt: template.basePrompt + '\n\nIMPORTANT: This is a complex request. Take extra time to ensure comprehensive coverage and consider edge cases.',
          metadata: {
            ...template.metadata,
            complexity: template.metadata.complexity + 2
          }
        };
      }
    });

    // Rule for user preference alignment
    this.adaptationRules.set('preference_alignment', {
      condition: (context: any) => context.userPrefs?.communicationStyle,
      adapt: async (template: PromptTemplate, context: any) => {
        const style = context.userPrefs.communicationStyle;
        let adaptation = '';

        if (style === 'detailed') {
          adaptation = '\n\nProvide detailed explanations and comprehensive documentation.';
        } else if (style === 'concise') {
          adaptation = '\n\nBe concise and focus on essential information only.';
        }

        return {
          ...template,
          basePrompt: template.basePrompt + adaptation
        };
      }
    });

    // Rule for learning insights
    this.adaptationRules.set('learning_insights', {
      condition: (context: any) => context.learningInsights?.successfulPatterns?.length > 0,
      adapt: async (template: PromptTemplate, context: any) => {
        const patterns = context.learningInsights.successfulPatterns.slice(0, 3);
        const adaptation = `\n\nBased on successful past interactions, consider incorporating: ${patterns.join(', ')}`;

        return {
          ...template,
          basePrompt: template.basePrompt + adaptation
        };
      }
    });
  }
}

// Convenience functions
export const promptEngine = DynamicPromptEngine.getInstance();

export const generateOptimizedPrompt = (
  category: PromptTemplate['category'],
  context: PromptContext
) => promptEngine.generateOptimizedPrompt(category, context);

export const addPromptTemplate = (template: PromptTemplate) =>
  promptEngine.addTemplate(template);

export const getPromptTemplate = (templateId: string) =>
  promptEngine.getTemplate(templateId);

export const getPromptTemplatesByCategory = (category: PromptTemplate['category']) =>
  promptEngine.getTemplatesByCategory(category);