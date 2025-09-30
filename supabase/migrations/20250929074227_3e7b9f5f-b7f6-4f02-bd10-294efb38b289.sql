-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_subscription_access(uuid);

-- Create new function that accepts both user_id and optional team_id
CREATE OR REPLACE FUNCTION public.get_user_subscription_access(user_uuid uuid, team_uuid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If team_uuid is provided, check team-specific subscription
  IF team_uuid IS NOT NULL THEN
    -- Check if this specific team has subscription access via its admin
    IF EXISTS (
      SELECT 1 
      FROM team_members tm_admin
      JOIN subscribers s ON s.user_id = tm_admin.user_id
      WHERE tm_admin.team_id = team_uuid
        AND tm_admin.role = 'admin'
        AND (s.subscribed = true OR s.grandfathered = true)
    ) THEN
      -- User is accessing this team and the team has subscription
      RETURN (
        SELECT jsonb_build_object(
          'has_access', true,
          'access_type', CASE 
            WHEN tm_user.user_id = tm_admin.user_id THEN 'personal'
            ELSE 'team_member'
          END,
          'subscribed', s.subscribed,
          'subscription_tier', s.subscription_tier,
          'max_team_members', s.max_team_members,
          'subscription_end', s.subscription_end,
          'grandfathered', s.grandfathered,
          'user_role', tm_user.role
        )
        FROM team_members tm_user
        JOIN team_members tm_admin ON tm_admin.team_id = team_uuid
        JOIN subscribers s ON s.user_id = tm_admin.user_id
        WHERE tm_user.user_id = user_uuid
          AND tm_user.team_id = team_uuid
          AND tm_admin.role = 'admin'
          AND (s.subscribed = true OR s.grandfathered = true)
        LIMIT 1
      );
    ELSE
      -- Team has no subscription, return free tier for team context
      RETURN jsonb_build_object(
        'has_access', false,
        'access_type', 'free',
        'subscribed', false,
        'subscription_tier', 'Free',
        'max_team_members', 1,
        'subscription_end', null,
        'grandfathered', false,
        'user_role', (SELECT role FROM team_members WHERE user_id = user_uuid AND team_id = team_uuid)
      );
    END IF;
  END IF;
  
  -- Legacy behavior: check user's personal subscription first
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
  
  -- Check if user has team access (fallback for when no team_uuid provided)
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
$function$;