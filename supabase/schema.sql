-- Sundial DB Schema
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- ─── saved_timelines ────────────────────────────────────────────────────────
create table if not exists public.saved_timelines (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  couple_name     text not null default '',
  wedding_date    date,
  content         text not null default '',
  metadata        jsonb not null default '{}',
  chat_history    jsonb not null default '[]',
  version_history jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.saved_timelines enable row level security;

create policy "Users can manage their own timelines"
  on public.saved_timelines
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index saved_timelines_user_id_idx on public.saved_timelines(user_id);
create index saved_timelines_created_at_idx on public.saved_timelines(created_at desc);

-- ─── subscriptions ──────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  plan                     text not null default 'free',
  status                   text not null default 'active',
  current_period_end       timestamptz,
  updated_at               timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read their own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- service role can write (used by Stripe webhook)

-- ─── usage ──────────────────────────────────────────────────────────────────
create table if not exists public.usage (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  period_start         date not null,
  timelines_generated  int not null default 0,
  audits_run           int not null default 0,
  updated_at           timestamptz not null default now(),
  unique(user_id, period_start)
);

alter table public.usage enable row level security;

create policy "Users can read their own usage"
  on public.usage
  for select
  using (auth.uid() = user_id);

-- service role can write (used by server-side incrementUsage)

-- ─── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_saved_timelines
  before update on public.saved_timelines
  for each row execute function public.set_updated_at();

create trigger set_updated_at_subscriptions
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger set_updated_at_usage
  before update on public.usage
  for each row execute function public.set_updated_at();
