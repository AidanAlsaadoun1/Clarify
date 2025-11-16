import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const keyTermsSchema = z.object({
  terms: z.array(
    z.object({
      term: z.string().describe('A complex or specialized term from the text'),
      definition: z.string().describe('A simple, student-friendly definition in one sentence'),
    })
  ).min(3).max(10).describe('The most important complex terms that students might not understand'),
});

export async function POST(req: Request) {
  try {
    const { content, originalText, language = 'en' } = await req.json();

    if (!content) {
      return Response.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    const languageNames: Record<string, string> = {
      en: 'English',
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

    const targetLanguage = languageNames[language] || 'English';

    const { object } = await generateObject({
      model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
      schema: keyTermsSchema,
      system: `You are an accessibility assistant helping students with learning differences like ADHD and dyslexia.

Your task is to identify the most important complex or specialized terms from educational text that a student might struggle with, and provide simple, clear definitions.

Instructions:
1. Identify 3-10 key terms that are complex, technical, or specialized
2. Focus on terms that would break a student's focus if they had to look them up
3. Provide definitions that are:
   - One sentence long
   - Use simple, everyday language
   - Assume no prior knowledge
   - Help maintain reading flow
4. Both the term and its definition MUST be in the target language
5. Return the terms in order of importance (most critical first)`,
      prompt: `Target Language: ${targetLanguage}

Original text:
${originalText}

Simplified content:
Summary: ${content.summary}
Key Points: ${content.bulletPoints.join('. ')}
ELI5: ${content.eli5}`,
      maxOutputTokens: 1500,
    });

    return Response.json({ terms: object.terms });
  } catch (error) {
    console.error('Error in explain-terms API:', error);
    return Response.json(
      { error: 'Failed to explain key terms' },
      { status: 500 }
    );
  }
}
