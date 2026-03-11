

# Poprawki w widżecie "Moje spotkania"

## Plik: `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

### Zmiana 1: Dodanie strefy czasowej (CET) do wyświetlanego czasu
Linia 489 — dodać `({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})` po godzinie zakończenia:
```
HH:mm-HH:mm (CET)
```
`getTimezoneAbbr` jest już zaimportowany.

### Zmiana 2: Przeniesienie flagi i "Zaproś" bliżej "Szczegóły"
Linie 487-533 — przenieść blok `InvitationLanguageSelect` + przycisk "Zaproś" z pozycji po czasie (linie 492-509) do wnętrza `div.ml-auto` (linia 530), tuż **przed** `{getActionButton(event)}`. Dzięki temu flaga i zaproś będą bezpośrednio obok przycisku "Szczegóły" po prawej stronie wiersza.

Wynikowa struktura wiersza:
```
[07:00-07:30 (CET)          🇵🇱▾ 👥Zaproś  ⓘSzczegóły]
```

