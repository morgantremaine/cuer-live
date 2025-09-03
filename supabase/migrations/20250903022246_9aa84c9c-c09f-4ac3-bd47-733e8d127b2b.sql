-- Add action description field to track what specific action was taken
ALTER TABLE rundown_revisions ADD COLUMN IF NOT EXISTS action_description TEXT;

-- Modify the create_rundown_revision function to be much more frequent and detailed
CREATE OR REPLACE FUNCTION public.create_rundown_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_item_count INTEGER := 0;
  new_item_count INTEGER := 0;
  should_create_revision BOOLEAN := false;
  action_desc TEXT := '';
  time_since_last_revision INTERVAL;
  last_revision_time TIMESTAMP;
BEGIN
  -- Calculate item counts
  IF OLD.items IS NOT NULL AND jsonb_typeof(OLD.items) = 'array' THEN
    old_item_count := jsonb_array_length(OLD.items);
  END IF;
  
  IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
    new_item_count := jsonb_array_length(NEW.items);
  END IF;
  
  -- Get the time of the last revision to prevent too many rapid revisions
  SELECT created_at INTO last_revision_time 
  FROM rundown_revisions 
  WHERE rundown_id = NEW.id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  time_since_last_revision := COALESCE(now() - last_revision_time, INTERVAL '1 hour');
  
  IF TG_OP = 'UPDATE' THEN
    -- Always create revision if it's been more than 5 minutes since last one
    -- Or if there are significant changes
    should_create_revision := (
      -- Time-based: Every 5 minutes of activity
      time_since_last_revision > INTERVAL '5 minutes' OR
      -- Items being cleared (potential data loss)
      (old_item_count > 5 AND new_item_count = 0) OR
      -- Significant item count change (>3 items or >20%)
      (old_item_count > 0 AND abs(new_item_count - old_item_count) >= GREATEST(3, old_item_count * 0.2)) OR
      -- Title changed
      (OLD.title != NEW.title) OR
      -- Start time changed
      (OLD.start_time != NEW.start_time) OR
      -- Different user made the change
      (OLD.last_updated_by != NEW.last_updated_by) OR
      -- Every 5 updates regardless
      ((SELECT COUNT(*) FROM rundown_revisions WHERE rundown_id = NEW.id) % 5 = 0)
    );
    
    -- Generate action description based on what changed
    IF OLD.title != NEW.title THEN
      action_desc := 'Title changed from "' || COALESCE(OLD.title, '') || '" to "' || COALESCE(NEW.title, '') || '"';
    ELSIF old_item_count > 5 AND new_item_count = 0 THEN
      action_desc := 'All items cleared (' || old_item_count || ' items removed)';
    ELSIF new_item_count > old_item_count THEN
      action_desc := 'Added ' || (new_item_count - old_item_count) || ' items (' || old_item_count || ' → ' || new_item_count || ')';
    ELSIF new_item_count < old_item_count THEN
      action_desc := 'Removed ' || (old_item_count - new_item_count) || ' items (' || old_item_count || ' → ' || new_item_count || ')';
    ELSIF OLD.start_time != NEW.start_time THEN
      action_desc := 'Start time changed from ' || COALESCE(OLD.start_time, 'unset') || ' to ' || COALESCE(NEW.start_time, 'unset');
    ELSIF OLD.last_updated_by != NEW.last_updated_by THEN
      action_desc := 'Content updated by different user';
    ELSIF time_since_last_revision > INTERVAL '5 minutes' THEN
      action_desc := 'Periodic save (' || new_item_count || ' items)';
    ELSE
      action_desc := 'Content updated (' || new_item_count || ' items)';
    END IF;
    
  ELSIF TG_OP = 'INSERT' THEN
    should_create_revision := true;
    action_desc := 'Rundown created (' || new_item_count || ' items)';
  END IF;
  
  -- Create the revision if conditions are met
  IF should_create_revision THEN
    INSERT INTO public.rundown_revisions (
      rundown_id,
      revision_number,
      items,
      title,
      start_time,
      timezone,
      created_by,
      revision_type,
      action_description
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
        WHEN old_item_count > 5 AND new_item_count = 0 THEN 'pre_wipe'
        WHEN time_since_last_revision > INTERVAL '5 minutes' THEN 'periodic'
        WHEN OLD.last_updated_by != NEW.last_updated_by THEN 'user_change'
        ELSE 'auto'
      END,
      action_desc
    );
  END IF;
  
  RETURN NEW;
END;
$function$;