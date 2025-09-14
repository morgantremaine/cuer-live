-- Update Producer to Pro to match the new naming
UPDATE public.subscribers 
SET subscription_tier = 'Pro' 
WHERE subscription_tier = 'Producer';

-- Now update the constraint to include the correct tiers
-- First drop existing constraint if it exists
ALTER TABLE public.subscribers DROP CONSTRAINT IF EXISTS subscribers_subscription_tier_check;

-- Add the new constraint
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_subscription_tier_check 
CHECK (subscription_tier IN ('Free', 'Pro', 'Premium', 'Enterprise'));