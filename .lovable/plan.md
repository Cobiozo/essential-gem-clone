

# Plan: Kontakty z zaproszeń + zapraszanie kontaktów na wydarzenia

## Zakres zmian

### 1. Zmiana logiki `moveToOwnList` — sprawdzanie duplikatów

**Plik: `src/hooks/useTeamContacts.ts`**

Obecna funkcja `moveToOwnList` po prostu ustawia `moved_to_own_list: true`. Trzeba dodać logikę:
- Przed przeniesieniem: pobrać email i phone kontaktu
- Sprawdzić czy w "Moja lista" (kontakty z `moved_to_own_list = true` lub bez `eventContactIds`) istnieje kontakt z tym samym email+phone
- Jeśli duplikat istnieje → zwrócić informację o duplikacie, nie przenosić automatycznie
- Jeśli brak duplikatu → przenieść normalnie

**Plik: `src/components/team-contacts/EventGroupedContacts.tsx`**

Dodać dialog potwierdzenia przy duplikacie:
- "Kontakt z tym samym emailem i numerem telefonu już istnieje w Twojej liście. Czy chcesz zapisać go jako nowy kontakt?"
- Opcje: "Zapisz jako nowy" / "Anuluj"

### 2. Przycisk "Zaproś na wydarzenie" przy kontaktach w "Moja lista"

**Nowy komponent: `src/components/team-contacts/InviteToEventDialog.tsx`**

Dialog z listą nadchodzących wydarzeń, na które admin zezwolił na zapraszanie gości (`allow_invites = true`, `is_active = true`, `start_time > now()`):
- Pobieranie wydarzeń z Supabase: `events` WHERE `allow_invites = true` AND `is_active = true` AND `start_time > NOW()`
- Wyświetlanie tytułu, daty, typu wydarzenia
- Po wyborze wydarzenia → wywołanie edge function `send-webinar-confirmation` z danymi kontaktu
- Jednocześnie rejestracja gościa przez RPC `register_event_guest`
- Po wysłaniu: gość wchodzi w standardowy harmonogram powiadomień (24h, 12h, 2h, 1h, 15min)

**Pliki do modyfikacji:**
- `src/components/team-contacts/TeamContactAccordion.tsx` — dodać przycisk `Mail`/`Send` przy każdym kontakcie
- `src/components/team-contacts/TeamContactsTable.tsx` — analogicznie w widoku tabelarycznym

### 3. Rejestracja gościa z zaproszenia partnera

Po wyborze wydarzenia w dialogu:
1. Wywołanie `register_event_guest` RPC (jak przy normalnej rejestracji)
2. Wywołanie `send-webinar-confirmation` z `invitedByUserId` = partner's user_id
3. Gość dostaje email potwierdzający + kolejne przypomnienia wg harmonogramu CRON
4. Kontakt pojawia się automatycznie w "Z zaproszeń na wydarzenia" (bo `send-webinar-confirmation` tworzy wpis w `team_contacts`)

### 4. Backend — bez zmian w Edge Functions

`send-webinar-confirmation` już obsługuje pełny flow: tworzenie kontaktu + email + powiadomienia. Wystarczy wywołać go z frontendu z odpowiednimi parametrami.

Jedyna potencjalna zmiana: upewnić się, że `register_event_guest` RPC może być wywołane przez zalogowanego partnera (nie tylko przez anonimowego gościa).

---

## Podsumowanie plików do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useTeamContacts.ts` | Rozbudowa `moveToOwnList` o sprawdzanie duplikatów |
| `src/components/team-contacts/EventGroupedContacts.tsx` | Dialog duplikatu przy przenoszeniu |
| `src/components/team-contacts/InviteToEventDialog.tsx` | **NOWY** — dialog wyboru wydarzenia do zaproszenia |
| `src/components/team-contacts/TeamContactAccordion.tsx` | Przycisk "Zaproś na wydarzenie" |
| `src/components/team-contacts/TeamContactsTable.tsx` | Przycisk "Zaproś na wydarzenie" |
| `src/components/team-contacts/TeamContactsTab.tsx` | Przekazanie nowych props |

