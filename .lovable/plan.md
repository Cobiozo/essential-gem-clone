

# Kompaktowy widżet "Moje spotkania" z akordeonem dni

## Zmiana 1: Kompaktowy układ wydarzeń — jeden wiersz
Obecnie tytuł, godzina, akcje i zaproszenie są w osobnych wierszach. Zmiana:
- Tytuł w pierwszym wierszu
- Godzina + flaga/zaproś + szczegóły/wejdź — wszystko w **jednym wierszu** pod tytułem

Linie 460-513: przebudować strukturę elementu wydarzenia:
```
[Tytuł wydarzenia]
[07:00-07:30 (CET)  🇵🇱▾ 👥Zaproś  ⓘSzczegóły]
```

## Zmiana 2: Akordeon dni — tylko jeden dzień rozwinięty
Zamienić `expandedTypes` na `expandedDay` (string | null). Kliknięcie nagłówka dnia rozwija ten dzień i zwija pozostałe.

- Dodać stan: `const [expandedDay, setExpandedDay] = useState<string | null>(() => groupedByDay[0]?.day ?? null)` — domyślnie pierwszy dzień rozwinięty
- Nagłówek dnia (linia 442-444): dodać `onClick` + `cursor-pointer` + ikonę strzałki (ChevronDown/ChevronRight)
- Zawartość dnia (linie 446-532): renderować tylko gdy `expandedDay === day`

## Plik do edycji
`src/components/dashboard/widgets/MyMeetingsWidget.tsx`

