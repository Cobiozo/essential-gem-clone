ALTER TABLE public.partner_pages
  DROP CONSTRAINT IF EXISTS partner_pages_selected_template_id_fkey;

ALTER TABLE public.partner_pages
  ADD CONSTRAINT partner_pages_selected_template_id_fkey
  FOREIGN KEY (selected_template_id)
  REFERENCES public.partner_page_template(id);