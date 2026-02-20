
# Pełna weryfikacja po ostatnich zmianach

## Podsumowanie wyników kontroli

### ✅ Co działa poprawnie

**1. Naprawa pętli nieskończonej (Maximum call stack size exceeded)**
- `useLeaderApprovals` ma teraz `enabled: !!user && hasApprovalPermission === true` — hook NIE wywołuje RPC dla użytkowników bez uprawnień
- `retry: false` — brak ponownych prób przy błędzie SQL "Brak uprawnień"
- `LeaderPanel.tsx` przekazuje `hasApprovalPermission` do hooka
- Efekt w `Admin.tsx` ma `if (!isAdmin) return` guard i usuniętego `toast` z zależności

**2. Migracja SQL — poprawnie wykonana**
- Funkcja `get_user_profiles_with_confirmation()` zwraca teraz `leader_approved`, `leader_approved_at`, `leader_approver_id`
- Baza potwierdza: kolumny istnieją w tabeli `profiles` (nullable boolean)

**3. Frontend — status "Czeka na Lidera"**
- `CompactUserCard.tsx`: nowy status `awaiting_leader` z fioletową kropką, badge `Crown + "Czeka na Lidera"`
- `UserStatusLegend.tsx`: nowy wpis fioletowy + ścieżka zatwierdzania

**4. Mapping w `fetchUsers()`**
- `leader_approved`, `leader_approved_at`, `leader_approver_id` mapowane ze zwróconego RPC

---

### ⚠️ Znalezione problemy

**Problem 1: Podwójny `useEffect` dla zakładki `content` w Admin.tsx** (istniejący, nie nowy)

Linie 2032-2050 i 2053-2058: **dwa osobne efekty** wywołują `fetchHeaderText()` i `fetchAuthorText()` dla zakładki `content`:
```
useEffect({ ...content → fetchHeaderText... }, [activeTab, isAdmin])  // linia 2032
useEffect({ ...content → fetchHeaderText... }, [isAdmin])             // linia 2053
```
Gdy admin po raz pierwszy wchodzi na zakładkę `content`, oba efekty odpytują API jednocześnie — to nadmiarowe żądanie, ale **nie powoduje crash'u ani wycieku**.

**Problem 2: Stan Jerzego Szafarza — blokada na poziomie email**

Jerzy Szafarz (upline = Mateusz Sumera, lider):
- `email_activated = false` → email NIE jest potwierdzony
- `guardian_approved = false` → Mateusz nie może go jeszcze zatwierdzić jako guardian, bo `guardian_approve_user` blokuje zatwierdzenie gdy `email_activated = false`
- `leader_approved = NULL` (nie `false`) → Jerzy **nie pojawia się** w module Zatwierdzeń Lidera (warunek: `leader_approved = false`)

**Mateusz Sumera widzi Jerzego TYLKO w zakładce `team_contacts` ze statusem "oczekuje na zatwierdzenie"**, ale nie może go zatwierdzić dopóki Jerzy nie kliknie link aktywacyjny w emailu.

**Stan w Admin.tsx (panel adminów):**
- Jerzy pokaże się jako `email_pending` (szara kropka) — poprawnie
- Przycisk "Wyślij email aktywacyjny ponownie" będzie widoczny ✅

**Problem 3: Rzeczywiście BRAK użytkowników aktualnie oczekujących na Lidera**

Zapytanie do bazy: `guardian_approved = true AND admin_approved = false` → **puste** — nikt aktualnie nie czeka na zatwierdzenie w tym etapie. Nowe pole `leader_approved = false` (fioletowy badge) aktywuje się dopiero gdy Jerzy potwierdzi email → Mateusz go zatwierdzi jako guardian → dopiero wtedy `guardian_approve_user` ustawi `leader_approved = false` i `leader_approver_id = Mateusz`.

---

### 📊 Stan bazy danych — aktualny obraz użytkowników

| Użytkownik | Email activated | Guardian approved | Admin approved | Leader approved | Status |
|---|---|---|---|---|---|
| Jerzy Szafarz | ❌ false | ❌ false | ❌ false | NULL | Szara kropka (email niepotwierdzony) |
| Katarzyna Grochowicka | ✅ true | ❌ false | ❌ false | NULL | Czerwona kropka (czeka na opiekuna) |
| Dominika Matczak | ✅ true | ❌ false | ❌ false | NULL | Czerwona kropka (czeka na opiekuna) |

Aktywni, w pełni zatwierdzeni: wszyscy pod Mateuszem Sumerą (Mateusz Piękny, Paweł Marczak, itp.) mają `leader_approved = NULL` — to **normalne**, bo zostali zatwierdzeni przed wdrożeniem systemu lidera (NULL = lider nie był w ścieżce w tamtym czasie).

---

### Przepływ dla Jerzego Szafarza — co zadzieje się gdy potwierdzi email

```text
1. Jerzy klika link aktywacyjny → email_activated = true
2. Mateusz Sumera widzi go w Pure-kontakty z przyciskiem "Zatwierdź"
3. guardian_approve_user() → guardian_approved = true
4. find_nearest_leader_approver(Jerzy) → szuka w upline_eq_id = 121112817 (Mateusz)
5. Mateusz MA can_approve_registrations = true → zwraca jego user_id
6. UPDATE profiles SET leader_approved = false, leader_approver_id = Mateusz
7. Mateusz dostaje powiadomienie → widzi Jerzego w /leader?tab=approvals
8. W Admin.tsx: Jerzy dostanie FIOLETOWĄ kropkę + badge "Czeka na Lidera" ✅
```

---

### Co należy naprawić teraz

**Naprawa: Podwójny useEffect dla zakładki content**

Usunąć duplikat `useEffect` (linie 2053-2058) — jest redundantny względem głównego efektu (2032-2050) który już obsługuje `activeTab === 'content'`. Drugi efekt z `[isAdmin]` powoduje dodatkowe zapytanie przy załadowaniu.

---

## Pliki do zmiany

| Plik | Zmiana | Priorytet |
|---|---|---|
| `src/pages/Admin.tsx` | Usunięcie duplikatu useEffect (linie 2053-2058) | Niski — nie powoduje crash, ale eliminuje nadmiarowe zapytanie |

Wszystkie pozostałe zmiany są poprawne i działają. System `leader_approved` zadziała automatycznie przy pierwszym użytkowniku który przejdzie przez pełen przepływ zatwierdzania.
