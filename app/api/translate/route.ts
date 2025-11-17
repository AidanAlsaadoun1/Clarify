import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const translatedContentSchema = z.object({
  summary: z.string().describe('Translated summary'),
  bulletPoints: z.array(z.string()).describe('Translated bullet points'),
  eli5: z.string().describe('Translated ELI5 explanation'),
});

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
};

const MAX_CONTENT_LENGTH = 50000;

function validateContent(content: any): boolean {
  if (!content || typeof content !== 'object') return false;
  
  if (typeof content.summary !== 'string' || content.summary.length > 10000) return false;
  if (!Array.isArray(content.bulletPoints) || content.bulletPoints.length > 20) return false;
  if (typeof content.eli5 !== 'string' || content.eli5.length > 10000) return false;
  
  // Check each bullet point
  for (const point of content.bulletPoints) {
    if (typeof point !== 'string' || point.length > 1000) return false;
  }
  
  return true;
}

function detectPromptInjection(text: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /disregard\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /system\s*:\s*/i,
    /assistant\s*:\s*/i,
    /<\|im_start\|>/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

export async function POST(req: Request) {
  try {
    const { content, targetLanguage } = await req.json();

    if (!content || !targetLanguage || typeof targetLanguage !== 'string') {
      return Response.json(
        { error: 'Content and target language are required' },
        { status: 400 }
      );
    }

    if (!validateContent(content)) {
      return Response.json(
        { error: 'Invalid content format' },
        { status: 400 }
      );
    }

    if (!LANGUAGE_NAMES[targetLanguage]) {
      return Response.json(
        { error: 'Unsupported language' },
        { status: 400 }
      );
    }

    const contentText = `${content.summary} ${content.bulletPoints.join(' ')} ${content.eli5}`;
    if (detectPromptInjection(contentText)) {
      return Response.json(
        { error: 'Invalid input detected' },
        { status: 400 }
      );
    }

    const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    const { object } = await generateObject({
      model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
      schema: translatedContentSchema,
      system: `You are a professional translator specializing in accessibility content.

Your task is to translate simplified content while maintaining the same clarity and simplicity.

Instructions:
- Translate all three sections (Summary, Key Points, ELI5) into the target language
- Keep the same structure and level of simplicity
- Maintain accessibility-friendly language
- Preserve the meaning and tone
- Aim to keep similar length to the original
${targetLanguage === 'ar' ? '- For Arabic, ensure proper right-to-left text formatting' : ''}

Keep translations clear and concise for text-to-speech compatibility (aim for under 8,000 characters total when possible).`,
      prompt: `Target Language: ${languageName}

Original content to translate:
Summary: ${content.summary}

Key Points:
${content.bulletPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

ELI5: ${content.eli5}`,
      maxOutputTokens: 3000,
    });

    return Response.json({ translated: object });
  } catch (error) {
    console.error('Error in translate API:', error);
    return Response.json(
      { error: 'Failed to translate content' },
      { status: 500 }
    );
  }
}
