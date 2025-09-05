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
    // The getConversationalResponse function will handle the OpenRouter -> Google fallback
    const result = await getConversationalResponse(prompt, mode, null);

    res.status(200).json({
      success: true,
      response: result,
    });
  } catch (error) {
    console.error('Conversation API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}