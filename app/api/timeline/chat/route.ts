import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, CHAT_SYSTEM_PROMPT } from '@/lib/claude';
import { ChatMessage } from '@/lib/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, currentContent, chatHistory, weddingContext } = await req.json();
  if (!message || !currentContent) return NextResponse.json({ error: 'message and currentContent required' }, { status: 400 });

  // Build augmented system prompt with original form data if available
  let systemPrompt = CHAT_SYSTEM_PROMPT;
  if (weddingContext && typeof weddingContext === 'object') {
    const ctx = weddingContext as Record<string, unknown>;
    const lines: string[] = [];
    if (ctx.person1Name) lines.push(`Couple: ${ctx.person1Name} & ${ctx.person2Name}`);
    if (ctx.weddingDate) lines.push(`Wedding date: ${ctx.weddingDate}`);
    if (ctx.ceremonyType) lines.push(`Ceremony type: ${ctx.ceremonyType}`);
    if (ctx.guestCount) lines.push(`Guest count: ${ctx.guestCount}`);
    if (ctx.weddingPartySize) lines.push(`Wedding party: ${ctx.weddingPartySize}`);
    if (ctx.gettingReadyAddress) {
      const name = ctx.gettingReadyName ? `${ctx.gettingReadyName} — ` : '';
      const avail = ctx.gettingReadyAvailableFrom ? ` (available from ${ctx.gettingReadyAvailableFrom})` : '';
      lines.push(`Getting ready: ${name}${ctx.gettingReadyAddress}${avail}`);
    }
    if (ctx.ceremonyAddress) {
      const name = ctx.ceremonyName ? `${ctx.ceremonyName} — ` : '';
      lines.push(`Ceremony: ${name}${ctx.ceremonyAddress}`);
    }
    if (ctx.receptionAddress) {
      const name = ctx.receptionName ? `${ctx.receptionName} — ` : '';
      const stop = ctx.receptionHardStop ? ` (hard stop: ${ctx.receptionHardStop})` : '';
      lines.push(`Reception: ${name}${ctx.receptionAddress}${stop}`);
    }
    if (ctx.leadPhotographer) lines.push(`Lead photographer: ${ctx.leadPhotographer}`);
    if (ctx.secondShooter) lines.push(`Second shooter: ${ctx.secondShooter}`);
    if (ctx.videographer) lines.push(`Videographer: ${ctx.videographer}`);
    if (ctx.coordinator) lines.push(`Coordinator: ${ctx.coordinator}`);
    const vendors = ctx.vendorCoverages as Array<{ vendorType: string; companyName?: string; coverageStart: string; coverageEnd: string; notes?: string }> | undefined;
    if (vendors?.length) {
      lines.push(`Vendor coverage:`);
      for (const v of vendors) {
        lines.push(`  - ${v.vendorType}${v.companyName ? ` (${v.companyName})` : ''}: ${v.coverageStart}–${v.coverageEnd}${v.notes ? ` — ${v.notes}` : ''}`);
      }
    }
    if (ctx.additionalNotes) lines.push(`Original notes from form: ${ctx.additionalNotes}`);
    if (ctx.dressAttire) lines.push(`Attire: ${ctx.dressAttire}`);
    if (ctx.package) lines.push(`Package: ${ctx.package}`);

    if (lines.length > 0) {
      systemPrompt = CHAT_SYSTEM_PROMPT + `\n\n---\nORIGINAL WEDDING FORM DATA (what was entered when this timeline was created):\n${lines.join('\n')}\n\nYou have access to all of this. When asked "what was on the form", "what was submitted", "what vendor info do we have", or similar — answer directly from the above. Never say you don't have the original form data.`;
    }
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(chatHistory as ChatMessage[]).map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `Here is the current timeline:\n\n${currentContent}\n\n---\n\nUser request: ${message}`,
    },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let fullResponse = '';
        let updatedTimeline = currentContent;

        // Send a thinking indicator immediately
        send({ type: 'thinking' });

        const response = await anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        });

        // Collect response server-side — don't stream raw text to client
        // Send periodic heartbeats so the connection stays alive
        let lastHeartbeat = Date.now();
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text;
            // Heartbeat every 2 seconds to keep connection alive
            if (Date.now() - lastHeartbeat > 2000) {
              send({ type: 'thinking' });
              lastHeartbeat = Date.now();
            }
          }
        }

        // Parse out updated timeline if present in response
        const timelineMatch = fullResponse.match(/```timeline\n([\s\S]*?)```/);
        if (timelineMatch) {
          updatedTimeline = timelineMatch[1].trim();
          const responseText = fullResponse.replace(/```timeline[\s\S]*?```/, '').trim();
          send({ type: 'timeline_update', timeline: updatedTimeline, response: responseText || 'I\'ve updated your timeline.' });
        } else {
          // The whole response might be the updated timeline if it looks like one
          const looksLikeTimeline = fullResponse.includes('**') && (fullResponse.includes('AM') || fullResponse.includes('PM'));
          if (looksLikeTimeline) {
            send({ type: 'timeline_update', timeline: fullResponse, response: 'I\'ve updated your timeline with those changes.' });
          } else {
            send({ type: 'timeline_update', timeline: updatedTimeline, response: fullResponse });
          }
        }

        send({ type: 'done' });
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        send({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
