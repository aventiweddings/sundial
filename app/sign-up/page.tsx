'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="font-playfair text-3xl text-slate-800 mb-3">Check your email</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>.<br />
            Click it to activate your account and get started.
          </p>
          <p className="mt-6 text-sm text-slate-400">
            Already confirmed?{' '}
            <Link href="/sign-in" className="text-[#C9A84C] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/Logo.png" alt="Sundial" width={48} height={48} className="object-contain" />
          </Link>
        </div>

        <h1 className="font-playfair text-3xl text-center text-slate-800 mb-1">Create your account</h1>
        <p className="text-center text-slate-500 text-sm mb-8">Free to start — no credit card required</p>

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
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-[#C9A84C] hover:bg-[#b8973b] text-white">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center leading-relaxed">
          By signing up you agree to our terms.
        </p>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-[#C9A84C] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
