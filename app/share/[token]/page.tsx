'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import DocumentView from '@/components/timeline/DocumentView';
import { Loader2 } from 'lucide-react';

interface SharedTimeline {
  couple_name: string;
  wedding_date: string | null;
  content: string;
  metadata: Record<string, unknown>;
}

export default function SharedTimelinePage() {
  const { token } = useParams<{ token: string }>();
  const [timeline, setTimeline] = useState<SharedTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setTimeline(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center mb-4">
          <span className="text-2xl">☀️</span>
        </div>
        <h1 className="font-playfair text-2xl font-bold text-slate-900 mb-2">Link not found</h1>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
          This share link may have expired or been deactivated.
        </p>
        <Link
          href="/"
          className="text-sm text-[#C9A84C] hover:text-[#b8973b] font-medium"
        >
          Go to Sundial Timelines →
        </Link>
      </div>
    );
  }

  const weddingDate = timeline.wedding_date
    ? new Date(timeline.wedding_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const hardStop = (timeline.metadata as Record<string, unknown>)?.receptionHardStop as string | undefined;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Minimal branded header */}
      <header className="border-b border-[#C9A84C]/15 bg-white/80 backdrop-blur sticky top-0 z-30 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
            </div>
            <span className="font-playfair text-sm text-slate-600">Sundial Timelines</span>
          </Link>
          <Link
            href="/sign-up"
            className="text-xs text-[#C9A84C] hover:text-[#b8973b] font-medium"
          >
            Create your own →
          </Link>
        </div>
      </header>

      {/* Timeline content */}
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full print:py-4 print:px-0">
        {/* Print header */}
        <div className="hidden print:block mb-8">
          <p className="font-playfair text-2xl font-bold text-slate-900">{timeline.couple_name}</p>
          <p className="text-sm text-slate-500">{weddingDate}</p>
          {hardStop && <p className="text-sm font-semibold text-slate-700 mt-1">Venue hard stop: {hardStop}</p>}
        </div>

        {/* Title card */}
        <div className="text-center mb-8 print:hidden">
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-slate-900 mb-1">
            {timeline.couple_name}
          </h1>
          {weddingDate && (
            <p className="text-slate-500 text-sm">{weddingDate}</p>
          )}
          {hardStop && (
            <p className="text-xs text-slate-400 mt-1">Venue hard stop: {hardStop}</p>
          )}
        </div>

        {/* Document */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 print:shadow-none print:border-none print:p-0">
          <DocumentView content={timeline.content} />
        </div>

        {/* Branding footer */}
        <div className="mt-8 text-center print:mt-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-5 h-5 relative opacity-40 group-hover:opacity-70 transition-opacity">
              <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-500 transition-colors">
              Powered by Sundial Timelines
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
