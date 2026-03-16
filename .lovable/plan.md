

# Plan: Przycisk "Zaproś" aktywny tylko dla zapisanych użytkowników

## Obecny stan
- Przycisk "Zaproś" / "Zaproś Gościa" pojawia się gdy `allow_invites === true` i wydarzenie jest nadchodzące
- Nie sprawdza czy użytkownik jest zapisany na to wydarzenie
- W `MyMeetingsWidget` problem nie występuje — widżet wyświetla tylko wydarzenia z `is_registered === true`

## Zmiany

### 1. `EventCard.tsx` (linia ~425)

Zmienić warunek przycisku "Zaproś Gościa":
- Jeśli `!isRegistered` → przycisk z `variant="outline"` + `opacity-50` + onClick wyświetla toast: *"Musisz być zapisany/a na to wydarzenie, aby móc zapraszać gości."*
- Jeśli `isRegistered` → obecne zachowanie (kopiuje zaproszenie)

### 2. `EventCardCompact.tsx` (linia ~586)

Identyczna zmiana jak w EventCard — przycisk "Zaproś" nieaktywny wizualnie gdy `!isRegistered`, z komunikatem toast po kliknięciu.

### 3. `MyMeetingsWidget.tsx` — bez zmian

Widżet już filtruje do `is_registered`, więc przycisk zawsze dotyczy zapisanych wydarzeń.

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/events/EventCard.tsx` | Toast zamiast kopiowania gdy niezapisany |
| `src/components/events/EventCardCompact.tsx` | Toast zamiast kopiowania gdy niezapisany |

