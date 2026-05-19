-- Timeline sharing: public links with unique tokens
-- Run this in the Supabase SQL editor after schema.sql

create table if not exists public.timeline_shares (
  id            uuid primary key default gen_random_uuid(),
  timeline_id   text not null references public.saved_timelines(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  share_token   text not null unique,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.timeline_shares enable row level security;

-- Owners can manage their own share links
create policy "Users can manage their own shares"
  on public.timeline_shares
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read active shares (needed for the public /share/[token] page)
create policy "Public can read active shares"
  on public.timeline_shares
  for select
  using (is_active = true);

create index timeline_shares_token_idx on public.timeline_shares(share_token);
create index timeline_shares_timeline_id_idx on public.timeline_shares(timeline_id);

-- Also allow public SELECT on saved_timelines when accessed via a share
-- We'll use the service role client for the public read, so no RLS change needed
-- on saved_timelines — the API route uses createServiceClient().
