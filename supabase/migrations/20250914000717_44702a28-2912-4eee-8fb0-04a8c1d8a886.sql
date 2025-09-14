-- Let's see what values are actually in the subscription_tier column
SELECT subscription_tier, COUNT(*) 
FROM public.subscribers 
GROUP BY subscription_tier;

-- Check if there's already a constraint that allows 'Pro'
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.subscribers'::regclass 
AND contype = 'c'
AND conname LIKE '%subscription_tier%';