import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Nav from '@/components/layout/Nav';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-playfair text-3xl font-bold text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-500 mb-10">Manage your account preferences.</p>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-playfair text-lg font-semibold text-slate-900 mb-5">Account</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-slate-600">Email</Label>
              <Input
                value={user.email ?? ''}
                readOnly
                className="mt-1.5 bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed at this time.</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-playfair text-lg font-semibold text-slate-900 mb-2">Session</h2>
          <p className="text-sm text-slate-500 mb-5">Sign out of your Sundial account.</p>
          <form action="/sign-out" method="POST">
            <Button type="submit" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Sign out
            </Button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-playfair text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
          <p className="text-sm text-slate-500 mb-5">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            disabled
          >
            Delete Account
          </Button>
          <p className="text-xs text-slate-400 mt-2">Contact support to request account deletion.</p>
        </div>
      </div>
    </div>
  );
}
