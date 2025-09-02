-- Attach critical safety triggers to rundowns table

-- 1. Prevent data wipe trigger (BEFORE UPDATE)
CREATE TRIGGER prevent_rundown_data_wipe
  BEFORE UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_rundown_wipe();

-- 2. Auto-revision trigger (AFTER INSERT OR UPDATE)
CREATE TRIGGER create_rundown_auto_revision
  AFTER INSERT OR UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.create_rundown_revision();

-- 3. Update timestamp trigger (BEFORE UPDATE)
CREATE TRIGGER update_rundowns_updated_at
  BEFORE UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();