

# Plan: Przenieść ankietę jako osobny tab obok Katalogu produktów

## Zmiana

Dodać nową zakładkę **"Ankieta"** w `PartnerPagesManagement.tsx` obok istniejących tabów (Kontrola dostępu, Szablon strony, Katalog produktów). Zakładka będzie zawierać standalone wrapper wokół istniejącego `SurveySectionEditor` — z możliwością zapisu konfiguracji ankiety globalnie (niezależnie od szablonu).

## Co zrobić

### 1. Nowy komponent: `SurveyManager.tsx`
Standalone manager ankiety w `src/components/admin/SurveyManager.tsx`:
- Ładuje konfigurację ankiety z szablonu "Eqology" (lub dedykowanego wiersza w bazie)
- Opakowuje istniejący `SurveySectionEditor` w `Card` z nagłówkiem i przyciskiem "Zapisz"
- Po zapisie aktualizuje sekcję `survey` w `template_data` wybranego szablonu

### 2. Modyfikacja: `PartnerPagesManagement.tsx`
- Dodać nowy tab `"survey"` z ikoną `ClipboardList`
- Renderować `SurveyManager` w `TabsContent value="survey"`

## Pliki

| Plik | Zmiana |
|------|--------|
| `src/components/admin/SurveyManager.tsx` | Nowy — wrapper z ładowaniem/zapisem |
| `src/components/admin/PartnerPagesManagement.tsx` | Dodać zakładkę "Ankieta" |

