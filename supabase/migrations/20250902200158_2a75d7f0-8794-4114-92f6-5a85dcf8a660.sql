-- Attach missing critical safety triggers to rundowns table

-- 1. Prevent data wipe trigger (BEFORE UPDATE) - Critical for preventing data loss
CREATE TRIGGER prevent_rundown_data_wipe
  BEFORE UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_rundown_wipe();

-- 2. Auto-revision trigger (AFTER INSERT OR UPDATE) - Critical for data recovery
CREATE TRIGGER create_rundown_auto_revision
  AFTER INSERT OR UPDATE ON public.rundowns
  FOR EACH ROW
  EXECUTE FUNCTION public.create_rundown_revision();