

# Naprawa paska informacyjnego - pelna szerokosc i plynna animacja

## Problem

1. **Tresc nie zaczyna sie od poczatku paska** - elementy maja `mx-6` (duzy margines), a kontener uzywa `absolute left-0` bez wypelnienia calej szerokosci
2. **Animacja marquee nie jest plynna** - tekst powinien wchodzic od prawej krawedzi i plynnie przechodzic w lewo, a nie zaczynac od srodka
3. **Efekty wizualne (mruganie, pulsowanie)** - sa juz zaimplementowane w kodzie (`blink`, `pulse`, `glow`), ale warto upewnic sie ze dzialaja poprawnie

## Zmiany

### 1. `src/components/news-ticker/NewsTicker.tsx` - MarqueeContent

- Zmiana layoutu marquee: tekst startuje od prawej krawedzi kontenera (`translateX(100%)` na poczatku) i plynnie przesuwa sie w lewo az zniknie za lewa krawedzia
- Alternatywnie: klasyczny marquee z dwoma kopiami - tekst wypelnia cala szerokosc od lewej, a duplikat zapewnia ciaglosc
- Usunac `absolute` positioning - zastapic pelnym kontenerem flex z overflow-hidden
- Kontener marquee powinien miec `w-full` aby wykorzystac cala szerokosc

### 2. `src/components/news-ticker/TickerItem.tsx`

- Zmniejszyc `mx-6` na `mx-3` lub `mx-4` aby elementy byly blizej siebie i lepiej wypelnialy pasek
- Dodac separator (np. kropke lub kreske) miedzy elementami dla lepszej czytelnosci

### 3. `tailwind.config.ts` - animacja marquee

- Upewnic sie ze keyframes marquee sa poprawne: `translateX(0)` -> `translateX(-50%)` (dla podwojonej tresci)
- Ewentualnie dodac wariant animacji startujacy od prawej krawedzi

### 4. Efekty wizualne - weryfikacja

Efekty `blink`, `pulse`, `glow` sa juz zdefiniowane w tailwind.config.ts i uzywane w TickerItem.tsx. Upewnie sie ze:
- Animacja `blink` jest widoczna (3 cykle)
- Animacja `glow` daje wyrazny efekt swiecenia
- Animacja `pulse` dziala plynnie
- Efekty sa widoczne rowniez podczas scrollowania marquee

## Techniczne szczegoly

Nowa struktura MarqueeContent:
```text
<div class="w-full overflow-hidden">         // kontener na cala szerokosc
  <div class="flex animate-marquee">         // animowany pasek
    [items...] [items...]                     // podwojena tresc dla ciaglosci
  </div>
</div>
```

Kluczowe zmiany CSS:
- Usunac `relative` + `absolute` + `h-6` na rzecz flexbox overflow-hidden
- Elementy zaczynaja sie od lewej krawedzi (brak poczatkowego przesuniecia)
- Plynna petla: podwojena tresc + translateX(-50%) = ciagly scroll bez przerw

