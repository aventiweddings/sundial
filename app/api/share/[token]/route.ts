import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/share/[token] — Public endpoint. Returns timeline data for a valid share token.
 * No auth required.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = createServiceClient();

  // Look up the share
  const { data: share, error: shareError } = await service
    .from('timeline_shares')
    .select('timeline_id')
    .eq('share_token', token)
    .eq('is_active', true)
    .single();

  if (shareError || !share) {
    return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  }

  // Fetch the timeline (using service client to bypass RLS)
  const { data: timeline, error: tlError } = await service
    .from('saved_timelines')
    .select('couple_name, wedding_date, content, metadata')
    .eq('id', share.timeline_id)
    .single();

  if (tlError || !timeline) {
    return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
  }

  return NextResponse.json({
    couple_name: timeline.couple_name,
    wedding_date: timeline.wedding_date,
    content: timeline.content,
    metadata: timeline.metadata,
  });
}
