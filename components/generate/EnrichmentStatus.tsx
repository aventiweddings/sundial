import { EnrichedData } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface Props {
  enriching: boolean;
  enriched: EnrichedData;
  error: boolean;
}

export default function EnrichmentStatus({ enriching, enriched, error }: Props) {
  if (enriching) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
        <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" />
        Looking up sunset time and drive times…
      </div>
    );
  }

  if (error && !enriched.sunsetTime) {
    return (
      <div className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
        Could not look up enrichment data — we&apos;ll note &ldquo;TBD&rdquo; in the timeline. You can verify manually.
      </div>
    );
  }

  const items = [];
  if (enriched.sunsetTime) items.push(`📍 Sunset at ${enriched.sunsetTime}`);
  if (enriched.travelGettingReadyToCeremony) items.push(`🚗 ${enriched.travelGettingReadyToCeremony} to ceremony`);
  if (enriched.travelCeremonyToReception) items.push(`🚗 ${enriched.travelCeremonyToReception} to reception`);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 text-sm text-slate-600 bg-[#C9A84C]/6 border border-[#C9A84C]/20 rounded-xl px-4 py-3">
      {items.map(item => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
