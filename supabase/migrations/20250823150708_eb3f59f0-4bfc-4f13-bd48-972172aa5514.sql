-- Add triggers to automatically update updated_at timestamps for real-time sync
-- This is critical for proper deduplication and real-time event handling

-- Trigger for rundowns table
CREATE TRIGGER update_rundowns_updated_at
  BEFORE UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for blueprints table  
CREATE TRIGGER update_blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for showcaller_sessions table
CREATE TRIGGER update_showcaller_sessions_updated_at
  BEFORE UPDATE ON public.showcaller_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();