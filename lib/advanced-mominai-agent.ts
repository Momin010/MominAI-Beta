import { loggingManager } from './logging-manager';
import { performanceMonitor, startTiming, endTiming } from './performance-monitor';
import { reasoningEngine, createWorkflowPlan, executeWorkflowPlan } from './advanced-reasoning-engine';
import { memoryManager, addConversationEntry, getRelevantContext, getUserPreferences, getLearningInsights } from './advanced-memory-manager';
import { promptEngine, generateOptimizedPrompt } from './dynamic-prompt-engine';
import { qualityPipeline, runQualityCheck } from './quality-assurance-pipeline';
import { errorRecovery, handleErrorWithRecovery } from './advanced-error-recovery';
import { getConversationalResponse } from '../src/IDE/services/aiService';

export interface AgentConfig {
  sessionId: string;
  enableLearning: boolean;
  enableQualityChecks: boolean;
  enableErrorRecovery: boolean;
  maxRetries: number;
  timeout: number;
  adaptationEnabled: boolean;
}

export interface AgentContext {
  userRequest: string;
  projectState?: any;
  conversationHistory?: any[];
  userPreferences?: any;
  systemState?: any;
  apiKeys?: any;
  files?: any[];
  learningInsights?: any;
}

export interface AgentResult {
  success: boolean;
  response: string;
  actions: any[];
  qualityReport?: any;
  adaptations?: any[];
  metadata: {
    duration: number;
    reasoningSteps: number;
    qualityScore?: number;
    errorRecoveryUsed?: boolean;
    adaptationsApplied?: number;
  };
}

export interface LearningData {
  sessionId: string;
  userRequest: string;
  agentResponse: string;
  success: boolean;
  qualityScore?: number;
  userFeedback?: {
    rating: number;
    comments?: string;
    improvements?: string[];
  };
  timestamp: Date;
  context: any;
}

export class AdvancedMominAIAgent {
  private static instance: AdvancedMominAIAgent;
  private config: AgentConfig;
  private learningData: LearningData[] = [];
  private activeSessions: Map<string, any> = new Map();

  private constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      sessionId: 'default',
      enableLearning: true,
      enableQualityChecks: true,
      enableErrorRecovery: true,
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      adaptationEnabled: true,
      ...config
    };
  }

  static getInstance(config?: Partial<AgentConfig>): AdvancedMominAIAgent {
    if (!AdvancedMominAIAgent.instance) {
      AdvancedMominAIAgent.instance = new AdvancedMominAIAgent(config);
    }
    return AdvancedMominAIAgent.instance;
  }

  // Main Agent Processing Method
  async processRequest(
    userRequest: string,
    context: AgentContext
  ): Promise<AgentResult> {
    const operationId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      performanceMonitor.startTiming('agent_request', 'operation', {
        operationId,
        sessionId: this.config.sessionId,
        requestLength: userRequest.length
      });

      loggingManager.info('agent', 'Processing user request', {
        operation: 'request_processing_start',
        data: {
          operationId,
          sessionId: this.config.sessionId,
          requestLength: userRequest.length
        }
      });

      // Step 1: Context Gathering and Memory Integration
      const enrichedContext = await this.enrichContext(context);

      // Step 2: Reasoning and Planning
      const workflowPlan = await this.createReasoningPlan(userRequest, enrichedContext);

      // Step 3: Quality Assurance (Pre-execution)
      let qualityReport;
      if (this.config.enableQualityChecks) {
        qualityReport = await this.performQualityChecks(userRequest, enrichedContext);
      }

      // Step 4: Dynamic Prompt Generation
      const optimizedPrompt = await this.generateDynamicPrompt(userRequest, enrichedContext);

      // Step 5: Execute with Error Recovery
      const executionResult = await this.executeWithRecovery(
        optimizedPrompt,
        enrichedContext,
        operationId
      );

      // Step 6: Post-execution Quality Check
      let finalQualityReport;
      if (this.config.enableQualityChecks && executionResult.success) {
        finalQualityReport = await this.performQualityChecks(executionResult.response, enrichedContext);
      }

      // Step 7: Learning and Adaptation
      if (this.config.enableLearning) {
        const agentResultForLearning: AgentResult = {
          success: executionResult.success,
          response: executionResult.response,
          actions: executionResult.actions || [],
          qualityReport: finalQualityReport,
          adaptations: executionResult.adaptations || [],
          metadata: {
            duration: Date.now() - startTime,
            reasoningSteps: workflowPlan?.steps.length || 0,
            qualityScore: finalQualityReport?.quality.score,
            errorRecoveryUsed: executionResult.recoveryUsed || false,
            adaptationsApplied: executionResult.adaptations?.length || 0
          }
        };
        await this.learnFromInteraction(userRequest, agentResultForLearning, enrichedContext);
      }

      // Step 8: Memory Update
      await this.updateMemory(userRequest, executionResult.response, enrichedContext, executionResult.success);

      const duration = Date.now() - startTime;
      const result: AgentResult = {
        success: executionResult.success,
        response: executionResult.response,
        actions: executionResult.actions || [],
        qualityReport: finalQualityReport,
        adaptations: executionResult.adaptations || [],
        metadata: {
          duration,
          reasoningSteps: workflowPlan?.steps.length || 0,
          qualityScore: finalQualityReport?.quality.score,
          errorRecoveryUsed: executionResult.recoveryUsed || false,
          adaptationsApplied: executionResult.adaptations?.length || 0
        }
      };

      performanceMonitor.endTiming(operationId, {
        success: result.success,
        duration: result.metadata.duration,
        qualityScore: result.metadata.qualityScore
      });

      loggingManager.info('agent', 'Request processing completed', {
        operation: 'request_processing_complete',
        data: {
          operationId,
          success: result.success,
          duration: result.metadata.duration,
          qualityScore: result.metadata.qualityScore
        }
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.endTiming(operationId, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      loggingManager.error('agent', 'Request processing failed', {
        operation: 'request_processing_failed',
        data: {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          duration
        }
      });

      // Attempt error recovery
      if (this.config.enableErrorRecovery) {
        return await this.handleProcessingError(error, context, operationId);
      }

      return {
        success: false,
        response: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
        actions: [],
        metadata: {
          duration,
          reasoningSteps: 0,
          errorRecoveryUsed: false,
          adaptationsApplied: 0
        }
      };
    }
  }

  // Context Enrichment
  private async enrichContext(context: AgentContext): Promise<any> {
    const enriched = { ...context };

    // Add conversation history
    enriched.conversationHistory = getRelevantContext(
      this.config.sessionId,
      context.userRequest,
      10
    );

    // Add user preferences
    enriched.userPreferences = getUserPreferences();

    // Add learning insights
    enriched.learningInsights = getLearningInsights(this.config.sessionId);

    // Add project state if available
    if (context.projectState) {
      enriched.projectState = context.projectState;
    }

    return enriched;
  }

  // Reasoning and Planning
  private async createReasoningPlan(userRequest: string, context: any): Promise<any> {
    try {
      const plan = await createWorkflowPlan(this.config.sessionId, userRequest, context);
      return plan;
    } catch (error) {
      loggingManager.warn('agent', 'Failed to create reasoning plan, using fallback', {
        operation: 'reasoning_plan_fallback',
        data: { error: error instanceof Error ? error.message : String(error) }
      });

      // Return a basic plan
      return {
        id: `fallback_${Date.now()}`,
        steps: [
          { id: 'analyze', type: 'analysis' },
          { id: 'execute', type: 'execution' },
          { id: 'validate', type: 'validation' }
        ]
      };
    }
  }

  // Quality Assurance
  private async performQualityChecks(content: string, context: any): Promise<any> {
    try {
      // For now, we'll check the user request - in real implementation, check generated code
      const report = await runQualityCheck(content, 'user_request', context);
      return report;
    } catch (error) {
      loggingManager.warn('agent', 'Quality check failed', {
        operation: 'quality_check_failed',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
      return null;
    }
  }

  // Dynamic Prompt Generation
  private async generateDynamicPrompt(userRequest: string, context: any): Promise<any> {
    try {
      const promptContext = {
        sessionId: this.config.sessionId,
        userRequest,
        projectState: context.projectState,
        conversationHistory: context.conversationHistory,
        userPreferences: context.userPreferences,
        learningInsights: context.learningInsights
      };

      const optimizedPrompt = await generateOptimizedPrompt('execution', promptContext);
      return optimizedPrompt;
    } catch (error) {
      loggingManager.warn('agent', 'Dynamic prompt generation failed, using fallback', {
        operation: 'prompt_generation_fallback',
        data: { error: error instanceof Error ? error.message : String(error) }
      });

      return {
        finalPrompt: userRequest,
        optimizationScore: 50,
        metadata: { adaptationReason: 'fallback' }
      };
    }
  }

  // Execution with Error Recovery
  private async executeWithRecovery(
    optimizedPrompt: any,
    context: any,
    operationId: string
  ): Promise<{
    success: boolean;
    response: string;
    actions?: any[];
    recoveryUsed?: boolean;
    adaptations?: any[];
  }> {
    const maxRetries = this.config.maxRetries;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeCoreLogic(optimizedPrompt, context);

        return {
          success: true,
          response: response.response,
          actions: response.actions
        };

      } catch (error) {
        lastError = error;
        loggingManager.warn('agent', `Execution attempt ${attempt + 1} failed`, {
          operation: 'execution_attempt_failed',
          data: {
            attempt: attempt + 1,
            maxRetries,
            error: error instanceof Error ? error.message : String(error)
          }
        });

        // Try error recovery
        if (this.config.enableErrorRecovery && attempt < maxRetries) {
          const recoveryResult = await handleErrorWithRecovery(error, context, operationId);

          if (recoveryResult.recovered) {
            loggingManager.info('agent', 'Error recovery successful', {
              operation: 'error_recovery_success',
              data: { attempt: attempt + 1, strategyUsed: recoveryResult.strategyUsed }
            });

            return {
              success: true,
              response: recoveryResult.result || 'Recovered from error',
              recoveryUsed: true,
              adaptations: recoveryResult.adaptations
            };
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      response: `Failed after ${maxRetries + 1} attempts. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    };
  }

  // Core Execution Logic
  private async executeCoreLogic(
    optimizedPrompt: any,
    context: any
  ): Promise<{ response: string; actions: any[] }> {
    // Use the AI service to get response
    const response = await getConversationalResponse(
      optimizedPrompt.finalPrompt,
      'code',
      context.apiKeys
    );

    // In a real implementation, this would parse and execute actions
    // For now, return the response
    return {
      response,
      actions: []
    };
  }

  // Learning System
  private async learnFromInteraction(
    userRequest: string,
    result: AgentResult,
    context: any
  ): Promise<void> {
    const learningEntry: LearningData = {
      sessionId: this.config.sessionId,
      userRequest,
      agentResponse: result.response,
      success: result.success,
      qualityScore: result.metadata.qualityScore,
      timestamp: new Date(),
      context
    };

    this.learningData.push(learningEntry);

    // Keep only recent learning data
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-1000);
    }

    // Update memory with learning insights
    await this.updateMemory(userRequest, result.response, context, result.success);

    loggingManager.debug('agent', 'Learned from interaction', {
      operation: 'learning_update',
      data: {
        sessionId: this.config.sessionId,
        success: result.success,
        qualityScore: result.metadata.qualityScore
      }
    });
  }

  // Memory Management
  private async updateMemory(
    userRequest: string,
    aiResponse: string,
    context: any,
    success: boolean
  ): Promise<void> {
    const entryId = addConversationEntry(
      this.config.sessionId,
      userRequest,
      aiResponse,
      {
        projectState: context.projectState,
        userPreferences: context.userPreferences,
        sessionMetadata: {
          qualityScore: context.qualityScore,
          duration: context.duration
        }
      },
      {
        success,
        feedback: context.userFeedback,
        rating: context.userRating
      }
    );

    loggingManager.debug('agent', 'Updated conversation memory', {
      operation: 'memory_update',
      data: { sessionId: this.config.sessionId, entryId, success }
    });
  }

  // Error Handling
  private async handleProcessingError(
    error: any,
    context: AgentContext,
    operationId: string
  ): Promise<AgentResult> {
    const recoveryResult = await handleErrorWithRecovery(error, context, operationId);

    if (recoveryResult.recovered) {
      return {
        success: true,
        response: recoveryResult.result || 'Recovered from processing error',
        actions: [],
        adaptations: recoveryResult.adaptations,
        metadata: {
          duration: 0,
          reasoningSteps: 0,
          errorRecoveryUsed: true,
          adaptationsApplied: recoveryResult.adaptations?.length || 0
        }
      };
    }

    return {
      success: false,
      response: `Processing failed and recovery unsuccessful: ${error instanceof Error ? error.message : String(error)}`,
      actions: [],
      metadata: {
        duration: 0,
        reasoningSteps: 0,
        errorRecoveryUsed: true,
        adaptationsApplied: 0
      }
    };
  }

  // Configuration and Management
  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    loggingManager.debug('agent', 'Updated agent configuration', {
      operation: 'config_update',
      data: { updates: Object.keys(updates) }
    });
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getLearningData(limit: number = 100): LearningData[] {
    return this.learningData.slice(-limit);
  }

  getPerformanceStats(): any {
    return performanceMonitor.getStats('agent_request');
  }

  clearLearningData(): void {
    this.learningData = [];
    loggingManager.debug('agent', 'Cleared learning data', {
      operation: 'learning_data_cleared'
    });
  }

  // Session Management
  startSession(sessionId: string): void {
    this.config.sessionId = sessionId;
    this.activeSessions.set(sessionId, {
      startTime: new Date(),
      requestCount: 0,
      successCount: 0
    });

    loggingManager.info('agent', `Started new session: ${sessionId}`, {
      operation: 'session_start',
      data: { sessionId }
    });
  }

  endSession(sessionId?: string): void {
    const targetSessionId = sessionId || this.config.sessionId;
    const session = this.activeSessions.get(targetSessionId);

    if (session) {
      const duration = Date.now() - session.startTime.getTime();
      loggingManager.info('agent', `Ended session: ${targetSessionId}`, {
        operation: 'session_end',
        data: {
          sessionId: targetSessionId,
          duration,
          requestCount: session.requestCount,
          successRate: session.requestCount > 0 ? session.successCount / session.requestCount : 0
        }
      });

      this.activeSessions.delete(targetSessionId);
    }
  }

  getActiveSessions(): any[] {
    return Array.from(this.activeSessions.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }
}

// Convenience functions
export const advancedAgent = AdvancedMominAIAgent.getInstance();

export const processUserRequest = (
  userRequest: string,
  context: AgentContext,
  config?: Partial<AgentConfig>
) => {
  const agent = AdvancedMominAIAgent.getInstance(config);
  return agent.processRequest(userRequest, context);
};

export const updateAgentConfig = (updates: Partial<AgentConfig>) =>
  advancedAgent.updateConfig(updates);

export const getAgentConfig = () => advancedAgent.getConfig();

export const getAgentLearningData = (limit?: number) =>
  advancedAgent.getLearningData(limit);

export const getAgentPerformanceStats = () =>
  advancedAgent.getPerformanceStats();

export const startAgentSession = (sessionId: string) =>
  advancedAgent.startSession(sessionId);

export const endAgentSession = (sessionId?: string) =>
  advancedAgent.endSession(sessionId);