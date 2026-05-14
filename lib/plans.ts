import { createClient } from '@/lib/supabase/server';

export type Plan = 'free' | 'pro';

export const PLAN_LIMITS: Record<Plan, {
  timelinesPerMonth: number;
  auditsPerMonth: number;
  canExport: boolean;
  savedTimelines: number;
}> = {
  free: { timelinesPerMonth: 1,        auditsPerMonth: 1,        canExport: false, savedTimelines: 3    },
  pro:  { timelinesPerMonth: Infinity, auditsPerMonth: Infinity, canExport: true,  savedTimelines: Infinity },
};

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();
  return (data?.plan as Plan) || 'free';
}

export async function checkUsage(
  userId: string,
  action: 'timeline' | 'audit'
): Promise<{ allowed: boolean; remaining: number; plan: Plan }> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const plan: Plan = (sub?.plan as Plan) || 'free';
  const limits = PLAN_LIMITS[plan];

  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartStr = periodStart.toISOString().split('T')[0];

  const { data: usage } = await supabase
    .from('usage')
    .select('timelines_generated, audits_run')
    .eq('user_id', userId)
    .gte('period_start', periodStartStr)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  const used = action === 'timeline'
    ? (usage?.timelines_generated ?? 0)
    : (usage?.audits_run ?? 0);

  const limit = action === 'timeline'
    ? limits.timelinesPerMonth
    : limits.auditsPerMonth;

  const allowed = limit === Infinity || used < limit;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);

  return { allowed, remaining, plan };
}

export async function incrementUsage(userId: string, action: 'timeline' | 'audit'): Promise<void> {
  const supabase = await createClient();

  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartStr = periodStart.toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('usage')
    .select('id, timelines_generated, audits_run')
    .eq('user_id', userId)
    .gte('period_start', periodStartStr)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const updates = action === 'timeline'
      ? { timelines_generated: existing.timelines_generated + 1, updated_at: new Date().toISOString() }
      : { audits_run: existing.audits_run + 1, updated_at: new Date().toISOString() };
    await supabase.from('usage').update(updates).eq('id', existing.id);
  } else {
    await supabase.from('usage').insert({
      user_id: userId,
      period_start: periodStartStr,
      timelines_generated: action === 'timeline' ? 1 : 0,
      audits_run: action === 'audit' ? 1 : 0,
      updated_at: new Date().toISOString(),
    });
  }
}
