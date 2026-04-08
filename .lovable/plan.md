

# Plan: Izolacja danych widoków per rejestracja w statystykach admina

## Problem

W `AutoWebinarGuestStats.tsx` widoki (`auto_webinar_views`) są dopasowywane do rejestracji na dwa sposoby:
1. Po `guest_registration_id` — precyzyjnie (ale wiele widoków ma to pole `null`)
2. Po `guest_email` — globalnie, wybierając widok z najdłuższym czasem oglądania

Efekt: Jan Kowalski zarejestrowany na slot 22:00 (8 kwietnia) dostaje przypisany czas oglądania 36m 6s z zupełnie innej sesji (np. z 27 marca). Dane kumulują się zamiast być izolowane per termin.

## Rozwiązanie

Zmienić logikę fallbacku email: zamiast globalnego dopasowania, porównywać timestamp widoku (`joined_at`) z datą i godziną slotu rejestracji. Widok pasuje do rejestracji tylko jeśli `joined_at` mieści się w oknie czasowym slotu (np. -5 min do +120 min od startu slotu).

## Zmiany

### 1. `AutoWebinarGuestStats.tsx` — nowa logika dopasowania widoków

Zamiast dwóch osobnych map (`viewsByRegId` i `viewsByEmail`), stworzyć jedną mapę `viewsByRegId` + listę widoków bez `guest_registration_id` pogrupowanych po emailu. Dopasowanie email-fallback będzie uwzględniać slot_time rejestracji:

```typescript
// Stary kod (linie 118-131):
// Pobiera WSZYSTKIE widoki po emailu i bierze ten z max watch_duration_seconds

// Nowy kod:
// Zamiast globalnego emailowego dopasowania, dopasuj widok do slotu
// na podstawie okna czasowego: joined_at w zakresie slot_date ± okno

const result = registrations.map(r => {
  // 1. Precyzyjne dopasowanie po guest_registration_id
  let view = viewsByRegId.get(r.id);
  
  // 2. Fallback: dopasuj po emailu + oknie czasowym slotu
  if (!view && r.slot_time && r.email) {
    const slotDate = parseSlotToDate(r.slot_time, r.created_at);
    if (slotDate) {
      view = unlinkedViews
        .filter(v => v.guest_email === r.email)
        .filter(v => isWithinSlotWindow(v.joined_at, slotDate))
        .sort((a, b) => (b.watch_duration_seconds || 0) - (a.watch_duration_seconds || 0))[0];
    }
  }
  // ...
});
```

Pomocnicze funkcje:
- `parseSlotToDate(slot_time, created_at)` — parsuje slot (format `YYYY-MM-DD_HH:MM` lub legacy `HH:MM` z datą z `created_at`)
- `isWithinSlotWindow(joined_at, slotDate)` — sprawdza czy `joined_at` mieści się w oknie -5 min do +120 min od slotu

### 2. Pobieranie widoków — dodać `created_at` do selectu email-fallback

Zmienić select na linii 121:
```typescript
.select('guest_email, joined_at, left_at, watch_duration_seconds, created_at')
```

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AutoWebinarGuestStats.tsx` | Nowa logika dopasowania widoków z oknem czasowym slotu |

## Efekt

- Każda rejestracja pokazuje czas oglądania TYLKO z sesji odpowiadającej jej slotowi
- Rejestracja na 22:00 (8 kwietnia) nie dostanie danych z sesji 21:30 (27 marca)
- Widoki z `guest_registration_id` nadal dopasowywane precyzyjnie (bez zmian)
- Widoki bez `guest_registration_id` dopasowywane po emailu + oknie czasowym

