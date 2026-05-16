## Cel

Przed zaliczeniem lekcji player ma wyglądać **identycznie jak po zaliczeniu** (natywne kontrolki przeglądarki ze screenu: pasek postępu, czas, menu „Szybkość odtwarzania", „Obraz w obrazie", pełny ekran). Jedyna różnica: **przewijanie zablokowane** do momentu zaliczenia. Menu prędkości pokazuje się tylko jeśli admin włączył 1.5× dla lekcji.

## Stan obecny w `SecureMedia.tsx`

- Tryb `restricted` (przed zaliczeniem): `<video controls={false}>` + własny pasek `<VideoControls>` pod spodem + dodatkowa overlay 1×/1.5× w rogu.
- Tryb `secure`/po zaliczeniu: `<video controls>` — natywne kontrolki przeglądarki (to co użytkownik chce).

## Zmiana

Ujednolicić tryb restricted z trybem po zaliczeniu — używać **natywnych `controls`** również przed zaliczeniem, z blokadą seekowania na poziomie eventów wideo.

### 1. `SecureMedia.tsx` — branch restricted (~linie 2073–2153)

- Włączyć `controls` na elemencie `<video>` (tak samo jak w branchu po zaliczeniu).
- Usunąć komponent `<VideoControls>` (pasek pod wideo) z tego brancha.
- Usunąć overlay 1×/1.5× w prawym górnym rogu — prędkość pokaże się w natywnym menu „⋮" przeglądarki.
- Zachować overlay „Play" w centrum i „Tap to resume" — nie kolidują z natywnymi kontrolkami (te są na dole).

### 2. Blokada przewijania (kluczowe)

Dodać do elementu `<video>` w trybie restricted handlery, które wykrywają i cofają seek:

```ts
const lastTimeRef = useRef(0);

onTimeUpdate: (e) => {
  const v = e.currentTarget;
  // zapisuj naturalny postęp
  if (Math.abs(v.currentTime - lastTimeRef.current) < 1.5) {
    lastTimeRef.current = v.currentTime;
  }
  // … istniejący onTimeUpdate (progress tracking) …
}

onSeeking: (e) => {
  const v = e.currentTarget;
  // jeśli użytkownik skoczył do przodu lub wstecz poza naturalne odtwarzanie
  if (Math.abs(v.currentTime - lastTimeRef.current) > 1.5) {
    v.currentTime = lastTimeRef.current; // cofnij
  }
}
```

Tolerancja 1.5 s pokrywa naturalne kroki `timeupdate` (~250 ms) i drobne fluktuacje przy buforowaniu HLS na iOS.

### 3. Ograniczenie listy prędkości w natywnym menu

Natywne `controls` przeglądarki **nie pozwalają filtrować opcji w menu prędkości** (Chrome pokazuje 0.25–2×, Safari ma własny zestaw). Dlatego zostaje istniejąca ochrona w `handleRateChange`:

- Jeśli `allowedPlaybackRates.length <= 1` (admin nie włączył): handler wykrywa każdą zmianę `playbackRate` ≠ 1 i resetuje do 1. Użytkownik może kliknąć w menu, ale prędkość natychmiast wróci do 1× — efektywnie zablokowane.
- Jeśli admin włączył 1.5×: dozwolone `[1, 1.5]`. Każda inna wartość (0.5, 1.25, 2 itd.) wybrana z natywnego menu zostanie zresetowana do 1.

To rozwiązanie jest spójne z tym, co użytkownik widzi na screenie (natywne menu „Szybkość odtwarzania") — dostępne, ale efektywnie ograniczone do dozwolonych wartości.

### 4. Zaliczenie przy 1.5×

Bez zmian — `currentTime` jest niezależny od `playbackRate`, więc próg zaliczenia (90 % długości) zadziała tak samo.

### 5. `VideoControls.tsx`

Komponent przestaje być używany w trybie restricted. Pozostawiamy plik bez zmian (może być używany w innych miejscach — sprawdzić w trakcie implementacji; jeśli nie, można usunąć).

## Pliki do edycji

- `src/components/SecureMedia.tsx` — branch restricted: włączyć `controls`, usunąć `<VideoControls>` i overlay prędkości, dodać `onSeeking` z `lastTimeRef`.
- (opcjonalnie) `src/components/training/VideoControls.tsx` — usunąć, jeśli nieużywany w innych miejscach.

## Poza zakresem

- Tryb `secure` (po zaliczeniu) — już działa zgodnie z oczekiwaniem.
- `SecureVideoControls.tsx` — niewykorzystywany w `TrainingModule`.
- Zmiany w admin UI / DB / typach — już zrobione w poprzednich iteracjach.
