-- Create function to lock and fetch rundown atomically
CREATE OR REPLACE FUNCTION public.lock_and_fetch_rundown(rundown_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Lock the row and fetch it in one atomic operation
  -- FOR UPDATE NOWAIT throws error immediately if row is already locked
  SELECT to_jsonb(r.*) INTO result
  FROM rundowns r
  WHERE r.id = rundown_uuid
  FOR UPDATE NOWAIT;
  
  RETURN result;
EXCEPTION
  WHEN lock_not_available THEN
    -- Row is locked by another transaction, caller should retry
    RETURN NULL;
END;
$$;