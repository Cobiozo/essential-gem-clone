-- Update storage buckets to be public for cms-images and cms-videos
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('cms-images', 'cms-videos');