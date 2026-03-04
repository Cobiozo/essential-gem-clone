ALTER TABLE team_contacts 
ADD COLUMN IF NOT EXISTS second_contact_date date,
ADD COLUMN IF NOT EXISTS first_contact_annotation text;