-- Manual team invitation for testing
INSERT INTO team_invitations (
  team_id,
  email,
  invited_by,
  token,
  expires_at,
  accepted,
  created_at
) VALUES (
  '51fd2c38-98f9-4f85-a915-13b1f04d05d8',
  'cuertest@gmail.com',
  'ccc05c63-2628-4694-8a08-079d73946821',
  'test_invite_' || gen_random_uuid()::text,
  now() + interval '7 days',
  false,
  now()
) RETURNING *;