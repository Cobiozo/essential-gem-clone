## Problem

Okno „Pozycjonowanie zdjęcia" (`ImageUploadInput.tsx`) ma tylko: wybór proporcji (21:9, 16:9, 4:3, …), zoom oraz przesuwanie kadru myszą. Brakuje precyzyjnego pozycjonowania, dlatego trudno trafić w docelowy kadr bannera, który na stronie wydarzenia jest **responsywny** (`16:9` na mobile → `2:1` na tablet → `21:9` na desktop). Innymi słowy: nawet jeśli skadrujesz idealnie pod 16:9, na desktopie i tak część obrazu zostanie ucięta.

## Rozwiązanie — więcej narzędzi pozycjonowania w jednym oknie

### 1. Tryb „Banner wydarzenia" (kluczowy)

Nowy preset/tryb specjalnie dla banerów wydarzeń, który zamiast jednej proporcji pokazuje **trzy nakładki bezpiecznych obszarów** jednocześnie:

- pełny kadr **16:9** (zdjęcie zawsze widoczne na mobile),
- środkowy obszar **2:1** (przycięcie na tablecie),
- środkowy obszar **21:9** (przycięcie na desktopie) — oznaczony jako „strefa zawsze widoczna".

Tylko zawartość w wąskim pasie 21:9 jest gwarantowana na każdym urządzeniu — użytkownik od razu widzi, co przepadnie na większych ekranach i może umieścić logo/napis w bezpiecznej strefie.

### 2. Precyzyjne kontrolki w oknie

- **Zoom**: ręczne pole liczbowe (0.3–3, krok 0.05) obok suwaka + przyciski `−` / `+` / `Reset`.
- **Pozycja X / Y**: dwa suwaki (lewo↔prawo, góra↕dół) z polami liczbowymi w procentach kadru.
- **Obrót**: suwak −180°…+180° z polem stopni i przyciskami `↺ −90°`, `↻ +90°`, `Reset`. (`react-easy-crop` natywnie obsługuje `rotation` — wystarczy przekazać prop.)
- **Lustro**: przyciski `↔ Odbij poziomo` i `↕ Odbij pionowo` (canvas flip w `getCroppedImg`).
- **Wyrównaj do**: 9 przycisków siatki 3×3 (góra-lewo, góra-środek, …) — szybkie pozycjonowanie kadru.
- **Dopasuj**: dwa skróty — `Wypełnij` (cover, domyślne) i `Zmieść` (contain, dodaje pusty pas).

### 3. Drobne usprawnienia UX

- Zwiększenie wysokości obszaru kadrowania z `h-64` na `h-80 md:h-96`, żeby było widać więcej.
- Strzałki klawiatury (←↑↓→) przesuwają kadr o 1px (Shift = 10px) gdy okno jest aktywne.
- Pasek statusu pod cropperem: `Zoom: 1.20 ×  •  Pozycja: 12% × −5%  •  Obrót: 0°`.
- Podgląd „na stronie wydarzenia" pozostaje, ale dodatkowo dostaje **przełącznik urządzenia** (Mobile 16:9 / Tablet 2:1 / Desktop 21:9), żeby zobaczyć każdy wariant osobno bez czekania na resize okna.

### 4. Zachowanie wstecznej kompatybilności

- Wszystkie obecne presety (21:9, 16:9, 4:3, 9:16, 3:4, kwadrat, koło, owale, dowolny) zostają.
- Nowe pola (`rotation`, `flipH`, `flipV`) są opcjonalne — jeśli nie zostaną zmienione, wynik będzie identyczny jak dziś.
- `getCroppedImg` w `src/lib/cropImage.ts` rozszerzony o opcje `rotation`, `flipH`, `flipV`; domyślne zachowanie bez zmian.

## Pliki

- `src/components/partner-page/ImageUploadInput.tsx` — nowe kontrolki, tryb „Banner wydarzenia", trójwarstwowy podgląd, skróty klawiaturowe.
- `src/lib/cropImage.ts` — obsługa rotacji i lustra w canvas (`ctx.translate` + `ctx.rotate` + `ctx.scale`).

## Efekt

Jedno okno daje pełną kontrolę: precyzyjny zoom liczbowy, X/Y w procentach, rotację, lustro, snap do 9 punktów siatki oraz tryb „Banner wydarzenia" pokazujący od razu co zostanie obcięte na desktopie. Wystarczy raz ustawić zdjęcie, żeby na mobile, tablecie i desktopie banner wyglądał tak jak zaplanowane.