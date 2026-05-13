import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, EXTRACT_SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Extract wedding details from this text:\n\n${text}` }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const extracted = JSON.parse(cleaned);

    // Remove null values
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(extracted)) {
      if (v !== null) result[k] = v;
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
