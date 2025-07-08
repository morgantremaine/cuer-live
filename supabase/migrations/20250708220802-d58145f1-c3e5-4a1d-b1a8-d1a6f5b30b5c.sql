-- Create function to check if user has subscription access through team membership
CREATE OR REPLACE FUNCTION public.get_user_subscription_access(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_subscription RECORD;
  team_admin_subscription RECORD;
  team_membership RECORD;
  result jsonb;
BEGIN
  -- First check if user has their own subscription
  SELECT * INTO user_subscription
  FROM subscribers 
  WHERE user_id = user_uuid AND (subscribed = true OR grandfathered = true);
  
  IF user_subscription IS NOT NULL THEN
    -- User has their own subscription
    RETURN jsonb_build_object(
      'has_access', true,
      'access_type', 'personal',
      'subscribed', user_subscription.subscribed,
      'subscription_tier', user_subscription.subscription_tier,
      'max_team_members', user_subscription.max_team_members,
      'subscription_end', user_subscription.subscription_end,
      'grandfathered', user_subscription.grandfathered
    );
  END IF;
  
  -- Check if user is a team member with access through team admin
  SELECT tm.team_id, tm.role INTO team_membership
  FROM team_members tm
  WHERE tm.user_id = user_uuid
  LIMIT 1;
  
  IF team_membership IS NOT NULL THEN
    -- User is a team member, check if team admin has subscription
    SELECT s.* INTO team_admin_subscription
    FROM subscribers s
    JOIN team_members tm ON s.user_id = tm.user_id
    WHERE tm.team_id = team_membership.team_id 
      AND tm.role = 'admin' 
      AND (s.subscribed = true OR s.grandfathered = true)
    LIMIT 1;
    
    IF team_admin_subscription IS NOT NULL THEN
      -- Team admin has subscription, user gets access
      RETURN jsonb_build_object(
        'has_access', true,
        'access_type', 'team_member',
        'subscribed', true,
        'subscription_tier', team_admin_subscription.subscription_tier,
        'max_team_members', team_admin_subscription.max_team_members,
        'subscription_end', team_admin_subscription.subscription_end,
        'grandfathered', team_admin_subscription.grandfathered,
        'user_role', team_membership.role
      );
    END IF;
  END IF;
  
  -- No subscription access found
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