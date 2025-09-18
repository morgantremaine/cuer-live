-- Create table for tracking blog post page views
CREATE TABLE public.blog_post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_blog_post_views_post_id FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE
);

-- Create unique constraint to ensure one record per post
CREATE UNIQUE INDEX idx_blog_post_views_post_id ON public.blog_post_views(post_id);

-- Enable RLS
ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view page view counts" 
ON public.blog_post_views 
FOR SELECT 
USING (true);

CREATE POLICY "System can increment page views" 
ON public.blog_post_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update page views" 
ON public.blog_post_views 
FOR UPDATE 
USING (true);

-- Create function to increment page views
CREATE OR REPLACE FUNCTION public.increment_blog_post_view(post_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.blog_post_views (post_id, view_count, last_viewed_at, updated_at)
  VALUES (post_uuid, 1, now(), now())
  ON CONFLICT (post_id) 
  DO UPDATE SET 
    view_count = blog_post_views.view_count + 1,
    last_viewed_at = now(),
    updated_at = now();
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_blog_post_views_updated_at
  BEFORE UPDATE ON public.blog_post_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();