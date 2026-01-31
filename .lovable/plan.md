
# Plan: Naprawa synchronizacji stref czasowych w spotkaniach indywidualnych

## Problem

Spotkania indywidualne mają błędną obsługę stref czasowych. Gdy lider ustawia dostępność w CET (Polska), a użytkownik z innej strefy czasowej (np. Anglia GMT) rezerwuje spotkanie, dochodzi do rozbieżności godzin.

**Przykład z dzisiejszego dnia:**
- Lider Dawid Kowalczyk ustawił dostępność na 21:00 CET
- Marcin Kipa (Anglia, GMT) zarezerwował "21:00" 
- W kalendarzu lidera pojawiła się godzina 22:00 CET (błąd!)

## Przyczyna techniczna

W pliku `PartnerMeetingBooking.tsx` funkcja `parse()` parsuje czas lidera jako czas lokalny przeglądarki użytkownika rezerwującego, zamiast jako czas w strefie lidera.

```
Lider ustawia: 21:00 CET (Europe/Warsaw)
Marcin w Anglii widzi: 21:00 (powinno być 20:00 GMT)
Zapis do bazy: 21:00 GMT → 22:00 CET (błąd!)
```

## Proponowane rozwiązanie

### Część 1: Naprawa konwersji stref czasowych (krytyczne)

Poprawić logikę w `PartnerMeetingBooking.tsx`:

1. **Wyświetlanie slotów** - użyć `fromZonedTime` do prawidłowej konwersji:
   ```
   Czas lidera (21:00 CET) → UTC → Czas użytkownika (20:00 GMT)
   ```

2. **Zapis spotkania** - konwertować czas lidera do UTC przed zapisem:
   ```
   Czas lidera (21:00 CET) → fromZonedTime(leaderTimezone) → UTC ISO
   ```

### Część 2: Wybór strefy czasowej przez użytkownika

Aby zapobiec przyszłym problemom i dać użytkownikom kontrolę:

**Dla lidera (ustawienia spotkań):**
- Dodać widoczny selektor strefy czasowej w formularzu ustawień
- Zapisywać wybraną strefę w `leader_permissions.timezone`
- Domyślnie: `Europe/Warsaw` lub automatycznie wykryta

**Dla użytkownika rezerwującego:**
- Wyświetlić WIDOCZNĄ informację o strefie czasowej lidera
- Pokazać konwersję czasu: "21:00 u lidera (CET) = 20:00 Twój czas (GMT)"
- Opcjonalnie: selektor własnej strefy czasowej z automatycznym wykryciem

### Część 3: Wizualna prezentacja (opcjonalne)

Na etapie potwierdzenia rezerwacji pokazać:
```
┌─────────────────────────────────────────┐
│  📅 Potwierdzenie rezerwacji            │
│                                         │
│  Czas u lidera:    21:00 CET            │
│  Twój czas:        20:00 GMT            │
│                                         │
│  Partner: Dawid Kowalczyk               │
│  Data: 30 stycznia 2026                 │
└─────────────────────────────────────────┘
```

## Zmiany w plikach

### Plik 1: `src/components/events/PartnerMeetingBooking.tsx`

**Naprawa wyświetlania slotów (funkcja loadAvailableSlots):**
- Zmienić sposób konwersji z czasu lidera do czasu użytkownika
- Użyć `fromZonedTime` do prawidłowej interpretacji czasu lidera

**Naprawa zapisu spotkania (funkcja handleBookMeeting):**
- Użyć `fromZonedTime(leaderTimezone)` zamiast `parse()` dla czasu lidera
- Zapewnić, że czas zapisywany w bazie jest poprawnym UTC

**Dodanie widocznej informacji o strefie:**
- W kroku wyboru godziny pokazać "Godziny lidera (CET)" i "Twój czas (GMT)"
- Na etapie potwierdzenia pokazać obie godziny wyraźnie

### Plik 2: `src/components/events/IndividualMeetingForm.tsx` (opcjonalne)

**Dodanie selektora strefy czasowej dla lidera:**
- Komponent `Select` z popularnymi strefami czasowymi
- Zapisywanie do `leader_permissions.timezone` lub `leader_availability.timezone`

### Plik 3: Migracja bazy danych (opcjonalne)

Dodać kolumnę `timezone` do `leader_permissions` jeśli nie istnieje:
```sql
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Warsaw';
```

## Priorytety implementacji

| Priorytet | Element | Opis |
|-----------|---------|------|
| 🔴 Krytyczny | Naprawa konwersji | Poprawić `parse()` → `fromZonedTime()` |
| 🟡 Ważny | Widoczność stref | Pokazać obie godziny przy rezerwacji |
| 🟢 Opcjonalny | Selektor strefy | Dać liderowi wybór strefy czasowej |

## Korzyści

1. **Poprawna synchronizacja** - spotkania będą zapisywane w prawidłowym czasie UTC
2. **Przejrzystość** - użytkownicy widzą konwersję czasu między strefami
3. **Bezpieczeństwo** - automatyczne wykrywanie strefy z opcją ręcznej zmiany
4. **Zgodność z Google Calendar** - wydarzenia będą się poprawnie synchronizować
