import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/promo — validate a promo code
export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('active', true)
    .single();

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' }, { status: 200 });
  }

  // Check expiry
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return NextResponse.json({ valid: false, error: 'This code has expired' }, { status: 200 });
  }

  // Check max uses
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    discount_percent: promo.discount_percent,
    plan_granted: promo.plan_granted,
    description: promo.description,
  });
}

// PUT /api/promo — redeem a promo code (requires auth)
export async function PUT(req: NextRequest) {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch and validate promo code
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('active', true)
    .single();

  if (!promo) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
  }

  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return NextResponse.json({ error: 'This code has expired' }, { status: 400 });
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 });
  }

  // Check if already redeemed by this user
  const { data: existing } = await supabase
    .from('redeemed_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('promo_code_id', promo.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already redeemed this code' }, { status: 400 });
  }

  // For 100% discount codes, directly upgrade the plan (skip Stripe)
  if (promo.discount_percent === 100) {
    // Upsert the subscription to the granted plan
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      plan: promo.plan_granted,
      status: 'active',
      current_period_end: null, // no expiry for promo plans
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Record the redemption
    await supabase.from('redeemed_codes').insert({
      user_id: user.id,
      promo_code_id: promo.id,
    });

    // Increment usage count
    await supabase
      .from('promo_codes')
      .update({ used_count: promo.used_count + 1 })
      .eq('id', promo.id);

    return NextResponse.json({
      success: true,
      plan: promo.plan_granted,
      message: `You now have ${promo.plan_granted.charAt(0).toUpperCase() + promo.plan_granted.slice(1)} access!`,
    });
  }

  // For partial discounts, return info to pass to Stripe checkout
  return NextResponse.json({
    success: true,
    discount_percent: promo.discount_percent,
    plan_granted: promo.plan_granted,
    use_checkout: true,
    message: `${promo.discount_percent}% discount applied! Proceed to checkout.`,
  });
}
