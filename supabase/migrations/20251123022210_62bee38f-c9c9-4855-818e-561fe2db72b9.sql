-- Update the trigger to ensure only one default per USER (not per team)
CREATE OR REPLACE FUNCTION public.ensure_single_default_layout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If this layout is being set as default
  IF NEW.is_default = true THEN
    -- Unset any other default layouts for this USER
    UPDATE column_layouts
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;