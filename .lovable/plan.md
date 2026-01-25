

# Plan: Kompaktowy układ dwukolumnowy dla ustawień spotkań

## Cel

Przeprojektowanie interfejsu tak, aby oba typy spotkań (Trójstronne i Konsultacje) były widoczne obok siebie na jednym ekranie, co pozwoli na szybsze i łatwiejsze zarządzanie harmonogramami.

---

## Proponowana struktura wizualna

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ 📅 Spotkania indywidualne                    [Ustawienia] [Historia]           │
├────────────────────────────────────────────────────────────────────────────────┤
│ Ustawienia wspólne                                                             │
│ ┌──────────────────────────────┐ ┌──────────────────────────────────────────┐ │
│ │ ● Wbudowany harmonogram      │ │ 🔗 Link do spotkania (Zoom/Meet)         │ │
│ │ ○ Zewnętrzny (Calendly)      │ │ [https://zoom.us/j/...]                  │ │
│ └──────────────────────────────┘ └──────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ ┌───────────────────────────────────┐  ┌───────────────────────────────────┐  │
│ │ 👥 SPOTKANIE TRÓJSTRONNE     [✓] │  │ 👤 KONSULTACJE DLA PARTNERÓW [✓] │  │
│ ├───────────────────────────────────┤  ├───────────────────────────────────┤  │
│ │ ⏱ 60 min ▼                       │  │ ⏱ 30 min ▼                       │  │
│ │                                   │  │                                   │  │
│ │ Tytuł: [Spotkanie trójstronne]   │  │ Tytuł: [Konsultacje dla...]      │  │
│ │ Obrazek: [Upload] [URL] [Bibl.]  │  │ Obrazek: [Upload] [URL] [Bibl.]  │  │
│ │                                   │  │                                   │  │
│ │ [Godziny] [Wyjątki]              │  │ [Godziny] [Wyjątki]              │  │
│ │ ┌─────────────────────────────┐  │  │ ┌─────────────────────────────┐  │  │
│ │ │ Nd Pn Wt Śr Cz Pt Sb       │  │  │ │ Nd Pn Wt Śr Cz Pt Sb       │  │  │
│ │ │    ●     ●                 │  │  │ │       ●     ●  ●           │  │  │
│ │ │                             │  │  │ │                             │  │  │
│ │ │ Pn: 09:00 — 12:00 [+]      │  │  │ │ Wt: 14:00 — 18:00 [+]      │  │  │
│ │ │ Śr: 10:00 — 14:00 [+]      │  │  │ │ Cz: 14:00 — 18:00 [+]      │  │  │
│ │ │                             │  │  │ │ Pt: 09:00 — 12:00 [+]      │  │  │
│ │ │ 📊 2 dni • 60min           │  │  │ │ 📊 3 dni • 30min           │  │  │
│ │ └─────────────────────────────┘  │  │ └─────────────────────────────┘  │  │
│ └───────────────────────────────────┘  └───────────────────────────────────┘  │
│                                                                                │
│                                                    [💾 Zapisz wszystkie]       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Kluczowe zmiany w komponencie `MeetingTypeCard`

### 1. Kompaktowa wersja karty

Stworzenie nowej właściwości `compact` dla komponentu, która:
- Zmniejsza padding i marginesy
- Ukrywa pole "Opis" (textarea) - można je pokazać w tooltipie lub modalu
- Zmniejsza wysokość nagłówków i inputów
- Kompaktuje wizualnie `WorkingHoursScheduler`

### 2. Kompaktowy `WorkingHoursScheduler`

Nowa wersja harmonogramu z mniejszymi elementami:
- Mniejsze kółka dni tygodnia (w-8 h-8 zamiast w-10 h-10)
- Węższe inputy czasu (w-24 zamiast w-28)
- Mniejsza czcionka
- Ukrycie checkboxa "Użyj tych samych godzin" (opcjonalne rozwinięcie)

---

## Zmiany w plikach

### Plik: `src/components/events/MeetingTypeCard.tsx`

Modyfikacje:
- Dodanie props `compact?: boolean`
- Warunkowe ukrywanie pola Opis gdy `compact=true`
- Zmniejszenie paddingu i spacing gdy compact
- Mniejsze nagłówki i ikony

```typescript
interface MeetingTypeCardProps {
  type: 'tripartite' | 'consultation';
  settings: MeetingTypeSettings;
  onSettingsChange: (settings: MeetingTypeSettings) => void;
  icon: React.ReactNode;
  title: string;
  colorClass?: string;
  compact?: boolean;  // NOWE
}
```

### Plik: `src/components/events/WorkingHoursScheduler.tsx`

Modyfikacje:
- Dodanie props `compact?: boolean`
- Mniejsze elementy UI gdy compact
- Ukrycie checkboxa "Użyj tych samych godzin" za collapsible

### Plik: `src/components/events/UnifiedMeetingSettingsForm.tsx`

Modyfikacje:
- Zmiana layoutu z `space-y-4` na `grid grid-cols-1 lg:grid-cols-2 gap-4`
- Przekazanie `compact={true}` do obu `MeetingTypeCard`
- Kompaktowe ustawienia wspólne (jedna linia zamiast dwóch kart)

---

## Sekcja techniczna

### Zmiana w UnifiedMeetingSettingsForm.tsx (linie 547-568)

Obecny kod:
```tsx
{bookingMode === 'internal' && (
  <div className="space-y-4">
    <MeetingTypeCard ... />
    <MeetingTypeCard ... />
  </div>
)}
```

Nowy kod:
```tsx
{bookingMode === 'internal' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <MeetingTypeCard
      type="tripartite"
      title="Spotkanie trójstronne"
      icon={<Users className="h-4 w-4" />}
      colorClass="text-violet-500"
      settings={tripartiteSettings}
      onSettingsChange={setTripartiteSettings}
      compact
    />
    
    <MeetingTypeCard
      type="consultation"
      title="Konsultacje dla partnerów"
      icon={<UserRound className="h-4 w-4" />}
      colorClass="text-fuchsia-500"
      settings={consultationSettings}
      onSettingsChange={setConsultationSettings}
      compact
    />
  </div>
)}
```

### Zmiana w MeetingTypeCard.tsx

```tsx
export const MeetingTypeCard: React.FC<MeetingTypeCardProps> = ({
  type,
  settings,
  onSettingsChange,
  icon,
  title,
  colorClass = 'text-primary',
  compact = false,  // NOWE
}) => {
  return (
    <Card className={cn("border-2", compact && "border")}>
      <CardHeader className={cn("pb-3", compact && "pb-2 px-3 pt-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            compact ? "text-sm" : "text-base"
          )}>
            <span className={colorClass}>{icon}</span>
            {title}
          </CardTitle>
          <Switch
            checked={settings.is_active}
            onCheckedChange={(checked) => updateField('is_active', checked)}
          />
        </div>
      </CardHeader>

      {settings.is_active && (
        <CardContent className={cn("space-y-4", compact && "space-y-3 px-3 pb-3")}>
          {/* Duration - kompaktowe */}
          <div className="flex items-center gap-2">
            <Clock className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
            <Label className={cn("text-sm", compact && "text-xs")}>Czas trwania</Label>
            <Select
              value={settings.slot_duration.toString()}
              onValueChange={(value) => updateField('slot_duration', parseInt(value))}
            >
              <SelectTrigger className={cn("h-9 w-32", compact && "h-7 w-24 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title & Image - w jednej linii */}
          <div className={cn(
            "grid gap-3",
            compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 gap-4"
          )}>
            <div className="space-y-1">
              <Label className={cn("text-sm", compact && "text-xs")}>Tytuł</Label>
              <Input
                value={settings.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Nazwa spotkania"
                className={cn("h-9", compact && "h-7 text-sm")}
              />
            </div>
            <div className="space-y-1">
              <Label className={cn("text-sm", compact && "text-xs")}>Obrazek</Label>
              <MediaUpload
                onMediaUploaded={(url) => updateField('image_url', url)}
                currentMediaUrl={settings.image_url}
                currentMediaType="image"
                allowedTypes={['image']}
                compact
              />
            </div>
          </div>

          {/* Opis - ukryty w trybie compact, pokazany jako collapsible */}
          {!compact && (
            <div className="space-y-1.5">
              <Label className="text-sm">Opis</Label>
              <Textarea ... />
            </div>
          )}

          {/* Schedule Tabs - kompaktowe */}
          <Tabs defaultValue="weekly" className={cn("space-y-3", compact && "space-y-2")}>
            <TabsList className={cn("grid w-full grid-cols-2", compact && "h-8")}>
              <TabsTrigger 
                value="weekly" 
                className={cn("flex items-center gap-2", compact && "text-xs py-1")}
              >
                <Clock className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
                Godziny
              </TabsTrigger>
              <TabsTrigger 
                value="exceptions" 
                className={cn("flex items-center gap-2", compact && "text-xs py-1")}
              >
                <CalendarOff className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
                Wyjątki
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly">
              <WorkingHoursScheduler
                initialSchedule={settings.weeklySchedule}
                onScheduleChange={(schedule) => updateField('weeklySchedule', schedule)}
                slotDuration={settings.slot_duration}
                compact={compact}  // NOWE
              />
            </TabsContent>
            ...
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};
```

### Zmiana w WorkingHoursScheduler.tsx

```tsx
interface WorkingHoursSchedulerProps {
  initialSchedule?: WeeklySchedule;
  onScheduleChange: (schedule: WeeklySchedule) => void;
  slotDuration: number;
  isSaving?: boolean;
  compact?: boolean;  // NOWE
}

export const WorkingHoursScheduler: React.FC<WorkingHoursSchedulerProps> = ({
  initialSchedule,
  onScheduleChange,
  slotDuration,
  isSaving = false,
  compact = false,  // NOWE
}) => {
  // ...

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardHeader className={cn("pb-4", compact && "pb-2 px-0 pt-0")}>
        <CardTitle className={cn(
          "flex items-center gap-2",
          compact ? "text-sm" : "text-lg"
        )}>
          <Clock className={cn("h-5 w-5", compact && "h-4 w-4")} />
          Godziny pracy
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-6", compact && "space-y-3 px-0 pb-0")}>
        {/* Day toggles - mniejsze w trybie compact */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {DAYS_OF_WEEK.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleDay(value)}
              className={cn(
                'rounded-full text-sm font-medium transition-all',
                compact ? 'w-7 h-7 text-xs' : 'w-10 h-10',
                schedule[value].enabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* "Same hours" checkbox - ukryty w compact */}
        {!compact && (
          <div className="flex items-center gap-2">
            <Checkbox ... />
          </div>
        )}

        {/* Day schedules - kompaktowe inputy */}
        <div className={cn("space-y-4", compact && "space-y-2")}>
          {DAYS_OF_WEEK.filter(({ value }) => schedule[value].enabled).map(({ value: dayOfWeek, fullLabel }) => (
            <div key={dayOfWeek} className={cn("space-y-2", compact && "space-y-1")}>
              <Label className={cn("font-medium", compact && "text-xs")}>{fullLabel}</Label>
              {schedule[dayOfWeek].ranges.map((range, rangeIndex) => (
                <div key={rangeIndex} className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={range.start}
                    onChange={(e) => updateTimeRange(dayOfWeek, rangeIndex, 'start', e.target.value)}
                    className={cn("w-28", compact && "w-20 h-7 text-xs")}
                  />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input
                    type="time"
                    value={range.end}
                    onChange={(e) => updateTimeRange(dayOfWeek, rangeIndex, 'end', e.target.value)}
                    className={cn("w-28", compact && "w-20 h-7 text-xs")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => addTimeRange(dayOfWeek)}
                    className={cn("h-8 w-8", compact && "h-6 w-6")}
                  >
                    <Plus className={cn("h-4 w-4", compact && "h-3 w-3")} />
                  </Button>
                  {/* ... remove button ... */}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Summary - kompaktowe */}
        {enabledDaysCount > 0 && (
          <div className={cn(
            "bg-muted/50 rounded-lg p-4 text-sm",
            compact && "p-2 text-xs rounded"
          )}>
            <p className="text-muted-foreground">
              {enabledDaysCount} dni • {slotDuration} min
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## Responsywność

- **Desktop (lg+)**: Dwie kolumny obok siebie
- **Tablet/Mobile**: Jedna kolumna, karty jedna pod drugą

Klasa `grid grid-cols-1 lg:grid-cols-2` zapewnia automatyczne dostosowanie.

---

## Korzyści

1. **Widoczność** - oba typy spotkań widoczne na jednym ekranie
2. **Szybkie porównanie** - łatwe sprawdzenie różnic między typami
3. **Mniej scrollowania** - kompaktowy układ zmniejsza potrzebę przewijania
4. **Zachowana funkcjonalność** - wszystkie opcje nadal dostępne
5. **Responsywność** - na mniejszych ekranach powrót do układu pionowego

