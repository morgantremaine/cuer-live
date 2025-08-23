-- Grant grandfathered Network (highest) tier access to steve.meyer@att.net
INSERT INTO public.subscribers (
  email,
  user_id,
  subscribed,
  subscription_tier,
  max_team_members,
  grandfathered,
  created_at,
  updated_at
) VALUES (
  'steve.meyer@att.net',
  (SELECT id FROM auth.users WHERE email = 'steve.meyer@att.net'),
  true,
  'Network',
  25,
  true,
  now(),
  now()
)
ON CONFLICT (email) 
DO UPDATE SET
  subscribed = true,
  subscription_tier = 'Network',
  max_team_members = 25,
  grandfathered = true,
  updated_at = now();