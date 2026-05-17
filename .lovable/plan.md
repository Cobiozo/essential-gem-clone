## Problem

Na stronie `/zdrowa-wiedza` (Baza wiedzy / Healthy Knowledge) widnieje błędny tytuł "Tytuł strony" i podtytuł "Centrum Zasobów" zamiast "Baza wiedzy".

## Przyczyna

Kod używa `tf('hk.pageTitle', 'Baza wiedzy')` i `tf('hk.subtitle', '...')`. W bazie `i18n_translations` nie ma wpisów dla namespace `hk` / klucz `pageTitle`/`subtitle`. Funkcja `getTranslation` (Strategy 3) szuka wtedy „gołego" klucza we wszystkich namespace'ach i trafia na:
- `admin.pageTitle` (PL) = "Tytuł strony"
- `knowledge.subtitle` (PL) = "Centrum Zasobów"

Stąd zła treść w nagłówku — fallback z kodu nie ma szans zadziałać.

## Plan naprawy

1. **Migracja SQL** — dodać do `i18n_translations` brakujące tłumaczenia w namespace `hk` dla wszystkich aktywnych języków (pl, en, de, it, es, fr, pt, no):
   - `hk.pageTitle` → "Baza wiedzy" (PL) + odpowiedniki
   - `hk.subtitle` → "Materiały edukacyjne o zdrowiu i wellness" (PL) + odpowiedniki
   - `hk.testimonialsSubtitle` → "Opinie i efekty kuracji produktami Eqology" (PL) + odpowiedniki
   - `hk.tabMaterials` → "Materiały" (PL) + odpowiedniki
   - `hk.tabTestimonials` → "Prawdziwe Historie" (PL) + odpowiedniki

   `INSERT ... ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value` — bezpieczne dla ponownego uruchomienia.

2. **Weryfikacja** — po migracji wejść na `/zdrowa-wiedza` i potwierdzić, że nagłówek = "Baza wiedzy", podtytuł = "Materiały edukacyjne o zdrowiu i wellness". Cache tłumaczeń ładuje się przy starcie sesji — wystarczy hard refresh.

## Zakres

Tylko migracja danych. Bez zmian w komponentach React i bez zmian logiki. Pozostałe miejsca używające `tf('hk.*')` (HealthyKnowledgePlayer) skorzystają z tych samych wpisów.
