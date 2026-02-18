

# Naprawa zakladek mobilnych w EventsManagement

## Problem

Zakladki na mobile nakladaja sie na siebie -- tekst "Webinary", "Spotkania", "Indywid." itd. jest scisniety i nieczytelny. Obecne rozwiazanie uzywa `min-w-full` co wymusza zmieszczenie wszystkich 7 zakladek w szerokosci ekranu.

## Rozwiazanie

Na mobile: pokazywac **tylko ikony** (bez tekstu) w kompaktowych zakladkach, ktore mieszcza sie w jednym wierszu bez przewijania. Na desktop (`sm+`): pelne etykiety tekstowe w siatce 7-kolumnowej.

## Zmiany

### `src/components/admin/EventsManagement.tsx`

1. **TabsList**: Usunac `min-w-full` i zamienic na `w-full` z `justify-between` na mobile, aby 7 ikon miescilo sie rownomiernie w jednym wierszu
2. **TabsTrigger**: Na mobile ukryc tekst calkowicie (zamiast krotkich etykiet), pokazywac tylko ikony. Dodac `Tooltip` lub `title` atrybut dla dostepnosci
3. **Wrapper div**: Usunac `overflow-x-auto` bo nie bedzie potrzebny -- 7 ikon bez tekstu zmiesci sie w kazdym ekranie

### Szczegoly techniczne

Kazdy TabsTrigger zmieni sie z:
```
<TabsTrigger className="... px-2.5 sm:px-3">
  <Icon />
  <span className="sm:hidden">Skrot</span>
  <span className="hidden sm:inline">Pelna nazwa</span>
</TabsTrigger>
```

Na:
```
<TabsTrigger className="... px-1.5 sm:px-3" title="Pelna nazwa">
  <Icon />
  <span className="hidden sm:inline">Pelna nazwa</span>
</TabsTrigger>
```

Efekt: 7 ikon w jednym wierszu na mobile (po ok. 44px kazda = 308px, miesci sie na 320px+ ekranie), pelne etykiety na desktop.

