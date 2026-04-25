## Cel

Umożliwić ponowną edycję kadrowania zapisanego banera — bez konieczności wgrywania pliku ponownie z dysku. Dotyczy każdego pola używającego `ImageUploadInput` (banery eventów, awatary, zdjęcia prelegentów, banery stron partnerskich itp.).

## Problem

Obecnie w `ImageUploadInput`:
- Dopóki nie ma `value` — można wgrać plik i otworzyć cropper.
- Gdy `value` jest ustawione — widać tylko podgląd z czerwonym X (usuń). Aby zmienić kadr trzeba usunąć obraz i wgrać go ponownie z dysku, co tracze oryginalną rozdzielczość, jeśli nie mamy już źródła.

## Zmiany

Wszystkie w jednym pliku: `src/components/partner-page/ImageUploadInput.tsx`.

### 1. Nowa funkcja `handleEditExisting()`

- Pobiera aktualny URL z `value`, oczyszcza fragment `#shape=xyz`.
- Jeżeli URL zawiera `#shape=xyz`, ustawia ten preset jako wybrany w cropperze (np. `h21_9`), w przeciwnym razie używa `defaultShape`/`initialShape`.
- `fetch(cleanUrl + cache-bust, { mode: 'cors', cache: 'no-store' })` → blob → `URL.createObjectURL(blob)` jako `cropSrc`.
- Otwiera ten sam dialog kadrowania, którego używa wgrywanie nowego pliku.
- Obsługa błędu CORS/sieci: toast „Nie można otworzyć obrazu — wgraj plik ponownie z dysku".

### 2. Refaktor `handleCropConfirm()`

- Usunąć warunek `!selectedFile` z early-returnu (linia 135). Po edycji istniejącego obrazka `selectedFile` jest `null`, ale `cropSrc` i `croppedAreaPixels` są dostępne — to wystarczy do zapisania nowego skadrowanego pliku do storage.
- Po zapisie nowy URL trafia do `onChange()` (jak dotychczas — to oznacza, że stary plik zostaje w storage; jest to zgodne z aktualnym zachowaniem przy wymianie obrazu i pozwala na cofnięcie zmian).
- Treść toasta uzależniona od kontekstu: „Przesłano!" (nowy plik) vs „Zaktualizowano kadrowanie!" (re-crop).

### 3. UI — przyciski edycji kadrowania

W bloku podglądu obrazka (`value && !compact`):
- Obok przycisku X dodać przycisk z ikoną `Crop` (lucide-react) → wywołuje `handleEditExisting`.
- Stylizacja: `bg-background/90 hover:bg-background border shadow-sm rounded-full p-1.5` — spójna z istniejącym przyciskiem usuwania, ale neutralna (nie destruktywna).
- Tooltip/`aria-label`: „Edytuj kadrowanie".
- Stan ładowania (pobieranie blob): ikona `Loader2 animate-spin`.

W rzędzie `Input` + `Upload` (poniżej podglądu):
- Dodać trzeci przycisk `Crop` (między inputem a Upload), widoczny tylko gdy `value` jest ustawione. Daje to dostęp do edycji także w trybie `compact`, gdzie nie ma podglądu z overlay'em.

### 4. Import

Dodać `Crop` do importu z `lucide-react` (linia 4).

## Pliki edytowane

- `src/components/partner-page/ImageUploadInput.tsx`

## Efekt

- Po wgraniu i zapisaniu banera, w panelu „Główne → Grafika banera" przy podglądzie pojawia się przycisk „Edytuj kadrowanie" — kliknięcie otwiera ten sam cropper co przy pierwszym wgraniu, z aktualnie zapisanym obrazkiem już załadowanym i z odpowiednim presetem (21:9 dla banera eventu).
- Admin może wielokrotnie zmieniać kadr bez ponownego wgrywania pliku z dysku.
- Mechanizm działa wszędzie tam, gdzie używany jest `ImageUploadInput`: banery eventów, zdjęcia prelegentów, awatary, banery stron partnerskich itp.
- Gdy obrazu nie da się pobrać (CORS / 404), użytkownik dostaje czytelny toast i może nadal usunąć obraz lub wgrać nowy.
