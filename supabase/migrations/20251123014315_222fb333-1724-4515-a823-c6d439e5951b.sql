-- Upgrade morgantremaine@gmail.com to Enterprise tier
UPDATE subscribers 
SET 
  subscription_tier = 'Enterprise',
  max_team_members = 25,
  updated_at = now()
WHERE email = 'morgantremaine@gmail.com';