import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPlan, PLAN_LIMITS } from '@/lib/plans';
import { buildDocx, ExportLayout } from '@/lib/export';
import { anthropic, COORDINATOR_SYSTEM_PROMPT, buildCoordinatorPrompt } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan = await getUserPlan(user.id);
  if (!PLAN_LIMITS[plan].canExport) {
    return NextResponse.json({ error: 'Export requires a Pro plan', plan }, { status: 403 });
  }

  const { timelineId, format = 'docx', layout = 'simple' }: {
    timelineId?: string;
    format?: string;
    layout?: ExportLayout;
  } = await req.json();

  if (!timelineId) return NextResponse.json({ error: 'timelineId required' }, { status: 400 });

  const validLayouts: ExportLayout[] = ['simple', 'elegant', 'grid'];
  const selectedLayout = validLayouts.includes(layout) ? layout : 'simple';

  const { data: timeline, error } = await supabase
    .from('saved_timelines')
    .select('content, couple_name, wedding_date, metadata')
    .eq('id', timelineId)
    .eq('user_id', user.id)
    .single();

  if (error || !timeline) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const weddingDate = timeline.wedding_date
    ? new Date(timeline.wedding_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  if (format === 'docx') {
    let contentToExport = timeline.content;
    let filenameSuffix = 'timeline';

    // Coordinator notes: AI-generate first, then build docx
    if (selectedLayout === 'coordinator') {
      const metadata = (timeline.metadata ?? {}) as Record<string, unknown>;
      const userMessage = buildCoordinatorPrompt(timeline.content, metadata);
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: COORDINATOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      const firstBlock = response.content[0];
      contentToExport = firstBlock.type === 'text' ? firstBlock.text : timeline.content;
      filenameSuffix = 'coordinator-notes';
    }

    const buffer = await buildDocx(contentToExport, timeline.couple_name, weddingDate, selectedLayout);
    const filename = `${timeline.couple_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${filenameSuffix}.docx`;
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
