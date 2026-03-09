

# Naprawa: usunięcie kontaktu powinno anulować rejestrację gościa

## Problem

Gdy użytkownik usuwa kontakt prywatny (CRM) powiązany z rejestracją gościa na wydarzenie, rejestracja w `guest_event_registrations` pozostaje ze statusem `registered`. Gdy gość próbuje się ponownie zarejestrować, sprawdzenie duplikatów w `EventGuestRegistration.tsx` (linia 203-210) znajduje aktywną rejestrację i blokuje — bez emaila, bez kontaktu.

## Rozwiązanie

### 1. `useTeamContacts.ts` → `deleteContact` — anuluj powiązane rejestracje gości

Przy soft-delete kontaktu (is_active: false), sprawdzić czy kontakt ma powiązane rejestracje gości (`guest_event_registrations.team_contact_id = id`). Jeśli tak — ustawić ich status na `cancelled` i `cancelled_at = now()`.

```typescript
// Before soft-deleting the contact, cancel linked guest registrations
await supabase
  .from('guest_event_registrations')
  .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
  .eq('team_contact_id', id)
  .eq('status', 'registered');
```

### 2. Admin panel — `EventRegistrationsManagement.tsx` → handleUpdateGuestStatus

Gdy admin zmienia status gościa na `cancelled`, również deaktywować powiązany kontakt prywatny (jeśli istnieje):

```typescript
if (newStatus === 'cancelled') {
  // Also deactivate linked team_contact
  const reg = guestRegistrations.find(r => r.id === registrationId);
  if (reg?.team_contact_id) {
    await supabase.from('team_contacts')
      .update({ is_active: false })
      .eq('id', reg.team_contact_id);
  }
}
```

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/hooks/useTeamContacts.ts` | W `deleteContact` — anuluj powiązane rejestracje gości |
| `src/components/admin/EventRegistrationsManagement.tsx` | Przy cancel — deaktywuj powiązany kontakt |

