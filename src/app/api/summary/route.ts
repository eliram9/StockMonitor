import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Summary API called ===');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { url } = body;

    if (!url) {
      console.log('Error: No URL provided');
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('URL received:', url);

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.log('Error: OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('OpenAI key found, length:', openaiApiKey.length);

    // Step 1: Fetch the webpage content
    console.log('Fetching webpage content...');
    let articleContent = '';
    
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        },
      });
      
      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      }
      
      const html = await pageResponse.text();
      articleContent = extractTextContent(html);
      
      if (!articleContent || articleContent.length < 100) {
        throw new Error('Could not extract meaningful content from the page');
      }
      
      console.log('Content extracted, length:', articleContent.length);
      
    } catch (fetchError) {
      console.error('Error fetching webpage:', fetchError);
      return NextResponse.json(
        { error: `Could not fetch article content: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 2: Summarize with OpenAI
    console.log('Sending to OpenAI for summarization...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // Changed from 'gpt-4o' to more stable model
        messages: [
          {
            role: 'system',
            content: 'You are a financial news analyst. Provide a concise, informative summary of the article focusing on key financial impacts, market implications, and important facts. Keep it under 150 words and write in clear, professional language.'
          },
          {
            role: 'user',
            content: `Please summarize this financial news article:\n\n${articleContent.substring(0, 3000)}` // Limit content to avoid token limits
          }
        ],
        max_tokens: 200,
        temperature: 0.3, // Lower temperature for more consistent summaries
      }),
    });

    console.log('OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response:', openaiData);

    const summary = openaiData.choices[0]?.message?.content || 'Summary could not be generated.';

    return NextResponse.json({ 
      summary: summary.trim(),
      url: url,
      contentLength: articleContent.length
    });

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Enhanced text extraction function
function extractTextContent(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove HTML tags but keep the text content
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  
  // Remove extra whitespace and normalize
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove very short lines (likely navigation/footer text)
  const lines = text.split('\n').filter(line => line.trim().length > 20);
  
  return lines.join('\n').trim();
}