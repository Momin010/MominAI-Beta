/**
 * AI-Powered Code Review System
 * Advanced static analysis and intelligent suggestions
 */

import { Diagnostic, AIFixResponse } from '../types';
import { auditLogger } from '../../../lib/audit-logger';

enum AuditEventType {
  CODE_REVIEW_COMPLETED = 'code_review_completed'
}

export interface CodeReviewResult {
  diagnostics: Diagnostic[];
  suggestions: CodeSuggestion[];
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
  maintainabilityScore: number;
  overallScore: number;
  reviewTime: number;
}

export interface CodeSuggestion {
  id: string;
  type: 'improvement' | 'bug_fix' | 'security' | 'performance' | 'style';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  column: number;
  code: string;
  aiGenerated: boolean;
  confidence: number;
}

export interface SecurityIssue {
  id: string;
  type: 'injection' | 'xss' | 'auth_bypass' | 'data_leak' | 'weak_crypto';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  cwe?: string;
  fix: string;
}

export interface PerformanceIssue {
  id: string;
  type: 'memory_leak' | 'slow_algorithm' | 'inefficient_query' | 'blocking_call';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  line: number;
  suggestion: string;
}

export class AICodeReview {
  private static instance: AICodeReview;

  static getInstance(): AICodeReview {
    if (!AICodeReview.instance) {
      AICodeReview.instance = new AICodeReview();
    }
    return AICodeReview.instance;
  }

  /**
   * Perform comprehensive code review
   */
  async reviewCode(
    code: string,
    filePath: string,
    language: string,
    userId: string
  ): Promise<CodeReviewResult> {
    const startTime = Date.now();

    try {
      // Run multiple analysis types in parallel
      const [
        staticAnalysis,
        aiAnalysis,
        securityAnalysis,
        performanceAnalysis
      ] = await Promise.all([
        this.performStaticAnalysis(code, language),
        this.performAIAnalysis(code, language),
        this.performSecurityAnalysis(code, language),
        this.performPerformanceAnalysis(code, language)
      ]);

      // Combine and deduplicate results
      const diagnostics = this.mergeDiagnostics([
        ...staticAnalysis.diagnostics,
        ...aiAnalysis.diagnostics
      ]);

      const suggestions = [
        ...staticAnalysis.suggestions,
        ...aiAnalysis.suggestions
      ];

      const securityIssues = securityAnalysis.issues;
      const performanceIssues = performanceAnalysis.issues;

      // Calculate scores
      const maintainabilityScore = this.calculateMaintainabilityScore(code, diagnostics);
      const overallScore = this.calculateOverallScore(
        diagnostics,
        suggestions,
        securityIssues,
        performanceIssues
      );

      const result: CodeReviewResult = {
        diagnostics,
        suggestions,
        securityIssues,
        performanceIssues,
        maintainabilityScore,
        overallScore,
        reviewTime: Date.now() - startTime
      };

      // Audit log
      await auditLogger.log({
        userId,
        eventType: 'code_review_completed' as any,
        resourceType: 'code_review',
        resourceId: filePath,
        action: 'code_review_completed',
        details: {
          language,
          diagnosticsCount: diagnostics.length,
          suggestionsCount: suggestions.length,
          securityIssuesCount: securityIssues.length,
          overallScore
        },
        ipAddress: '', // Would be populated by middleware
        userAgent: '',
        severity: 'low'
      });

      return result;
    } catch (error) {
      console.error('Code review failed:', error);
      throw new Error('Failed to complete code review');
    }
  }

  /**
   * Perform static analysis
   */
  private async performStaticAnalysis(code: string, language: string): Promise<{
    diagnostics: Diagnostic[];
    suggestions: CodeSuggestion[];
  }> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: CodeSuggestion[] = [];

    // Basic syntax and style checks
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for long lines
      if (line.length > 120) {
        diagnostics.push({
          source: 'static-analysis',
          line: lineNumber,
          message: 'Line exceeds 120 characters',
          severity: 'warning',
          startCol: 120,
          endCol: line.length
        });
      }

      // Check for TODO comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        suggestions.push({
          id: `todo-${lineNumber}`,
          type: 'improvement',
          title: 'TODO comment found',
          description: 'Consider addressing this TODO item',
          severity: 'low',
          line: lineNumber,
          column: line.indexOf('TODO') !== -1 ? line.indexOf('TODO') : line.indexOf('FIXME'),
          code: line.trim(),
          aiGenerated: false,
          confidence: 1.0
        });
      }

      // Check for console.log statements
      if (line.includes('console.log') && language === 'typescript') {
        diagnostics.push({
          source: 'static-analysis',
          line: lineNumber,
          message: 'console.log statement found in production code',
          severity: 'info',
          startCol: line.indexOf('console.log'),
          endCol: line.indexOf('console.log') + 11
        });
      }
    });

    return { diagnostics, suggestions };
  }

  /**
   * Perform AI-powered analysis
   */
  private async performAIAnalysis(code: string, language: string): Promise<{
    diagnostics: Diagnostic[];
    suggestions: CodeSuggestion[];
  }> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: CodeSuggestion[] = [];

    // Basic AI-powered suggestions (would integrate with actual AI service)
    if (code.includes('var ')) {
      suggestions.push({
        id: 'use-let-const',
        type: 'improvement',
        title: 'Use let/const instead of var',
        description: 'Modern JavaScript/TypeScript should use let/const for variable declarations',
        severity: 'medium',
        line: 1,
        column: 0,
        code: code.replace(/var /g, 'const '),
        aiGenerated: true,
        confidence: 0.9
      });
    }

    // Check for inefficient patterns
    if (code.includes('for (let i = 0; i < arr.length; i++)')) {
      suggestions.push({
        id: 'use-for-of',
        type: 'performance',
        title: 'Use for...of or array methods',
        description: 'for...of loops or array methods are more readable and often more performant',
        severity: 'low',
        line: 1,
        column: 0,
        code: '// Consider using: arr.forEach(item => { ... }) or for (const item of arr)',
        aiGenerated: true,
        confidence: 0.7
      });
    }

    return { diagnostics, suggestions };
  }

  /**
   * Perform security analysis
   */
  private async performSecurityAnalysis(code: string, language: string): Promise<{
    issues: SecurityIssue[];
  }> {
    const issues: SecurityIssue[] = [];

    // SQL injection detection
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')) {
      const sqlInjectionPattern = /(\$|concat\(|format\(|sprintf\()/;
      if (sqlInjectionPattern.test(code)) {
        issues.push({
          id: 'sql-injection-risk',
          type: 'injection',
          title: 'Potential SQL Injection',
          description: 'String concatenation in SQL queries can lead to injection attacks',
          severity: 'high',
          line: 1,
          cwe: 'CWE-89',
          fix: 'Use parameterized queries or prepared statements'
        });
      }
    }

    // XSS detection
    if (language === 'typescript' && code.includes('innerHTML') || code.includes('outerHTML')) {
      issues.push({
        id: 'xss-risk',
        type: 'xss',
        title: 'Potential XSS Vulnerability',
        description: 'Direct HTML injection can lead to cross-site scripting attacks',
        severity: 'high',
        line: 1,
        cwe: 'CWE-79',
        fix: 'Use textContent or sanitize HTML input'
      });
    }

    // Weak cryptography
    if (code.includes('md5') || code.includes('sha1')) {
      issues.push({
        id: 'weak-crypto',
        type: 'weak_crypto',
        title: 'Weak Cryptographic Function',
        description: 'MD5 and SHA-1 are cryptographically weak and should not be used',
        severity: 'medium',
        line: 1,
        cwe: 'CWE-327',
        fix: 'Use SHA-256 or stronger hashing algorithms'
      });
    }

    return { issues };
  }

  /**
   * Perform performance analysis
   */
  private async performPerformanceAnalysis(code: string, language: string): Promise<{
    issues: PerformanceIssue[];
  }> {
    const issues: PerformanceIssue[] = [];

    // Memory leak detection
    if (code.includes('setInterval') && !code.includes('clearInterval')) {
      issues.push({
        id: 'memory-leak-interval',
        type: 'memory_leak',
        title: 'Potential Memory Leak',
        description: 'setInterval without clearInterval can cause memory leaks',
        impact: 'medium',
        line: 1,
        suggestion: 'Store interval ID and clear it when component unmounts'
      });
    }

    // Inefficient loops
    if (code.includes('.forEach') && code.includes('.push')) {
      issues.push({
        id: 'inefficient-loop',
        type: 'slow_algorithm',
        title: 'Inefficient Array Operation',
        description: 'Using forEach with push can be optimized with map/filter',
        impact: 'low',
        line: 1,
        suggestion: 'Consider using map() or filter() instead of forEach with push'
      });
    }

    // Large objects in memory
    const largeObjectPattern = /new Array\((\d+)\)|Array\((\d+)\)/;
    const match = code.match(largeObjectPattern);
    if (match) {
      const size = parseInt(match[1] || match[2]);
      if (size > 10000) {
        issues.push({
          id: 'large-array',
          type: 'memory_leak',
          title: 'Large Array Allocation',
          description: `Creating array with ${size} elements may impact performance`,
          impact: 'medium',
          line: 1,
          suggestion: 'Consider lazy loading or pagination for large datasets'
        });
      }
    }

    return { issues };
  }

  /**
   * Merge and deduplicate diagnostics
   */
  private mergeDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
    const seen = new Set<string>();
    return diagnostics.filter(diag => {
      const key = `${diag.source}-${diag.message}-${diag.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainabilityScore(code: string, diagnostics: Diagnostic[]): number {
    let score = 100;

    // Deduct points for each diagnostic
    diagnostics.forEach(diag => {
      switch (diag.severity) {
        case 'error': score -= 10; break;
        case 'warning': score -= 5; break;
        case 'info': score -= 2; break;
      }
    });

    // Code complexity factors
    const lines = code.split('\n').length;
    if (lines > 300) score -= 10;
    if (lines > 1000) score -= 20;

    // Function length
    const functions = code.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || [];
    if (functions.length > 20) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(
    diagnostics: Diagnostic[],
    suggestions: CodeSuggestion[],
    securityIssues: SecurityIssue[],
    performanceIssues: PerformanceIssue[]
  ): number {
    let score = 100;

    // Security issues have highest penalty
    securityIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
      }
    });

    // Performance issues
    performanceIssues.forEach(issue => {
      switch (issue.impact) {
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    // Code quality issues
    diagnostics.forEach(diag => {
      switch (diag.severity) {
        case 'error': score -= 8; break;
        case 'warning': score -= 4; break;
        case 'info': score -= 1; break;
      }
    });

    // Improvement suggestions
    suggestions.forEach(suggestion => {
      switch (suggestion.severity) {
        case 'high': score -= 3; break;
        case 'medium': score -= 2; break;
        case 'low': score -= 1; break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate AI-powered fix for a specific issue
   */
  async generateFix(
    code: string,
    issue: CodeSuggestion,
    language: string
  ): Promise<AIFixResponse> {
    try {
      // Basic fix generation (would integrate with AI service)
      let fixedCode = code;
      let explanation = `Applied fix for: ${issue.title}`;

      // Apply specific fixes based on issue type
      if (issue.id === 'use-let-const') {
        fixedCode = code.replace(/var /g, 'const ');
        explanation = 'Replaced var with const for better scoping';
      } else if (issue.id === 'use-for-of') {
        explanation = 'Consider using for...of or array methods for better readability';
      }

      return {
        fixed: true,
        code: fixedCode,
        explanation
      };
    } catch (error) {
      return {
        fixed: false,
        code: code,
        explanation: 'Failed to generate fix'
      };
    }
  }
}

export const aiCodeReview = AICodeReview.getInstance();
