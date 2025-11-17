import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      );
    }

    const fileType = file.type;
    let extractedText = '';

    if (fileType === 'application/pdf') {
      extractedText = await parsePDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extractedText = await parseDOCX(file);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF or DOCX files.' },
        { status: 400 }
      );
    }

    const sanitizedText = sanitizeText(extractedText);

    return NextResponse.json({ text: sanitizedText });
  } catch (error) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const result = await extractText(uint8Array);
  
  // unpdf might return text as a string or an array of text objects
  let text = '';
  if (typeof result.text === 'string') {
    text = result.text;
  } else if (Array.isArray(result.text)) {
    text = result.text.join(' ');
  } else if (result.text) {
    text = String(result.text);
  }
  
  return text;
}

async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  return result.value;
}

function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    text = String(text || '');
  }
  
  let cleaned = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (cleaned.length > 100000) {
    cleaned = cleaned.substring(0, 100000);
  }

  return cleaned;
}
