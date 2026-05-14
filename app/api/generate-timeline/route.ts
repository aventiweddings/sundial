import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkUsage, incrementUsage } from '@/lib/plans';
import { anthropic, SYSTEM_PROMPT, SYSTEM_PROMPT_COUPLE, buildUserMessage } from '@/lib/claude';
import { WeddingData, EnrichedData } from '@/lib/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const usage = await checkUsage(user.id, 'timeline');
  if (!usage.allowed) {
    return new Response(
      JSON.stringify({ error: 'limit_reached', upgradeUrl: '/pricing', plan: usage.plan }),
      { status: 403 }
    );
  }

  const { weddingData, enrichedData, includeVendorNotes = true }: {
    weddingData: WeddingData;
    enrichedData: EnrichedData;
    includeVendorNotes?: boolean;
  } = await req.json();

  const userMessage = buildUserMessage(weddingData, enrichedData || {});
  const systemPrompt = includeVendorNotes ? SYSTEM_PROMPT : SYSTEM_PROMPT_COUPLE;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        await incrementUsage(user.id, 'timeline');
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
