

# Poprawa jakosci teł, persistencja wyboru i wlasne tla uzytkownika

## Trzy problemy do rozwiazania

### 1. Kontur miedzy tlem a osoba nadal niewystarczajacy

Na screenshocie widac: tlo przebija przez ramiona i wlosy, krawedzie sa nieostrze. Obecne parametry `contrastMask` (strength 6 i 5) i progi (0.65/0.40) sa zbyt lagodne.

**Rozwiazanie**: Agresywniejsze parametry maski:
- Zwiekszyc sile kontrastu sigmoid z 6/5 na 8/6
- Zaostrzenie progow: `thresholdHigh: 0.70`, `thresholdLow: 0.45` (strefa przejscia 0.25 -> 0.20 zamiast 0.25)
- Dodac **erode/dilate** na masce: lekkie zmniejszenie maski (erode 1px) eliminuje "halo" na krawedziach, potem lekkie powiekszenie (dilate 1px) przywraca wielkosc sylwetki
- Zwiekszyc sile temporal smoothing z 0.3/0.7 na 0.35/0.65 — silniejsze tlumienie migotania

**Plik**: `src/components/meeting/VideoBackgroundProcessor.ts`

### 2. Wybor tla nie jest zapamietywany po odswiezeniu/reconnect

Obecnie `bgMode` i `bgSelectedImage` zyja tylko w React state (`useVideoBackground` hook). Po odswiezeniu strony znikaja.

**Rozwiazanie**: Persistencja w `localStorage`:
- W `useVideoBackground` — zapisywac `mode` i `selectedImage` do `localStorage` przy kazdej zmianie
- Inicjalizowac stan z `localStorage` zamiast defaultow (`'none'`, `null`)
- W `VideoRoom.tsx` — po zdobyciu strumienia kamery, automatycznie zastosowac zapisane tlo (juz istnieje logika `bgModeRef.current !== 'none'` w `reacquireLocalStream` — trzeba ja rozszerzyc o inicjalizacje z localStorage)
- Przy `handleLeave` NIE czyscic localStorage (tlo ma byc zapamietane miedzy spotkaniami)

**Pliki**: `src/hooks/useVideoBackground.ts`, `src/components/meeting/VideoRoom.tsx`

### 3. Mozliwosc przeslania wlasnych tel (max 3 na uzytkownika)

Uzytkownik moze przeslac max 3 obrazy jako wlasne tla. Sa zapamietane i dostepne we wszystkich przyszlych spotkaniach. Aby dodac nowy — musi usunac istniejacy.

**Rozwiazanie**:

**a) Supabase Storage — bucket `meeting-backgrounds`**
- Nowa migracja SQL: bucket `meeting-backgrounds` (public), z RLS policies:
  - INSERT: authenticated, path starts with `{user_id}/`
  - SELECT: authenticated, path starts with `{user_id}/`
  - DELETE: authenticated, path starts with `{user_id}/`
- Limit 3 plikow per user — wymuszony w kodzie klienta

**b) Nowy hook `useCustomBackgrounds`**
- Lista custom backgrounds z Supabase Storage (list files w katalogu `{userId}/`)
- Upload nowego obrazu (max 3, walidacja po stronie klienta)
- Usuwanie istniejacego
- Zwraca: `customImages: string[]`, `uploadImage(file: File)`, `deleteImage(url: string)`, `isUploading`

**c) Rozszerzenie BackgroundSelector**
- Nowa sekcja "Twoje tla" z miniaturami przeslanych obrazow
- Przycisk "Dodaj tlo" (upload) — aktywny tylko gdy < 3 obrazow
- Przycisk usuwania na kazdym wlasnym tle (ikona kosza)
- Miniaturki obrazow zamiast tekstu "Tlo 1/2/3"

**d) Przepływ danych**
- `useCustomBackgrounds` zwraca publiczne URL obrazow
- `BackgroundSelector` laczy domyslne tla (`BACKGROUND_IMAGES`) z custom tla uzytkownika
- `handleBackgroundChange` w VideoRoom dziala identycznie — URL obrazu jest URL-em

## Zmiany techniczne

### Plik 1: `src/components/meeting/VideoBackgroundProcessor.ts`
- `BLUR_PROFILES`: zaostrzenie progow (0.70/0.45 dla blur-light i image, 0.65/0.40 dla blur-heavy)
- `contrastMask` wywolania: strength 8 (pre-blur) i 6 (post-blur)
- Nowa funkcja `erodeDilateMask()` — operacja morfologiczna na masce (erode 1px -> dilate 1px) pomiedzy krokami kontrastowania
- Temporal smoothing: 0.35/0.65

### Plik 2: `src/hooks/useVideoBackground.ts`
- Inicjalizacja `mode` i `selectedImage` z `localStorage`
- Zapis do `localStorage` w `applyBackground` i `stopBackground`
- Eksport zapisanego stanu dla auto-apply przy starcie

### Plik 3: `src/hooks/useCustomBackgrounds.ts` (NOWY)
- Hook do zarzadzania wlasnymi tlami w Supabase Storage
- `listBackgrounds()`, `uploadBackground(file)`, `deleteBackground(path)`
- Limit 3 plikow, walidacja mime type (image/*)

### Plik 4: `src/components/meeting/BackgroundSelector.tsx`
- Dodanie sekcji "Twoje tla" z miniaturami
- Input file dla uploadu (ukryty, triggerowany przyciskiem)
- Przycisk usuwania na custom tlach
- Prop `customImages` i `onUpload`/`onDelete` callbacki

### Plik 5: `src/components/meeting/VideoRoom.tsx`
- Integracja `useCustomBackgrounds` hook
- Przekazanie custom images do MeetingControls/BackgroundSelector
- Auto-apply tla z localStorage po uzyskaniu strumienia kamery

### Plik 6: `src/components/meeting/MeetingControls.tsx`
- Nowe props: `customBackgroundImages`, `onUploadBackground`, `onDeleteBackground`
- Przekazanie do BackgroundSelector

### Plik 7: Migracja SQL
- Bucket `meeting-backgrounds`, RLS policies dla upload/select/delete per user

## Kolejnosc implementacji

1. Migracja SQL (bucket + policies)
2. Poprawa maski alfa (VideoBackgroundProcessor.ts)
3. Persistencja wyboru tla (useVideoBackground.ts + VideoRoom.tsx)
4. Hook useCustomBackgrounds
5. UI uploadu/usuwania (BackgroundSelector + MeetingControls + VideoRoom)

