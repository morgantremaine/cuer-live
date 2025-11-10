-- Create advisory lock wrapper functions for structural operations coordination

-- Advisory lock function - blocks until lock is acquired
CREATE OR REPLACE FUNCTION public.pg_advisory_lock(key bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_lock(key);
END;
$$;

-- Advisory unlock function - releases the lock
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