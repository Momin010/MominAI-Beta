import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Enable Edge Runtime for better performance

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode = 'ask', stream = false } = await request.json();

    console.log('Edge API called:', { prompt: prompt?.substring(0, 50), mode, stream });
    console.log('Environment check:', {
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasGoogle: !!process.env.GOOGLE_AI_API_KEY,
      nodeEnv: process.env.NODE_ENV
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Dynamic import to avoid static import issues
    let result: string;
    try {
      const { getConversationalResponse } = await import('../../../src/IDE/services/aiService');
      result = await getConversationalResponse(prompt, mode, null);
    } catch (importError) {
      console.error('Failed to import AI service:', importError);
      throw new Error('AI service import failed');
    }

    console.log('AI response generated successfully, length:', result.length);

    // Add caching headers for better performance
    const response = NextResponse.json({
      success: true,
      response: result,
    });

    // Cache for 5 minutes to reduce API calls for similar requests
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return response;

  } catch (error) {
    console.error('Edge API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}