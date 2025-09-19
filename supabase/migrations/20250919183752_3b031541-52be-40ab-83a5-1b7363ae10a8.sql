-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('cms-images', 'cms-images', true),
  ('cms-videos', 'cms-videos', true);

-- Create RLS policies for cms-images bucket
CREATE POLICY "Anyone can view CMS images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cms-images');

CREATE POLICY "Admins can upload CMS images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cms-images' AND is_admin());

CREATE POLICY "Admins can update CMS images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cms-images' AND is_admin());

CREATE POLICY "Admins can delete CMS images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cms-images' AND is_admin());

-- Create RLS policies for cms-videos bucket
CREATE POLICY "Anyone can view CMS videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cms-videos');

CREATE POLICY "Admins can upload CMS videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cms-videos' AND is_admin());

CREATE POLICY "Admins can update CMS videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cms-videos' AND is_admin());

CREATE POLICY "Admins can delete CMS videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cms-videos' AND is_admin());

-- Add media columns to cms_items table
ALTER TABLE cms_items ADD COLUMN media_url TEXT;
ALTER TABLE cms_items ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video'));
ALTER TABLE cms_items ADD COLUMN media_alt_text TEXT;