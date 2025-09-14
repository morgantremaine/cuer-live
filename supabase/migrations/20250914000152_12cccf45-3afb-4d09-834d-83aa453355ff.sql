-- Check the current constraint definition for subscribers table
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.subscribers'::regclass 
AND conname LIKE '%subscription_tier%';

-- Also list all current subscription tiers in the database
SELECT DISTINCT subscription_tier 
FROM public.subscribers 
WHERE subscription_tier IS NOT NULL;