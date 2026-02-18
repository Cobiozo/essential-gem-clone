

# Naprawa zielonego mikrofonu i dodanie awatarow w panelu uczestnikow

## Problem 1: Zielony mikrofon mowcy nie wyswietla sie

Komponent `AudioIndicator` istnieje i jest renderowany, ale mikrofon pozostaje szary. Przyczyny:

1. **AudioContext w stanie "suspended"** - przegladarki blokuja AudioContext do momentu interakcji uzytkownika. Kod tworzy `new AudioContext()` ale nigdy nie wywoluje `ctx.resume()`, wiec analizator zwraca same zera.
2. **Brak widocznosci** - ikona mikrofonu jest mala (h-3 w-3) i umieszczona w prawym dolnym rogu overlay, co utrudnia zauwa zenie.

### Naprawa w `VideoGrid.tsx`:
- Dodac `await ctx.resume()` po utworzeniu AudioContext (linia 183)
- Powiekszyc ikone mikrofonu w glownym VideoTile do h-4 w-4
- Dodac wyrazniejszy efekt swiecenia (glow) gdy mikrofon jest aktywny

## Problem 2: Brak awatarow w panelu uczestnikow

Na screenshocie referencyjnym widac prawdziwe zdjecie profilowe uczestnika. Obecnie `ParticipantsPanel` uzywa generycznej ikony `User`. Trzeba:

### Naprawa w `ParticipantsPanel.tsx`:
- Dodac prop `avatarUrl?: string` do interfejsu `Participant`
- Pobierac `avatar_url` z tabeli `profiles` dla uczestnikow spotkania
- Wyswietlac prawdziwy awatar (komponent Avatar z radix-ui) z fallbackiem na inicjaly

### Naprawa w `VideoRoom.tsx`:
- Przy rejestracji uczestnika pobrac rowniez `avatar_url` z profilu
- Przekazac `avatarUrl` do `ParticipantsPanel`
- Dodac `avatarUrl` do interfejsu `RemoteParticipant`

### Naprawa w `VideoGrid.tsx`:
- Dodac `avatarUrl` do `VideoParticipant` - wyswietlac awatar zamiast ikony User gdy kamera jest wylaczona

## Szczegoly techniczne

### AudioContext resume
```typescript
if (!audioContextRef.current) {
  try {
    audioContextRef.current = new AudioContext();
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  } catch { return; }
}
```

Poniewaz `useEffect` nie moze byc async, trzeba uzyc IIFE lub `.then()` wewnatrz efektu.

### Awatary uczestnikow
- Rozszerzyc interfejs `Participant` w ParticipantsPanel o `avatarUrl?: string`
- Rozszerzyc `RemoteParticipant` w VideoRoom o `avatarUrl?: string`
- Rozszerzyc `VideoParticipant` w VideoGrid o `avatarUrl?: string`
- W VideoRoom: po zalogowaniu pobrac `avatar_url` lokalnego uzytkownika z `profiles`
- W VideoRoom: przy `handleCall` / `callPeer` pobrac avatar zdalnego uczestnika
- Uzyc komponentu `Avatar` / `AvatarImage` / `AvatarFallback` z `@/components/ui/avatar`

### Zmieniane pliki
1. `src/components/meeting/VideoGrid.tsx` - resume AudioContext, awatar w VideoTile, wieksza ikona mikrofonu
2. `src/components/meeting/ParticipantsPanel.tsx` - awatary uczestnikow z fallbackiem na inicjaly
3. `src/components/meeting/VideoRoom.tsx` - pobieranie avatar_url z profiles, przekazywanie do komponentow

