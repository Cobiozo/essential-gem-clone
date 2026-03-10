-- Insert email event types for 12h and 2h reminders
INSERT INTO public.email_event_types (event_key, name, description, is_active)
VALUES 
  ('webinar_reminder_12h', 'Przypomnienie o webinarze (12h)', 'Automatyczne przypomnienie wysyłane 12 godzin przed webinarem', true),
  ('webinar_reminder_2h', 'Przypomnienie o webinarze (2h)', 'Automatyczne przypomnienie wysyłane 2 godziny przed webinarem', true);

-- Insert email template for 12h reminder
INSERT INTO public.email_templates (internal_name, name, subject, body_html, is_active)
VALUES (
  'webinar_reminder_12h',
  'Przypomnienie o webinarze (12h przed)',
  '⏰ Za 12 godzin! Webinar: {{event_title}}',
  '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o webinarze</h1></div><!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><tr><td style="padding: 40px 30px;"><h2 style="color: #1a1a1a; margin-bottom: 20px;">Cześć {{imię}}!</h2><p style="color: #444; font-size: 16px; line-height: 1.6;">Przypominamy, że już <strong>za 12 godzin</strong> odbędzie się webinar:</p><h3 style="color: #2563eb; margin: 20px 0;">{{event_title}}</h3><p style="color: #444; font-size: 15px; line-height: 1.8;">📅 Data: <strong>{{event_date}}</strong><br>🕐 Godzina: <strong>{{event_time}}</strong><br>👤 Prowadzący: <strong>{{host_name}}</strong></p><p style="color: #444; font-size: 15px; margin-top: 30px;">Przygotuj się na wartościowe spotkanie! Do zobaczenia! 👋</p></td></tr><tr><td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;"><p style="color: #999; font-size: 12px; margin: 0;">© 2025 Pure Life Center. Wszystkie prawa zastrzeżone.</p></td></tr></table></body></html>',
  true
);

-- Insert email template for 2h reminder
INSERT INTO public.email_templates (internal_name, name, subject, body_html, is_active)
VALUES (
  'webinar_reminder_2h',
  'Przypomnienie o webinarze (2h przed)',
  '🔔 Za 2 godziny! Webinar: {{event_title}}',
  '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Webinar już za 2 godziny!</h1></div><!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><tr><td style="padding: 40px 30px;"><h2 style="color: #1a1a1a; margin-bottom: 20px;">Cześć {{imię}}!</h2><p style="color: #444; font-size: 16px; line-height: 1.6;">Już <strong>za 2 godziny</strong> startuje webinar:</p><h3 style="color: #16a34a; margin: 20px 0;">{{event_title}}</h3><p style="color: #444; font-size: 15px; line-height: 1.8;">📅 Data: <strong>{{event_date}}</strong><br>🕐 Godzina: <strong>{{event_time}}</strong><br>👤 Prowadzący: <strong>{{host_name}}</strong></p><div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px 20px; margin: 25px 0; border-radius: 4px;"><p style="color: #15803d; font-size: 15px; margin: 0;">⏰ Link do dołączenia otrzymasz w kolejnym przypomnieniu — <strong>1 godzinę</strong> i <strong>15 minut</strong> przed startem.</p></div><p style="color: #444; font-size: 15px; margin-top: 30px;">Zarezerwuj czas i przygotuj się! Do zobaczenia wkrótce! 🎉</p></td></tr><tr><td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;"><p style="color: #999; font-size: 12px; margin: 0;">© 2025 Pure Life Center. Wszystkie prawa zastrzeżone.</p></td></tr></table></body></html>',
  true
);