'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { WeddingData } from '@/lib/types';
import { Loader2, X, Upload } from 'lucide-react';

interface Props {
  onExtracted: (data: Partial<WeddingData>) => void;
  onClose: () => void;
}

export default function FileUpload({ onExtracted, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch('/api/parse-document', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!preview) return;
    setExtracting(true);
    setError('');
    try {
      const res = await fetch('/api/extract-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: preview }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onExtracted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-2xl border border-[#C9A84C]/20 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-playfair text-lg text-slate-800">Upload a document</h3>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className="border-2 border-dashed border-[#C9A84C]/30 rounded-xl p-8 text-center cursor-pointer hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/3 transition-all"
      >
        <Upload className="w-8 h-8 text-[#C9A84C]/50 mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">{file ? file.name : 'Drop your file here, or click to browse'}</p>
        <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), or plain text (.txt)</p>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" />Parsing document…
        </div>
      )}

      {preview && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Preview (verify parsing looks correct):</p>
          <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {preview.slice(0, 2000)}{preview.length > 2000 ? '…' : ''}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <Button onClick={handleExtract} disabled={extracting} className="bg-[#C9A84C] hover:bg-[#b8973b] text-white">
          {extracting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting…</> : 'Extract details →'}
        </Button>
      )}
    </div>
  );
}
