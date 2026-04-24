## Cel

Po kliknięciu „Czytaj więcej" na karcie prelegenta na stronie informacyjnej eventu, zamiast rozwijać tekst w karcie, otworzyć osobne okno (modal) z pełnym profilem prelegenta.

## Zmiany

**Plik:** `src/components/paid-events/public/PaidEventSpeakers.tsx`

1. Zastąpić mechanizm `expanded` (useState + line-clamp + ChevronUp/Down) komponentem `Dialog` z `@/components/ui/dialog`.
2. Karta:
   - Usunąć rozwijany tekst bio z karty.
   - Pokazać krótki podgląd bio (np. `line-clamp-2`) — bez przełącznika.
   - Przycisk „Czytaj więcej" (`ChevronDown` zostawiamy jako akcent ikony lub zamieniamy na neutralny) otwiera modal.
   - Jeśli bio puste — przycisk się nie pojawia.
3. Modal (`Dialog` + `DialogContent`):
   - Nagłówek: zdjęcie (większe, np. 80–96 px), imię i nazwisko (`DialogTitle`), tytuł/firma (`DialogDescription`).
   - Treść: pełne bio z `whitespace-pre-line`, przewijane (`max-h-[70vh] overflow-y-auto`).
   - Szerokość: `sm:max-w-lg`.
   - Zamknięcie standardowym przyciskiem `Dialog` (X w prawym górnym rogu).
4. Brak wpływu na admina, bazę danych ani widoczność dla gości — czysto frontendowa zmiana renderowania.

## Co pozostaje bez zmian

- Layout siatki kart (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- Sortowanie po `position`.
- Style `backgroundColor` / `textColor` sekcji.
- Pozostałe sekcje strony eventu.
