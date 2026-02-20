ALTER TABLE team_contacts 
DROP CONSTRAINT IF EXISTS team_contacts_relationship_status_check;

ALTER TABLE team_contacts 
ADD CONSTRAINT team_contacts_relationship_status_check 
CHECK (relationship_status = ANY (ARRAY[
  'active'::text, 'suspended'::text, 'closed_success'::text, 'closed_not_now'::text,
  'observation'::text, 'potential_partner'::text, 'potential_specialist'::text
]));