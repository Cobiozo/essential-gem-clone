

# Naprawa logiki danych kontaktów: czas dołączenia, usunięte kontakty, daty wydarzeń

## Problem 1: "Dołączył 22:00" — błędna godzina dołączenia

W `ContactEventInfoButton.tsx` (linia 246) czas `joined_at` z tabeli `auto_webinar_views` jest wyświetlany przez `toLocaleTimeString('pl-PL')` bez podania strefy czasowej. Timestamp w bazie jest w UTC, a przeglądarka interpretuje go lokalnie — ale może wystąpić niespójność jeśli `joined_at` jest zapisywany w innym formacie. Dodatkowo w `ContactExpandedDetails.tsx` nie ma żadnej logiki wyświetlania statystyk obecności — te dane pojawiają się wyłącznie z `ContactEventInfoButton`.

**Fix**: W `ContactEventInfoButton.tsx` — wyświetlać `joined_at` z jawną strefą `Europe/Warsaw`:
```ts
new Date(reg.view_stats.joined_at).toLocaleTimeString('pl-PL', { 
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' 
})
```

## Problem 2: Usunięte kontakty nie powinny być brane pod uwagę

Zapytanie w `useTeamContacts.ts` (linia 420) już filtruje `deleted_at IS NULL`. Sprawdzę czy inne miejsca (np. `ContactEventInfoButton`, `TeamContactHistoryDialog`) mogą przypadkowo włączać usunięte kontakty. Główny hook wydaje się poprawny — kontakty z `deleted_at` nie pojawiają się w grupach.

**Weryfikacja**: Przejrzę `fetchContacts` w `useTeamContacts.ts` żeby upewnić się, że główne zapytanie też filtruje `deleted_at`. Jeśli usunięte kontakty pojawiają się w jakichkolwiek widokach, dodam filtr.

## Problem 3: Nieprawidłowe daty wydarzeń w historii kontaktu

W `TeamContactHistoryDialog.tsx` (linia 71) data wydarzenia pobiera `r.events?.start_time` — to jest **aktualny** `start_time` wydarzenia (po aktualizacji przez admina), nie termin na który gość się zapisał. Dla wydarzeń jednoterminowych z recyclingiem ID, gość zapisany 31.03 widzi datę 09.03 (aktualny `start_time`).

**Fix**: Dodać `slot_time` do selecta i użyć go jako daty:
```ts
// TeamContactHistoryDialog.tsx linia 57
.select('id, registered_at, source, status, event_id, slot_time, events(title, start_time)')

// Linia 71: użyć slot_time lub registered_at zamiast events.start_time
event_date: r.slot_time || r.registered_at || r.events?.start_time || '',
```

Tę samą poprawkę zastosować w `useTeamContacts.ts` (linia 417/483):
```ts
// Dodać slot_time do selecta
.select('team_contact_id, event_id, ..., slot_time, events(title, start_time)')

// Linia 483: użyć slot_time lub registered_at zamiast event.start_time  
event_start_time: r.slot_time || r.registered_at || event.start_time || '',
```

I w `ContactEventInfoButton.tsx` (linia 164):
```ts
event_date: r.slot_time || r.registered_at || r.events?.start_time || '',
```

## Pliki do edycji

1. **`src/components/team-contacts/ContactEventInfoButton.tsx`** — timezone fix na `joined_at`, użycie `slot_time` jako daty
2. **`src/components/team-contacts/TeamContactHistoryDialog.tsx`** — dodanie `slot_time` do selecta, użycie go jako daty wydarzenia
3. **`src/hooks/useTeamContacts.ts`** — dodanie `slot_time` do selecta, użycie go jako `event_start_time`

## Efekt

- Godzina "Dołączył" będzie poprawna (strefa Warsaw)
- Historia kontaktu pokaże faktyczną datę terminu rejestracji (np. 31.03) zamiast aktualnego `start_time` wydarzenia (np. 09.03)
- Usunięte kontakty pozostają niewidoczne (istniejące filtrowanie działa poprawnie)
- Żadne inne funkcjonalności nie są naruszone — zmiany dotyczą wyłącznie wyświetlania dat i timezone

