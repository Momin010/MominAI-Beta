import { NextApiRequest, NextApiResponse } from 'next';

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProcessPromptResult {
  response: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3-haiku'; // A good default model on OpenRouter

async function gatherProjectContext(): Promise<string> {
  // Gather key project files for context
  const contextFiles = [
    'package.json',
    'tsconfig.json',
    'pages/index.tsx',
    'components/ChatArea.tsx',
    'components/EditorPanel.tsx',
    'lib/editor-agent.ts'
  ];

  let context = 'Project Context:\n\n';

  for (const file of contextFiles) {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        context += `=== ${file} ===\n${content}\n\n`;
      }
    } catch (error) {
      console.warn(`Could not read ${file}:`, error);
    }
  }

  return context;
}

// Function to validate JSON response format
function validateJsonResponse(response: string): string {
  try {
    // Try to parse as JSON to validate format
    JSON.parse(response);
    return response;
  } catch (error) {
    // If not valid JSON, return as-is (for conversational responses)
    return response;
  }
}

async function processPrompt(
  prompt: string,
  model: string = DEFAULT_MODEL,
  options: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {},
  mode?: string
): Promise<ProcessPromptResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.');
  }

  const projectContext = await gatherProjectContext();

  // Generate mode-specific system prompt
  const getSystemPrompt = (currentMode?: string) => {
    const basePrompt = `${projectContext}

You are a professional AI coding assistant specialized in React, TypeScript, and modern web development. Generate high-quality, production-ready code with extensive styling and animations.

## PROJECT CONTEXT:
- Next.js 13+ with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- React Hot Toast for notifications
- Supabase for backend services
- Modern, responsive design patterns
- Component-based architecture

## CODE QUALITY STANDARDS:
- Use TypeScript with proper type definitions
- Implement comprehensive error handling
- Follow React best practices and hooks
- Create reusable, modular components
- Include proper accessibility attributes
- Optimize for performance and maintainability`;

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

## CODE MODE - HIGH-QUALITY CODE GENERATION:
Generate complete, professional React components with extensive Tailwind CSS styling and animations.

## PROJECT GENERATION CAPABILITIES:
You can now generate complete multi-file projects with proper structure, dependencies, and configuration.

## PROJECT TEMPLATES AVAILABLE:
- React + Vite: Modern React application with Vite build tool
- Vue + Vite: Modern Vue.js application with Vite build tool
- Next.js App: Full-stack Next.js application with API routes
- Car Dealership Website: Complete website for car dealerships with inventory, contact forms
- E-commerce Site: Full e-commerce platform with products, cart, checkout
- React Auth App: React application with user authentication and protected routes

## PROJECT GENERATION COMMANDS:
For complete multi-file projects, respond with JSON commands like:
[
  {"action": "createProject", "template": "React + Vite", "projectName": "my-awesome-app"},
  {"action": "finish", "reason": "Complete React + Vite project generated successfully"}
]

## WHEN TO USE PROJECT GENERATION:
- When user asks for "build me a [type] website/app"
- When user requests complete applications with multiple pages/components
- When user mentions specific project types (e-commerce, car dealership, etc.)
- When user wants full-stack applications with backend

## WHEN TO USE INDIVIDUAL FILE CREATION:
- When user asks for single components or specific files
- When user wants to modify existing code
- When user requests small code snippets or utilities

## COMPONENT REQUIREMENTS:
- Complete React components with proper imports
- TypeScript interfaces and type safety
- Extensive Tailwind CSS classes for modern design
- Framer Motion animations and transitions
- Responsive design (mobile-first approach)
- Accessibility features (ARIA labels, keyboard navigation)
- Error boundaries and loading states
- Clean, maintainable code structure

## TAILWIND CSS GUIDELINES:
- Use utility-first approach with extensive class combinations
- Implement gradients: bg-gradient-to-r from-blue-500 to-purple-600
- Add shadows: shadow-lg shadow-blue-500/25
- Use backdrop blur: backdrop-blur-xl bg-white/10
- Implement hover/focus states: hover:scale-105 transition-all duration-300
- Add animations: animate-pulse, animate-bounce, animate-spin
- Use modern color schemes: slate, zinc, neutral palettes
- Implement proper spacing: p-6, m-4, space-y-4, gap-6
- Add borders and rounded corners: border border-white/20 rounded-xl

## ANIMATION REQUIREMENTS:
- Use Framer Motion for complex animations
- Implement entrance animations: initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
- Add hover animations: whileHover={{scale:1.05}}
- Include loading animations and micro-interactions
- Use transition properties: transition={{duration:0.3,ease:"easeOut"}}

## JSON COMMAND STRUCTURE:
Respond ONLY with valid JSON arrays of editor commands:
[
  {"action": "openFile", "path": "components/ComponentName.tsx"},
  {"action": "type", "text": "complete component code here"},
  {"action": "finish", "reason": "Component created successfully"}
]

Available actions: openFile, type, moveCursor, select, comment, finish, createProject`;

      case 'architect':
        return `${basePrompt}

## ARCHITECT MODE:
- Focus on planning and task management for complex development projects
- Break down tasks into clear, actionable steps
- Create structured development workflows
- Provide high-level architecture guidance
- Consider scalability, maintainability, and best practices

## TASK MANAGEMENT:
Generate JSON commands for comprehensive task management:
{"action": "createTask", "title": "Task title", "description": "Detailed description"}
{"action": "updateTask", "id": "task_id", "status": "pending|in_progress|completed"}
{"action": "deleteTask", "id": "task_id"}

Available task actions: createTask, updateTask, deleteTask`;

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

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: getSystemPrompt(mode),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const requestBody = {
    model: model,
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000, // Increased for complete code generation
    stream: options.stream ?? false,
  };

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`OpenRouter API attempt ${attempt}/${maxRetries} for model: ${model}`);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'MominAI Sandbox',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error (${response.status}): ${errorText}`);

        // Don't retry on authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${errorText}`);
        }

        // Don't retry on bad requests (malformed request)
        if (response.status === 400) {
          throw new Error(`Bad request: ${errorText}`);
        }

        // Retry on server errors, rate limits, etc.
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from OpenRouter');
      }

      const choice = data.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new Error('Invalid response format from OpenRouter');
      }

      console.log(`OpenRouter API success on attempt ${attempt}`);

      // Validate JSON format for structured responses
      const validatedResponse = validateJsonResponse(choice.message.content);

      return {
        response: validatedResponse,
        model: data.model,
        usage: data.usage,
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`OpenRouter API attempt ${attempt} failed:`, error);

      // Don't retry on certain errors
      const errorMessage = lastError.message.toLowerCase();
      if (errorMessage.includes('authentication failed') ||
          errorMessage.includes('bad request') ||
          errorMessage.includes('model') && errorMessage.includes('not found')) {
        console.error('Non-retryable error detected, failing immediately');
        break;
      }

      // If it's the last attempt, don't retry
      if (attempt === maxRetries) {
        console.error('Max retries reached, giving up');
        break;
      }

      // Wait before retrying (exponential backoff with jitter)
      const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      const jitter = Math.random() * 1000; // Add up to 1s of jitter
      const delay = baseDelay + jitter;

      console.log(`Waiting ${Math.round(delay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to get response from OpenRouter after ${maxRetries} attempts: ${lastError?.message}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model, options, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await processPrompt(prompt, model, options, mode);

    res.status(200).json(result);
  } catch (error) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(500).json({ error: errorMessage });
  }
}