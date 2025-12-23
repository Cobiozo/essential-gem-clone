-- Add default email templates for each event type

-- Template: User Registration (Welcome email)
INSERT INTO email_templates (name, internal_name, subject, body_html, body_text, footer_html, is_active, variables)
VALUES (
  'Powitanie po rejestracji',
  'welcome_registration',
  'Witamy w Pure Life, {{imię}}! 🌿',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Witamy w rodzinie Pure Life, {{imię}}! 🎉</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Cieszymy się, że do nas dołączasz! Twoja rejestracja przebiegła pomyślnie.
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Teraz Twoje konto oczekuje na zatwierdzenie przez opiekuna oraz administratora. Poinformujemy Cię mailowo, gdy Twoje konto zostanie w pełni aktywowane.
    </p>
    
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">Twoje dane rejestracyjne:</h3>
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>Email:</strong> {{email}}<br>
        <strong>Rola:</strong> {{rola}}
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      W razie pytań, skontaktuj się ze swoim opiekunem lub napisz do nas.<br><br>
      Pozdrawiamy serdecznie,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>',
  'Witamy w rodzinie Pure Life, {{imię}}!

Cieszymy się, że do nas dołączasz! Twoja rejestracja przebiegła pomyślnie.

Twoje dane:
Email: {{email}}
Rola: {{rola}}

Teraz Twoje konto oczekuje na zatwierdzenie przez opiekuna oraz administratora.

Pozdrawiamy,
Zespół Pure Life',
  '<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>
  <p style="color: #9ca3af; font-size: 11px; margin: 0;">Otrzymujesz tę wiadomość, ponieważ zarejestrowałeś się w systemie Pure Life.</p>
</div>',
  true,
  '[{"name": "imię", "description": "Imię użytkownika"}, {"name": "nazwisko", "description": "Nazwisko użytkownika"}, {"name": "email", "description": "Adres e-mail"}, {"name": "rola", "description": "Rola użytkownika"}]'
) ON CONFLICT (internal_name) DO NOTHING;

-- Template: Password Reset
INSERT INTO email_templates (name, internal_name, subject, body_html, body_text, footer_html, is_active, variables)
VALUES (
  'Reset hasła',
  'password_reset',
  'Resetowanie hasła do konta Pure Life',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Resetowanie hasła</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Cześć {{imię}},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij poniższy przycisk, aby ustawić nowe hasło:
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{link_resetowania}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Zresetuj hasło
      </a>
    </div>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        ⚠️ Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>',
  'Cześć {{imię}},

Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.

Kliknij ten link, aby ustawić nowe hasło: {{link_resetowania}}

Link jest ważny przez 1 godzinę.

Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.

Pozdrawiamy,
Zespół Pure Life',
  '<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>
</div>',
  true,
  '[{"name": "imię", "description": "Imię użytkownika"}, {"name": "link_resetowania", "description": "Link do resetowania hasła"}]'
) ON CONFLICT (internal_name) DO NOTHING;

-- Template: Password Changed
INSERT INTO email_templates (name, internal_name, subject, body_html, body_text, footer_html, is_active, variables)
VALUES (
  'Potwierdzenie zmiany hasła',
  'password_changed',
  'Twoje hasło zostało zmienione',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">✅ Hasło zostało zmienione</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Cześć {{imię}},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Potwierdzamy, że hasło do Twojego konta Pure Life zostało pomyślnie zmienione.
    </p>
    
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="color: #166534; margin: 0; font-size: 14px;">
        <strong>Data zmiany:</strong> {{data}}, {{godzina}}
      </p>
    </div>
    
    <div style="background-color: #fef2f2; border-radius: 8px; padding: 15px; margin: 25px 0;">
      <p style="color: #dc2626; margin: 0; font-size: 14px;">
        🚨 Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z nami i zresetuj swoje hasło!
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>',
  'Cześć {{imię}},

Potwierdzamy, że hasło do Twojego konta Pure Life zostało pomyślnie zmienione.

Data zmiany: {{data}}, {{godzina}}

Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z nami!

Pozdrawiamy,
Zespół Pure Life',
  '<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>
</div>',
  true,
  '[{"name": "imię", "description": "Imię użytkownika"}, {"name": "data", "description": "Data zmiany"}, {"name": "godzina", "description": "Godzina zmiany"}]'
) ON CONFLICT (internal_name) DO NOTHING;

-- Template: First Login
INSERT INTO email_templates (name, internal_name, subject, body_html, body_text, footer_html, is_active, variables)
VALUES (
  'Powitanie po pierwszym logowaniu',
  'first_login_welcome',
  'Twoja przygoda z Pure Life się zaczyna! 🚀',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Świetnie, {{imię}}! 🎉</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Właśnie zalogowałeś się po raz pierwszy do swojego konta Pure Life. To początek Twojej drogi do zdrowszego stylu życia!
    </p>
    
    <h3 style="color: #1f2937; font-size: 18px; margin: 25px 0 15px 0;">Co możesz teraz zrobić:</h3>
    
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <ul style="color: #166534; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
        <li>📚 Przeglądaj Bazę Wiedzy i materiały szkoleniowe</li>
        <li>👥 Sprawdź swoje kontakty zespołu</li>
        <li>🧭 Skorzystaj z AI Kompasu do planowania działań</li>
        <li>📝 Uzupełnij swój profil</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{link_aktywacyjny}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Przejdź do panelu
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      W razie pytań, Twój opiekun jest do Twojej dyspozycji!<br><br>
      Powodzenia!<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>',
  'Świetnie, {{imię}}!

Właśnie zalogowałeś się po raz pierwszy do swojego konta Pure Life.

Co możesz teraz zrobić:
- Przeglądaj Bazę Wiedzy i materiały szkoleniowe
- Sprawdź swoje kontakty zespołu
- Skorzystaj z AI Kompasu
- Uzupełnij swój profil

Przejdź do panelu: {{link_aktywacyjny}}

Powodzenia!
Zespół Pure Life',
  '<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>
</div>',
  true,
  '[{"name": "imię", "description": "Imię użytkownika"}, {"name": "link_aktywacyjny", "description": "Link do panelu"}]'
) ON CONFLICT (internal_name) DO NOTHING;

-- Template: Reminder
INSERT INTO email_templates (name, internal_name, subject, body_html, body_text, footer_html, is_active, variables)
VALUES (
  'Przypomnienie systemowe',
  'system_reminder',
  'Przypomnienie od Pure Life',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">🔔 Przypomnienie</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Cześć {{imię}},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Mamy dla Ciebie przypomnienie. Sprawdź szczegóły poniżej.
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0;">
      <p style="color: #92400e; margin: 0; font-size: 15px;">
        Treść przypomnienia...
      </p>
    </div>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{link_aktywacyjny}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Sprawdź teraz
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>',
  'Cześć {{imię}},

Mamy dla Ciebie przypomnienie.

Sprawdź szczegóły: {{link_aktywacyjny}}

Pozdrawiamy,
Zespół Pure Life',
  '<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>
</div>',
  true,
  '[{"name": "imię", "description": "Imię użytkownika"}, {"name": "link_aktywacyjny", "description": "Link do akcji"}]'
) ON CONFLICT (internal_name) DO NOTHING;

-- Template: Admin Action
INSERT INTO email_templates (name, internal_name, subject, body_html, body_text, footer_html, is_active, variables)
VALUES (
  'Powiadomienie od administratora',
  'admin_notification',
  'Wiadomość od administracji Pure Life',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
    <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/pure-life-logo.png" alt="Pure Life" style="max-height: 60px; max-width: 200px;">
  </div>
  
  <div style="padding: 40px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">📢 Wiadomość od administracji</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Cześć {{imię}},
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Administrator wykonał akcję dotyczącą Twojego konta lub systemu.
    </p>
    
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="color: #1e40af; margin: 0; font-size: 14px;">
        <strong>Szczegóły akcji:</strong><br>
        Treść wiadomości od administratora...
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      W razie pytań, skontaktuj się z administracją.<br><br>
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</div>',
  'Cześć {{imię}},

Administrator wykonał akcję dotyczącą Twojego konta lub systemu.

W razie pytań, skontaktuj się z administracją.

Pozdrawiamy,
Zespół Pure Life',
  '<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>
</div>',
  true,
  '[{"name": "imię", "description": "Imię użytkownika"}]'
) ON CONFLICT (internal_name) DO NOTHING;

-- Link templates to events
-- Link: welcome_registration -> user_registration
INSERT INTO email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM email_templates t, email_event_types e
WHERE t.internal_name = 'welcome_registration' AND e.event_key = 'user_registration'
ON CONFLICT DO NOTHING;

-- Link: password_reset -> password_reset
INSERT INTO email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM email_templates t, email_event_types e
WHERE t.internal_name = 'password_reset' AND e.event_key = 'password_reset'
ON CONFLICT DO NOTHING;

-- Link: password_changed -> password_changed
INSERT INTO email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM email_templates t, email_event_types e
WHERE t.internal_name = 'password_changed' AND e.event_key = 'password_changed'
ON CONFLICT DO NOTHING;

-- Link: first_login_welcome -> first_login
INSERT INTO email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM email_templates t, email_event_types e
WHERE t.internal_name = 'first_login_welcome' AND e.event_key = 'first_login'
ON CONFLICT DO NOTHING;

-- Link: system_reminder -> reminder
INSERT INTO email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM email_templates t, email_event_types e
WHERE t.internal_name = 'system_reminder' AND e.event_key = 'reminder'
ON CONFLICT DO NOTHING;

-- Link: admin_notification -> admin_action
INSERT INTO email_template_events (template_id, event_type_id)
SELECT t.id, e.id
FROM email_templates t, email_event_types e
WHERE t.internal_name = 'admin_notification' AND e.event_key = 'admin_action'
ON CONFLICT DO NOTHING;