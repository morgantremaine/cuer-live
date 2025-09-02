-- Remove duplicate revision trigger
-- There are two triggers doing the same thing: create_rundown_auto_revision and rundown_revision_trigger
-- We only need one of them
DROP TRIGGER IF EXISTS rundown_revision_trigger ON public.rundowns;