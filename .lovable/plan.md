## Cel

Zastąpić obecny eksport CSV (surowy, nieformatowany) profesjonalnym plikiem **Excel (.xlsx)** z pełnym formatowaniem.

## Co się zmieni

Przycisk „Eksport CSV" → **„Eksport Excel"** w widoku statystyk partnerów (`EventFormPartnerStats.tsx`).

## Zawartość pliku Excel

### Nagłówek dokumentu (wiersze 1–4)
- **Wiersz 1**: scalona komórka z tytułem `Statystyki partnerów: {nazwa formularza}` — duża czcionka, pogrubiona, tło markowe (złoto Pure Life)
- **Wiersz 2**: scalona komórka z nazwą wydarzenia + datą + lokalizacją
- **Wiersz 3**: data eksportu (`Wygenerowano: 25.04.2026, 14:32`)
- **Wiersz 4**: pusty (separator)

### Sekcja podsumowania (wiersze 5–7)
Kompaktowa tabelka z 4 metrykami zbiorczymi: kliknięcia, rejestracje, opłacone, anulowane — pogrubione wartości, kolorowe komórki.

### Pusta linia separatora

### Główna tabela rankingu
Nagłówki: `#`, `Imię`, `Nazwisko`, `EQID`, `Kliknięcia`, `Rejestracje`, `Opłacone`, `Anulowane`, `Konwersja klik→rej`, `Konwersja rej→opł`

Formatowanie:
- **Nagłówki** — pogrubione, białe na ciemnym tle (granat), wyśrodkowane, wysokość wiersza 28px
- **Top 3** — wiersze podświetlone gradientowo (złoto/srebro/brąz), w kolumnie `#` emoji medali (🥇🥈🥉)
- **Naprzemienne wiersze** (alternating rows) — lekkie tło dla parzystych
- **Kolumna „Opłacone"** — pogrubiona, kolor zielony
- **Kolumna „Anulowane"** — kolor czerwony jeśli > 0
- **Kolumny konwersji** — formatowanie procentowe (`0%`)
- **Liczby** — wyrównane do prawej; tekst do lewej
- **Wiersz „Bez przypisanego partnera"** — kursywa, jasnoszare tło, na końcu

### Szerokości kolumn
Stałe, dopasowane do treści: `#`=6, `Imię`=18, `Nazwisko`=20, `EQID`=14, liczby=14, konwersje=18.

### Pierwszy wiersz danych zamrożony (freeze panes)
Po przewijaniu nagłówki tabeli pozostają widoczne.

### Obramowania
Wszystkie komórki tabeli — cienkie, szare obramowanie. Nagłówek tabeli — pogrubione obramowanie dolne.

### Nazwa pliku
`statystyki-partnerow-{slug}-{YYYY-MM-DD}.xlsx`

## Implementacja techniczna

- Biblioteka **`xlsx`** (SheetJS) — zainstaluję przez `bun add xlsx` (popularna, lekka, działa w przeglądarce, brak dodatkowych zależności)
- Generowanie po stronie klienta (bez edge function) — szybkie, bez round-tripa
- Wykorzystam `XLSX.utils.aoa_to_sheet` + ręczne ustawianie `!cols`, `!merges`, stylów komórek przez `cell.s`
- Plik zapisywany przez `XLSX.writeFile` (Blob + auto-download)

**Uwaga**: standardowy `xlsx` nie wspiera stylów. Zainstaluję **`xlsx-js-style`** (fork z pełnym wsparciem dla stylów: kolory, czcionki, obramowania, scalanie, wyrównanie) — to zapewni profesjonalny wygląd zgodny z opisem powyżej.

## Pliki do edycji

- `src/components/admin/paid-events/event-forms/EventFormPartnerStats.tsx` — zamiana funkcji `exportCsv` → `exportXlsx` + zmiana etykiety przycisku i ikony pliku
- `package.json` — dodanie `xlsx-js-style`
