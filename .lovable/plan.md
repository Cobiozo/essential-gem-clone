
## Naprawa braku przycisku "Dołącz do spotkania" dla wewnetrznych spotkan

### Zidentyfikowany problem

W **CalendarWidget** (linia 171-182) i czesciowo w **MyMeetingsWidget** (linia 174-207) logika przyciskow dołączenia do spotkania sprawdza TYLKO `zoom_link`. Dla spotkan wewnetrznych (`use_internal_meeting: true`, `meeting_room_id` ustawiony, `zoom_link: null`):

- **CalendarWidget**: Wyswietla jedynie badge "Trwa teraz" BEZ przycisku dolaczenia. Uzytkownik nie ma jak wejsc na spotkanie z poziomu kalendarza.
- **MyMeetingsWidget**: Wyswietla przycisk "Wejdz" ktory otwiera dialog szczegolów -- ale w dialogu przycisk "Dolacz do spotkania" powinien byc widoczny (logika w EventDetailsDialog jest poprawna).

### Plan naprawy

**Plik 1: `src/components/dashboard/widgets/CalendarWidget.tsx`** (linia 171-183)

Zmiana w `getRegistrationButton` -- dodac obsluge spotkan wewnetrznych:

```typescript
// Mozna dolaczyc (15 min przed lub trwa)
if (event.is_registered && isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
  // Spotkanie wewnetrzne z meeting_room_id
  if (event.use_internal_meeting && event.meeting_room_id) {
    return (
      <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
        <a href={`/meeting-room/${event.meeting_room_id}`} target="_blank" rel="noopener noreferrer">
          <Video className="h-3 w-3 mr-1" />
          WEJDZ
        </a>
      </Button>
    );
  }
  // Zoom link
  if (event.zoom_link) {
    return (
      <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
        <a href={event.zoom_link} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3 w-3 mr-1" />
          WEJDZ
        </a>
      </Button>
    );
  }
  return <Badge className="text-xs bg-emerald-600">Trwa teraz</Badge>;
}
```

**Plik 2: `src/components/dashboard/widgets/MyMeetingsWidget.tsx`** (linia 174-207)

Zmiana w `getActionButton` -- dodac obsluge spotkan wewnetrznych PRZED sprawdzeniem zoomUrl:

```typescript
if (isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd)) {
  // Spotkanie wewnetrzne
  if (event.use_internal_meeting && event.meeting_room_id) {
    return (
      <Button size="sm" className="h-6 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium" asChild>
        <a href={`/meeting-room/${event.meeting_room_id}`} target="_blank" rel="noopener noreferrer">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          WEJDZ
        </a>
      </Button>
    );
  }
  // Zoom URL
  if (zoomUrl) { ... istniejacy kod ... }
  // Brak linka - otwórz dialog
  return ( ... istniejacy kod ... );
}
```

### Pliki do modyfikacji
- `src/components/dashboard/widgets/CalendarWidget.tsx` -- dodac warunek `use_internal_meeting` w `getRegistrationButton`
- `src/components/dashboard/widgets/MyMeetingsWidget.tsx` -- dodac warunek `use_internal_meeting` w `getActionButton`

### Efekt
- Przycisk "WEJDZ" z bezposrednim linkiem do `/meeting-room/{id}` pojawi sie zarowno w kalendarzu jak i w widgecie "Moje spotkania" dla spotkan wewnetrznych
- Przycisk bedzie mial pulsujacy czerwony wskaznik (jak w obecnym designie MyMeetingsWidget)
- Nie trzeba juz klikac "Szczegoly" zeby dostac sie do spotkania
