'use client';

import { useMemo } from 'react';

interface Props {
  content: string;
}

export default function DocumentView({ content }: Props) {
  const lines = useMemo(() => content.split('\n'), [content]);

  return (
    <div className="font-inter text-slate-800 max-w-3xl mx-auto space-y-1 print:max-w-full">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        // H1 — # Title
        if (/^# /.test(line)) {
          return (
            <h1 key={i} className="font-playfair text-3xl font-bold text-slate-900 mt-6 mb-2">
              {line.slice(2)}
            </h1>
          );
        }

        // H2 — ## Section header (phase headers like "GETTING READY")
        if (/^## /.test(line)) {
          return (
            <h2 key={i} className="font-playfair text-xl font-bold text-[#C9A84C] uppercase tracking-wide mt-8 mb-3 pb-1 border-b border-[#C9A84C]/30">
              {line.slice(3)}
            </h2>
          );
        }

        // H3 — ### Sub-section
        if (/^### /.test(line)) {
          return (
            <h3 key={i} className="font-playfair text-lg font-semibold text-slate-700 mt-5 mb-2">
              {line.slice(4)}
            </h3>
          );
        }

        // Bold timestamp lines — **10:00 AM** – Description
        if (/^\*\*\d/.test(line) || /^- \*\*\d/.test(line)) {
          const stripped = line.replace(/^- /, '');
          const formatted = stripped.replace(
            /\*\*([^*]+)\*\*/g,
            '<strong class="font-bold text-slate-900">$1</strong>'
          ).replace(
            /\*([^*]+)\*/g,
            '<em class="italic text-slate-500">$1</em>'
          );
          return (
            <div
              key={i}
              className="py-1.5 pl-0 text-[15px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }

        // Bulleted list items
        if (/^- /.test(line)) {
          const inner = line.slice(2).replace(
            /\*\*([^*]+)\*\*/g,
            '<strong class="font-semibold text-slate-800">$1</strong>'
          ).replace(
            /\*([^*]+)\*/g,
            '<em class="italic text-slate-500">$1</em>'
          );
          return (
            <div key={i} className="flex gap-2 pl-4 py-0.5 text-[14px] leading-relaxed">
              <span className="text-[#C9A84C] mt-1 shrink-0">·</span>
              <span dangerouslySetInnerHTML={{ __html: inner }} />
            </div>
          );
        }

        // Indented list items (two-level)
        if (/^  - /.test(line)) {
          const inner = line.slice(4).replace(
            /\*([^*]+)\*/g,
            '<em class="italic text-slate-500">$1</em>'
          );
          return (
            <div key={i} className="flex gap-2 pl-8 py-0.5 text-[13px] leading-relaxed text-slate-600">
              <span className="text-slate-400 mt-1 shrink-0">–</span>
              <span dangerouslySetInnerHTML={{ __html: inner }} />
            </div>
          );
        }

        // Horizontal rule
        if (/^---/.test(line)) {
          return <hr key={i} className="border-[#C9A84C]/20 my-4" />;
        }

        // Default paragraph with inline bold/italic
        const formatted = line.replace(
          /\*\*([^*]+)\*\*/g,
          '<strong class="font-semibold text-slate-900">$1</strong>'
        ).replace(
          /\*([^*]+)\*/g,
          '<em class="italic text-slate-500">$1</em>'
        );

        return (
          <p
            key={i}
            className="text-[14px] leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      })}
    </div>
  );
}
