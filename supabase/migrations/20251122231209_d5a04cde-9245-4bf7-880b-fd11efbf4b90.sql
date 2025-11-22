-- Upgrade morgan@cuer.live to Enterprise tier
UPDATE subscribers
SET 
  subscription_tier = 'Enterprise',
  max_team_members = 999,
  updated_at = now()
WHERE email = 'morgan@cuer.live';