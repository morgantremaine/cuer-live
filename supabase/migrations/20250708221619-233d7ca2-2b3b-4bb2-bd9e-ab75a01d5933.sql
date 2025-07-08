-- Replace the function with a simpler, working version
CREATE OR REPLACE FUNCTION public.get_user_subscription_access(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has their own subscription first
  IF EXISTS (
    SELECT 1 FROM subscribers 
    WHERE user_id = user_uuid AND (subscribed = true OR grandfathered = true)
  ) THEN
    RETURN (
      SELECT jsonb_build_object(
        'has_access', true,
        'access_type', 'personal',
        'subscribed', s.subscribed,
        'subscription_tier', s.subscription_tier,
        'max_team_members', s.max_team_members,
        'subscription_end', s.subscription_end,
        'grandfathered', s.grandfathered
      )
      FROM subscribers s
      WHERE s.user_id = user_uuid AND (s.subscribed = true OR s.grandfathered = true)
      LIMIT 1
    );
  END IF;
  
  -- Check if user has team access
  IF EXISTS (
    SELECT 1 
    FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    JOIN subscribers s ON s.user_id = tm2.user_id
    WHERE tm1.user_id = user_uuid
      AND tm2.role = 'admin'
      AND (s.subscribed = true OR s.grandfathered = true)
  ) THEN
    RETURN (
      SELECT jsonb_build_object(
        'has_access', true,
        'access_type', 'team_member',
        'subscribed', true,
        'subscription_tier', s.subscription_tier,
        'max_team_members', s.max_team_members,
        'subscription_end', s.subscription_end,
        'grandfathered', s.grandfathered,
        'user_role', tm1.role
      )
      FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      JOIN subscribers s ON s.user_id = tm2.user_id
      WHERE tm1.user_id = user_uuid
        AND tm2.role = 'admin'
        AND (s.subscribed = true OR s.grandfathered = true)
      LIMIT 1
    );
  END IF;
  
  -- No access found
  RETURN jsonb_build_object(
    'has_access', false,
    'access_type', 'none',
    'subscribed', false,
    'subscription_tier', null,
    'max_team_members', 1,
    'subscription_end', null,
    'grandfathered', false
  );
END;
$$;