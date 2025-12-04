import { NextRequest, NextResponse } from 'next/server';

// Extract system prompt for maintainability
const SYSTEM_PROMPT = `You are a friendly financial mentor explaining news to someone new to finance. Create a structured summary with the following format:

## Key Points
• [3-5 bullet points covering the main facts]

## What Happened
[One detailed clear sentence explaining the core event]

## Why It Matters
[1-2 sentences explaining the significance and impact]

## What's Next
[1-2 sentences about future implications or next steps]

Use **bold text** for important terms and numbers. Include **one simple analogy** where helpful (e.g., "like borrowing a book from the library"). **Define any technical terms** parenthetically (e.g., "dividends (company profits paid to shareholders)").

Keep the total around **200-250 words** and focus on making complex financial concepts accessible to beginners while maintaining accuracy.`;

export async function POST(request: NextRequest) {
  try {
    
    const body = await request.json();
    
    const { url } = body;

    // Improved input validation
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      );
    }


    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }


    // Step 1: Fetch the webpage content
    let articleContent = '';
    
    try {
      // Add timeout to prevent hanging requests
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      }
      
      const html = await pageResponse.text();
      articleContent = extractTextContent(html);
      
      if (!articleContent || articleContent.length < 100) {
        throw new Error('Could not extract meaningful content from the page');
      }
      
      
    } catch (fetchError) {
      console.error('Error fetching webpage:', fetchError);
      return NextResponse.json(
        { error: `Could not fetch article content: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 2: Summarize with Claude using extracted prompt

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Please summarize this financial news article using the structured format above:\n\n${articleContent.substring(0, 4000)}`
          }
        ],
        temperature: 0.4,
      }),
    });


    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json();
      console.error('Anthropic API error:', errorData);
      return NextResponse.json(
        { error: `Anthropic API error: ${errorData.error?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const anthropicData = await anthropicResponse.json();

    const summary = anthropicData.content[0]?.text || 'Summary could not be generated.';

    // Optional: Validate that the summary follows the three-sentence structure
    const sentences = summary.trim().split(/[.!?]+/).filter((s: string) => s.length > 10);
    if (sentences.length < 3) {
      console.warn('Summary may not follow three-sentence structure:', sentences.length, 'sentences detected');
    }

    return NextResponse.json({ 
      summary: summary.trim(),
      url: url,
      contentLength: articleContent.length,
      sentenceCount: sentences.length
    });

  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Enhanced text extraction function with better structure preservation
function extractTextContent(html: string): string {
  // Remove script, style, and other non-content elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Remove comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Preserve important structural elements
  text = text.replace(/<h1[^>]*>/gi, '\n\n# ');
  text = text.replace(/<h2[^>]*>/gi, '\n\n## ');
  text = text.replace(/<h3[^>]*>/gi, '\n\n### ');
  text = text.replace(/<h4[^>]*>/gi, '\n\n#### ');
  text = text.replace(/<h5[^>]*>/gi, '\n\n##### ');
  text = text.replace(/<h6[^>]*>/gi, '\n\n###### ');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  
  // Preserve paragraph breaks
  text = text.replace(/<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/p>/gi, '\n');
  
  // Preserve list items
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '\n');
  
  // Preserve blockquotes
  text = text.replace(/<blockquote[^>]*>/gi, '\n\n> ');
  text = text.replace(/<\/blockquote>/gi, '\n');
  
  // Preserve emphasis
  text = text.replace(/<strong[^>]*>/gi, '**');
  text = text.replace(/<\/strong>/gi, '**');
  text = text.replace(/<b[^>]*>/gi, '**');
  text = text.replace(/<\/b>/gi, '**');
  text = text.replace(/<em[^>]*>/gi, '*');
  text = text.replace(/<\/em>/gi, '*');
  text = text.replace(/<i[^>]*>/gi, '*');
  text = text.replace(/<\/i>/gi, '*');
  
  // Remove remaining HTML tags but keep text content
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  const entities: { [key: string]: string } = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&cent;': '¢',
    '&pound;': '£',
    '&euro;': '€',
    '&dollar;': '$',
    '&yen;': '¥'
  };
  
  Object.entries(entities).forEach(([entity, replacement]) => {
    text = text.replace(new RegExp(entity, 'gi'), replacement);
  });
  
  // Clean up whitespace while preserving structure
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive line breaks
  text = text.replace(/[ \t]+/g, ' '); // Normalize spaces
  text = text.replace(/\n +/g, '\n'); // Remove leading spaces on lines
  
  // Split into lines and filter meaningful content
  const lines = text.split('\n').map(line => line.trim()).filter(line => {
    // Keep lines with substantial content
    if (line.length > 30) return true;
    
    // Keep headers and important markers
    if (line.startsWith('#') || line.startsWith('•') || line.startsWith('>')) return true;
    
    // Keep lines with numbers (likely financial data)
    if (/\d+/.test(line)) return true;
    
    // Keep lines with common financial terms
    const financialTerms = ['earnings', 'revenue', 'profit', 'loss', 'stock', 'shares', 'market', 'price', 'dividend', 'quarter', 'annual', 'growth', 'decline', 'increase', 'decrease', 'percent', '%', '$', 'million', 'billion', 'trillion'];
    if (financialTerms.some(term => line.toLowerCase().includes(term))) return true;
    
    return false;
  });
  
  // Join lines and clean up
  let result = lines.join('\n').trim();
  
  // Remove excessive whitespace at the end
  result = result.replace(/\n\s*$/, '');
  
  return result;
}