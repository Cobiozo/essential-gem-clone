

# Fix: Alternatywny email — zapis, historia, wyświetlanie

## Problemy

1. **Update `secondary_email` nie sprawdza błędu** — `await supabase.update()` nie ma `.then()` ani destructuring `{ error }`, więc błąd jest cichy
2. **`event_invite_alt_email` nie jest obsługiwany w historii** — brak ikony, badge i renderowania alt_email w `TeamContactHistoryDialog`
3. **`secondary_email` nie jest wyświetlany w formularzu kontaktu** — pole nie istnieje w `PrivateContactForm`

## Zmiany

### 1. `InviteToEventDialog.tsx` — dodać obsługę błędu update

Linia 273-276: destructure `{ error }` z update i rzuć wyjątek jeśli wystąpi:
```typescript
const { error: updateError } = await supabase
  .from('team_contacts')
  .update({ secondary_email: altEmailValue.trim() })
  .eq('id', contact.id);
if (updateError) throw updateError;
```

### 2. `TeamContactHistoryDialog.tsx` — obsługa `event_invite_alt_email`

- `getChangeIcon`: dodać case `'event_invite_alt_email'` → ikona `Mail` (pomarańczowa)
- `getChangeBadge`: dodać case → badge "Wysłano na inny email"
- `renderEventDetails`: dodać wyświetlanie `vals.alt_email` gdy obecne
- Dodać `'event_invite_alt_email'` do listy event-related change types

### 3. `PrivateContactForm.tsx` — pole `secondary_email`

- Dodać `secondary_email` do `formData` state
- Dodać pole readonly pod emailem: "Drugi email" z wartością z `contact.secondary_email`
- Pole readonly (ustawiane automatycznie przez zaproszenie, nie edytowalne ręcznie) — lub edytowalne, zależy od preferencji

| Plik | Zmiana |
|------|--------|
| `InviteToEventDialog.tsx` | Error handling na update secondary_email |
| `TeamContactHistoryDialog.tsx` | Obsługa `event_invite_alt_email` + wyświetlanie alt_email |
| `PrivateContactForm.tsx` | Wyświetlanie pola `secondary_email` |

