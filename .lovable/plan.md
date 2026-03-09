

# Zmiana adnotacji na stronie rejestracji auto-webinaru

## Co się zmieni

Na stronie `EventGuestRegistration.tsx`, w sekcji pod "Webinar online", zamiast "Dołącz w dowolnym momencie" pojawi się dynamiczna informacja o najbliższym slocie webinarowym oraz zasadach dołączenia.

## Implementacja

### Plik: `src/pages/EventGuestRegistration.tsx`

1. **Pobranie konfiguracji auto-webinaru** — po załadowaniu eventu, jeśli `event_type === 'auto_webinar'`, wykonaj dodatkowe zapytanie do `auto_webinar_config` (po `event_id`) aby pobrać `start_hour`, `end_hour`, `interval_minutes`.

2. **Obliczenie najbliższego slotu** — na podstawie aktualnego czasu i konfiguracji, wyznacz najbliższy przyszły slot (dzisiaj lub jutro jeśli dzisiejsze godziny się skończyły).

3. **Wyświetlenie informacji** — zamiast "Dołącz w dowolnym momencie":
   - Linia 1: **dzień i godzina** najbliższego webinaru, np. "Poniedziałek, 10 marca • godz. 14:00"
   - Linia 2: "Pokój otworzy się 5 minut przed planowanym rozpoczęciem" (jeśli `interval_minutes >= 30`) lub "Pokój otworzy się punktualnie o wyznaczonej godzinie" (jeśli interwał krótszy)

4. **Aktualizacja sekcji po rejestracji (success)** — analogiczna zmiana w widoku potwierdzenia (linia ~231), zastąpienie "Możesz dołączyć do webinaru w dowolnym momencie w godzinach emisji" na konkretny termin.

### Zmiany techniczne
- Nowy state: `autoWebinarConfig` z polami `start_hour`, `end_hour`, `interval_minutes`
- Nowy `useEffect` pobierający config gdy `isAutoWebinar`
- Helper function `getNextSlot(config)` zwracająca `{ date: Date, time: string }`
- Dodanie importu `addDays` z `date-fns`

