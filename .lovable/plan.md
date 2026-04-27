## Cel

1. W module Zdrowa Wiedza zmienić nazwę zakładki widocznej dla użytkownika z **"Testymoniale"** na **"Prawdziwe Historie"**.
2. Naprawić problem: filmy dodane do testymoniali nie odtwarzają się po kliknięciu "Podgląd".

## Dlaczego filmy się nie odtwarzają (diagnoza)

W `src/components/testimonials/TestimonialPreviewDialog.tsx` (komponent uruchamiany dla każdego materiału z kategorii "Testymoniale") karuzela renderuje WYŁĄCZNIE tagi `<img>` dla `media_url` + `gallery_urls`, niezależnie od tego, czy materiał ma `content_type === 'video'`.

Skutek: po kliknięciu "Podgląd" przy testymonialu wideo widać tylko miniaturkę (poster) jako obrazek — nie ma elementu `<video>`, więc film nigdy się nie uruchamia. Standardowy dialog (dla nie‑testymoniali) używa komponentu `SecureMedia`, który poprawnie odtwarza wideo/audio — i tej samej logiki brakuje w dialogu testymoniali.

## Zmiany

### 1. Zmiana nazwy zakładki (widok użytkownika)

Plik: `src/pages/HealthyKnowledge.tsx` (linia 259)

- `tf('hk.tabTestimonials', 'Testymoniale')` → `tf('hk.tabTestimonials', 'Prawdziwe Historie')`

Uwaga: pozostawiamy wewnętrzną nazwę kategorii w bazie danych jako `'Testymoniale'` (używana w wielu miejscach jako klucz logiczny, m.in. RLS, edytor admina, filtry). Zmieniamy wyłącznie etykietę widoczną dla użytkownika końcowego w Zdrowej Wiedzy. Panel admina (CMS) nie jest objęty zmianą — tam pozostaje "Testymoniale" jako techniczna nazwa kategorii.

### 2. Fix odtwarzania wideo w podglądzie testymoniali

Plik: `src/components/testimonials/TestimonialPreviewDialog.tsx`

- Rozróżnić typ materiału po `material.content_type`:
  - `'video'` → renderować `<SecureMedia mediaType="video" ... />` (jak w standardowym dialogu) zamiast `<img>`.
  - `'audio'` → renderować `<SecureMedia mediaType="audio" ... />`.
  - `'image'` (oraz fallback) → zostawić obecną karuzelę zdjęć z `media_url` + `gallery_urls`.
  - `'document'` → przycisk "Otwórz dokument" (link do `media_url`).
- `gallery_urls` traktować jako dodatkowe zdjęcia tylko dla materiałów typu image (lub gdy istnieją oprócz głównego wideo — wtedy zachować je w sekcji galerii pod wideo).
- Zaimportować `SecureMedia` z tego samego źródła co w `HealthyKnowledge.tsx`.

### 3. (Opcjonalne, drobne) Spójność tekstu na karcie listy

W `HealthyKnowledge.tsx` na karcie testymonialu wyświetlany jest badge `Testymoniale` (z `material.category`). Etykietę widoczną dla użytkownika można zamienić na "Prawdziwa historia" tylko wizualnie — bez zmiany wartości w bazie. Do potwierdzenia z użytkownikiem (patrz pytanie poniżej).

## Pytanie do potwierdzenia

Czy zmienić również etykiety pojawiające się w innych miejscach widocznych dla użytkownika (np. badge "Testymoniale" na karcie materiału, teksty „opinia/opinii" itp. — pozostają), czy wyłącznie nazwę zakładki głównej? Domyślnie zakładam: tylko zakładkę + badge na karcie.

## Pliki do edycji

- `src/pages/HealthyKnowledge.tsx` — zmiana etykiety zakładki (i opcjonalnie wyświetlanej etykiety badge dla kategorii Testymoniale).
- `src/components/testimonials/TestimonialPreviewDialog.tsx` — obsługa wideo/audio przez `SecureMedia` zamiast wyłącznie `<img>`.

Brak zmian w bazie danych, RLS, panelu admina i kluczach kategorii.
