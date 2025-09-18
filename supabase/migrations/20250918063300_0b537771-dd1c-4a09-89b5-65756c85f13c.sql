-- Create a function to set up demo content for new users
CREATE OR REPLACE FUNCTION public.create_demo_content_for_user(target_user_id uuid, target_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_folder_id uuid;
  demo_rundown_id uuid;
BEGIN
  -- Create the Demo folder
  INSERT INTO rundown_folders (team_id, name, color, position, created_by)
  VALUES (target_team_id, 'Demo', '#8B5CF6', 0, target_user_id)
  RETURNING id INTO demo_folder_id;
  
  -- Generate a new UUID for the demo rundown
  demo_rundown_id := gen_random_uuid();
  
  -- Create the demo rundown with the template content
  INSERT INTO rundowns (
    id,
    user_id,
    team_id,
    folder_id,
    title,
    start_time,
    timezone,
    items,
    created_at,
    updated_at,
    last_updated_by,
    doc_version
  ) VALUES (
    demo_rundown_id,
    target_user_id,
    target_team_id,
    demo_folder_id,
    'Demo Rundown - Your Template',
    '09:00',
    'America/New_York',
    '[{"id":"header_1751939845425_cy79eacen","type":"header","rowNumber":"A","name":"TOP OF SHOW","startTime":"","duration":"","endTime":"","elapsedTime":"","talent":"","script":"","gfx":"","video":"","images":"","notes":"","color":"","isFloating":false,"customFields":{},"segmentName":"A","calculatedRowNumber":"","calculatedStartTime":"09:02:00","calculatedEndTime":"09:02:00","calculatedElapsedTime":"00:02:00"},{"id":"77fb7e69-2909-4396-b5e9-364cfb2b9846","type":"regular","rowNumber":"1","name":"Show Open","startTime":"","duration":"02:00","endTime":"","elapsedTime":"00:00","talent":"Host: Alex","script":"[ALEX {Blue}] Welcome to the Clash of Champions! We''ve got an electrifying best-of-three showdown coming your way today, featuring two of the most hyped teams in the league. Buckle up — it''s going to be a wild ride!","gfx":"Logo animation, Show title screen","video":"Hype intro sizzle","images":"https://i.ytimg.com/vi/lPtFkGiYoqY/maxresdefault.jpg","notes":"","color":"","isFloating":false,"customFields":{"music":"Energetic Synth Opener"},"calculatedRowNumber":"1","calculatedStartTime":"09:00:00","calculatedEndTime":"09:02:00","calculatedElapsedTime":"00:00:00"},{"id":"977a3198-9abd-4953-a7d1-20640b04399d","type":"regular","rowNumber":"2","name":"Analyst Desk Intro","startTime":"","duration":"03:00","endTime":"","elapsedTime":"00:00","talent":"Host + Casters Moxie & Rekkz","script":"[ALEX {Blue}] Let''s get into the nitty-gritty with our expert casters. Moxie and Rekkz, walk us through the stakes and what to expect from today''s teams.","gfx":"Team logos, headshots","video":"Desk Cam Feed","images":"https://d359b212dt0ata.cloudfront.net/content/wp-content/uploads/2017/02/16122753/tips-for-esports-commentators-tastosis-sc2.jpg","notes":"","color":"","isFloating":false,"customFields":{"music":"LoL Instrumental Loop"},"calculatedRowNumber":"2","calculatedStartTime":"09:02:00","calculatedEndTime":"09:05:00","calculatedElapsedTime":"00:02:00"},{"id":"39430a5b-8642-4c56-a9ef-5069342587a8","type":"regular","rowNumber":"3","name":"Team A Introduction","startTime":"","duration":"02:00","endTime":"","elapsedTime":"00:00","talent":"Caster: Moxie","script":"[MOXIE {Green}] Team A has had an incredible run so far, dominating the group stage with near-perfect macro play and excellent synergy. Keep your eyes on their mid laner — he''s been a difference-maker all tournament long.","gfx":"Team A stats, roster gfx","video":"Team A Hype Video","images":"https://news.illinoisstate.edu/files/2022/10/RedbirdEsports2.jpg","notes":"","color":"#86efac","isFloating":false,"customFields":{"music":"Heroic Electronic Theme"},"calculatedRowNumber":"3","calculatedStartTime":"09:05:00","calculatedEndTime":"09:07:00","calculatedElapsedTime":"00:05:00"},{"id":"e9c3d4ae-d4b4-495f-8510-ac98a24c0e0e","type":"regular","rowNumber":"4","name":"Team B Introduction","startTime":"","duration":"02:00","endTime":"","elapsedTime":"00:00","talent":"Caster: Rekkz","script":"[REKKZ {Orange}] Meanwhile, Team B has clawed their way through the lower bracket and they''ve got momentum on their side. Their aggressive bot lane duo will definitely be a factor to watch today.","gfx":"Team B stats, player cards","video":"Team B Intro Package","images":"https://imageio.forbes.com/specials-images/imageserve/616d8c011587d9604661c1d2/Marcus-Lieder-G2-Esports-Valorant/0x0.jpg?format=jpg&crop=5760,3240,x0,y313,safe&width=960","notes":"","color":"","isFloating":false,"customFields":{"music":"Rising Rock Track"},"calculatedRowNumber":"4","calculatedStartTime":"09:07:00","calculatedEndTime":"09:09:00","calculatedElapsedTime":"00:07:00"},{"id":"header_1751939988191_bdyoqqh5l","type":"header","rowNumber":"A","name":"GAME 1","startTime":"","duration":"","endTime":"","elapsedTime":"","talent":"","script":"","gfx":"","video":"","images":"","notes":"","color":"","isFloating":false,"customFields":{}},{"id":"26e74ac2-667a-45e0-bbb0-22b5519d3702","type":"regular","rowNumber":"5","name":"Game 1 Intro","startTime":"","duration":"01:00","endTime":"","elapsedTime":"00:00","talent":"Host","script":"[ALEX {Blue}] Game 1 is moments away! Let''s set the stage and see who comes out swinging in this first clash of titans.","gfx":"Match countdown","video":"Match transition animation","images":"https://www.figma.com/design/L8u3SPqxEDa8vAxlafd6DB/FORMAT-GFX?node-id=0-1&t=6AMO5H3s5mTIHLyH-1","notes":"","color":"#93c5fd","isFloating":false,"customFields":{"music":"Match Start Theme"},"calculatedRowNumber":"5","calculatedStartTime":"09:09:00","calculatedEndTime":"09:10:00","calculatedElapsedTime":"00:09:00"},{"id":"49d216c1-a103-472e-934f-51e70acd56d3","type":"regular","rowNumber":"6","name":"Game 1 – Live","startTime":"","duration":"30:00","endTime":"","elapsedTime":"00:00","talent":"Casters","script":"[MOXIE {Green}] & [REKKZ {Orange}] Welcome to Game 1 of the Clash of Champions! Team A on blue side, Team B on red. Let''s see who sets the pace early!","gfx":"In-game overlays","video":"Live Game Feed","images":"https://t3.ftcdn.net/jpg/04/84/00/06/360_F_484000681_Ek5qjaX3PgJx86VzvpXZttLCg3dKVxUo.jpg","notes":"","color":"","isFloating":false,"customFields":{"music":"In-game Audio"},"calculatedRowNumber":"6","calculatedStartTime":"09:10:00","calculatedEndTime":"09:40:00","calculatedElapsedTime":"00:10:00"}]'::jsonb,
    now(),
    now(),
    target_user_id,
    1
  );
END;
$$;

-- Update the handle_new_user function to include demo content creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_team_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  -- Create Free tier subscription for new users
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
    NEW.id,
    NEW.email,
    false,  -- Free tier is not a paid subscription
    'Free',
    1,      -- Free tier allows 1 team member
    false,
    now(),
    now()
  )
  ON CONFLICT (email) DO NOTHING;
  
  -- Get or create user team
  user_team_id := get_or_create_user_team(NEW.id);
  
  -- Create demo content for the new user
  PERFORM create_demo_content_for_user(NEW.id, user_team_id);
  
  RETURN NEW;
END;
$$;