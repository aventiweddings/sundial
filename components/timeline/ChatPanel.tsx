'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from '@/lib/types';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

const QUICK_CHIPS = [
  'Move first look 15 min earlier',
  'Add buffer before ceremony',
  'Shorten cocktail hour by 30 min',
  'Add getting ready details',
  'Make family formals more efficient',
];

interface Props {
  timelineId: string;
  content: string;
  chatHistory: ChatMessage[];
  onTimelineUpdate: (newContent: string, newHistory: ChatMessage[]) => void;
}

export default function ChatPanel({ timelineId, content, chatHistory, onTimelineUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/timeline/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timelineId,
          message: text.trim(),
          currentContent: content,
          chatHistory: updatedHistory,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === 'timeline_update') {
                const assistantMsg: ChatMessage = { role: 'assistant', content: parsed.response };
                const finalHistory = [...updatedHistory, assistantMsg];
                setMessages(finalHistory);
                onTimelineUpdate(parsed.timeline, finalHistory);

                // persist to API
                await fetch(`/api/timelines/${timelineId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_history: finalHistory, content: parsed.timeline }),
                });
              }
              // 'thinking' events just keep the connection alive — no UI action needed
            } catch { /* non-JSON line */ }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-full px-5 py-3 shadow-lg transition-all font-medium text-sm"
        >
          <span className="text-base leading-none">☀️</span>
          Chat with Sunny
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[420px] h-[600px] max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl sm:bottom-6 sm:right-6 shadow-2xl border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-100 to-[#C9A84C]/20 flex items-center justify-center text-lg">
                ☀️
              </div>
              <div>
                <p className="font-playfair font-semibold text-slate-900">Sunny</p>
                <p className="text-xs text-slate-500">Your timeline assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 mb-4">What would you like to change?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="text-xs bg-[#FAF7F2] border border-[#C9A84C]/30 text-slate-700 rounded-full px-3 py-1.5 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-[#C9A84C]/20 flex items-center justify-center text-xs shrink-0 mt-1">
                    ☀️
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#C9A84C] text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {streaming && (
              <div className="flex justify-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-[#C9A84C]/20 flex items-center justify-center text-xs shrink-0 mt-1">
                  ☀️
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C9A84C]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#C9A84C]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#C9A84C]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Undo / quick chips row */}
          {messages.length > 0 && !streaming && (
            <div className="px-4 pb-1 flex gap-2 overflow-x-auto">
              {QUICK_CHIPS.slice(0, 3).map(chip => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="text-xs bg-[#FAF7F2] border border-[#C9A84C]/30 text-slate-600 rounded-full px-3 py-1 hover:border-[#C9A84C] whitespace-nowrap transition-all shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-100 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="e.g. Move first look to 3:30 PM…"
              className="resize-none text-sm min-h-[44px] max-h-[120px] rounded-xl border-slate-200 focus:border-[#C9A84C]"
              rows={1}
              disabled={streaming}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              size="icon"
              className="bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl shrink-0 h-11 w-11"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
