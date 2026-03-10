

# Problemy i rozwiązanie

## Problem 1: Edytor szablonu pokazuje domyślne bloki zamiast rzeczywistej treści
Szablon `webinar_followup` ma wypełnione `body_html` (migracja), ale **nie ma `blocks_json`** ani wpisu w `getTemplateBlocks()`. Gdy admin otwiera szablon w edytorze blokowym, system widzi brak bloków i generuje domyślne (generyczne "Cześć {{imię}}, Tutaj wpisz treść..."). Dlatego edytor pokazuje zupełnie inną treść niż podgląd.

**Rozwiązanie**: Dodać case `webinar_followup` do `getTemplateBlocks()` w `defaultBlocks.ts` z blokami odpowiadającymi rzeczywistej treści szablonu (nagłówek PureLife, pełny tekst o endometriozie, sekcja "Jak możesz działać dalej?", stopka). Dodatkowo zaktualizować migrację, aby ustawić `blocks_json` w bazie.

## Problem 2: Brak widocznej opcji załączników
Funkcja załączników **istnieje** w dialogu "Email po webinarze" (przycisk w zakładce rejestracji wydarzeń), ale admin szuka jej w edytorze szablonów email — który jest innym widokiem i nie obsługuje załączników. To jest kwestia UX — admin musi wiedzieć gdzie kliknąć.

**Rozwiązanie**: Nie trzeba przenosić załączników do edytora szablonów (szablony to wzorce, załączniki to dane per-wysyłka). Natomiast trzeba upewnić się, że przycisk "Email po webinarze" i sekcja załączników w dialogu są dobrze widoczne. Dodam wyraźniejszy label/informację w dialogu follow-up.

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `src/components/admin/email-editor/defaultBlocks.ts` | Dodanie case `webinar_followup` z blokami odpowiadającymi treści szablonu |
| Migracja SQL | UPDATE `blocks_json` dla szablonu `webinar_followup` |
| `src/components/admin/EventRegistrationsManagement.tsx` | Drobne poprawki UX dialogu — wyraźniejsza informacja o załącznikach |

