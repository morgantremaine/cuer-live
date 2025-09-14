-- Check if there's a trigger or function that assigns new users to Free tier
SELECT 
  p.proname, 
  p.prosrc 
FROM pg_proc p
WHERE p.proname ILIKE '%new_user%' OR p.proname ILIKE '%handle%user%';