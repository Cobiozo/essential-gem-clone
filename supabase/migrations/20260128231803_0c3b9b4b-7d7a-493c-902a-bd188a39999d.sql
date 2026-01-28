-- Add new email template for 15-minute meeting reminder
INSERT INTO email_templates (name, internal_name, subject, body_html, footer_html, is_active, variables)
VALUES (
  'Przypomnienie o spotkaniu (15 min)',
  'meeting_reminder_15min',
  '⏰ Spotkanie za 15 minut: {{temat}} o {{godzina_spotkania}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a365d;">⏰ Spotkanie zaczyna się za 15 minut!</h2>
    <p>Cześć {{imię}},</p>
    <p>Twoje spotkanie <strong>{{temat}}</strong> rozpocznie się o <strong>{{godzina_spotkania}}</strong>.</p>
    <p>📅 <strong>{{data_spotkania}}</strong></p>
    <p>Pokój spotkania będzie otwarty 5 minut przed czasem.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{zoom_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Dołącz do spotkania
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">Jeśli link nie działa, skopiuj i wklej ten adres do przeglądarki:<br>{{zoom_link}}</p>
  </div>',
  '<p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">Pozdrawiamy,<br>Zespół Pure Life</p>',
  true,
  '["imię", "temat", "data_spotkania", "godzina_spotkania", "druga_strona", "zoom_link"]'::jsonb
)
ON CONFLICT (internal_name) DO NOTHING;

-- Update meeting_reminder_1h template to include zoom_link variable
UPDATE email_templates 
SET body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a365d;">📅 Przypomnienie o spotkaniu za 1 godzinę</h2>
    <p>Cześć {{imię}},</p>
    <p>Przypominamy o zbliżającym się spotkaniu <strong>{{temat}}</strong>.</p>
    <p>📅 <strong>{{data_spotkania}}</strong> o godzinie <strong>{{godzina_spotkania}}</strong></p>
    <p>👤 Spotkanie z: <strong>{{druga_strona}}</strong></p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{zoom_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Dołącz do spotkania
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">Pokój spotkania będzie otwarty 5 minut przed czasem.</p>
    <p style="color: #666; font-size: 14px;">Jeśli link nie działa, skopiuj i wklej ten adres do przeglądarki:<br>{{zoom_link}}</p>
  </div>',
    variables = '["imię", "temat", "data_spotkania", "godzina_spotkania", "druga_strona", "zoom_link", "adnotacja_trojstronna"]'::jsonb
WHERE internal_name = 'meeting_reminder_1h';