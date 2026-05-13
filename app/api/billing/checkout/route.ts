import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan, interval = 'monthly' } = await req.json();

  const planPrices = PRICE_IDS[plan as keyof typeof PRICE_IDS];
  if (!planPrices) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const priceId = interval === 'annual' ? planPrices.annual : planPrices.monthly;
  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 });

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: existing?.stripe_customer_id || undefined,
    customer_email: !existing?.stripe_customer_id ? user.email! : undefined,
    metadata: { user_id: user.id },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
