-- Force the specific rundown to be public
UPDATE rundowns 
SET visibility = 'public',
    updated_at = now()
WHERE id = '56160b2b-7a18-449a-8c1e-0be9cdcede00';