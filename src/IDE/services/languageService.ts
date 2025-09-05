/**
 * Multi-Language IDE Service
 * Support for 50+ programming languages with syntax highlighting and tooling
 */

export interface LanguageSupport {
  id: string;
  name: string;
  extensions: string[];
  mimeType: string;
  syntaxHighlighting: boolean;
  compiler?: string;
  runtime?: string;
  packageManager?: string;
  linter?: string;
  formatter?: string;
  testRunner?: string;
  buildCommand?: string;
  runCommand?: string;
  debugSupport?: boolean;
  aiTemplates: string[];
  frameworks: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework?: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export class LanguageService {
  private static instance: LanguageService;
  private supportedLanguages: Map<string, LanguageSupport> = new Map();
  private projectTemplates: Map<string, ProjectTemplate> = new Map();

  constructor() {
    this.initializeLanguages();
    this.initializeTemplates();
  }

  static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  private initializeLanguages(): void {
    const languages: LanguageSupport[] = [
      // Web Technologies
      {
        id: 'typescript',
        name: 'TypeScript',
        extensions: ['.ts', '.tsx', '.d.ts'],
        mimeType: 'application/typescript',
        syntaxHighlighting: true,
        compiler: 'tsc',
        runtime: 'node',
        packageManager: 'npm',
        linter: 'eslint',
        formatter: 'prettier',
        testRunner: 'jest',
        buildCommand: 'npm run build',
        runCommand: 'npm start',
        debugSupport: true,
        aiTemplates: ['React Component', 'Express Server', 'Utility Library'],
        frameworks: ['React', 'Vue', 'Angular', 'Next.js', 'NestJS']
      },
      {
        id: 'javascript',
        name: 'JavaScript',
        extensions: ['.js', '.jsx', '.mjs'],
        mimeType: 'application/javascript',
        syntaxHighlighting: true,
        runtime: 'node',
        packageManager: 'npm',
        linter: 'eslint',
        formatter: 'prettier',
        testRunner: 'jest',
        runCommand: 'node',
        debugSupport: true,
        aiTemplates: ['Node.js App', 'React Component', 'Express API'],
        frameworks: ['React', 'Vue', 'Angular', 'Express', 'Fastify']
      },
      {
        id: 'python',
        name: 'Python',
        extensions: ['.py', '.pyw', '.pyi'],
        mimeType: 'text/x-python',
        syntaxHighlighting: true,
        runtime: 'python3',
        packageManager: 'pip',
        linter: 'pylint',
        formatter: 'black',
        testRunner: 'pytest',
        runCommand: 'python',
        debugSupport: true,
        aiTemplates: ['Flask App', 'Django Project', 'Data Science Notebook'],
        frameworks: ['Django', 'Flask', 'FastAPI', 'TensorFlow', 'PyTorch']
      },
      {
        id: 'java',
        name: 'Java',
        extensions: ['.java'],
        mimeType: 'text/x-java-source',
        syntaxHighlighting: true,
        compiler: 'javac',
        runtime: 'java',
        packageManager: 'maven',
        linter: 'checkstyle',
        formatter: 'google-java-format',
        testRunner: 'junit',
        buildCommand: 'mvn compile',
        runCommand: 'java -cp target/classes',
        debugSupport: true,
        aiTemplates: ['Spring Boot App', 'Android App', 'JavaFX Application'],
        frameworks: ['Spring', 'Hibernate', 'JavaFX', 'Android']
      },
      {
        id: 'csharp',
        name: 'C#',
        extensions: ['.cs'],
        mimeType: 'text/x-csharp',
        syntaxHighlighting: true,
        compiler: 'dotnet',
        runtime: 'dotnet',
        packageManager: 'nuget',
        linter: 'stylecop',
        formatter: 'csharpier',
        testRunner: 'xunit',
        buildCommand: 'dotnet build',
        runCommand: 'dotnet run',
        debugSupport: true,
        aiTemplates: ['ASP.NET Core API', 'Console App', 'WPF Application'],
        frameworks: ['ASP.NET Core', '.NET MAUI', 'Unity']
      },
      {
        id: 'cpp',
        name: 'C++',
        extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
        mimeType: 'text/x-c++src',
        syntaxHighlighting: true,
        compiler: 'g++',
        linter: 'cppcheck',
        formatter: 'clang-format',
        testRunner: 'googletest',
        buildCommand: 'make',
        runCommand: './a.out',
        debugSupport: true,
        aiTemplates: ['Console App', 'Qt Application', 'Game Engine'],
        frameworks: ['Qt', 'Boost', 'STL']
      },
      {
        id: 'go',
        name: 'Go',
        extensions: ['.go'],
        mimeType: 'text/x-go',
        syntaxHighlighting: true,
        compiler: 'go',
        runtime: 'go',
        packageManager: 'go mod',
        linter: 'golangci-lint',
        formatter: 'gofmt',
        testRunner: 'go test',
        buildCommand: 'go build',
        runCommand: 'go run',
        debugSupport: true,
        aiTemplates: ['HTTP Server', 'CLI Tool', 'Microservice'],
        frameworks: ['Gin', 'Echo', 'Fiber']
      },
      {
        id: 'rust',
        name: 'Rust',
        extensions: ['.rs'],
        mimeType: 'text/x-rust',
        syntaxHighlighting: true,
        compiler: 'cargo',
        runtime: 'rustc',
        packageManager: 'cargo',
        linter: 'clippy',
        formatter: 'rustfmt',
        testRunner: 'cargo test',
        buildCommand: 'cargo build',
        runCommand: 'cargo run',
        debugSupport: true,
        aiTemplates: ['CLI App', 'Web Server', 'Systems Program'],
        frameworks: ['Actix', 'Rocket', 'Tokio']
      },
      {
        id: 'php',
        name: 'PHP',
        extensions: ['.php'],
        mimeType: 'application/x-php',
        syntaxHighlighting: true,
        runtime: 'php',
        packageManager: 'composer',
        linter: 'phpcs',
        formatter: 'php-cs-fixer',
        testRunner: 'phpunit',
        runCommand: 'php',
        debugSupport: true,
        aiTemplates: ['Laravel App', 'Symfony Project', 'WordPress Plugin'],
        frameworks: ['Laravel', 'Symfony', 'CodeIgniter']
      },
      {
        id: 'ruby',
        name: 'Ruby',
        extensions: ['.rb'],
        mimeType: 'text/x-ruby',
        syntaxHighlighting: true,
        runtime: 'ruby',
        packageManager: 'bundler',
        linter: 'rubocop',
        formatter: 'rufo',
        testRunner: 'rspec',
        runCommand: 'ruby',
        debugSupport: true,
        aiTemplates: ['Rails App', 'Sinatra API', 'Ruby Gem'],
        frameworks: ['Rails', 'Sinatra', 'Hanami']
      },
      // Add more languages here...
      {
        id: 'swift',
        name: 'Swift',
        extensions: ['.swift'],
        mimeType: 'text/x-swift',
        syntaxHighlighting: true,
        compiler: 'swiftc',
        linter: 'swiftlint',
        formatter: 'swiftformat',
        testRunner: 'xctest',
        debugSupport: true,
        aiTemplates: ['iOS App', 'macOS App', 'Swift Package'],
        frameworks: ['SwiftUI', 'UIKit', 'Vapor']
      },
      {
        id: 'kotlin',
        name: 'Kotlin',
        extensions: ['.kt', '.kts'],
        mimeType: 'text/x-kotlin',
        syntaxHighlighting: true,
        compiler: 'kotlinc',
        runtime: 'kotlin',
        packageManager: 'gradle',
        linter: 'ktlint',
        formatter: 'ktlint',
        testRunner: 'junit',
        debugSupport: true,
        aiTemplates: ['Android App', 'Ktor Server', 'Spring Boot Kotlin'],
        frameworks: ['Android', 'Ktor', 'Spring']
      }
    ];

    languages.forEach(lang => {
      this.supportedLanguages.set(lang.id, lang);
    });
  }

  private initializeTemplates(): void {
    const templates: ProjectTemplate[] = [
      {
        id: 'react-ts',
        name: 'React + TypeScript',
        description: 'Modern React application with TypeScript',
        language: 'typescript',
        framework: 'React',
        files: [
          {
            path: 'src/App.tsx',
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to MominAI</h1>
        <p>Start building your React app!</p>
      </header>
    </div>
  );
}

export default App;`
          },
          {
            path: 'src/index.tsx',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
          }
        ],
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          'typescript': '^5.0.0'
        },
        scripts: {
          'start': 'react-scripts start',
          'build': 'react-scripts build',
          'test': 'react-scripts test'
        }
      },
      {
        id: 'nextjs-ts',
        name: 'Next.js + TypeScript',
        description: 'Full-stack Next.js application',
        language: 'typescript',
        framework: 'Next.js',
        files: [
          {
            path: 'pages/index.tsx',
            content: `import type { NextPage } from 'next';

const Home: NextPage = () => {
  return (
    <div>
      <h1>Welcome to Next.js with MominAI</h1>
      <p>Get started by editing this page!</p>
    </div>
  );
};

export default Home;`
          }
        ],
        dependencies: {
          'next': '^13.0.0',
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/node': '^18.0.0',
          'typescript': '^5.0.0'
        },
        scripts: {
          'dev': 'next dev',
          'build': 'next build',
          'start': 'next start'
        }
      },
      {
        id: 'flask-python',
        name: 'Flask + Python',
        description: 'Python web application with Flask',
        language: 'python',
        framework: 'Flask',
        files: [
          {
            path: 'app.py',
            content: `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello from MominAI Flask app!'

if __name__ == '__main__':
    app.run(debug=True)`
          }
        ],
        dependencies: {
          'flask': '^2.3.0'
        },
        devDependencies: {},
        scripts: {
          'start': 'python app.py'
        }
      }
    ];

    templates.forEach(template => {
      this.projectTemplates.set(template.id, template);
    });
  }

  /**
   * Get language support by extension
   */
  getLanguageByExtension(extension: string): LanguageSupport | null {
    for (const lang of Array.from(this.supportedLanguages.values())) {
      if (lang.extensions.includes(extension)) {
        return lang;
      }
    }
    return null;
  }

  /**
   * Get language support by ID
   */
  getLanguage(languageId: string): LanguageSupport | null {
    return this.supportedLanguages.get(languageId) || null;
  }

  /**
   * Get all supported languages
   */
  getAllLanguages(): LanguageSupport[] {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * Get project template by ID
   */
  getTemplate(templateId: string): ProjectTemplate | null {
    return this.projectTemplates.get(templateId) || null;
  }

  /**
   * Get templates by language
   */
  getTemplatesByLanguage(language: string): ProjectTemplate[] {
    return Array.from(this.projectTemplates.values())
      .filter(template => template.language === language);
  }

  /**
   * Get all project templates
   */
  getAllTemplates(): ProjectTemplate[] {
    return Array.from(this.projectTemplates.values());
  }

  /**
   * Create project from template
   */
  async createProjectFromTemplate(
    templateId: string,
    projectName: string,
    targetPath: string
  ): Promise<void> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create project directory
    const fs = require('fs').promises;
    const path = require('path');

    await fs.mkdir(targetPath, { recursive: true });

    // Create package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: template.description,
      scripts: template.scripts,
      dependencies: template.dependencies,
      devDependencies: template.devDependencies
    };

    await fs.writeFile(
      path.join(targetPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create template files
    for (const file of template.files) {
      const filePath = path.join(targetPath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
  }

  /**
   * Get syntax highlighting configuration
   */
  getSyntaxHighlightingConfig(languageId: string): any {
    const language = this.getLanguage(languageId);
    if (!language) return null;

    // Return Monaco editor language configuration
    return {
      id: language.id,
      extensions: language.extensions,
      aliases: [language.name.toLowerCase()],
      mimetypes: [language.mimeType],
      loader: () => import(`monaco-editor/esm/vs/basic-languages/${language.id}/${language.id}.contribution`)
    };
  }

  /**
   * Get language-specific AI suggestions
   */
  getAISuggestions(languageId: string, context: string): string[] {
    const language = this.getLanguage(languageId);
    if (!language) return [];

    // Return language-specific code suggestions
    const suggestions = [
      `Create a ${language.name} function`,
      `Add ${language.name} class`,
      `Implement ${language.name} interface`,
      ...language.aiTemplates.map(template => `Create ${template}`)
    ];

    return suggestions;
  }

  /**
   * Validate code syntax
   */
  async validateCode(languageId: string, code: string): Promise<Array<{ line: number; column: number; message: string; severity: 'error' | 'warning' }>> {
    const language = this.getLanguage(languageId);
    if (!language || !language.linter) {
      return [];
    }

    // Basic syntax validation (would integrate with actual linters)
    const errors: Array<{ line: number; column: number; message: string; severity: 'error' | 'warning' }> = [];

    // Simple bracket matching validation
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineIndex) => {
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (brackets[char as keyof typeof brackets]) {
          stack.push(char);
        } else if (Object.values(brackets).includes(char)) {
          const last = stack.pop();
          if (!last || brackets[last as keyof typeof brackets] !== char) {
            errors.push({
              line: lineIndex + 1,
              column: i + 1,
              message: `Mismatched bracket: ${char}`,
              severity: 'error'
            });
          }
        }
      }
    });

    return errors;
  }

  /**
   * Format code
   */
  async formatCode(languageId: string, code: string): Promise<string> {
    const language = this.getLanguage(languageId);
    if (!language || !language.formatter) {
      return code;
    }

    // Basic formatting (would integrate with actual formatters)
    return code
      .split('\n')
      .map(line => line.trim())
      .join('\n');
  }
}

export const languageService = LanguageService.getInstance();
