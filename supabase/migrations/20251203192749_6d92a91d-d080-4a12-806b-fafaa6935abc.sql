-- Make update_updated_at_column selective - only update timestamp for content changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only update timestamp if content-relevant fields changed
  -- Skip timestamp update for showcaller-only or non-content changes
  IF (
    OLD.items IS DISTINCT FROM NEW.items OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.start_time IS DISTINCT FROM NEW.start_time OR
    OLD.end_time IS DISTINCT FROM NEW.end_time OR
    OLD.timezone IS DISTINCT FROM NEW.timezone OR
    OLD.show_date IS DISTINCT FROM NEW.show_date OR
    OLD.external_notes IS DISTINCT FROM NEW.external_notes OR
    OLD.columns IS DISTINCT FROM NEW.columns OR
    OLD.numbering_locked IS DISTINCT FROM NEW.numbering_locked OR
    OLD.locked_row_numbers IS DISTINCT FROM NEW.locked_row_numbers OR
    OLD.folder_id IS DISTINCT FROM NEW.folder_id OR
    OLD.archived IS DISTINCT FROM NEW.archived OR
    OLD.visibility IS DISTINCT FROM NEW.visibility OR
    OLD.logo_url IS DISTINCT FROM NEW.logo_url OR
    OLD.icon IS DISTINCT FROM NEW.icon
  ) THEN
    NEW.updated_at = now();
  ELSE
    -- Preserve existing updated_at for non-content changes (like showcaller_state)
    NEW.updated_at = OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$function$;