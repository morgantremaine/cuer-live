-- Clean up migration artifacts from per-row persistence attempt

-- Drop the rundown_items table and all related objects
DROP TABLE IF EXISTS public.rundown_items CASCADE;

-- Drop migration-related functions
DROP FUNCTION IF EXISTS public.migrate_rundown_to_normalized_items(uuid);
DROP FUNCTION IF EXISTS public.get_rundown_items_array(uuid);

-- Remove any triggers or policies that might reference rundown_items
-- (CASCADE should handle this, but being explicit)