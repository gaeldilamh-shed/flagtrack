-- ============================================================
-- FlagTrack — Migration: Pay Period engine + per-period goal
-- Run this in Supabase SQL Editor AFTER schema.sql and migration-merge.sql
-- Safe to run more than once.
-- ============================================================

-- Pay period settings on the profile
alter table public.profiles add column if not exists pay_period_mode text default 'weekly';        -- 'weekly' | 'biweekly'
alter table public.profiles add column if not exists pay_period_start_day int default 0;           -- 0=Sun ... 6=Sat
alter table public.profiles add column if not exists pay_period_anchor date;                        -- for biweekly alignment
alter table public.profiles add column if not exists period_goal_amount numeric(10,2) default 2500; -- $ target per pay period

-- Backfill sensible defaults for existing rows
update public.profiles
  set pay_period_mode = coalesce(pay_period_mode, 'weekly'),
      pay_period_start_day = coalesce(pay_period_start_day, 0),
      period_goal_amount = coalesce(period_goal_amount, 2500)
  where pay_period_mode is null
     or pay_period_start_day is null
     or period_goal_amount is null;
