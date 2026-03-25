

# Przebudowa systemu slotów Auto-Webinar — Jawne godziny emisji z walidacją linków

## Problem
Obecny system oblicza sloty dynamicznie na podstawie `interval_minutes` od `start_hour`. Gość zaproszony na 17:30 wchodzi o 17:27, ale system widzi go jako 27 minut w slocie 17:00, więc blokuje dostęp. Linki nie są powiązane z konkretną godziną — każdy link działa o każdej porze.

## Rozwiązanie

Zamiast obliczania slotów z interwału, admin jawnie definiuje listę godzin emisji (np. `["10:00","11:00","14:00","17:30"]`). Każdy link zaproszeniowy zawiera parametr `?slot=HH:MM` i wygasa 10 minut po tej godzinie.

### Fazy slotu (konfigurowane przez admina):
1. **Pokój otwarty** — `room_open_minutes_before` (domyślnie 5 min przed) — gość widzi countdown
2. **Odliczanie** — `countdown_minutes_before` (domyślnie 2 min przed) — precyzyjne odliczanie 1s
3. **Start odtwarzania** — dokładnie o wyznaczonej godzinie
4. **Wygaśnięcie linku** — 10 minut po godzinie slotu (twarda reguła)

---

## Zmiany w bazie danych

### Migracja `auto_webinar_config`:
```sql
ALTER TABLE auto_webinar_config
  ADD COLUMN IF NOT EXISTS slot_hours text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS room_open_minutes_before integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS countdown_minutes_before integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS link_expiry_minutes integer DEFAULT 10;
```

Kolumny `start_hour`, `end_hour`, `interval_minutes` zostają (backward compat), ale nowa logika używa `slot_hours` jeśli jest niepusty.

---

## Zmiany w plikach

### 1. `src/types/autoWebinar.ts`
Dodać nowe pola do `AutoWebinarConfig`:
- `slot_hours: string[]`
- `room_open_minutes_before: number`
- `countdown_minutes_before: number`  
- `link_expiry_minutes: number`

### 2. `src/hooks/useAutoWebinar.ts` — `useAutoWebinarSync`
Pełna przebudowa logiki synchronizacji:

- Przyjmuje nowy parametr `guestSlotTime?: string` (z URL `?slot=HH:MM`)
- Jeśli `config.slot_hours` jest niepusty, używa jawnej listy godzin zamiast obliczania z interwału
- **Walidacja linku gościa**: jeśli `isGuest && guestSlotTime`:
  - Parsuj `guestSlotTime` na sekundy od północy
  - Jeśli `now > slotTime + link_expiry_minutes * 60` → link wygasł → pokaż ekran "Link wygasł"
  - Jeśli `now < slotTime - room_open_minutes_before * 60` → za wcześnie → pokaż countdown
  - Jeśli `now >= slotTime - room_open_minutes_before && now < slotTime` → pokój otwarty, countdown do startu
  - Jeśli `now >= slotTime && now < slotTime + link_expiry_minutes * 60` → odtwarzaj z offsetem `now - slotTime`
- Dodać nowy stan `isLinkExpired` do zwracanych wartości
- Dla zalogowanych użytkowników (nie gości) — zachować istniejące zachowanie, ale oparte na `slot_hours`

### 3. `src/pages/AutoWebinarPublicPage.tsx`
- Odczytać parametr `?slot=HH:MM` z `useSearchParams()`
- Przekazać jako `guestSlotTime` do `AutoWebinarEmbed`

### 4. `src/components/auto-webinar/AutoWebinarEmbed.tsx`
- Dodać prop `guestSlotTime?: string`
- Przekazać do `useAutoWebinarSync`
- Dodać obsługę nowego stanu `isLinkExpired` — ekran z komunikatem: "Ten link wygasł. Skontaktuj się z osobą, która Cię zaprosiła, aby otrzymać nowy link."

### 5. `src/pages/EventGuestRegistration.tsx`
- W `roomLink` dodać `?slot=HH:MM` na podstawie obliczonego slotu: 
  `roomLink: \`.../${event.slug}?slot=${slotTimeValue}\``
- Zaktualizować `getNextSlot()` aby używał `slot_hours` zamiast generowania z interwału

### 6. `src/components/admin/AutoWebinarManagement.tsx`
- Zastąpić selektory start_hour/end_hour/interval_minutes nowym UI:
  - **Lista godzin emisji**: wielokrotny wybór godzin (np. checkboxy lub tag-input) z zakresu 0:00–23:00
  - **Pokój otwiera się**: input liczbowy (minuty przed startem, domyślnie 5)
  - **Odliczanie startuje**: input liczbowy (minuty przed startem, domyślnie 2)
  - **Wygaśnięcie linku**: input liczbowy (minuty po starcie, domyślnie 10)
- Wizualny podgląd harmonogramu: lista slotów z fazami

### 7. `src/components/auto-webinar/AutoWebinarEventView.tsx`
- Zaktualizować generowanie listy slotów z `slot_hours` zamiast `interval_minutes`

### 8. `src/components/team-contacts/InviteToEventDialog.tsx`
- Przy generowaniu linku zaproszeniowego dodać `?slot=HH:MM` do URL-a

---

## Reguła wygasania linku (twarda)

```text
Link: /auto-webinar/watch/szansa-biznesowa?slot=17:00

Timeline:
16:55  → Pokój otwarty, countdown do 17:00
16:58  → Odliczanie precyzyjne (1s)
17:00  → Start odtwarzania
17:10  → Link WYGASA → ekran "Link wygasł"
17:11+ → Brak dostępu
```

Gość **bez parametru `?slot`** widzi ekran "Brak aktywnego zaproszenia" — nie może dołączyć losowo.

---

## Kompatybilność wsteczna
- Jeśli `slot_hours` jest pustą tablicą, system fallbackuje do starej logiki `start_hour + interval_minutes`
- Stare linki bez `?slot` dla zalogowanych użytkowników nadal działają
- Migracja nie usówa starych kolumn

