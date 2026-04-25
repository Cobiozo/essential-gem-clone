## Cel

1. **Ujednolicić kadrowanie banera** w komponencie edycji (cropper + inline preview w `ImageUploadInput`) tak, aby dokładnie powtarzało zachowanie `PaidEventHero` na wszystkich breakpointach (16/9 → 2/1 → 21/9).
2. **Dodać tryb "Podgląd niezalogowanego gościa"** w panelu edycji eventu — pokazuje stronę 1:1 jak na publicznym widoku dla guesta (z respektowaniem `guests_show_*` flag).
3. **Zsynchronizować gradient** w `PaidEventHero` i `ImageUploadInput` — identyczna intensywność i zasięg (`bottom-0 h-2/3`, `from-background/90 via-background/55 to-transparent`) na mobile i desktop.

## Zmiany

### 1. `src/components/partner-page/ImageUploadInput.tsx` — synchronizacja preview banera

Sekcja `showEventBannerPreview` (linie 245–273) używa stałego `aspect-[21/9]` i starego gradientu `from-background/95 via-background/50` na pełnym `inset-0`. To rozjeżdża się z aktualnym `PaidEventHero`.

Zmiany:
- Container preview: `aspect-[16/9] sm:aspect-[2/1] lg:aspect-[21/9]` zamiast samego `aspect-[21/9]` — identyczna progresja jak w hero.
- Etykieta nad preview: zmienić tekst na "Podgląd na stronie wydarzenia (proporcje responsywne 16:9 → 21:9)".
- Gradient: zastąpić `absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent` na:
  ```
  pointer-events-none absolute inset-x-0 bottom-0 h-2/3
  bg-gradient-to-t from-background/90 via-background/55 to-transparent
  ```
- Podpis "Tytuł wydarzenia" — ujednolicić styl z hero: `drop-shadow-lg`, `text-foreground`, padding `pb-3 sm:pb-4`.

### 2. `src/components/paid-events/public/PaidEventHero.tsx` — drobna korekta gradientu

Aktualnie gradient ma `from-background/90 via-background/55 to-transparent` na `h-2/3`. To zostaje, ale aby intensywność była **identyczna** na mobile i desktop niezależnie od wysokości kontenera, dodajemy:
- `min-h-[180px]` na sam div gradientu (przy bardzo wąskich ekranach 2/3 może być za małe, by zakryć tekst metadanych).
- Nie zmieniamy aspect ratio kontenera.

### 3. Nowy tryb podglądu gościa w edytorze

#### 3a. `src/components/admin/paid-events/editor/PaidEventEditorLayout.tsx`
- Dodać state `previewMode: 'admin' | 'guest'` (domyślnie `'admin'`).
- W headerze obok przycisku "Odśwież podgląd" dodać `ToggleGroup` (lub dwa `Button` warianty) z opcjami:
  - "Widok edytora" (admin)
  - "Widok niezalogowanego gościa"
- Przekazać `previewMode` do `EventEditorPreview`.

#### 3b. `src/components/admin/paid-events/editor/EventEditorPreview.tsx`
- Dodać prop `previewMode: 'admin' | 'guest'`.
- Pobierać dodatkowe pola z `paid_events`: `guests_show_description`, `guests_show_speakers`, `guests_show_tickets`, `guests_show_schedule`.
- Pobierać `visible_to_guests` z `paid_event_content_sections` (już dostępne w schemacie wg `PaidEventPage.tsx`).
- Gdy `previewMode === 'guest'`:
  - Filtrować `sections` po `visible_to_guests !== false`.
  - Ukrywać sekcję sections gdy `guests_show_description === false` (gdy używana jest fallback opisu zamiast sekcji).
  - Ukrywać sekcję "Prelegenci" gdy `guests_show_speakers === false`.
  - Ukrywać prawą kolumnę z biletami gdy `guests_show_tickets === false`.
  - Wyświetlić u góry żółtą wstęgę informacyjną: "Podgląd: niezalogowany gość — widzi tylko elementy włączone w 'Ustawieniach głównych'."
- W obu trybach hero (`PaidEventHero`) renderuje się identycznie — to gwarantuje, że baner wygląda 1:1 jak na stronie publicznej dla gościa.

## Pliki edytowane

- `src/components/partner-page/ImageUploadInput.tsx`
- `src/components/paid-events/public/PaidEventHero.tsx`
- `src/components/admin/paid-events/editor/PaidEventEditorLayout.tsx`
- `src/components/admin/paid-events/editor/EventEditorPreview.tsx`

## Efekt

- Cropper w `ImageUploadInput` pokazuje preview baneru z dokładnie tymi samymi proporcjami i tym samym gradientem co publiczny `PaidEventHero` — admin widzi rzeczywisty wygląd zanim zatwierdzi kadrowanie.
- W edytorze eventu admin może jednym przełącznikiem zobaczyć dokładnie to, co zobaczy niezalogowany gość, włącznie z respektowaniem flag `guests_show_*`.
- Gradient jest spójny: dolne 2/3, ta sama intensywność (`/90 → /55 → transparent`), niezależnie od breakpointu.
