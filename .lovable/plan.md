

# Naprawa: natychmiastowy email z linkiem + poprawka tekstu sukcesu

## Problem 1 — Edge Function ignoruje `isImmediateJoin`

W `supabase/functions/send-webinar-confirmation/index.ts`, linia 370: `if (template)` — gdy szablon `webinar_confirmation` istnieje w bazie, funkcja używa go ZAMIAST specjalnego emaila z linkiem. Logika `isImmediateJoin` jest tylko w bloku `else` (fallback).

### Rozwiązanie
Zmienić kolejność — gdy `isImmediateJoin && isAutoWebinar`, ZAWSZE użyj hardcoded szablonu z linkiem do pokoju, niezależnie od istnienia szablonu w bazie. Szablon DB stosować tylko dla zwykłych webinarów lub auto-webinarów z >15 min do slotu.

```
if (isImmediateJoin && displayRoomLink) {
  // Zawsze hardcoded email z linkiem — ignoruj szablon DB
  subject = '🔴 Dołącz teraz: ...';
  htmlBody = '... z przyciskiem Dołącz ...';
} else if (template) {
  // Standardowy szablon z DB
} else {
  // Fallback
}
```

## Problem 2 — Tekst sukcesu na stronie rejestracji

W `EventGuestRegistration.tsx`, linia 350-360: dla auto-webinarów tekst mówi tylko o najbliższym slocie i zasadach dołączenia, ale nie rozróżnia sytuacji gdy slot jest za ≤15 min (powinien informować o wysłanym emailu z linkiem) vs >15 min.

### Rozwiązanie
Dodać warunek: jeśli `slotDiffMinutes <= 15`, wyświetl: "Sprawdź swoją skrzynkę email — wysłaliśmy Ci link do natychmiastowego dołączenia!" Jeśli >15 min, wyświetl obecny tekst z datą i godziną slotu (bez wzmianki o przypomnieniach 24h/1h, bo auto-webinary ich nie wysyłają).

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `supabase/functions/send-webinar-confirmation/index.ts` | Priorytet `isImmediateJoin` nad szablonem DB |
| `src/pages/EventGuestRegistration.tsx` | Warunkowy tekst sukcesu dla ≤15 min |

