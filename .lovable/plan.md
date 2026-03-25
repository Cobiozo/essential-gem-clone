

# Przebudowa systemu slotów Auto-Webinar — ZAIMPLEMENTOWANO

## Zmiany

### Baza danych
- Dodano kolumny: `slot_hours text[]`, `room_open_minutes_before int`, `countdown_minutes_before int`, `link_expiry_minutes int`

### Logika synchronizacji
- Nowy plik `src/hooks/useAutoWebinarSync.ts` — jawne sloty + walidacja linków gości
- `useAutoWebinar.ts` — re-eksportuje nowy hook, zawiera tylko config/videos
- Goście z `?slot=HH:MM` → walidacja: za wcześnie → countdown, na czas → play, po wygaśnięciu → "Link wygasł"
- Goście BEZ `?slot` → "Brak aktywnego zaproszenia"
- Zalogowani użytkownicy → automatycznie znajdują aktualny/następny slot

### UI
- `AutoWebinarPublicPage` → czyta `?slot` z URL, przekazuje do embed
- `AutoWebinarEmbed` → nowe ekrany: "Link wygasł", "Brak zaproszenia"
- `AutoWebinarManagement` → nowy UI: grid godzin 00:00–23:30, konfiguracja faz (pokój, countdown, wygaśnięcie)
- `AutoWebinarEventView` → używa `slot_hours` jeśli dostępne
- `EventGuestRegistration` → roomLink zawiera `?slot=HH:MM`
- `EventRegistrationBySlug` → przekazuje `slot` param przy redirectcie

### Kompatybilność
- Pusta tablica `slot_hours` → fallback do starej logiki start_hour/interval_minutes
