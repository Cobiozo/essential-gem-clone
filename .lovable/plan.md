
## 1. Kontakty prywatne — 3 zakładki najwyższego poziomu

Aktualnie w `src/components/team-contacts/TeamContactsTab.tsx` (linie 463–537) wszystkie 8 pod-zakładek leży w jednym rzędzie. Przebudujemy na dwa poziomy:

**Poziom 1 (główne zakładki):**
1. `Moja lista kontaktów` — obecna `own`
2. `Kontakty z innych źródeł` — kontener grupujący pozostałe źródła
3. `Usunięte` — obecna `deleted`

**Poziom 2 (widoczny tylko po wybraniu „Kontakty z innych źródeł"):**
- Z zaproszeń na Business Opportunity
- Z zaproszeń na Health Conversation
- Z zaproszeń na webinary ogólne
- Z zaproszeń na Eventy
- Z Mojej Strony Partnera
- Z udostępnionego materiału BW

Każda pod-zakładka zachowuje obecny licznik (Badge) i obecny komponent listy (`EventGroupedContacts`, `PartnerPageContactsList`, `HKMaterialContactsList`).

**Zmiany techniczne:**
- Dodać stan `mainTab: 'own' | 'other-sources' | 'deleted'` oraz zawęzić istniejący `privateSubTab` do pod-zakładek „innych źródeł".
- Główne zakładki renderujemy jako większe przyciski/tabs u góry karty (spójne z obecnym stylem `Button variant=default/outline`).
- Pod-zakładki (obecny pasek) renderujemy warunkowo tylko gdy `mainTab === 'other-sources'`. Przy przełączeniu na „Kontakty z innych źródeł" domyślnie wybierany `events-bo`.
- Sumaryczny licznik na głównym przycisku „Kontakty z innych źródeł" = suma liczników wszystkich źródeł.
- Zachować filtry, eksport, offline banner na wszystkich zakładkach.
- Dodać klucze tłumaczeń: `teamContacts.mainTab.own/otherSources/deleted`, `teamContacts.otherSourcesLabel`.

Brak zmian w danych/logice biznesowej — czysta reorganizacja UI.

## 2. Centrum powiadomień — uzupełnienie i pogrupowanie

Obecnie w `notification_event_types` (widok w `UserNotificationCenter.tsx`, tab „Ustawienia") jest ~21 typów, płaska lista bez grup. Brakuje wielu okoliczności, w których system faktycznie wysyła emaile.

### 2a. Uzupełnienie brakujących typów zdarzeń

Migracja doda brakujące rekordy do `notification_event_types` (z domyślnym `send_email = true`, `is_active = true`):

**Webinary / spotkania:**
- `webinar_reminder_2h` — Przypomnienie 2h przed webinarem
- `webinar_reminder_1h` — Przypomnienie 1h przed webinarem
- `webinar_reminder_15min` — Przypomnienie 15 min przed webinarem
- `webinar_join_now` — Pilny link „dołącz teraz" (rejestracja <15 min przed)
- `webinar_confirmation` — Potwierdzenie rejestracji na webinar
- `individual_meeting_reminder` — 5-etapowe przypomnienia o spotkaniu indywidualnym
- `individual_meeting_cancelled` — Odwołanie spotkania indywidualnego
- `individual_meeting_rescheduled` — Zmiana terminu spotkania

**Eventy płatne:**
- `event_order_confirmation` — Potwierdzenie zamówienia/biletu
- `event_payment_received` — Potwierdzenie płatności
- `event_ticket_ready` — Bilet gotowy do pobrania
- `event_form_confirmation` / `event_form_cancellation` — Formularz rejestracyjny

**Konto / bezpieczeństwo:**
- `welcome_email` — Powitanie po aktywacji konta
- `mfa_code` — Kod MFA/OTP (informacyjnie; zwykle nie da się wyłączyć — patrz sekcja 2c)
- `email_changed` — Zmiana adresu email
- `inactivity_warning` — Ostrzeżenie o nieaktywności (14/29 dni)
- `inactivity_final_warning` — Finalne ostrzeżenie przed blokadą (30 dni)
- `account_blocked` — Konto zablokowane

**Baza Wiedzy:**
- `bw_otp_activated` — Ktoś aktywował Twój kod OTP z BW
- `bw_material_watched` — Odbiorca ukończył oglądanie materiału

**News Hub / Ogłoszenia:**
- `news_hub_post_new` — Nowy post w Centrum Aktualności (jeśli widoczny dla roli)
- `news_hub_comment_reply` — Odpowiedź na Twój komentarz

**Wiadomości / czat:**
- `direct_message_offline` — jest już obsłużone jako `email_on_offline` — zostaje osobno na górze
- `broadcast_message` — Wiadomość broadcast od admina/lidera

**Zespół / lider:**
- `guardian_approval_needed` — Wymagana akceptacja opiekuna
- `registration_approved_leader` — Twoja rejestracja została zatwierdzona
- `downline_new_registration` — Nowa rejestracja w Twoim downline (lider)

**Wsparcie:**
- `support_ticket_reply` — Odpowiedź na Twoje zgłoszenie
- `admin_activity_digest` — Dzienny digest aktywności (tylko admin)

Do migracji dołączymy pole `category` (nowa kolumna `text` w `notification_event_types`) z jedną z wartości:
`account`, `security`, `messaging`, `events`, `meetings`, `knowledge`, `news`, `team`, `training`, `support`, `admin`.

### 2b. Grupowanie w UI

W `UserNotificationCenter.tsx` (linie 279–307) zamiast płaskiej pętli po `eventTypes`:
- Grupujemy po `category`, renderujemy każdą grupę jako `<Accordion>` (shadcn) lub sekcję z nagłówkiem i separatorem.
- Nagłówki grup (PL): „Konto", „Bezpieczeństwo", „Wiadomości", „Wydarzenia", „Spotkania indywidualne", „Baza Wiedzy", „Aktualności", „Zespół i struktura", „Szkolenia", „Wsparcie", „Panel admina".
- Sekcja „Wiadomości" mieści na górze istniejący toggle `email_on_offline`.
- Dodajemy w każdej grupie przycisk „Włącz wszystkie / Wyłącz wszystkie".
- Grupy „Panel admina" i pozycje typu `admin_activity_digest` filtrowane rolą (widoczne tylko dla adminów/liderów gdzie stosowne — pobieramy `userRole`).
- Grupa „Bezpieczeństwo" pokazuje nie-wyłączalne pozycje (MFA, reset hasła) jako disabled Switch z tooltipem „Wymagane ze względów bezpieczeństwa".

### 2c. Ograniczenia
- `mfa_code`, `password_reset`, `password_changed`, `email_changed`, `account_blocked` — oznaczone `is_mandatory = true` (nowa kolumna boolean); Switch disabled.
- Preferencje zapisujemy dalej w `user_notification_preferences` (bez zmian schematu tej tabeli).

### 2d. Backend
- Migracja SQL: `ALTER TABLE notification_event_types ADD COLUMN category text, ADD COLUMN is_mandatory boolean DEFAULT false;` + `INSERT`y brakujących zdarzeń + `UPDATE` istniejących o kategorie + GRANT jak w istniejącej tabeli.
- Edge functions wysyłające emaile (`send-webinar-confirmation`, `send-bulk-webinar-reminders`, `send-inactivity-warning`, `send-welcome-email`, `notify-admins-missing-join-link`, `send-admin-activity-digest`, itd.) — dodać przed wysyłką sprawdzenie preferencji użytkownika po `event_key` (helper w `_shared`). Poza zakresem tego planu: pełny audyt wszystkich funkcji — dodamy helper i podłączymy w najbardziej ruchliwych (webinary, inactivity, welcome, event orders); pozostałe w kolejnej iteracji.

## Pliki do zmiany
- `src/components/team-contacts/TeamContactsTab.tsx` — nowa struktura 3 głównych zakładek.
- `src/components/notifications/UserNotificationCenter.tsx` — grupowanie sekcji, disabled dla mandatory.
- `src/types/notifications.ts` — pole `category`, `is_mandatory`.
- Nowa migracja Supabase — kolumny + seed brakujących typów.
- `supabase/functions/_shared/notification-preferences.ts` (nowy) — helper `shouldSendEmail(userId, eventKey)`.
- Punktowe podpięcie helpera w 4–5 najczęściej używanych edge functions.
