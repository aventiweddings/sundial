'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full bg-[#C9A84C] hover:bg-[#b8973b] text-white">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/Logo.png" alt="Sundial" width={48} height={48} className="object-contain" />
          </Link>
        </div>

        <h1 className="font-playfair text-3xl text-center text-slate-800 mb-1">Welcome back</h1>
        <p className="text-center text-slate-500 text-sm mb-8">Sign in to your Sundial account</p>

        <Suspense fallback={<div className="h-48 animate-pulse bg-slate-100 rounded-xl" />}>
          <SignInForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-[#C9A84C] hover:underline font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
