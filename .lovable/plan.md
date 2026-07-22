## Co ustaliłem

- Edytor V2 już istnieje pod adresem `/admin/homepage`.
- Przełącznik `V1 klasyczna` / `V2 nowa` jest w nagłówku tego edytora.
- Problem: edytor nie jest podpięty do widocznego menu w panelu administratora. W lewym menu są obecnie: `Główna`, `Układ stron`, `Strony`, `Strony HTML`, itd., ale nie ma osobnej pozycji prowadzącej do `/admin/homepage`. Dlatego nie możesz go znaleźć.
- Na stronie `/admin?tab=content` przycisk „Otwórz Layout Editor” prowadzi do starego edytora układu, a nie do nowego edytora strony V2.

## Plan naprawy

1. **Dodać widoczną pozycję w menu administratora**
   - W sekcji `Strona i wygląd` dodam nową pozycję: `Strona główna V1/V2`.
   - Kliknięcie będzie prowadzić bezpośrednio do `/admin/homepage`, zamiast przełączać zwykłą zakładkę CMS.

2. **Dodać jasny przycisk w obecnym widoku „Strona główna”**
   - W panelu `/admin?tab=content`, obok obecnego przycisku `Otwórz Layout Editor`, dodam przycisk:
     - `Edytor strony głównej V2`
   - Ten przycisk otworzy `/admin/homepage`.

3. **Uczytelnić sam edytor V2**
   - Na górze edytora `/admin/homepage` zostawię wyraźny przełącznik:
     - `V1 klasyczna`
     - `V2 nowa`
   - Dodam krótki opis, że ten wybór decyduje, którą stronę widzą osoby niezalogowane na `purelifecenter.pl`.
   - Dodam przycisk `Podgląd V2`, żeby admin mógł zobaczyć V2 bez jej aktywowania.

4. **Nie ruszać reszty aplikacji**
   - Zmiana będzie dotyczyła tylko nawigacji panelu admina i nagłówka edytora strony głównej.
   - Nie zmienię logiki dashboardu, logowania, Akademii, wydarzeń ani paneli użytkowników.

## Po wdrożeniu gdzie to będzie

- Panel administratora → `Strona i wygląd` → `Strona główna V1/V2`
- Bezpośredni adres: `/admin/homepage`
- Tam będzie edycja V2, publikacja treści oraz przełącznik `V1 klasyczna` / `V2 nowa`.