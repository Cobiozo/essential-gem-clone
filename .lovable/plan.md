

# Multi-select odbiorców w dialogu follow-up

## Zmiana koncepcji

Zamiast `single` (jedna osoba) → opcja `selected` (wybrane osoby) z checkboxami i wyszukiwarką.

## Zmiany

### 1. Frontend (`EventRegistrationsManagement.tsx`)

**Stan:**
- `followUpSingleRecipient: string` → `followUpSelectedRecipients: string[]` (tablica wartości z `singleOptions`)
- Radio option `Konkretna osoba` → `Wybrane osoby`

**UI po wybraniu "Wybrane osoby":**
- Input tekstowy jako wyszukiwarka (filtrowanie po imieniu/nazwisku/email)
- Lista checkboxów pod spodem (max-height ze scrollem) z badge Użytkownik/Gość
- Nad listą: "Zaznaczono: X osób" + przycisk "Odznacz wszystko"
- Każdy element: Checkbox + imię nazwisko (email) + badge typu

**Logika wysyłki (`handleSendFollowUp`):**
- Gdy `followUpRecipientGroup === 'selected'` → buduje tablicę `selected_recipients` z danych `singleOptions` i przekazuje do edge function
- Nie używa `single_recipient` — nowy parametr `selected_recipients: Array<{email, first_name}>`

**Licznik odbiorców:**
- `selected` → `followUpSelectedRecipients.length`

### 2. Edge Function (`send-post-webinar-email/index.ts`)

- Nowy parametr `selected_recipients?: Array<{email: string; first_name: string}>`
- Nowa grupa `'selected'`: pomija query do bazy, iteruje po `selected_recipients`
- Zachowana kompatybilność wsteczna z `single_recipient`

### Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/EventRegistrationsManagement.tsx` | Multi-select z checkboxami, wyszukiwarka, nowy stan |
| `supabase/functions/send-post-webinar-email/index.ts` | Obsługa `selected_recipients` |

