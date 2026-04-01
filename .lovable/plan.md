

# Dwie poprawki: nick na czacie + weryfikacja e-maili po webinarze

## 1. Czat: zamiana "Ty" na prawdziwe imię gościa

### Problem
W `AutoWebinarEmbed.tsx` linia 447: `guestName={null}` — zawsze przekazuje null do komponentu czatu. W efekcie w `AutoWebinarFakeChat.tsx` linia 91: `sendMessage(text, guestName || 'Ty')` zawsze używa fallbacku "Ty".

### Rozwiązanie
W `AutoWebinarEmbed.tsx` — przy resolwowaniu `guestRegistrationId` (linia 112-126) już wykonywany jest query do `guest_event_registrations`. Wystarczy rozszerzyć `.select('id')` o `first_name, last_name` i zapisać wynik w nowym stanie `guestName`.

Następnie:
- Sformatować nick jako `"Imię P."` (imię + pierwsza litera nazwiska z kropką), np. "Anna K." — identycznie jak fikcyjne komentarze
- Przekazać ten nick do `<AutoWebinarFakeChat guestName={guestName}>` zamiast `null`

| Plik | Zmiana |
|------|--------|
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Dodać stan `guestName`, rozszerzyć query o `first_name, last_name`, sformatować jako "Imię P.", przekazać do `AutoWebinarFakeChat` |

Komponent `AutoWebinarFakeChat.tsx` i hook `useAutoWebinarFakeChat.ts` **nie wymagają zmian** — już poprawnie używają `guestName` gdy jest podane.

---

## 2. E-maile po auto-webinarze — weryfikacja

### Wynik analizy: system działa poprawnie

Po przeanalizowaniu kodu potwierdzam, że e-maile po zakończeniu auto-webinaru **są wysyłane prawidłowo**:

- **Trigger**: `process-pending-notifications` (CRON co 5 min) szuka wydarzeń zakończonych w ciągu ostatnich 2h
- **Logika obecności**: Sprawdza `auto_webinar_views` — jeśli `watch_duration_seconds > 0` → email "thank_you", jeśli 0 lub brak → email "missed_event"
- **Dane kontaktowe opiekuna**: Funkcja `send-post-event-thank-you` pobiera `inviter_user_id` z rejestracji gościa, następnie ładuje profil opiekuna (imię, nazwisko, email, telefon) i umieszcza te dane w dedykowanej sekcji e-maila z nagłówkiem "Twoja osoba kontaktowa"
- **Filtrowanie**: Tylko goście (`guest_event_registrations`), nigdy partnerzy/admini. Flaga `thank_you_sent` zapobiega duplikatom.

Nie są potrzebne żadne zmiany w systemie e-maili.

