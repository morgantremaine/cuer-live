-- Drop the UUID version of get_batched_rundown_history to resolve function overloading conflict
DROP FUNCTION IF EXISTS get_batched_rundown_history(uuid, integer, integer, integer);