-- Fix security warnings by setting search_path for all functions

-- Fix create_rundown_revision function
CREATE OR REPLACE FUNCTION public.create_rundown_revision()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix prevent_rundown_wipe function
CREATE OR REPLACE FUNCTION public.prevent_rundown_wipe()
RETURNS TRIGGER AS $$
DECLARE
  old_item_count INTEGER := 0;
  new_item_count INTEGER := 0;
BEGIN
  -- Calculate item counts
  IF OLD.items IS NOT NULL AND jsonb_typeof(OLD.items) = 'array' THEN
    old_item_count := jsonb_array_length(OLD.items);
  END IF;
  
  IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
    new_item_count := jsonb_array_length(NEW.items);
  END IF;
  
  -- Prevent updates that would wipe significant amounts of data
  -- Allow if it's a showcaller-only update (no items field change, just showcaller_state)
  IF TG_OP = 'UPDATE' AND old_item_count > 20 AND new_item_count = 0 THEN
    -- Check if this is a showcaller-only update by comparing other fields
    IF (
      OLD.title = NEW.title AND 
      OLD.start_time = NEW.start_time AND 
      OLD.timezone = NEW.timezone AND
      OLD.items::text != NEW.items::text
    ) THEN
      RAISE EXCEPTION 'SAFETY: Prevented update that would wipe % rundown items. Use manual restore if intentional.', old_item_count
        USING ERRCODE = 'data_exception';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix restore_rundown_from_revision function
CREATE OR REPLACE FUNCTION public.restore_rundown_from_revision(
  target_rundown_id UUID,
  revision_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  revision_data RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Verify user has access to this rundown
  IF NOT EXISTS (
    SELECT 1 FROM public.rundowns r
    WHERE r.id = target_rundown_id 
      AND (r.user_id = current_user_id OR r.team_id IN (
        SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = current_user_id
      ))
  ) THEN
    RAISE EXCEPTION 'Access denied to rundown';
  END IF;
  
  -- Get revision data
  SELECT * INTO revision_data 
  FROM public.rundown_revisions 
  WHERE id = revision_id AND rundown_id = target_rundown_id;
  
  IF revision_data IS NULL THEN
    RAISE EXCEPTION 'Revision not found';
  END IF;
  
  -- Create a backup revision before restore
  INSERT INTO public.rundown_revisions (
    rundown_id, items, title, start_time, timezone, created_by, revision_type
  )
  SELECT id, items, title, start_time, timezone, current_user_id, 'pre_restore'
  FROM public.rundowns WHERE id = target_rundown_id;
  
  -- Restore the data
  UPDATE public.rundowns SET
    items = revision_data.items,
    title = revision_data.title,
    start_time = revision_data.start_time,
    timezone = revision_data.timezone,
    updated_at = now(),
    last_updated_by = current_user_id
  WHERE id = target_rundown_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';