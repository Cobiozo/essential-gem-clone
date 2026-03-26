

# Analiza synchronizacji wideo auto-webinaru i obsługa ponownego dołączania

## Obecny stan — co działa dobrze

1. **Synchronizacja czasowa** — działa poprawnie. Wideo startuje punktualnie o godzinie slotu. Gość dołączający o 11:02 widzi `startOffset = 122` (sekundy od startu slotu), a odtwarzacz ustawia `video.currentTime = startOffset`. Wideo toczy się niezależnie od ruchu uczestników.

2. **Ciągłość odtwarzania** — po pierwszym załadowaniu wideo gra nieprzerwanie (guard `hasStartedRef` w efekcie playback zapobiega ponownemu ładowaniu). `startOffset` jest przeliczany co 10s, ale NIE nadpisuje pozycji odtwarzacza — służy tylko do inicjalnego seekowania.

3. **Blokowanie spóźnionych** — działa, ale za agresywnie (patrz problem).

## Problem do naprawy

**Brak rozróżnienia między "nigdy nie dołączył" a "był, ale wyszedł z przyczyn technicznych".**

Obecna logika (linia 225 w `useAutoWebinarSync.ts`):
```
if (sinceSlot > lateJoinMaxSec && sinceSlot < duration)
  → isTooLate = true  // blokuje KAŻDEGO
```

Gość, który dołączył o 11:00, oglądał 5 minut, stracił połączenie i próbuje wrócić o 11:08 — jest blokowany identycznie jak ktoś, kto nigdy nie był na spotkaniu.

## Rozwiązanie

### 1. `src/components/auto-webinar/AutoWebinarEmbed.tsx` — sprawdzenie istniejącej sesji

Dodać zapytanie do `auto_webinar_views` sprawdzające, czy dany gość (po `guest_email` lub `session_id`) ma już rekord dla bieżącego wideo. Jeśli tak → ustawić flagę `hasExistingSession = true`.

### 2. `src/components/auto-webinar/AutoWebinarEmbed.tsx` — bypass `isTooLate` dla powracających

Zmienić warunek renderowania:
- Jeśli `isTooLate === true` ORAZ `hasExistingSession === true` → pozwól dołączyć (traktuj jak normalny `shouldShowPlayer`)
- Jeśli `isTooLate === true` ORAZ `hasExistingSession === false` → zablokuj (obecne zachowanie "Spotkanie jest w trakcie")

### 3. Persystencja `sessionId` w `localStorage`

Obecnie `sessionId` jest generowany jako `crypto.randomUUID()` przy każdym renderze — po odświeżeniu strony jest nowy. Aby rozpoznać powracającego gościa:
- Zapisywać `sessionId` w `localStorage` z kluczem zawierającym `guestSlotTime` i datę
- Przy ponownym wejściu odczytać ten sam `sessionId`
- Alternatywnie (prostsze): szukać po `guest_email` w `auto_webinar_views`

### Schemat decyzyjny
```text
Gość dołącza po lateJoinMaxSec:
  ├── Czy istnieje rekord w auto_webinar_views
  │   dla tego emaila + tego wideo + dzisiejsza data?
  │   ├── TAK → Wpuść (rejoin), wideo gra od aktualnego offsetu
  │   └── NIE → Zablokuj (isTooLate = "Spotkanie jest w trakcie")
```

### Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Query do `auto_webinar_views` + bypass `isTooLate` dla istniejących sesji |
| `src/hooks/useAutoWebinarTracking.ts` | Opcjonalnie: persystencja `sessionId` w localStorage |

### Co NIE wymaga zmian
- `useAutoWebinarSync.ts` — logika synchronizacji czasowej jest poprawna, wideo startuje punktualnie i gra niezależnie od uczestników
- Baza danych — nie trzeba nowych tabel ani migracji
- Blokowanie po `linkExpiry` i `roomClosed` — bez zmian

