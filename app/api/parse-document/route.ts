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
      // pdf-parse v1 — dynamic import to keep it server-only
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (filename.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, .docx, or .txt' }, { status: 400 });
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Document appears empty or contains only images. Please try a text-based PDF or Word document.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[parse-document] Error:', message, err instanceof Error ? err.stack : '');
    return NextResponse.json(
      { error: `Failed to parse document: ${message}` },
      { status: 500 }
    );
  }
}
