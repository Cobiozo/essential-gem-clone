-- First delete any existing entries to avoid duplicates
DELETE FROM i18n_translations WHERE key IN (
  'dashboard.activeOtpCodes',
  'dashboard.otpUsed',
  'dashboard.otpPending',
  'dashboard.otpExpiresIn',
  'dashboard.otpExpired',
  'dashboard.otpSessions'
);

-- Insert new translations
INSERT INTO i18n_translations (key, language_code, value, namespace) VALUES
  ('dashboard.activeOtpCodes', 'pl', 'Aktywne kody OTP', 'dashboard'),
  ('dashboard.activeOtpCodes', 'en', 'Active OTP codes', 'dashboard'),
  ('dashboard.otpUsed', 'pl', 'Użyty', 'dashboard'),
  ('dashboard.otpUsed', 'en', 'Used', 'dashboard'),
  ('dashboard.otpPending', 'pl', 'Oczekuje', 'dashboard'),
  ('dashboard.otpPending', 'en', 'Pending', 'dashboard'),
  ('dashboard.otpExpiresIn', 'pl', 'Wygasa za', 'dashboard'),
  ('dashboard.otpExpiresIn', 'en', 'Expires in', 'dashboard'),
  ('dashboard.otpExpired', 'pl', 'Wygasł', 'dashboard'),
  ('dashboard.otpExpired', 'en', 'Expired', 'dashboard'),
  ('dashboard.otpSessions', 'pl', 'sesji', 'dashboard'),
  ('dashboard.otpSessions', 'en', 'sessions', 'dashboard');