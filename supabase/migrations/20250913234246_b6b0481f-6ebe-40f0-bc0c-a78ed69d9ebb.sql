-- First update the constraint to include all existing tiers including Network and handle nulls
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_subscription_tier_check;

-- Add constraint that allows existing tiers plus Premium
ALTER TABLE subscribers ADD CONSTRAINT subscribers_subscription_tier_check 
CHECK (subscription_tier IN ('Free', 'Producer', 'Show', 'Premium', 'Network') OR subscription_tier IS NULL);

-- Set NULL subscription_tier to 'Free' first
UPDATE subscribers 
SET subscription_tier = 'Free',
    updated_at = now()
WHERE subscription_tier IS NULL;

-- Now migrate grandfathered Network accounts to Premium tier
UPDATE subscribers 
SET subscription_tier = 'Premium',
    max_team_members = 15,
    updated_at = now()
WHERE subscription_tier = 'Network' 
  AND grandfathered = true;

-- Update non-grandfathered Network accounts to Producer (closest equivalent)
UPDATE subscribers 
SET subscription_tier = 'Producer',
    updated_at = now()
WHERE subscription_tier = 'Network' 
  AND (grandfathered = false OR grandfathered IS NULL);

-- Now update constraint to remove Network since we've migrated all accounts
ALTER TABLE subscribers DROP CONSTRAINT subscribers_subscription_tier_check;
ALTER TABLE subscribers ADD CONSTRAINT subscribers_subscription_tier_check 
CHECK (subscription_tier IN ('Free', 'Producer', 'Show', 'Premium'));