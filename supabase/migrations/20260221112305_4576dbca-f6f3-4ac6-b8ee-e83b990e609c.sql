
-- Add custom_blocks column to support_settings
ALTER TABLE public.support_settings 
  ADD COLUMN IF NOT EXISTS custom_blocks jsonb DEFAULT '[]'::jsonb;

-- Migrate existing data from custom_cards, custom_form_fields, custom_info_boxes into custom_blocks
UPDATE public.support_settings
SET custom_blocks = (
  SELECT COALESCE(jsonb_agg(block ORDER BY (block->>'position')::int), '[]'::jsonb)
  FROM (
    -- Convert cards to cards_group block
    SELECT jsonb_build_object(
      'id', 'block_cards_migrated',
      'type', 'cards_group',
      'position', 1,
      'visible', true,
      'data', jsonb_build_object('cards', COALESCE(custom_cards, '[]'::jsonb))
    ) AS block
    WHERE jsonb_array_length(COALESCE(custom_cards, '[]'::jsonb)) > 0

    UNION ALL

    -- Convert info boxes to individual info_box blocks
    SELECT jsonb_build_object(
      'id', 'block_infobox_' || (elem->>'id'),
      'type', 'info_box',
      'position', 2 + (elem->>'position')::int,
      'visible', COALESCE((elem->>'visible')::boolean, true),
      'data', jsonb_build_object(
        'icon', elem->>'icon',
        'title', elem->>'title',
        'content', elem->>'content'
      )
    ) AS block
    FROM jsonb_array_elements(COALESCE(custom_info_boxes, '[]'::jsonb)) AS elem

    UNION ALL

    -- Convert form fields to a single form block
    SELECT jsonb_build_object(
      'id', 'block_form_migrated',
      'type', 'form',
      'position', 100,
      'visible', true,
      'data', jsonb_build_object(
        'title', COALESCE(form_title, 'Napisz do nas'),
        'fields', COALESCE(custom_form_fields, '[]'::jsonb),
        'submit_text', COALESCE(submit_button_text, 'Wyślij wiadomość'),
        'success_msg', COALESCE(success_message, 'Wiadomość wysłana!'),
        'error_msg', COALESCE(error_message, 'Nie udało się wysłać wiadomości')
      )
    ) AS block
    WHERE jsonb_array_length(COALESCE(custom_form_fields, '[]'::jsonb)) > 0
  ) sub
)
WHERE jsonb_array_length(COALESCE(custom_blocks, '[]'::jsonb)) = 0
  AND (
    jsonb_array_length(COALESCE(custom_cards, '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE(custom_form_fields, '[]'::jsonb)) > 0
    OR jsonb_array_length(COALESCE(custom_info_boxes, '[]'::jsonb)) > 0
  );

-- Also add header blocks if header_title exists
UPDATE public.support_settings
SET custom_blocks = (
  jsonb_build_array(
    jsonb_build_object(
      'id', 'block_header_title',
      'type', 'heading',
      'position', 0,
      'visible', true,
      'data', jsonb_build_object('text', COALESCE(header_title, 'Wsparcie techniczne'), 'level', 'h2', 'alignment', 'center')
    ),
    jsonb_build_object(
      'id', 'block_header_desc',
      'type', 'text',
      'position', 0,
      'visible', true,
      'data', jsonb_build_object('text', COALESCE(header_description, ''), 'alignment', 'center')
    )
  ) || custom_blocks
)
WHERE header_title IS NOT NULL AND header_title != '';

-- Reindex positions sequentially
UPDATE public.support_settings
SET custom_blocks = (
  SELECT COALESCE(jsonb_agg(
    jsonb_set(elem, '{position}', to_jsonb(row_number - 1))
    ORDER BY row_number
  ), '[]'::jsonb)
  FROM (
    SELECT elem, ROW_NUMBER() OVER (ORDER BY (elem->>'position')::int) as row_number
    FROM jsonb_array_elements(custom_blocks) AS elem
  ) sub
)
WHERE jsonb_array_length(COALESCE(custom_blocks, '[]'::jsonb)) > 0;
