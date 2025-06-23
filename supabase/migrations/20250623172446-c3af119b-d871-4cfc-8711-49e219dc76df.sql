
-- Clean up orphaned data for morgan.tremaine@esportsawards.com

-- Step 1: Clean up any orphaned team memberships that might be referencing deleted users
DELETE FROM public.team_members 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 2: Clean up any orphaned profiles
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 3: Clean up any pending or orphaned invitations for this email
DELETE FROM public.team_invitations 
WHERE email = 'morgan.tremaine@esportsawards.com';

-- Step 4: Clean up any rundown presence records for deleted users
DELETE FROM public.rundown_presence 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 5: Clean up any user column preferences for deleted users
DELETE FROM public.user_column_preferences 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 6: Clean up any team conversations for deleted users
DELETE FROM public.team_conversations 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 7: Ensure all existing users have profiles (in case the trigger missed any)
INSERT INTO public.profiles (id, email, full_name)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data ->> 'full_name', '')
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
