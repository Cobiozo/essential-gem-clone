

# Rozbudowa strony /install o instrukcje dla wszystkich przegladarek i systemow

## Problem

Strona `/install` (InstallPage.tsx) ma tylko 3 sekcje:
1. iPhone/iPad (Safari)
2. Android (Chrome)
3. Komputer (Chrome/Edge) — ogolna, bez rozroznienia

Brakuje dedykowanych instrukcji dla: **Edge**, **Opera**, **Firefox**, **Safari macOS**, **Samsung Internet**.

## Rozwiazanie

Rozbudowac strone `/install` o pelne instrukcje dla kazdej przegladarki i systemu operacyjnego.

### Nowe sekcje na stronie `/install` (InstallPage.tsx):

1. **iPhone / iPad (Safari)** — bez zmian, juz jest OK
2. **Android (Chrome)** — bez zmian, juz jest OK  
3. **Android (Samsung Internet)** — NOWA sekcja:
   - Otworz menu na dolnym pasku
   - Wybierz "Dodaj strone do" -> "Ekran startowy"
   - Potwierdz
4. **Android (Firefox)** — NOWA sekcja:
   - Kliknij menu (trzy kropki)
   - Wybierz "Zainstaluj"
   - Potwierdz
5. **Android (Opera)** — NOWA sekcja:
   - Kliknij menu (trzy kropki)
   - Wybierz "Ekran glowny" lub "Dodaj do..."
   - Potwierdz
6. **Komputer — Microsoft Edge** — NOWA sekcja (zamiast ogolnej):
   - Kliknij ikone trzech kwadracikow z plusem w pasku adresu
   - Lub: Menu -> Aplikacje -> Zainstaluj te witryne jako aplikacje
7. **Komputer — Google Chrome** — NOWA sekcja:
   - Kliknij ikone instalacji w pasku adresu (monitor ze strzalka)
   - Lub: Menu -> Zainstaluj aplikacje
8. **Komputer — Opera** — NOWA sekcja:
   - Menu -> Zainstaluj aplikacje
9. **Komputer — Safari (macOS)** — NOWA sekcja:
   - Kliknij Udostepnij -> Dodaj do Docka
10. **Komputer — Firefox** — NOWA sekcja:
    - Firefox nie wspiera instalacji PWA natywnie
    - Zalecenie: uzyj Chrome, Edge lub Opery

### Detekcja urzadzenia

Kazda sekcja bedzie podswietlona (`ring-2 ring-primary/30` + badge "Twoje urzadzenie") jesli odpowiada wykrytej przegladarce uzytkownika — wykorzystujac istniejacy hook `usePWAInstall`.

### Grupowanie

Sekcje beda pogrupowane:
- **Urzadzenia mobilne**: iOS Safari, Android Chrome, Android Samsung, Android Firefox, Android Opera
- **Komputery**: Edge, Chrome, Opera, Safari macOS, Firefox

### Importy

Dodanie brakujacych ikon z lucide: `Menu`, `LayoutGrid`, `Globe`.

### Plik do edycji

- `src/pages/InstallPage.tsx` — rozbudowa o nowe sekcje przegladarek

