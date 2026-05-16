# Plan: ulepszenia mapy + widżet pulpitu

## 1) `src/components/admin/UserWorldMap.tsx`

**a) Klasyczna — ciemniejsze kraje**
- `baseFill`: `hsl(var(--muted) / 0.55)` → `hsl(var(--muted-foreground) / 0.35)`
- `baseFill` (dimmed): `0.35` → `hsl(var(--muted-foreground) / 0.2)`
- `stroke`: `hsl(var(--border) / 0.7)` → `hsl(var(--muted-foreground) / 0.7)`
- `strokeWidth` klasyczny: `0.4` → `0.6`
- hover (klasyczny): `hsl(var(--muted-foreground) / 0.25)` → `hsl(var(--muted-foreground) / 0.5)`

**b) Satelitarna — czerwone kropki**
- W `<Marker><circle>` (linie ~510-515) zamiast `fill="hsl(var(--primary))"` użyć warunkowo:
  - satellite → `#ef4444` (czerwony), stroke `#ffffff`
  - classic → bez zmian (`hsl(var(--primary))`, stroke `hsl(var(--background))`)
- To samo w legendzie (linie ~567-574).

**c) Logo w lewym górnym rogu mapy**
- W kontenerze `relative` mapy dodać overlay absolutny `top-3 left-3 z-10`:
  ```tsx
  <div className="absolute top-3 left-3 z-10 flex items-center gap-3 rounded-md bg-background/70 backdrop-blur px-3 py-1.5 border">
    <img src={PURELIFE_LOGO} alt="Pure Life" className="h-6 w-auto" />
    <div className="h-5 w-px bg-border" />
    <img src={EQOLOGY_LOGO} alt="Eqology IBP" className="h-6 w-auto"
         onError={(e) => (e.currentTarget.style.display='none')} />
  </div>
  ```
- `PURELIFE_LOGO` = istniejący URL z `DualBrandHeader` (storage cms-images/logo-1772644418932.png).
- `EQOLOGY_LOGO` = `/lovable-uploads/eqology-ibp-logo.png` (placeholder — użytkownik wgra w kolejnym kroku, `onError` ukrywa do tego czasu).
- Aby logo nie kolidowało z istniejącym tytułem w `CardHeader`, overlay umieścić wewnątrz `relative` wrappera samej mapy (tam gdzie jest legenda i kontrolki zoom), nie w nagłówku karty.

## 2) Nowy widżet pulpitu

**Nowy plik:** `src/components/dashboard/widgets/UserWorldMapWidget.tsx`
- Lekki wrapper renderujący `<UserWorldMap />` w `<Card>` z tytułem „Mapa użytkowników społeczności".
- Wysokość mapy dostosowana (`h-[420px]`), pełna szerokość (`col-span-full`).
- Widoczność: dla wszystkich zalogowanych (bez RLS bloków — komponent już sam pobiera dane).

**Refaktor `UserWorldMap.tsx`:** dodać prop `compact?: boolean` jeśli potrzeba mniejszej wersji (opcjonalne — domyślnie tak jak teraz).

## 3) Wstawienie widżetu na pulpicie

**Plik:** `src/components/dashboard/widgets/DashboardFooterSection.tsx`
- Po sekcji „Cytat - misja" (linia 103), a przed „Zespół Pure Life" (linia 105) — dokładnie w miejscu czerwonej kreski ze screena — wstawić:
  ```tsx
  <Suspense fallback={<div className="h-[420px] rounded-lg bg-muted animate-pulse" />}>
    <UserWorldMapWidget />
  </Suspense>
  ```
- Lazy import na górze pliku.

## 4) Bez zmian / brak regresji

- Dane, projekcje, zoom, klastry, tooltipy, eksport, RLS — bez zmian.
- Tekstura satelitarna (już naprawiona poprzednio) — bez zmian.
- Tryb klasyczny pozostaje domyślny (`localStorage`).
- Nie wymaga migracji DB ani edge functions.

## Weryfikacja

1. `/admin?tab=user-stats` → kraje w klasycznej widocznie ciemniejsze, w satelitarnej kropki czerwone, logo widoczne w lewym górnym rogu mapy.
2. `/dashboard` → przewinąć do stopki, mapa pojawia się między cytatem a sekcją „Zespół Pure Life".
