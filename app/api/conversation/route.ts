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
    const { prompt, mode = 'ask' } = await request.json();

    console.log('Simple AI API called:', { prompt: prompt?.substring(0, 50), mode });

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

    let result: string;

    // Try OpenRouter first
    if (openRouterKey) {
      try {
        console.log('Attempting OpenRouter...');
        const messages = [
          { role: 'system', content: `You are a helpful AI assistant in ${mode} mode.` },
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
    });

  } catch (error) {
    console.error('Simple AI API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}