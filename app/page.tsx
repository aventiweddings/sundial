import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Footer from '@/components/layout/Footer';
import VeilBackground from '@/components/landing/VeilBackground';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Nav */}
      <header className="border-b border-[#C9A84C]/15 bg-[#FAF7F2]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative">
              <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
            </div>
            <span className="font-playfair text-xl text-slate-800">Sundial</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/pricing" className="hidden sm:inline-flex px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              Pricing
            </Link>
            <Link href="/sign-in" className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              Sign in
            </Link>
            <Button asChild size="sm" className="bg-[#C9A84C] hover:bg-[#b8973b] text-white ml-1">
              <Link href="/sign-up">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
        <VeilBackground />
        <div className="relative z-10 flex flex-col items-center w-full">
        <div className="w-48 h-48 relative mx-auto mb-8">
          <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
        </div>

        <h1 className="font-playfair text-5xl sm:text-7xl text-slate-800 leading-tight mb-6 max-w-3xl">
          Crafted by wedding professionals,<br />built for every timeline under the sun.
        </h1>

        <p className="text-sm text-slate-500 max-w-lg leading-relaxed mb-10">
          For couples who want every moment to flow.<br />
          For vendors who can&apos;t afford a single conflict.<br />
          <br />
          Every timeline starts with the light. Golden hour lands exactly where it should, every vendor&apos;s window holds the day together, and your finished timeline is ready before the call ends.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button asChild size="lg" className="bg-[#C9A84C] hover:bg-[#b8973b] text-white px-8 h-12 text-base">
            <Link href="/sign-up">Start for free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 h-12 text-base border-slate-300">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
        </div>{/* end z-10 wrapper */}

        {/* How it works */}
        <div className="mt-24 w-full max-w-4xl">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="flex-1 h-px bg-[#C9A84C]/20 max-w-24" />
            <span className="text-xs font-semibold tracking-widest text-[#C9A84C] uppercase">How it works</span>
            <div className="flex-1 h-px bg-[#C9A84C]/20 max-w-24" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            {[
              { step: '01', title: 'Enter wedding details', body: 'Couple type, locations, vendor coverage windows, and special notes. Manual entry, paste from email, or upload a doc.' },
              { step: '02', title: 'We look up the sun', body: 'Sunset time and drive times between venues are calculated automatically before Claude builds the day.' },
              { step: '03', title: 'Refine & export', body: 'Edit through conversation, view as a planner grid, audit existing timelines, and export to Word, PDF, or print.' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <span className="text-3xl font-playfair text-[#C9A84C]/40">{item.step}</span>
                <h3 className="font-playfair text-lg text-slate-800">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 w-full max-w-3xl">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {[
              'Golden hour auto-scheduled', 'Vendor coverage enforced',
              'Timeline audit mode', 'Export to Word & PDF',
              'Edit by conversation',
            ].map((f) => (
              <span key={f} className="text-xs flex items-center gap-2 text-slate-500">
                <span className="text-[#C9A84C]">✦</span>{f}
              </span>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
