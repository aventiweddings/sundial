'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface AuditIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  time?: string;
  issue: string;
  recommendation: string;
}

interface AuditResult {
  summary: string;
  score: number;
  issues: AuditIssue[];
  positives: string[];
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    label: 'Critical',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    label: 'Warning',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  suggestion: {
    icon: Info,
    label: 'Suggestion',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Work';
  return 'Critical Issues';
}

function AuditResultsInner() {
  const searchParams = useSearchParams();

  let result: AuditResult | null = null;
  try {
    const raw = searchParams.get('result');
    if (raw) result = JSON.parse(raw);
  } catch { /* invalid */ }

  if (!result) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">No audit results found.</p>
        <Link href="/audit">
          <Button className="mt-4 bg-[#C9A84C] hover:bg-[#b8973b] text-white">Run a new audit</Button>
        </Link>
      </div>
    );
  }

  const criticals = result.issues.filter(i => i.severity === 'critical');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const suggestions = result.issues.filter(i => i.severity === 'suggestion');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Back */}
      <Link href="/audit" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Run another audit
      </Link>

      {/* Score header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="text-center shrink-0">
          <p className={`font-playfair text-5xl font-bold ${scoreColor(result.score)}`}>{result.score}</p>
          <p className={`text-sm font-semibold mt-1 ${scoreColor(result.score)}`}>{scoreLabel(result.score)}</p>
          <p className="text-xs text-slate-400">/100</p>
        </div>
        <div>
          <h1 className="font-playfair text-2xl font-bold text-slate-900 mb-2">Audit Complete</h1>
          <p className="text-slate-600 leading-relaxed">{result.summary}</p>
          <div className="flex gap-4 mt-4 text-sm">
            {criticals.length > 0 && (
              <span className="text-red-600 font-medium">{criticals.length} critical</span>
            )}
            {warnings.length > 0 && (
              <span className="text-amber-600 font-medium">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
            )}
            {suggestions.length > 0 && (
              <span className="text-blue-600 font-medium">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Positives */}
      {result.positives.length > 0 && (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="font-semibold text-green-800 text-sm">What&apos;s working well</p>
          </div>
          <ul className="space-y-1.5">
            {result.positives.map((p, i) => (
              <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                <span className="shrink-0 mt-1 text-green-500">·</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {result.issues.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-playfair text-xl font-semibold text-slate-900">Issues Found</h2>
          {[...criticals, ...warnings, ...suggestions].map((issue, i) => {
            const config = SEVERITY_CONFIG[issue.severity];
            const Icon = config.icon;
            return (
              <div key={i} className={`rounded-2xl border p-5 ${config.bg} ${config.border}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.iconColor}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${config.text}`}>
                        {config.label}
                      </span>
                      {issue.time && (
                        <span className="text-xs text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">
                          {issue.time}
                        </span>
                      )}
                    </div>
                    <p className={`font-medium text-sm ${config.text}`}>{issue.issue}</p>
                    <p className="text-sm text-slate-600 mt-1">{issue.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link href="/generate">
          <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-white">Generate a new timeline</Button>
        </Link>
        <Link href="/audit">
          <Button variant="outline" className="border-slate-200 text-slate-700">Audit another</Button>
        </Link>
      </div>
    </div>
  );
}

export default function AuditResultsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Nav />
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <AuditResultsInner />
      </Suspense>
    </div>
  );
}
