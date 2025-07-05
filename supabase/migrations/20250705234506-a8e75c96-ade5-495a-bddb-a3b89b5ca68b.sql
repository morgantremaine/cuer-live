-- First drop the existing constraint
ALTER TABLE rundowns DROP CONSTRAINT rundowns_visibility_check;

-- Add the new constraint that includes 'public'
ALTER TABLE rundowns ADD CONSTRAINT rundowns_visibility_check 
CHECK (((visibility)::text = ANY ((ARRAY['private'::character varying, 'team'::character varying, 'public'::character varying])::text[])));

-- Now make the specific demo rundown publicly accessible
UPDATE rundowns 
SET visibility = 'public' 
WHERE id = 'e0d80b9d-5cf9-419d-bdb9-ae05e6e33dc8';