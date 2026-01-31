
# Plan: Poprawka wyświetlania stref czasowych dla webinarów i spotkań zespołu

## Status: ✅ ZAIMPLEMENTOWANO

## Problem (rozwiązany)

1. **Formularze zapisu wydarzeń** używały `toISOString()` bez `fromZonedTime` - co powodowało że godziny były zapisywane w lokalnej strefie admina zamiast w Europe/Warsaw
2. **Ramka porównania stref** w dialogu szczegółów wydarzeń - teraz poprawnie wyświetla się identycznie jak przy spotkaniach indywidualnych

## Zmiany wprowadzone

### 1. WebinarForm.tsx
- Dodano import `fromZonedTime` z `date-fns-tz`
- Dodano import `DEFAULT_EVENT_TIMEZONE` z `@/utils/timezoneHelpers`
- Przy zapisie czasu: zamieniono `localDate.toISOString()` na `fromZonedTime(localDateTime, DEFAULT_EVENT_TIMEZONE).toISOString()`

### 2. TeamTrainingForm.tsx  
- Dodano import `fromZonedTime` z `date-fns-tz`
- Dodano import `DEFAULT_EVENT_TIMEZONE` z `@/utils/timezoneHelpers`
- Przy zapisie czasu: zamieniono `localDate.toISOString()` na `fromZonedTime(localDateTime, DEFAULT_EVENT_TIMEZONE).toISOString()`

### 3. EventDetailsDialog.tsx (bez zmian - już prawidłowo)
- Główna godzina wydarzenia wyświetlana zawsze: `formatInTimeZone(eventStart, eventTimezone, 'HH:mm')`
- Ramka porównania stref pokazuje się TYLKO gdy `timezonesAreDifferent`
- Format nazwy strefy: nazwa miasta (Warsaw/Hebron) zamiast skrótów

### 4. EventCardCompact.tsx (bez zmian - już prawidłowo)
- Już używa `formatInTimeZone` z `event.timezone || DEFAULT_EVENT_TIMEZONE`

## Rezultat końcowy

Wydarzenie ustawione na **10:00-11:00** przez admina:

**W karcie:**
```
📅 20 stycznia 2026
⏰ 10:00 (CET)          ← STAŁA godzina niezależna od strefy użytkownika
```

**W szczegółach (użytkownik w innej strefie np. Asia/Hebron):**
```
📅 Poniedziałek, 20 stycznia
⏰ 10:00 - 11:00 (60 min)   ← STAŁA godzina wydarzenia

┌────────────────────────────────────────────┐
│ 🌍 Twój czas:      11:00 (Hebron)         │
│ ⏰ Czas wydarzenia: 10:00 (Warsaw)         │
└────────────────────────────────────────────┘
```

## Uwaga dla istniejących wydarzeń

Istniejące wydarzenia, które zostały utworzone przed tą poprawką, mogą nadal mieć nieprawidłowe czasy w bazie danych. Aby je naprawić, admin musi je edytować i ponownie zapisać.
