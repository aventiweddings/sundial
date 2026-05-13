'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/layout/Nav';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Type, Upload } from 'lucide-react';

type InputTab = 'paste' | 'upload';

export default function AuditPage() {
  const router = useRouter();
  const [tab, setTab] = useState<InputTab>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    let content = text.trim();

    if (tab === 'upload' && file) {
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/parse-document', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        content = data.text;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Parse failed');
        setLoading(false);
        return;
      }
    }

    if (!content) { setError('Please provide a timeline to audit.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/audit-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const params = new URLSearchParams({ result: JSON.stringify(data) });
      router.push(`/audit/results?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="font-playfair text-3xl font-bold text-slate-900">Timeline Audit</h1>
          <p className="text-slate-500 mt-2">
            Paste or upload an existing wedding timeline and Sundial will identify issues,
            flag tight transitions, and suggest improvements.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit gap-1">
          {(['paste', 'upload'] as InputTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-[#C9A84C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t === 'paste' ? <Type className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              {t === 'paste' ? 'Paste text' : 'Upload file'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {tab === 'paste' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Paste your timeline
              </label>
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="10:00 AM – Bride getting ready at The Langham&#10;12:00 PM – First look at hotel garden&#10;..."
                className="min-h-[280px] text-sm font-mono text-slate-700 border-slate-200 focus:border-[#C9A84C] resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">{text.length} characters</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload a document
              </label>
              <div
                onClick={() => document.getElementById('audit-file')?.click()}
                className="border-2 border-dashed border-[#C9A84C]/30 rounded-xl p-10 text-center cursor-pointer hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/3 transition-all"
              >
                <FileText className="w-10 h-10 text-[#C9A84C]/40 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">
                  {file ? file.name : 'Click to browse or drag & drop'}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), or .txt</p>
              </div>
              <input
                id="audit-file"
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || (tab === 'paste' ? !text.trim() : !file)}
            className="mt-5 bg-[#C9A84C] hover:bg-[#b8973b] text-white w-full"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Auditing…</>
            ) : (
              'Run Audit →'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
