import { NextApiRequest, NextApiResponse } from 'next';
import { getConversationalResponse } from '../../src/IDE/services/aiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, mode = 'ask' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    console.log('Conversation API called with:', { prompt: prompt.substring(0, 100), mode });

    // Check environment variables
    console.log('Environment check:', {
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasGoogle: !!process.env.GOOGLE_AI_API_KEY,
      openRouterLength: process.env.OPENROUTER_API_KEY?.length,
      googleLength: process.env.GOOGLE_AI_API_KEY?.length
    });

    // The getConversationalResponse function will handle the OpenRouter -> Google fallback
    const result = await getConversationalResponse(prompt, mode, null);

    console.log('Conversation API success, response length:', result.length);

    res.status(200).json({
      success: true,
      response: result,
    });
  } catch (error) {
    console.error('Conversation API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}