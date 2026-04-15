
# Zmiana systemu zaliczania lekcji: 100% wideo + uproszczony UX

## Problem
Obecny próg 80% jest mylący dla użytkowników (widoczny komunikat "wymagane 80%") i może powodować błędne odczyty zaliczenia. Użytkownik powinien obejrzeć całe nagranie, a następnie jawnie zatwierdzić zakończenie lekcji.

## Plan zmian

### Plik 1: `src/pages/TrainingModule.tsx`

**A) Zmiana progu z 80% na 100%**
- Linia 67: `VIDEO_COMPLETION_THRESHOLD = 0.8` → `1.0`
- Warunek odblokowania przycisku: wideo musi osiągnąć co najmniej 98% czasu trwania (zamiast 80%). Użycie 98% zamiast dosłownego 100% daje tolerancję na drobne niedokładności iOS (np. `ended` event odpala się przy 99.7% duration).

**B) Uproszczenie UI — usunięcie mylących komunikatów**
- Linia 1067: Usunąć tekst `(wymagane 80%)` z paska postępu
- Linia 1170: Zmienić komunikat pod przyciskiem z "Obejrzyj co najmniej 80% wideo" na prostszy: **"Obejrzyj nagranie do końca, aby odblokować przycisk"**
- Usunąć wyświetlanie "Pozostało: X:XX" — zbędne, wystarczy pasek postępu

**C) Auto-odblokowanie po `ended` event**
- Gdy wideo się zakończy (event `ended` na elemencie video), ustawić `videoPosition` na wartość `videoDuration` — to gwarantuje, że warunek `effectiveTimeSpent >= requiredTime * threshold` jest spełniony nawet jeśli iOS nie raportuje dokładnie 100% czasu.
- Rozszerzyć istniejący `handleVideoEnded` callback (linia 681) o: `videoPositionRef.current = videoDurationRef.current; setVideoPosition(videoDurationRef.current);`

**D) Przepływ UX po zakończeniu wideo:**
1. Wideo się kończy → przycisk "Zalicz lekcję" automatycznie się aktywuje
2. Ekran auto-scrolluje do przycisku (już zaimplementowane)
3. Użytkownik klika "Zalicz lekcję" → zapis do bazy
4. Przycisk "Następna" staje się aktywny

### Plik 2: `src/components/SecureMedia.tsx`

**E) Emitowanie `ended` callback**
- Dodać nowy prop `onVideoEnded?: () => void` do interfejsu `SecureMediaProps`
- W obsłudze eventu `ended` na elemencie `<video>` wywołać `onVideoEnded?.()`
- W `TrainingModule.tsx` podać `onVideoEnded={handleVideoEnded}` do `<SecureMedia>` — pewniejsze niż nasłuchiwanie na `document`

### Podsumowanie efektu
- Użytkownik ogląda **100% nagrania** → przycisk się aktywuje → klika "Zalicz" → przechodzi dalej
- Brak mylących komunikatów o procentach
- Tolerancja 98% chroni przed edge-case'ami iOS
- `ended` event gwarantuje odblokowanie nawet przy niedokładnym timeupdate
