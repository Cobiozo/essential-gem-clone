
# Dodanie kolumny "Oczekuje na Lidera" + aktualizacja legendy statusów

## Diagnoza aktualnego stanu

### Co brakuje:
1. **RPC `get_user_profiles_with_confirmation`** — nie zwraca `leader_approved` i `leader_approved_at` (brakuje tych kolumn w `SELECT`)
2. **`UserProfile` interface** w `Admin.tsx` (linie 89–120) — brak pól `leader_approved`, `leader_approved_at`, `leader_approver_id`
3. **`CompactUserCard.tsx`** — `UserProfile` interface (linie 38–69), `getUserStatus()` i `StatusDot` nie obsługują stanu "Oczekuje na Lidera"
4. **`UserStatusLegend.tsx`** — brak wpisu dla fioletowego "Oczekuje na Lidera"
5. **Mapping w `fetchUsers()`** — `leader_approved` nie jest mapowany ze zwróconego RPC (linie 481–511)

---

## Szczegółowy plan zmian

### Zmiana 1: Aktualizacja funkcji SQL `get_user_profiles_with_confirmation`
Dodać `p.leader_approved` i `p.leader_approved_at` do listy kolumn SELECT i do RETURNS TABLE.

Bez tego cała reszta nie będzie miała danych.

### Zmiana 2: `UserProfile` interface w `Admin.tsx` (linia ~105)
Dodać po `admin_approved_at`:
```typescript
leader_approved?: boolean | null;
leader_approved_at?: string | null;
leader_approver_id?: string | null;
last_sign_in_at?: string | null;
```

### Zmiana 3: Mapping w `fetchUsers()` w `Admin.tsx` (linia ~499)
Dodać po `admin_approved_at`:
```typescript
leader_approved: row.leader_approved,
leader_approved_at: row.leader_approved_at,
leader_approver_id: row.leader_approver_id,
last_sign_in_at: row.last_sign_in_at,
```

### Zmiana 4: `CompactUserCard.tsx` — rozszerzenie typów i logiki

**4a. `UserProfile` interface** (linia ~53) — dodać po `admin_approved_at`:
```typescript
leader_approved?: boolean | null;
leader_approved_at?: string | null;
leader_approver_id?: string | null;
```

**4b. `UserStatus` typ** (linia 118) — dodać nowy stan:
```typescript
type UserStatus = 'fully_approved' | 'awaiting_admin' | 'awaiting_leader' | 'awaiting_guardian' | 'email_pending' | 'inactive';
```

**4c. `getUserStatus()` funkcja** (linie 120–126) — dodać warunek między `guardian` a `admin`:
```typescript
const getUserStatus = (userProfile: UserProfile): UserStatus => {
  if (!userProfile.is_active) return 'inactive';
  if (!userProfile.email_activated) return 'email_pending';
  if (!userProfile.guardian_approved) return 'awaiting_guardian';
  // leader_approved = false → lider jest w ścieżce i oczekuje
  if (userProfile.leader_approved === false) return 'awaiting_leader';
  if (!userProfile.admin_approved) return 'awaiting_admin';
  return 'fully_approved';
};
```

**4d. `StatusDot` komponent** (linie 128–151) — dodać konfigurację dla `awaiting_leader`:
```typescript
awaiting_leader: { color: 'bg-violet-500', tooltip: 'Oczekuje na Lidera' },
```

**4e. Import `Crown`** — dodać do listy importów z `lucide-react`.

**4f. Wizualny wskaźnik na karcie** — obok ikon Email/Guardian/Admin dodać ikonę Lidera gdy `leader_approved === false`:
W sekcji badge'y (po istniejących ✓ Email / ✗ Email, linia ~238):
```tsx
{/* Leader approval badge — pokazuj tylko gdy lider jest w ścieżce */}
{userProfile.leader_approved === false && (
  <Badge variant="outline" className="text-xs h-5 border-violet-300 text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800">
    <Crown className="w-3 h-3 mr-0.5" />
    Czeka na Lidera
  </Badge>
)}
```

### Zmiana 5: `UserStatusLegend.tsx` — aktualizacja legendy
Dodać nowy wpis z fioletową kropką między "Oczekuje na admina" a "Oczekuje na opiekuna":

```typescript
const statusColors = [
  { color: 'bg-green-500', label: 'W pełni zatwierdzony', description: 'Email potwierdzony, opiekun i admin zatwierdził' },
  { color: 'bg-amber-500', label: 'Oczekuje na admina', description: 'Opiekun zatwierdził, czeka na admina (brak lidera w ścieżce)' },
  { color: 'bg-violet-500', label: 'Oczekuje na Lidera lub Admina', description: 'Opiekun zatwierdził, lider w ścieżce oczekuje lub admin może zatwierdzić' },
  { color: 'bg-red-500', label: 'Oczekuje na opiekuna', description: 'Email potwierdzony, brak zatwierdzenia opiekuna' },
  { color: 'bg-gray-400', label: 'Email niepotwierdzony', description: 'Użytkownik nie potwierdził emaila' },
  { color: 'bg-gray-300', label: 'Zablokowany', description: 'Konto zablokowane przez admina' },
];
```

Ponadto legenda zostanie rozbudowana o sekcję "Ścieżka zatwierdzania" — krótki opis przepływu (Email → Opiekun → Lider/Admin → Aktywny), aby admin rozumiał logikę całego procesu.

---

## Pliki do zmiany

| Plik | Zmiana | Priorytet |
|---|---|---|
| SQL: `get_user_profiles_with_confirmation` | Dodanie `leader_approved`, `leader_approved_at` do SELECT | Krytyczny |
| `src/pages/Admin.tsx` | Interface + mapping `leader_approved` | Krytyczny |
| `src/components/admin/CompactUserCard.tsx` | Nowy status `awaiting_leader`, fioletowa kropka, badge "Czeka na Lidera", import Crown | Główny |
| `src/components/admin/UserStatusLegend.tsx` | Nowy wpis fioletowy + opis ścieżki zatwierdzania | Uzupełniający |

---

## Efekt wizualny po zmianach

Użytkownik "Mateusz Sumera" który ma `guardian_approved = true` i `leader_approved = false`:
- Fioletowa kropka statusu (zamiast bursztynowej)
- Badge `👑 Czeka na Lidera` obok imienia
- Przycisk "Zatwierdź" pozostaje widoczny — Admin zawsze może zatwierdzić

Legenda w tabeli użytkowników będzie zawierać 6 kolorów zamiast 5, z wyjaśnieniem nowego przepływu.
