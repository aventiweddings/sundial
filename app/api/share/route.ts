import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

/**
 * POST /api/share — Create or retrieve a share link for a timeline.
 * Body: { timelineId: string }
 * Returns: { shareToken, shareUrl }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { timelineId } = (await req.json()) as { timelineId?: string };
  if (!timelineId) return NextResponse.json({ error: 'timelineId required' }, { status: 400 });

  // Verify ownership
  const { data: timeline } = await supabase
    .from('saved_timelines')
    .select('id')
    .eq('id', timelineId)
    .eq('user_id', user.id)
    .single();

  if (!timeline) return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });

  const service = createServiceClient();

  // Check for existing active share
  const { data: existing } = await service
    .from('timeline_shares')
    .select('share_token')
    .eq('timeline_id', timelineId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (existing) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return NextResponse.json({
      shareToken: existing.share_token,
      shareUrl: `${baseUrl}/share/${existing.share_token}`,
    });
  }

  // Generate new share token (URL-safe, 10 chars)
  const shareToken = randomBytes(15).toString('base64url').slice(0, 10);

  const { error } = await service
    .from('timeline_shares')
    .insert({
      timeline_id: timelineId,
      user_id: user.id,
      share_token: shareToken,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return NextResponse.json({
    shareToken,
    shareUrl: `${baseUrl}/share/${shareToken}`,
  });
}

/**
 * DELETE /api/share — Deactivate a share link.
 * Body: { timelineId: string }
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { timelineId } = (await req.json()) as { timelineId?: string };
  if (!timelineId) return NextResponse.json({ error: 'timelineId required' }, { status: 400 });

  const service = createServiceClient();
  await service
    .from('timeline_shares')
    .update({ is_active: false })
    .eq('timeline_id', timelineId)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
