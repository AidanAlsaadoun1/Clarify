import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const simplifiedContentSchema = z.object({
  summary: z.string().describe('A concise 2-3 sentence summary of the main ideas'),
  bulletPoints: z.array(z.string()).min(3).max(7).describe('Key bullet points highlighting the most important information'),
  eli5: z.string().describe('An "Explain Like I\'m 5" version - simple language that anyone can understand'),
});

const MAX_TEXT_LENGTH = 150000; // 150KB max input
const MIN_TEXT_LENGTH = 100; // Minimum 100 characters

// Helper function to detect prompt injection attempts
function detectPromptInjection(text: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /disregard\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /forget\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
    /system\s*:\s*/i,
    /assistant\s*:\s*/i,
    /user\s*:\s*/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
    /###\s*instruction/i,
    /you\s+are\s+now/i,
    /pretend\s+to\s+be/i,
    /act\s+as\s+a/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return Response.json(
        { error: 'Valid text is required' },
        { status: 400 }
      );
    }

    if (text.length < MIN_TEXT_LENGTH) {
      return Response.json(
        { error: `Text must be at least ${MIN_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return Response.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (detectPromptInjection(text)) {
      return Response.json(
        { error: 'Invalid input detected. Please provide educational content only.' },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
      model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
      schema: simplifiedContentSchema,
      system: `You are a world-class accessibility assistant that helps students with learning differences like ADHD and dyslexia understand complex topics.

Your goal is to reduce cognitive load by transforming complex text into clear, focused content that is simple and easy to understand.

Please provide:
1. A concise summary (2-4 sentences capturing the main ideas)
2. Key bullet points (3-7 points highlighting the most important information)
3. An ELI5 (Explain Like I'm 5) version using simple, everyday language

Be clear, direct, and remove unnecessary complexity while preserving the core meaning. Keep outputs reasonably concise for text-to-speech compatibility (aim for under 8,000 characters total when possible).`,
      prompt: `Text to simplify:
${text}`,
      maxOutputTokens: 3000,
    });

    return Response.json({ simplified: object });
  } catch (error) {
    console.error('Error in simplify API:', error);
    return Response.json(
      { error: 'Failed to simplify text' },
      { status: 500 }
    );
  }
}
