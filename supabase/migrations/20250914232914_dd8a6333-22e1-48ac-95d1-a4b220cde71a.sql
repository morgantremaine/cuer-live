-- Create function to update showcaller state without changing updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_showcaller_state_silent(
  rundown_uuid uuid,
  new_showcaller_state jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update only the showcaller_state field without triggering updated_at changes
  UPDATE rundowns 
  SET showcaller_state = new_showcaller_state
  WHERE id = rundown_uuid;
END;
$$;