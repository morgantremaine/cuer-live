-- Cleanup unused advisory lock functions that were part of a reverted implementation
DROP FUNCTION IF EXISTS public.lock_and_fetch_rundown(uuid);
DROP FUNCTION IF EXISTS public.pg_try_advisory_lock(bigint);
DROP FUNCTION IF EXISTS public.pg_advisory_unlock(bigint);