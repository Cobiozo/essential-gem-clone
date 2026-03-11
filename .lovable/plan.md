

# Fix: Godzina w emailu (UTC→Warsaw) + dane rejestracji w kontaktach prywatnych

## Problem 1: Zła godzina w emailu potwierdzającym

`send-webinar-confirmation` formatuje datę przez `new Date(eventDate).toLocaleDateString('pl-PL')` bez `timeZone`. Deno Edge Functions domyślnie formatują w UTC → event o 19:00 CET wyświetla się jako 18:00. Dodatkowo pole "Godzina:" w szablonie DB (`{{event_time}}`) jest puste, bo frontend nie przekazuje `eventTime`.

**Fix:** Dodać `timeZone: 'Europe/Warsaw'` do `toLocaleDateString` w linii 361. Dotyczy to zarówno szablonu fallback jak i szablonu DB (zmienna `displayTime` też powinna być poprawnie wypełniona z `eventDate`).

## Problem 2: Brak daty/godziny rejestracji + prób ponownej rejestracji w kontaktach prywatnych

Obecny widok CRM pokazuje przy kontaktach tylko tytuł wydarzenia i datę wydarzenia. Brakuje:
- **Daty i godziny rejestracji** gościa (`registered_at`)
- **Informacji o ponownych próbach rejestracji** (ten sam email na to samo wydarzenie — `status = 'cancelled'` + nowa rejestracja, lub wielokrotne wpisy)

## Plan zmian

### Plik 1: `supabase/functions/send-webinar-confirmation/index.ts`

- Linia 361: dodać `timeZone: 'Europe/Warsaw'` do opcji `toLocaleDateString`
- Wyciągnąć godzinę z `eventDate` w Warsaw TZ i ustawić `displayTime` poprawnie, żeby szablon DB miał wartość `{{event_time}}`
- Naprawić `base64Encode` (ten sam bug co w `send-post-webinar-email` — chunked encoding)

### Plik 2: `src/hooks/useTeamContacts.ts`

- W `fetchEventContactIds`: dodać `registered_at` do select query
- Rozszerzyć zapytanie, żeby pobrać **wszystkie** rejestracje (w tym anulowane) dla tego samego emaila na to samo wydarzenie, aby wykryć ponowne próby

### Plik 3: `src/components/team-contacts/types.ts`

- Rozszerzyć `EventRegistrationInfo` o:
  - `registered_at: string` — data rejestracji
  - `registration_attempts?: number` — liczba prób rejestracji (wielokrotne wpisy na to samo wydarzenie)

### Plik 4: `src/components/team-contacts/TeamContactAccordion.tsx`

- W badge wydarzeniowym dodać datę rejestracji sformatowaną (dd.MM.yyyy HH:mm)
- Jeśli `registration_attempts > 1` → wyświetlić badge "Ponowna próba ×N"

### Plik 5: `src/components/team-contacts/TeamContactsTable.tsx`

- Analogiczne zmiany w widoku tabelarycznym

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-webinar-confirmation/index.ts` | `timeZone: 'Europe/Warsaw'`, poprawny `displayTime`, fix `base64Encode` |
| `src/hooks/useTeamContacts.ts` | Pobranie `registered_at` + wykrywanie ponownych prób rejestracji |
| `src/components/team-contacts/types.ts` | Nowe pola w `EventRegistrationInfo` |
| `src/components/team-contacts/TeamContactAccordion.tsx` | Wyświetlanie daty rejestracji + badge ponownych prób |
| `src/components/team-contacts/TeamContactsTable.tsx` | Wyświetlanie daty rejestracji + badge ponownych prób |

