import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('saved_timelines')
    .select('id, couple_name, wedding_date, created_at, metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = nanoid();

  const { error } = await supabase.from('saved_timelines').insert({
    id,
    user_id: user.id,
    couple_name: body.couple_name,
    wedding_date: body.wedding_date,
    content: body.content,
    metadata: body.metadata || {},
    chat_history: [],
    version_history: [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id });
}
