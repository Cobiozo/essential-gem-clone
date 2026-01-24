

# Plan: Naprawa systemu szkoleń - zatwierdzanie, walidacja i przyciski awaryjne

## Problem 1: Przycisk "Zatwierdź" moduł nie działa prawidłowo

### Diagnoza
Funkcja `approveModuleCompletion` (linie 662-741 w TrainingManagement.tsx) wygląda poprawnie - wykonuje upsert dla wszystkich lekcji i aktualizuje assignment. Jednak może być problem z odświeżaniem widoku lub warunkiem wyświetlania przycisku.

**Znaleziony błąd**: Przycisk "Zatwierdź" jest widoczny TYLKO gdy `progress_percentage < 100` (linia 1325). Oznacza to, że gdy użytkownik ma wszystkie lekcje ukończone (100%), ale `is_completed = false`, przycisk nie jest widoczny!

### Rozwiązanie
Zmienić warunek wyświetlania przycisku "Zatwierdź" na poziomie modułu:
- Pokazuj przycisk gdy `is_completed = false` (niezależnie od postępu)
- Zmienić tekst tooltip w zależności od kontekstu

```tsx
// Zmiana warunku z:
{module.progress_percentage < 100 && (
// Na:
{!module.is_completed && (
```

Dodatkowo dodać pole `is_completed` do interface `UserProgress.modules`:
```typescript
modules: {
  module_id: string;
  module_title: string;
  is_completed: boolean;  // DODAĆ
  // ...
}[]
```

---

## Problem 2: Certyfikaty generowane bez walidacji ukończenia (KRYTYCZNE)

### Diagnoza
Hook `useCertificateGeneration.ts` NIE sprawdza czy wszystkie lekcje są ukończone przed generowaniem PDF i zapisem certyfikatu. To pozwala na wydawanie certyfikatów dla niekompletnych szkoleń.

Przykład z bazy danych:
- Jacek Jakubowski ma certyfikat SPRZEDAŻOWE, ale ukończył tylko 6/8 lekcji (75%)
- Urszula Kamińska dostała dzisiaj certyfikat BIZNESOWE mimo 60% postępu

### Rozwiązanie
Dodać walidację ukończenia w `useCertificateGeneration.ts` (przed linią 63):

```typescript
// 1.5 VALIDATE - Check if all lessons are completed
console.log('Step 1.5: Validating lesson completion...');
const { data: lessons } = await supabase
  .from('training_lessons')
  .select('id')
  .eq('module_id', moduleId)
  .eq('is_active', true);

const { data: progress } = await supabase
  .from('training_progress')
  .select('lesson_id')
  .eq('user_id', userId)
  .eq('is_completed', true);

const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);
const allCompleted = lessons?.every(l => completedLessonIds.has(l.id));

if (!allCompleted && !forceRegenerate) {
  console.log('❌ Not all lessons completed:', completedLessonIds.size, '/', lessons?.length);
  return {
    success: false,
    error: `Nie ukończono wszystkich lekcji (${completedLessonIds.size}/${lessons?.length || 0}). Ukończ szkolenie przed generowaniem certyfikatu.`
  };
}
console.log('✅ All lessons completed or force regenerate enabled');
```

---

## Problem 3: Brak przycisku zatwierdzania przy każdej lekcji

### Diagnoza
Obecnie przy każdej lekcji jest tylko przycisk "Resetuj lekcję" (linie 1403-1417). Admin potrzebuje również przycisku "Zatwierdź" do awaryjnego zatwierdzania pojedynczych lekcji.

### Rozwiązanie

#### Krok 1: Dodać nową funkcję `approveLessonProgress`

```typescript
const approveLessonProgress = async (
  userId: string, 
  lessonId: string, 
  lessonTitle: string,
  moduleId: string
) => {
  const key = `approve-lesson-${userId}-${lessonId}`;
  setResettingProgress(key);

  try {
    // Pobierz min_time_seconds dla lekcji
    const { data: lessonData } = await supabase
      .from('training_lessons')
      .select('min_time_seconds')
      .eq('id', lessonId)
      .single();

    // Upsert postępu jako ukończony
    const { error } = await supabase
      .from('training_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        is_completed: true,
        time_spent_seconds: lessonData?.min_time_seconds || 300,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,lesson_id' 
      });

    if (error) throw error;

    toast({
      title: "Lekcja zatwierdzona",
      description: `Lekcja "${lessonTitle}" została oznaczona jako ukończona.`
    });

    await fetchUserProgress();
  } catch (error) {
    console.error('Error approving lesson:', error);
    toast({
      title: "Błąd",
      description: "Nie udało się zatwierdzić lekcji.",
      variant: "destructive"
    });
  } finally {
    setResettingProgress(null);
  }
};
```

#### Krok 2: Dodać przycisk przy każdej nieukończonej lekcji

Zmodyfikować UI przy lekcji (linie 1399-1418) - dodać minimalistyczny przycisk "✓" przed przyciskiem "Resetuj":

```tsx
<div className="flex items-center gap-1 shrink-0">
  <span className="text-xs text-muted-foreground">
    {formatTime(lesson.time_spent_seconds)}
  </span>
  
  {/* Przycisk zatwierdzenia - tylko dla nieukończonych lekcji */}
  {!lesson.is_completed && (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
      onClick={() => approveLessonProgress(
        progressUser.user_id, 
        lesson.lesson_id, 
        lesson.lesson_title,
        module.module_id
      )}
      disabled={resettingProgress === `approve-lesson-${progressUser.user_id}-${lesson.lesson_id}`}
      title="Zatwierdź ukończenie lekcji"
    >
      <CheckCircle className="h-3.5 w-3.5" />
    </Button>
  )}
  
  {/* Przycisk resetowania */}
  <Button
    size="sm"
    variant="ghost"
    className="h-6 px-2 text-xs gap-1"
    onClick={() => resetLessonProgress(progressUser.user_id, lesson.lesson_id, lesson.lesson_title)}
    disabled={isResettingLesson}
    title="Usuwa postęp użytkownika w tej lekcji"
  >
    <RotateCcw className="h-3 w-3" />
    <span className="hidden md:inline">Resetuj</span>
  </Button>
</div>
```

---

## Problem 4: Naprawa istniejących danych w bazie

### Migracja SQL - naprawić flagi is_completed

```sql
-- 1. Napraw training_assignments gdzie wszystkie lekcje są ukończone
WITH completed_modules AS (
  SELECT 
    ta.user_id,
    ta.module_id,
    COUNT(DISTINCT tl.id) as total_lessons,
    COUNT(DISTINCT CASE WHEN tp.is_completed THEN tl.id END) as completed_lessons
  FROM training_assignments ta
  JOIN training_lessons tl ON tl.module_id = ta.module_id AND tl.is_active = true
  LEFT JOIN training_progress tp ON tp.lesson_id = tl.id AND tp.user_id = ta.user_id
  WHERE ta.is_completed = false
  GROUP BY ta.user_id, ta.module_id
  HAVING COUNT(DISTINCT tl.id) = COUNT(DISTINCT CASE WHEN tp.is_completed THEN tl.id END)
    AND COUNT(DISTINCT tl.id) > 0
)
UPDATE training_assignments ta
SET 
  is_completed = true,
  completed_at = NOW()
FROM completed_modules cm
WHERE ta.user_id = cm.user_id 
  AND ta.module_id = cm.module_id
  AND ta.is_completed = false;
```

---

## Szczegóły techniczne zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/useCertificateGeneration.ts` | Dodanie walidacji ukończenia wszystkich lekcji (linie 62-78) |
| `src/components/admin/TrainingManagement.tsx` | Dodanie funkcji `approveLessonProgress` (nowa, ~30 linii) |
| `src/components/admin/TrainingManagement.tsx` | Dodanie przycisku zatwierdzania przy każdej lekcji (linie 1399-1402) |
| `src/components/admin/TrainingManagement.tsx` | Zmiana warunku wyświetlania przycisku "Zatwierdź" moduł (linia 1325) |
| `src/components/admin/TrainingManagement.tsx` | Dodanie pola `is_completed` do interface i fetchUserProgress |
| Baza danych (migracja) | Skrypt naprawiający is_completed dla przypisań z 100% postępem |

---

## Oczekiwany efekt

1. **Przycisk "Zatwierdź" przy module** - widoczny gdy `is_completed = false`, nie tylko przy < 100%
2. **Przycisk "✓" przy każdej nieukończonej lekcji** - minimalistyczny zielony przycisk
3. **Walidacja przed certyfikatem** - blokuje generowanie gdy nie wszystkie lekcje ukończone
4. **Naprawione dane** - 78 przypisań z 100% postępem otrzyma `is_completed = true`

---

## Wizualizacja UI po zmianach

```text
SPRZEDAŻOWE                    75%  [✓ Zatwierdź] [↻ Resetuj szkolenie]
├─ Lekcja 1 ✅ ukończona       5:30                [↻ Resetuj]
├─ Lekcja 2 ✅ ukończona       3:45                [↻ Resetuj]
├─ Lekcja 3 ○ nieukończona     0:00  [✓]          [↻ Resetuj]
└─ Lekcja 4 ○ nieukończona     0:00  [✓]          [↻ Resetuj]
```

