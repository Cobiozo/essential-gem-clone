

# Optymalizacja rozmiaru PDF certyfikatów (11.9 MB → ~1-2 MB)

## Przyczyna problemu
Certyfikaty mają 11.9 MB, ponieważ:
1. **Obrazy dodawane jako PNG bez kompresji** — linia 326: `doc.addImage(imageData, 'PNG', ...)` — PNG jest bezstratny i ciężki
2. **Brak kompresji/skalowania obrazów** — tło certyfikatu (np. 3000x2000px) jest wstawiane w pełnej rozdzielczości
3. **Fonty DejaVu TTF** (~700KB each) — osadzone w PDF, ale to mniejszy problem

## Rozwiązanie

### Plik: `src/hooks/useCertificateGeneration.ts`

**Zmiana 1**: Zastąpić `loadImageAsBase64` nową wersją, która kompresuje obrazy przed dodaniem do PDF:
- Załadować obraz na Canvas
- Przeskalować do max 1600px szerokości (A4 landscape @150dpi = ~1750px)
- Eksportować jako JPEG z quality 0.75 zamiast PNG
- Zmniejszy rozmiar obrazu z ~10MB na ~200-400KB

**Zmiana 2**: W `doc.addImage()` użyć `'JPEG'` zamiast `'PNG'`

**Zmiana 3**: Włączyć kompresję jsPDF — dodać `compress: true` w opcjach konstruktora:
```text
new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
```

### Szczegóły kompresji obrazów
Nowa funkcja `loadAndCompressImage`:
- Tworzy HTMLCanvasElement
- Skaluje obraz proporcjonalnie do max 1600x1200
- Wywołuje `canvas.toDataURL('image/jpeg', 0.75)`
- Zwraca skompresowany base64

Oczekiwany rezultat: PDF z ~11.9MB spadnie do ~1-2MB.

## Pliki do zmiany
- `src/hooks/useCertificateGeneration.ts` — kompresja obrazów + opcja compress w jsPDF

