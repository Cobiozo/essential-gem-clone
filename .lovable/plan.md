## Problem

Pasek `Header` V1 pokazuje się w edytorze `/admin/homepage`, mimo że w edytorze `LandingV2` jest wołany z `editable`. Screenshot to potwierdza (ciemny pasek "PURE LIFE CENTER … Menu" na górze canvasa edytora).

## Przyczyna (potwierdzona odczytem kodu)

W `src/components/landing-v2/LandingV2.tsx` linia 577:

```tsx
<LandingV2Inner content={content} />
```

Wrapper `LandingV2` przyjmuje `editable`, przekazuje je do `EditProvider`, **ale nie przekazuje do `LandingV2Inner`**. W efekcie w `LandingV2Inner` prop `editable` zawsze przyjmuje domyślne `false` (linia 165), więc warunek `{!editable && <Header ... />}` (linia 193) zawsze renderuje `Header` — również w edytorze.

## Fix

Jedna linia w `src/components/landing-v2/LandingV2.tsx`:

```tsx
<LandingV2Inner content={content} editable={editable} />
```

Dzięki temu:
- Publiczna V2 (`/` bez `editable`) → `Header` widoczny (jak w V1) — bez zmian.
- Edytor `/admin/homepage` (`editable`) → `Header` ukryty.

## Weryfikacja

1. `tsgo` — typecheck.
2. Otworzyć `/admin/homepage` i potwierdzić, że nad canvasem nie ma paska "PURE LIFE CENTER".
3. Otworzyć publiczną `/?variant=v2` (niezalogowany) i potwierdzić, że pasek nadal jest na górze strony.
