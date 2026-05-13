import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL));

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/pricing', process.env.NEXT_PUBLIC_APP_URL));
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return NextResponse.redirect(session.url);
}
