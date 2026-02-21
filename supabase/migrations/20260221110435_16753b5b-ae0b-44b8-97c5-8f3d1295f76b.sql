
-- Add JSONB columns for dynamic cards, form fields, and info boxes
ALTER TABLE public.support_settings 
  ADD COLUMN IF NOT EXISTS custom_cards jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_form_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_info_boxes jsonb DEFAULT '[]'::jsonb;

-- Migrate existing data into custom_cards, custom_form_fields, custom_info_boxes
-- Only if custom_cards is empty (first migration)
UPDATE public.support_settings
SET 
  custom_cards = jsonb_build_array(
    jsonb_build_object(
      'id', 'card_email',
      'icon', COALESCE(email_icon, 'Mail'),
      'label', COALESCE(email_label, 'Email'),
      'value', COALESCE(email_address, 'support@purelife.info.pl'),
      'visible', COALESCE(email_label_visible, true),
      'position', 0
    ),
    jsonb_build_object(
      'id', 'card_phone',
      'icon', COALESCE(phone_icon, 'Phone'),
      'label', COALESCE(phone_label, 'Telefon'),
      'value', COALESCE(phone_number, '+48 123 456 789'),
      'visible', COALESCE(phone_label_visible, true),
      'position', 1
    ),
    jsonb_build_object(
      'id', 'card_hours',
      'icon', COALESCE(working_hours_icon, 'Clock'),
      'label', COALESCE(working_hours_label, 'Godziny pracy'),
      'value', COALESCE(working_hours, 'Pon-Pt: 09:00-14:00'),
      'visible', COALESCE(working_hours_label_visible, true),
      'position', 2
    )
  ),
  custom_form_fields = jsonb_build_array(
    jsonb_build_object(
      'id', 'field_name',
      'label', COALESCE(name_label, 'Imię i nazwisko'),
      'placeholder', COALESCE(name_placeholder, 'Jan Kowalski'),
      'type', 'input',
      'required', true,
      'position', 0,
      'width', 'half'
    ),
    jsonb_build_object(
      'id', 'field_email',
      'label', COALESCE(email_field_label, 'Email'),
      'placeholder', COALESCE(email_placeholder, 'jan@example.com'),
      'type', 'input',
      'required', true,
      'position', 1,
      'width', 'half'
    ),
    jsonb_build_object(
      'id', 'field_subject',
      'label', COALESCE(subject_label, 'Temat'),
      'placeholder', COALESCE(subject_placeholder, 'W czym możemy pomóc?'),
      'type', 'input',
      'required', true,
      'position', 2,
      'width', 'full'
    ),
    jsonb_build_object(
      'id', 'field_message',
      'label', COALESCE(message_label, 'Wiadomość'),
      'placeholder', COALESCE(message_placeholder, 'Opisz swoje pytanie lub problem...'),
      'type', 'textarea',
      'required', true,
      'position', 3,
      'width', 'full'
    )
  ),
  custom_info_boxes = jsonb_build_array(
    jsonb_build_object(
      'id', 'box_main',
      'icon', COALESCE(info_box_icon, 'Info'),
      'title', COALESCE(info_box_title, 'Informacja'),
      'content', COALESCE(info_box_content, 'W przypadku dużej ilości zgłoszeń odpowiedź może potrwać do 24h.'),
      'visible', true,
      'position', 0
    )
  )
WHERE custom_cards = '[]'::jsonb OR custom_cards IS NULL;
