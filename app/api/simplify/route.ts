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

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return Response.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
      model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
      schema: simplifiedContentSchema,
      system: `You are a world leading accessibility assistant that helps students with learning differences like ADHD and dyslexia or people who struggle to grasp complex topics. 

Your goal is to reduce cognitive load by transforming complex text into clear, focused content that is simple and easy to understand without oversimplifying it to the point it becomes useless.

Please provide:
1. A concise summary (2-3 sentences)
2. Key bullet points (3-7 points, each one clear and focused)
3. An ELI5 (Explain Like I'm 5) version using simple language

Be clear, direct, and remove unnecessary complexity while preserving the core meaning.`,
      prompt: `Text to simplify:
${text}`,
      maxOutputTokens: 2000,
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
