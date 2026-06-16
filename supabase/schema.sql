-- ============================================================
--  WIP — Supabase schema
--  Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================

-- gen_random_uuid() lives in pgcrypto (already available on Supabase).
create extension if not exists "pgcrypto";

-- One table. The whole document (north star, bets, every week) is stored
-- as a single JSON blob. This is deliberate: sections can change shape over
-- time without ever needing a database migration. Weeks are just an array
-- inside `data`.
create table if not exists public.wip_docs (
  id          uuid primary key default gen_random_uuid(),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Row Level Security on, with fully open policies.
-- This is the "anyone with the link can edit" model you asked for.
-- READ IT HONESTLY: this means anyone holding the public anon key + a doc id
-- can read or edit that doc. Treat the URL like a password. Don't store
-- confidential client data here. (Locking it to named users = a later step.)
alter table public.wip_docs enable row level security;

drop policy if exists "wip read"   on public.wip_docs;
drop policy if exists "wip insert" on public.wip_docs;
drop policy if exists "wip update" on public.wip_docs;

create policy "wip read"   on public.wip_docs for select using (true);
create policy "wip insert" on public.wip_docs for insert with check (true);
create policy "wip update" on public.wip_docs for update using (true) with check (true);

-- Realtime: so an edit on one device/person shows up on the other live.
alter table public.wip_docs replica identity full;

-- Add the table to the realtime publication (ignore error if already added).
do $$
begin
  alter publication supabase_realtime add table public.wip_docs;
exception when duplicate_object then null;
end $$;
