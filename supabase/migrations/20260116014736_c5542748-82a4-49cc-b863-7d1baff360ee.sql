-- Faza 1: Dodanie nowych typów zdarzeń email dla webinarów
INSERT INTO email_event_types (event_key, name, description, is_active) VALUES
  ('webinar_reminder_24h', 'Przypomnienie o webinarze (24h)', 'Wysyłane automatycznie 24 godziny przed webinarem', true),
  ('webinar_reminder_1h', 'Przypomnienie o webinarze (1h)', 'Wysyłane automatycznie 1 godzinę przed webinarem', true),
  ('webinar_confirmation', 'Potwierdzenie rejestracji na webinar', 'Wysyłane po rejestracji gościa na webinar', true)
ON CONFLICT (event_key) DO NOTHING;

-- Faza 2: Dodanie kolumn do śledzenia przypomnień 1h przed
ALTER TABLE guest_event_registrations
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

-- Faza 3: Dodanie szablonów email dla webinarów
INSERT INTO email_templates (internal_name, name, subject, body_html, body_text, is_active, variables) VALUES
(
  'webinar_reminder_24h',
  'Przypomnienie o webinarze (24h przed)',
  '⏰ Już jutro! Webinar: {{event_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">Cześć {{imię}}!</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Przypominamy, że już <strong>jutro</strong> odbędzie się webinar:</p>
        <h3 style="color: #2563eb; margin: 20px 0;">{{event_title}}</h3>
        <p style="color: #444; font-size: 15px; line-height: 1.8;">
          📅 Data: <strong>{{event_date}}</strong><br>
          🕐 Godzina: <strong>{{event_time}}</strong><br>
          👤 Prowadzący: <strong>{{host_name}}</strong>
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="{{zoom_link}}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            🔗 Dołącz do webinaru na Zoom
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Link do spotkania: <a href="{{zoom_link}}" style="color: #2563eb;">{{zoom_link}}</a>
        </p>
        <p style="color: #444; font-size: 15px; margin-top: 30px;">Do zobaczenia jutro! 👋</p>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Cześć {{imię}}! Przypominamy, że już jutro odbędzie się webinar: {{event_title}}. Data: {{event_date}}, Godzina: {{event_time}}, Prowadzący: {{host_name}}. Link do Zoom: {{zoom_link}}',
  true,
  '["imię", "event_title", "event_date", "event_time", "host_name", "zoom_link"]'::jsonb
),
(
  'webinar_reminder_1h',
  'Przypomnienie o webinarze (1h przed)',
  '🔔 Za godzinę! Webinar: {{event_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">{{imię}}, zaczynamy za godzinę! 🚀</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          Webinar <strong style="color: #16a34a;">{{event_title}}</strong> rozpocznie się o <strong>{{event_time}}</strong>.
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="{{zoom_link}}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px;">
            🚀 DOŁĄCZ TERAZ DO ZOOM
          </a>
        </p>
        <p style="color: #666; font-size: 14px; text-align: center;">
          Link do spotkania: <a href="{{zoom_link}}" style="color: #16a34a;">{{zoom_link}}</a>
        </p>
        <p style="color: #444; font-size: 15px; line-height: 1.8; margin-top: 25px;">
          📅 Data: <strong>{{event_date}}</strong><br>
          👤 Prowadzący: <strong>{{host_name}}</strong>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 6px;">
          📝 Nie zapomnij przygotować notatnika!
        </p>
      </td>
    </tr>
  </table>
</body>
</html>',
  '{{imię}}, zaczynamy za godzinę! Webinar {{event_title}} rozpocznie się o {{event_time}}. DOŁĄCZ TERAZ: {{zoom_link}}. Prowadzący: {{host_name}}.',
  true,
  '["imię", "event_title", "event_date", "event_time", "host_name", "zoom_link"]'::jsonb
),
(
  'webinar_confirmation',
  'Potwierdzenie rejestracji na webinar',
  '✅ Zapisano! {{event_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #16a34a; margin-bottom: 20px;">✅ Rejestracja potwierdzona!</h2>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Cześć <strong>{{imię}}</strong>!</p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">Twoja rejestracja na webinar została potwierdzona:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">{{event_title}}</h3>
          <p style="color: #444; font-size: 15px; line-height: 1.8; margin: 0;">
            📅 Data: <strong>{{event_date}}</strong><br>
            🕐 Godzina: <strong>{{event_time}}</strong><br>
            👤 Prowadzący: <strong>{{host_name}}</strong>
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Wyślemy Ci przypomnienie 24 godziny oraz 1 godzinę przed rozpoczęciem webinaru z linkiem do dołączenia.
        </p>
        <p style="color: #444; font-size: 15px; margin-top: 25px;">Do zobaczenia! 👋</p>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Cześć {{imię}}! Twoja rejestracja na webinar {{event_title}} została potwierdzona. Data: {{event_date}}, Godzina: {{event_time}}, Prowadzący: {{host_name}}. Wyślemy Ci przypomnienie przed rozpoczęciem.',
  true,
  '["imię", "event_title", "event_date", "event_time", "host_name"]'::jsonb
)
ON CONFLICT (internal_name) DO NOTHING;

-- Faza 4: Powiązanie szablonów ze zdarzeniami
INSERT INTO email_template_events (event_type_id, template_id)
SELECT et.id, t.id
FROM email_event_types et
CROSS JOIN email_templates t
WHERE (et.event_key = 'webinar_reminder_24h' AND t.internal_name = 'webinar_reminder_24h')
   OR (et.event_key = 'webinar_reminder_1h' AND t.internal_name = 'webinar_reminder_1h')
   OR (et.event_key = 'webinar_confirmation' AND t.internal_name = 'webinar_confirmation')
ON CONFLICT DO NOTHING;