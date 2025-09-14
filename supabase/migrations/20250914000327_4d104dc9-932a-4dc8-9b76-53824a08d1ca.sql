-- First, let's see what subscription tiers currently exist
SELECT subscription_tier, COUNT(*) as count 
FROM public.subscribers 
GROUP BY subscription_tier 
ORDER BY count DESC;

-- Update any existing rows to match the new structure
UPDATE public.subscribers 
SET subscription_tier = 'Pro' 
WHERE subscription_tier = 'Producer';

-- Update any Network tiers to Premium (they were grandfathered)
UPDATE public.subscribers 
SET subscription_tier = 'Premium' 
WHERE subscription_tier = 'Network';

-- Now add the constraint
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_subscription_tier_check 
CHECK (subscription_tier IN ('Free', 'Pro', 'Premium', 'Enterprise'));