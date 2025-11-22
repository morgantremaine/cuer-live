-- Add MOS trigger control fields to rundowns table
ALTER TABLE rundowns 
  ADD COLUMN IF NOT EXISTS mos_trigger_on_showcaller boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS mos_trigger_on_editorial boolean DEFAULT true;

COMMENT ON COLUMN rundowns.mos_trigger_on_showcaller IS 'Send MOS messages when showcaller advances to a new segment';
COMMENT ON COLUMN rundowns.mos_trigger_on_editorial IS 'Send MOS messages when segments are reordered or floated/unfloated';

-- Add isFloating to standard columns available for MOS mapping
-- (This is just a documentation comment as the field already exists in items jsonb)