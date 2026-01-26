

# Plan naprawy wyświetlania okładek w "Zdrowa Wiedza"

## Zidentyfikowany problem

Okładki są **obcinane z lewej i prawej strony** ponieważ:
- Kontener ma proporcje `aspect-[4/3]` (1.33:1)
- Okładki wideo mają proporcje 16:9 (1.77:1)
- Klasa `object-cover` dopasowuje obraz do kontenera, obcinając boki

Na screenshocie widać, że tekst "WSPARCIE KONCENTRACJI..." oraz "JAK ZATRZYMAĆ INSULINOOPORNOŚĆ?" są ucięte - nie widać początku tekstu po lewej stronie.

## Rozwiązanie

Zmiana proporcji kontenera z `aspect-[4/3]` na `aspect-video` (16:9) aby pasował do proporcji okładek wideo, co pozwoli wyświetlić cały obraz bez obcinania.

**Plik:** `src/pages/HealthyKnowledge.tsx`

**Zmiana (linia 245):**

Przed:
```tsx
<div className="relative aspect-[4/3] bg-muted overflow-hidden">
```

Po:
```tsx
<div className="relative aspect-video bg-muted overflow-hidden">
```

## Efekt

| Przed | Po |
|-------|-----|
| Proporcja 4:3 (1.33:1) | Proporcja 16:9 (1.77:1) |
| Obcina boki okładek 16:9 | Wyświetla całe okładki 16:9 |
| Tekst na okładkach niewidoczny | Cały tekst widoczny |

Ta prosta zmiana sprawi, że okładki wideo będą wyświetlane w całości bez obcinania.

