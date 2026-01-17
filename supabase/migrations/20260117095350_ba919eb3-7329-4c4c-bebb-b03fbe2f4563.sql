-- Insert translation keys for admin components
-- Using correct column name: language_code

-- Common translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'common', 'save', 'Zapisz'),
('pl', 'common', 'cancel', 'Anuluj'),
('pl', 'common', 'delete', 'Usuń'),
('pl', 'common', 'edit', 'Edytuj'),
('pl', 'common', 'add', 'Dodaj'),
('pl', 'common', 'close', 'Zamknij'),
('pl', 'common', 'refresh', 'Odśwież'),
('pl', 'common', 'loading', 'Ładowanie...'),
('pl', 'common', 'search', 'Szukaj'),
('pl', 'common', 'active', 'Aktywne'),
('pl', 'common', 'inactive', 'Nieaktywne'),
('pl', 'common', 'yes', 'Tak'),
('pl', 'common', 'no', 'Nie'),
('pl', 'common', 'confirm', 'Potwierdź'),
('pl', 'common', 'back', 'Wstecz'),
('pl', 'common', 'next', 'Dalej'),
('pl', 'common', 'preview', 'Podgląd'),
('pl', 'common', 'settings', 'Ustawienia'),
('pl', 'common', 'actions', 'Akcje'),
('pl', 'common', 'status', 'Status'),
('pl', 'common', 'name', 'Nazwa'),
('pl', 'common', 'description', 'Opis'),
('pl', 'common', 'title', 'Tytuł'),
('pl', 'common', 'type', 'Typ'),
('pl', 'common', 'date', 'Data'),
('pl', 'common', 'time', 'Czas'),
('pl', 'common', 'copy', 'Kopiuj'),
('pl', 'common', 'copied', 'Skopiowano!'),
('pl', 'common', 'enabled', 'Włączone'),
('pl', 'common', 'disabled', 'Wyłączone'),
('pl', 'common', 'configured', 'Skonfigurowane'),
('pl', 'common', 'notConfigured', 'Nieskonfigurowane'),
('pl', 'common', 'never', 'Nigdy'),
('pl', 'common', 'all', 'Wszystko'),
('pl', 'common', 'none', 'Brak'),
('pl', 'common', 'error', 'Błąd'),
('pl', 'common', 'warning', 'Uwaga'),
('pl', 'common', 'info', 'Informacja'),
('pl', 'common', 'test', 'Test'),
('pl', 'common', 'send', 'Wyślij'),
('pl', 'common', 'role', 'Rola'),
('pl', 'common', 'roles.client', 'Klient'),
('pl', 'common', 'roles.partner', 'Partner'),
('pl', 'common', 'roles.specjalista', 'Specjalista'),
('pl', 'common', 'roles.admin', 'Administrator')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Toast translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'toast', 'error', 'Błąd'),
('pl', 'toast', 'success', 'Sukces'),
('pl', 'toast', 'saved', 'Zapisano'),
('pl', 'toast', 'deleted', 'Usunięto'),
('pl', 'toast', 'updated', 'Zaktualizowano'),
('pl', 'toast', 'created', 'Utworzono'),
('pl', 'toast', 'copied', 'Skopiowano!'),
('pl', 'toast', 'errorSaving', 'Nie udało się zapisać'),
('pl', 'toast', 'errorLoading', 'Nie udało się załadować'),
('pl', 'toast', 'errorDeleting', 'Nie udało się usunąć'),
('pl', 'toast', 'confirmDelete', 'Czy na pewno chcesz usunąć?'),
('pl', 'toast', 'connectionError', 'Błąd połączenia'),
('pl', 'toast', 'connectionSuccess', 'Połączenie działa'),
('pl', 'toast', 'testConnectionSuccess', 'Test połączenia zakończony sukcesem'),
('pl', 'toast', 'testConnectionError', 'Test połączenia nieudany')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Zoom Integration Settings translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'admin.zoom', 'title', 'Integracja Zoom API'),
('pl', 'admin.zoom', 'description', 'Automatyczne generowanie linków do spotkań Zoom'),
('pl', 'admin.zoom', 'connectionActive', 'Połączenie aktywne'),
('pl', 'admin.zoom', 'connectionActiveDesc', 'Integracja z Zoom API działa prawidłowo'),
('pl', 'admin.zoom', 'connectionError', 'Błąd połączenia'),
('pl', 'admin.zoom', 'connectionErrorDesc', 'Nie udało się połączyć z Zoom API'),
('pl', 'admin.zoom', 'notConfigured', 'Nieskonfigurowane'),
('pl', 'admin.zoom', 'notConfiguredDesc', 'Brak skonfigurowanych kluczy API Zoom'),
('pl', 'admin.zoom', 'testConnection', 'Testuj połączenie'),
('pl', 'admin.zoom', 'testConnectionError', 'Nie udało się przetestować połączenia'),
('pl', 'admin.zoom', 'lastTestConnection', 'Ostatni test połączenia:'),
('pl', 'admin.zoom', 'settingsSaved', 'Ustawienia Zoom zostały zaktualizowane'),
('pl', 'admin.zoom', 'settingsSaveError', 'Nie udało się zapisać ustawień'),
('pl', 'admin.zoom', 'defaultMeetingOptions', 'Domyślne opcje spotkań'),
('pl', 'admin.zoom', 'defaultMeetingOptionsDesc', 'Te ustawienia będą stosowane dla nowo generowanych spotkań Zoom'),
('pl', 'admin.zoom', 'waitingRoomEnabled', 'Poczekalnia włączona'),
('pl', 'admin.zoom', 'waitingRoomDesc', 'Uczestnicy muszą zostać wpuszczeni przez hosta'),
('pl', 'admin.zoom', 'muteOnEntry', 'Wycisz przy wejściu'),
('pl', 'admin.zoom', 'muteOnEntryDesc', 'Uczestnicy są wyciszeni po dołączeniu'),
('pl', 'admin.zoom', 'autoRecording', 'Automatyczne nagrywanie'),
('pl', 'admin.zoom', 'recordingNone', 'Brak nagrywania'),
('pl', 'admin.zoom', 'recordingLocal', 'Nagrywanie lokalne'),
('pl', 'admin.zoom', 'recordingCloud', 'Nagrywanie w chmurze'),
('pl', 'admin.zoom', 'defaultHostEmail', 'Domyślny email hosta'),
('pl', 'admin.zoom', 'defaultHostEmailDesc', 'Email konta Zoom do tworzenia spotkań (pozostaw puste aby użyć domyślnego)'),
('pl', 'admin.zoom', 'howToConfigure', 'Jak skonfigurować integrację Zoom'),
('pl', 'admin.zoom', 'howToConfigureDesc', 'Wykonaj poniższe kroki aby włączyć automatyczne generowanie linków Zoom'),
('pl', 'admin.zoom', 'step1', 'Przejdź do'),
('pl', 'admin.zoom', 'step2', 'Utwórz nową aplikację typu'),
('pl', 'admin.zoom', 'step2Type', 'Server-to-Server OAuth'),
('pl', 'admin.zoom', 'step3', 'Nadaj aplikacji następujące uprawnienia (Scopes):'),
('pl', 'admin.zoom', 'step4', 'Dodaj sekrety w ustawieniach Supabase Edge Functions:'),
('pl', 'admin.zoom', 'step5', 'Aktywuj aplikację w Zoom Marketplace'),
('pl', 'admin.zoom', 'step6', 'Wróć tutaj i kliknij "Testuj połączenie"'),
('pl', 'admin.zoom', 'openZoomMarketplace', 'Otwórz Zoom Marketplace'),
('pl', 'admin.zoom', 'statusActive', 'Aktywne'),
('pl', 'admin.zoom', 'statusError', 'Błąd'),
('pl', 'admin.zoom', 'statusConfigured', 'Skonfigurowane')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- SMTP Configuration translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'admin.smtp', 'title', 'Konfiguracja SMTP (globalna)'),
('pl', 'admin.smtp', 'description', 'Ustawienia serwera email dla całej aplikacji'),
('pl', 'admin.smtp', 'connectionWorks', 'Połączenie działa'),
('pl', 'admin.smtp', 'connectionError', 'Błąd połączenia'),
('pl', 'admin.smtp', 'testEmailSent', 'Połączenie działa! Email testowy wysłany na'),
('pl', 'admin.smtp', 'checkSettings', 'Sprawdź ustawienia SMTP i spróbuj ponownie'),
('pl', 'admin.smtp', 'smtpHost', 'Host SMTP'),
('pl', 'admin.smtp', 'smtpHostPlaceholder', 'np. smtp.gmail.com, s108.cyber-folks.pl'),
('pl', 'admin.smtp', 'port', 'Port'),
('pl', 'admin.smtp', 'encryption', 'Szyfrowanie'),
('pl', 'admin.smtp', 'encryptionSsl', 'SSL/TLS (port 465) - zalecane'),
('pl', 'admin.smtp', 'encryptionTls', 'STARTTLS (port 587)'),
('pl', 'admin.smtp', 'encryptionNone', 'Brak szyfrowania (port 25)'),
('pl', 'admin.smtp', 'selectEncryption', 'Wybierz szyfrowanie'),
('pl', 'admin.smtp', 'username', 'Nazwa użytkownika / Email'),
('pl', 'admin.smtp', 'usernamePlaceholder', 'np. admin@example.com'),
('pl', 'admin.smtp', 'password', 'Hasło / Hasło aplikacji'),
('pl', 'admin.smtp', 'gmailAppPassword', 'Dla Gmail: użyj "Hasła aplikacji"'),
('pl', 'admin.smtp', 'senderEmail', 'Email nadawcy'),
('pl', 'admin.smtp', 'senderEmailPlaceholder', 'np. noreply@example.com'),
('pl', 'admin.smtp', 'senderName', 'Nazwa nadawcy'),
('pl', 'admin.smtp', 'senderNamePlaceholder', 'np. Zespół Pure Life'),
('pl', 'admin.smtp', 'testConnection', 'Test połączenia'),
('pl', 'admin.smtp', 'saveSettings', 'Zapisz ustawienia'),
('pl', 'admin.smtp', 'settingsSaved', 'Konfiguracja SMTP została zapisana'),
('pl', 'admin.smtp', 'settingsSaveError', 'Nie udało się zapisać konfiguracji'),
('pl', 'admin.smtp', 'fillRequiredFields', 'Wypełnij wszystkie wymagane pola przed testem'),
('pl', 'admin.smtp', 'testError', 'Błąd podczas testu połączenia')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Reflinks Management translations  
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'admin.reflinks', 'title', 'Zarządzanie Reflinkami'),
('pl', 'admin.reflinks', 'description', 'Twórz i zarządzaj reflinkami z tytułami, grafikami i kontrolą widoczności'),
('pl', 'admin.reflinks', 'globalReflinks', 'Reflinki globalne'),
('pl', 'admin.reflinks', 'userLinks', 'Linki użytkowników'),
('pl', 'admin.reflinks', 'otpCodes', 'Kody OTP'),
('pl', 'admin.reflinks', 'addReflink', 'Dodaj Reflink'),
('pl', 'admin.reflinks', 'addNewReflink', 'Dodaj nowy reflink'),
('pl', 'admin.reflinks', 'addNewReflinkDesc', 'Utwórz nowy reflink z tytułem, grafiką i ustawieniami widoczności'),
('pl', 'admin.reflinks', 'visibilityLabel', 'Widoczność przycisku "Reflinki" dla ról'),
('pl', 'admin.reflinks', 'visibilityHint', 'Użytkownik zobaczy przycisk "Reflinki" tylko gdy włączysz go dla jego roli.'),
('pl', 'admin.reflinks', 'linkTypes.reflink', 'Reflink (rejestracja)'),
('pl', 'admin.reflinks', 'linkTypes.internal', 'Link wewnętrzny'),
('pl', 'admin.reflinks', 'linkTypes.external', 'Link zewnętrzny'),
('pl', 'admin.reflinks', 'linkTypes.clipboard', 'Kopiuj do schowka'),
('pl', 'admin.reflinks', 'linkTypes.infolink', 'InfoLink (z kodem OTP)'),
('pl', 'admin.reflinks', 'errors.reflinkCodeRequired', 'Kod reflinku jest wymagany'),
('pl', 'admin.reflinks', 'errors.urlRequired', 'URL linku jest wymagany'),
('pl', 'admin.reflinks', 'errors.clipboardContentRequired', 'Treść do skopiowania jest wymagana'),
('pl', 'admin.reflinks', 'errors.reflinkExists', 'Kod reflinku już istnieje'),
('pl', 'admin.reflinks', 'errors.addError', 'Nie udało się dodać reflinku'),
('pl', 'admin.reflinks', 'errors.updateError', 'Nie udało się zaktualizować reflinku'),
('pl', 'admin.reflinks', 'errors.deleteError', 'Nie udało się usunąć reflinku'),
('pl', 'admin.reflinks', 'errors.statusChangeError', 'Nie udało się zmienić statusu reflinku'),
('pl', 'admin.reflinks', 'errors.fetchError', 'Nie udało się pobrać reflinków'),
('pl', 'admin.reflinks', 'errors.visibilityChangeError', 'Nie udało się zmienić widoczności'),
('pl', 'admin.reflinks', 'success.added', 'Reflink został dodany'),
('pl', 'admin.reflinks', 'success.updated', 'Reflink został zaktualizowany'),
('pl', 'admin.reflinks', 'success.deleted', 'Reflink został usunięty'),
('pl', 'admin.reflinks', 'success.contentCopied', 'Treść została skopiowana do schowka'),
('pl', 'admin.reflinks', 'deleteConfirm', 'Czy na pewno chcesz usunąć ten reflink?'),
('pl', 'admin.reflinks', 'visibilityChanged', 'Widoczność przycisku dla roli'),
('pl', 'admin.reflinks', 'noReflinks', 'Brak reflinków'),
('pl', 'admin.reflinks', 'noReflinksDesc', 'Nie utworzono jeszcze żadnych reflinków. Kliknij "Dodaj Reflink" aby rozpocząć.')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Email Templates Management translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'admin.email', 'title', 'Szablony Email'),
('pl', 'admin.email', 'templates', 'Szablony'),
('pl', 'admin.email', 'events', 'Zdarzenia'),
('pl', 'admin.email', 'logs', 'Logi'),
('pl', 'admin.email', 'smtpConfig', 'Konfiguracja SMTP'),
('pl', 'admin.email', 'addTemplate', 'Nowy szablon'),
('pl', 'admin.email', 'editTemplate', 'Edytuj szablon'),
('pl', 'admin.email', 'deleteTemplate', 'Usuń szablon'),
('pl', 'admin.email', 'templateName', 'Nazwa szablonu'),
('pl', 'admin.email', 'internalName', 'Nazwa wewnętrzna'),
('pl', 'admin.email', 'subject', 'Temat'),
('pl', 'admin.email', 'body', 'Treść'),
('pl', 'admin.email', 'footer', 'Stopka'),
('pl', 'admin.email', 'assignedEvents', 'Przypisane zdarzenia'),
('pl', 'admin.email', 'noEvents', 'Brak zdarzeń'),
('pl', 'admin.email', 'templateUpdated', 'Szablon został zaktualizowany'),
('pl', 'admin.email', 'templateCreated', 'Szablon został utworzony'),
('pl', 'admin.email', 'templateDeleted', 'Szablon został usunięty'),
('pl', 'admin.email', 'templateSaveError', 'Nie udało się zapisać szablonu'),
('pl', 'admin.email', 'templateDeleteError', 'Nie udało się usunąć szablonu'),
('pl', 'admin.email', 'templateDeleteConfirm', 'Czy na pewno chcesz usunąć ten szablon?'),
('pl', 'admin.email', 'variables', 'Zmienne'),
('pl', 'admin.email', 'variablesDesc', 'Dostępne zmienne do użycia w szablonie'),
('pl', 'admin.email', 'insertVariable', 'Wstaw zmienną'),
('pl', 'admin.email', 'livePreview', 'Podgląd na żywo'),
('pl', 'admin.email', 'desktop', 'Desktop'),
('pl', 'admin.email', 'mobile', 'Mobile'),
('pl', 'admin.email', 'statusSent', 'Wysłano'),
('pl', 'admin.email', 'statusError', 'Błąd'),
('pl', 'admin.email', 'statusPending', 'Oczekuje'),
('pl', 'admin.email', 'sendTestEmail', 'Wyślij testowy email'),
('pl', 'admin.email', 'selectUser', 'Wybierz użytkownika'),
('pl', 'admin.email', 'selectTemplate', 'Wybierz szablon'),
('pl', 'admin.email', 'sendEmail', 'Wyślij email'),
('pl', 'admin.email', 'emailSent', 'Email został wysłany'),
('pl', 'admin.email', 'emailSendError', 'Nie udało się wysłać emaila'),
('pl', 'admin.email', 'noLogs', 'Brak logów'),
('pl', 'admin.email', 'addEvent', 'Dodaj zdarzenie'),
('pl', 'admin.email', 'editEvent', 'Edytuj zdarzenie'),
('pl', 'admin.email', 'eventKey', 'Klucz zdarzenia'),
('pl', 'admin.email', 'eventName', 'Nazwa zdarzenia'),
('pl', 'admin.email', 'eventUpdated', 'Zdarzenie zostało zaktualizowane'),
('pl', 'admin.email', 'eventCreated', 'Zdarzenie zostało utworzone'),
('pl', 'admin.email', 'eventDeleted', 'Zdarzenie zostało usunięte'),
('pl', 'admin.email', 'retryEmail', 'Ponów wysyłkę'),
('pl', 'admin.email', 'retrySuccess', 'Email został ponownie wysłany'),
('pl', 'admin.email', 'retryError', 'Nie udało się ponowić wysyłki'),
('pl', 'admin.email', 'editorMode', 'Tryb edytora'),
('pl', 'admin.email', 'editorModeBlock', 'Blokowy (DnD)'),
('pl', 'admin.email', 'editorModeHtml', 'HTML')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Events Management translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'admin.events', 'webinars', 'Webinary'),
('pl', 'admin.events', 'teamTrainings', 'Szkolenia zespołu'),
('pl', 'admin.events', 'teamMeetings', 'Spotkania zespołu'),
('pl', 'admin.events', 'individualMeetings', 'Spotkania indywidualne'),
('pl', 'admin.events', 'zoomIntegration', 'Integracja Zoom'),
('pl', 'admin.events', 'addWebinar', 'Dodaj webinar'),
('pl', 'admin.events', 'editWebinar', 'Edytuj webinar'),
('pl', 'admin.events', 'webinarDeleted', 'Webinar został usunięty'),
('pl', 'admin.events', 'addTraining', 'Dodaj szkolenie'),
('pl', 'admin.events', 'editTraining', 'Edytuj szkolenie'),
('pl', 'admin.events', 'trainingDeleted', 'Spotkanie zespołu zostało usunięte'),
('pl', 'admin.events', 'addMeeting', 'Dodaj spotkanie'),
('pl', 'admin.events', 'editMeeting', 'Edytuj spotkanie'),
('pl', 'admin.events', 'meetingDeleted', 'Spotkanie zostało usunięte'),
('pl', 'admin.events', 'noEvents', 'Brak wydarzeń'),
('pl', 'admin.events', 'noEventsDesc', 'Nie utworzono jeszcze żadnych wydarzeń tego typu.')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- CMS Editor translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'cms', 'edit', 'Edycja'),
('pl', 'cms', 'visibility', 'Widoczność'),
('pl', 'cms', 'content', 'Treść'),
('pl', 'cms', 'style', 'Styl'),
('pl', 'cms', 'advanced', 'Zaawansowane'),
('pl', 'cms', 'selectElement', 'Wybierz element do edycji'),
('pl', 'cms', 'visibilityInfo', 'Ustawienia widoczności zostaną zapisane po kliknięciu "Zapisz" w zakładce Edycja.'),
('pl', 'cms', 'visibilityParentInfo', 'Pamiętaj, że sekcja nadrzędna również musi być widoczna dla użytkownika, aby zobaczyć ten element.'),
('pl', 'cms', 'visibleToEveryone', 'Widoczne dla wszystkich'),
('pl', 'cms', 'visibleToClients', 'Widoczne dla klientów'),
('pl', 'cms', 'visibleToPartners', 'Widoczne dla partnerów'),
('pl', 'cms', 'visibleToSpecjalisci', 'Widoczne dla specjalistów'),
('pl', 'cms', 'visibleToAnonymous', 'Widoczne dla niezalogowanych'),
('pl', 'cms', 'saving', 'zapisywanie...'),
('pl', 'cms', 'saved', 'Zapisano'),
('pl', 'cms', 'backgroundImage', 'Obraz tła'),
('pl', 'cms', 'uploadOrUrlHint', 'Prześlij obraz z dysku lub podaj URL'),
('pl', 'cms', 'htmlWarning', 'Uwaga! Wklejanie niesprawdzonego kodu HTML może stanowić zagrożenie bezpieczeństwa. Upewnij się, że rozumiesz kod który wklejasz.'),
('pl', 'cms', 'htmlCode', 'Kod HTML'),
('pl', 'cms', 'soundcloudUrl', 'URL SoundCloud'),
('pl', 'cms', 'soundcloudUrlHint', 'Wklej link do utworu lub playlisty z SoundCloud'),
('pl', 'cms', 'heightPx', 'Wysokość (px)'),
('pl', 'cms', 'heightHintSingle', 'Zalecane: 166 dla pojedynczego utworu, 450 dla playlisty')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Maintenance Banner translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'maintenance', 'plannedEndTime', 'Planowane zakończenie prac:'),
('pl', 'maintenance', 'apology', 'Przepraszamy za utrudnienia. Strona będzie dostępna wkrótce.')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Guardian Search translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'guardian', 'searchByEqid', 'Wyszukaj po numerze EQID'),
('pl', 'guardian', 'verify', 'Weryfikuj'),
('pl', 'guardian', 'selectedGuardian', 'Wybrany opiekun'),
('pl', 'guardian', 'notFound', 'Nie znaleziono opiekuna z podanym numerem EQID. Sprawdź numer i spróbuj ponownie.'),
('pl', 'guardian', 'searchError', 'Błąd wyszukiwania opiekuna'),
('pl', 'guardian', 'verified', 'Zweryfikowany'),
('pl', 'guardian', 'change', 'Zmień')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Keyboard Shortcuts translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'shortcuts', 'save', 'Zapisz'),
('pl', 'shortcuts', 'undo', 'Cofnij'),
('pl', 'shortcuts', 'redo', 'Ponów'),
('pl', 'shortcuts', 'deleteElement', 'Usuń element'),
('pl', 'shortcuts', 'copyElement', 'Kopiuj element'),
('pl', 'shortcuts', 'pasteElement', 'Wklej element'),
('pl', 'shortcuts', 'moveUp', 'Przesuń w górę'),
('pl', 'shortcuts', 'moveDown', 'Przesuń w dół'),
('pl', 'shortcuts', 'toggleEditMode', 'Tryb edycji')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- NotFound page translations
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'notFound', 'title', '404'),
('pl', 'notFound', 'subtitle', 'Strona nie została znaleziona'),
('pl', 'notFound', 'description', 'Przepraszamy, ale strona której szukasz nie istnieje lub została przeniesiona.'),
('pl', 'notFound', 'backToHome', 'Wróć do strony głównej')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;

-- Cookie Consent translations  
INSERT INTO i18n_translations (language_code, namespace, key, value) VALUES
('pl', 'cookies', 'title', 'Zgoda na pliki cookie'),
('pl', 'cookies', 'acceptAll', 'Akceptuj wszystkie'),
('pl', 'cookies', 'rejectAll', 'Odrzuć wszystkie'),
('pl', 'cookies', 'customize', 'Dostosuj'),
('pl', 'cookies', 'savePreferences', 'Zapisz preferencje'),
('pl', 'cookies', 'necessary', 'Niezbędne'),
('pl', 'cookies', 'analytics', 'Analityczne'),
('pl', 'cookies', 'marketing', 'Marketingowe'),
('pl', 'cookies', 'functional', 'Funkcjonalne'),
('pl', 'cookies', 'privacyPolicy', 'Polityka prywatności'),
('pl', 'cookies', 'revisitSettings', 'Zmień ustawienia cookies')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value;