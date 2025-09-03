-- Fix save errors by updating revision trigger to not write to generated column items_count
CREATE OR REPLACE FUNCTION public.create_rundown_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_item_count INTEGER := 0;
  new_item_count INTEGER := 0;
  should_create_revision BOOLEAN := false;
BEGIN
  -- Calculate item counts
  IF OLD.items IS NOT NULL AND jsonb_typeof(OLD.items) = 'array' THEN
    old_item_count := jsonb_array_length(OLD.items);
  END IF;
  
  IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
    new_item_count := jsonb_array_length(NEW.items);
  END IF;
  
  -- Create revision if:
  -- 1. Item count changed significantly (>10% or >5 items)
  -- 2. Items array is being cleared (potential data loss)
  -- 3. First save after creation
  IF TG_OP = 'UPDATE' THEN
    should_create_revision := (
      -- Items being cleared
      (old_item_count > 10 AND new_item_count = 0) OR
      -- Significant change in item count
      (old_item_count > 0 AND abs(new_item_count - old_item_count) >= GREATEST(5, old_item_count * 0.1)) OR
      -- Title changed
      (OLD.title != NEW.title) OR
      -- Major structural changes (check every 10 saves by looking at existing revisions)
      ((SELECT COUNT(*) FROM rundown_revisions WHERE rundown_id = NEW.id) % 10 = 0)
    );
  ELSIF TG_OP = 'INSERT' THEN
    should_create_revision := true;
  END IF;
  
  -- Create the revision if conditions are met
  IF should_create_revision THEN
    -- Do not write to generated column items_count; let Postgres compute it automatically
    INSERT INTO public.rundown_revisions (
      rundown_id,
      revision_number,
      items,
      title,
      start_time,
      timezone,
      created_by,
      revision_type
    )
    VALUES (
      NEW.id,
      COALESCE((SELECT MAX(revision_number) + 1 FROM rundown_revisions WHERE rundown_id = NEW.id), 1),
      NEW.items,
      NEW.title,
      NEW.start_time,
      NEW.timezone,
      NEW.last_updated_by,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'initial'
        WHEN old_item_count > 10 AND new_item_count = 0 THEN 'pre_wipe'
        ELSE 'auto'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;