
UPDATE partner_page_template 
SET template_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      template_data,
      '{1,config,hero_image_mode}',
      '"full-bleed"'
    ),
    '{1,config,cta_secondary_bg_color}',
    '"#f0e4c9"'
  ),
  '{1,config,cta_secondary_text_color}',
  '"#333333"'
)
WHERE id = '9abb203f-ca07-41bd-8eb9-890bcc5b9fb0';
