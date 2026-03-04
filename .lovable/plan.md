

## Plan: Wyświetlanie godziny przypomnienia w widoku rozwiniętym

### Problem
W `TeamContactAccordion.tsx` linia 385 wyświetla `reminder_date` za pomocą `formatDate()`, który pokazuje tylko datę (`toLocaleDateString`). Godzina jest pomijana.

### Zmiana
W `src/components/team-contacts/TeamContactAccordion.tsx`, linia 385 — zamienić `formatDate(contact.reminder_date)` na `toLocaleString` z godziną i minutą w strefie Warsaw:

```tsx
// Przed:
{formatDate(contact.reminder_date)}

// Po:
{new Date(contact.reminder_date).toLocaleString('pl-PL', { 
  timeZone: 'Europe/Warsaw', 
  day: '2-digit', month: '2-digit', year: 'numeric', 
  hour: '2-digit', minute: '2-digit' 
})}
```

Wynik: "Przypomnienie: 04.03.2026, 13:30" zamiast "Przypomnienie: 4.03.2026".

Zakres: 1 linia w 1 pliku.

