UPDATE public.partner_page_template
SET template_data = (
  SELECT jsonb_agg(
    CASE
      WHEN el->>'id' = 'plc2026-partner' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(
              el #- '{config,text_color}',
              '{config,overlay_opacity}',
              '0.12'::jsonb
            ),
            '{config,items}',
            '[
              {"icon":"check","text":"Pomagam ludziom zadbać o zdrowie i samopoczucie dzięki naturalnym suplementom diety najwyższej jakości."},
              {"icon":"check","text":"Sam dbam o zdrowie w ten sposób i chętnie dzielę się swoim doświadczeniem."},
              {"icon":"check","text":"Jeśli czujesz, że to coś dla Ciebie — zapraszam do kontaktu. Chętnie opowiem Ci więcej!"}
            ]'::jsonb
          ),
          '{config,heading}',
          '"Zmieniamy zdrowie i życie ludzi na lepsze."'::jsonb
        )
      ELSE el
    END
    ORDER BY (el->>'position')::int
  )
  FROM jsonb_array_elements(template_data) AS el
),
updated_at = now()
WHERE name = 'PureLifeCenter2026';