-- Check what happens when a new user signs up - do they get a free tier subscription?
SELECT 
  au.email,
  s.subscription_tier,
  s.max_team_members,
  s.subscribed,
  s.grandfathered,
  s.created_at
FROM auth.users au
LEFT JOIN public.subscribers s ON s.user_id = au.id
ORDER BY au.created_at DESC
LIMIT 5;