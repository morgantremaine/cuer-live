-- First check if constraint already exists and what it allows
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.subscribers'::regclass 
AND contype = 'c';

-- See all current subscription tiers
SELECT DISTINCT subscription_tier 
FROM public.subscribers 
WHERE subscription_tier IS NOT NULL
ORDER BY subscription_tier;