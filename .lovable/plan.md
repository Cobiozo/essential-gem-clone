

# Akademia -- Wybor jezyka szkolenia uzytkownika (pelny plan)

## Podsumowanie

Kazdy uzytkownik przy pierwszym wejsciu do Akademii wybiera jezyk szkolenia. Wybor jest jednorazowy -- zmiane moze wykonac tylko admin. Postep liczony jest wylacznie z modulow w wybranym jezyku. Obecni uzytkownicy zachowuja dotychczasowe postepy. Certyfikaty sa katalogowane wedlug jezykow -- istniejace certyfikaty przypisane do kategorii polskiej.

---

## 1. Migracja bazy danych

### 1a. Kolumna `training_language` w tabeli `profiles`

```sql
ALTER TABLE profiles ADD COLUMN training_language TEXT DEFAULT NULL;
```

- `NULL` = jezyk jeszcze nie wybrany
- Wartosci: `'pl'`, `'en'`, `'de'` itd. (kody z `i18n_languages`)

### 1b. Kolumna `language_code` w tabeli `certificates`

Istniejaca tabela `certificates` nie ma kolumny `language_code`. Dodajemy ja, a obecne certyfikaty oznaczamy jako polskie:

```sql
ALTER TABLE certificates ADD COLUMN language_code TEXT DEFAULT 'pl';
```

Wszystkie istniejace certyfikaty automatycznie otrzymaja `language_code = 'pl'`.

### 1c. Kolumna `language_code` w tabeli `certificate_templates`

Szablony certyfikatow juz maja `layout->language`, ale dodajemy kolumne na poziomie tabeli dla latwego filtrowania:

```sql
ALTER TABLE certificate_templates ADD COLUMN language_code TEXT DEFAULT 'pl';
```

### 1d. Polityka RLS na `profiles.training_language`

Uzytkownik moze ustawic swoj `training_language` tylko raz (gdy wartosc to `NULL`). Admin moze zmieniac dowolnie. Realizowane przez logike w kodzie (nie osobna polityka RLS, gdyz `profiles` juz ma polityke UPDATE).

---

## 2. Strona Akademii (`src/pages/Training.tsx`)

### 2a. Ekran wyboru jezyka (pierwsza wizyta)

Gdy `profile.training_language IS NULL`:
- Wyswietlic ekran powitalny z lista dostepnych jezykow (flagi + nazwy z `i18n_languages`)
- Ostrzezenie: "Wyboru nie mozna pozniej zmienic. Zmiane moze wykonac tylko administrator."
- Po kliknieciu "Zatwierdz" -- zapis do `profiles.training_language`
- **Obecne postepy nie sa resetowane** -- uzytkownik zachowuje caly dotychczasowy progres

### 2b. Filtrowanie modulow po wyborze

Zastapic reczny `ContentLanguageSelector` wyswietlaniem wybranego jezyka (bez mozliwosci zmiany):

```text
moduly.filter(m => !m.language_code || m.language_code === user.training_language)
```

Moduly z `language_code = NULL` (uniwersalne) widoczne zawsze.

### 2c. Adnotacja o braku szkolen

Jezeli po filtrowaniu brak modulow:

```text
"Aktualnie brak szkolen w wybranym jezyku ({nazwa_jezyka}).
Skontaktuj sie z administratorem lub poczekaj na dodanie materialow."
```

### 2d. Sciezka realizacji bez zmian

Niezaleznie od jezyka, przeplyw lekcji -> ukoncz -> certyfikat pozostaje identyczny. Jedyna roznica to katalog modulow widzianych przez uzytkownika.

---

## 3. Widget dashboardu (`TrainingProgressWidget.tsx`)

- Pobrac `training_language` z profilu uzytkownika
- Filtrowac moduly: `WHERE language_code = training_language OR language_code IS NULL`
- Jezeli `training_language IS NULL` -- wyswietlic "Wybierz jezyk w Akademii" z linkiem do `/training`
- Jezeli brak modulow w wybranym jezyku -- adnotacja zamiast pustych danych

---

## 4. Certyfikaty -- katalogowanie wedlug jezykow

### 4a. Generowanie (`useCertificateGeneration.ts`)

Przy generowaniu certyfikatu:
- Pobrac `training_language` z profilu uzytkownika
- Zapisac `language_code` w rekordzie certyfikatu
- Wybierac szablon certyfikatu pasujacy do jezyka (priorytet: szablon z `language_code` uzytkownika, fallback: dowolny szablon przypisany do modulu)

### 4b. Szablony certyfikatow (`CertificateEditor.tsx`)

- Dodac pole `language_code` do formularza szablonu (obok `roles` i `module_ids`)
- Umozliwic przypisanie szablonu do konkretnego jezyka
- Logika wyboru szablonu: modul + rola + jezyk > modul + jezyk > modul + rola > modul

### 4c. Istniejace certyfikaty

Migracja ustawia `language_code = 'pl'` dla wszystkich istniejacych certyfikatow -- automatyczne przypisanie do katalogu polskiego.

---

## 5. Panel admina -- Podglad postepu (`TrainingManagement.tsx`)

### 5a. Wyswietlanie jezyka szkolenia

W zakladce "Postep uzytkownikow":
- Badge z wybranym jezykiem (flaga + kod) przy kazdym uzytkowniku
- Jezeli brak modulow w wybranym jezyku: badge ostrzegawczy "Brak szkolen w [jezyk]"
- Postep procentowy liczony tylko z modulow w jezyku uzytkownika

### 5b. Zmiana jezyka przez admina

- Przycisk/dropdown "Zmien jezyk szkolenia" w rozwijanej sekcji uzytkownika
- Potwierdzenie przed zmiana
- Po zmianie -- odswiezenie widoku postepu

---

## 6. Panel Lidera (`TeamTrainingProgressView.tsx`)

- Rozszerzyc funkcje DB `get_leader_team_training_progress` o kolumne `training_language`
- Wyswietlac badge z wybranym jezykiem przy kazdym czlonku zespolu
- Filtrowac postep: liczyc tylko moduly w jezyku uzytkownika
- Adnotacja "Brak szkolen w wybranym jezyku" gdy brak modulow

---

## 7. Logika postepu -- reguly (uniwersalne)

```text
1. Pobierz training_language z profiles
2. Jezeli NULL -> nie licz postepu, pokaz "Wybierz jezyk"
3. Filtruj moduly: language_code = training_language OR language_code IS NULL
4. Jezeli 0 modulow -> "Brak szkolen w wybranym jezyku"
5. Postep = sum(ukonczone_lekcje) / sum(wszystkie_lekcje) z przefiltrowanych modulow
6. Istniejace postepy zachowane -- wybor jezyka nie resetuje progresu
```

---

## 8. Pliki do modyfikacji

| Plik | Zakres zmian |
|------|-------------|
| **Migracja SQL** | `training_language` w profiles, `language_code` w certificates i certificate_templates |
| `src/pages/Training.tsx` | Ekran wyboru jezyka, filtrowanie po training_language, usuniecie ContentLanguageSelector |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Filtrowanie modulow po training_language, obsluga NULL |
| `src/hooks/useCertificateGeneration.ts` | Zapis language_code w certyfikacie, wybor szablonu wg jezyka |
| `src/components/admin/TrainingManagement.tsx` | Badge jezyka w podgladzie postepu, dropdown zmiany jezyka |
| `src/components/admin/CertificateEditor.tsx` | Pole language_code w formularzu szablonu |
| `src/components/training/TeamTrainingProgressView.tsx` | Badge jezyka, filtrowanie postepu |
| Funkcja DB `get_leader_team_training_progress` | Dodanie training_language do wyniku |

---

## 9. Czego NIE zmieniamy

- Tabela `training_modules` -- kolumna `language_code` bez zmian
- Tabela `training_assignments` -- przypisania pozostaja niezalezne od jezyka
- Przeplyw lekcji/certyfikatow -- identyczny dla kazdego jezyka
- System tlumaczen UI (`useTrainingTranslations`) -- dziala niezaleznie

