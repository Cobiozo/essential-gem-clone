
# Naprawa egzekwowania uprawnien mikrofonu i kamery

## Problem
Prowadzacy wylacza mikrofon i kamere w ustawieniach, ale uczestnicy nadal moga z nich korzystac. Przyczyny:

1. Funkcje `handleToggleMute` i `handleToggleCamera` nie sprawdzaja uprawnien przed wykonaniem - opieraja sie tylko na atrybucie `disabled` na przycisku, ktory jest latwym do ominiecia zabezpieczeniem.

2. Gdy prowadzacy zmienia ustawienia w trakcie spotkania (broadcast `settings-changed`), uczestnicy otrzymuja nowe ustawienia, ale ich juz wlaczony mikrofon i kamera nie sa automatycznie wylaczane.

## Rozwiazanie

### Plik: `src/components/meeting/VideoRoom.tsx`

**Zmiana 1: Dodanie guardu w funkcjach toggle**

Funkcje `handleToggleMute` i `handleToggleCamera` musza sprawdzac uprawnienia:
- Jesli uczestnik nie ma uprawnienia do mikrofonu (`!canMicrophone`) i probuje go wlaczyc (jest wyciszony) - zablokuj
- Jesli uczestnik nie ma uprawnienia do kamery (`!canCamera`) i probuje ja wlaczyc (jest wylaczona) - zablokuj

**Zmiana 2: Wymuszenie wylaczenia przy zmianie ustawien**

W listenerze `settings-changed` (broadcast), po otrzymaniu nowych ustawien, dodatkowo:
- Jesli `allowMicrophone` zmieniono na `false` i uzytkownik nie jest host/co-host: wylacz track audio i ustaw `isMuted = true`
- Jesli `allowCamera` zmieniono na `false` i uzytkownik nie jest host/co-host: wylacz track video i ustaw `isCameraOff = true`

To gwarantuje ze zmiana ustawien natychmiast wplywa na stan uczestnikow - ich mikrofon i kamera zostana wylaczone w momencie gdy prowadzacy zmieni ustawienia.

### Plik: `src/components/meeting/MeetingControls.tsx`

Bez zmian - logika `disabled` na przyciskach juz jest poprawna jako warstwa wizualna. Glowna ochrona bedzie w funkcjach toggle (VideoRoom).

## Podsumowanie

| Plik | Zmiana |
|---|---|
| `VideoRoom.tsx` | Guard w handleToggleMute/handleToggleCamera + wymuszenie wylaczenia w listenerze settings-changed |
