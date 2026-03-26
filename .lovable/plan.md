

# Statystyki oglądania auto-webinaru widoczne przy kontakcie partnera

## Problem
Obecnie tylko admin widzi statystyki gości auto-webinaru. Partner zapraszający gości nie widzi, czy dany gość dołączył, kiedy i jak długo oglądał.

## Rozwiązanie
Rozszerzyć istniejący `ContactEventInfoButton` (przycisk kalendarza przy kontakcie) o dane z `auto_webinar_views`. Dane są już powiązane łańcuchem: `team_contacts.id` → `guest_event_registrations.team_contact_id` → `auto_webinar_views.guest_registration_id`.

## Zakres zmian

### 1. `src/components/team-contacts/ContactEventInfoButton.tsx`
- Przy pobieraniu rejestracji, dodatkowo pobrać powiązane dane z `auto_webinar_views` przez `guest_registration_id`
- Dla każdej rejestracji wyświetlić:
  - Czy gość dołączył (badge Tak/Nie)
  - Kiedy dołączył (`joined_at`)
  - Jak długo oglądał (`watch_duration_seconds` sformatowane jako Xm Ys)
- Dane te pojawią się w istniejącym popoverze, pod każdą rejestrracją

### 2. RLS — sprawdzenie dostępu
- `auto_webinar_views` musi być odczytywalne przez zalogowanych użytkowników (partnerów) — ale TYLKO przez JOIN z ich własnymi kontaktami
- Jeśli brakuje polityki SELECT dla authenticated, dodać ograniczoną politykę RLS

### Schemat danych (bez zmian w bazie)
```text
team_contacts (partner's contact)
  └── guest_event_registrations.team_contact_id
        └── auto_webinar_views.guest_registration_id
              → joined_at, watch_duration_seconds, left_at
```

### UI w popoverze (rozszerzenie)
Każda rejestracja w popoverze będzie wyglądać:
```
Tytuł wydarzenia
12 marca 2026, 14:00         [Zapisano]
  👁 Dołączył: Tak | 14:02 | Oglądał: 23m 15s
```

### Pliki do modyfikacji
| Plik | Zmiana |
|---|---|
| `src/components/team-contacts/ContactEventInfoButton.tsx` | Dodanie query do `auto_webinar_views` + wyświetlanie statystyk |
| Migracja SQL (ewentualnie) | RLS policy na `auto_webinar_views` dla SELECT by authenticated |

