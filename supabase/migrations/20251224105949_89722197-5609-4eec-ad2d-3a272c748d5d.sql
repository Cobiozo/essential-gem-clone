-- Zdarzenie: Reset hasła (przez użytkownika)
INSERT INTO notification_event_types (event_key, name, description, source_module, icon_name, color, send_email, email_template_id, is_active)
SELECT 'password_reset', 'Reset hasła', 'Wysyłany gdy użytkownik resetuje hasło', 'auth', 'KeyRound', '#f59e0b', true, 
  (SELECT id FROM email_templates WHERE internal_name = 'password_reset' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM notification_event_types WHERE event_key = 'password_reset');

-- Zdarzenie: Zmiana hasła
INSERT INTO notification_event_types (event_key, name, description, source_module, icon_name, color, send_email, email_template_id, is_active)
SELECT 'password_changed', 'Zmiana hasła', 'Potwierdzenie zmiany hasła', 'auth', 'ShieldCheck', '#10b981', true,
  (SELECT id FROM email_templates WHERE internal_name = 'password_changed' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM notification_event_types WHERE event_key = 'password_changed');

-- Zdarzenie: Pierwsze logowanie
INSERT INTO notification_event_types (event_key, name, description, source_module, icon_name, color, send_email, email_template_id, is_active)
SELECT 'first_login', 'Pierwsze logowanie', 'Powitanie po pierwszym logowaniu', 'auth', 'Sparkles', '#8b5cf6', true,
  (SELECT id FROM email_templates WHERE internal_name = 'first_login_welcome' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM notification_event_types WHERE event_key = 'first_login');

-- Zdarzenie: Zatwierdzenie konta (welcome email po zatwierdzeniu przez admina)
INSERT INTO notification_event_types (event_key, name, description, source_module, icon_name, color, send_email, email_template_id, is_active)
SELECT 'account_approved', 'Zatwierdzenie konta', 'Email powitalny po zatwierdzeniu przez admina', 'admin', 'UserCheck', '#22c55e', true,
  (SELECT id FROM email_templates WHERE internal_name = 'welcome_registration' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM notification_event_types WHERE event_key = 'account_approved');

-- Aktywuj szablon training_assigned
UPDATE email_templates SET is_active = true WHERE internal_name = 'training_assigned';

-- Włącz wysyłkę email dla zdarzenia training_assigned
UPDATE notification_event_types SET send_email = true WHERE event_key = 'training_assigned';

-- Aktywuj szablon specialist_message
UPDATE email_templates SET is_active = true WHERE internal_name = 'specialist_message';

-- Włącz wysyłkę email dla zdarzenia specialist_message
UPDATE notification_event_types SET send_email = true WHERE event_key = 'specialist_message';