ALTER TABLE public.team_contacts DROP CONSTRAINT IF EXISTS team_contacts_relationship_status_check;

ALTER TABLE public.team_contacts ADD CONSTRAINT team_contacts_relationship_status_check 
  CHECK (relationship_status IS NULL OR relationship_status = ANY (ARRAY[
    'observation'::text, 
    'potential_client'::text, 
    'potential_partner'::text, 
    'closed_success'::text, 
    'closed_not_now'::text,
    'active'::text, 
    'suspended'::text,
    'to_contact'::text
  ]));