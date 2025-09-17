-- First, ensure the user has team membership
INSERT INTO public.team_members (user_id, team_id, role)
VALUES ('cde54387-6ed6-4f3c-a359-78efdc71d1d9', 'd612e739-989c-4856-84c0-9185d8553107', 'admin')
ON CONFLICT (user_id, team_id) DO NOTHING;

-- Now create the demo rundown
INSERT INTO public.rundowns (
  id,
  user_id,
  team_id,
  folder_id,
  title,
  items,
  columns,
  timezone,
  start_time,
  icon,
  is_demo,
  visibility,
  archived,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'cde54387-6ed6-4f3c-a359-78efdc71d1d9',
  'd612e739-989c-4856-84c0-9185d8553107',
  'faf551b0-e97e-442c-8b02-95fb0bd124c5',
  'Demo Rundown - Esports Broadcast',
  sr.items,
  sr.columns,
  sr.timezone,
  sr.start_time,
  sr.icon,
  true,
  'private',
  false,
  now(),
  now()
FROM public.rundowns sr
WHERE sr.id = 'fd7d054b-1eff-4b7d-85f8-e9bded255cca'
AND NOT EXISTS (
  SELECT 1 FROM public.rundowns 
  WHERE user_id = 'cde54387-6ed6-4f3c-a359-78efdc71d1d9' AND is_demo = true
);