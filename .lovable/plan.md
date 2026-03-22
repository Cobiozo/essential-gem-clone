

# Poprawka podglądu + edycja mapowania + nowe typy elementów

## Problem
1. Podgląd (Eye) obcina dół obrazów portretowych — stały aspect-ratio 842:595 nie pasuje do pionowych plików
2. Podgląd jest tylko do odczytu — użytkownik chce edytować mapowanie bezpośrednio z podglądu
3. Brakuje nowych typów elementów: obrazy i kody QR

## Rozwiązanie

### 1. Usunięcie osobnego podglądu — Eye otwiera edytor
Przycisk Eye (podgląd) otworzy ten sam `BpFileMappingEditor` co przycisk Wand2 (mapowanie). Usuwamy komponent `PreviewWithMappings` i osobny dialog podglądu — są zbędne, skoro edytor ma już tryb podglądu (przycisk "Podgląd/Edytuj").

**Zmiana w `BpPageFilesManager.tsx`:**
- Usunąć `PreviewWithMappings`, `previewFile`, `previewMappings` i dialog podglądu
- Przycisk Eye → `setMappingFile(file)` (tak jak Wand2)

### 2. Nowe typy elementów w `BpFileMappingEditor.tsx`

**a) Dodawanie obrazów na canvas:**
- Przycisk "Obraz" w toolbarze → input file → upload do bucketu `landing-images`
- `FabricImage.fromURL(url)` → dodanie do canvas jako element z `_isBpBackground = false`
- Typ w `MappingElement`: `type: 'image'`, z polami `src`, `x`, `y`, `width`, `height`
- W panelu właściwości: rozmiar, pozycja

**b) Kody QR:**
- Instalacja biblioteki `qrcode` (generowanie QR jako data URL)
- Przycisk "Kod QR" → dialog z inputem na treść (URL/tekst) → generacja QR → `FabricImage.fromURL(qrDataUrl)` → dodanie na canvas
- Typ: `type: 'qr_code'`, z polami `qrContent`, `x`, `y`, `width`, `height`
- Obsługa zmiennych w QR: jeśli `qrContent` zawiera `{{eq_id}}` itp., rozwiązywanie w trybie podglądu

**c) Rozszerzenie `MappingElement`:**
```typescript
interface MappingElement {
  id: string;
  type: 'text' | 'image' | 'qr_code';
  content: string;       // tekst lub URL obrazu lub treść QR
  x: number; y: number;
  width?: number; height?: number;
  // pola tekstowe (fontSize, fontFamily, etc.) — tylko dla type='text'
  // pola QR: qrContent — tylko dla type='qr_code'
}
```

**d) Zapis i odczyt:** `collectElements` i `loadMappingElements` rozszerzone o nowe typy — serializacja/deserializacja obrazów i QR jako FabricImage.

### 3. Panel właściwości — adaptacja do typu elementu
- Tekst: obecne opcje (czcionka, rozmiar, kolor, wyrównanie)
- Obraz: szerokość, wysokość, proporcje
- QR: treść kodu, rozmiar

## Pliki do zmiany
- `src/components/admin/BpPageFilesManager.tsx` — usunięcie PreviewWithMappings, uproszczenie Eye
- `src/components/admin/BpFileMappingEditor.tsx` — dodanie obsługi obrazów i QR, rozszerzenie MappingElement

## Zależności
- `qrcode` — do generowania kodów QR (npm install)

