-- Create trigger to ensure all new rundowns have per_cell_save_enabled = true
CREATE OR REPLACE TRIGGER enable_per_cell_save_trigger
BEFORE INSERT ON public.rundowns
FOR EACH ROW
EXECUTE FUNCTION enable_per_cell_for_all_users();

-- Also ensure the column has a default value as a safety net
ALTER TABLE public.rundowns 
ALTER COLUMN per_cell_save_enabled SET DEFAULT true;