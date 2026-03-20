

# Zmniejszenie minimalnego zoomu w cropperze

## Problem
Cropper (`react-easy-crop`) ma `min={1}`, co nie pozwala pomniejszyć obrazu poniżej 100%. Użytkownik chce zmieścić cały obrazek (z ramką/otoczeniem) w obszarze kadrowania.

## Zmiana

### `src/components/partner-page/ImageUploadInput.tsx`
- Zmienić `min` slidera z `1` na `0.3` (lub `0.2`)
- Zmienić `minZoom` w `<Cropper>` z domyślnego `1` na tę samą wartość
- Ustawić domyślny zoom na `1` (bez zmian), ale pozwolić użytkownikowi zjechać niżej

Dotyczy dwóch miejsc:
1. Komponent `<Cropper>` — dodać prop `minZoom={0.3}`
2. `<Slider>` — zmienić `min={0.3}`

