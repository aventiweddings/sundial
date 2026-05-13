import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    if (!userId || !session.subscription) return NextResponse.json({ ok: true });

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0]?.price.id ?? '';
    const plan = getPlanFromPriceId(priceId);
    const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      plan,
      status: subscription.status,
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id;
    if (!userId) return NextResponse.json({ ok: true });

    const priceId = subscription.items.data[0]?.price.id ?? '';
    const plan = event.type === 'customer.subscription.deleted'
      ? 'free'
      : getPlanFromPriceId(priceId);
    const periodEnd2 = (subscription as unknown as { current_period_end: number }).current_period_end;

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: new Date(periodEnd2 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  return NextResponse.json({ ok: true });
}
