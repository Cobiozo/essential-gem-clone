

# Plan: Przydzielanie auto-webinaru per użytkownik + Fix powiadomień

## 1. Przydzielanie funkcji Auto-Webinar konkretnym użytkownikom

### Podejście
Dodać nową kolumnę `can_access_auto_webinar` (boolean, default false) do tabeli `leader_permissions` i panel administracyjny w zakładce Auto-Webinary, wzorowany na istniejącym `IndividualMeetingsManagement`.

### Zmiany

**A. Migracja SQL** — dodać kolumnę:
```sql
ALTER TABLE leader_permissions 
ADD COLUMN can_access_auto_webinar boolean DEFAULT false;
```

**B. Nowy komponent `AutoWebinarAccessManagement.tsx`** (w `src/components/admin/`):
- Lista wszystkich partnerów z wyszukiwarką (wzorowany na `IndividualMeetingsManagement`)
- Switch do włączania/wyłączania dostępu per partner
- Upsert do `leader_permissions` z polem `can_access_auto_webinar`

**C. Integracja w `EventsManagement.tsx`**:
- Dodać nową pod-zakładkę "Dostęp użytkowników" w sekcji Auto-Webinary (obok "Business Opportunity" i "Health Conversation")

**D. Gate w `WebinarInviteWidget.tsx`**:
- Po sprawdzeniu `feature_visibility` i `auto_webinar_config.visible_to_partners`, dodatkowo sprawdzić czy partner ma `can_access_auto_webinar === true` w `leader_permissions`
- Jeśli brak wpisu lub `false` — widget się nie renderuje dla tego partnera

**E. Aktualizacja typów** w `types.ts` — regeneracja po migracji.

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Kolumna `can_access_auto_webinar` |
| `src/components/admin/AutoWebinarAccessManagement.tsx` | Nowy komponent — lista partnerów z switch |
| `src/components/admin/EventsManagement.tsx` | Nowa pod-zakładka w sekcji auto-webinar |
| `src/components/dashboard/widgets/WebinarInviteWidget.tsx` | Gate: sprawdzenie `can_access_auto_webinar` |

---

## 2. Fix: "Notification permission denied" w bannerze czatu

### Problem
Po kliknięciu "Włącz powiadomienia" i odrzuceniu przez przeglądarkę, baner nadal się wyświetla z błędem "Notification permission denied" zamiast się ukryć lub pokazać czytelną informację.

### Przyczyna
W `NotificationPermissionBanner.tsx` linia 34: baner ukrywa się gdy `permission === 'denied'`, ale po `subscribe()` stan `permission` w hooku aktualizuje się, a `error` jest ustawiony — komponnet renderuje się z błędem zanim warunek ukrycia zadziała (lub `permission` nie jest ustawiane na `'denied'` w pewnych przeglądarkach).

### Rozwiązanie
W `NotificationPermissionBanner.tsx`:
- Po kliknięciu "Włącz powiadomienia" i niepowodzeniu — sprawdzić `Notification.permission` bezpośrednio
- Jeśli `'denied'` — schować baner i pokazać toast z informacją "Powiadomienia zostały zablokowane w ustawieniach przeglądarki"
- Dodać dodatkowy warunek ukrycia: `if (error?.includes('denied'))` → return null

| Plik | Zmiana |
|------|--------|
| `src/components/messages/NotificationPermissionBanner.tsx` | Obsługa stanu po odmowie + czytelny komunikat |

