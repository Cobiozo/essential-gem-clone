
# Plan: Klikalna legenda kalendarza z dynamicznym filtrowaniem

## Cel

Legenda pod kalendarzem ma stać się interaktywna - kliknięcie na dany typ wydarzenia (np. "Webinar") powoduje wyświetlenie na kalendarzu TYLKO kropek dla tego typu wydarzeń. Ponowne kliknięcie wyłącza filtr (pokazuje wszystkie typy).

## Aktualny stan

W pliku `CalendarWidget.tsx` (linie 260-278) legenda jest statyczna:

```tsx
<div className="flex flex-wrap gap-3 pt-2 border-t">
  <div className="flex items-center gap-1.5 text-xs">
    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
    <span className="text-muted-foreground">Webinar</span>
  </div>
  <!-- ... pozostałe typy -->
</div>
```

## Rozwiązanie

### 1. Nowy stan dla aktywnego filtra

Dodać stan `activeFilter` który przechowuje aktualnie wybrany typ wydarzenia (lub `null` gdy pokazujemy wszystkie):

```typescript
const [activeFilter, setActiveFilter] = useState<string | null>(null);
```

### 2. Konfiguracja legendy jako tablica

Zamienić statyczny JSX na mapę obiektów dla łatwiejszego zarządzania:

```typescript
const legendItems = [
  { type: 'webinar', color: 'bg-blue-500', label: 'Webinar' },
  { type: 'team_training', color: 'bg-green-500', label: 'Spotkanie zespołu' },
  { type: 'tripartite_meeting', color: 'bg-violet-500', label: 'Spotkanie trójstronne' },
  { type: 'partner_consultation', color: 'bg-fuchsia-500', label: 'Konsultacje' }
];
```

### 3. Filtrowanie wydarzeń

Dodać `useMemo` który filtruje wydarzenia na podstawie `activeFilter`:

```typescript
const filteredEvents = useMemo(() => {
  if (!activeFilter) return expandedEvents;
  return expandedEvents.filter(event => {
    if (activeFilter === 'team_training') {
      return event.event_type === 'team_training' || event.event_type === 'meeting_public';
    }
    return event.event_type === activeFilter;
  });
}, [expandedEvents, activeFilter]);
```

### 4. Modyfikacja funkcji `getEventsForDay`

Użyć `filteredEvents` zamiast `expandedEvents`:

```typescript
const getEventsForDay = (day: Date) => {
  return filteredEvents.filter(event => 
    isSameDay(new Date(event.start_time), day)
  );
};
```

### 5. Interaktywna legenda

Zamienić statyczne `<div>` na klikalne przyciski z efektem wizualnym:

```tsx
{legendItems.map((item) => (
  <button
    key={item.type}
    onClick={() => setActiveFilter(
      activeFilter === item.type ? null : item.type
    )}
    className={cn(
      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors cursor-pointer",
      activeFilter === item.type 
        ? "bg-muted ring-2 ring-primary" 
        : "hover:bg-muted/50",
      activeFilter && activeFilter !== item.type && "opacity-40"
    )}
  >
    <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
    <span className={cn(
      activeFilter === item.type ? "text-foreground font-medium" : "text-muted-foreground"
    )}>
      {item.label}
    </span>
  </button>
))}
```

### 6. Aktualizacja wybranych wydarzeń dnia

Gdy aktywny jest filtr i użytkownik kliknie dzień, pokazać tylko przefiltrowane wydarzenia:

```typescript
// W handleDayClick
const handleDayClick = (day: Date) => {
  setSelectedDate(day);
  setSelectedDayEvents(getEventsForDay(day));
};

// W useEffect - synchronizacja przy zmianie filtra
useEffect(() => {
  if (selectedDate) {
    setSelectedDayEvents(getEventsForDay(selectedDate));
  }
}, [filteredEvents, selectedDate, activeFilter]);
```

## Zmiany w pliku

**Plik: `src/components/dashboard/widgets/CalendarWidget.tsx`**

| Sekcja | Zmiana |
|--------|--------|
| Linia ~24 | Dodanie `const [activeFilter, setActiveFilter] = useState<string \| null>(null)` |
| Linia ~53-55 | Dodanie `filteredEvents` z `useMemo` |
| Linia ~58-65 | Dodanie `activeFilter` do zależności useEffect |
| Linia ~74-78 | Modyfikacja `getEventsForDay` aby używała `filteredEvents` |
| Linia ~260-278 | Zamiana statycznej legendy na interaktywne przyciski |

## Wizualne efekty

| Stan | Wygląd elementu legendy |
|------|-------------------------|
| Brak filtra | Wszystkie elementy normalne |
| Aktywny filtr | Wybrany element: tło + obramowanie, pogrubiony tekst |
| Nieaktywny przy aktywnym filtrze | Przygaszony (opacity-40) |

## Sekcja techniczna

### Pełna definicja legendItems

```typescript
const legendItems = [
  { 
    type: 'webinar', 
    color: 'bg-blue-500', 
    label: t('events.types.webinar') || 'Webinar'
  },
  { 
    type: 'team_training', 
    color: 'bg-green-500', 
    label: t('events.types.teamTraining') || 'Spotkanie zespołu'
  },
  { 
    type: 'tripartite_meeting', 
    color: 'bg-violet-500', 
    label: t('events.types.tripartiteMeeting') || 'Spotkanie trójstronne'
  },
  { 
    type: 'partner_consultation', 
    color: 'bg-fuchsia-500', 
    label: t('events.types.consultation') || 'Konsultacje'
  }
];
```

### Logika toggle filtra

```typescript
const handleLegendClick = (type: string) => {
  setActiveFilter(prev => prev === type ? null : type);
};
```

Kliknięcie tego samego typu ponownie → wyłączenie filtra (powrót do wszystkich).

### Mapowanie typów (dla "Spotkanie zespołu")

`team_training` i `meeting_public` są traktowane jako ten sam typ w legendzie (zielona kropka), więc filtr `team_training` obejmuje oba:

```typescript
if (activeFilter === 'team_training') {
  return event.event_type === 'team_training' || event.event_type === 'meeting_public';
}
```
