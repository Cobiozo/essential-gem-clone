
# Plan: Ujednolicenie wyświetlania stref czasowych w webinarach i spotkaniach zespołu

## Cel

Zmienić sposób wyświetlania stref czasowych w webinarach i spotkaniach zespołu, aby wyglądało tak samo jak w spotkaniach indywidualnych (zgodnie ze screenshotem):

```text
🌍 Twój czas:      17:00 (Hebron)
⏰ Czas wydarzenia: 16:00 (Warsaw)
```

Gdzie:
- **Twój czas** - wyświetla się tylko gdy strefa czasowa użytkownika różni się od strefy wydarzenia
- **Czas wydarzenia** - stały czas ustawiony przez admina (zawsze widoczny)

## Obecne zachowanie

Obecnie w `EventDetailsDialog.tsx` wyświetlamy:
```text
⏰ 21:00 - 22:30 (60 min) (CET)    ← główny czas
🌍 Twój czas: 20:00 - 21:30 (GMT)  ← porównanie (gdy różne strefy)
```

## Docelowe zachowanie (jak na screenshocie)

```text
🌍 Twój czas: 20:00 (GMT)         ← najpierw czas użytkownika
⏰ Czas wydarzenia: 21:00 (Warsaw) ← potem czas wydarzenia
```

Pokazujemy oba czasy tylko gdy strefy są różne. Gdy są takie same - pokazujemy tylko jeden czas.

## Zmiany w plikach

### 1. EventDetailsDialog.tsx

Zmienić sekcję wyświetlania czasu w dialogu szczegółów:

**Obecna struktura (linie 154-169):**
```typescript
<div className="flex items-center gap-2">
  <Clock className="h-4 w-4 text-muted-foreground" />
  <span>
    {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} - {formatInTimeZone(eventEnd, eventTimezone, 'HH:mm')} ({durationMinutes} min) ({getTimezoneAbbr(eventTimezone)})
  </span>
</div>

{timezonesAreDifferent && (
  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-xs">
    <Globe className="h-3.5 w-3.5 text-blue-500" />
    <span>
      Twój czas: {formatInTimeZone(eventStart, userTimezone, 'HH:mm')} - {formatInTimeZone(eventEnd, userTimezone, 'HH:mm')} ({getTimezoneAbbr(userTimezone)})
    </span>
  </div>
)}
```

**Nowa struktura (jak na screenshocie):**
```typescript
{/* Sekcja stref czasowych - jak w spotkaniach indywidualnych */}
{timezonesAreDifferent ? (
  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
    <div className="flex items-center gap-2 text-sm">
      <Globe className="h-4 w-4 text-primary" />
      <span className="font-medium">Twój czas:</span>
      <span>
        {formatInTimeZone(eventStart, userTimezone, 'HH:mm')} ({getTimezoneAbbr(userTimezone)})
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Czas wydarzenia:</span>
      <span>
        {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} ({getTimezoneAbbr(eventTimezone)})
      </span>
    </div>
  </div>
) : (
  <div className="flex items-center gap-2">
    <Clock className="h-4 w-4 text-muted-foreground" />
    <span>
      {formatInTimeZone(eventStart, eventTimezone, 'HH:mm')} - {formatInTimeZone(eventEnd, eventTimezone, 'HH:mm')} ({durationMinutes} min)
    </span>
  </div>
)}
```

### 2. EventCardCompact.tsx

Zmienić sekcję czasu w rozwinięciu karty (linie 591-601, mobilna wersja):

**Obecna struktura:**
```typescript
<div className="md:hidden flex items-center gap-4 text-sm text-muted-foreground">
  <div className="flex items-center gap-1">
    <Calendar className="h-4 w-4" />
    <span>{format(startDate, 'PPP', { locale: dateLocale })}</span>
  </div>
  <div className="flex items-center gap-1">
    <Clock className="h-4 w-4" />
    <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
  </div>
</div>
```

**Nowa struktura (z porównaniem stref):**
```typescript
<div className="md:hidden space-y-2">
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    <Calendar className="h-4 w-4" />
    <span>{format(startDate, 'PPP', { locale: dateLocale })}</span>
  </div>
  
  {/* Porównanie stref czasowych jak na screenshocie */}
  {userTimezone !== eventTimezone ? (
    <div className="bg-muted/50 rounded-lg p-2 space-y-1">
      <div className="flex items-center gap-2 text-sm">
        <Globe className="h-4 w-4 text-primary" />
        <span className="font-medium">Twój czas:</span>
        <span>{formatInTimeZone(startDate, userTimezone, 'HH:mm')} ({getTimezoneAbbr(userTimezone)})</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Czas wydarzenia:</span>
        <span>{formatInTimeZone(startDate, eventTimezone, 'HH:mm')} ({getTimezoneAbbr(eventTimezone)})</span>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>{formatInTimeZone(startDate, eventTimezone, 'HH:mm')} - {formatInTimeZone(endDate, eventTimezone, 'HH:mm')}</span>
    </div>
  )}
</div>
```

Dodatkowo w EventCardCompact należy dodać:
- Import `getUserTimezone` z `timezoneHelpers`
- Zmienną `userTimezone` i `eventTimezone` 
- Porównanie stref czasowych w widoku desktopowym (nagłówek karty, linie 558-567)

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `EventDetailsDialog.tsx` | Zamienić sekcję czasu na układ z screenshota: "Twój czas" (Globe) + "Czas wydarzenia" (Clock) w ramce bg-muted/50 |
| `EventCardCompact.tsx` | Dodać porównanie stref w rozwinięciu karty i opcjonalnie w nagłówku mobilnym |

## Wizualny rezultat

Gdy użytkownik z Anglii (GMT) ogląda webinar utworzony w Polsce (CET/Warsaw):

```text
┌────────────────────────────────────────────────────────────────┐
│  📅 Piątek, 30 stycznia                                        │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🌍 Twój czas:      20:00 (GMT)                           │  │
│  │ ⏰ Czas wydarzenia: 21:00 (Warsaw)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  👤 Jan Kowalski                                               │
│  📍 Online                                                     │
└────────────────────────────────────────────────────────────────┘
```

Gdy użytkownik jest w tej samej strefie co wydarzenie:

```text
┌────────────────────────────────────────────────────────────────┐
│  📅 Piątek, 30 stycznia                                        │
│  ⏰ 21:00 - 22:30 (90 min)                                     │
│                                                                │
│  👤 Jan Kowalski                                               │
│  📍 Online                                                     │
└────────────────────────────────────────────────────────────────┘
```
