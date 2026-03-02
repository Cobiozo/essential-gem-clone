
# Podglad tla na zywo w selektorze BackgroundSelector

## Obecny stan
- `BackgroundSelector` to prosty dropdown z lista opcji (tekst + miniatura) -- brak podgladu na zywo
- Selektor jest dostepny tylko w `MeetingControls` (po dolaczeniu do spotkania)
- W Lobby (`MeetingLobby.tsx`) nie ma mozliwosci wyboru tla -- uzytkownik widzi surowy obraz z kamery

## Plan zmian

### Zmiana 1: Rozszerzenie BackgroundSelector o podglad na zywo

**Plik: `src/components/meeting/BackgroundSelector.tsx`**

Dodanie opcjonalnego elementu `<video>` w gornej czesci `DropdownMenuContent`, ktory pokazuje obraz z kamery z aktualnie wskazywanym (hovered) efektem tla:

- Nowe propsy: `previewStream?: MediaStream` (surowy strumien z kamery) i `onPreviewChange?: (mode: BackgroundMode, src?: string) => void` (callback hover/preview)
- W gornej czesci dropdowna: element `<canvas>` o proporcjach 16:9 (ok. 280x158px) pokazujacy podglad na zywo
- Stan wewnetrzny `hoveredMode` / `hoveredImage` sledzacy, ktora opcje uzytkownik aktualnie wskazuje
- Przy `onMouseEnter` na kazdej opcji -> wywolanie `onPreviewChange` z danym trybem
- Przy `onMouseLeave` z calego menu -> powrot do aktualnie aktywnego trybu
- Na urzadzeniach dotykowych (mobile): podglad pokazuje aktualnie wybrana opcje (bez hover)

Podglad uzywa lekkiej instancji `VideoBackgroundProcessor` zaradzanej przez rodzica (Lobby lub VideoRoom), zeby nie duplikowac ciezkiego modelu ML.

### Zmiana 2: Integracja BackgroundSelector w MeetingLobby

**Plik: `src/components/meeting/MeetingLobby.tsx`**

- Import i uzycie `useVideoBackground`, `useZoomBackgrounds`, `useCustomBackgrounds`
- Dodanie przycisku "Tlo" pod przelacznikami Mikrofon/Kamera (ikona Palette), ktory otwiera `BackgroundSelector`
- Podglad na zywo: strumien `previewStream` z lobby jest przekazywany do selektora
- Gdy uzytkownik wybiera tlo w selektorze:
  1. `applyBackground(previewStream, mode, imageSrc)` zwraca przetworzony strumien
  2. Przetworzony strumien jest podpinany pod `videoRef` w lobby (uzytkownik widzi efekt w glownym podgladzie)
  3. Przetworzony strumien jest przekazywany do `onJoin()` przy dolaczaniu
- Gdy uzytkownik zmieni hover na inna opcje w selektorze, podglad w glownym wideo lobby aktualizuje sie na zywo

### Zmiana 3: Logika podgladu w tle (hover preview)

**Plik: `src/hooks/useVideoBackground.ts`**

- Nowa metoda `previewBackground(stream, mode, imageSrc)` -- lekka wersja `applyBackground`:
  - Uzywa tego samego processora co `applyBackground`
  - Zmienia opcje processora bez zatrzymywania/restartowania go (jesli juz dziala)
  - Optymalizacja: `setOptions()` + dalszy rendering bez `stop()/start()` gdy zmienia sie tylko tryb/obraz

### Zmiana 4: Przekazanie przetworzonego strumienia do VideoRoom

**Plik: `src/pages/MeetingRoom.tsx`**

- Strumien z lobby (surowy lub przetworzony) jest juz przekazywany przez `onJoin(..., stream)`.
- Dodanie logiki: jesli strumien z lobby ma flage `__bgProcessed`, VideoRoom uzywa go bezposrednio i ustawia `updateRawStream` z oryginalnym surowym strumieniem (zachowanym w lobby).
- To zapewnia plynne przejscie z podgladu tla w lobby do aktywnego spotkania bez re-init processora.

## Przeplyw UX

```text
Lobby:
+---------------------------+
|   Dolacz do spotkania     |
|   Witaj, Jan              |
|                           |
|  +---------------------+  |
|  |  [LIVE VIDEO z tlem]|  |  <-- glowny podglad (surowy lub z efektem)
|  +---------------------+  |
|                           |
|  Mikrofon          [ON]   |
|  |||||||||||||||    51%    |
|  Kamera            [ON]   |
|  Tlo               [>>]   |  <-- przycisk otwierajacy BackgroundSelector
|                           |
|  [  Dolacz do spotkania ] |
+---------------------------+

Po kliknieciu "Tlo":
+---------------------------+
| Podglad tla [LIVE 16:9]   |  <-- mini podglad z aktualnym hover
|---------------------------|
| o Brak efektu             |
| o Lekkie rozmycie         |
| o Mocne rozmycie          |
|---------------------------|
| Wirtualne tla             |
| [img] Tlo 1               |
| [img] Tlo 2               |
|---------------------------|
| Twoje tla (1/3)           |
| [img] Wlasne 1            |
| + Dodaj tlo               |
+---------------------------+
```

## Sekcja techniczna

### Nowe propsy BackgroundSelector:
```typescript
interface BackgroundSelectorProps {
  // ... istniejace propsy ...
  previewStream?: MediaStream | null;
  onPreviewModeChange?: (mode: BackgroundMode, imageSrc?: string) => void;
}
```

### Logika podgladu w lobby (MeetingLobby):
```typescript
// Gdy uzytkownik wybiera tlo w selektorze:
const handleBackgroundSelect = async (mode: BackgroundMode, imageSrc?: string) => {
  if (!previewStream) return;
  if (mode === 'none') {
    // Przywroc surowy strumien
    videoRef.current.srcObject = previewStream;
    return;
  }
  const processed = await applyBackground(previewStream, mode, imageSrc);
  videoRef.current.srcObject = processed;
  setProcessedStream(processed); // zapamietaj do przekazania w onJoin
};
```

### Podglad canvas w BackgroundSelector:
- Element `<video>` ukryty (zrodlowy) + `<canvas>` widoczny (280x158px)
- Renderowanie: `requestAnimationFrame` rysuje klatki z video na canvas
- Gdy `previewStream` nie jest podany (np. w VideoRoom), podglad sie nie pojawia (backward compatible)

## Pliki do zmiany
1. `src/components/meeting/BackgroundSelector.tsx` -- dodanie podgladu video na zywo w dropdownie
2. `src/components/meeting/MeetingLobby.tsx` -- integracja selektora tla z przyciskiem + logika podgladu
3. `src/hooks/useVideoBackground.ts` -- metoda `previewBackground` do szybkiego przelaczania
4. `src/pages/MeetingRoom.tsx` -- obsluga przetworzonego strumienia z lobby

## Oczekiwane rezultaty
- Uzytkownik widzi podglad tla na zywo w selektorze przed zastosowaniem
- Glowny podglad w lobby aktualizuje sie po wybraniu efektu
- Efekt tla przechodzi plynnie z lobby do spotkania bez ponownego ladowania modelu
- Dziala zarowno dla prowadzacego jak i uczestnika
- Backward compatible -- w VideoRoom (MeetingControls) selektor dziala jak dotychczas
