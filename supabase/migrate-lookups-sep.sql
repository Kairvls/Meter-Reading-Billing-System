-- Run once in Supabase SQL Editor

alter table public.meter_records
  add column if not exists sep_meter_reader text not null default '';

alter table public.deleted_meter_records
  add column if not exists sep_meter_reader text not null default '';

create table if not exists public.lookup_values (
  id text primary key,
  kind text not null,
  name text not null,
  created_at text not null
);

create index if not exists idx_lookup_values_kind_name
  on public.lookup_values (kind, name);

alter table public.lookup_values enable row level security;
