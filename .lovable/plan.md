

# Naprawa: Ukończone lekcje nie mogą być resetowane

## Zdiagnozowany problem

Dodanie funkcji notatek spowodowało, że **ukończone lekcje mogą być resetowane** do statusu nieukończonego. Problem występuje w kilku miejscach w kodzie, które **nie sprawdzają czy lekcja była już ukończona** przed zapisaniem nowego statusu.

### Analiza kodu - miejsca problematyczne:

| Lokalizacja | Problem |
|-------------|---------|
| **handleBeforeUnload** (linie 412-469) | Oblicza `isCompleted` na nowo i zapisuje do bazy - może nadpisać `true` na `false` |
| **Unmount effect** (linie 730-760) | Zapisuje do localStorage z nowo obliczonym `isCompleted` |
| **localStorage sync** (linie 211-260) | Przywraca backup z localStorage, który może mieć `is_completed: false` mimo że DB ma `true` |

### Przykład problemu:
1. Użytkownik ukończył lekcję (obejrzał 377s z 377s) → `is_completed = true`
2. Później wraca do ukończonej lekcji i ogląda notatki (pozycja = 2s)
3. Zamyka stronę → `handleBeforeUnload` oblicza: `2s < 377s` → `is_completed = false`
4. Lekcja zostaje zresetowana!

---

## Rozwiązanie

Dodać sprawdzenie `wasAlreadyCompleted` we **wszystkich miejscach** zapisu postępu:

### 1. handleBeforeUnload (linie 412-469)
```tsx
const handleBeforeUnload = async () => {
  const currentLesson = lessons[currentLessonIndex];
  if (!user || !currentLesson) return;

  // NOWE: Sprawdź czy lekcja już ukończona - nie nadpisuj statusu
  const wasAlreadyCompleted = progress[currentLesson.id]?.is_completed;
  if (wasAlreadyCompleted) {
    console.log('[TrainingModule] Skipping beforeunload save for completed lesson');
    return;
  }

  // ... reszta kodu bez zmian
};
```

### 2. Unmount effect (linie 730-760)
```tsx
useEffect(() => {
  const currentLesson = lessons[currentLessonIndex];
  const lessonId = currentLesson?.id;
  
  return () => {
    if (lessonId && user) {
      // NOWE: Sprawdź czy lekcja już ukończona - nie nadpisuj
      const wasAlreadyCompleted = progress[lessonId]?.is_completed;
      if (wasAlreadyCompleted) {
        console.log('[TrainingModule] Skipping unmount save for completed lesson');
        return;
      }
      
      // ... reszta kodu bez zmian
    }
  };
}, [lessons, currentLessonIndex, user, textLessonTime, progress]); // Dodać progress do dependencies
```

### 3. localStorage sync (linie 211-260)
```tsx
// Przy synchronizacji backup z localStorage:
if (backup.timestamp > dbUpdatedAt && Date.now() - backup.timestamp < 86400000) {
  // NOWE: Nie resetuj ukończonych lekcji
  const wasCompletedInDb = progressMap[lesson.id]?.is_completed;
  const backupCompleted = backup.is_completed || false;
  
  // Jeśli było ukończone w DB, zachowaj true
  const finalCompleted = wasCompletedInDb || backupCompleted;
  
  const { error } = await supabase.from('training_progress').upsert({
    user_id: user.id,
    lesson_id: lesson.id,
    time_spent_seconds: backup.time_spent_seconds || 0,
    video_position_seconds: backup.video_position_seconds || 0,
    is_completed: finalCompleted,  // ZMIANA: nigdy nie resetuj true→false
    completed_at: finalCompleted ? (progressMap[lesson.id]?.completed_at || new Date().toISOString()) : null
  }, { onConflict: 'user_id,lesson_id' });
  // ...
}
```

---

## Szczegóły techniczne

| Plik | Linie | Zmiana |
|------|-------|--------|
| `src/pages/TrainingModule.tsx` | 412-469 | Dodać early return dla ukończonych lekcji w `handleBeforeUnload` |
| `src/pages/TrainingModule.tsx` | 730-760 | Dodać early return dla ukończonych lekcji w unmount effect |
| `src/pages/TrainingModule.tsx` | 211-260 | Przy sync z localStorage zachowywać `is_completed = true` jeśli już ukończone |

---

## Diagram logiki

```text
Przed zapisem postępu:
┌─────────────────────────────────────────────┐
│ Czy lekcja była już ukończona (is_completed = true)?
│                                             │
│     TAK                       NIE           │
│      │                         │            │
│      ▼                         ▼            │
│  SKIP SAVE                 Oblicz nowy      │
│  (return)                  is_completed     │
│                                │            │
│                                ▼            │
│                            Zapisz postęp    │
└─────────────────────────────────────────────┘
```

---

## Oczekiwany efekt

- Ukończone lekcje **NIGDY** nie zostaną zresetowane do nieukończonych
- Użytkownik może swobodnie przeglądać ukończone lekcje i dodawać notatki
- Status ukończenia jest nieodwracalny (raz `true` = zawsze `true`)
- Przeglądanie ukończonych lekcji nie wpływa na postęp

