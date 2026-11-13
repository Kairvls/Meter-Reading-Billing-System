-- Run once in Supabase SQL Editor if meter_records already exists

alter table public.meter_records
  add column if not exists latitude text not null default '',
  add column if not exists longitude text not null default '',
  add column if not exists image_url text not null default '';

alter table public.deleted_meter_records
  add column if not exists latitude text not null default '',
  add column if not exists longitude text not null default '',
  add column if not exists image_url text not null default '';
