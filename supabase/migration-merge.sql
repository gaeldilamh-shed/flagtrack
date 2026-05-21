-- ============================================================
-- FlagTrack — Migration: Work Order merge support
-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- Safe to run more than once.
-- ============================================================

-- Add store_number column if it doesn't exist (older schema may lack it on some rows)
alter table public.tickets add column if not exists store_number text;

-- Speed up the "does this work order already exist for this user?" lookup
-- used by the auto-merge feature. Not strictly unique because a blank/null
-- work order is allowed (manual tickets), so we use a normal index.
create index if not exists tickets_user_workorder_idx
  on public.tickets (user_id, work_order);

-- That's it. The merge logic itself lives in the app:
--  - On scan, the app looks up an existing ticket with the same (user_id, work_order)
--  - If found, it appends the new services and skips exact-duplicate service names
--  - If not, it creates a new ticket
