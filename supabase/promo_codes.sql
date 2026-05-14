-- Promo Codes table
-- Run this in the Supabase SQL editor after schema.sql

-- ─── promo_codes ────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  description      text not null default '',
  discount_percent int not null default 100,        -- 100 = fully free
  plan_granted     text not null default 'pro',      -- which plan the code unlocks
  max_uses         int,                             -- null = unlimited
  used_count       int not null default 0,
  active           boolean not null default true,
  valid_from       timestamptz not null default now(),
  valid_until      timestamptz,                     -- null = never expires
  created_at       timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

-- No public read/write — only service role manages promo codes

-- ─── redeemed_codes ─────────────────────────────────────────────────────────
create table if not exists public.redeemed_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  promo_code_id uuid not null references public.promo_codes(id),
  redeemed_at  timestamptz not null default now(),
  unique(user_id, promo_code_id)
);

alter table public.redeemed_codes enable row level security;

create policy "Users can read their own redemptions"
  on public.redeemed_codes
  for select
  using (auth.uid() = user_id);

-- ─── Seed: team promo code "SUNDIAL" ───────────────────────────────────────
insert into public.promo_codes (code, description, discount_percent, plan_granted, max_uses, active)
values ('SUNDIAL', 'Sundial team — free Pro access', 100, 'pro', null, true)
on conflict (code) do nothing;
