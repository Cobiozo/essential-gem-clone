-- Update incorrect flag emojis for languages
UPDATE i18n_languages SET flag_emoji = '🇮🇹' WHERE code = 'it';
UPDATE i18n_languages SET flag_emoji = '🇪🇸' WHERE code = 'es';
UPDATE i18n_languages SET flag_emoji = '🇫🇷' WHERE code = 'fr';
UPDATE i18n_languages SET flag_emoji = '🇵🇹' WHERE code = 'pt';