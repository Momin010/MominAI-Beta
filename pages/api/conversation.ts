import { NextApiRequest, NextApiResponse } from 'next';
// import { getConversationalResponse } from '../../src/IDE/services/aiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Conversation API called with AI service');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, mode = 'ask' } = req.body;

  console.log('Request body received:', {
    hasPrompt: !!prompt,
    promptType: typeof prompt,
    promptLength: prompt?.length,
    mode,
    fullBody: req.body
  });

  if (!prompt) {
    console.log('Prompt validation failed - returning 400');
    return res.status(400).json({
      error: 'Prompt is required',
      debug: { receivedBody: req.body }
    });
  }

  try {
    console.log('Processing request:', { prompt: prompt.substring(0, 100), mode });

    // Check environment variables
    console.log('Environment check:', {
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasGoogle: !!process.env.GOOGLE_AI_API_KEY,
      openRouterLength: process.env.OPENROUTER_API_KEY?.length,
      googleLength: process.env.GOOGLE_AI_API_KEY?.length
    });

    // Dynamic import to avoid static import issues
    let result: string;
    try {
      const { getConversationalResponse } = await import('../../src/IDE/services/aiService');
      result = await getConversationalResponse(prompt, mode, null);
    } catch (importError) {
      console.error('Failed to import AI service:', importError);
      throw new Error('AI service import failed');
    }

    console.log('AI response generated successfully, length:', result.length);

    res.status(200).json({
      success: true,
      response: result,
    });
  } catch (error) {
    console.error('Conversation API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}