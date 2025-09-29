-- Set file size limit for training-media bucket to 100MB
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'training-media';