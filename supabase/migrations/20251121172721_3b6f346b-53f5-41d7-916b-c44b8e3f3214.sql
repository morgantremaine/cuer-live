-- Grant grandfathered Pro tier access to mike.buetsch@chess.com
UPDATE subscribers
SET 
  subscribed = true,
  subscription_tier = 'Pro',
  max_team_members = 3,
  grandfathered = true,
  subscription_end = NULL,
  updated_at = NOW()
WHERE email = 'mike.buetsch@chess.com';