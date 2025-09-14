-- Update the subscription tier constraint to include the correct new tiers
-- First drop the existing constraint
ALTER TABLE public.subscribers DROP CONSTRAINT IF EXISTS subscribers_subscription_tier_check;

-- Add the new constraint with the correct tier names
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_subscription_tier_check 
CHECK (subscription_tier IN ('Free', 'Pro', 'Premium', 'Enterprise'));

-- Update any existing 'Producer' records to 'Pro'
UPDATE public.subscribers 
SET subscription_tier = 'Pro' 
WHERE subscription_tier = 'Producer';