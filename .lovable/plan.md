## Cel

Admin decyduje per-element, co niezalogowany gość zobaczy na publicznej stronie eventu (`/events/{slug}`) po kliknięciu „Dowiedz się więcej". Ukryte elementy po prostu się nie wyświetlają (bez placeholderów).

## Zakres widoczności

Dodajemy flagę `visible_to_guests` (boolean, default `true`) dla:

1. **Stałe bloki eventu** (kolumny w `paid_events`):
   - `guests_show_description` — opis (gdy brak sekcji CMS)
   - `guests_show_speakers` — sekcja Prelegenci
   - `guests_show_tickets` — sidebar z biletami / CTA zakupu
   - `guests_show_schedule` — harmonogram (gdy zostanie aktywowany)

2. **Per sekcja CMS** (`paid_event_content_sections`):
   - nowa kolumna `visible_to_guests` (boolean, default `true`) — admin zaznacza ją osobno przy każdej sekcji

Zalogowani użytkownicy widzą wszystko jak dotychczas (zgodnie z istniejącymi flagami `visible_to_partners/clients/specjalista/everyone`). Flagi `guests_*` wpływają wyłącznie na widok niezalogowanego gościa.

## Zmiany w bazie (migracja)

```sql
ALTER TABLE paid_events
  ADD COLUMN guests_show_description boolean NOT NULL DEFAULT true,
  ADD COLUMN guests_show_speakers    boolean NOT NULL DEFAULT true,
  ADD COLUMN guests_show_tickets     boolean NOT NULL DEFAULT true,
  ADD COLUMN guests_show_schedule    boolean NOT NULL DEFAULT true;

ALTER TABLE paid_event_content_sections
  ADD COLUMN visible_to_guests boolean NOT NULL DEFAULT true;
```

RLS dla obu tabel pozostaje bez zmian — kolumny są jawne, kontrola odbywa się w warstwie UI/zapytań.

## Zmiany w UI panelu admina

**`EventMainSettingsPanel.tsx`** — w sekcji „Widoczność" dodaję podsekcję **„Widoczność dla niezalogowanych gości"** (4 switche):
- Pokaż opis wydarzenia
- Pokaż prelegentów
- Pokaż bilety i przycisk zapisu
- Pokaż harmonogram

**`EventSectionsPanel.tsx` / `ContentSectionEditor.tsx`** — przy każdej sekcji CMS dodaję jeden switch **„Widoczne dla niezalogowanych gości"** obok istniejącego `is_active`.

## Zmiany w widoku publicznym

**`src/pages/PaidEventPage.tsx`**:

1. Pobieranie sekcji CMS — dodać do select `visible_to_guests`.
2. Pobieranie eventu — typ `PaidEvent` rozszerzyć o 4 nowe pola `guests_show_*`.
3. Wyliczyć `isGuest = !user`.
4. Filtrowanie sekcji CMS:
   ```ts
   const visibleSections = contentSections.filter(s =>
     !isGuest || s.visible_to_guests
   );
   ```
5. Renderowanie warunkowe:
   - Opis (`event.description`): pokazuj gdy `!isGuest || event.guests_show_description`
   - `<PaidEventSpeakers />`: gdy `speakers.length > 0 && (!isGuest || event.guests_show_speakers)`
   - Sidebar `<PaidEventSidebar />` z biletami: gdy `!isGuest || event.guests_show_tickets`. Gdy ukryty — kolumna treści zajmuje pełną szerokość (usunąć grid `lg:flex-row` w tym wypadku albo wyrenderować bez sidebara).
   - Harmonogram analogicznie (przygotowanie pod przyszłość).
6. **Nawigacja** (`PaidEventNavigation`) — `navigationItems` budować już po przefiltrowaniu, żeby anchory ukrytych sekcji nie pojawiały się gościom.
7. **`MyEventFormLinks`** (narzędzia partnera) — i tak wymaga `user`, więc dla gości naturalnie nie renderować (dodać `{user && ...}`).

## Zmiany w typach

`src/integrations/supabase/types.ts` jest auto-generowany — nie tykamy. W `PaidEventPage.tsx` lokalny interface `PaidEvent` i `ContentSection` rozszerzamy o nowe pola.

## Pliki do edycji

- migracja SQL (4 + 1 kolumna)
- `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx` — UI 4 switche
- `src/components/admin/paid-events/editor/EventSectionsPanel.tsx` lub `ContentSectionEditor.tsx` — switch per sekcja CMS
- `src/pages/PaidEventPage.tsx` — logika filtrowania per `isGuest`

## Domyślne zachowanie po wdrożeniu

Wszystkie istniejące eventy i sekcje dostają `true` (default) — nic nie znika gościom bez świadomej decyzji admina. Admin wyłącza punktowo to, co ma być tylko dla zalogowanych.
