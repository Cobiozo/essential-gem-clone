

# Fix: Foreign key mismatch on template selection

## Problem
The `partner_pages.selected_template_id` column has a foreign key pointing to `partner_page_templates_gallery` (an older/separate table), but the code reads templates from `partner_page_template`. When a partner tries to select a template, the ID from `partner_page_template` doesn't exist in `partner_page_templates_gallery`, causing the FK violation error.

## Solution
Change the foreign key on `partner_pages.selected_template_id` to reference `partner_page_template` instead of `partner_page_templates_gallery`.

### Migration SQL
1. Drop the existing FK constraint `partner_pages_selected_template_id_fkey`
2. Add a new FK constraint referencing `partner_page_template(id)`

```sql
ALTER TABLE public.partner_pages
  DROP CONSTRAINT partner_pages_selected_template_id_fkey;

ALTER TABLE public.partner_pages
  ADD CONSTRAINT partner_pages_selected_template_id_fkey
  FOREIGN KEY (selected_template_id)
  REFERENCES public.partner_page_template(id);
```

No code changes needed — the frontend already queries `partner_page_template` correctly.

