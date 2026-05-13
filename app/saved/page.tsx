'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Trash2, Clock, PlusCircle } from 'lucide-react';

interface TimelineRow {
  id: string;
  couple_name: string;
  wedding_date: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export default function SavedPage() {
  const [timelines, setTimelines] = useState<TimelineRow[]>([]);
  const [filtered, setFiltered] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/timelines')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTimelines(data);
          setFiltered(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(timelines); return; }
    setFiltered(timelines.filter(t =>
      t.couple_name.toLowerCase().includes(q) ||
      (t.wedding_date && t.wedding_date.includes(q))
    ));
  }, [search, timelines]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/timelines/${id}`, { method: 'DELETE' });
      setTimelines(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-slate-900">Saved Timelines</h1>
            <p className="text-slate-500 mt-1">{timelines.length} timeline{timelines.length !== 1 ? 's' : ''} saved</p>
          </div>
          <Link href="/generate">
            <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              New Timeline
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by couple name or date…"
            className="pl-9 bg-white border-slate-200"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            {search ? (
              <>
                <p className="text-slate-600 font-medium">No results for &quot;{search}&quot;</p>
                <button onClick={() => setSearch('')} className="text-sm text-[#C9A84C] hover:underline mt-2">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 font-medium">No saved timelines yet</p>
                <p className="text-slate-400 text-sm mt-1">Generate your first timeline to get started</p>
                <Link href="/generate">
                  <Button className="mt-5 bg-[#C9A84C] hover:bg-[#b8973b] text-white">
                    Generate a Timeline
                  </Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-[#FAF7F2] transition-colors group">
                <Link href={`/timeline/${t.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 group-hover:text-[#C9A84C] transition-colors truncate">
                    {t.couple_name}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {t.wedding_date
                      ? new Date(t.wedding_date + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
                        })
                      : 'No date set'}
                    {' · '}
                    Saved {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </Link>

                <div className="flex items-center gap-2 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/timeline/${t.id}`}>
                    <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 text-xs">
                      Open
                    </Button>
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id, t.couple_name)}
                    disabled={deleting === t.id}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {deleting === t.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
