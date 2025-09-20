-- Add hover state styling fields to cms_sections
ALTER TABLE public.cms_sections 
ADD COLUMN hover_background_color text,
ADD COLUMN hover_background_gradient text,
ADD COLUMN hover_text_color text,
ADD COLUMN hover_border_color text,
ADD COLUMN hover_box_shadow text,
ADD COLUMN hover_opacity integer,
ADD COLUMN hover_scale numeric DEFAULT 1.0,
ADD COLUMN hover_transition_duration integer DEFAULT 300;