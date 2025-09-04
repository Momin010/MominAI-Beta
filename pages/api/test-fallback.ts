import { NextApiRequest, NextApiResponse } from 'next';
// import { processPrompt } from '../../lib/model-router';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt, enableFallback = true } = req.body;

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required' });
  }

  try {
    const startTime = Date.now();
    // Dummy implementation for testing
    const result = {
      response: `Test response for prompt: ${prompt}`,
      provider: 'test',
      model: model
    };
    const endTime = Date.now();

    res.status(200).json({
      success: true,
      response: result.response,
      provider: result.provider,
      model: result.model,
      responseTime: endTime - startTime,
      fallbackEnabled: enableFallback,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallbackEnabled: enableFallback,
    });
  }
}