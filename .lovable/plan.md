

# Poprawka podglądu pliku — pełna strona z nałożonym mapowaniem

## Problem
Aktualny podgląd (`Dialog` z `<img>`) pokazuje tylko surowy obraz bez nałożonych elementów mapowania. Ponadto duże obrazy mogą być ucinane przez ograniczenia dialogu.

## Rozwiązanie

### Zmiana w `BpPageFilesManager.tsx`

1. **Zamiana prostego `previewUrl` na `previewFile: BpFile | null`** — potrzebujemy ID pliku aby pobrać mapowanie.

2. **Dialog podglądu — pełnoekranowy z ScrollArea**:
   - `DialogContent` z klasami `max-w-[95vw] max-h-[95vh]` i wewnętrznym `ScrollArea`
   - Obraz wyświetlany w pełnym rozmiarze (`w-full h-auto`) bez przycinania

3. **Nałożenie elementów mapowania**:
   - Po otwarciu podglądu: zapytanie do `bp_file_mappings` po `file_id` i `page_index=0`
   - Renderowanie elementów jako `<div>` / `<span>` z `position: absolute` nad obrazem (wrapper `relative`)
   - Zmienne rozwiązywane przez `resolveVariablesInText` z `PREVIEW_PROFILE` (tak jak w edytorze)
   - Każdy element pozycjonowany procentowo względem kontenera obrazu (przeliczenie `x/y` z pikseli canvasu na procenty)

4. **Obsługa PDF**: jeśli plik to PDF — analogicznie jak w edytorze, renderowanie strony przez `pdfjs-dist` jako canvas/obraz, z nałożonym mapowaniem.

### Szczegóły techniczne

- Pobranie wymiarów obrazu (`naturalWidth/naturalHeight`) aby przeliczyć absolutne pozycje z Fabric.js na pozycje procentowe w kontenerze podglądu
- Style tekstu: `fontSize`, `fontFamily`, `fontWeight`, `fontStyle`, `color`, `textAlign` — bezpośrednio z `MappingElement`
- Skalowanie `fontSize` proporcjonalnie do wyświetlanego rozmiaru vs rozmiar canvasu (800px w edytorze)

### Plik do zmiany
`src/components/admin/BpPageFilesManager.tsx`

