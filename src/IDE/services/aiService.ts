
import type { Diagnostic, DependencyReport, AIFixResponse, EditorActionCommand } from '../types';

// Client-side AI service - no server dependencies
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-3-haiku";

const callOpenRouterAPI = async (messages: any[], apiKey: string): Promise<string> => {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://momin-ai-beta.vercel.app',
      'X-Title': 'MominAI IDE'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const callGoogleAPI = async (prompt: string, apiKey: string): Promise<string> => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

// Client-side API key management
const getApiKeys = () => {
  // First try localStorage (user-provided keys)
  if (typeof window !== 'undefined') {
    const savedKeys = localStorage.getItem('ai-api-keys');
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys);
        if (keys.openRouter || keys.google) {
          return {
            openRouter: keys.openRouter || '',
            google: keys.google || ''
          };
        }
      } catch (e) {
        console.warn('Failed to parse saved API keys:', e);
      }
    }
  }

  // Fallback to environment variables (for development/demo)
  return {
    openRouter: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '',
    google: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || ''
  };
};

const AGENT_SYSTEM_INSTRUCTION = `You are an expert, autonomous pair programming assistant, "MominAI", integrated directly into a web-based IDE. Your goal is to fulfill the user's request by generating a precise sequence of actions that will be executed programmatically. You must think step-by-step and use the available tools to modify the user's codebase.

**CONTEXT**
- You have access to the entire file system of the project.
- The user can see your actions happen in real-time, so be logical and efficient.
- You operate by outputting a stream of JSON "action" objects.

**RESPONSE FORMAT**
- Your ENTIRE output must be a stream of raw JSON objects.
- Do NOT use markdown fences (e.g., \`\`\`json).
- Do NOT add any conversational text, greetings, or explanations before, after, or outside of the JSON objects.
- Each JSON object must be a single, complete action.

**AVAILABLE ACTIONS TOOLBOX**
You must use the following JSON objects for your actions:

1.  **comment(text: string)**: Communicate your thought process to the user. Use this to explain what you're about to do.
    \`{ "action": "comment", "text": "Okay, I will start by adding the new state variable to the App component." }\`

2.  **createFile(path: string, content: string)**: Create a new file. The path must be absolute (e.g., \`/src/components/MyComponent.tsx\`).
    \`{ "action": "createFile", "path": "/src/utils/helpers.js", "content": "export const newUtil = () => {};" }\`

3.  **openFile(path: string)**: Open an existing file in the editor. This must be done before you can edit it.
    \`{ "action": "openFile", "path": "/src/App.jsx" }\`

4.  **moveCursor(line: number, column: number)**: Move the cursor to a specific position in the currently open file.
    \`{ "action": "moveCursor", "line": 15, "column": 5 }\`

5.  **type(text: string)**: Type text at the current cursor position. Use \`\\n\` for new lines.
    \`{ "action": "type", "text": "const [count, setCount] = useState(0);\\n" }\`

6.  **select(startLine: number, startColumn: number, endLine: number, endColumn: number)**: Select a block of text.
    \`{ "action": "select", "startLine": 10, "startColumn": 1, "endLine": 12, "endColumn": 1 }\`

7.  **replace(text: string)**: Replace the currently selected text. Must be preceded by a \`select\` action.
    \`{ "action": "replace", "text": "const [value, setValue] = useState('');" }\`

8.  **delete(lines: number)**: Delete a specified number of lines forward from the current cursor position.
    \`{ "action": "delete", "lines": 3 }\`

9.  **finish(reason: string)**: Announce that you have completed the user's request. This must be the VERY LAST action in your plan.
    \`{ "action": "finish", "reason": "I have successfully added the new state variable and integrated it into the component." }\`

**WORKFLOW**
1.  Acknowledge the request and state your plan using the \`comment\` action.
2.  Use a sequence of \`openFile\`, \`moveCursor\`, \`type\`, \`select\`, \`replace\`, and \`delete\` to perform the edits.
3.  Be precise with line and column numbers.
4.  Once all edits are done, use the \`finish\` action.`;


// Streaming function - simplified for client-side
export async function* streamAIActions(prompt: string, files: {path: string, content: string}[]): AsyncGenerator<EditorActionCommand> {
    const keys = getApiKeys();
    const fullPrompt = `The user wants to make the following change: "${prompt}".\n\nHere is the current project structure and content:\n${files.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')}\n\nGenerate the stream of JSON actions to fulfill the request.`;

    try {
        let response: string;

        if (keys.openRouter && keys.openRouter !== 'your-openrouter-key-here') {
            const messages = [
                { role: 'system', content: AGENT_SYSTEM_INSTRUCTION },
                { role: 'user', content: fullPrompt }
            ];
            response = await callOpenRouterAPI(messages, keys.openRouter);
        } else if (keys.google && keys.google !== 'your-google-key-here') {
            response = await callGoogleAPI(fullPrompt, keys.google);
        } else {
            throw new Error('No valid API keys configured');
        }

        // Parse the response for JSON actions
        const jsonRegex = /(\[[\s\S]*?\]|\{[\s\S]*?\})/g;
        const jsonMatches = response.match(jsonRegex);

        if (jsonMatches) {
            for (const jsonMatch of jsonMatches) {
                try {
                    const action = JSON.parse(jsonMatch);
                    yield action as EditorActionCommand;
                } catch (e) {
                    console.warn("Could not parse JSON object:", jsonMatch);
                }
            }
        }
    } catch (error) {
        console.error("Error getting AI action stream:", error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in AI stream');
    }
}


// Simplified functions for client-side use
export const generateCodeForFile = async (userPrompt: string, fileName: string): Promise<string> => {
    const keys = getApiKeys();
    const prompt = `You are an expert programmer. A user wants to create a file named "${fileName}". Based on their request, generate the complete, production-ready code for this file. Do not add any conversational text, explanations, or markdown formatting like \`\`\` around the code. Only output the raw code for the file content.\nUser's request: "${userPrompt}"`;

    if (keys.openRouter && keys.openRouter !== 'your-openrouter-key-here') {
        try {
            const messages = [
                { role: 'user', content: prompt }
            ];
            return await callOpenRouterAPI(messages, keys.openRouter);
        } catch (error) {
            console.warn('OpenRouter failed for code generation:', error);
        }
    }

    if (keys.google && keys.google !== 'your-google-key-here') {
        return await callGoogleAPI(prompt, keys.google);
    }

    throw new Error('No valid API keys for code generation');
};

// Fix: Add missing AI service functions
export const generateRegex = async (description: string, apiKey: string | null): Promise<string> => {
    throw new Error("Regex generation is not implemented in this version.");
};

export const deployProject = async (): Promise<{ success: boolean; url: string; }> => {
    throw new Error("Project deployment is not implemented in this version.");
};

export const migrateCode = async (code: string, from: string, to: string, apiKey: string | null): Promise<string> => {
    throw new Error("Code migration is not implemented in this version.");
};

export const analyzeCodeForBugs = async (code: string, apiKey: string | null): Promise<Omit<Diagnostic, 'source'>[]> => {
    throw new Error("Bug analysis is not implemented in this version.");
};

export const scaffoldProject = async (prompt: string, apiKey: string | null): Promise<Record<string, string>> => {
    throw new Error("Project scaffolding is not implemented in this version.");
};

export const generateDocsForCode = async (code: string, filePath: string, apiKey: string | null): Promise<string> => {
    throw new Error("Documentation generation is not implemented in this version.");
};

export const generateMermaidDiagram = async (code: string, apiKey: string | null): Promise<string> => {
    throw new Error("Mermaid diagram generation is not implemented in this version.");
};

export const optimizeCss = async (css: string, apiKey: string | null): Promise<string> => {
    throw new Error("CSS optimization is not implemented in this version.");
};

export const analyzeDependencies = async (packageJsonContent: string, apiKey: string | null): Promise<DependencyReport> => {
    throw new Error("Dependency analysis is not implemented in this version.");
};

export const generateTestFile = async (code: string, filePath: string, apiKey: string | null): Promise<string> => {
    throw new Error("Test file generation is not implemented in this version.");
};

export const generateTheme = async (description: string, apiKey: string | null): Promise<Record<string, string>> => {
    throw new Error("Theme generation is not implemented in this version.");
};


// Functions below are for plugins and could be refactored or kept as is.

export const generateCodeFromFigma = async (url: string, figmaToken: string, prompt: string, apiKey: string | null): Promise<string> => {
    throw new Error("Figma import is not implemented in this version.");
};

export const generateCodeFromImage = async (base64Image: string, prompt: string, apiKey: string | null): Promise<string> => {
    throw new Error("Image to code is not implemented in this version.");
};

export const reviewCode = async (code: string, apiKey: string | null): Promise<Omit<Diagnostic, 'source'>[]> => {
    throw new Error("Code review is not implemented in this version.");
};

export const getCodeExplanation = async (code: string): Promise<string> => {
    const keys = getApiKeys();
    const prompt = `Explain the following code snippet concisely:\n\n\`\`\`\n${code}\n\`\`\``;

    if (keys.openRouter && keys.openRouter !== 'your-openrouter-key-here') {
        const messages = [{ role: 'user', content: prompt }];
        return await callOpenRouterAPI(messages, keys.openRouter);
    }

    if (keys.google && keys.google !== 'your-google-key-here') {
        return await callGoogleAPI(prompt, keys.google);
    }

    throw new Error('No valid API keys for code explanation');
};

export const getConversationalResponse = async (prompt: string, mode: string = 'ask', apiKey?: string | null): Promise<string> => {
    const keys = getApiKeys();

    // Check if this is a code generation request
    const isCodeRequest = mode === 'code' ||
                         prompt.toLowerCase().includes('code') ||
                         prompt.toLowerCase().includes('create') ||
                         prompt.toLowerCase().includes('build') ||
                         prompt.toLowerCase().includes('make') ||
                         prompt.toLowerCase().includes('generate') ||
                         prompt.toLowerCase().includes('website') ||
                         prompt.toLowerCase().includes('app');

    if (isCodeRequest) {
        // For code requests, use the action-based system
        return getCodeGenerationResponse(prompt, keys);
    }

    // For regular conversation, use normal AI response
    const getSystemPrompt = (currentMode?: string) => {
        const basePrompt = `You are MominAI, a professional AI coding assistant specialized in React, TypeScript, and modern web development. You create production-ready code instantly.

## YOUR MISSION:
- Generate complete, working code in seconds
- Create actual files and components
- Build functional applications
- Use modern frameworks and best practices

## PROJECT CONTEXT:
- Next.js 13+ with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- React Hot Toast for notifications
- Supabase for backend services
- Modern, responsive design patterns
- Component-based architecture`;

        switch (currentMode) {
            case 'ask':
                return `${basePrompt}

## ASK MODE:
- Pure conversational responses only
- Answer questions directly about code, development, and best practices
- No code generation or JSON commands
- Focus on explanation, guidance, and technical information
- Provide detailed explanations when needed`;

            case 'code':
                return `${basePrompt}

## CODE MODE - INSTANT CODE GENERATION:
You are MominAI - the fastest code generator. When users ask for code, you MUST:

1. IMMEDIATELY create the actual files
2. Generate complete, working components
3. Use modern React + TypeScript + Tailwind
4. Make it production-ready instantly
5. No explanations - just working code

## COMPONENT REQUIREMENTS:
- Complete React components with proper imports
- TypeScript interfaces and type safety
- Extensive Tailwind CSS classes for modern design
- Framer Motion animations and transitions
- Responsive design (mobile-first approach)
- Accessibility features (ARIA labels, keyboard navigation)
- Error boundaries and loading states
- Clean, maintainable code structure`;

            case 'architect':
                return `${basePrompt}

## ARCHITECT MODE:
- Focus on planning and task management for complex development projects
- Break down tasks into clear, actionable steps
- Create structured development workflows
- Provide high-level architecture guidance
- Consider scalability, maintainability, and best practices`;

            default:
                return `${basePrompt}

## DEFAULT MODE:
- Auto-detect user intent from input
- Use conversational responses for questions and explanations
- Generate high-quality code commands for programming requests
- Provide technical guidance and best practices
- Adapt response style based on user needs`;
        }
    };

    const systemPrompt = getSystemPrompt(mode);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    // Try OpenRouter first
    if (keys.openRouter && keys.openRouter !== 'your-openrouter-key-here') {
        try {
            console.log('Attempting OpenRouter API...');
            return await callOpenRouterAPI(messages, keys.openRouter);
        } catch (error) {
            console.warn('OpenRouter API failed, falling back to Google Gemini:', error);
        }
    }

    // Fallback to Google Gemini
    if (keys.google && keys.google !== 'your-google-key-here') {
        try {
            console.log('Using Google Gemini API as fallback...');
            return await callGoogleAPI(prompt, keys.google);
        } catch (error) {
            console.error('Google API also failed:', error);
            throw new Error('Both AI services failed. Please check your API keys.');
        }
    }

    throw new Error('No valid API keys configured. Please set OPENROUTER_API_KEY or GOOGLE_AI_API_KEY.');
};

const getCodeGenerationResponse = async (prompt: string, keys: any): Promise<string> => {
    // For demo purposes, create a simple car company website instantly
    if (prompt.toLowerCase().includes('car company') || prompt.toLowerCase().includes('car dealership')) {
        return JSON.stringify({
            action: 'createFile',
            path: '/index.html',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elite Cars - Premium Car Dealership</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 20px;
            text-align: center;
        }

        .hero h1 {
            font-size: 3rem;
            margin-bottom: 20px;
        }

        .hero p {
            font-size: 1.2rem;
            margin-bottom: 30px;
        }

        .btn {
            background: #ff6b35;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            transition: background 0.3s;
        }

        .btn:hover {
            background: #e55a2b;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .features {
            padding: 80px 20px;
            background: #f8f9fa;
        }

        .features h2 {
            text-align: center;
            margin-bottom: 50px;
            font-size: 2.5rem;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .feature-card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }

        .feature-card h3 {
            margin-bottom: 15px;
            color: #667eea;
        }

        .contact {
            padding: 80px 20px;
            background: #333;
            color: white;
            text-align: center;
        }

        .contact h2 {
            margin-bottom: 30px;
            font-size: 2.5rem;
        }

        .contact-form {
            max-width: 600px;
            margin: 0 auto;
        }

        .contact-form input,
        .contact-form textarea {
            width: 100%;
            padding: 15px;
            margin-bottom: 15px;
            border: none;
            border-radius: 5px;
        }

        .contact-form button {
            background: #ff6b35;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
        }

        .contact-form button:hover {
            background: #e55a2b;
        }

        footer {
            background: #222;
            color: white;
            text-align: center;
            padding: 20px;
        }

        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }

            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header class="hero">
        <div class="container">
            <h1>Welcome to Elite Cars</h1>
            <p>Discover your dream car from our premium collection</p>
            <a href="#contact" class="btn">Contact Us Today</a>
        </div>
    </header>

    <section class="features">
        <div class="container">
            <h2>Why Choose Elite Cars?</h2>
            <div class="feature-grid">
                <div class="feature-card">
                    <h3>Premium Selection</h3>
                    <p>Wide range of luxury and performance vehicles from top manufacturers</p>
                </div>
                <div class="feature-card">
                    <h3>Expert Service</h3>
                    <p>Professional consultation and personalized recommendations</p>
                </div>
                <div class="feature-card">
                    <h3>Financing Options</h3>
                    <p>Flexible financing solutions to fit your budget</p>
                </div>
            </div>
        </div>
    </section>

    <section class="contact" id="contact">
        <div class="container">
            <h2>Get In Touch</h2>
            <form class="contact-form">
                <input type="text" placeholder="Your Name" required>
                <input type="email" placeholder="Your Email" required>
                <input type="tel" placeholder="Your Phone" required>
                <textarea placeholder="Tell us about your dream car..." rows="5" required></textarea>
                <button type="submit">Send Message</button>
            </form>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2024 Elite Cars. All rights reserved.</p>
        </div>
    </footer>

    <script>
        // Simple form handling
        document.querySelector('.contact-form').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your interest! We will contact you soon.');
            this.reset();
        });

        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    </script>
</body>
</html>`
        });
    }

    // For other requests, use AI
    const systemPrompt = `You are MominAI - the world's fastest code generator. Create complete, working code instantly.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    try {
        if (keys.openRouter && keys.openRouter !== 'your-openrouter-key-here') {
            return await callOpenRouterAPI(messages, keys.openRouter);
        } else if (keys.google && keys.google !== 'your-google-key-here') {
            return await callGoogleAPI(prompt, keys.google);
        }
    } catch (error) {
        console.error('Code generation failed:', error);
    }

    return 'I apologize, but I encountered an error while generating your code. Please check your API keys and try again.';
};