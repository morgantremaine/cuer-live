-- Fix subscription_tier for existing Pro subscribers with null tier
UPDATE public.subscribers 
SET subscription_tier = 'Pro',
    max_team_members = 3,
    updated_at = now()
WHERE subscribed = true 
  AND subscription_tier IS NULL 
  AND stripe_subscription_id IS NOT NULL;