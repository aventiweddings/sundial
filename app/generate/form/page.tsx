'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WeddingData, VendorCoverage, CoupleType, EnrichedData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import PasteInput from '@/components/generate/PasteInput';
import FileUpload from '@/components/generate/FileUpload';
import EnrichmentStatus from '@/components/generate/EnrichmentStatus';
import Nav from '@/components/layout/Nav';

const COUPLE_TYPES: CoupleType[] = ['Bride + Groom', 'Bride + Bride', 'Groom + Groom', 'Partner + Partner'];

const PERSON_LABELS: Record<CoupleType, [string, string]> = {
  'Bride + Groom': ["Bride's name", "Groom's name"],
  'Bride + Bride': ["Bride 1's name", "Bride 2's name"],
  'Groom + Groom': ["Groom 1's name", "Groom 2's name"],
  'Partner + Partner': ['Partner 1 name', 'Partner 2 name'],
};

const VENDOR_TYPES = [
  'Photography', 'Videography', 'DJ', 'Live Band',
  'Hair & Makeup', 'Florist', 'Coordinator / Planner',
  'Officiant', 'Photo Booth', 'Live Painter',
  'Transportation / Getaway Car', 'Caterer', 'Bar Service', 'Custom',
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#C9A84C]/15 p-6 space-y-5">
      <h3 className="font-playfair text-lg text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

function FieldRow({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-600 text-sm">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

function FormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get('method') || 'manual';

  const [coupleType, setCoupleType] = useState<CoupleType>('Bride + Groom');
  const [form, setForm] = useState<Partial<WeddingData>>({});
  const [vendorCoverages, setVendorCoverages] = useState<VendorCoverage[]>([]);
  const [enriched, setEnriched] = useState<EnrichedData>({});
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [showPaste, setShowPaste] = useState(method === 'paste');
  const [showUpload, setShowUpload] = useState(method === 'upload');
  const [extractBanner, setExtractBanner] = useState(false);
  const [includeVendorNotes, setIncludeVendorNotes] = useState(true);

  const [p1Label, p2Label] = PERSON_LABELS[coupleType];

  // Load defaults from settings
  useEffect(() => {
    const stored = localStorage.getItem('sundial_settings');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setForm(prev => ({
          ...prev,
          leadPhotographer: prev.leadPhotographer || s.defaultPhotographer || '',
          package: prev.package || s.defaultPackage || '',
        }));
      } catch { /* ignore */ }
    }
  }, []);

  const set = (key: keyof WeddingData, value: string | number | boolean | undefined) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const runEnrichment = useCallback(async () => {
    const { gettingReadyAddress, ceremonyAddress, receptionAddress, weddingDate, sameVenue } = form;
    if (!gettingReadyAddress || !ceremonyAddress || !weddingDate) return;
    setEnriching(true);
    setEnrichError(false);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gettingReadyAddress, ceremonyAddress,
          receptionAddress: receptionAddress || ceremonyAddress,
          weddingDate, sameVenue,
        }),
      });
      const data = await res.json();
      setEnriched(data);
    } catch {
      setEnrichError(true);
    } finally {
      setEnriching(false);
    }
  }, [form]);

  const handleExtracted = (extracted: Partial<WeddingData>) => {
    setForm(prev => ({ ...prev, ...extracted }));
    if (extracted.coupleType) setCoupleType(extracted.coupleType as CoupleType);
    setExtractBanner(true);
    setShowPaste(false);
    setShowUpload(false);
  };

  const addVendor = () => {
    setVendorCoverages(prev => [...prev, { vendorType: '', coverageStart: '', coverageEnd: '' }]);
  };

  const removeVendor = (i: number) => {
    setVendorCoverages(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateVendor = (i: number, field: keyof VendorCoverage, value: string | boolean) => {
    setVendorCoverages(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    const weddingData: WeddingData = {
      coupleType,
      person1Name: form.person1Name || '',
      person2Name: form.person2Name || '',
      weddingDate: form.weddingDate || '',
      ceremonyType: (form.ceremonyType as WeddingData['ceremonyType']) || 'Traditional',
      dressAttire: form.dressAttire,
      package: form.package,
      leadPhotographer: form.leadPhotographer,
      secondShooter: form.secondShooter,
      videographer: form.videographer,
      coordinator: form.coordinator,
      gettingReadyAddress: form.gettingReadyAddress || '',
      gettingReadyName: form.gettingReadyName,
      gettingReadyAvailableFrom: form.gettingReadyAvailableFrom,
      ceremonyAddress: form.ceremonyAddress || '',
      ceremonyName: form.ceremonyName,
      receptionAddress: form.receptionAddress || (form.sameVenue ? form.ceremonyAddress || '' : ''),
      receptionName: form.receptionName,
      receptionHardStop: form.receptionHardStop,
      sameVenue: form.sameVenue,
      guestCount: form.guestCount,
      weddingPartySize: form.weddingPartySize,
      vendorCoverages: vendorCoverages.filter(v => v.vendorType),
      additionalNotes: form.additionalNotes,
    };

    try {
      // Enrich if not done yet
      let finalEnriched = enriched;
      if (!enriched.sunsetTime && weddingData.gettingReadyAddress && weddingData.ceremonyAddress) {
        setGenerationStep('Looking up sunset time…');
        const res = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gettingReadyAddress: weddingData.gettingReadyAddress,
            ceremonyAddress: weddingData.ceremonyAddress,
            receptionAddress: weddingData.receptionAddress || weddingData.ceremonyAddress,
            weddingDate: weddingData.weddingDate,
            sameVenue: weddingData.sameVenue,
          }),
        });
        finalEnriched = await res.json();
        setEnriched(finalEnriched);
      }

      setGenerationStep('Calculating drive times…');
      await new Promise(r => setTimeout(r, 400));
      setGenerationStep('Building your timeline…');

      const genRes = await fetch('/api/generate-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingData, enrichedData: finalEnriched, includeVendorNotes }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        if (err.error === 'limit_reached') {
          router.push('/pricing?reason=limit');
          return;
        }
        throw new Error(err.error || 'Generation failed');
      }

      // Stream the response and save
      const reader = genRes.body!.getReader();
      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }

      // Save to Supabase
      const saveRes = await fetch('/api/timelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_name: `${weddingData.person1Name} & ${weddingData.person2Name}`,
          wedding_date: weddingData.weddingDate,
          content,
          metadata: { ...weddingData, enriched: finalEnriched },
        }),
      });
      const { id } = await saveRes.json();
      router.push(`/timeline/${id}`);
    } catch (err) {
      console.error(err);
      setGenerating(false);
      setGenerationStep('');
    }
  };

  if (generating) {
    const steps = [
      { label: 'Looking up sunset time…', key: 'Looking up sunset time…' },
      { label: 'Calculating drive times…', key: 'Calculating drive times…' },
      { label: 'Building your timeline…', key: 'Building your timeline…' },
    ];
    const currentIdx = steps.findIndex(s => s.key === generationStep);
    const progress = currentIdx < 0 ? 5 : Math.min(95, ((currentIdx + 1) / steps.length) * 85 + 5);

    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-8 px-6">
        <div className="w-full max-w-sm">
          {/* Progress bar */}
          <div className="w-full bg-slate-200/60 rounded-full h-2.5 mb-6 overflow-hidden">
            <div
              className="bg-[#C9A84C] h-2.5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const isActive = step.key === generationStep;
              const isDone = currentIdx > i;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  {isDone ? (
                    <div className="w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-[#C9A84C] animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                  )}
                  <span className={`text-sm ${isActive ? 'text-slate-800 font-medium' : isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2">This usually takes 15–30 seconds</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 w-full">
      {/* Extract banner */}
      {extractBanner && (
        <div className="mb-6 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-xl text-sm text-slate-700">
          <strong>Details extracted —</strong> please review and fill in anything missing before generating.
          <button onClick={() => setExtractBanner(false)} className="ml-3 text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Paste / Upload inputs */}
      {showPaste && <PasteInput onExtracted={handleExtracted} onClose={() => setShowPaste(false)} />}
      {showUpload && <FileUpload onExtracted={handleExtracted} onClose={() => setShowUpload(false)} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Couple ── */}
        <SectionCard title="The Couple">
          <FieldRow label="Couple type">
            <div className="flex flex-wrap gap-2">
              {COUPLE_TYPES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setCoupleType(t)}
                  className="px-3.5 py-2 rounded-lg text-sm font-medium transition-all border"
                  style={{
                    background: coupleType === t ? 'rgba(201,168,76,0.12)' : 'white',
                    borderColor: coupleType === t ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.20)',
                    color: coupleType === t ? '#C9A84C' : '#64748b',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label={p1Label} required>
              <Input placeholder="First and last name" value={form.person1Name || ''} onChange={e => set('person1Name', e.target.value)} required />
            </FieldRow>
            <FieldRow label={p2Label} required>
              <Input placeholder="First and last name" value={form.person2Name || ''} onChange={e => set('person2Name', e.target.value)} required />
            </FieldRow>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldRow label="Wedding date" required>
              <Input type="date" value={form.weddingDate || ''} onChange={e => set('weddingDate', e.target.value)} required />
            </FieldRow>
            <FieldRow label="Ceremony type" required>
              <Select value={form.ceremonyType || 'Traditional'} onValueChange={v => { if (v) set('ceremonyType', v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Traditional">Traditional (~30 min)</SelectItem>
                  <SelectItem value="Catholic">Catholic (~90 min)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Dress attire">
              <Input placeholder="e.g. Black Tie" value={form.dressAttire || ''} onChange={e => set('dressAttire', e.target.value)} />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ── The Team ── */}
        <SectionCard title="The Team">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Lead photographer">
              <Input placeholder="Name(s)" value={form.leadPhotographer || ''} onChange={e => set('leadPhotographer', e.target.value)} />
            </FieldRow>
            <FieldRow label="Second shooter">
              <Input placeholder="Optional" value={form.secondShooter || ''} onChange={e => set('secondShooter', e.target.value)} />
            </FieldRow>
            <FieldRow label="Videographer">
              <Input placeholder="Optional" value={form.videographer || ''} onChange={e => set('videographer', e.target.value)} />
            </FieldRow>
            <FieldRow label="Day-of coordinator">
              <Input placeholder="Optional" value={form.coordinator || ''} onChange={e => set('coordinator', e.target.value)} />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ── Locations ── */}
        <SectionCard title="Locations">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Getting Ready</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldRow label="Venue / location name">
                  <Input placeholder="e.g. The Ritz-Carlton, Suite 412" value={form.gettingReadyName || ''} onChange={e => set('gettingReadyName', e.target.value)} />
                </FieldRow>
                <FieldRow label="Address" required>
                  <Input placeholder="Full street address" value={form.gettingReadyAddress || ''} onChange={e => set('gettingReadyAddress', e.target.value)} required
                    onBlur={runEnrichment} />
                </FieldRow>
                <FieldRow label="Available from" hint="Earliest vendors can arrive">
                  <Input type="time" value={form.gettingReadyAvailableFrom || ''} onChange={e => set('gettingReadyAvailableFrom', e.target.value)} />
                </FieldRow>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Ceremony</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldRow label="Venue / location name">
                  <Input placeholder="e.g. St. Patrick's Cathedral" value={form.ceremonyName || ''} onChange={e => set('ceremonyName', e.target.value)} />
                </FieldRow>
                <FieldRow label="Address" required>
                  <Input placeholder="Full street address" value={form.ceremonyAddress || ''} onChange={e => set('ceremonyAddress', e.target.value)} required
                    onBlur={runEnrichment} />
                </FieldRow>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reception</p>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={form.sameVenue || false}
                    onChange={e => set('sameVenue', e.target.checked)}
                    className="accent-[#C9A84C] w-3.5 h-3.5" />
                  Same venue as ceremony
                </label>
              </div>
              {!form.sameVenue && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldRow label="Venue / location name">
                    <Input placeholder="e.g. The Grand Ballroom" value={form.receptionName || ''} onChange={e => set('receptionName', e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Address" required>
                    <Input placeholder="Full street address" value={form.receptionAddress || ''} onChange={e => set('receptionAddress', e.target.value)} required={!form.sameVenue}
                      onBlur={runEnrichment} />
                  </FieldRow>
                </div>
              )}
              <div className="mt-3 max-w-xs">
                <FieldRow label="Hard stop / must end by" hint="Venue close or contractual end time — this is a hard constraint">
                  <Input type="time" value={form.receptionHardStop || ''} onChange={e => set('receptionHardStop', e.target.value)} />
                </FieldRow>
              </div>
            </div>
          </div>

          {/* Enrichment status */}
          {(enriching || enriched.sunsetTime || enrichError) && (
            <EnrichmentStatus enriching={enriching} enriched={enriched} error={enrichError} />
          )}
        </SectionCard>

        {/* ── Guest & Party ── */}
        <SectionCard title="Guest & Party">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Guest count">
              <Input type="number" placeholder="e.g. 150" min={0} value={form.guestCount || ''} onChange={e => set('guestCount', parseInt(e.target.value) || undefined)} />
            </FieldRow>
            <FieldRow label="Wedding party size">
              <Input placeholder="e.g. 5 per side, or 8 total" value={form.weddingPartySize || ''} onChange={e => set('weddingPartySize', e.target.value)} />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ── Vendor Coverage ── */}
        <SectionCard title="Vendor Coverage Windows">
          <p className="text-xs text-slate-400 -mt-2">
            Add each vendor&apos;s contracted start and end times. Claude treats these as hard constraints and flags any scheduling conflicts.
          </p>

          <div className="space-y-3">
            {vendorCoverages.map((vc, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_100px_100px_auto] gap-3 items-end">
                  <FieldRow label="Type">
                    <Select value={vc.vendorType} onValueChange={v => { if (v) updateVendor(i, 'vendorType', v); }}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {VENDOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Company / name">
                    <Input placeholder="Optional" value={vc.companyName || ''} onChange={e => updateVendor(i, 'companyName', e.target.value)} className="text-sm" />
                  </FieldRow>
                  <FieldRow label="Starts">
                    <Input type="time" value={vc.coverageStart} onChange={e => updateVendor(i, 'coverageStart', e.target.value)} className="text-sm" />
                  </FieldRow>
                  <FieldRow label="Ends">
                    <Input type="time" value={vc.coverageEnd} onChange={e => updateVendor(i, 'coverageEnd', e.target.value)} className="text-sm" />
                  </FieldRow>
                  <button type="button" onClick={() => removeVendor(i)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors self-end">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <Input placeholder="Notes (e.g. 1 hr overtime available, must finish setup 30 min before ceremony)"
                    value={vc.notes || ''} onChange={e => updateVendor(i, 'notes', e.target.value)} className="text-sm flex-1" />
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap cursor-pointer shrink-0">
                    <input type="checkbox" checked={vc.isPrimary || false}
                      onChange={e => updateVendor(i, 'isPrimary', e.target.checked)}
                      className="accent-[#C9A84C] w-3.5 h-3.5" />
                    I am this vendor
                  </label>
                </div>
              </div>
            ))}
            <button type="button" onClick={addVendor}
              className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-xl border border-dashed border-[#C9A84C]/35 text-[#C9A84C] hover:bg-[#C9A84C]/5 transition-colors w-full justify-center">
              <Plus className="w-4 h-4" />
              Add vendor coverage window
            </button>
          </div>
        </SectionCard>

        {/* ── Additional Notes ── */}
        <SectionCard title="Additional Notes">
          <FieldRow label="Notes" hint="Preserved verbatim — family dynamics, mobility needs, must-have moments, special requests.">
            <Textarea placeholder="Any personal, logistical, or sentimental notes…" rows={5}
              value={form.additionalNotes || ''} onChange={e => set('additionalNotes', e.target.value)} />
          </FieldRow>
        </SectionCard>

        {/* ── Timeline Options ── */}
        <div className="bg-white rounded-2xl border border-[#C9A84C]/15 p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVendorNotes}
              onChange={e => setIncludeVendorNotes(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#C9A84C] focus:ring-[#C9A84C]/30"
            />
            <div>
              <span className="text-sm font-medium text-slate-800">Include vendor notes</span>
              <p className="text-xs text-slate-500 mt-0.5">
                {includeVendorNotes
                  ? 'Photographer\'s notes and vendor-specific timing tips will be included throughout the timeline.'
                  : 'Notes will be written as general tips from Sundial Timelines, framed for the couple — no vendor-specific language.'}
              </p>
            </div>
          </label>
        </div>

        <Button type="submit" disabled={generating} className="w-full h-14 text-base font-semibold bg-[#C9A84C] hover:bg-[#b8973b] text-white rounded-xl shadow-md">
          {generating ? (
            <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> {generationStep || 'Generating…'}</span>
          ) : 'Generate Timeline →'}
        </Button>
      </form>
    </div>
  );
}

export default function GenerateFormPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <Nav />
      <Suspense>
        <FormContent />
      </Suspense>
    </div>
  );
}
