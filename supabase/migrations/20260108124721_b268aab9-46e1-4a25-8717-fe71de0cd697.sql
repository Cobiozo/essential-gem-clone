-- Add bypass_key column to maintenance_mode table
ALTER TABLE public.maintenance_mode 
ADD COLUMN IF NOT EXISTS bypass_key TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- Update existing record to have a bypass key
UPDATE public.maintenance_mode 
SET bypass_key = encode(gen_random_bytes(16), 'hex') 
WHERE bypass_key IS NULL;