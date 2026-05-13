import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, AUDIT_SYSTEM_PROMPT } from '@/lib/claude';
import { checkUsage, incrementUsage } from '@/lib/plans';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed, remaining, plan } = await checkUsage(user.id, 'audit');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Audit limit reached', plan, remaining },
      { status: 429 }
    );
  }

  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: AUDIT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Please audit this wedding day timeline:\n\n${content}`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from within the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse audit response');
      }
    }

    await incrementUsage(user.id, 'audit');

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
  }
}
