
# Naprawa lustrzanego odbicia udostepnianego ekranu

## Problem

Udostepniany ekran jest wyswietlany w lustrzanym odbiciu (odwrocony horyzontalnie). Dzieje sie tak, poniewaz `VideoGrid.tsx` stosuje `scale-x-[-1]` do WSZYSTKICH lokalnych wideo (kamery i screen share jednakowo). Kamera powinna byc lustrzana (naturalne zachowanie), ale udostepniany ekran - nie.

## Rozwiazanie

### Plik 1: `src/components/meeting/VideoRoom.tsx`

Przekazac prop `isScreenSharing` do komponentu `VideoGrid`:

```text
<VideoGrid
  ...
  isScreenSharing={isScreenSharing}
/>
```

### Plik 2: `src/components/meeting/VideoGrid.tsx`

1. Dodac prop `isScreenSharing` do interfejsu `VideoGrid` i przekazac go do `VideoTile` dla lokalnego uczestnika
2. W `VideoTile` - zmienic warunek lustrzanego odbicia z:
   - `participant.isLocal ? 'scale-x-[-1]' : ''`
   - na: `participant.isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''`
3. Dotyczy to 3 miejsc w pliku gdzie stosowane jest `scale-x-[-1]` (linie 89, 162, 379)

Dzieki temu kamera bedzie nadal lustrzana (naturalne zachowanie), ale udostepniany ekran bedzie wyswietlany prawidlowo.
