-- Grant grandfathered Enterprise tier access to c.rodriguez@efg.gg
UPDATE subscribers
SET 
  subscribed = true,
  subscription_tier = 'Enterprise',
  max_team_members = 25,
  grandfathered = true,
  subscription_end = NULL,
  updated_at = NOW()
WHERE email = 'c.rodriguez@efg.gg';