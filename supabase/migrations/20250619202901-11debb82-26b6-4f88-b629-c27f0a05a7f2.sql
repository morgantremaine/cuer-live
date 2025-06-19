
-- Add a column to store logo URL in the rundowns table
ALTER TABLE public.rundowns 
ADD COLUMN logo_url text;

-- Create a storage bucket for rundown logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('rundown-logos', 'rundown-logos', true);

-- Create storage policies for rundown logos
CREATE POLICY "Users can upload rundown logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'rundown-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view rundown logos" ON storage.objects
FOR SELECT USING (bucket_id = 'rundown-logos');

CREATE POLICY "Users can update their rundown logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'rundown-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their rundown logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'rundown-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
