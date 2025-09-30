-- Enable per-cell save for test users only
UPDATE rundowns 
SET per_cell_save_enabled = true
WHERE user_id IN (
  SELECT id FROM profiles WHERE email IN ('morgan@cuer.live', 'morgantremaine@me.com')
);