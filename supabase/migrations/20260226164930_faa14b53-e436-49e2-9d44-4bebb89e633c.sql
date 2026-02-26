-- 1. Add reminder_15min columns to guest_event_registrations
ALTER TABLE public.guest_event_registrations 
ADD COLUMN IF NOT EXISTS reminder_15min_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_15min_sent_at timestamptz;

-- 2. Add email template for webinar_reminder_15min
INSERT INTO public.email_templates (internal_name, name, subject, body_html, body_text, is_active, variables)
VALUES (
  'webinar_reminder_15min',
  'Przypomnienie o webinarze (15 min przed)',
  '🔴 Za 15 minut! Webinar: {{event_title}}',
  '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Webinar za 15 minut!</h1></div><!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">{{imię}}, zaczynamy za 15 minut! ⏰</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          Webinar <strong style="color: #dc2626;">{{event_title}}</strong> rozpocznie się o <strong>{{event_time}}</strong>.
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="{{zoom_link}}" style="display: inline-block; background: #dc2626; color: white; padding: 18px 36px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 20px;">
            🔴 DOŁĄCZ TERAZ DO ZOOM
          </a>
        </p>
        <p style="color: #666; font-size: 14px; text-align: center;">
          Link do spotkania: <a href="{{zoom_link}}" style="color: #dc2626;">{{zoom_link}}</a>
        </p>
        <p style="color: #444; font-size: 15px; line-height: 1.8; margin-top: 25px;">
          📅 Data: <strong>{{event_date}}</strong><br>
          👤 Prowadzący: <strong>{{host_name}}</strong>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
          🎯 Upewnij się, że masz stabilne połączenie internetowe i wygodne słuchawki!
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">Zespół Pure Life Center</p>
        <p style="color: #aaa; font-size: 11px; margin: 5px 0 0;">© 2025 Pure Life Center. Wszelkie prawa zastrzeżone.</p>
        <p style="color: #aaa; font-size: 11px; margin: 5px 0 0;">Kontakt: support@purelife.info.pl</p>
      </td>
    </tr>
  </table>
</body>
</html>',
  NULL,
  true,
  '["imię", "event_title", "event_date", "event_time", "zoom_link", "host_name"]'::jsonb
);

-- 3. Add email event type
INSERT INTO public.email_event_types (event_key, name, description, is_active)
VALUES ('webinar_reminder_15min', 'Przypomnienie o webinarze (15 min)', 'Automatyczne przypomnienie 15 minut przed webinarem z linkiem', true)
ON CONFLICT DO NOTHING;