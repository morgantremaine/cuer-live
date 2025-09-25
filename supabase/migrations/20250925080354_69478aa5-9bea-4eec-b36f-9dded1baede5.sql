-- Grant Dan grandfathered Premium subscription to fix team invitation issue
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium', 
  max_team_members = 15,
  grandfathered = true,
  updated_at = now()
WHERE email = 'dan@mogulmoves.gg';