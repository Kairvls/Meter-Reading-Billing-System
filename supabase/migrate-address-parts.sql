-- Run once in Supabase SQL Editor

alter table public.meter_records
  add column if not exists home_address text not null default '',
  add column if not exists barangay text not null default '',
  add column if not exists street_block text not null default '';

alter table public.deleted_meter_records
  add column if not exists home_address text not null default '',
  add column if not exists barangay text not null default '',
  add column if not exists street_block text not null default '';
