
# Plan: Reorganizacja ustawień spotkań indywidualnych - osobne harmonogramy dla każdego typu

## Cel

Przeprojektowanie formularza ustawień spotkań indywidualnych tak, aby:
- **Spotkania trójstronne** i **Konsultacje dla partnerów** miały osobne harmonogramy dostępności (dni tygodnia i godziny)
- Każdy typ miał własny czas trwania, wyjątki dat i ustawienia
- Nadal działało wzajemne wykluczanie godzin między typami (już zaimplementowane)

---

## Obecny stan

```text
┌─────────────────────────────────────────────────┐
│ Spotkania indywidualne                          │
│ ─────────────────────────────────────────────── │
│ Jeden wspólny harmonogram dla wszystkich typów  │
│                                                 │
│ • Ustawienia wspólne (booking mode, zoom link)  │
│ • Godziny tygodniowe (Pn-Pt 9-17)              │
│ • Wyjątki dat                                   │
│ • Typy spotkań (accordion z tytułem/opisem)     │
└─────────────────────────────────────────────────┘
```

**Problem:** Tabela `leader_availability` nie ma kolumny `meeting_type`, więc wszystkie sloty są wspólne.

---

## Proponowana struktura

```text
┌───────────────────────────────────────────────────────────────────┐
│ Spotkania indywidualne                                            │
├───────────────────────────────────────────────────────────────────┤
│ [Ustawienia] [Historia]                                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Ustawienia wspólne                                          │  │
│ │ • Sposób rezerwacji (wbudowany / Calendly)                 │  │
│ │ • Link do spotkania (Zoom)                                 │  │
│ │ • Google Calendar info                                      │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 👥 Spotkanie trójstronne                          [włączone]│  │
│ │ ──────────────────────────────────────────────────────────  │  │
│ │ • Czas trwania: [30 min ▼]                                  │  │
│ │ • Tytuł, opis, obrazek                                      │  │
│ │                                                             │  │
│ │ [Godziny tygodniowe] [Wyjątki dat]                         │  │
│ │ ┌───────────────────────────────────────┐                  │  │
│ │ │ (Nd) [Pn] (Wt) [Śr] (Cz) (Pt) (Sb)   │                  │  │
│ │ │ Poniedziałek: 09:00 — 12:00          │                  │  │
│ │ │ Środa:        10:00 — 14:00          │                  │  │
│ │ └───────────────────────────────────────┘                  │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 👤 Konsultacje dla partnerów                    [włączone]│  │
│ │ ──────────────────────────────────────────────────────────  │  │
│ │ • Czas trwania: [60 min ▼]                                  │  │
│ │ • Tytuł, opis, obrazek                                      │  │
│ │                                                             │  │
│ │ [Godziny tygodniowe] [Wyjątki dat]                         │  │
│ │ ┌───────────────────────────────────────┐                  │  │
│ │ │ (Nd) (Pn) [Wt] (Śr) [Cz] [Pt] (Sb)   │                  │  │
│ │ │ Wtorek:  14:00 — 18:00               │                  │  │
│ │ │ Czwartek: 14:00 — 18:00              │                  │  │
│ │ │ Piątek:   09:00 — 12:00              │                  │  │
│ │ └───────────────────────────────────────┘                  │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│                                      [Zapisz wszystkie ustawienia]│
└───────────────────────────────────────────────────────────────────┘
```

---

## Zmiany w bazie danych

### Migracja SQL

```sql
-- Dodanie kolumny meeting_type do leader_availability
ALTER TABLE leader_availability 
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'both';

-- Komentarz wyjaśniający
COMMENT ON COLUMN leader_availability.meeting_type IS 
  'Typ spotkania: tripartite, consultation, lub both (dla wstecznej kompatybilności)';

-- Indeks dla szybszego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_leader_availability_meeting_type 
ON leader_availability(meeting_type);
```

**Wartości kolumny `meeting_type`:**
- `tripartite` - harmonogram tylko dla spotkań trójstronnych
- `consultation` - harmonogram tylko dla konsultacji
- `both` - (domyślna) dla istniejących rekordów - działa dla obu typów

---

## Zmiany w komponentach

### 1. Rozszerzenie typów `MeetingTypeSettings`

```typescript
interface MeetingTypeSettings {
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  slot_duration: number;           // NOWE - osobny czas trwania
  weeklySchedule: WeeklySchedule;  // NOWE - osobny harmonogram
  dateExceptions: DateException[]; // NOWE - osobne wyjątki
}
```

### 2. Przebudowa `UnifiedMeetingSettingsForm.tsx`

**Struktura komponentu:**

```typescript
// Ustawienia wspólne
const [zoomLink, setZoomLink] = useState('');
const [bookingMode, setBookingMode] = useState<'internal' | 'external'>('internal');
const [externalCalendlyUrl, setExternalCalendlyUrl] = useState('');

// Ustawienia per typ spotkania (zamiast wspólnego harmonogramu)
const [tripartiteSettings, setTripartiteSettings] = useState<MeetingTypeSettings>({
  title: 'Spotkanie trójstronne',
  description: '',
  image_url: '',
  is_active: true,
  slot_duration: 60,
  weeklySchedule: getDefaultSchedule(),
  dateExceptions: [],
});

const [consultationSettings, setConsultationSettings] = useState<MeetingTypeSettings>({
  title: 'Konsultacje dla partnerów',
  description: '',
  image_url: '',
  is_active: true,
  slot_duration: 60,
  weeklySchedule: getDefaultSchedule(),
  dateExceptions: [],
});
```

### 3. Nowy komponent `MeetingTypeCard`

Reużywalny komponent dla każdego typu spotkania:

```tsx
interface MeetingTypeCardProps {
  type: 'tripartite' | 'consultation';
  settings: MeetingTypeSettings;
  onSettingsChange: (settings: MeetingTypeSettings) => void;
  icon: React.ReactNode;
  title: string;
  color: string;
}

const MeetingTypeCard: React.FC<MeetingTypeCardProps> = ({ ... }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Switch checked={settings.is_active} onCheckedChange={...} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Czas trwania */}
        <Select value={settings.slot_duration.toString()} ... />
        
        {/* Tytuł, opis, obrazek */}
        <Input value={settings.title} ... />
        <Textarea value={settings.description} ... />
        <MediaUpload currentMediaUrl={settings.image_url} ... />
        
        {/* Tabs: Godziny tygodniowe / Wyjątki */}
        <Tabs>
          <TabsContent value="weekly">
            <WorkingHoursScheduler
              initialSchedule={settings.weeklySchedule}
              onScheduleChange={(schedule) => 
                onSettingsChange({...settings, weeklySchedule: schedule})
              }
              slotDuration={settings.slot_duration}
            />
          </TabsContent>
          <TabsContent value="exceptions">
            <DateExceptionsManager
              exceptions={settings.dateExceptions}
              onExceptionsChange={(exceptions) =>
                onSettingsChange({...settings, dateExceptions: exceptions})
              }
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
```

### 4. Aktualizacja logiki zapisu

**Wczytywanie danych:**
```typescript
// Load weekly availability grouped by meeting_type
const { data: weeklyData } = await supabase
  .from('leader_availability')
  .select('day_of_week, start_time, end_time, slot_duration_minutes, meeting_type')
  .eq('leader_user_id', user.id)
  .not('day_of_week', 'is', null)
  .eq('is_active', true);

// Rozdziel na typy
const tripartiteSchedule = buildScheduleFromData(
  weeklyData?.filter(d => d.meeting_type === 'tripartite' || d.meeting_type === 'both')
);
const consultationSchedule = buildScheduleFromData(
  weeklyData?.filter(d => d.meeting_type === 'consultation' || d.meeting_type === 'both')
);
```

**Zapisywanie danych:**
```typescript
// Delete old availability for this user
await supabase
  .from('leader_availability')
  .delete()
  .eq('leader_user_id', user.id)
  .not('day_of_week', 'is', null);

// Insert tripartite schedule
const tripartiteInsertData = buildInsertData(
  tripartiteSettings.weeklySchedule,
  'tripartite',
  tripartiteSettings.slot_duration
);

// Insert consultation schedule
const consultationInsertData = buildInsertData(
  consultationSettings.weeklySchedule,
  'consultation',
  consultationSettings.slot_duration
);

await supabase
  .from('leader_availability')
  .insert([...tripartiteInsertData, ...consultationInsertData]);
```

### 5. Aktualizacja `PartnerMeetingBooking.tsx`

Filtrowanie dostępności według typu spotkania:

```typescript
// Load weekly schedule filtered by meeting type
const { data: weeklyRanges } = await supabase
  .from('leader_availability')
  .select('day_of_week, start_time, end_time, slot_duration_minutes, timezone')
  .eq('leader_user_id', partnerId)
  .eq('day_of_week', dayOfWeek)
  .in('meeting_type', [meetingType === 'tripartite' ? 'tripartite' : 'consultation', 'both'])
  .eq('is_active', true);
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/[timestamp]_add_meeting_type_to_availability.sql` | **NOWY** - dodanie kolumny `meeting_type` |
| `src/integrations/supabase/types.ts` | Automatyczna aktualizacja po migracji |
| `src/components/events/UnifiedMeetingSettingsForm.tsx` | Przebudowa UI z osobnymi harmonogramami per typ |
| `src/components/events/MeetingTypeCard.tsx` | **NOWY** - reużywalny komponent dla typu spotkania |
| `src/components/events/PartnerMeetingBooking.tsx` | Filtrowanie dostępności według `meeting_type` |

---

## Mechanizm wykluczania - bez zmian

Istniejąca logika w `PartnerMeetingBooking.tsx` (linie 259-325) już sprawdza obie typy spotkań:

```typescript
.in('event_type', ['tripartite_meeting', 'partner_consultation'])
```

To zapewnia, że rezerwacja jednego typu blokuje ten sam czas dla drugiego typu. Ta część pozostaje bez zmian.

---

## Korzyści

1. **Elastyczność** - partner może ustawić spotkania trójstronne w poniedziałki i środy, a konsultacje we wtorki i czwartki
2. **Różne czasy trwania** - 30 min dla trójstronnych, 60 min dla konsultacji
3. **Spójność** - nadal działa wzajemne blokowanie czasów
4. **Wsteczna kompatybilność** - istniejące rekordy z `meeting_type = 'both'` działają dla obu typów

---

## Sekcja techniczna

### Migracja bazy danych

```sql
-- Dodanie kolumny meeting_type
ALTER TABLE leader_availability 
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'both';

-- Komentarz
COMMENT ON COLUMN leader_availability.meeting_type IS 
  'Typ spotkania: tripartite, consultation, lub both';

-- Indeks
CREATE INDEX IF NOT EXISTS idx_leader_availability_meeting_type 
ON leader_availability(meeting_type);

-- Dodanie kolumny do date exceptions jeśli potrzebna
ALTER TABLE leader_availability_exceptions
ADD COLUMN IF NOT EXISTS meeting_type text DEFAULT 'both';
```

### Struktura interfejsu MeetingTypeSettings

```typescript
interface MeetingTypeSettings {
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  slot_duration: number;
  weeklySchedule: WeeklySchedule;
  dateExceptions: DateException[];
}
```

### Funkcja budująca dane do inserta

```typescript
const buildInsertData = (
  schedule: WeeklySchedule, 
  meetingType: 'tripartite' | 'consultation',
  slotDuration: number
) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const insertData: any[] = [];
  
  Object.entries(schedule).forEach(([dayStr, daySchedule]) => {
    if (daySchedule.enabled) {
      daySchedule.ranges.forEach(range => {
        insertData.push({
          leader_user_id: user.id,
          day_of_week: parseInt(dayStr),
          specific_date: null,
          start_time: range.start,
          end_time: range.end,
          is_active: true,
          slot_duration_minutes: slotDuration,
          timezone,
          meeting_type: meetingType, // NOWE
        });
      });
    }
  });
  
  return insertData;
};
```

### Zmiana w PartnerMeetingBooking.tsx

**Linie 240-250 - filtrowanie według typu:**
```typescript
// Mapowanie event_type na meeting_type w leader_availability
const availabilityMeetingType = meetingType === 'tripartite' 
  ? 'tripartite' 
  : 'consultation';

const { data: weeklyRanges } = await supabase
  .from('leader_availability')
  .select('day_of_week, start_time, end_time, slot_duration_minutes, timezone')
  .eq('leader_user_id', partnerId)
  .eq('day_of_week', dayOfWeek)
  .in('meeting_type', [availabilityMeetingType, 'both'])  // Filtruj według typu LUB 'both'
  .eq('is_active', true);
```

### Aktualizacja WorkingHoursScheduler

Komponent pozostaje bez zmian - będzie używany dwukrotnie (raz dla każdego typu) z różnymi props.

