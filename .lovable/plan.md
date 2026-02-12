

# Naprawa pobierania obrazow na komputerze

## Problem
Funkcja `shareOrDownloadImage` w `src/lib/imageShareUtils.ts` sprawdza tylko czy przegladarka obsluguje Web Share API (`canUseWebShare()`). Przegladarka Edge na Windowsie obsluguje to API, wiec zamiast okna pobierania wyswietla sie okno "Udostepnij" systemu Windows -- co jest niepozadane na komputerze.

## Przyczyna
Linia 34: `if (canUseWebShare())` -- brak sprawdzenia czy uzytkownik jest na urzadzeniu mobilnym. Web Share API powinno byc uzywane **tylko na telefonach/tabletach**, gdzie pozwala zapisac obraz do galerii.

## Rozwiazanie

### Plik: `src/lib/imageShareUtils.ts`

Zmiana warunku w linii 34 z:
```
if (canUseWebShare())
```
na:
```
if (isMobileDevice() && canUseWebShare())
```

Ta jedna zmiana sprawia, ze:
- **Na komputerze**: zawsze uzywa standardowego pobierania (okno "Zapisz jako...")
- **Na telefonie/tablecie**: nadal uzywa Web Share API (natywny share sheet z opcja "Zapisz do galerii")

### Dodatkowe usprawnienie pobierania na komputerze

Obecny fallback uzywa `<a>` z atrybutem `download`, ale dla obrazow z innej domeny (cross-origin) atrybut `download` moze nie dzialac -- przegladarka otwiera obraz zamiast pobierac. Aby to naprawic, nalezy pobrac obraz jako blob i utworzyc lokalny URL:

```typescript
// Zamiast link.href = imageUrl, pobierz jako blob:
const response = await fetch(imageUrl, { mode: 'cors' });
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = blobUrl;
link.download = fileName;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(blobUrl);
```

To gwarantuje, ze przegladarka otworzy okno pobierania zamiast otwierac obraz w nowej karcie.

### Podsumowanie zmian
- **1 plik**: `src/lib/imageShareUtils.ts`
- Dodanie warunku `isMobileDevice()` przed uzyciem Web Share API
- Zmiana fallbacku na pobieranie przez blob URL (gwarantuje okno "Zapisz jako")

