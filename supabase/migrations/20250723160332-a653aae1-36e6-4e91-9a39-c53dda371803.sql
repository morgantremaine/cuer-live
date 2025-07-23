-- Grant grandfathered Network access to n.man@efg.gg
INSERT INTO public.subscribers (
  user_id,
  email,
  subscribed,
  subscription_tier,
  max_team_members,
  grandfathered,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  'n.man@efg.gg',
  true,
  'Network',
  25,
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'n.man@efg.gg'
ON CONFLICT (email) 
DO UPDATE SET
  subscribed = true,
  subscription_tier = 'Network',
  max_team_members = 25,
  grandfathered = true,
  updated_at = now();