-- Insert translation keys for admin.knowledge namespace
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
-- Error messages
('pl', 'admin.knowledge', 'fetchError', 'Błąd pobierania zasobów'),
('pl', 'admin.knowledge', 'uploadError', 'Błąd przesyłania pliku'),
('pl', 'admin.knowledge', 'titleRequired', 'Tytuł jest wymagany'),
('pl', 'admin.knowledge', 'updateError', 'Błąd aktualizacji'),
('pl', 'admin.knowledge', 'createError', 'Błąd tworzenia'),
('pl', 'admin.knowledge', 'deleteError', 'Błąd usuwania'),
('pl', 'admin.knowledge', 'confirmDelete', 'Czy na pewno chcesz usunąć ten zasób?'),

-- Success messages
('pl', 'admin.knowledge', 'fileUploaded', 'Plik przesłany'),
('pl', 'admin.knowledge', 'resourceUpdated', 'Zasób zaktualizowany'),
('pl', 'admin.knowledge', 'resourceCreated', 'Zasób utworzony'),
('pl', 'admin.knowledge', 'resourceDeleted', 'Zasób usunięty'),

-- UI elements
('pl', 'admin.knowledge', 'library', 'Biblioteka'),
('pl', 'admin.knowledge', 'addResource', 'Dodaj zasób'),
('pl', 'admin.knowledge', 'editResource', 'Edytuj zasób'),
('pl', 'admin.knowledge', 'newResource', 'Nowy zasób'),
('pl', 'admin.knowledge', 'searchPlaceholder', 'Szukaj zasobów...'),
('pl', 'admin.knowledge', 'noResources', 'Brak zasobów do wyświetlenia'),
('pl', 'admin.knowledge', 'noDescription', 'Brak opisu'),

-- Badges
('pl', 'admin.knowledge', 'badgeNew', 'Nowy'),
('pl', 'admin.knowledge', 'badgeUpdated', 'Zaktualizowany'),

-- Status filters
('pl', 'admin.knowledge', 'statusDraft', 'Robocze'),
('pl', 'admin.knowledge', 'statusArchived', 'Archiwalne'),
('pl', 'admin.knowledge', 'category', 'Kategoria'),
('pl', 'admin.knowledge', 'allCategories', 'Wszystkie kategorie'),

-- Tabs
('pl', 'admin.knowledge', 'tabBasic', 'Podstawowe'),
('pl', 'admin.knowledge', 'tabSource', 'Źródło'),
('pl', 'admin.knowledge', 'tabVisibility', 'Widoczność'),
('pl', 'admin.knowledge', 'tabActions', 'Akcje'),
('pl', 'admin.knowledge', 'tabBadges', 'Oznaczenia'),

-- Form labels
('pl', 'admin.knowledge', 'titleLabel', 'Tytuł'),
('pl', 'admin.knowledge', 'titlePlaceholder', 'Nazwa zasobu'),
('pl', 'admin.knowledge', 'descriptionLabel', 'Opis'),
('pl', 'admin.knowledge', 'descriptionPlaceholder', 'Krótki opis zasobu'),
('pl', 'admin.knowledge', 'contextOfUse', 'Kontekst użycia'),
('pl', 'admin.knowledge', 'contextPlaceholder', 'Kiedy i jak używać tego zasobu'),
('pl', 'admin.knowledge', 'resourceType', 'Typ zasobu'),
('pl', 'admin.knowledge', 'selectCategory', 'Wybierz kategorię'),
('pl', 'admin.knowledge', 'tagsLabel', 'Tagi (oddzielone przecinkami)'),
('pl', 'admin.knowledge', 'tagsPlaceholder', 'np. onboarding, partner, cennik'),
('pl', 'admin.knowledge', 'version', 'Wersja'),
('pl', 'admin.knowledge', 'versionPlaceholder', 'np. 1.0, 2.1'),
('pl', 'admin.knowledge', 'workStage', 'Etap pracy (opcjonalny)'),
('pl', 'admin.knowledge', 'workStagePlaceholder', 'np. początkujący, zaawansowany'),

-- Source tab
('pl', 'admin.knowledge', 'sourceType', 'Typ źródła'),
('pl', 'admin.knowledge', 'sourceFile', 'Plik'),
('pl', 'admin.knowledge', 'sourceLink', 'Link zewnętrzny'),
('pl', 'admin.knowledge', 'uploadFile', 'Prześlij plik (max 2GB)'),
('pl', 'admin.knowledge', 'file', 'Plik'),
('pl', 'admin.knowledge', 'resourceUrl', 'URL zasobu'),

-- Actions tab
('pl', 'admin.knowledge', 'showCopyLink', 'Pokaż przycisk kopiowania linku'),
('pl', 'admin.knowledge', 'showDownload', 'Pokaż przycisk pobierania'),
('pl', 'admin.knowledge', 'showShare', 'Pokaż przycisk udostępniania'),
('pl', 'admin.knowledge', 'redirectOnClick', 'Przekieruj po kliknięciu'),

-- Badges tab
('pl', 'admin.knowledge', 'featured', 'Wyróżniony'),
('pl', 'admin.knowledge', 'markAsNew', 'Oznacz jako nowy'),
('pl', 'admin.knowledge', 'markAsUpdated', 'Oznacz jako zaktualizowany'),

-- Common translations
('pl', 'common', 'uploading', 'Przesyłanie...')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;