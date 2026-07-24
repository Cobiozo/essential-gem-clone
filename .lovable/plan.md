## Podział ustawień powiadomień na "W aplikacji" i "Email"

W `src/components/notifications/UserNotificationCenter.tsx` (zakładka „Ustawienia") obecnie pokazujemy jedną płaską listę zdarzeń pogrupowanych po kategoriach. Podzielę ją na dwie zwijane sekcje najwyższego poziomu — każda z własnym kompletem kategorii i przełączników.

### Struktura po zmianie

```text
Ustawienia
├─ [Accordion] Powiadomienia w aplikacji (dzwoneczek)         [N pozycji]
│    └─ zwinięte kategorie: Konto, Wiadomości, Wydarzenia, ...
│         └─ przełącznik on/off per zdarzenie
└─ [Accordion] Powiadomienia email                            [M pozycji]
     ├─ Email o nowych wiadomościach na czacie (email_on_offline)
     └─ zwinięte kategorie: Konto, Wydarzenia, ...
          └─ przełącznik on/off per zdarzenie (tylko email)
```

### Zasady podziału

- **W aplikacji (dzwoneczek):** wszystkie aktywne `notification_event_types` — reprezentują to, co ląduje w `user_notifications` (dzwoneczek).
- **Email:** tylko te typy, które mają `send_email = true` w `notification_event_types`. Do tej sekcji przenoszę też istniejący toggle „Email o nowych wiadomościach na czacie" (`email_on_offline`) — trafia na górę sekcji Email.
- W obu sekcjach zachowuję dotychczasowe pogrupowanie po `category` (Konto, Bezpieczeństwo, Wiadomości, Wydarzenia, Spotkania, Baza Wiedzy, Aktualności, Zespół, Szkolenia, Wsparcie, Panel admina, Pozostałe) oraz przyciski „Włącz/Wyłącz wszystkie" per kategoria.
- Powiadomienia oznaczone `is_mandatory` pozostają zablokowane (Switch disabled + tooltip) w obu sekcjach.
- Sekcje najwyższego poziomu użyją shadcn `Accordion` (`type="multiple"`, domyślnie obie otwarte), z licznikiem pozycji w tytule.

### Uwaga techniczna

Ta zmiana jest czysto prezentacyjna. Przełącznik zapisuje do tej samej tabeli `user_notification_preferences` przez istniejące `togglePreference` / `toggleEmailOnOffline` — dziś jedna preferencja `is_enabled` steruje jednocześnie dzwoneczkiem i emailem dla danego typu. Rozdzielenie sterowania („wyłącz email, zostaw dzwoneczek") wymagałoby migracji (osobne kolumny `in_app_enabled` / `email_enabled`) i zmian po stronie edge functions — jeśli tego oczekujesz, powiedz i zaplanuję to jako rozszerzenie.

### Pliki do zmiany

- `src/components/notifications/UserNotificationCenter.tsx` — dwie zwijane sekcje najwyższego poziomu (`Accordion`), przeniesienie toggla `email_on_offline` do sekcji Email, filtrowanie listy po `send_email` dla sekcji Email.
