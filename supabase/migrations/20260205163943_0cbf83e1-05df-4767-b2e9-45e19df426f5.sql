-- Add cookie settings translation for all active languages
INSERT INTO i18n_translations (language_code, namespace, key, value)
SELECT l.code, 'footer', 'cookieSettings', 
  CASE l.code
    WHEN 'pl' THEN 'Ustawienia cookie'
    WHEN 'en' THEN 'Cookie Settings'
    WHEN 'de' THEN 'Cookie-Einstellungen'
    WHEN 'es' THEN 'Configuración de cookies'
    WHEN 'fr' THEN 'Paramètres des cookies'
    WHEN 'it' THEN 'Impostazioni cookie'
    WHEN 'uk' THEN 'Налаштування cookie'
    WHEN 'ru' THEN 'Настройки cookie'
    ELSE 'Cookie Settings'
  END
FROM i18n_languages l
WHERE l.is_active = true
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;