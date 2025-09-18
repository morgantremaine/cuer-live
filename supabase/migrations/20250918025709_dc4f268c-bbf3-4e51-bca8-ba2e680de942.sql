-- Create blog_posts table for storing blog entries
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  hero_image TEXT,
  author TEXT NOT NULL DEFAULT 'Cuer Team',
  category TEXT,
  read_time TEXT,
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  slug TEXT NOT NULL UNIQUE,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for blog posts
-- Anyone can read published blog posts
CREATE POLICY "Anyone can view published blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (true);

-- Only authorized users can create blog posts
CREATE POLICY "Authorized users can create blog posts" 
ON public.blog_posts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'morgan@cuer.live'
  )
  AND created_by = auth.uid()
);

-- Only authorized users can update their own blog posts
CREATE POLICY "Authorized users can update their own blog posts" 
ON public.blog_posts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'morgan@cuer.live'
  )
  AND created_by = auth.uid()
);

-- Only authorized users can delete their own blog posts
CREATE POLICY "Authorized users can delete their own blog posts" 
ON public.blog_posts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'morgan@cuer.live'
  )
  AND created_by = auth.uid()
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_posts_updated_at();

-- Create index on slug for faster lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);

-- Create index on publish_date for sorting
CREATE INDEX idx_blog_posts_publish_date ON public.blog_posts(publish_date DESC);

-- Create index on featured for filtering
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(featured) WHERE featured = true;