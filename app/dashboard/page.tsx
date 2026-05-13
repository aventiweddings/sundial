import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { checkUsage, PLAN_LIMITS, getUserPlan } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import Nav from '@/components/layout/Nav';
import { PlusCircle, Clock, FileText, Zap } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [plan, usage, { data: recentTimelines }] = await Promise.all([
    getUserPlan(user.id),
    checkUsage(user.id, 'timeline'),
    supabase
      .from('saved_timelines')
      .select('id, couple_name, wedding_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const limits = PLAN_LIMITS[plan];
  const usedTimelines = limits.timelinesPerMonth === Infinity
    ? null
    : limits.timelinesPerMonth - (usage.remaining === Infinity ? 0 : usage.remaining);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="font-playfair text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back. What are you working on today?</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link href="/generate" className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-[#C9A84C]/50 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center mb-4 group-hover:bg-[#C9A84C]/20 transition-colors">
              <PlusCircle className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <p className="font-semibold text-slate-900">Generate Timeline</p>
            <p className="text-sm text-slate-500 mt-1">Create a new wedding day timeline</p>
          </Link>

          <Link href="/saved" className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-[#C9A84C]/50 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <p className="font-semibold text-slate-900">Saved Timelines</p>
            <p className="text-sm text-slate-500 mt-1">View and manage your timelines</p>
          </Link>

          <Link href="/audit" className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-[#C9A84C]/50 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
              <Zap className="w-5 h-5 text-slate-500" />
            </div>
            <p className="font-semibold text-slate-900">Audit a Timeline</p>
            <p className="text-sm text-slate-500 mt-1">Find issues in an existing timeline</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent timelines */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-lg font-semibold text-slate-900">Recent Timelines</h2>
              <Link href="/saved" className="text-sm text-[#C9A84C] hover:underline">View all</Link>
            </div>

            {!recentTimelines || recentTimelines.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No timelines yet</p>
                <Link href="/generate">
                  <Button className="mt-4 bg-[#C9A84C] hover:bg-[#b8973b] text-white">
                    Generate your first
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTimelines.map(t => (
                  <Link
                    key={t.id}
                    href={`/timeline/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF7F2] transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-[#C9A84C] transition-colors">
                        {t.couple_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t.wedding_date
                          ? new Date(t.wedding_date + 'T12:00:00').toLocaleDateString('en-US', {
                              month: 'long', day: 'numeric', year: 'numeric',
                            })
                          : 'No date set'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Usage card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-playfair text-lg font-semibold text-slate-900 mb-5">Your Plan</h2>

            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-sm font-semibold capitalize">
                {plan}
              </span>
            </div>

            {limits.timelinesPerMonth !== Infinity && usedTimelines !== null ? (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600">Timelines this month</span>
                  <span className="font-medium text-slate-900">{usedTimelines} / {limits.timelinesPerMonth}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-[#C9A84C] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usedTimelines / limits.timelinesPerMonth) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-4">
                <span className="font-semibold text-slate-900">Unlimited</span> timelines this month
              </p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Export</span>
                <span className={limits.canExport ? 'text-green-600 font-medium' : 'text-slate-400'}>
                  {limits.canExport ? 'Included' : 'Upgrade required'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Team seats</span>
                <span className="text-slate-700 font-medium">{limits.teamSeats}</span>
              </div>
            </div>

            {plan === 'free' && (
              <Link href="/pricing">
                <Button className="w-full mt-5 bg-[#C9A84C] hover:bg-[#b8973b] text-white text-sm">
                  Upgrade plan
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
