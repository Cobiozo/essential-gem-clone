
# Zatwierdzanie przez Lidera — korekta logiki + implementacja

## Precyzyjne zrozumienie przepływu (po korekcie)

Użytkownik wyjaśnił kluczową zmianę:

```
Rejestracja → Email → Opiekun zatwierdza
  ↓
System szuka lidera w ścieżce rekrutacji (upline):

PRZYPADEK A — Lider z can_approve_registrations ISTNIEJE:
  → Powiadomienie do Lidera ORAZ do Admina
  → Kto pierwszy zatwierdzi (Lider LUB Admin) → użytkownik AKTYWNY
  
PRZYPADEK B — Lider NIE istnieje w ścieżce:
  → Tylko powiadomienie do Admina (standardowy przepływ bez zmian)
```

Admin ZAWSZE może zatwierdzić. Lider jest alternatywną ścieżką — kto pierwszy, ten zatwierdza.

---

## Schemat logiki w bazie danych

Kluczowa zmiana vs poprzedni plan:
- Poprzednio: Lider zastępuje admina (`admin_approved = true` ustawiany przez lidera)
- Teraz: Lider i Admin mogą niezależnie zatwierdzić. Zatwierdzenie przez lidera też ustawia `admin_approved = true` (bo lider ma uprawnienie finalnego zatwierdzenia), ALE admin zawsze widzi użytkownika i może zatwierdzić samodzielnie.

Kolumny `leader_approved`, `leader_approved_at`, `leader_approver_id` w `profiles` służą do:
- Śledzenia czy lider był w ścieżce (i kto to był)
- Pokazania właściwego banera użytkownikowi ("czekasz na Lidera lub Admina")
- Pokazania zakładki "Zatwierdzenia" liderowi z listą jego oczekujących

---

## Zmiany bazy danych (migracja SQL)

### Nowe kolumny w `profiles`:
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_approved boolean DEFAULT NULL;
-- NULL = brak lidera w ścieżce (Admin zatwierdza normalnie)
-- FALSE = lider istnieje, oczekuje na zatwierdzenie (lider LUB admin)
-- TRUE = lider zatwierdził

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_approved_at timestamptz DEFAULT NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leader_approver_id uuid DEFAULT NULL;
-- UUID lidera który jest przypisany do zatwierdzenia
```

### Nowa kolumna w `leader_permissions`:
```sql
ALTER TABLE public.leader_permissions 
ADD COLUMN IF NOT EXISTS can_approve_registrations boolean DEFAULT false;
```

### Nowe funkcje SQL:

**1. `find_nearest_leader_approver(p_user_id uuid)`** — rekurencyjnie przeszukuje ścieżkę upline, zwraca UUID pierwszego lidera z `can_approve_registrations = true` lub `NULL`.

**2. `leader_approve_user(target_user_id uuid)`** — lider zatwierdza:
- Sprawdza `can_approve_registrations` lidera
- Sprawdza `leader_approved = false` dla celu
- Ustawia `leader_approved = true`, `leader_approved_at`, `leader_approver_id = auth.uid()`
- Ustawia `admin_approved = true`, `admin_approved_at = now()` (lider ma uprawnienie finalne)
- Tworzy `user_notifications` dla użytkownika ("Twoje konto zostało aktywowane!")
- Wywołuje edge function `send-approval-email` z `approvalType: 'leader'`

**3. `leader_reject_user(target_user_id uuid, rejection_reason text)`** — lider odrzuca:
- Dezaktywuje profil
- Powiadomienie dla użytkownika i adminów

**4. `get_pending_leader_approvals()`** — zwraca listę użytkowników z `leader_approved = false` AND `leader_approver_id = auth.uid()`.

### Modyfikacja `guardian_approve_user()`:

Po zatwierdzeniu przez opiekuna — nowa logika powiadomień:
```sql
v_leader_id := find_nearest_leader_approver(target_user_id);

IF v_leader_id IS NOT NULL THEN
  -- Ustaw leader_approved = false i leader_approver_id
  UPDATE profiles SET leader_approved = false, leader_approver_id = v_leader_id ...
  
  -- Powiadom LIDERA
  INSERT INTO user_notifications → lider, link: '/leader?tab=approvals'
  
  -- Powiadom ADMINÓW (oni też mogą zatwierdzić)
  INSERT INTO user_notifications → wszyscy admini, link: '/admin?tab=users'
  
  -- Powiadom UŻYTKOWNIKA ("oczekujesz na Lidera lub Admina")
  INSERT INTO user_notifications → użytkownik
ELSE
  -- Standardowy przepływ — tylko admini
  INSERT INTO user_notifications → wszyscy admini (istniejący kod)
  INSERT INTO user_notifications → użytkownik (istniejący kod)
END IF;
```

### Modyfikacja `admin_approve_user()`:

Admin zatwierdza niezależnie od statusu `leader_approved`:
- Istniejąca logika `bypass_guardian` pozostaje
- Dodajemy: jeśli `leader_approved = false` (lider był w ścieżce) → przy zatwierdzeniu przez admina ustaw `leader_approved = true` (dla spójności danych)
- Nic się nie zmienia w samym warunku dostępu — admin może zawsze zatwierdzić

---

## Pliki do zmiany

### 1. Migracja SQL (nowy plik w `supabase/migrations/`)
Wszystkie zmiany schematu i funkcji w jednym pliku.

### 2. `src/hooks/useLeaderPermissions.ts`
Dodać `hasApprovalPermission: boolean` do interfejsu i query:
```typescript
// W select:
'...can_approve_registrations'
// W wynikach:
hasApprovalPermission: leaderPerm?.can_approve_registrations === true
```

### 3. `src/pages/LeaderPanel.tsx`
- Zmiana kolejności zakładek na: `org-tree → training → meetings → approvals → calc-inf → calc-spec`
- Nowa zakładka `approvals` — widoczna gdy `hasApprovalPermission`
- Badge z liczbą oczekujących na ikonie zakładki

### 4. `src/components/leader/LeaderApprovalView.tsx` (NOWY)
Komponent zakładki "Zatwierdzenia" w Panelu Lidera:
- Wywołuje RPC `get_pending_leader_approvals()`
- Tabela: Imię/Nazwisko, Email, Opiekun (upline_eq_id), Data rejestracji
- Przyciski: Zatwierdź / Odrzuć (dialog z powodem)
- Pusty stan: "Brak oczekujących zatwierdzeń"

### 5. `src/hooks/useLeaderApprovals.ts` (NOWY)
Hook zarządzający danymi zakładki zatwierdzeń:
- `useQuery` dla `get_pending_leader_approvals()`
- Funkcje `approveUser(targetUserId)` → RPC `leader_approve_user`
- Funkcja `rejectUser(targetUserId, reason)` → RPC `leader_reject_user`
- Invalidacja cache po akcji + wywołanie `send-approval-email` z `approvalType: 'leader'`

### 6. `src/components/profile/ApprovalStatusBanner.tsx`
Dodanie nowego stanu (Case 1.5 — między opiekunem a adminem, gdy lider jest w ścieżce):

Profil musi zawierać `leader_approved` — `AuthContext` pobiera `select('*')` więc pole będzie dostępne automatycznie po migracji. Warunek:
```typescript
const leaderApproved = profile.leader_approved; // null | true | false
// leader_approved = false → oczekuje na lidera lub admina
```

Nowy baner (indygo/violet):
```
Opiekun ✓ → Lider ⏳ → Gotowe
```
Tekst: "Twój opiekun zatwierdził rejestrację. Oczekujesz teraz na zatwierdzenie przez Lidera lub Administratora."

Wskaźnik postępu gdy lider istnieje w ścieżce:
```
[Email ✓] → [Opiekun ✓] → [Lider/Admin ⏳] → [Gotowe]
```

Istniejący Case 2 (guardian approved, waiting for admin) pojawia się TYLKO gdy `leader_approved = null` (brak lidera w ścieżce).

### 7. `src/contexts/AuthContext.tsx`
Dodanie typów `leader_approved`, `leader_approved_at`, `leader_approver_id` do interfejsu `Profile` (dla TypeScript, dane są już pobierane przez `select('*')`).

### 8. `src/components/admin/LeaderPanelManagement.tsx`
Dodanie kolumny "Zatwierdzanie" w tabeli:
- Nowy klucz `can_approve_registrations` w `columns[]`
- Ikona `UserCheck`
- Nowy typ obsługi w `toggleLeaderPermission()` (już obsługuje `leader_permissions` przez `field` parameter)
- Nowe pole `can_approve_registrations: boolean` w interfejsie `PartnerLeaderData`
- Aktualizacja query `leader_permissions` o `can_approve_registrations`

### 9. `supabase/functions/send-approval-email/index.ts`
Dodanie obsługi `approvalType: 'leader'`:
```typescript
type: 'guardian' | 'admin' | 'leader'  // rozszerzone
```
Template name: `leader_approval`
Zmienne: takie same jak `admin` (imię, nazwisko, link logowania, lista szkoleń)

---

## Tabela wpływu na UX

| Sytuacja | Baner użytkownika | Powiadomienia |
|---|---|---|
| Brak lidera w ścieżce | "Oczekujesz na Admin" (bez zmian) | Admin |
| Lider istnieje w ścieżce | "Oczekujesz na Lidera lub Admina" (nowy) | Lider + Admin |
| Lider zatwierdził | Brak banera (pełny dostęp) | Email aktywacyjny |
| Admin zatwierdził (gdy był lider) | Brak banera (pełny dostęp) | Email aktywacyjny |

---

## Kolejność implementacji

1. Migracja SQL (schemat + funkcje)
2. `useLeaderPermissions.ts` + `AuthContext.tsx` (typy)
3. `LeaderApprovalView.tsx` + `useLeaderApprovals.ts`
4. `LeaderPanel.tsx` (kolejność + nowa zakładka)
5. `ApprovalStatusBanner.tsx` (nowy stan)
6. `LeaderPanelManagement.tsx` (nowa kolumna)
7. `send-approval-email` edge function (typ `leader`)
