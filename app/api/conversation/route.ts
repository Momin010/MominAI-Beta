import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// OpenRouter API integration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-3-haiku";

async function callOpenRouterAPI(messages: any[], apiKey: string): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://momin-ai-beta.vercel.app',
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
}

async function callGoogleAPI(prompt: string, apiKey: string): Promise<string> {
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
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode = 'ask', projectId } = await request.json();

    console.log('MominAI Agent called:', { prompt: prompt?.substring(0, 50), mode, projectId });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;

    console.log('API Keys available:', {
      openRouter: !!openRouterKey,
      google: !!googleKey
    });

    // Check if this is a code generation request
    const isCodeRequest = mode === 'code' ||
                         prompt.toLowerCase().includes('website') ||
                         prompt.toLowerCase().includes('app') ||
                         prompt.toLowerCase().includes('build') ||
                         prompt.toLowerCase().includes('create');

    if (isCodeRequest) {
      // Execute as AI Agent - create actual files and run commands
      return await executeAIAgent(prompt, { openRouterKey, googleKey }, projectId);
    }

    // Regular conversation mode
    let result: string;

    // Try OpenRouter first
    if (openRouterKey) {
      try {
        console.log('Attempting OpenRouter...');
        const messages = [
          { role: 'system', content: `You are MominAI, a helpful AI assistant in ${mode} mode.` },
          { role: 'user', content: prompt }
        ];
        result = await callOpenRouterAPI(messages, openRouterKey);
        console.log('OpenRouter success');
      } catch (error) {
        console.log('OpenRouter failed, trying Google:', error);
        if (googleKey) {
          result = await callGoogleAPI(prompt, googleKey);
          console.log('Google fallback success');
        } else {
          throw new Error('Both APIs failed - no valid keys');
        }
      }
    } else if (googleKey) {
      console.log('Using Google (OpenRouter key not available)');
      result = await callGoogleAPI(prompt, googleKey);
    } else {
      throw new Error('No API keys configured');
    }

    return NextResponse.json({
      success: true,
      response: result,
      type: 'conversation'
    });

  } catch (error) {
    console.error('MominAI Agent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// AI Agent execution function
async function executeAIAgent(prompt: string, keys: any, projectId?: string) {
  console.log('🤖 Executing AI Agent workflow for:', prompt);

  const { openRouterKey, googleKey } = keys;

  // Step 1: Clarify user requirements
  const clarificationPrompt = `Analyze this user request for a React/Vite project:

"${prompt}"

Return a JSON object with project analysis:
{
  "projectType": "website|app|landing-page|ecommerce",
  "components": ["Navbar", "Hero", "About", "Contact", "Footer"],
  "features": ["responsive", "animations", "forms"],
  "description": "Brief project description"
}`;

  let clarification;
  try {
    if (openRouterKey) {
      const messages = [{ role: 'user', content: clarificationPrompt }];
      clarification = await callOpenRouterAPI(messages, openRouterKey);
    } else if (googleKey) {
      clarification = await callGoogleAPI(clarificationPrompt, googleKey);
    }
    console.log('✅ Requirements clarified');
  } catch (error) {
    console.warn('Clarification failed:', error);
  }

  // Step 2: Generate React code for multiple files
  const codePrompt = `Create a complete React/Vite application for: "${prompt}"

Return a JSON object with complete file contents:
{
  "files": {
    "src/App.tsx": "complete App component with imports and JSX",
    "src/components/Navbar.tsx": "complete Navbar component",
    "src/components/Hero.tsx": "complete Hero section component",
    "src/components/Contact.tsx": "complete Contact form component",
    "src/index.css": "Tailwind CSS imports and global styles",
    "package.json": "complete package.json with all dependencies",
    "vite.config.ts": "Vite configuration",
    "index.html": "HTML template"
  },
  "summary": "What was created",
  "runCommands": ["npm install", "npm run dev"]
}

Make it production-ready with:
- Modern React with hooks
- Tailwind CSS for styling
- Framer Motion for animations
- Responsive design
- TypeScript support
- Clean, maintainable code`;

  let codeResponse;
  try {
    if (openRouterKey) {
      const messages = [{ role: 'user', content: codePrompt }];
      codeResponse = await callOpenRouterAPI(messages, openRouterKey);
    } else if (googleKey) {
      codeResponse = await callGoogleAPI(codePrompt, googleKey);
    }
    console.log('✅ Code generated');
  } catch (error) {
    console.error('Code generation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate code',
      type: 'agent'
    });
  }

  // Step 3: Parse and execute file creation
  if (codeResponse) {
    try {
      const parsedResponse = JSON.parse(codeResponse);

      if (parsedResponse.files) {
        console.log('📁 Creating files...');

        // Create project directory structure
        const projectPath = projectId ? `projects/${projectId}` : 'projects/generated-app';

        // Execute file creation (this would need to be handled by the client-side IDE)
        const actions = [];

        for (const [filePath, content] of Object.entries(parsedResponse.files)) {
          const fullPath = `${projectPath}/${filePath}`;
          actions.push({
            action: 'createFile',
            path: fullPath,
            content: content
          });
        }

        // Add run commands
        if (parsedResponse.runCommands) {
          actions.push({
            action: 'runCommands',
            commands: parsedResponse.runCommands,
            cwd: projectPath
          });
        }

        console.log('✅ Agent execution complete');

        return NextResponse.json({
          success: true,
          response: `🎉 Created ${Object.keys(parsedResponse.files).length} files for your ${parsedResponse.summary || 'project'}!`,
          actions: actions,
          summary: parsedResponse.summary,
          type: 'agent'
        });
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response:', parseError);
    }
  }

  // Fallback
  return NextResponse.json({
    success: false,
    error: 'Failed to process agent request',
    type: 'agent'
  });
}