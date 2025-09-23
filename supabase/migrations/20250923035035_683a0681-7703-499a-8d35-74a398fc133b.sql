-- Add AI summaries column to blueprints table
ALTER TABLE public.blueprints 
ADD COLUMN ai_summaries jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.blueprints.ai_summaries IS 'Stores AI-generated summaries for rundown sections, shared across team members';