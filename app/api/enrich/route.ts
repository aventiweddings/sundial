import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrich } from '@/lib/enrichment';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gettingReadyAddress, ceremonyAddress, receptionAddress, weddingDate, sameVenue } = await req.json();

  try {
    const result = await enrich(
      gettingReadyAddress,
      ceremonyAddress,
      receptionAddress || ceremonyAddress,
      weddingDate,
      sameVenue
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({}, { status: 200 }); // Fail gracefully
  }
}
