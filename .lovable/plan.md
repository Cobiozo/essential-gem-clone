

## Interaktywna sekcja zgod prawnych w Moje Konto

### Problem
Sekcja "Zgody i regulaminy" na stronie Moje Konto jest tylko do odczytu -- uzytkownik widzi status ale nie ma mozliwosci zaakceptowania zgod ani zapoznania sie z dokumentami.

### Rozwiazanie

Zmiana sekcji "Zgody i regulaminy" w pliku `MyAccount.tsx` z widoku read-only na interaktywny formularz:

---

### Jak to bedzie dzialac

Kazda pozycja (Regulamin, Polityka Prywatnosci, Zgoda RODO) bedzie zawierac:

1. **Link do dokumentu zrodlowego** -- otwiera sie w nowej karcie (`/html/regulamin`, `/html/polityka-prywatnosci`, `/html/rodo`), uzytkownik moze zapoznac sie z trescia
2. **Checkbox akceptacji** -- jesli jeszcze nie zaakceptowane, uzytkownik zaznacza checkbox
3. **Status** -- zielony znacznik jesli juz zaakceptowane, z data akceptacji
4. **Przycisk "Zatwierdz zgody"** -- zapisuje wszystkie zaznaczone zgody do bazy danych jednym kliknieciem

Jesli wszystkie 3 zgody sa juz zaakceptowane, sekcja wyswietla sie w trybie read-only z zielonymi znacznikami i data.

Po zatwierdzeniu admin widzi w panelu CMS ze uzytkownik zaakceptowal wszystkie pozycje (to juz dziala).

### Walidacja
- Wszystkie 3 zgody musza byc zaznaczone zeby przycisk "Zatwierdz" byl aktywny
- Nie mozna cofnac raz wyrazonych zgod (checkboxy zaakceptowanych pozycji sa zablokowane)

---

### Pliki do zmian

| Plik | Typ zmiany |
|------|------------|
| `src/pages/MyAccount.tsx` | Zamiana sekcji "Zgody i regulaminy" (linie 845-898) z read-only na interaktywna z checkboxami, linkami do dokumentow i przyciskiem zapisu |

### Szczegoly techniczne

W sekcji "Zgody i regulaminy" w `MyAccount.tsx`:

- Dodanie 3 stanow lokalnych: `consentTerms`, `consentPrivacy`, `consentRodo` (inicjalizowane z profilu)
- Kazda pozycja: link "Przeczytaj" otwierajacy dokument + checkbox + etykieta
- Linki do dokumentow: `/html/regulamin`, `/html/polityka-prywatnosci`, `/html/rodo`
- Przycisk "Zatwierdz zgody" wywoluje `supabase.from('profiles').update(...)` z polami `accepted_terms`, `accepted_privacy`, `accepted_rodo`, `accepted_terms_at`
- Po zapisie: `refreshProfile()` odswierza dane w kontekscie
- Juz zaakceptowane zgody: checkbox zablokowany (disabled), zielony znacznik

