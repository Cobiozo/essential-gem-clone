-- Add passive_per_client_eur column for fixed amount per client calculation
ALTER TABLE calculator_settings 
ADD COLUMN IF NOT EXISTS passive_per_client_eur DECIMAL(10,2) DEFAULT 5.00;