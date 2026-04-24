## Problemy do naprawienia

### 1. Brak możliwości dodania zdjęcia prelegenta
W panelu prelegentów (`EventSpeakersPanel.tsx`) pole "URL zdjęcia" to zwykły `Input` tekstowy — nie ma uploadu z komputera, tak jak naprawiliśmy banner.

### 2. Lupa "PLC OMEGA BASE" na stronie wydarzenia
Pływający widżet `MedicalChatWidget` (ikona lupy w prawym dolnym rogu) pojawia się na publicznej stronie wydarzenia `/events/:slug`. Polityka mówi, że na stronach gości wydarzeń ma być ukryty — jest ukryty tylko na `/events/register/...` i `/e/...`, ale nie na `/events/:slug` (PaidEventPage).

## Plan zmian

### A. Upload zdjęć prelegentów
**Plik:** `src/components/admin/paid-events/editor/EventSpeakersPanel.tsx`
- Zaimportować `ImageUploadInput` (ten sam co dla bannera).
- Zastąpić obecny `<Input value={photo_url}…>` komponentem `<ImageUploadInput>` z labelem "Zdjęcie prelegenta".
- Wartość nadal trafia do pola `photo_url` przez `setEditingValue(speaker.id, 'photo_url', url)`.
- Działanie: drag-and-drop / wybór pliku z dysku + opcjonalnie URL (jak banner).

### B. Ukrycie widżetu czatu na stronie paid event
**Plik:** `src/App.tsx` (funkcja warunkowo renderująca `MedicalChatWidget`, linia ~200)
- Dodać warunek wykrywający publiczną stronę wydarzenia: `const isPaidEventPage = /^\/events\/[^/]+$/.test(path);` (dokładnie `/events/{slug}`, bez kolizji z `/events/webinars`, `/events/team-meetings`, `/events/individual-meetings`, `/events/register/...`).
- Dołączyć `isPaidEventPage` do listy warunków ukrywania widżetu.

### Pliki do edycji
- `src/components/admin/paid-events/editor/EventSpeakersPanel.tsx`
- `src/App.tsx`

Brak zmian w bazie danych ani edge functions.