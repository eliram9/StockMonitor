import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not found' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'API is working',
      hasOpenAIKey: !!openaiApiKey,
      keyLength: openaiApiKey.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 