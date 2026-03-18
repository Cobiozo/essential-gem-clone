

# Plan: Wyszukiwarka gości + filtr "bez partnera"

## Co zostanie dodane

W zakładce **Goście** w `EventRegistrationsManagement.tsx`:

1. **Pole wyszukiwania** (Input z ikoną Search) — filtruje listę gości po:
   - imieniu i nazwisku
   - adresie email
   - numerze telefonu
   - imieniu/nazwisku zapraszającego partnera

2. **Checkbox/przycisk "Bez partnera"** — filtruje tylko gości, którzy mają `invited_by_user_id = NULL` (brak zapraszającego partnera). Wyświetla liczbę takich osób w etykiecie.

## Zmiany techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/admin/EventRegistrationsManagement.tsx` | Dodanie stanu `guestSearchQuery` i `showUnassignedOnly`, rozszerzenie `filteredGuestRegistrations` o logikę wyszukiwania i filtrowania, dodanie UI kontrolek nad tabelą gości |

### Logika filtrowania

```typescript
const filteredGuestRegistrations = useMemo(() => {
  let result = guestRegistrations;
  if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter);
  if (showUnassignedOnly) result = result.filter(r => !r.invited_by_user_id);
  if (guestSearchQuery.trim()) {
    const q = guestSearchQuery.toLowerCase();
    result = result.filter(r => 
      r.first_name?.toLowerCase().includes(q) ||
      r.last_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.inviter_profile?.first_name?.toLowerCase().includes(q) ||
      r.inviter_profile?.last_name?.toLowerCase().includes(q)
    );
  }
  return result;
}, [guestRegistrations, statusFilter, showUnassignedOnly, guestSearchQuery]);
```

### UI (nad tabelą gości, pod statystykami)

- Input z ikoną Search i placeholder "Szukaj po imieniu, email, telefonie, partnerze..."
- Badge/Button "Bez partnera (X)" — toggle filtra nieprzypisanych gości
- Licznik wyników: "Wyświetlono X z Y"

