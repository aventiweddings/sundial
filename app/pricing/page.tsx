'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/layout/Footer';
import { Loader2 } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    cta: 'Get started free',
    href: '/sign-up',
    trial: false,
    popular: false,
    highlights: ['3 timelines/month', '1 audit/month', 'Document view', 'No export'],
  },
  {
    id: 'solo',
    name: 'Solo',
    monthly: 19,
    annual: 159,
    cta: 'Start 7-day free trial',
    href: '/sign-up',
    trial: true,
    popular: false,
    highlights: ['20 timelines/month', 'Unlimited audits', 'All exports (Word, PDF)', 'Sundial Edit chatbot'],
  },
  {
    id: 'studio',
    name: 'Studio',
    monthly: 49,
    annual: 399,
    cta: 'Start 7-day free trial',
    href: '/sign-up',
    trial: true,
    popular: true,
    highlights: ['Unlimited timelines', 'Unlimited audits', '3 team seats', 'Custom branding on exports'],
  },
  {
    id: 'agency',
    name: 'Agency',
    monthly: 99,
    annual: 799,
    cta: 'Get started',
    href: '/sign-up',
    trial: false,
    popular: false,
    highlights: ['Unlimited everything', '10 team seats', 'White-label exports', 'Priority support'],
  },
];

const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes — cancel any time from your billing page. You keep access through the end of your billing period.' },
  { q: 'Do I need a credit card for the free plan?', a: 'No. Sign up with just your email — no card required until you upgrade.' },
  { q: 'How does the free trial work?', a: 'Solo and Studio plans include a 7-day free trial. You can cancel before the trial ends and you won\'t be charged.' },
  { q: 'Can I change plans?', a: 'Yes — upgrade or downgrade anytime from your settings page. Changes take effect immediately.' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (planId: string) => {
    if (planId === 'free') { router.push('/sign-up'); return; }
    setCheckingOut(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: annual ? 'annual' : 'monthly' }),
      });
      if (res.status === 401) { router.push('/sign-up'); return; }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Nav */}
      <header className="border-b border-[#C9A84C]/15 bg-[#FAF7F2]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative">
              <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
            </div>
            <span className="font-playfair text-xl text-slate-800">Sundial</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/sign-in" className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">Sign in</Link>
            <Button asChild size="sm" className="bg-[#C9A84C] hover:bg-[#b8973b] text-white ml-1">
              <Link href="/sign-up">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h1 className="font-playfair text-4xl sm:text-5xl text-slate-800 mb-4">Simple, honest pricing</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Start free. Upgrade when you&apos;re ready.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!annual ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(a => !a)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-[#C9A84C]' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
              Annual
              <Badge className="ml-2 bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20 text-xs">Save ~30%</Badge>
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl p-6 border transition-shadow ${
                plan.popular
                  ? 'border-[#C9A84C]/50 shadow-lg bg-white'
                  : 'border-[#C9A84C]/15 bg-white/70'
              }`}
            >
              {plan.popular && (
                <Badge className="self-start mb-3 bg-[#C9A84C] text-white border-0 text-xs">Most Popular</Badge>
              )}
              <h2 className="font-playfair text-xl text-slate-800 mb-1">{plan.name}</h2>
              <div className="flex items-end gap-1 mb-4">
                {plan.monthly === 0 ? (
                  <span className="text-3xl font-bold text-slate-800">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-slate-800">
                      ${annual ? Math.round(plan.annual / 12) : plan.monthly}
                    </span>
                    <span className="text-slate-400 text-sm mb-1">/mo</span>
                  </>
                )}
              </div>
              {annual && plan.annual > 0 && (
                <p className="text-xs text-slate-400 -mt-3 mb-4">${plan.annual}/yr billed annually</p>
              )}

              <ul className="space-y-2 flex-1 mb-6">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-[#C9A84C] mt-0.5">✓</span>
                    {h}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(plan.id)}
                disabled={checkingOut === plan.id}
                className={plan.popular
                  ? 'bg-[#C9A84C] hover:bg-[#b8973b] text-white w-full'
                  : 'w-full'
                }
                variant={plan.popular ? 'default' : 'outline'}
              >
                {checkingOut === plan.id
                  ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Redirecting…</>
                  : plan.cta
                }
              </Button>
              {plan.trial && (
                <p className="text-xs text-slate-400 text-center mt-2">No credit card required</p>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="font-playfair text-2xl text-slate-800 text-center mb-8">Common questions</h2>
          <div className="space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-slate-200 pb-5">
                <h3 className="font-medium text-slate-800 mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
