import { loggingManager } from './logging-manager';
import { handleError, ErrorDetails, ErrorRecovery } from './error-handler';
import { performanceMonitor } from './performance-monitor';
import { getConversationalResponse } from '../src/IDE/services/aiService';

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  triggerCondition: (error: ErrorDetails, context: any) => boolean;
  executionPlan: RecoveryStep[];
  successRate: number;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites?: string[];
}

export interface RecoveryStep {
  id: string;
  name: string;
  description: string;
  action: (context: any) => Promise<RecoveryResult>;
  timeout?: number;
  retryCount?: number;
  fallbackAction?: (context: any) => Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  nextSteps?: string[];
  sideEffects?: string[];
}

export interface AdaptationRule {
  id: string;
  name: string;
  description: string;
  condition: (context: AdaptationContext) => boolean;
  action: (context: AdaptationContext) => Promise<AdaptationResult>;
  priority: number;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
}

export interface AdaptationContext {
  errorHistory: ErrorDetails[];
  performanceMetrics: any;
  userBehavior: any;
  systemState: any;
  recentActions: any[];
}

export interface AdaptationResult {
  changes: SystemChange[];
  rationale: string;
  expectedImpact: string;
  rollbackPlan?: string;
}

export interface SystemChange {
  type: 'config' | 'strategy' | 'resource' | 'behavior';
  target: string;
  oldValue: any;
  newValue: any;
  reversible: boolean;
}

export interface FailurePattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurred: Date;
  commonCauses: string[];
  provenSolutions: string[];
  preventionMeasures: string[];
}

export class AdvancedErrorRecovery {
  private static instance: AdvancedErrorRecovery;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private adaptationRules: Map<string, AdaptationRule> = new Map();
  private failurePatterns: Map<string, FailurePattern> = new Map();
  private activeRecoveries: Map<string, any> = new Map();

  private constructor() {
    this.initializeRecoveryStrategies();
    this.initializeAdaptationRules();
  }

  static getInstance(): AdvancedErrorRecovery {
    if (!AdvancedErrorRecovery.instance) {
      AdvancedErrorRecovery.instance = new AdvancedErrorRecovery();
    }
    return AdvancedErrorRecovery.instance;
  }

  // Core Recovery Methods
  async handleErrorWithRecovery(
    error: any,
    context: any,
    operationId: string
  ): Promise<{
    recovered: boolean;
    result?: any;
    strategyUsed?: string;
    adaptations?: AdaptationResult[];
  }> {
    const errorDetails = handleError(error, operationId);
    const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      performanceMonitor.startTiming('error_recovery', 'operation', {
        recoveryId,
        errorCode: errorDetails.code,
        operationId
      });

      // Analyze error and select recovery strategy
      const strategy = await this.selectRecoveryStrategy(errorDetails, context);

      if (!strategy) {
        loggingManager.warn('recovery', 'No suitable recovery strategy found', {
          operation: 'error_recovery',
          data: { errorCode: errorDetails.code, operationId }
        });
        return { recovered: false };
      }

      // Execute recovery
      const recoveryResult = await this.executeRecoveryStrategy(strategy, {
        ...context,
        error: errorDetails,
        recoveryId
      });

      // Check for adaptations needed
      const adaptations = await this.checkAndApplyAdaptations({
        errorHistory: [errorDetails],
        performanceMetrics: performanceMonitor.getStats(),
        userBehavior: context.userBehavior || {},
        systemState: context.systemState || {},
        recentActions: context.recentActions || []
      });

      // Learn from the recovery
      await this.learnFromRecovery(strategy, recoveryResult, errorDetails);

      performanceMonitor.endTiming(recoveryId, {
        success: recoveryResult.recovered,
        strategyUsed: strategy.id,
        adaptationsApplied: adaptations.length
      });

      loggingManager.info('recovery', `Error recovery ${recoveryResult.recovered ? 'successful' : 'failed'}`, {
        operation: 'error_recovery_complete',
        data: {
          recoveryId,
          strategy: strategy.id,
          success: recoveryResult.recovered,
          adaptations: adaptations.length
        }
      });

      return {
        recovered: recoveryResult.recovered,
        result: recoveryResult.result,
        strategyUsed: strategy.id,
        adaptations
      };

    } catch (recoveryError) {
      performanceMonitor.endTiming(recoveryId, { success: false, error: 'recovery_failed' });

      loggingManager.error('recovery', 'Recovery execution failed', {
        operation: 'recovery_execution_failed',
        data: { recoveryId, error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) }
      });

      return { recovered: false };
    }
  }

  // Strategy Selection and Execution
  private async selectRecoveryStrategy(
    error: ErrorDetails,
    context: any
  ): Promise<RecoveryStrategy | null> {
    const candidates = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.triggerCondition(error, context))
      .sort((a, b) => {
        // Sort by success rate, then by risk level, then by estimated time
        if (Math.abs(a.successRate - b.successRate) > 0.1) {
          return b.successRate - a.successRate;
        }
        const riskOrder = { low: 0, medium: 1, high: 2 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return a.estimatedTime - b.estimatedTime;
      });

    if (candidates.length === 0) return null;

    // Select the best candidate, but consider context
    const bestCandidate = candidates[0];

    // Check prerequisites
    if (bestCandidate.prerequisites) {
      const missingPrereqs = bestCandidate.prerequisites.filter(prereq =>
        !this.checkPrerequisite(prereq, context)
      );

      if (missingPrereqs.length > 0) {
        loggingManager.debug('recovery', `Strategy ${bestCandidate.id} missing prerequisites`, {
          operation: 'strategy_selection',
          data: { strategy: bestCandidate.id, missingPrereqs }
        });

        // Try next best candidate
        return candidates[1] || null;
      }
    }

    return bestCandidate;
  }

  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    context: any
  ): Promise<{ recovered: boolean; result?: any }> {
    loggingManager.info('recovery', `Executing recovery strategy: ${strategy.name}`, {
      operation: 'strategy_execution_start',
      data: { strategyId: strategy.id, stepCount: strategy.executionPlan.length }
    });

    const results: RecoveryResult[] = [];

    for (const step of strategy.executionPlan) {
      try {
        const stepResult = await this.executeRecoveryStep(step, context);
        results.push(stepResult);

        if (!stepResult.success) {
          // Try fallback if available
          if (step.fallbackAction) {
            loggingManager.debug('recovery', `Primary step failed, trying fallback for ${step.name}`, {
              operation: 'step_fallback',
              data: { stepId: step.id, strategyId: strategy.id }
            });

            const fallbackResult = await step.fallbackAction(context);
            results.push(fallbackResult);

            if (!fallbackResult.success) {
              return { recovered: false };
            }
          } else {
            return { recovered: false };
          }
        }

        // Check if we need to adjust next steps based on result
        if (stepResult.nextSteps && stepResult.nextSteps.length > 0) {
          // In a real implementation, this would modify the execution plan
          loggingManager.debug('recovery', `Step ${step.id} suggested next steps`, {
            operation: 'step_next_steps',
            data: { stepId: step.id, nextSteps: stepResult.nextSteps }
          });
        }

      } catch (stepError) {
        loggingManager.warn('recovery', `Recovery step failed: ${step.name}`, {
          operation: 'step_execution_failed',
          data: {
            stepId: step.id,
            strategyId: strategy.id,
            error: stepError instanceof Error ? stepError.message : String(stepError)
          }
        });
        return { recovered: false };
      }
    }

    return {
      recovered: true,
      result: results
    };
  }

  private async executeRecoveryStep(
    step: RecoveryStep,
    context: any
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      let result: RecoveryResult;

      if (step.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Step timeout')), step.timeout)
        );

        result = await Promise.race([
          step.action(context),
          timeoutPromise
        ]);
      } else {
        result = await step.action(context);
      }

      result.duration = Date.now() - startTime;
      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  // Adaptation System
  private async checkAndApplyAdaptations(
    context: AdaptationContext
  ): Promise<AdaptationResult[]> {
    const applicableRules = Array.from(this.adaptationRules.values())
      .filter(rule => {
        // Check cooldown period
        if (rule.lastTriggered) {
          const cooldownMs = rule.cooldownPeriod * 60 * 1000;
          const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
          if (timeSinceLastTrigger < cooldownMs) {
            return false;
          }
        }

        return rule.condition(context);
      })
      .sort((a, b) => b.priority - a.priority);

    const adaptations: AdaptationResult[] = [];

    for (const rule of applicableRules) {
      try {
        const result = await rule.action(context);
        adaptations.push(result);

        // Update last triggered time
        rule.lastTriggered = new Date();

        loggingManager.info('recovery', `Applied adaptation rule: ${rule.name}`, {
          operation: 'adaptation_applied',
          data: { ruleId: rule.id, changes: result.changes.length }
        });

      } catch (error) {
        loggingManager.warn('recovery', `Adaptation rule failed: ${rule.name}`, {
          operation: 'adaptation_failed',
          data: { ruleId: rule.id, error: error instanceof Error ? error.message : String(error) }
        });
      }
    }

    return adaptations;
  }

  // Learning System
  private async learnFromRecovery(
    strategy: RecoveryStrategy,
    result: { recovered: boolean; result?: any },
    originalError: ErrorDetails
  ): Promise<void> {
    // Update strategy success rate
    const totalAttempts = Math.round(strategy.successRate * 100) + 1;
    const successes = Math.round(strategy.successRate * totalAttempts) + (result.recovered ? 1 : 0);
    strategy.successRate = successes / totalAttempts;

    // Update failure patterns
    await this.updateFailurePatterns(originalError, result.recovered, strategy.id);

    loggingManager.debug('recovery', 'Learned from recovery attempt', {
      operation: 'learning_from_recovery',
      data: {
        strategyId: strategy.id,
        success: result.recovered,
        newSuccessRate: strategy.successRate,
        errorCode: originalError.code
      }
    });
  }

  private async updateFailurePatterns(
    error: ErrorDetails,
    recovered: boolean,
    strategyUsed: string
  ): Promise<void> {
    const patternKey = `${error.code}_${error.operation || 'unknown'}`;

    let pattern = this.failurePatterns.get(patternKey);
    if (!pattern) {
      pattern = {
        id: patternKey,
        pattern: patternKey,
        frequency: 0,
        lastOccurred: new Date(),
        commonCauses: [],
        provenSolutions: [],
        preventionMeasures: []
      };
      this.failurePatterns.set(patternKey, pattern);
    }

    pattern.frequency++;
    pattern.lastOccurred = new Date();

    if (recovered) {
      if (!pattern.provenSolutions.includes(strategyUsed)) {
        pattern.provenSolutions.push(strategyUsed);
      }
    } else {
      // Analyze what went wrong and suggest prevention measures
      const prevention = await this.analyzePreventionMeasures(error);
      if (prevention && !pattern.preventionMeasures.includes(prevention)) {
        pattern.preventionMeasures.push(prevention);
      }
    }
  }

  // Helper Methods
  private checkPrerequisite(prerequisite: string, context: any): boolean {
    // Simple prerequisite checking - in real implementation, this would be more sophisticated
    switch (prerequisite) {
      case 'network_available':
        return navigator.onLine;
      case 'api_keys_configured':
        return !!(context.apiKeys?.openRouter || context.apiKeys?.google);
      case 'sufficient_resources':
        return true; // Would check system resources
      default:
        return true;
    }
  }

  private async analyzePreventionMeasures(error: ErrorDetails): Promise<string | null> {
    // Simple analysis - in real implementation, use ML/AI
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Implement retry logic with exponential backoff';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Implement request throttling and queuing';
      case 'TIMEOUT_ERROR':
        return 'Increase timeout values and implement async processing';
      default:
        return 'Add comprehensive error handling and logging';
    }
  }

  // Strategy and Rule Management
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
    loggingManager.debug('recovery', `Added recovery strategy: ${strategy.id}`, {
      operation: 'add_recovery_strategy',
      data: { strategyId: strategy.id, riskLevel: strategy.riskLevel }
    });
  }

  addAdaptationRule(rule: AdaptationRule): void {
    this.adaptationRules.set(rule.id, rule);
    loggingManager.debug('recovery', `Added adaptation rule: ${rule.id}`, {
      operation: 'add_adaptation_rule',
      data: { ruleId: rule.id, priority: rule.priority }
    });
  }

  getRecoveryStrategies(): RecoveryStrategy[] {
    return Array.from(this.recoveryStrategies.values());
  }

  getAdaptationRules(): AdaptationRule[] {
    return Array.from(this.adaptationRules.values());
  }

  getFailurePatterns(): FailurePattern[] {
    return Array.from(this.failurePatterns.values());
  }

  // Initialization
  private initializeRecoveryStrategies(): void {
    // Network Error Recovery
    this.addRecoveryStrategy({
      id: 'network_retry',
      name: 'Network Retry Strategy',
      description: 'Retry failed network requests with exponential backoff',
      triggerCondition: (error) => error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT_ERROR',
      executionPlan: [
        {
          id: 'retry_with_backoff',
          name: 'Retry with Exponential Backoff',
          description: 'Retry the failed request with increasing delays',
          action: async (context) => {
            const maxRetries = 3;
            let delay = 1000;

            for (let i = 0; i < maxRetries; i++) {
              try {
                // In real implementation, this would retry the actual request
                await new Promise(resolve => setTimeout(resolve, delay));
                return { success: true, duration: delay };
              } catch (error) {
                delay *= 2;
              }
            }

            return { success: false, error: 'Max retries exceeded', duration: delay };
          },
          timeout: 30000,
          retryCount: 3
        }
      ],
      successRate: 0.75,
      estimatedTime: 5000,
      riskLevel: 'low'
    });

    // API Rate Limit Recovery
    this.addRecoveryStrategy({
      id: 'rate_limit_wait',
      name: 'Rate Limit Wait Strategy',
      description: 'Wait for rate limit to reset before retrying',
      triggerCondition: (error) => error.code === 'RATE_LIMIT_EXCEEDED',
      executionPlan: [
        {
          id: 'wait_and_retry',
          name: 'Wait and Retry',
          description: 'Wait for rate limit cooldown period',
          action: async (context) => {
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
            return { success: true, duration: 60000 };
          },
          timeout: 65000
        }
      ],
      successRate: 0.90,
      estimatedTime: 60000,
      riskLevel: 'low'
    });

    // Resource Exhaustion Recovery
    this.addRecoveryStrategy({
      id: 'resource_cleanup',
      name: 'Resource Cleanup Strategy',
      description: 'Clean up resources and retry operation',
      triggerCondition: (error) => error.code === 'RESOURCE_EXHAUSTED' || error.message?.includes('memory'),
      executionPlan: [
        {
          id: 'cleanup_resources',
          name: 'Clean Up Resources',
          description: 'Free up system resources',
          action: async (context) => {
            // Force garbage collection if available
            if (typeof window !== 'undefined' && (window as any).gc) {
              (window as any).gc();
            }

            // Clear any cached data
            if (context.cache) {
              context.cache.clear();
            }

            return { success: true, duration: 1000 };
          },
          timeout: 5000
        }
      ],
      successRate: 0.60,
      estimatedTime: 2000,
      riskLevel: 'medium'
    });
  }

  private initializeAdaptationRules(): void {
    // High Error Rate Adaptation
    this.addAdaptationRule({
      id: 'high_error_rate_adaptation',
      name: 'High Error Rate Adaptation',
      description: 'Adapt system behavior when error rates are consistently high',
      condition: (context) => {
        const recentErrors = context.errorHistory.filter(
          error => Date.now() - error.timestamp.getTime() < 3600000 // Last hour
        );
        return recentErrors.length > 10;
      },
      action: async (context) => ({
        changes: [
          {
            type: 'config',
            target: 'error_handling',
            oldValue: 'standard',
            newValue: 'aggressive',
            reversible: true
          },
          {
            type: 'strategy',
            target: 'retry_policy',
            oldValue: 'normal',
            newValue: 'conservative',
            reversible: true
          }
        ],
        rationale: 'High error rate detected - implementing more conservative error handling',
        expectedImpact: 'Reduced error frequency but potentially slower response times',
        rollbackPlan: 'Revert to standard error handling configuration'
      }),
      priority: 8,
      cooldownPeriod: 30
    });

    // Performance Degradation Adaptation
    this.addAdaptationRule({
      id: 'performance_degradation_adaptation',
      name: 'Performance Degradation Adaptation',
      description: 'Adapt when performance metrics show degradation',
      condition: (context) => {
        const recentPerf = context.performanceMetrics;
        return recentPerf && recentPerf.averageDuration > 10000; // Over 10 seconds
      },
      action: async (context) => ({
        changes: [
          {
            type: 'config',
            target: 'processing_mode',
            oldValue: 'normal',
            newValue: 'optimized',
            reversible: true
          },
          {
            type: 'resource',
            target: 'cache_strategy',
            oldValue: 'lazy',
            newValue: 'aggressive',
            reversible: true
          }
        ],
        rationale: 'Performance degradation detected - optimizing resource usage',
        expectedImpact: 'Improved response times with potentially higher memory usage',
        rollbackPlan: 'Revert to normal processing mode'
      }),
      priority: 7,
      cooldownPeriod: 15
    });

    // Memory Pressure Adaptation
    this.addAdaptationRule({
      id: 'memory_pressure_adaptation',
      name: 'Memory Pressure Adaptation',
      description: 'Adapt when system is under memory pressure',
      condition: (context) => {
        const memory = performanceMonitor.getMemoryUsage();
        return memory.percentage > 80;
      },
      action: async (context) => ({
        changes: [
          {
            type: 'behavior',
            target: 'caching_policy',
            oldValue: 'aggressive',
            newValue: 'conservative',
            reversible: true
          },
          {
            type: 'resource',
            target: 'batch_size',
            oldValue: 'large',
            newValue: 'small',
            reversible: true
          }
        ],
        rationale: 'High memory usage detected - reducing memory footprint',
        expectedImpact: 'Lower memory usage with potentially reduced throughput',
        rollbackPlan: 'Restore previous caching and batch size settings'
      }),
      priority: 9,
      cooldownPeriod: 5
    });
  }
}

// Convenience functions
export const errorRecovery = AdvancedErrorRecovery.getInstance();

export const handleErrorWithRecovery = (
  error: any,
  context: any,
  operationId: string
) => errorRecovery.handleErrorWithRecovery(error, context, operationId);

export const addRecoveryStrategy = (strategy: RecoveryStrategy) =>
  errorRecovery.addRecoveryStrategy(strategy);

export const addAdaptationRule = (rule: AdaptationRule) =>
  errorRecovery.addAdaptationRule(rule);

export const getRecoveryStrategies = () => errorRecovery.getRecoveryStrategies();

export const getAdaptationRules = () => errorRecovery.getAdaptationRules();

export const getFailurePatterns = () => errorRecovery.getFailurePatterns();