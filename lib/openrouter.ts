
import { handleError, getUserFriendlyMessage, AIError, NetworkError } from './error-handler';

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

export async function processPrompt(
  prompt: string,
  model: string = DEFAULT_MODEL,
  options: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {}
): Promise<ProcessPromptResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const error = new AIError('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.', 'MISSING_API_KEY');
    handleError(error, 'openrouter_stream_init');
    throw error;
  }

  const messages: OpenRouterMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  const requestBody = {
    model: model,
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1000,
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

        let error: Error;
        if (response.status === 401 || response.status === 403) {
          error = new AIError(`Authentication failed: ${errorText}`, 'AUTH_FAILED');
        } else if (response.status === 400) {
          error = new AIError(`Bad request: ${errorText}`, 'BAD_REQUEST');
        } else if (response.status === 429) {
          error = new AIError(`Rate limit exceeded: ${errorText}`, 'RATE_LIMIT_EXCEEDED');
        } else if (response.status >= 500) {
          error = new NetworkError(`Server error: ${errorText}`, response.status);
        } else {
          error = new AIError(`OpenRouter API error (${response.status}): ${errorText}`, `HTTP_${response.status}`);
        }

        handleError(error, 'openrouter_api_call');
        throw error;
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
      return {
        response: choice.message.content,
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

  const finalError = new AIError(`Failed to get response from OpenRouter after ${maxRetries} attempts: ${lastError?.message}`, 'MAX_RETRIES_EXCEEDED');
  handleError(finalError, 'openrouter_max_retries');
  throw finalError;
}

export async function* processPromptStream(
  prompt: string,
  model: string = DEFAULT_MODEL,
  options: {
    temperature?: number;
    max_tokens?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const error = new AIError('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment variables.', 'MISSING_API_KEY');
    handleError(error, 'openrouter_init');
    throw error;
  }

  const messages: OpenRouterMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  const requestBody = {
    model: model,
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1000,
    stream: true,
  };

  try {
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
      const error = new AIError(`OpenRouter API error (${response.status}): ${errorText}`, `HTTP_${response.status}`);
      handleError(error, 'openrouter_stream_api_call');
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to get response reader for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('Failed to parse streaming response:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    const errorDetails = handleError(error, 'openrouter_stream');
    throw error;
  }
}

export async function getAvailableModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const error = new AIError('OpenRouter API key not configured', 'MISSING_API_KEY');
    handleError(error, 'openrouter_models_init');
    throw error;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = new NetworkError(`Failed to fetch models: ${response.status}`, response.status);
      handleError(error, 'openrouter_fetch_models');
      throw error;
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    handleError(error, 'openrouter_get_models');
    return [];
  }
}