
-- Add editable social fields and hero_image_url to PureLifeCenter2026 template
UPDATE public.partner_page_template
SET template_data = (
  SELECT jsonb_agg(
    CASE
      WHEN el->>'id' = 'plc2026-footer' THEN
        jsonb_set(
          el,
          '{config,editable_fields}',
          '["social.facebook","social.instagram","social.linkedin","social.youtube","social.whatsapp","social.telegram","social.messenger","company_name","email","phone"]'::jsonb
        )
      WHEN el->>'id' = 'plc2026-hero' THEN
        jsonb_set(
          el,
          '{config,editable_fields}',
          '["cta_primary.url","cta_secondary.url","hero_image_url"]'::jsonb
        )
      WHEN el->>'id' = 'plc2026-partner' THEN
        jsonb_set(
          el,
          '{config,editable_fields}',
          '["partner_name","heading","image_url","cta_url"]'::jsonb
        )
      ELSE el
    END
    ORDER BY (el->>'position')::int
  )
  FROM jsonb_array_elements(template_data) AS el
),
updated_at = now()
WHERE name = 'PureLifeCenter2026';
