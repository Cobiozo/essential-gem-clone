

# Zmiana: Katalog jezykowy z rozwijanym selektorem w naglowku Akademii

## Opis

Zamiast wyswietlania wszystkich modulow razem (z badge'ami "nie wlicza sie"), wprowadzamy system katalogu jezykowego:

- W prawym gornym rogu naglowka Akademii widoczny jest **wybrany jezyk szkolenia** (flaga + nazwa, np. "Polski" z adnotacja "Twoja sciezka")
- Obok znajduje sie **rozwijana lista** "Zobacz inne jezyki" umozliwiajaca przelaczenie widoku na katalog innego jezyka
- Po wybraniu innego jezyka z listy, wyswietlane sa moduly z tego jezyka, ale z wyraznym bannerem informujacym, ze te szkolenia nie wliczaja sie do postepu
- Przycisk powrotu do wlasnej sciezki

## Szczegoly techniczne

### Plik: `src/pages/Training.tsx`

**1. Dodac stan `viewLanguage`:**
- Nowy stan `viewLanguage` (domyslnie rowny `trainingLanguage`) -- okresla ktory katalog jezykowy jest aktualnie wyswietlany
- Filtrowanie modulow: `modules.filter(m => !m.language_code || m.language_code === viewLanguage)`

**2. Zastapic obecny badge jezyka rozbudowanym naglowkiem:**

W prawym gornym rogu (obok tytulu "Akademia"):
- Wybrany jezyk szkolenia: flaga + "Polski (Twoja sciezka)" -- niezmienialny, informacyjny
- Select/dropdown "Zobacz szkolenia w innym jezyku" -- lista jezykow z flagami pobrana z `i18n_languages`
- Gdy `viewLanguage !== trainingLanguage`: wyswietlic banner ostrzegawczy + przycisk "Wroc do swojej sciezki"

**3. Filtrowanie modulow wedlug `viewLanguage`:**

```text
const filteredModules = useMemo(() => {
  if (!viewLanguage) return translatedDisplayModules;
  return translatedDisplayModules.filter(m =>
    !m.language_code || m.language_code === viewLanguage
  );
}, [translatedDisplayModules, viewLanguage]);
```

**4. Banner informacyjny gdy ogladamy inny katalog:**

```text
{viewLanguage && viewLanguage !== trainingLanguage && (
  <Banner type="info">
    Przegladasz szkolenia w jezyku {nazwa}. Te szkolenia nie wliczaja sie do Twojego postepu.
    <Button onClick={() => setViewLanguage(trainingLanguage)}>Wroc do swojej sciezki</Button>
  </Banner>
)}
```

**5. Usunac badge "Nie wlicza sie do postepu" z kart modulow** -- juz niepotrzebny, bo katalogi sa rozdzielone.

**6. Pobranie listy jezykow** -- fetch z `i18n_languages` (is_active, order by position), analogicznie do `TrainingLanguageSelector`.

### Elementy UI selektora jezyka (prawy gorny rog):

```text
[Flaga PL] Polski — Twoja sciezka    |   [v] Zobacz inne jezyki
```

Dropdown z flagami i nazwami jezykow (pl, en, de itd.), po kliknieciu zmienia `viewLanguage`.

