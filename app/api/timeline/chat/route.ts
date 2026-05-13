import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, CHAT_SYSTEM_PROMPT } from '@/lib/claude';
import { ChatMessage } from '@/lib/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, currentContent, chatHistory } = await req.json();
  if (!message || !currentContent) return NextResponse.json({ error: 'message and currentContent required' }, { status: 400 });

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

        const response = await anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: CHAT_SYSTEM_PROMPT,
          messages,
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text;
            send({ type: 'text_delta', text: event.delta.text });
          }
        }

        // Parse out updated timeline if present in response
        const timelineMatch = fullResponse.match(/```timeline\n([\s\S]*?)```/);
        if (timelineMatch) {
          updatedTimeline = timelineMatch[1].trim();
          const responseText = fullResponse.replace(/```timeline[\s\S]*?```/, '').trim();
          send({ type: 'timeline_update', timeline: updatedTimeline, response: responseText || fullResponse });
        } else {
          // The whole response might be the updated timeline if it looks like one
          const looksLikeTimeline = fullResponse.includes('**') && (fullResponse.includes('AM') || fullResponse.includes('PM'));
          if (looksLikeTimeline) {
            send({ type: 'timeline_update', timeline: fullResponse, response: 'I\'ve updated your timeline.' });
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
