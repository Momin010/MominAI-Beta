import { NextApiRequest, NextApiResponse } from 'next';
import { getConversationalResponse } from '../../src/IDE/services/aiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt } = req.body;

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required' });
  }

  try {
    const startTime = Date.now();
    const result = await getConversationalResponse(prompt, 'ask', process.env.GOOGLE_AI_API_KEY || null);
    const endTime = Date.now();

    res.status(200).json({
      success: true,
      response: result,
      provider: 'Google Gemini',
      model: 'gemini-1.5-flash',
      responseTime: endTime - startTime,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}