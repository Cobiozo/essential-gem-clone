

# Podgląd miniaturki PDF w kartach plików BP

## Problem
Linia 375-377 w `BpPageFilesManager.tsx` — dla plików nie-obrazowych (w tym PDF) wyświetlana jest tylko generyczna ikona `FileText`. PDF-y nie mają podglądu.

## Rozwiązanie
Dodać komponent miniaturki PDF używający `<canvas>` + biblioteki `pdfjs-dist` (już zainstalowanej w projekcie — używana w `BpFileMappingEditor`). Renderuje pierwszą stronę PDF jako miniaturkę w karcie pliku.

## Zmiana

### Plik: `src/components/admin/BpPageFilesManager.tsx`

1. Dodać helper komponent `PdfThumbnail` — ładuje pierwszą stronę PDF przez `pdfjs-dist` i rysuje ją na `<canvas>` skalowanym do rozmiaru karty.
2. W sekcji thumbnail (linia 367-378) — dodać warunek: jeśli `mime_type === 'application/pdf'` → renderuj `<PdfThumbnail url={file.file_url} />`, w przeciwnym razie ikona `FileText`.

| Plik | Zmiana |
|------|--------|
| `src/components/admin/BpPageFilesManager.tsx` | Dodanie `PdfThumbnail` i warunkowe renderowanie dla PDF |

