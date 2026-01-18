-- Update max_clients from 500 to 15000 for specialist calculator
UPDATE specialist_calculator_settings 
SET max_clients = 15000, updated_at = now()
WHERE max_clients = 500;