

# Naprawa rozbieznosci podgladu certyfikatu

## Zidentyfikowany problem

Znaleziono **glowna przyczyne** rozbieznosci: funkcja `collectElementsForPreview()` (uzywana do podgladu na zywo) oblicza `width` tekstu inaczej niz funkcja zapisu szablonu (uzywana do generowania PDF).

### Roznica w kodzie:

**Podglad (linia 333):** 
```
width: (textObj as any).originalWidth || (textObj.width || 200) * (textObj.scaleX || 1)
```
Uzywa `originalWidth` - szerokosc ustawiona przy tworzeniu elementu, ktora moze byc inna niz aktualna szerokosc tekstu.

**Zapis/PDF (linia 907):**
```
width: (textObj.width || 200) * (textObj.scaleX || 1)
```
Uzywa aktualnej szerokosci tekstu z Fabric.js.

Ta roznica powoduje ze tekst w podgladzie zawija sie w innych miejscach niz w wygenerowanym PDF, a wyrownanie (centrowanie) jest przesiniete.

## Rozwiazanie

Ujednolicenie obliczania `width` w `collectElementsForPreview()` - uzyc identycznej formuly jak w funkcji zapisu szablonu.

## Plik do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/admin/TemplateDndEditor.tsx` | Linia 333: zmienic `(textObj as any).originalWidth \|\| (textObj.width \|\| 200) * (textObj.scaleX \|\| 1)` na `(textObj.width \|\| 200) * (textObj.scaleX \|\| 1)` - identycznie jak w funkcji zapisu (linia 907) |

## Szczegoly techniczne

Zmiana jednej linii w funkcji `collectElementsForPreview()`:

```typescript
// Przed (zle - uzywa originalWidth):
width: (textObj as any).originalWidth || (textObj.width || 200) * (textObj.scaleX || 1),

// Po (poprawnie - identycznie jak w zapisie/PDF):
width: (textObj.width || 200) * (textObj.scaleX || 1),
```

Dzieki temu podglad bedzie uzywal dokladnie tych samych wymiarow co generator PDF, co wyeliminuje roznice w zawijaniu tekstu i wyrownaniu.

