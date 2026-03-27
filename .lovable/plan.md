

# Fix: auto-webinary nie powinny wymagać `is_published`

## Problem
Oba wydarzenia auto-webinarowe (BO i HC) mają `is_published = false` w bazie. Kod w `EventRegistrationBySlug.tsx` (linia 54) blokuje dostęp do każdego nieopublikowanego wydarzenia komunikatem "To wydarzenie nie jest już dostępne."

Flaga `is_published` ma sens dla zwykłych webinarów tworzonych przez admina, ale auto-webinary mają własny mechanizm kontroli dostępności: `auto_webinar_config.is_enabled`.

## Rozwiązanie
Dla wydarzeń typu `auto_webinar` pomijać sprawdzanie `is_published` i zamiast tego sprawdzać `auto_webinar_config.is_enabled`.

### Zmiany w pliku `src/pages/EventRegistrationBySlug.tsx`
- Linia 54: zamiast bezwarunkowego blokowania nieopublikowanych wydarzeń, dodać wyjątek dla `event_type === 'auto_webinar'`
- Dla auto-webinarów: pobrać `auto_webinar_config` po `event_id` i sprawdzić `is_enabled`
- Jeśli `is_enabled = false` → blokada z komunikatem
- Jeśli `is_enabled = true` (lub brak configa) → przepuścić dalej

### Zmiany w pliku `src/pages/EventGuestRegistration.tsx`
- Analogiczna logika: jeśli `event_type === 'auto_webinar'`, nie sprawdzać `is_published`, tylko `auto_webinar_config.is_enabled`

### Migracja SQL
- Ustawić `is_published = true` dla obu wydarzeń auto-webinarowych (BO i HC), żeby uniknąć problemów w innych miejscach kodu które mogą sprawdzać tę flagę

| Plik | Zmiana |
|------|--------|
| `EventRegistrationBySlug.tsx` | Dla auto_webinar: sprawdzać `is_enabled` zamiast `is_published` |
| `EventGuestRegistration.tsx` | Analogiczna zmiana |
| Migracja SQL | `UPDATE events SET is_published = true WHERE event_type = 'auto_webinar'` |

