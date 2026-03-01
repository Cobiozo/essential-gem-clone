

# Przywrocenie plynnosci wideo z zachowaniem ostrosci krawedzi

## Przyczyna problemu

Ostatnia zmiana ustawila `segmentationIntervalMs: 0`, co oznacza ze segmentacja ML + caly pipeline (contrastMask, erode/dilate, canvas blur, smoothstep, temporal blend) uruchamia sie na KAZDEJ klatce requestAnimationFrame (~60fps). To przeciaza GPU/CPU i powoduje spadek plynnosci.

## Naprawa

### Plik: `src/components/meeting/VideoBackgroundProcessor.ts`

Jedna zmiana — przywrocic throttling segmentacji do 20ms (desktop) i 60ms (mobile):

| Parametr | Przed (v1) | Po ostatniej zmianie | Teraz (fix) |
|----------|-----------|---------------------|-------------|
| segmentationIntervalMs (desktop image) | 40 | 0 | 20 (~50fps) |
| mobileSegmentationIntervalMs | 60 | 60 | 60 (bez zmian) |

20ms daje ~50 segmentacji/s — perceptualnie nieodroznialne od "kazdej klatki", ale GPU ma czas na renderowanie miedzy segmentacjami. Wszystkie poprawki jakosci krawedzi (contrast 8, blur 2px, smoothstep 0.35-0.55, temporal weights) zostaja bez zmian.

## Zakres zmian
- Linia 45: `segmentationIntervalMs: 0` zmieniane na `segmentationIntervalMs: 20`
- Zadne inne pliki ani parametry nie sa modyfikowane

