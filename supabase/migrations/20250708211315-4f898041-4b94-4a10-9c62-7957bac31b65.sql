-- Add grandfathered column to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN grandfathered BOOLEAN DEFAULT false;

-- Create function to grandfather existing admin users into Network tier (safer version)
CREATE OR REPLACE FUNCTION public.grandfather_existing_admins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_record RECORD;
  user_count INTEGER := 0;
BEGIN
  -- Find all admin users that actually exist in auth.users and grandfather them into Network tier
  FOR admin_record IN 
    SELECT DISTINCT tm.user_id, p.email
    FROM team_members tm
    JOIN profiles p ON p.id = tm.user_id
    JOIN auth.users au ON au.id = tm.user_id  -- Only users that exist in auth.users
    WHERE tm.role = 'admin'
  LOOP
    -- Upsert grandfathered Network subscription for each admin
    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      max_team_members,
      grandfathered,
      created_at,
      updated_at
    ) VALUES (
      admin_record.user_id,
      admin_record.email,
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
      updated_at = now()
    WHERE subscribers.grandfathered = false OR subscribers.grandfathered IS NULL;
    
    user_count := user_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Grandfathered % admin users into Network tier', user_count;
END;
$$;

-- Execute the grandfathering function
SELECT public.grandfather_existing_admins();

-- Create index for grandfathered column
CREATE INDEX idx_subscribers_grandfathered ON public.subscribers(grandfathered);