-- Add click redirect action columns to knowledge_resources
ALTER TABLE public.knowledge_resources
ADD COLUMN allow_click_redirect boolean NOT NULL DEFAULT false,
ADD COLUMN click_redirect_url text DEFAULT NULL;