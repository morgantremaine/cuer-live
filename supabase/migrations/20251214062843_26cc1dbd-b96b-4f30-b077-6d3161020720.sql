-- Create wrapper functions for advisory locks that can be called via RPC
-- These are simple wrappers around PostgreSQL's pg_try_advisory_lock and pg_advisory_unlock

CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(lock_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(lock_id);
$$;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(lock_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(lock_id);
$$;