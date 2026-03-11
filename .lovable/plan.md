

# Naprawa: Natychmiastowy link do spotkania przy rejestracji blisko startu

## Problem

Obecna logika w `send-webinar-confirmation` wysyła natychmiastowy link z Zoom **tylko gdy rejestracja następuje ≤15 minut** przed startem (linia 629). Jeśli ktoś zapisze się np. 30 lub 45 minut przed, nie dostaje linka natychmiast — i może go też nie dostać z CRON-a, bo okna czasowe są wąskie i mogą się nie pokryć.

Dodatkowo okna CRON w `process-pending-notifications` mają luki:
- 15min: 10-20 min
- 1h: 50-70 min  
- **Luka: 20-50 min — brak pokrycia!**

## Plan zmian

### Zmiana 1: Rozszerzyć natychmiastowy link w `send-webinar-confirmation`
Zmienić próg z `≤15 min` na `≤60 min`. Jeśli ktoś rejestruje się na wydarzenie startujące w ciągu godziny, natychmiast dostaje:
- Email potwierdzający (już działa)
- **Dodatkowy email z linkiem Zoom** (obecnie tylko ≤15 min)

Plik: `supabase/functions/send-webinar-confirmation/index.ts` linia 629:
```
// BYŁO: if (minutesUntilStart > 0 && minutesUntilStart <= 15)
// BĘDZIE: if (minutesUntilStart > 0 && minutesUntilStart <= 60)
```

Oraz oznaczyć wszystkie flagi przypomnień jako wysłane, żeby CRON nie duplikował.

### Zmiana 2: Poszerzyć okna CRON w `process-pending-notifications`
Plik: `supabase/functions/process-pending-notifications/index.ts` linie 332-336:
```
// BYŁO:
{ type: "15min", minMinutes: 10, maxMinutes: 20 }
{ type: "1h",    minMinutes: 50, maxMinutes: 70 }
{ type: "2h",    minMinutes: 110, maxMinutes: 130 }

// BĘDZIE (pokrycie bez luk):
{ type: "15min", minMinutes: 5,  maxMinutes: 25 }
{ type: "1h",    minMinutes: 45, maxMinutes: 75 }
{ type: "2h",    minMinutes: 105, maxMinutes: 135 }
{ type: "12h",   minMinutes: 11*60, maxMinutes: 13*60 }
{ type: "24h",   minMinutes: 23*60, maxMinutes: 25*60 }
```

### Zmiana 3: Poszerzyć okna w `send-bulk-webinar-reminders` (`determineReminderType`)
Plik: `supabase/functions/send-bulk-webinar-reminders/index.ts` linie 194-201:
```
// BĘDZIE:
if (minutesUntilStart <= 25 && minutesUntilStart >= 5) return "15min";
if (minutesUntilStart <= 75 && minutesUntilStart >= 45) return "1h";
if (minutesUntilStart <= 135 && minutesUntilStart >= 105) return "2h";
if (minutesUntilStart <= 780 && minutesUntilStart >= 660) return "12h";
if (minutesUntilStart <= 1500 && minutesUntilStart >= 1380) return "24h";
```

Deduplikacja jest zapewniona przez flagi `reminder_*_sent` — szersze okna + częstszy CRON (co 5 min) nie spowodują duplikatów.

## Pliki do edycji
1. `supabase/functions/send-webinar-confirmation/index.ts` — próg 15→60 min
2. `supabase/functions/process-pending-notifications/index.ts` — szersze okna
3. `supabase/functions/send-bulk-webinar-reminders/index.ts` — szersze okna

