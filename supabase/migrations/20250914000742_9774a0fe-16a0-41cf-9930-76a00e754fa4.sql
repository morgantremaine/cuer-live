-- First, let's temporarily allow 'Pro' in the existing constraint
ALTER TABLE public.subscribers DROP CONSTRAINT subscribers_subscription_tier_check;

-- Add a temporary constraint that allows both old and new values
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_subscription_tier_check_temp 
CHECK (subscription_tier IN ('Free', 'Producer', 'Pro', 'Premium', 'Show', 'Enterprise'));

-- Now update the data safely
UPDATE public.subscribers 
SET subscription_tier = 'Pro' 
WHERE subscription_tier = 'Producer';

-- Drop the temporary constraint and add the final one
ALTER TABLE public.subscribers DROP CONSTRAINT subscribers_subscription_tier_check_temp;

-- Add the final constraint with only the new values
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_subscription_tier_check 
CHECK (subscription_tier IN ('Free', 'Pro', 'Premium', 'Enterprise'));