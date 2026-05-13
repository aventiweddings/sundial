'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DocumentView from '@/components/timeline/DocumentView';
import ChatPanel from '@/components/timeline/ChatPanel';
import { SavedTimeline, ChatMessage } from '@/lib/types';
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  BookmarkCheck,
  Bookmark,
  Printer,
  FileDown,
} from 'lucide-react';

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [timeline, setTimeline] = useState<SavedTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/timelines/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/dashboard'); return; }
        setTimeline(data);
        setSaved(true); // fetched from DB — already saved
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSave = async () => {
    if (!timeline || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/timelines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: timeline.content,
          chat_history: timeline.chat_history,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!timeline) return;
    await navigator.clipboard.writeText(timeline.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!timeline || exporting) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timelineId: id, format: 'docx' }),
      });
      if (res.status === 403) {
        router.push('/pricing');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${timeline.couple_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-timeline.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleTimelineUpdate = useCallback((newContent: string, newHistory: ChatMessage[]) => {
    setTimeline(prev => prev ? { ...prev, content: newContent, chat_history: newHistory } : prev);
    setSaved(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (!timeline) return null;

  const weddingDate = timeline.wedding_date
    ? new Date(timeline.wedding_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  const hardStop = (timeline.metadata as unknown as Record<string, unknown>)?.receptionHardStop as string | undefined;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0">
            <p className="font-playfair font-semibold text-slate-900 truncate">{timeline.couple_name}</p>
            <p className="text-xs text-slate-500 truncate">
              {weddingDate}{hardStop ? ` · Hard stop ${hardStop}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="hidden sm:flex items-center gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="hidden sm:flex items-center gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-1.5 ${
                saved
                  ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 cursor-default'
                  : 'bg-[#C9A84C] hover:bg-[#b8973b] text-white'
              }`}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </Button>

            <Link href={`/generate/form?edit=${id}`}>
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:text-slate-900">
                Edit Details
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto px-4 py-10 print:py-4 print:px-0">
        {/* Print header */}
        <div className="hidden print:block mb-8">
          <p className="font-playfair text-2xl font-bold text-slate-900">{timeline.couple_name}</p>
          <p className="text-sm text-slate-500">{weddingDate}</p>
          {hardStop && <p className="text-sm font-semibold text-slate-700 mt-1">Venue hard stop: {hardStop}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 print:shadow-none print:border-none print:p-0">
          <DocumentView content={timeline.content} />
        </div>

        {/* Mobile action bar */}
        <div className="flex sm:hidden gap-2 mt-4 print:hidden">
          <Button
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 print:hidden">
          Generated by Sundial
        </p>
      </div>

      {/* Chat panel */}
      <ChatPanel
        timelineId={id}
        content={timeline.content}
        chatHistory={timeline.chat_history}
        onTimelineUpdate={handleTimelineUpdate}
      />
    </div>
  );
}
