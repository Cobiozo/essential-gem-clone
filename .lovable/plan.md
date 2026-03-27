

# Plan: Blokowanie rejestracji na przeszłe wydarzenia

## Problem
1. **Regularne webinary/szkolenia**: `isPast` już blokuje rejestrację po `end_time`, ale nie sprawdza `is_published` — niepublikowane wydarzenia nadal pozwalają na rejestrację
2. **Auto-webinary**: `isPast` jest zawsze `false` (linia 395: `!isAutoWebinar && ...`). Funkcja `getNextSlot` zawsze znajduje przyszły slot (przenosi na jutro), więc link nigdy nie wygasa. Jeśli auto-webinar zostanie wyłączony (`is_published = false`), formularz nadal się wyświetla
3. **Tytuł na stronie rejestracji**: "Szansa Biznesowa" zamiast "Business Opportunity" — nie zastosowano mapowania kategorii

## Rozwiązanie

### Plik: `src/pages/EventGuestRegistration.tsx`

**A. Dodać sprawdzenie `is_published` dla wszystkich wydarzeń:**
- Po pobraniu eventu, jeśli `is_published === false`, wyświetlić komunikat "Rejestracja jest zamknięta" (tak jak `isPast`)

**B. Dla auto-webinarów — sprawdzić czy kategoria jest aktywna:**
- Po pobraniu `auto_webinar_config`, sprawdzić czy config istnieje i czy event jest opublikowany
- Jeśli nie → blokada rejestracji z komunikatem "To wydarzenie nie jest już dostępne"

**C. Mapowanie tytułu auto-webinara:**
- Jeśli `event_type === 'auto_webinar'`, pobrać `event_category` z `auto_webinar_config` i wyświetlić:
  - `business_opportunity` → "Business Opportunity"
  - `health_conversation` → "Health Conversation"
- Używać tego jako tytułu zamiast `event.title`

### Plik: `src/pages/EventRegistrationBySlug.tsx`

**D. Dodać sprawdzenie `is_published` przy rozwiązywaniu sluga:**
- Rozszerzyć query o `.eq('is_published', true)` lub sprawdzić po pobraniu i wyświetlić błąd "Wydarzenie nie jest dostępne"

### Plik: `src/pages/EventGuestRegistration.tsx` — dodatkowa walidacja

**E. Dla regularnych wydarzeń sprawdzić `end_time` + cutoff:**
- Obecna logika `isPast` i `isAfterCutoff` już to robi — upewnić się że działa poprawnie
- Dodać `is_published` do warunku blokady

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `EventGuestRegistration.tsx` | Blokada niepublikowanych; mapowanie tytułu auto-webinara; pobranie `event_category` |
| `EventRegistrationBySlug.tsx` | Dodać sprawdzenie `is_published` w query |

