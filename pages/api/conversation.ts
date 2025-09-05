import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Conversation API called - basic test');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, mode = 'ask' } = req.body;
    console.log('Request body:', { prompt: prompt?.substring(0, 50), mode });

    // Simple test response first
    res.status(200).json({
      success: true,
      response: `Test response: You said "${prompt?.substring(0, 50)}..." in ${mode} mode. API is working!`,
      debug: {
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
        hasGoogle: !!process.env.GOOGLE_AI_API_KEY,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Basic conversation API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}