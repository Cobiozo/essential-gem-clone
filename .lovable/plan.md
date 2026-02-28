

## Naprawa dzwieku podczas udostepniania ekranu

### Zidentyfikowane problemy

1. **Screen share video jest hardcoded `muted`**: W `ScreenShareLayout` (VideoGrid.tsx, linia 674) element `<video>` ma atrybut `muted` na stale. Jesli ktos udostepnia karte przegladarki z dzwiekiem, ten dzwiek nigdy nie bedzie odtwarzany.

2. **Autoplay policy blokuje dzwiek cichaco**: Gdy `playVideoSafe` napotka blokade autoplay, ustawia `video.muted = true` i gra wideo bez dzwieku. To samo robi `AudioElement`. Baner "Dotknij aby wlaczyc dzwiek" pojawia sie, ale:
   - Jest latwo przeoczalny (maly, na gorze ekranu)
   - Nowe elementy video dodane po kliknieciu banera (np. nowy uczestnik, nowy screen share) moga znowu byc muted
   - Unlock nie obsluguje elementow dodanych dynamicznie po pierwszym uzyciu

3. **Brak trwalego odblokowania audio**: Po pierwszym kliknieciu/dotknieciu w dowolnym miejscu okna (nie tylko banera), system powinien zapamietac ze uzytkownik juz wchodzil w interakcje i nie wyciszac nowych elementow.

### Rozwiazanie

**Plik 1: `src/components/meeting/VideoGrid.tsx`**

1. **`ScreenShareLayout`** — usunac hardcoded `muted` z video ekranu. Zamiast tego uzyc dynamicznego `muted` opartego na flagi interakcji uzytkownika:
   - Dodac prop `isAudioUnlocked` do ScreenShareLayout
   - Video bedzie `muted={!isAudioUnlocked}`, co pozwoli odtwarzac audio z udostepnianego ekranu po interakcji uzytkownika

2. **`playVideoSafe`** — dodac sprawdzanie globalnej flagi `userHasInteracted`:
   - Jesli uzytkownik juz kliknal/dotknal strone, probowac `play()` z `muted=false` bezposrednio
   - Jesli blad — dopiero wtedy fallback do muted + baner

3. **`AudioElement`** — analogiczna zmiana: jesli `userHasInteracted` jest true, nie wyciszac

4. **Dodac globalny tracker interakcji** (na poziomie modulu):
   ```text
   let userHasInteracted = false;
   const markInteracted = () => { userHasInteracted = true; };
   // ustawiane przez click/touchstart/keydown na document
   ```

**Plik 2: `src/components/meeting/VideoRoom.tsx`**

1. **Rozszerzyc handler unlockAudio** aby:
   - Ustawic globalna flage `userHasInteracted = true`
   - Unmutowac WSZYSTKIE elementy video (lacznie z nowo dodanymi)
   - Automatycznie ukryc baner

2. **Dodac listener na `click` i `touchstart`** na poziomie calego komponentu (juz istnieje, ale trzeba go rozszerzyc o ustawienie flagi globalnej)

3. **Przekazac flage `isAudioUnlocked`** do `VideoGrid` aby `ScreenShareLayout` mogl ja wykorzystac

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | Globalna flaga interakcji, dynamiczny muted na screen share, lepszy playVideoSafe |
| `src/components/meeting/VideoRoom.tsx` | Ustawienie flagi interakcji, przekazanie isAudioUnlocked |

### Ryzyko

Niskie. Zmiany sa addytywne — dodaja tracking interakcji uzytkownika. Jedyny potencjalny problem: na niektorych przegladarkach mobilnych nawet po interakcji `play()` z dzwiekiem moze byc blokowane jesli element video zostal stworzony dynamicznie. W takim przypadku fallback do muted + baner pozostaje jako zabezpieczenie.
