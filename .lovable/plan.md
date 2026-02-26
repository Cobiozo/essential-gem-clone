

## Powiadomienie o nowych lekcjach i numer kolejności modułów

### Problem

1. Gdy admin dodaje nowe lekcje do ukończonego modułu, system filtruje lekcje po dacie certyfikatu -- pokazuje np. "2/2 Ukończony" zamiast "2/4" z informacją o nowych lekcjach.
2. Brak numeru kolejności (unlock_order) przy module -- użytkownik nie wie w jakiej kolejności powinien realizować szkolenia.
3. Brak monitu informującego użytkownika, że admin dodał nowe lekcje i musi je nadrobić.

### Zmiany w pliku `src/pages/Training.tsx`

#### 1. Zmiana liczenia lekcji -- pokazuj WSZYSTKIE lekcje, nie filtruj po dacie certyfikatu

W `fetchTrainingModules` (linie ~418-428) zmienić logikę:
- `lessons_count` = zawsze pełna liczba aktywnych lekcji (bez filtrowania po dacie certyfikatu)
- `completed_lessons` = rzeczywista liczba ukończonych lekcji (bez filtrowania)
- Dodać nowe pole `has_new_lessons: boolean` -- true gdy istnieje certyfikat ALE `completed_lessons < lessons_count`

```text
// Zamiast filtrowania po certDate:
const relevantLessonsCount = lessonsData?.length || 0;
// completed_lessons = progressData?.length || 0; (bez filtra po dacie)
// has_new_lessons = hasCertificate && completedLessons < relevantLessonsCount
```

#### 2. Dodanie numeru kolejności przed ikoną książki

W sekcji renderowania karty modułu (linie ~808-813), przed ikoną BookOpen/Lock dodać cyfrę z `unlock_order`:

```text
<div className="flex items-center gap-3 mb-2">
  {module.unlock_order && (
    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 
         text-primary text-sm font-bold flex items-center justify-center">
      {module.unlock_order}
    </span>
  )}
  {module.isLocked ? (
    <Lock className="h-6 w-6 text-muted-foreground" />
  ) : (
    <BookOpen className="h-6 w-6 text-primary" />
  )}
  <Badge ...>{status.text}</Badge>
</div>
```

#### 3. Monit o nowych lekcjach na karcie modułu

Dodac nowy blok alertu w CardContent (przed sekcja Progress, linia ~823), widoczny gdy `has_new_lessons === true`:

```text
{module.has_new_lessons && (
  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 
       dark:border-amber-800 rounded-lg flex items-start gap-2">
    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
    <p className="text-xs text-amber-800 dark:text-amber-200">
      Dodano nowe lekcje w tym szkoleniu. Wróć i uzupełnij brakujące lekcje, 
      aby móc kontynuować dalszą ścieżkę.
    </p>
  </div>
)}
```

#### 4. Zmiana statusu -- nie pokazuj "Ukończony" gdy są nowe lekcje

W `getModuleStatus` (linia 492) lub w miejscu wywolania: jesli modul ma certyfikat ale `completed < total`, status powinien byc "Wymaga uzupelnienia" (variant: "warning") zamiast "Ukończony".

W renderowaniu (linia ~799-801):
```text
const status = module.isLocked 
  ? { text: 'Zablokowany', variant: 'secondary' as const }
  : module.has_new_lessons
    ? { text: 'Wymaga uzupełnienia', variant: 'warning' as const }
    : getModuleStatus(module.completed_lessons, module.lessons_count);
```

### Interfejs TrainingModule -- rozszerzenie

Dodac pole do interfejsu (linia ~30):
```text
has_new_lessons?: boolean;
```

### Podsumowanie

Wszystkie zmiany w jednym pliku (`src/pages/Training.tsx`):
- Usunięcie filtrowania lekcji po dacie certyfikatu (pokazuj prawdziwy stan)
- Numer kolejności (unlock_order) jako kółko z cyfrą przed ikoną książki
- Monit z ikoną ostrzeżenia na karcie modułu gdy admin dodał nowe lekcje
- Status "Wymaga uzupełnienia" zamiast "Ukończony" gdy brakuje nowych lekcji

