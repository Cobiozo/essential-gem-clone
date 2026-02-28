

## Naprawa echa audio w spotkaniach wideo

### Przyczyna problemu

W trybie **Speaker** (domyslnym) oraz **Multi-speaker**, ten sam strumien zdalnego uczestnika jest podlaczony do **dwoch** elementow `<video>` jednoczesnie:

1. Glowny kafelek (`VideoTile`) - odtwarza audio (poprawnie)
2. Miniaturka (`ThumbnailTile` / `MiniVideo`) - **rowniez odtwarza audio** (blad!)

Podwojne odtwarzanie tego samego dzwieku z dwoch zrodel sprawia, ze algorytm echo cancellation w przegladarce nie jest w stanie prawidlowo wyciszyc echa - slyszysz "podwojny" dzwiek z lekkim przesunieciem, ktory mikrofon przechwytuje i odsyla z powrotem.

### Rozwiazanie

Wyciszyc (`muted`) elementy `<video>` we wszystkich miniaturkach. Dzwiek powinien byc odtwarzany tylko z jednego elementu video na uczestnika (glowny kafelek).

### Zmiany

**Plik: `src/components/meeting/VideoGrid.tsx`**

1. **ThumbnailTile** (linia ~192): Zmiana `muted={participant.isLocal}` na `muted` (zawsze wyciszony):
   ```text
   <video ref={videoRef} autoPlay playsInline muted ... />
   ```

2. **MiniVideo** (linia ~425): Zmiana `muted={participant.isLocal}` na `muted` (zawsze wyciszony):
   ```text
   <video ref={ref} autoPlay playsInline muted ... />
   ```

### Dlaczego to dziala

- Kazdy zdalny uczestnik ma dokladnie **jeden** element `<video>` odtwarzajacy audio (glowny kafelek w VideoTile)
- Miniaturki pokazuja tylko obraz bez dzwieku
- Echo cancellation w przegladarce moze prawidlowo pracowac gdy dzwiek pochodzi z jednego zrodla
- Brak zmian w dzialaniu mikrofonu ani w strumieniach — tylko wyciszenie duplikatow

### Wplyw

- Tryb Speaker: naprawiony
- Tryb Multi-speaker: naprawiony
- Tryb Gallery: bez zmian (kazdy uczestnik ma jeden VideoTile, brak miniaturek)
- Mobile i desktop: naprawione jednakowo
