'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WeddingData } from '@/lib/types';
import { Loader2, X } from 'lucide-react';

interface Props {
  onExtracted: (data: Partial<WeddingData>) => void;
  onClose: () => void;
}

export default function PasteInput({ onExtracted, onClose }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/extract-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onExtracted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-2xl border border-[#C9A84C]/20 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-playfair text-lg text-slate-800">Paste your text</h3>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Paste an email thread, planning call notes, or filled questionnaire. We&apos;ll extract everything we can find.
      </p>
      <Textarea
        placeholder="Paste any text here…"
        rows={8}
        value={text}
        onChange={e => setText(e.target.value)}
        className="font-mono text-xs"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleExtract} disabled={loading || !text.trim()} className="bg-[#C9A84C] hover:bg-[#b8973b] text-white">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting…</> : 'Extract details →'}
      </Button>
    </div>
  );
}
