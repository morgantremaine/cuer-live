-- Replace blocking advisory lock with non-blocking version

-- Drop the old blocking lock function
DROP FUNCTION IF EXISTS public.pg_advisory_lock(bigint);

-- Non-blocking advisory lock - returns true if acquired, false if already held
CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(key bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pg_try_advisory_lock(key);
END;
$$;

-- Keep unlock function as-is (no changes needed)
CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(key bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_unlock(key);
END;
$$;