
# Naprawa 3 problemow: responsywnosc mobilna, blad struktury, dostarczalnosc emaili

## Problem 1: Responsywnosc mobilna (Apple/iOS)

**Zdiagnozowane problemy:**

- **Struktura organizacji (OrganizationChart.tsx)**: Brak obslugi dotyku - uzywa tylko `onMouseDown/Move/Up/Leave`, kompletnie nie dziala na urzadzeniach dotykowych (iPhone/iPad). Przeciaganie drzewa jest niemozliwe na mobile.
- **OrganizationNode.tsx**: Brak `touch-action: manipulation`, node'y maja hover effects ale brak active/tap feedback dla mobile.
- **Zoom w OrganizationChart**: Brak obslugi pinch-to-zoom (standardowy gest na iOS).

**Zmiany:**

### `src/components/team-contacts/organization/OrganizationChart.tsx`
- Dodanie `onTouchStart`, `onTouchMove`, `onTouchEnd` handlerow (rownolegla obsluga do mouseDown/Move/Up)
- Dodanie pinch-to-zoom przez sledzenie 2 palcow (touch distance ratio)
- Dodanie `touch-action: none` na kontenerze scroll aby zapobiec kolizji z natywnym scrollem iOS
- Dodanie `-webkit-overflow-scrolling: touch`
- Fix: przyciski zoom musza miec min 44px na mobile

### `src/components/team-contacts/organization/OrganizationNode.tsx`
- Dodanie `touch-action: manipulation` do glownego diva
- Aktywny feedback dotykowy (opacity 0.7 na tap)

### `src/components/team-contacts/organization/OrganizationList.tsx`
- Sprawdzenie czy accordion/collapsible elementy maja wystarczajace touch targets (min 44px)

---

## Problem 2: Blad przy wchodzeniu na Strukture organizacji

**Diagnoza:**
Na podstawie kodu i logow, prawdopodobny blad to:
1. Uzytkownik nie ma `eq_id` w profilu -> `fetchTree` sie nie wywoluje, ale `loading` zostaje `true` na zawsze (linia 35: `if (!profile?.eq_id || settingsLoading) return;` - nie ustawia `setLoading(false)`)
2. Blad RPC `get_organization_tree` - jesli uzytkownik nie ma uprawnien lub brakuje danych
3. `settingsLoading` moze nigdy sie nie rozwiazac jesli nie ma rekordu w `organization_tree_settings`

**Zmiany:**

### `src/hooks/useOrganizationTree.ts`
- Linia 35: Dodanie `setLoading(false); return;` gdy `!profile?.eq_id` - zapobiegnie nieskonczonym loadingom
- Dodanie try/catch wokol `rpc` call z jawnym error message
- Dodanie fallback gdy `canAccessTree()` zwraca false -> ustawienie error message zamiast pustego stanu

### `src/hooks/useOrganizationTreeSettings.ts`
- Linia 78: Gdy `fetchError` i brak danych, uzyc `DEFAULT_SETTINGS` zamiast zostawiac `settings = null` -> zapobiegnie blokowaniu calego widoku gdy tabela jest pusta

---

## Problem 3: Emaile nie docieraja do niektorych domen

**Diagnoza z bazy danych:**
- 180 emaili wyslanych sukcesywnie, 5 failed (stary blad "Invalid port" z grudnia 2025 - juz naprawiony)
- Emaile docieraja do: gmail.com, wp.pl, interia.pl, onet.pl, o2.pl, protonmail.com, hotmail.com, icloud.com, op.pl, gmx.de itd.
- **Brak uzytkownikow bez welcome email** w systemie (query zwrocilo 0 wynikow) - ale 2 nowi uzytkownicy maja `email_activated = false` wiec CRON ich pomija
- **Glowny problem**: Funkcja `get_users_without_welcome_email` wymaga `email_activated = true`, ale nowi uzytkownicy moga nie potwierdzic emaila -> nigdy nie dostana welcome email

**Problemy z dostarczalnoscia:**
Emaile sa wysylane, ale moga trafiać do spamu lub byc odrzucane przez serwery odbiorcze z powodu brakujacych naglowkow SMTP:

1. **Brak `Message-ID`** - kluczowy naglowek, bez ktorego wiele serwerow klasyfikuje email jako spam
2. **Brak `Return-Path`** - wymagany przez RFC 5321
3. **Brak `X-Mailer`** - brak identyfikacji klienta
4. **`base64Encode` z `btoa` + `String.fromCharCode(...data)`** - dla duzych HTML body moze wywolac "Maximum call stack size exceeded" (spread operator na duzej tablicy)

**Zmiany:**

### `supabase/functions/send-welcome-email/index.ts`
- Dodanie naglowkow: `Message-ID`, `Return-Path`, `X-Mailer`, `List-Unsubscribe`
- Fix `base64Encode`: zamiana `String.fromCharCode(...data)` na iteracyjna wersje (chunked) - zapobiegnie stack overflow dla duzych emaili
- Dodanie `Reply-To` header

### `supabase/functions/send-single-email/index.ts`
- Te same poprawki naglowkow SMTP co wyzej
- Dodanie `Message-ID`, `Return-Path`, `X-Mailer`

### Zmiana logiki przypisywania welcome email
Nowa Edge Function lub modyfikacja `process-pending-notifications`:
- Zmiana query `get_users_without_welcome_email`: **usunac** wymog `email_activated = true` - welcome email powinien byc wyslany natychmiast po rejestracji, niezaleznie od potwierdzenia emaila
- Alternatywnie: wyslac welcome email bezposrednio w `handle_new_user()` trigger lub w procesie rejestracji w frontend

### Migracja SQL
- Zmiana funkcji `get_users_without_welcome_email`: usunac warunek `p.email_activated = true` aby objac wszystkich nowych uzytkownikow

---

## Podsumowanie plikow do zmiany

| Plik | Zakres zmian |
|------|-------------|
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Touch events, pinch-to-zoom, iOS scroll |
| `src/components/team-contacts/organization/OrganizationNode.tsx` | Touch targets, tap feedback |
| `src/hooks/useOrganizationTree.ts` | Fix infinite loading, error handling |
| `src/hooks/useOrganizationTreeSettings.ts` | Fallback na default settings |
| `supabase/functions/send-welcome-email/index.ts` | Message-ID, Return-Path, fix base64 |
| `supabase/functions/send-single-email/index.ts` | Identyczne poprawki naglowkow |
| Migracja SQL | Fix `get_users_without_welcome_email` |

