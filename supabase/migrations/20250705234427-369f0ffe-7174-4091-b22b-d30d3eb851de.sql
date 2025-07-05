-- Make the specific demo rundown publicly accessible
UPDATE rundowns 
SET visibility = 'public' 
WHERE id = 'e0d80b9d-5cf9-419d-bdb9-ae05e6e33dc8';

-- Add a comment to identify this as the demo rundown
COMMENT ON TABLE rundowns IS 'Demo rundown ID: e0d80b9d-5cf9-419d-bdb9-ae05e6e33dc8 is set to public for demo purposes';