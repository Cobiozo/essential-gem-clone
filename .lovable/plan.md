
# Naprawa błędu React #310 w TrainingModule

## Zdiagnozowany problem

**Błąd**: React Error #310 ("Rendered fewer hooks than expected")

**Przyczyna**: Hook `useLessonNotes` jest wywoływany WARUNKOWO - po instrukcjach `if/return`:

```tsx
// Linia 1018-1043: Early return podczas ładowania
if (loading) {
  return (...);  // ❌ Hook poniżej NIE jest wywoływany
}

// Linia 1045-1064: Early return gdy brak modułu
if (!module || lessons.length === 0) {
  return (...);  // ❌ Hook poniżej NIE jest wywoływany
}

// Linia 1071-1079: Hook wywoływany WARUNKOWO
const { notes, noteMarkers, ... } = useLessonNotes(currentLesson?.id, user?.id);
```

To narusza **Zasady Hooków React** - hooki muszą być wywoływane bezwarunkowo na każdym renderze.

---

## Rozwiązanie

Przenieść wywołanie `useLessonNotes` NA POCZĄTEK komponentu, przed wszystkie instrukcje `if/return`:

```tsx
const TrainingModule = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<TrainingModule | null>(null);
  // ... inne useState i useRef
  
  const currentLesson = lessons[currentLessonIndex];
  
  // ✅ Hook BEZWARUNKOWO na początku komponentu
  const {
    notes,
    noteMarkers,
    addNote,
    updateNote,
    deleteNote,
    exportNotes,
    getNoteById
  } = useLessonNotes(currentLesson?.id, user?.id);
  
  // ... reszta useEffect i logiki
  
  // Teraz bezpieczne early returns
  if (loading) {
    return (...);
  }
  
  if (!module || lessons.length === 0) {
    return (...);
  }
  
  // ... reszta renderowania
};
```

---

## Szczegóły techniczne

| Plik | Zmiana |
|------|--------|
| `src/pages/TrainingModule.tsx` | Przeniesienie hooka `useLessonNotes` przed wszystkie instrukcje `return` |

### Kroki:
1. Przenieść definicję `currentLesson` wyżej (przed early returns)
2. Przenieść wywołanie `useLessonNotes` tuż po wszystkich hookach useState/useRef (linia ~95)
3. Przenieść powiązane funkcje pomocnicze (`handleNoteMarkerClick`, `formatNoteTime`, `handleSeekToTime`) również wyżej

---

## Oczekiwany efekt

Po naprawie:
- Szkolenia będą się prawidłowo ładować
- Błąd React #310 zniknie
- System notatek będzie działać poprawnie
- Aplikacja będzie stabilna
