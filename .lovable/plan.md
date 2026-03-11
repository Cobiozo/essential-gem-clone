

# Problem: Kamera nie jest zwalniana po wyjściu + brak wyrzucenia uczestników po zakończeniu

## Diagnoza

### Problem 1: Kamera nie jest zwalniana

W `cleanup()` (VideoRoom.tsx:680) zatrzymywane są tracki z `localStreamRef`:
```
localStreamRef.current?.getTracks().forEach(t => t.stop());
```

Ale gdy tło wirtualne jest aktywne, `localStreamRef` zawiera **przetworzony strumień z canvas** (wyjście procesora), a **surowy strumień kamery** żyje w `rawStreamRef` wewnątrz `useVideoBackground.ts`. Metoda `stopBackground()` wywołuje tylko `processorRef.current?.stop()`, który ustawia `videoElement.srcObject = null`, ale **nie zatrzymuje tracków surowego strumienia kamery**.

Efekt: po wyjściu z pokoju dioda kamery nadal świeci, bo surowe tracki kamery nigdy nie zostały zatrzymane.

Ten sam problem dotyczy `beforeunload` (linia 724) — tam też zatrzymywane są tylko tracki z `localStreamRef`.

### Problem 2: Uczestnicy nie są wyrzucani po zakończeniu

Obecna logika (linia 1262-1267) nasłuchuje broadcast `meeting-ended` i wywołuje `handleLeave()`. To działa, ale:
- Nie ma fallbacku — jeśli uczestnik chwilowo stracił połączenie z kanałem broadcast, nie dostanie zdarzenia i zostanie w pokoju
- Brak okresowego sprawdzania czy spotkanie nadal trwa

## Plan zmian

### Zmiana 1: Zwalnianie surowego strumienia kamery w `stopBackground()`
**Plik:** `src/hooks/useVideoBackground.ts`

W `stopBackground()` (linia 261) dodać zatrzymanie tracków `rawStreamRef`:
```typescript
const stopBackground = useCallback(() => {
  processorRef.current?.stop();
  // Stop raw camera tracks to release hardware
  rawStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
  rawStreamRef.current = null;
  setMode('none');
  setSelectedImage(null);
}, []);
```

### Zmiana 2: Dodatkowe zabezpieczenie w cleanup VideoRoom
**Plik:** `src/components/meeting/VideoRoom.tsx`

W `cleanup()` (po linii 701) — po `stopBackground()` dodatkowo pobrać i zatrzymać surowy strumień z hooka:
```typescript
// Stop raw camera stream from background processor
const rawStream = getRawStream();
if (rawStream && rawStream !== localStreamRef.current) {
  rawStream.getTracks().forEach(t => { try { t.stop(); } catch {} });
}
stopBackground();
```

W `beforeunload` (linia 724) — dodać analogiczne zatrzymanie surowego strumienia:
```typescript
const rawStream = getRawStream();
if (rawStream) rawStream.getTracks().forEach(t => { try { t.stop(); } catch {} });
```

### Zmiana 3: Wyrzucanie uczestników po zakończeniu spotkania
**Plik:** `src/components/meeting/VideoRoom.tsx`

Dodać okresowe sprawdzanie (co 30s) czy spotkanie nadal jest aktywne. Jeśli `end_time` w tabeli `events` jest w przeszłości, wyświetlić informację i wyrzucić uczestnika:

```typescript
// Poll meeting status every 30s as fallback for missed broadcast
useEffect(() => {
  if (isHost) return; // Host controls ending
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('events')
      .select('end_time')
      .eq('meeting_room_id', roomId)
      .maybeSingle();
    if (data?.end_time && new Date(data.end_time) < new Date()) {
      toast({ title: 'Spotkanie zakończone', description: 'Prowadzący zakończył spotkanie.' });
      handleLeave();
    }
  }, 30000);
  return () => clearInterval(interval);
}, [roomId, isHost]);
```

## Pliki do edycji
1. `src/hooks/useVideoBackground.ts` — zatrzymanie surowych tracków kamery w `stopBackground()`
2. `src/components/meeting/VideoRoom.tsx` — zabezpieczenie cleanup + polling statusu spotkania

