

# Plan: Wysłanie pełnej sekwencji emaili gościa dla webinaru "TEST"

## Problem
Funkcja `send-webinar-email` obsługuje tylko 4 typy: `confirmation`, `reminder_24h`, `reminder_1h`, `reminder_15min`. Brakuje `reminder_12h` i `reminder_2h`. Aby wysłać pełną sekwencję 6 emaili, trzeba najpierw dodać brakujące typy.

## Zakres zmian

### 1. Rozszerzenie `send-webinar-email` o brakujące typy
- Dodanie `reminder_12h` i `reminder_2h` do interfejsu `WebinarEmailRequest.type`
- Dodanie case'ów w `getTemplateInternalName()` i `getEventTypeKey()`

### 2. Deploy funkcji

### 3. Wysłanie 6 emaili testowych do byk1023@wp.pl

Dane testowe (jutro = 2026-03-18, 20:00):

| # | Typ | Zoom link | Szablon |
|---|-----|-----------|---------|
| 1 | confirmation | brak | webinar_confirmation |
| 2 | reminder_24h | brak | webinar_reminder_24h |
| 3 | reminder_12h | brak | webinar_reminder_12h |
| 4 | reminder_2h | **TAK** | webinar_reminder_2h |
| 5 | reminder_1h | **TAK** | webinar_reminder_1h |
| 6 | reminder_15min | **TAK** | webinar_reminder_15min |

Każdy email: `firstName: "Gość"`, `eventTitle: "TEST"`, `eventDate: "18.03.2026"`, `eventTime: "20:00"`, `hostName: "Zespół Pure Life"`.

## Pliki do zmiany
- `supabase/functions/send-webinar-email/index.ts` — dodanie 2 brakujących typów
- Deploy: `send-webinar-email`

