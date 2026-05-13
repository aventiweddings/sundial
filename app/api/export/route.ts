import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPlan, PLAN_LIMITS } from '@/lib/plans';
import { buildDocx } from '@/lib/export';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan = await getUserPlan(user.id);
  if (!PLAN_LIMITS[plan].canExport) {
    return NextResponse.json({ error: 'Export requires a paid plan', plan }, { status: 403 });
  }

  const { timelineId, format = 'docx' } = await req.json();
  if (!timelineId) return NextResponse.json({ error: 'timelineId required' }, { status: 400 });

  const { data: timeline, error } = await supabase
    .from('saved_timelines')
    .select('content, couple_name, wedding_date')
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
    const buffer = await buildDocx(timeline.content, timeline.couple_name, weddingDate);
    const filename = `${timeline.couple_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-timeline.docx`;
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
