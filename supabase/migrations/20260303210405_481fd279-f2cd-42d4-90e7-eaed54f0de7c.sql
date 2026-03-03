
-- 1. Create email template for contact reminders
INSERT INTO public.email_templates (
  id,
  internal_name,
  name,
  subject,
  body_html,
  footer_html,
  is_active,
  editor_mode,
  variables
) VALUES (
  gen_random_uuid(),
  'contact_reminder_notification',
  'Przypomnienie o kontakcie',
  'Przypomnienie: {{kontakt}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333;">🔔 Przypomnienie o kontakcie</h2>
    <p style="font-size: 16px; color: #555;">Cześć <strong>{{imię}}</strong>,</p>
    <p style="font-size: 15px; color: #555;">Masz zaplanowane przypomnienie dotyczące kontaktu:</p>
    <div style="background: #f9f9f9; border-left: 4px solid #d4a843; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 5px 0;"><strong>Kontakt:</strong> {{kontakt}}</p>
      <p style="margin: 5px 0;"><strong>Notatka:</strong> {{notatka}}</p>
      <p style="margin: 5px 0;"><strong>Data przypomnienia:</strong> {{data_przypomnienia}}</p>
    </div>
    <p style="font-size: 14px; color: #555;">Przejdź do swoich kontaktów, aby podjąć działanie:</p>
    <a href="{{link}}" style="display: inline-block; background: #d4a843; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Otwórz kontakty</a>
  </div>',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 15px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
    <p>Ta wiadomość została wysłana automatycznie z systemu Pure Life.</p>
  </div>',
  true,
  'html',
  '["imię", "nazwisko", "kontakt", "notatka", "data_przypomnienia", "link"]'::jsonb
);

-- 2. Update notification_event_types to activate contact_reminder and link email template
UPDATE public.notification_event_types
SET 
  is_active = true,
  send_email = true,
  email_template_id = (
    SELECT id FROM public.email_templates 
    WHERE internal_name = 'contact_reminder_notification' 
    LIMIT 1
  ),
  updated_at = now()
WHERE event_key = 'contact_reminder';
