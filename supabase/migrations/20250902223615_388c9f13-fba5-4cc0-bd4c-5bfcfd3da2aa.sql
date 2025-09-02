-- Add doc_version column to rundowns table for optimistic concurrency control
ALTER TABLE public.rundowns 
ADD COLUMN doc_version INTEGER NOT NULL DEFAULT 1;

-- Add index for efficient version lookups
CREATE INDEX idx_rundowns_doc_version ON public.rundowns(id, doc_version);

-- Create function to automatically increment doc_version on updates
CREATE OR REPLACE FUNCTION public.increment_rundown_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment version on any content update
  IF OLD.items IS DISTINCT FROM NEW.items 
     OR OLD.title IS DISTINCT FROM NEW.title 
     OR OLD.start_time IS DISTINCT FROM NEW.start_time 
     OR OLD.timezone IS DISTINCT FROM NEW.timezone THEN
    NEW.doc_version = OLD.doc_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version
CREATE TRIGGER trigger_increment_rundown_version
  BEFORE UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_rundown_version();