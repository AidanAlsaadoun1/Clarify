import { NextRequest, NextResponse } from 'next/server';

const MAX_TTS_LENGTH = 10000;
const ALLOWED_LANGUAGES = ['en', 'ar'];

function detectPromptInjection(text: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /system\s*:\s*/i,
    /assistant\s*:\s*/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'en' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Valid text is required' }, { status: 400 });
    }

    if (text.length > MAX_TTS_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TTS_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!ALLOWED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: 'Unsupported language for TTS' },
        { status: 400 }
      );
    }

    if (detectPromptInjection(text)) {
      return NextResponse.json(
        { error: 'Invalid input detected' },
        { status: 400 }
      );
    }

    const model = language === 'ar' ? 'playai-tts-arabic' : 'playai-tts';
    
    const voice = language === 'ar' ? 'Khalid-PlayAI' : 'Celeste-PlayAI';

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
