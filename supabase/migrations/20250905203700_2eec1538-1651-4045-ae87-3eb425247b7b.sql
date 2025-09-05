-- Update the increment_rundown_version trigger to include external_notes and show_date
-- This ensures proper version tracking for all content fields that affect real-time sync

CREATE OR REPLACE FUNCTION public.increment_rundown_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment version on any content update
  IF OLD.items IS DISTINCT FROM NEW.items 
     OR OLD.title IS DISTINCT FROM NEW.title 
     OR OLD.start_time IS DISTINCT FROM NEW.start_time 
     OR OLD.timezone IS DISTINCT FROM NEW.timezone 
     OR OLD.external_notes IS DISTINCT FROM NEW.external_notes
     OR OLD.show_date IS DISTINCT FROM NEW.show_date THEN
    NEW.doc_version = OLD.doc_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;