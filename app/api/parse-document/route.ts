import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name.toLowerCase();

  try {
    let text = '';

    if (filename.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else if (filename.endsWith('.pdf')) {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (filename.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, .docx, or .txt' }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch {
    return NextResponse.json({ error: 'Failed to parse document' }, { status: 500 });
  }
}
