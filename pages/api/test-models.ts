import { NextApiRequest, NextApiResponse } from 'next';
import { processPrompt } from '../../lib/openrouter';

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
    const result = await processPrompt(prompt, model);
    const endTime = Date.now();

    res.status(200).json({
      success: true,
      response: result.response,
      provider: 'OpenRouter',
      model: result.model,
      responseTime: endTime - startTime,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}