-- Fix 1: Remove duplicate wipe prevention trigger
DROP TRIGGER IF EXISTS rundown_wipe_prevention_trigger ON public.rundowns;

-- Fix 2: Check current doc_version state for the failing rundown
SELECT id, doc_version, updated_at, last_updated_by 
FROM public.rundowns 
WHERE id = '1c9d17bd-54ff-4142-af61-3b82d31cd5b0';