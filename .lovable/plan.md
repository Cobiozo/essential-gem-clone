

# Zmiana: Wszystkie szkolenia widoczne, klasyfikacja tylko z wybranego jezyka

## Problem

Obecna implementacja calkowicie ukrywa moduly spoza wybranego jezyka (`displayModules` filtruje je w linii 84-89 `Training.tsx`). Uzytkownik traci mozliwosc przegladania szkolen w innych jezykach.

## Zmiana koncepcji

- Uzytkownik **widzi wszystkie moduly** niezaleznie od jezyka
- **Postep procentowy i klasyfikacja** liczone sa tylko z modulow w wybranym jezyku
- Moduly spoza wybranego jezyka maja wizualne oznaczenie (np. badge z flaga jezyka) i adnotacje ze nie wliczaja sie do postepu

## Pliki do modyfikacji

### 1. `src/pages/Training.tsx`

**Usunac filtrowanie `displayModules`** (linie 84-89) -- wyswietlac `translatedDisplayModules` bezposrednio.

**Dodac wizualne rozroznienie** na karcie modulu:
- Jezeli `module.language_code` rozni sie od `trainingLanguage` (i nie jest `NULL`): wyswietlic maly badge z flaga jezyka modulu + tekst "Nie wlicza sie do postepu"
- Moduly w wybranym jezyku i moduly uniwersalne (`language_code = NULL`) -- bez dodatkowego oznaczenia

**Ogolny pasek postepu** (opcjonalnie w naglowku): liczyc tylko z modulow pasujacych do `trainingLanguage`.

**Komunikat "brak szkolen w wybranym jezyku"**: zmiana warunku -- wyswietlac jako banner informacyjny nad lista modulow, jezeli brak modulow pasujacych do jezyka, ale nadal pokazywac wszystkie moduly ponizej.

### 2. `src/components/dashboard/widgets/TrainingProgressWidget.tsx`

**Bez zmian** -- widget dashboardu nadal liczy postep tylko z modulow w wybranym jezyku (to jest poprawne zachowanie).

### 3. `src/components/admin/TrainingManagement.tsx` i `TeamTrainingProgressView.tsx`

**Bez zmian** -- admin i lider widza postep klasyfikacyjny z wybranego jezyka (poprawne zachowanie).

## Szczegoly techniczne

W `Training.tsx`:

```text
// USUNAC:
const displayModules = useMemo(() => {
  if (!trainingLanguage) return translatedDisplayModules;
  return translatedDisplayModules.filter(m =>
    !m.language_code || m.language_code === trainingLanguage
  );
}, [translatedDisplayModules, trainingLanguage]);

// ZASTAPIC uzyciem translatedDisplayModules bezposrednio w renderowaniu

// DODAC helper:
const isInTrainingTrack = (module) =>
  !trainingLanguage || !module.language_code || module.language_code === trainingLanguage;

// Na karcie modulu dodac badge jezyka gdy modul jest spoza sciezki:
{!isInTrainingTrack(module) && (
  <Badge variant="outline" className="text-xs text-muted-foreground">
    <img src={flagUrl} ... /> {module.language_code?.toUpperCase()}
    · Nie wlicza sie do postepu
  </Badge>
)}
```

Komunikat o braku szkolen w jezyku -- jako informacyjny banner nad lista (nie zamiast listy):

```text
const trackModules = translatedDisplayModules.filter(m => isInTrainingTrack(m));
{trainingLanguage && trackModules.length === 0 && (
  <InfoBanner>Aktualnie brak szkolen w wybranym jezyku. Ponizej dostepne sa szkolenia w innych jezykach.</InfoBanner>
)}
```

