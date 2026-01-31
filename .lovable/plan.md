
# Plan: Poprawka wyświetlania stref czasowych dla webinarów i spotkań zespołu

## Problem

1. **W nagłówku karty i widżetach**: Używana jest lokalna funkcja `format()` zamiast `formatInTimeZone()` - to powoduje że godziny są konwertowane do strefy użytkownika
2. **W dialogu szczegółów**: Brakuje głównego wiersza z godziną i durancją gdy strefy są różne - wyświetlamy tylko ramkę porównania
3. **Format strefy czasowej**: Używamy skrótów (CET/GMT) zamiast nazw miast jak w spotkaniach indywidualnych (Warsaw/Hebron)

## Oczekiwane zachowanie (na podstawie screenshota)

```
📅 2 lutego 2026
⏰ 17:00 (60 min)       ← ZAWSZE wyświetlamy stałą godzinę wydarzenia

┌─────────────────────────────────────────────────┐
│ 🌍 Twój czas:      17:00 (Hebron)              │  ← tylko gdy
│ ⏰ Czas wydarzenia: 16:00 (Warsaw)              │  ← strefy różne
└─────────────────────────────────────────────────┘
```

## Zmiany

### 1. EventDetailsDialog.tsx - Poprawka struktury wyświetlania

**Obecna struktura (błędna):**
```typescript
{timezonesAreDifferent ? (
  <ramka z porównaniem stref>  // BEZ głównego wiersza z godziną
) : (
  <godzina z durancją>
)}
```

**Nowa struktura (prawidłowa):**
```typescript
{/* ZAWSZE wyświetlamy stałą godzinę wydarzenia */}
<div className="flex items-center gap-2">
  <Clock className="h-4 w-4 text-muted-foreground" />
  <span>
    {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} ({durationMinutes} min)
  </span>
</div>

{/* Ramka porównania - TYLKO gdy strefy różne */}
{timezonesAreDifferent && (
  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
    <div className="flex items-center gap-2 text-sm">
      <Globe className="h-4 w-4 text-primary" />
      <span className="font-medium">Twój czas:</span>
      <span>{formatInTimeZone(eventStart, userTimezone, 'HH:mm')} ({userCity})</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Czas wydarzenia:</span>
      <span>{formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} ({eventCity})</span>
    </div>
  </div>
)}
```

**Format nazwy strefy** - zmienić z `getTimezoneAbbr(timezone)` na nazwę miasta:
```typescript
// Zamiast: (CET) lub (GMT)
// Na: (Warsaw) lub (Hebron)
const getCityFromTimezone = (tz: string) => tz.split('/')[1]?.replace('_', ' ') || tz;
```

### 2. EventCardCompact.tsx - Poprawka formatowania czasu

**Linie 565 (desktop header):**
```typescript
// Zamienić:
<span>{format(startDate, 'HH:mm')}</span>

// Na:
<span>
  {formatInTimeZone(startDate, event.timezone || DEFAULT_EVENT_TIMEZONE, 'HH:mm')} ({getTimezoneAbbr(event.timezone || DEFAULT_EVENT_TIMEZONE)})
</span>
```

**Linie 599 (mobile view):**
```typescript
// Zamienić:
<span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>

// Na (z opcjonalną ramką porównania gdy strefy różne):
<span>
  {formatInTimeZone(startDate, eventTimezone, 'HH:mm')} - {formatInTimeZone(endDate, eventTimezone, 'HH:mm')} ({getTimezoneAbbr(eventTimezone)})
</span>
```

### 3. CalendarWidget.tsx i MyMeetingsWidget.tsx

Upewnić się że używają `formatInTimeZone` z właściwą strefą wydarzenia (te już powinny być poprawione).

## Podsumowanie zmian

| Komponent | Problem | Rozwiązanie |
|-----------|---------|-------------|
| EventDetailsDialog | Brak głównego wiersza z godziną gdy strefy różne | Dodać stałą godzinę PRZED ramką porównania |
| EventDetailsDialog | Skróty stref (CET/GMT) zamiast miast | Użyć nazwy miasta z timezone (Warsaw/Hebron) |
| EventCardCompact | Używa `format()` zamiast `formatInTimeZone()` | Zamienić na `formatInTimeZone()` z eventTimezone |
| EventCardCompact | Brak sufiksu strefy w nagłówku | Dodać `(CET)` lub `(Warsaw)` |

## Rezultat

Spotkanie utworzone na 10:00-11:00 w Polsce będzie zawsze wyświetlane jako:
- `10:00 - 11:00 (CET)` lub `10:00 (60 min)` w kartach
- W szczegółach: stała godzina `10:00 (60 min)` + ramka porównania gdy użytkownik jest w innej strefie
