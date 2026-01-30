
# Plan: Rozszerzone wyświetlanie i wybór stref czasowych w panelu potwierdzenia

## Problem

Panel potwierdzenia rezerwacji spotkania nie pokazuje informacji o strefach czasowych, ponieważ:

1. **Warunek ukrycia** - sekcja ze strefami czasowymi jest widoczna TYLKO gdy wykryta strefa czasowa użytkownika różni się od strefy lidera
2. **Brak selektora** - użytkownik nie może ręcznie wybrać swojej strefy czasowej (np. gdy podróżuje lub chce sprawdzić czas dla innej lokalizacji)
3. **Automatyczne wykrywanie** - system używa `Intl.DateTimeFormat().resolvedOptions().timeZone` który zwraca lokalną strefę przeglądarki

**Aktualny warunek (linie 959-973):**
```typescript
{selectedSlot.leaderTimezone && userTimezone !== selectedSlot.leaderTimezone && (
  // Sekcja ze strefami - widoczna TYLKO gdy strefy się różnią
)}
```

## Proponowane rozwiązanie

### Część 1: Zawsze widoczna sekcja stref czasowych

Usunąć warunek `userTimezone !== selectedSlot.leaderTimezone` - sekcja będzie zawsze widoczna gdy istnieje `leaderTimezone`.

**Przed:**
```text
┌───────────────────────────────────────────────────────┐
│  Dawid Kowalczyk                                      │
│  📅 2 lutego 2026                                     │
│  🕐 16:00 (60 min)                                    │
│  📹 Zoom                                              │
│                                                       │
│  [Potwierdź rezerwację]                              │
└───────────────────────────────────────────────────────┘
```

**Po:**
```text
┌───────────────────────────────────────────────────────┐
│  Dawid Kowalczyk                                      │
│  📅 2 lutego 2026                                     │
│  🕐 16:00 (60 min)                                    │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🌍 Strefy czasowe                               │  │
│  │                                                 │  │
│  │ Twoja strefa: [Europe/Warsaw      ▾]           │  │
│  │ Twój czas:    16:00 (Warsaw)                   │  │
│  │                                                 │  │
│  │ Czas lidera:  16:00 (Warsaw) ✓ Te same strefy  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  📹 Zoom                                              │
│  [Potwierdź rezerwację]                              │
└───────────────────────────────────────────────────────┘
```

### Część 2: Selektor strefy czasowej użytkownika

Dodać rozwijany selektor z popularnymi strefami czasowymi, który pozwala użytkownikowi:
- Zobaczyć automatycznie wykrytą strefę (domyślnie)
- Zmienić na inną strefę (np. gdy podróżuje)
- Dynamicznie przeliczać wyświetlany czas

**Lista stref czasowych:**
- Europe/Warsaw (CET) - domyślna dla PL
- Europe/London (GMT)
- Europe/Berlin (CET)
- Europe/Paris (CET)
- America/New_York (EST)
- America/Los_Angeles (PST)
- Asia/Tokyo (JST)
- UTC

### Część 3: Dynamiczne przeliczanie czasu

Gdy użytkownik zmieni swoją strefę czasową:
1. Czas lidera pozostaje stały (np. 16:00 CET)
2. Wyświetlany "Twój czas" jest przeliczany dynamicznie
3. Wizualna informacja gdy strefy są różne vs identyczne

**Przykład różnych stref:**
```text
┌─────────────────────────────────────────────────────┐
│ 🌍 Strefy czasowe                                   │
│                                                     │
│ Twoja strefa: [Europe/London      ▾]               │
│ Twój czas:    15:00 (London)                       │
│                                                     │
│ Czas lidera:  16:00 (Warsaw)                       │
│ ⚠️ Różnica: -1 godzina                             │
└─────────────────────────────────────────────────────┘
```

## Zmiany w plikach

### Plik: `src/components/events/PartnerMeetingBooking.tsx`

**1. Dodać stan do przechowywania wybranej strefy użytkownika (po linii 77):**
```typescript
const [selectedUserTimezone, setSelectedUserTimezone] = useState<string>(
  Intl.DateTimeFormat().resolvedOptions().timeZone
);
```

**2. Dodać listę popularnych stref czasowych:**
```typescript
const TIMEZONE_OPTIONS = [
  { value: 'Europe/Warsaw', label: 'Polska (CET)' },
  { value: 'Europe/London', label: 'Wielka Brytania (GMT)' },
  { value: 'Europe/Berlin', label: 'Niemcy (CET)' },
  { value: 'Europe/Paris', label: 'Francja (CET)' },
  { value: 'America/New_York', label: 'Nowy Jork (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'UTC', label: 'UTC' },
];
```

**3. Dodać funkcję obliczającą przeliczony czas użytkownika:**
```typescript
const calculateUserTime = useMemo(() => {
  if (!selectedSlot?.leaderTime || !selectedSlot?.leaderTimezone) return null;
  
  try {
    const leaderDateTime = parse(
      `${selectedSlot.date} ${selectedSlot.leaderTime}`, 
      'yyyy-MM-dd HH:mm', 
      new Date()
    );
    const utcDateTime = fromZonedTime(leaderDateTime, selectedSlot.leaderTimezone);
    return formatInTimeZone(utcDateTime, selectedUserTimezone, 'HH:mm');
  } catch (e) {
    return selectedSlot.time;
  }
}, [selectedSlot, selectedUserTimezone]);
```

**4. Zamienić warunkową sekcję stref (linie 959-973) na zawsze widoczną:**
```typescript
{selectedSlot.leaderTimezone && (
  <div className="bg-muted/50 rounded-lg p-3 space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium">
      <Globe className="h-4 w-4 text-primary" />
      <span>Strefy czasowe</span>
    </div>
    
    {/* Selektor strefy użytkownika */}
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Twoja strefa:</span>
      <Select value={selectedUserTimezone} onValueChange={setSelectedUserTimezone}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONE_OPTIONS.map(tz => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    
    {/* Wyświetlanie czasów */}
    <div className="flex items-center gap-2 text-sm">
      <Clock className="h-4 w-4 text-primary" />
      <span className="font-medium">Twój czas: {calculateUserTime}</span>
    </div>
    
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Czas lidera: {selectedSlot.leaderTime}</span>
      <span>({selectedSlot.leaderTimezone.split('/')[1]})</span>
    </div>
    
    {selectedUserTimezone === selectedSlot.leaderTimezone && (
      <div className="text-xs text-green-600">✓ Te same strefy czasowe</div>
    )}
    
    {selectedUserTimezone !== selectedSlot.leaderTimezone && (
      <div className="text-xs text-amber-600">⚠️ Różne strefy czasowe</div>
    )}
  </div>
)}
```

## Dodatkowe importy

Dodać import komponentów Select:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| Widoczność sekcji stref | Tylko gdy strefy się różnią | Zawsze widoczna |
| Wybór strefy użytkownika | Brak (automatyczne wykrywanie) | Selektor z popularnymi strefami |
| Przeliczanie czasu | Statyczne | Dynamiczne po zmianie strefy |
| Informacja o różnicy | Brak | Wizualna informacja gdy strefy różne |

## Korzyści

1. **Przejrzystość** - użytkownik zawsze wie, w jakiej strefie czasowej jest ustalony termin
2. **Elastyczność** - możliwość ręcznego ustawienia strefy (dla podróżujących)
3. **Bezpieczeństwo** - dynamiczne przeliczanie zapobiega pomyłkom
4. **Spójność UX** - informacja o strefach zawsze w tym samym miejscu
