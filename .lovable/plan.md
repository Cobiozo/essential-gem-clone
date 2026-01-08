# Plan: Zaawansowana kontrola modulu szkoleniowego z blokada wideo

## Cel
Zapewnic, ze uzytkownik aktywnie ogladawideo przez wymagany czas, z pelna synchronizacja timera i pozycji wideo.

## Wymagania biznesowe

### Lekcja niezaliczona (pierwsze ogladanie):
- Brak mozliwosci przesuwania do przodu
- Brak mozliwosci przesuwania do tylu (nawet do ogladanych fragmentow)
- Tylko Play/Pause dostepne
- Wznowienie od zapisanej pozycji (automatycznie po odswiezeniu)
- Timer = pozycja wideo (zsynchronizowane)
- Pauza przy wyjsciu z karty przegladarki (Visibility API)
- Zapis pozycji przy kazdej pauzie i wyjsciu z karty

### Lekcja zaliczona (powrot):
- Pelne kontrolki natywne
- Przesuwanie do przodu i tylu bez restrykcji
- Bez ograniczen czasowych

---

## Faza 1: Rozszerzenie bazy danych

### Migracja SQL
Dodac kolumne `video_position_seconds` do tabeli `training_progress`:

```sql
ALTER TABLE training_progress 
ADD COLUMN IF NOT EXISTS video_position_seconds NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN training_progress.video_position_seconds IS 
'Pozycja wideo w sekundach - do wznawiania od miejsca przerwania';
```

---

## Faza 2: Modyfikacja SecureMedia.tsx

### Nowe props:
```typescript
interface SecureMediaProps {
  mediaUrl: string;
  mediaType: string;
  altText?: string;
  className?: string;
  disableInteraction?: boolean;
  // NOWE:
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
}
```

### Zmiany dla wideo gdy disableInteraction=true:

1. **Pelna blokada seek (forward i backward):**
   - Nasluchiwa?na `seeking` event
   - Resetuje `currentTime` do `lastValidTime`
   - `lastValidTime` aktualizuje sie tylko przy normalnym odtwarzaniu

2. **Ukrycie natywnych kontrolek:**
   - `controls={false}` na elemencie video
   - Wlasny przycisk Play/Pause

3. **Visibility API:**
   - Przy `document.hidden === true` automatycznie pauzuje wideo
   - Wywoluje `onPlayStateChange(false)`

4. **Callbacki do rodzica:**
   - `onTimeUpdate(currentTime)` przy kazdej sekundzie
   - `onPlayStateChange(isPlaying)` przy play/pause

5. **Wznowienie od pozycji:**
   - Przy zaladowaniu ustawia `video.currentTime = initialTime`

### Gdy disableInteraction=false (lekcja zaliczona):
- Normalne natywne kontrolki
- Brak blokady seek
- Brak dodatkowych restrykcji

---

## Faza 3: Nowy komponent VideoControls.tsx

Wlasne kontrolki wideo dla trybu zablokowanego:

```
+--------------------------------------------------+
|  [Play/Pause]  ████████░░░░░░░  2:45 / 5:00     |
+--------------------------------------------------+
|                   [VIDEO]                        |
+--------------------------------------------------+
```

- Przycisk Play/Pause (jedyny interaktywny element)
- Progress bar tylko wizualny (bez mozliwosci klikniecia)
- Wyswietlanie czasu: aktualny / calkowity
- Komunikat o pauzie gdy tab nieaktywny

---

## Faza 4: Modyfikacja TrainingModule.tsx

### Nowe stany:
```typescript
const [isVideoPlaying, setIsVideoPlaying] = useState(false);
const [videoPosition, setVideoPosition] = useState(0);
const [savedVideoPosition, setSavedVideoPosition] = useState(0);
```

### Timer zsynchronizowany z wideo:
```typescript
// Timer liczy TYLKO gdy wideo jest odtwarzane
useEffect(() => {
  if (!isVideoPlaying) return;
  
  timerRef.current = setInterval(() => {
    setTimeSpent(prev => prev + 1);
  }, 1000);
  
  return () => clearInterval(timerRef.current);
}, [isVideoPlaying]);
```

### Visibility API:
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setIsVideoPlaying(false);
      saveProgressWithPosition();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### Ladowanie zapisanej pozycji:
- Pobrac `video_position_seconds` z `training_progress` przy ladowaniu lekcji
- Przekazac jako `initialTime` do `SecureMedia`

### Zapis przy opuszczeniu:
```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    navigator.sendBeacon('/api/save-progress', JSON.stringify({
      lessonId, timeSpent, videoPosition
    }));
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

### Okreslenie czy lekcja zaliczona:
```typescript
const isLessonCompleted = currentLessonProgress?.completed === true;

// Przekazanie do SecureMedia
<SecureMedia 
  disableInteraction={!isLessonCompleted}
  onPlayStateChange={setIsVideoPlaying}
  onTimeUpdate={setVideoPosition}
  initialTime={savedVideoPosition}
/>
```

---

## Faza 5: Funkcja zapisu progresu

### Rozszerzenie saveProgress():
```typescript
const saveProgressWithPosition = async () => {
  if (!user || !currentLesson) return;
  
  await supabase.from('training_progress').upsert({
    user_id: user.id,
    lesson_id: currentLesson.id,
    time_spent_seconds: timeSpent,
    video_position_seconds: videoPosition,  // NOWE
    completed: timeSpent >= (currentLesson.min_time_seconds || 0),
    updated_at: new Date().toISOString()
  });
};
```

---

## Faza 6: Obsluga przypadkow brzegowych

| Scenariusz | Zachowanie |
|------------|------------|
| Uzytkownik probuje przewinac (niezaliczona) | `currentTime` resetuje sie do `lastValidTime` |
| Uzytkownik przelacza karte | Wideo pauzuje, timer zatrzymuje, pozycja zapisana |
| Uzytkownik zamyka przegladarke | `beforeunload` zapisuje postep |
| Uzytkownik wraca do zaliczonej lekcji | Pelne kontrolki, bez restrykcji |
| Uzytkownik wraca do niezaliczonej lekcji | Wznowienie od zapisanej pozycji, blokada seek |
| YouTube wideo | Ostrzezenie ze kontrola ograniczona |
| Brak wideo w lekcji (tylko tekst) | Timer liczy od razu, bez zaleznosci od wideo |

---

## Diagram przeplywu

```
[Start lekcji]
     |
     v
[Zaladuj progress i video_position]
     |
     v
[Czy lekcja zaliczona?]
     |
    /  \
   v    v
 [TAK]  [NIE]
   |      |
   v      v
[Pelne  [Wznow wideo od video_position]
kontrolki]    |
   |          v
   |    [Uzytkownik klika Play]
   |          |
   |          v
   |    [Timer startuje] <---> [Wideo odtwarza]
   |          |
   |          |-- [Tab hidden?] --> [Pauza + Zapisz]
   |          |
   |          |-- [Klik Pause?] --> [Timer stop + Zapisz]
   |          |
   |          |-- [Proba seek?] --> [Reset do lastValidTime]
   |          |
   |          v
   |    [time_spent >= min_time]
   |          |
   |          v
   |    [Lekcja zaliczona]
   |          |
   v          v
[Odblokuj "Nastepna lekcja"]
```

---

## Podsumowanie zmian

| Plik/Element | Zmiany |
|--------------|--------|
| Migracja SQL | Dodac `video_position_seconds` do `training_progress` |
| SecureMedia.tsx | Visibility API, pelna blokada seek, custom kontrolki, callbacki |
| VideoControls.tsx | Nowy komponent z przyciskiem Play/Pause i progress bar |
| TrainingModule.tsx | Timer zalezny od stanu wideo, zapis pozycji, wznowienie |

---

## Pliki do modyfikacji

### Krytyczne pliki:
- `src/components/SecureMedia.tsx` - Glowna logika blokady wideo
- `src/pages/TrainingModule.tsx` - Synchronizacja timera i zapis progresu
- Nowy: `src/components/training/VideoControls.tsx` - Custom kontrolki

### Pliki pomocnicze:
- `src/integrations/supabase/types.ts` - Aktualizacja typow po migracji
