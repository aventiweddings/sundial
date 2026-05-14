import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserPlan, PLAN_LIMITS } from '@/lib/plans';
import Nav from '@/components/layout/Nav';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink } from 'lucide-react';

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
};

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan];

  const perks = [
    `${limits.timelinesPerMonth === Infinity ? 'Unlimited' : limits.timelinesPerMonth} timeline${limits.timelinesPerMonth === 1 ? '' : 's'}/month`,
    `${limits.auditsPerMonth === Infinity ? 'Unlimited' : limits.auditsPerMonth} audit${limits.auditsPerMonth === 1 ? '' : 's'}/month`,
    limits.canExport ? 'All exports (Word, PDF)' : null,
    limits.canExport ? '3 layout styles' : null,
    `${limits.savedTimelines === Infinity ? 'Unlimited' : limits.savedTimelines} saved timelines`,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-playfair text-3xl font-bold text-slate-900 mb-2">Billing</h1>
        <p className="text-slate-500 mb-10">Manage your plan and subscription.</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-sm text-slate-500 mb-1">Current plan</p>
              <p className="font-playfair text-2xl font-bold text-slate-900">{PLAN_NAMES[plan] || plan}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-[#C9A84C]/10 text-[#C9A84C]'
            }`}>
              {plan === 'free' ? 'Free' : 'Active'}
            </span>
          </div>

          <ul className="space-y-2 mb-6">
            {perks.map(perk => (
              <li key={perk} className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-[#C9A84C] shrink-0" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            {plan !== 'free' ? (
              <form action="/api/billing/portal" method="POST">
                <Button type="submit" className="bg-[#C9A84C] hover:bg-[#b8973b] text-white flex items-center gap-2">
                  Manage Subscription
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </form>
            ) : (
              <Link href="/pricing">
                <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-white">
                  Upgrade to Pro
                </Button>
              </Link>
            )}
          </div>
        </div>

        {plan === 'free' && (
          <p className="text-sm text-slate-500 text-center">
            Need unlimited timelines and exports?{' '}
            <Link href="/pricing" className="text-[#C9A84C] hover:underline font-medium">
              Upgrade to Pro →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
