import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, language, userContext } = req.body;

    // Basic validation
    if (!code || !language || !userContext?.userId) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Mock response for testing
    const mockResponse = {
      sessionId: `test-session-${Date.now()}`,
      containerId: `test-container-${Date.now()}`,
      status: 'running',
      message: 'API route is working correctly'
    };

    res.status(200).json(mockResponse);

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}