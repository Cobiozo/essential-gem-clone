# Naprawa: Prelegenci niewidoczni na publicznej stronie wydarzenia

## Diagnoza

W edytorze admina prelegenci pojawiają się, bo `EventEditorPreview.tsx` pobiera dane z tabeli `paid_event_speakers` i renderuje je w sekcji "Prelegenci".

Na publicznej stronie `/events/:slug` (`src/pages/PaidEventPage.tsx`):
- Komponent `PaidEventSpeakers` jest **zaimportowany, ale jego użycie jest zakomentowane** (linia 348: `{/* <PaidEventSpeakers speakers={[]} /> */}`)
- **Brakuje zapytania** do tabeli `paid_event_speakers`
- W konsekwencji partner/klient nigdy nie zobaczy prelegentów, niezależnie od tego, ilu admin doda.

## Zakres zmian

### `src/pages/PaidEventPage.tsx`
1. Dodać `useQuery` pobierające prelegentów z `paid_event_speakers` dla `event.id`, posortowane po `position`.
2. Odkomentować i podpiąć `<PaidEventSpeakers />` z prawdziwymi danymi (mapowanie `photo_url` → `photoUrl`).
3. Dodać do `navigationItems` pozycję „Prelegenci" (id: `speakers`), gdy lista jest niepusta — żeby nawigacja kotwicowa działała.
4. Renderować sekcję pomiędzy sekcjami CMS a `MyEventFormLinks`, aby układ pasował do podglądu admina.

### Spójność z podglądem admina
Sekcja w publicznym widoku korzysta już z istniejącego komponentu `PaidEventSpeakers` (z fotografią, tytułem, bio, gridem). Aby wygląd między adminem a publiczną stroną był maksymalnie zbliżony, użyjemy domyślnych styli komponentu publicznego (kafelki w gridzie). Tytuł sekcji: „Prelegenci".

## Pliki do edycji
- `src/pages/PaidEventPage.tsx` — dodać query + render sekcji prelegentów + wpis w nawigacji
