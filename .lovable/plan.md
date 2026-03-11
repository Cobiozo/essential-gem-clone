
Cel: w widżecie „Moje spotkania” pokazywać wyłącznie spotkania, na które użytkownik jest faktycznie zapisany (nie wszystkie terminy danego wydarzenia).

1) Diagnoza źródła problemu
- Problem wynika z `src/hooks/useOccurrences.ts` w `expandEventsForCalendar`.
- Dla wydarzeń multi-occurrence został dodany fallback:
  - `registrationMap?.get(eventId:occIndex) ?? event.is_registered ?? false`
- Skutek: jeśli użytkownik ma choć jedną rejestrację na wydarzenie (`event.is_registered = true`), to wszystkie przyszłe terminy tego wydarzenia dostają `is_registered = true`, więc „Moje spotkania” pokazuje „wszystko”.

2) Plan implementacji (minimalny i bezpieczny)
- Plik do zmiany: `src/hooks/useOccurrences.ts`
- W gałęzi multi-occurrence:
  - usunąć szeroki fallback do `event.is_registered` dla każdego terminu,
  - dodać logikę:
    - rejestracja „specyficzna” = tylko gdy istnieje klucz `${event.id}:${occ.index}`,
    - rejestracja „legacy null” (`${event.id}:null`) ma działać tylko awaryjnie i tylko dla jednego terminu (najbliższego przyszłego), oraz tylko jeśli brak rejestracji specyficznych dla tego eventu.
- W gałęzi single occurrence:
  - zostawić obecną logikę fallbacku (żeby pojedyncze wydarzenia typu TESTOWY nadal były widoczne po zapisie).

3) Szczegóły techniczne
- Dla każdego multi-eventu policzyć:
  - `hasSpecificRegistration` (czy użytkownik ma choć jeden wpis z konkretnym `occurrence_index`),
  - `hasLegacyNullRegistration` (czy ma wpis `occurrence_index = null`).
- Dla każdego occurrence ustawić `is_registered`:
  - `true` gdy jest wpis specyficzny dla tego indexu,
  - albo `true` tylko dla `nextActiveOccurrence.index`, gdy `hasLegacyNullRegistration === true` i `hasSpecificRegistration === false`,
  - w pozostałych przypadkach `false`.
- Dzięki temu:
  - „Moje spotkania” pokaże wyłącznie realnie zapisane spotkania,
  - nie wróci problem „znikającego” pojedynczego webinaru.

4) Kryteria akceptacji (po wdrożeniu)
- Niezapisane wydarzenia nie pojawiają się w „Moje spotkania”.
- Po kliknięciu „Zapisz się” wydarzenie pojawia się od razu.
- Dla multi-occurrence widoczny jest tylko zapisany termin (a nie wszystkie terminy).
- Dla legacy rejestracji z `occurrence_index = null` widoczny jest tylko jeden najbliższy termin.
