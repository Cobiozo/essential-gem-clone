ALTER TABLE team_contacts DROP CONSTRAINT team_contacts_relationship_status_check;
ALTER TABLE team_contacts ADD CONSTRAINT team_contacts_relationship_status_check 
  CHECK (relationship_status = ANY (ARRAY[
    'observation', 'potential_client', 'potential_partner', 
    'closed_success', 'closed_not_now',
    'active', 'suspended'
  ]));