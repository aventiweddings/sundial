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
  X,
  Lock,
} from 'lucide-react';

type ExportLayout = 'simple' | 'elegant' | 'grid';

const LAYOUT_OPTIONS: { id: ExportLayout; name: string; desc: string }[] = [
  { id: 'simple', name: 'Simple', desc: 'Clean and minimal' },
  { id: 'elegant', name: 'Elegant', desc: 'Serif, ornamental' },
  { id: 'grid', name: 'Grid', desc: 'Structured time blocks' },
];

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [timeline, setTimeline] = useState<SavedTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<ExportLayout>('simple');
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetch(`/api/timelines/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/dashboard'); return; }
        setTimeline(data);
        setSaved(true);
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Load persisted layout preference
  useEffect(() => {
    const saved = localStorage.getItem('sundial_export_layout');
    if (saved && ['simple', 'elegant', 'grid'].includes(saved)) {
      setSelectedLayout(saved as ExportLayout);
    }
  }, []);

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

  const handleExport = async (layout: ExportLayout) => {
    if (!timeline || exporting) return;
    setExporting(true);
    setExportError(null);
    setShowExportPicker(false);

    // Persist preference
    localStorage.setItem('sundial_export_layout', layout);
    setSelectedLayout(layout);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timelineId: id, format: 'docx', layout }),
      });
      if (res.status === 403) {
        setShowPaywall(true);
        return;
      }
      if (!res.ok) {
        setExportError('Export failed. Please try again.');
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
      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-[#C9A84C]" />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-slate-900 mb-2">Export is a Pro feature</h3>
              <p className="text-sm text-slate-500 mb-6">
                Upgrade to Pro to export timelines in Word format with 3 layout styles.
              </p>
              <Link href="/pricing">
                <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-white w-full mb-3">
                  Upgrade to Pro
                </Button>
              </Link>
              <button
                onClick={() => setShowPaywall(false)}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 print:hidden">
        {exportError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center justify-between">
            <span>{exportError}</span>
            <button onClick={() => setExportError(null)} className="text-amber-400 hover:text-amber-600 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
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

            {/* Export with layout picker */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportPicker(prev => !prev)}
                disabled={exporting}
                className="hidden sm:flex items-center gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Export
              </Button>

              {showExportPicker && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Layout Style</p>
                  <div className="space-y-1">
                    {LAYOUT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleExport(opt.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all ${
                          selectedLayout === opt.id
                            ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">{opt.name}</p>
                          <p className="text-xs text-slate-400">{opt.desc}</p>
                        </div>
                        {selectedLayout === opt.id && (
                          <Check className="w-4 h-4 text-[#C9A84C] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
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
            onClick={() => setShowExportPicker(true)}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export
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
          Generated by Sundial Timelines
        </p>
      </div>

      {/* Export picker overlay for mobile */}
      {showExportPicker && (
        <div
          className="fixed inset-0 z-30 sm:hidden"
          onClick={() => setShowExportPicker(false)}
        >
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl border-t border-slate-200 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-slate-900">Choose layout</p>
              <button onClick={() => setShowExportPicker(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {LAYOUT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleExport(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${
                    selectedLayout === opt.id
                      ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30'
                      : 'bg-slate-50 border border-transparent'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{opt.name}</p>
                    <p className="text-xs text-slate-400">{opt.desc}</p>
                  </div>
                  {selectedLayout === opt.id && <Check className="w-4 h-4 text-[#C9A84C]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
