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

export async function POST(req: Request) {
  try {
    const { content, targetLanguage } = await req.json();

    if (!content || !targetLanguage) {
      return Response.json(
        { error: 'Content and target language are required' },
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
- Preserve the meaning and tone`,
      prompt: `Target Language: ${languageName}

Original content to translate:
Summary: ${content.summary}

Key Points:
${content.bulletPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

ELI5: ${content.eli5}`,
      maxOutputTokens: 2000,
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
