

# Naprawa podgladu certyfikatu - dopasowanie do edytora

## Problem

Poprzednia zmiana dodala mnoznik `fontSize * 0.75` i `yOffset` do podgladu, co spowodowalo:
- Tekst jest za maly (75% oryginalnego rozmiaru)
- Tekst jest przesuniety w dol (dodatkowy yOffset)
- "CERTYFIKAT" (duzy tekst) moze byc przesuniety poza widoczny obszar lub nachodzic na tlo
- Podglad nie odpowiada temu co uzytkownik widzi w edytorze Fabric.js

## Przyczyna

Podglad powinien wiernie odwzorowywac **edytor** (Fabric.js canvas po lewej stronie), a nie wewnetrzna logike PDF. Uzytkownik porownuje edytor z podgladem -- musza wygladac identycznie.

Fabric.js renderuje tekst:
- Rozmiar czcionki: `fontSize` bezposrednio w px (bez mnoznika 0.75)
- Pozycja Y: bezposrednio `y` (bez dodatkowego offsetu)
- textBaseline: `top`

## Rozwiazanie

Cofniecie zmian z poprzedniej poprawki w `CertificatePreview.tsx`:

1. **Usunac mnoznik 0.75** -- uzyc `fontSize` bezposrednio zamiast `fontSize * 0.75`
2. **Usunac yOffset** -- renderowac tekst na pozycji `y` zamiast `y + adjustedFontSize`
3. **Przywrocic lineHeight** -- uzyc `fontSize * 1.2` zamiast `adjustedFontSize * 1.2`
4. **Przywrocic underlineY** -- uzyc `fontSize` zamiast `adjustedFontSize`

## Szczegoly techniczne

W pliku `src/components/admin/CertificatePreview.tsx`:

- Linia 180: usunac `const adjustedFontSize = fontSize * 0.75;`
- Linia 185: zmienic `ctx.font` z `adjustedFontSize` na `fontSize`
- Linia 203: usunac `const yOffset = adjustedFontSize;`
- Linie 208, 213, 235, 241: usunac dodawanie `yOffset` i zamienic `adjustedFontSize` na `fontSize`
- Linia 232: `lineHeight = fontSize * 1.2`

To przywroci renderowanie identyczne z edytorem Fabric.js.

## Plik do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/admin/CertificatePreview.tsx` | Usuniecie mnoznika 0.75, yOffset, przywrocenie fontSize w renderowaniu tekstu |

