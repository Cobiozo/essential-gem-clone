

# Ujednolicenie informacji o przypomnieniach

## Problem
Trzy rozbieżności:
1. **Strona rejestracji** mówi o 3 przypomnieniach: 24h, 1h, 15min (brakuje 12h i 2h)
2. **Email potwierdzający** mówi tylko o 1: "24 godziny przed webinarem"
3. **Faktyczny system** wysyła 5 przypomnień: 24h, 12h, 2h, 1h, 15min

## Zmiany

### 1. Strona rejestracji (`src/pages/EventGuestRegistration.tsx`)
Zaktualizować dynamiczną logikę tekstu, aby uwzględniała wszystkie 5 okien:
- `>24h` → "Otrzymasz przypomnienia: 24 godziny, 12 godzin, 2 godziny, 1 godzinę i 15 minut przed webinarem z linkiem do spotkania."
- `>12h` → "Otrzymasz przypomnienia: 12 godzin, 2 godziny, 1 godzinę i 15 minut przed..."
- `>2h` → "Otrzymasz przypomnienia: 2 godziny, 1 godzinę i 15 minut przed..."
- `>1h` → "Otrzymasz przypomnienia: 1 godzinę i 15 minut przed..."
- `≤1h` → "Otrzymasz przypomnienie 15 minut przed..."

### 2. Email potwierdzający (`supabase/functions/send-webinar-confirmation/index.ts`)
Zamienić statyczny tekst `"Otrzymasz przypomnienie 24 godziny przed webinarem"` na listę wszystkich przypomnień:
```
<li>Wyślemy Ci przypomnienia: 24h, 12h, 2h, 1h i 15 min przed webinarem</li>
<li>Link do dołączenia otrzymasz w wiadomościach przypominających</li>
```

### Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/pages/EventGuestRegistration.tsx` | Linie 420-427 — pełna lista okien przypomnień |
| `supabase/functions/send-webinar-confirmation/index.ts` | Linie 558-561 — lista przypomnień w emailu |

