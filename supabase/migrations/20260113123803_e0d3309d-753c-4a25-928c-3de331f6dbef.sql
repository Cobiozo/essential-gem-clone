-- Insert missing menu translations for sidebar
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES 
  ('pl', 'dashboard', 'menu.events', 'Wydarzenia'),
  ('en', 'dashboard', 'menu.events', 'Events'),
  ('pl', 'dashboard', 'menu.webinars', 'Webinary'),
  ('en', 'dashboard', 'menu.webinars', 'Webinars'),
  ('pl', 'dashboard', 'menu.teamMeetings', 'Spotkanie zespołu'),
  ('en', 'dashboard', 'menu.teamMeetings', 'Team Meeting'),
  ('pl', 'dashboard', 'menu.individualMeetings', 'Spotkanie indywidualne'),
  ('en', 'dashboard', 'menu.individualMeetings', 'Individual Meeting')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();