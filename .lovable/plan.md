

# Plan: Niezależne pokoje BO i HC + dynamiczna kategoria na stronie publicznej

## Kontekst

Na screenie widać 3 zakładki: **Webinary** (admin events — bez zmian), **Business Opportunity**, **Health Conversation**. BO i HC to dwa niezależne auto-webinary z osobnymi konfiguracjami, playlistami, slotami. Problem: strona publiczna `/a-w/:slug` hardcoduje `category="business_opportunity"`, a pokój zalogowanego łączy obie kategorie w jednym widoku z tabami.

## Zmiany

### 1. Strona publiczna — dynamiczne rozpoznanie kategorii ze sluga

**Plik: `src/pages/AutoWebinarPublicPage.tsx`**
- Pobrać `slug` z `useParams()`
- Na mount: query `events` po slugu → `event.id` → query `auto_webinar_config` po `event_id` → pobrać `category`
- Przekazać dynamiczną kategorię do `<AutoWebinarEmbed category={category} />`
- Loading spinner podczas pobierania; błąd jeśli nie znaleziono

### 2. Pokój zalogowanego — oddzielne trasy zamiast tabów

**Plik: `src/components/auto-webinar/AutoWebinarRoom.tsx`**
- Przyjmować prop `category: 'business_opportunity' | 'health_conversation'`
- Usunąć Tabs — renderować jeden `<AutoWebinarEmbed category={category} />`

**Plik: `src/pages/AutoWebinarPage.tsx`**
- Zamienić na redirect do `/events/webinars` (pokoje są teraz dostępne przez dedykowane trasy)

**Plik: `src/App.tsx`**
- Dodać dwie trasy:
  - `/auto-webinar/business` → `<AutoWebinarRoom category="business_opportunity" />`
  - `/auto-webinar/health` → `<AutoWebinarRoom category="health_conversation" />`
- Zachować `/auto-webinar` jako redirect do `/events/webinars`
- `/a-w/:slug` — bez zmian (obsługiwane dynamicznie przez punkt 1)

### 3. Nawigacja z WebinarsPage do pokojów

**Plik: `src/components/auto-webinar/AutoWebinarEventView.tsx`**
- Sprawdzić czy przycisk "Dołącz" / "Wejdź na webinar" linkuje do `/auto-webinar/business` lub `/auto-webinar/health` w zależności od prop `category`

### 4. Drobne poprawki

- Upewnić się że `ProfileCompletionGuard` i `knownPrefixes` rozpoznają nowe trasy (`/auto-webinar/business`, `/auto-webinar/health`) — obecny prefix `/auto-webinar` już to pokrywa

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `AutoWebinarPublicPage.tsx` | Dynamiczna kategoria ze sluga zamiast hardcoded |
| `AutoWebinarRoom.tsx` | Prop `category`, bez tabów |
| `AutoWebinarPage.tsx` | Redirect do `/events/webinars` |
| `App.tsx` | Dwie dedykowane trasy dla pokojów BO i HC |
| `AutoWebinarEventView.tsx` | Sprawdzenie linku do pokoju |

## Czego NIE zmieniamy
- Webinary admina (zakładka "Webinary") — bez zmian
- Konfiguracja, playlisty, ustawienia slotów — każda kategoria ma już osobne dane w bazie

