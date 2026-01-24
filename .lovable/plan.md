
# Naprawa: Wideo i timer nie zatrzymują się przy otwarciu dialogu notatek

## Zdiagnozowany problem

Użytkownik zgłasza, że po otwarciu okna notatek:
1. **Wideo nie zatrzymuje się** - kontynuuje odtwarzanie w tle
2. **Timer nie zatrzymuje się** - czas lekcji jest nadal naliczany

**Przyczyna**: Brak powiązania między stanem dialogu (`isNotesDialogOpen`) a logiką odtwarzania wideo i timerem.

---

## Rozwiązanie

### 1. Dodać pausowanie wideo przy otwarciu dialogu notatek

W `SecureMedia.tsx` dodać nową właściwość `pauseRequested` oraz useEffect, który pauzuje wideo gdy ta flaga jest `true`:

```tsx
// SecureMedia.tsx - nowy prop
interface SecureMediaProps {
  // ... istniejące propsy
  pauseRequested?: boolean;  // NOWY: żądanie pauzowania z zewnątrz
}

// useEffect reagujący na pauseRequested
useEffect(() => {
  if (pauseRequested && videoRef.current && !videoRef.current.paused) {
    console.log('[SecureMedia] External pause requested (notes dialog)');
    videoRef.current.pause();
  }
}, [pauseRequested]);
```

### 2. Przekazać stan dialogu do SecureMedia

W `TrainingModule.tsx` przekazać `isNotesDialogOpen` jako `pauseRequested`:

```tsx
<SecureMedia 
  key={currentLesson.id}
  // ... pozostałe propsy
  pauseRequested={isNotesDialogOpen}  // NOWY
/>
```

### 3. Zatrzymać timer lekcji tekstowej gdy dialog jest otwarty

W `TrainingModule.tsx` dodać warunek `isNotesDialogOpen` do useEffect obsługującego timer:

```tsx
// Istniejący useEffect z timerem (linie 352-374)
useEffect(() => {
  const currentLesson = lessons[currentLessonIndex];
  const hasVideo = currentLesson?.media_type === 'video' && currentLesson?.media_url;
  const isLessonCompleted = progress[currentLesson?.id]?.is_completed;
  
  // NOWY WARUNEK: zatrzymaj timer gdy dialog notatek jest otwarty
  if (hasVideo || isLessonCompleted || isNotesDialogOpen) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return;
  }

  timerRef.current = setInterval(() => {
    setTextLessonTime(prev => prev + 1);
  }, 1000);
  
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, [currentLessonIndex, lessons, progress, isNotesDialogOpen]); // DODAĆ do dependencies
```

---

## Szczegóły techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Dodać prop `pauseRequested` i useEffect do pauzowania |
| `src/pages/TrainingModule.tsx` | Przekazać `pauseRequested={isNotesDialogOpen}` do SecureMedia |
| `src/pages/TrainingModule.tsx` | Dodać `isNotesDialogOpen` do warunku timera lekcji tekstowej |

---

## Diagram przepływu

```text
┌─────────────────────────────────────────────────────────┐
│                    TrainingModule                       │
│                                                         │
│  [Przycisk Notatki] ──onClick──> setIsNotesDialogOpen   │
│                                       │                 │
│                                       ▼                 │
│  ┌─────────────────────────────────────────────┐       │
│  │ isNotesDialogOpen = true                    │       │
│  └───────────────┬─────────────────────────────┘       │
│                  │                                      │
│       ┌──────────┴──────────┐                          │
│       ▼                     ▼                          │
│  SecureMedia           Timer useEffect                 │
│  pauseRequested=true   if (isNotesDialogOpen)          │
│       │                     │                          │
│       ▼                     ▼                          │
│  video.pause()         clearInterval(timerRef)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Oczekiwany efekt

Po wdrożeniu:
- Wideo automatycznie zatrzyma się po otwarciu dialogu notatek
- Timer lekcji tekstowej zatrzyma się gdy dialog jest otwarty
- Po zamknięciu dialogu użytkownik może wznowić odtwarzanie ręcznie
- Timestamp notatki zostanie prawidłowo zapisany (czas zatrzymania)
