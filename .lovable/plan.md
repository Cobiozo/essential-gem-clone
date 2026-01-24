
# Naprawa błędu React #310 - useCallback po early returns

## Problem

Błąd: **"Rendered more hooks than during the previous render"**

Przyczyna: W `TrainingModule.tsx` po naprawie hooka `useLessonNotes`, pozostały dwa hooki `useCallback` (linie 1093-1108) **PO** instrukcjach `if/return`:

```tsx
// Linia 1041-1065: Early return podczas ładowania
if (loading) {
  return (...);  // ❌ Tu komponenty się zatrzymują przy pierwszym renderze
}

// Linia 1067-1086: Early return gdy brak modułu
if (!module || lessons.length === 0) {
  return (...);  // ❌ Tu też
}

// Linia 1093-1101: HOOK PO EARLY RETURN!
const handleNoteMarkerClick = useCallback(...);  // ❌ Niezawołany przy loading=true

// Linia 1104-1108: HOOK PO EARLY RETURN!
const handleSeekToTime = useCallback(...);  // ❌ Niezawołany przy loading=true
```

To narusza zasady React - liczba hooków musi być taka sama przy każdym renderze.

---

## Rozwiązanie

Przenieść `handleNoteMarkerClick` i `handleSeekToTime` na **początek komponentu** (po linii 115, obok `formatNoteTime`):

```tsx
// Linia ~96-115: Istniejące hooki
const currentLesson = lessons[currentLessonIndex];

const { notes, noteMarkers, ... } = useLessonNotes(currentLesson?.id, user?.id);

const formatNoteTime = (seconds: number) => { ... };

// ✅ DODAĆ TUTAJ (przed wszelkimi early returns):
const handleNoteMarkerClick = useCallback((noteId: string) => {
  const note = getNoteById(noteId);
  if (note) {
    toast({
      title: `Notatka (${formatNoteTime(note.video_timestamp_seconds)})`,
      description: note.content
    });
  }
}, [getNoteById, toast]);

const handleSeekToTime = useCallback((seconds: number) => {
  // Pobierz isLessonCompleted wewnątrz callbacka zamiast z dependency
  const currentProgress = progress[currentLesson?.id];
  const completed = currentProgress?.is_completed || false;
  if (seekToTimeRef.current && completed) {
    seekToTimeRef.current(seconds);
  }
}, [progress, currentLesson?.id]);
```

I usunąć duplikaty z linii 1092-1108.

---

## Szczegóły techniczne

| Linia | Zmiana |
|-------|--------|
| ~115 | Dodać `handleNoteMarkerClick` i `handleSeekToTime` |
| 1088-1108 | Usunąć stare definicje tych callbacków |

---

## Oczekiwany efekt

- Wszystkie hooki wywoływane bezwarunkowo przy każdym renderze
- Błąd React #310 zniknie
- Szkolenia będą działać poprawnie
- System notatek będzie funkcjonować bez przeszkód
