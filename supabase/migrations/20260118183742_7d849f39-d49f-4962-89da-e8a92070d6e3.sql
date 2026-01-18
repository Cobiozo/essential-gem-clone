-- Create email templates for individual meeting notifications

-- Template 1: New booking notification for leader/host
INSERT INTO email_templates (name, internal_name, subject, body_html, is_active, variables) VALUES (
  'Nowa rezerwacja spotkania indywidualnego',
  'individual_meeting_booked',
  '📅 Nowa rezerwacja: {{temat}} - {{data_spotkania}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nowe spotkanie zarezerwowane</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📅 Nowe spotkanie zarezerwowane</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Cześć <strong>{{imię}}</strong>!</p>
    
    <p style="font-size: 16px;">{{imie_rezerwujacego}} {{nazwisko_rezerwujacego}} zarezerwował(a) z Tobą spotkanie.</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">📋 Temat:</td>
          <td style="padding: 8px 0;">{{temat}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📅 Data:</td>
          <td style="padding: 8px 0;">{{data_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Godzina:</td>
          <td style="padding: 8px 0;">{{godzina_spotkania}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #666;">Spotkanie zostało dodane do Twojego kalendarza w aplikacji.</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</body>
</html>',
  true,
  '["imię", "temat", "data_spotkania", "godzina_spotkania", "imie_rezerwujacego", "nazwisko_rezerwujacego"]'
);

-- Template 2: Booking confirmation for the person who booked
INSERT INTO email_templates (name, internal_name, subject, body_html, is_active, variables) VALUES (
  'Potwierdzenie rezerwacji spotkania',
  'individual_meeting_confirmed',
  '✅ Spotkanie zarezerwowane: {{temat}} - {{data_spotkania}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Potwierdzenie rezerwacji</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Spotkanie zarezerwowane!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Cześć <strong>{{imię}}</strong>!</p>
    
    <p style="font-size: 16px;">Twoje spotkanie z <strong>{{imie_lidera}} {{nazwisko_lidera}}</strong> zostało zarezerwowane.</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">📋 Temat:</td>
          <td style="padding: 8px 0;">{{temat}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📅 Data:</td>
          <td style="padding: 8px 0;">{{data_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Godzina:</td>
          <td style="padding: 8px 0;">{{godzina_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">👤 Prowadzący:</td>
          <td style="padding: 8px 0;">{{imie_lidera}} {{nazwisko_lidera}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #666;">Pamiętaj o spotkaniu! Link do Zoom znajdziesz w aplikacji w widżecie "Moje spotkania".</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</body>
</html>',
  true,
  '["imię", "temat", "data_spotkania", "godzina_spotkania", "imie_lidera", "nazwisko_lidera"]'
);

-- Template 3: Meeting cancelled notification
INSERT INTO email_templates (name, internal_name, subject, body_html, is_active, variables) VALUES (
  'Spotkanie indywidualne odwołane',
  'individual_meeting_cancelled',
  '❌ Spotkanie odwołane: {{temat}} - {{data_spotkania}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Spotkanie odwołane</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">❌ Spotkanie odwołane</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Cześć <strong>{{imię}}</strong>!</p>
    
    <p style="font-size: 16px;">Niestety spotkanie zostało odwołane przez {{kto_odwolal}}.</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">📋 Temat:</td>
          <td style="padding: 8px 0;">{{temat}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📅 Data:</td>
          <td style="padding: 8px 0;">{{data_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Godzina:</td>
          <td style="padding: 8px 0;">{{godzina_spotkania}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #666;">Jeśli chcesz umówić nowy termin, możesz to zrobić w aplikacji w sekcji "Spotkania indywidualne".</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</body>
</html>',
  true,
  '["imię", "temat", "data_spotkania", "godzina_spotkania", "kto_odwolal"]'
);

-- Associate templates with event types
UPDATE notification_event_types 
SET email_template_id = (SELECT id FROM email_templates WHERE internal_name = 'individual_meeting_booked' LIMIT 1),
    send_email = true
WHERE event_key = 'meeting_booked';

UPDATE notification_event_types 
SET email_template_id = (SELECT id FROM email_templates WHERE internal_name = 'individual_meeting_confirmed' LIMIT 1),
    send_email = true
WHERE event_key = 'meeting_confirmed';

UPDATE notification_event_types 
SET email_template_id = (SELECT id FROM email_templates WHERE internal_name = 'individual_meeting_cancelled' LIMIT 1),
    send_email = true
WHERE event_key = 'event_cancelled';