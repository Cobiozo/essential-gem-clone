

# Poprawka: wyświetlanie terminu wydarzenia zamiast daty rejestracji

## Problem

Kontakty w zakładce "Z zaproszeń na webinary ogólne" wyświetlają datę rejestracji gościa zamiast faktycznego terminu wydarzenia. Np. gość zarejestrowany 2 kwietnia widzi "02 kwietnia 2026" mimo że wydarzenie jest w innym terminie.

## Przyczyna

W `src/hooks/useTeamContacts.ts` (linia 483-485), pole `event_start_time` w `EventRegistrationInfo` jest ustawiane jako:
```
r.registered_at || event.start_time
```
Dla wydarzeń ogólnych (bez `slot_time`), `registered_at` ma pierwszeństwo nad `event.start_time`, więc wyświetla się data rejestracji zamiast daty wydarzenia.

## Rozwiązanie

Zmienić kolejność fallbacku — dla wydarzeń ogólnych (nie auto-webinarowych), `event.start_time` powinno mieć pierwszeństwo:

```
event_start_time: ((r as any).slot_time && r.registered_at)
  ? `${r.registered_at.substring(0, 10)}T${(r as any).slot_time}:00`
  : event.start_time || r.registered_at || '',
```

To zamienia `r.registered_at || event.start_time` na `event.start_time || r.registered_at` — tak, że rzeczywisty termin wydarzenia jest zawsze preferowany.

### Plik do edycji
| Plik | Zmiana |
|------|--------|
| `src/hooks/useTeamContacts.ts` | Zamiana kolejności fallbacku w linii 485: `event.start_time \|\| r.registered_at` |

