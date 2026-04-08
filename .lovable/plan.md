

# Plan: Izolacja kontaktów per rejestracja — brak mieszania danych między terminami

## Problem

Gdy gość rejestruje się na różne terminy tego samego auto-webinaru, system pobiera wiadomości czatowe (`auto_webinar_guest_messages`) **tylko po emailu** — bez filtrowania po konkretnej rejestracji. Efekt: gość zarejestrowany na 22:00 widzi wiadomości z czatu innego terminu, który jeszcze się nie rozpoczął.

## Rozwiązanie

Powiązać wiadomości czatowe z konkretną rejestracją (`guest_registration_id`), a nie globalnie z emailem.

## Zmiany

### 1. Dodać `registration_id` do `EventRegistrationInfo` (types.ts)

Rozszerzyć interfejs o pole `registration_id: string`, aby ID rejestracji było dostępne w komponentach.

### 2. Przekazać `id` rejestracji w `useTeamContacts.ts`

W `fetchEventContactIds` — dodać `id` do selectu z `guest_event_registrations` (linia 417) i zapisać je w obiekcie `EventRegistrationInfo`:
```typescript
const info: EventRegistrationInfo = {
  registration_id: r.id,  // <-- nowe pole
  event_id: r.event_id,
  // ... reszta bez zmian
};
```

### 3. Filtrować wiadomości po `guest_registration_id` (ContactExpandedDetails.tsx)

Zamiast `.eq('guest_email', contact.email)`, użyć `registration_id` z props:
```typescript
// Jeśli mamy registration_id → filtruj precyzyjnie
if (registrationInfo?.registration_id) {
  query = query.eq('guest_registration_id', registrationInfo.registration_id);
} else {
  // Fallback dla kontaktów bez rejestracji
  query = query.eq('guest_email', contact.email.trim().toLowerCase());
}
```

To zagwarantuje, że wiadomości czatowe będą pokazywane **tylko** dla konkretnego terminu/rejestracji.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/types.ts` | Dodanie `registration_id` do `EventRegistrationInfo` |
| `src/hooks/useTeamContacts.ts` | Dodanie `id` do selectu i mapowania |
| `src/components/team-contacts/ContactExpandedDetails.tsx` | Filtrowanie wiadomości po `guest_registration_id` |

