
# Naprawa nieskonczonego buforowania — przerwanie cyklu listener re-registration

## Diagnoza

Linia 995 w `SecureMedia.tsx`:
```text
}, [mediaType, disableInteraction, signedUrl, videoElement, retryCount, isSmartBuffering, isInitialBuffering]);
```

`isInitialBuffering` i `isSmartBuffering` sa w tablicy zaleznosci useEffect, ktory rejestruje event listenery na elemencie `<video>`. Kazda zmiana tych stanow powoduje:

1. Usuniecie WSZYSTKICH listenerow z `<video>`
2. Ponowne dodanie listenerow
3. Podczas re-rejestracji przegladarka emituje `waiting`/`stalled` (readyState = 0)
4. `handleStalled` natychmiast ustawia `isBuffering = true`
5. Po 3.5s timeout `isSmartBuffering = true` — co znowu restartuje useEffect
6. Petla trwa w nieskonczonosc

Klikniecie "Napraw" przerywa cykl bo wywoluje `video.load()` i resetuje stany.

## Rozwiazanie

Uzyc `useRef` zamiast bezposredniego odczytu stanow `isInitialBuffering` i `isSmartBuffering` wewnatrz handlerow, a nastepnie **usunac je z tablicy zaleznosci**. Dzieki temu listenery sa rejestrowane raz i nie sa przerywane przez zmiane stanow buforowania.

## Zmiany techniczne

### `src/components/SecureMedia.tsx`

1. Dodac dwa nowe refy obok istniejacych (okolice linii 130):

```text
const isInitialBufferingRef = useRef(true);
const isSmartBufferingRef = useRef(false);
```

2. Synchronizowac refy przy kazdej zmianie stanu (nowy useEffect):

```text
useEffect(() => { isInitialBufferingRef.current = isInitialBuffering; }, [isInitialBuffering]);
useEffect(() => { isSmartBufferingRef.current = isSmartBuffering; }, [isSmartBuffering]);
```

3. Wewnatrz useEffect z listenerami (linia 632-995): zamienic odczyty `isInitialBuffering` na `isInitialBufferingRef.current` i `isSmartBuffering` na `isSmartBufferingRef.current` w:
   - `handleCanPlay` (linia 765): `if (isInitialBufferingRef.current)`
   - `handleProgress` (linia 810): `if (isInitialBufferingRef.current && ...)`
   - `handleProgress` (linia 816): `if (isSmartBufferingRef.current && ...)`
   - `handleWaiting` (brak bezposredniego odczytu — OK)
   - `handleCanPlay` (linia 729): `if (isSmartBufferingRef.current && ...)`  (juz uzywa `isSmartBuffering` — zamienic na ref)

4. Usunac `isSmartBuffering` i `isInitialBuffering` z tablicy zaleznosci (linia 995):

```text
PRZED:
  }, [mediaType, disableInteraction, signedUrl, videoElement, retryCount, isSmartBuffering, isInitialBuffering]);

PO:
  }, [mediaType, disableInteraction, signedUrl, videoElement, retryCount]);
```

## Wplyw

- Listenery rejestrowane RAZ (przy mount lub zmianie signedUrl/retryCount) — bez cyklu
- Handlery nadal poprawnie odczytuja aktualny stan przez refy
- handleRetry ("Napraw") nadal dziala jako fallback
- Auto-recovery (stuck detection) nadal dziala
- Zero ryzyka regresji — to ten sam wzorzec co juz zastosowany dla `onTimeUpdateRef`, `onPlayStateChangeRef` itp.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Dodanie refow, zamiana odczytow stanow na refy, usuniecie z deps |
