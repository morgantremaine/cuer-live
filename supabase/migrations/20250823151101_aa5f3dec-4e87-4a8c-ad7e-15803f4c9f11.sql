-- Add triggers to automatically update updated_at timestamps for real-time sync
-- This is critical for proper deduplication and real-time event handling

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_rundowns_updated_at ON public.rundowns;
DROP TRIGGER IF EXISTS update_blueprints_updated_at ON public.blueprints;
DROP TRIGGER IF EXISTS update_showcaller_sessions_updated_at ON public.showcaller_sessions;

-- Create triggers for automatic updated_at timestamp updates
CREATE TRIGGER update_rundowns_updated_at
  BEFORE UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_showcaller_sessions_updated_at
  BEFORE UPDATE ON public.showcaller_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();