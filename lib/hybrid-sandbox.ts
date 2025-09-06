/**
 * Hybrid Sandbox System
 * Frontend: WebContainer for instant execution
 * Backend: Docker containers for heavy computation
 */

import { WebContainer } from '@webcontainer/api';

export interface SandboxConfig {
  type: 'frontend' | 'backend';
  runtime: 'node' | 'python' | 'rust' | 'go' | 'java';
  dependencies: string[];
  files: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  files?: Record<string, string>;
}

export class HybridSandbox {
  private webContainer: WebContainer | null = null;
  private backendContainers: Map<string, any> = new Map();

  /**
   * Initialize WebContainer for frontend tasks
   */
  async initializeWebContainer(): Promise<void> {
    try {
      this.webContainer = await WebContainer.boot();
      console.log('✅ WebContainer initialized for frontend tasks');
    } catch (error) {
      console.error('❌ Failed to initialize WebContainer:', error);
      throw error;
    }
  }

  /**
   * Detect if code should run in frontend or backend
   */
  detectExecutionType(code: string, files: Record<string, string>): 'frontend' | 'backend' {
    // Frontend patterns
    const frontendPatterns = [
      /import.*from.*['"]react['"]/i,
      /import.*from.*['"]vue['"]/i,
      /import.*from.*['"]@angular['"]/i,
      /tailwindcss/i,
      /webpack/i,
      /vite/i,
      /\.jsx?$/,  // JavaScript/TypeScript files
      /\.css$/,   // CSS files
      /\.html$/,  // HTML files
    ];

    // Backend patterns
    const backendPatterns = [
      /import.*torch/i,
      /import.*tensorflow/i,
      /import.*sklearn/i,
      /pip install/i,
      /requirements\.txt/i,
      /machine.learning/i,
      /ai.training/i,
      /data.science/i,
      /\.py$/,    // Python files
      /rust/i,
      /cargo/i,
      /\.rs$/,    // Rust files
      /go.mod/i,
      /\.go$/,    // Go files
    ];

    const codeContent = Object.values(files).join('\n').toLowerCase();

    // Check backend patterns first (more specific)
    for (const pattern of backendPatterns) {
      if (pattern.test(codeContent) || pattern.test(code)) {
        return 'backend';
      }
    }

    // Check frontend patterns
    for (const pattern of frontendPatterns) {
      if (pattern.test(codeContent) || pattern.test(code)) {
        return 'frontend';
      }
    }

    // Default to frontend for web development
    return 'frontend';
  }

  /**
   * Execute code in appropriate sandbox
   */
  async execute(config: SandboxConfig): Promise<ExecutionResult> {
    const executionType = this.detectExecutionType(
      Object.values(config.files).join('\n'),
      config.files
    );

    console.log(`🎯 Detected execution type: ${executionType}`);

    if (executionType === 'frontend') {
      return this.executeInWebContainer(config);
    } else {
      return this.executeInBackendContainer(config);
    }
  }

  /**
   * Execute in WebContainer (frontend)
   */
  private async executeInWebContainer(config: SandboxConfig): Promise<ExecutionResult> {
    if (!this.webContainer) {
      await this.initializeWebContainer();
    }

    try {
      // Mount files
      await this.webContainer.mount({
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: 'webcontainer-app',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
              },
              dependencies: {
                'vite': '^4.0.0',
                'react': '^18.0.0',
                'react-dom': '^18.0.0',
                ...Object.fromEntries(
                  config.dependencies.map(dep => [dep, 'latest'])
                )
              }
            }, null, 2)
          }
        },
        ...Object.fromEntries(
          Object.entries(config.files).map(([path, content]) => [
            path,
            { file: { contents: content } }
          ])
        )
      });

      // Install dependencies
      const installProcess = await this.webContainer.spawn('npm', ['install']);
      const installOutput = await this.readProcessOutput(installProcess);

      if (installProcess.exit?.code !== 0) {
        return {
          success: false,
          output: installOutput,
          error: 'Failed to install dependencies'
        };
      }

      // Run development server
      const devProcess = await this.webContainer.spawn('npm', ['run', 'dev']);
      const devOutput = await this.readProcessOutput(devProcess);

      return {
        success: true,
        output: `✅ Frontend app ready!\n${devOutput}`,
        files: config.files
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `WebContainer execution failed: ${error}`
      };
    }
  }

  /**
   * Execute in backend container
   */
  private async executeInBackendContainer(config: SandboxConfig): Promise<ExecutionResult> {
    const containerId = `container-${Date.now()}`;

    try {
      // Create backend container via API
      const containerResponse = await fetch('/api/containers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: containerId,
          runtime: config.runtime,
          files: config.files,
          dependencies: config.dependencies
        })
      });

      if (!containerResponse.ok) {
        throw new Error('Failed to create backend container');
      }

      const { containerId: actualContainerId } = await containerResponse.json();

      // Execute code in container
      const executeResponse = await fetch('/api/containers/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: actualContainerId,
          command: this.getExecutionCommand(config.runtime),
          files: config.files
        })
      });

      const result = await executeResponse.json();

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        files: result.files
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Backend container execution failed: ${error}`
      };
    }
  }

  /**
   * Get execution command for runtime
   */
  private getExecutionCommand(runtime: string): string {
    switch (runtime) {
      case 'python':
        return 'python main.py';
      case 'node':
        return 'node index.js';
      case 'rust':
        return './target/release/app';
      case 'go':
        return './app';
      case 'java':
        return 'java -cp . Main';
      default:
        return 'echo "Unknown runtime"';
    }
  }

  /**
   * Read process output from WebContainer
   */
  private async readProcessOutput(process: any): Promise<string> {
    let output = '';

    process.output.pipeTo(new WritableStream({
      write(data) {
        output += data;
      }
    }));

    await process.exit;
    return output;
  }

  /**
   * Get WebContainer URL for preview
   */
  getWebContainerUrl(): string | null {
    return this.webContainer?.url ?? null;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.webContainer) {
      await this.webContainer.teardown();
      this.webContainer = null;
    }

    // Cleanup backend containers
    for (const [id, container] of Array.from(this.backendContainers.entries())) {
      try {
        await fetch(`/api/containers/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error(`Failed to cleanup container ${id}:`, error);
      }
    }
    this.backendContainers.clear();
  }
}

// Singleton instance
export const hybridSandbox = new HybridSandbox();