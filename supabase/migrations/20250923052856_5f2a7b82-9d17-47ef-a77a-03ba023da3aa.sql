-- Create storage bucket for Stream Deck plugin files
INSERT INTO storage.buckets (id, name, public) VALUES ('stream-deck-plugin', 'stream-deck-plugin', true);

-- Create policy to allow public access to plugin files
CREATE POLICY "Public Access to Stream Deck Plugin Files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'stream-deck-plugin');