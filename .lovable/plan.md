

# Plan: Zmiana szablonu z cooldownem 14 dni i historią

## Zakres

Dodanie funkcjonalności pozwalającej partnerowi wrócić do galerii szablonów, zobaczyć aktualnie wybrany, podejrzeć inne, i zmienić szablon (max raz na 14 dni). Stare dane szablonu są zapamiętywane i przywracane przy powrocie do wcześniejszego szablonu, z ostrzeżeniem o konieczności weryfikacji treści.

## Zmiany

### 1. Migracja SQL — nowe kolumny w `partner_pages`

Dodanie dwóch kolumn:
- `template_changed_at` (TIMESTAMPTZ) — data ostatniej zmiany szablonu (do sprawdzania cooldownu 14 dni)
- `template_history` (JSONB DEFAULT '{}') — mapa `{ template_id: custom_data }` przechowująca dane każdego używanego szablonu

### 2. Hook `usePartnerPage.ts` — logika zmiany szablonu

- Rozszerzyć `selectTemplate` o:
  - Sprawdzenie cooldownu 14 dni (porównanie `template_changed_at` z aktualną datą)
  - Zapis bieżącego `custom_data` do `template_history[current_template_id]` przed zmianą
  - Odczyt danych z `template_history[new_template_id]` jeśli istnieją (przywrócenie starych danych)
  - Ustawienie `template_changed_at = now()` przy zmianie
- Dodać flagę `canChangeTemplate` (computed) i `daysUntilChange` do zwracanych danych
- Dodać flagę `isRestoredTemplate` gdy dane pochodzą z historii

### 3. Komponent `PartnerPageEditor.tsx` — UI zmiany szablonu

Dodanie nowego stanu `showTemplateGallery`:
- **Przycisk "Zmień szablon"** w sekcji nagłówkowej (obok adresu strony) — otwiera galerię
- **Galeria z informacją o aktualnym szablonie** — aktualny szablon zaznaczony badge "Aktywny", inne z przyciskiem "Podgląd" / "Wybierz"
- **Blokada zmiany** — jeśli nie minęło 14 dni, przycisk "Wybierz" jest wyłączony z komunikatem "Zmiana możliwa za X dni"
- **Ostrzeżenie przy powrocie do starego szablonu** — alert: "Ten szablon był już używany. Sprawdź czy linki i treści są aktualne."
- **Przycisk "Wróć do edycji"** — zamyka galerię i wraca do edytora

### Pliki do zmiany/utworzenia

| Plik | Zmiana |
|------|------|
| Nowa migracja SQL | `template_changed_at`, `template_history` |
| `src/hooks/usePartnerPage.ts` | Logika cooldownu, historii, przywracania danych |
| `src/components/partner-page/PartnerPageEditor.tsx` | Galeria z aktualnym szablonem, cooldown UI, ostrzeżenia |
| `src/types/partnerPage.ts` | Nowe pola w `PartnerPage` interface |

