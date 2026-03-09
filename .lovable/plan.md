

# Naprawa widoczności auto-webinaru w kalendarzu + zaproszenia partnerów

## Problem 1: Auto-webinar widoczny mimo wyłączenia systemu

Gdy admin wyłącza system auto-webinarów (`is_enabled = false`), powiązane wydarzenie w tabeli `events` pozostaje `is_active = true`. Kalendarz pobiera wszystkie aktywne wydarzenia bez sprawdzania konfiguracji auto-webinaru.

**Rozwiązanie:** W `handleToggleEnabled` w `AutoWebinarManagement.tsx` — synchronizować `events.is_active` z `auto_webinar_config.is_enabled`. Gdy system wyłączany → `events.is_active = false`. Gdy włączany → `events.is_active = true`.

**Plik:** `src/components/admin/AutoWebinarManagement.tsx`
- W `handleToggleEnabled`: po update config, jeśli istnieje `event_id`, zaktualizować `events.is_active` na tę samą wartość co nowy `is_enabled`

## Problem 2: Partnerzy nie mogą zapraszać na auto-webinar

Dwa braki:
1. Wydarzenie tworzone bez `allow_invites: true` — partner nie widzi przycisku kopiowania zaproszenia
2. W `CalendarWidget.tsx` przycisk "Zaproś" jest ograniczony do `event_type === 'webinar'` (linia 526) — trzeba dodać `auto_webinar`
3. W `EventCardCompact.tsx` i `EventCard.tsx` — przycisk zaproszenia sprawdza `allow_invites` ale nie filtruje po typie, więc powinno działać po ustawieniu flagi

**Zmiany:**

| Plik | Zmiana |
|------|--------|
| `AutoWebinarManagement.tsx` | 1) `handleToggleEnabled` — sync `events.is_active` z `is_enabled`; 2) `handleCreateLinkedEvent` — dodać `allow_invites: true` |
| `CalendarWidget.tsx` | Linia 526: rozszerzyć warunek z `event_type === 'webinar'` na `['webinar', 'auto_webinar'].includes(event_type)` |
| Migracja SQL | Update istniejącego wydarzenia auto-webinar: `UPDATE events SET allow_invites = true WHERE event_type = 'auto_webinar'` |

