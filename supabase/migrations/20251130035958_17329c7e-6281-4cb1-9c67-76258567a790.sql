-- Add talent_presets column to blueprints table
ALTER TABLE blueprints
ADD COLUMN talent_presets JSONB DEFAULT '[]'::jsonb;