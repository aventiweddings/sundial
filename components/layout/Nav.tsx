'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface NavProps {
  user?: { email?: string } | null;
}

export default function Nav({ user }: NavProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b border-[#C9A84C]/15 bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
          <div className="w-8 h-8 relative">
            <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
          </div>
          <span className="font-playfair text-xl text-slate-800 tracking-tight">Sundial Timelines</span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link href="/generate" className="hidden sm:inline-flex px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Generate
              </Link>
              <Link href="/audit" className="hidden sm:inline-flex px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Audit
              </Link>
              <Link href="/saved" className="hidden sm:inline-flex px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Saved
              </Link>
              <Link href="/settings" className="hidden sm:inline-flex px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="ml-2 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/pricing" className="hidden sm:inline-flex px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Pricing
              </Link>
              <Link href="/sign-in" className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                Sign in
              </Link>
              <Button asChild size="sm" className="bg-[#C9A84C] hover:bg-[#b8973b] text-white ml-1">
                <Link href="/sign-up">Start free</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
