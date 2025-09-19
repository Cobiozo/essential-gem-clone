-- Add TERMINARZ content to Strefa współpracy section
INSERT INTO public.cms_items (
  section_id, 
  type, 
  title, 
  description, 
  url, 
  position, 
  is_active
) VALUES 
-- Add TERMINARZ header
(
  '08a8d16d-9a7d-4bed-abab-356c4bc66899', 
  'description', 
  'TERMINARZ', 
  'wyłącznie dla partnerów i specjalistów', 
  NULL, 
  2, 
  true
),
-- Add Terminarz Pure Life button
(
  '08a8d16d-9a7d-4bed-abab-356c4bc66899', 
  'button', 
  'Terminarz Pure Life', 
  'Dostęp do terminarz Pure Life', 
  '#terminarz', 
  3, 
  true
);